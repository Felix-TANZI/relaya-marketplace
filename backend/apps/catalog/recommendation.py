# backend/apps/catalog/recommendation.py
"""
Algorithmes de recommandation et rotation de produits.

Rules:
1. Recommandations basées sur proximité de la boutique (distance + trust_score + bay_box)
2. Rotation des produits d'accueil pour visibilité équitable
3. Recommandations intelligentes pour cart/panier (produits liés) et fiche produit
"""

from django.db.models import (
    Avg, Case, Count, Exists, ExpressionWrapper, F, FloatField, DecimalField,
    IntegerField, OuterRef, Q, Value, When,
)
from django.db.models.functions import Coalesce
from django.utils import timezone
from math import radians, cos, sin, asin, sqrt
from django.db import models as django_models
from decimal import Decimal


def annotate_trust_score(queryset):
    """
    Annote un queryset de Product avec belivay_trust_score et exclut les
    vendeurs bannis (veto_active=True, role VENDOR).

    Utilise Exists() plutot qu'un JOIN direct sur vendor__trust_score_profiles :
    un vendeur peut avoir plusieurs TrustScoreProfile (un par role - VENDOR,
    COURIER, RELAY_POINT, BUYER), donc select_related/filter direct sur
    cette relation inverse un-vers-plusieurs duplique les lignes Product
    (et fausse les Count() d'avis/promos deja annotes sur le meme queryset).
    Exists() est une sous-requete correlee : aucun JOIN, aucun risque de
    doublon, quel que soit le nombre de profils du vendeur.

    Reutilisee par ProductViewSet.get_queryset() et par les fonctions de
    recommandation ci-dessous, pour que belivay_trust_score soit toujours
    calcule de la meme facon partout ou on trie dessus.
    """
    from apps.accounts.models import TrustScoreProfile
    from .models import PromotionCampaign

    now = timezone.now()
    vetoed_vendor = TrustScoreProfile.objects.filter(
        user_id=OuterRef('vendor_id'),
        role=TrustScoreProfile.Role.VENDOR,
        veto_active=True,
    )
    throttled_vendor = TrustScoreProfile.objects.filter(
        user_id=OuterRef('vendor_id'),
        role=TrustScoreProfile.Role.VENDOR,
        throttled_until__gt=now,
    )

    approved_campaign = Q(
        promotion_campaigns__status=PromotionCampaign.Status.APPROVED,
        promotion_campaigns__starts_at__lte=now,
        promotion_campaigns__ends_at__gte=now,
    )
    active_flash_campaign = approved_campaign & Q(
        promotion_campaigns__campaign_type=PromotionCampaign.CampaignType.FLASH,
        promotion_campaigns__stock_claimed__lt=F("promotion_campaigns__stock_reserved"),
    )

    return (
        queryset
        .annotate(_vendor_vetoed=Exists(vetoed_vendor), _vendor_throttled=Exists(throttled_vendor))
        .exclude(_vendor_vetoed=True)
        .annotate(
            belivay_rating_average=Coalesce(
                Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
                Value(0.0),
                output_field=FloatField(),
            ),
            belivay_reviews_count=Count('reviews', filter=Q(reviews__is_approved=True), distinct=True),
            belivay_active_promo_count=Count('promotion_campaigns', filter=approved_campaign, distinct=True),
            belivay_active_flash_count=Count('promotion_campaigns', filter=active_flash_campaign, distinct=True),
            # Throttling (V5.5 §8, palier 2) : dispatch/visibilite reduits,
            # jamais une exclusion totale (contrairement au veto niveau 4).
            vendor_throttled_penalty=Case(
                When(_vendor_throttled=True, then=Value(50)),
                default=Value(0),
                output_field=IntegerField(),
            ),
        )
        .annotate(
            belivay_trust_score=ExpressionWrapper(
                F('belivay_rating_average') * Value(20.0)
                + F('belivay_reviews_count') * Value(1.0)
                + F('belivay_active_flash_count') * Value(3.0)
                + F('belivay_active_promo_count') * Value(1.0)
                - F('vendor_throttled_penalty'),
                output_field=FloatField(),
            )
        )
    )


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calcule la distance en km entre deux coordonnées géographiques.
    lat1, lon1, lat2, lon2 en degrés décimaux (Decimal ou float)
    """
    # Convertir en float pour les calculs
    lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    
    # Convertir en radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Formule de Haversine
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Rayon de la Terre en km
    
    return c * r


def get_nearby_products(queryset, user_lat=None, user_lon=None, max_distance_km=50, limit=10):
    """
    Retourne les produits les plus proches de l'utilisateur, triés par:
    1. Distance (plus proche = mieux)
    2. Trust Score (plus élevé = mieux)
    3. Bay Box Score (plus élevé = mieux)
    
    Si les coordonnées utilisateur ne sont pas fournies, retourne les meilleurs produits par trust_score.
    
    Args:
        queryset: QuerySet de produits annotés avec belivay_trust_score
        user_lat: Latitude utilisateur (Decimal ou float)
        user_lon: Longitude utilisateur (Decimal ou float)
        max_distance_km: Distance maximale en km (filtre)
        limit: Nombre max de produits à retourner
    
    Returns:
        List of products with proximity data
    """
    from apps.vendors.models import VendorLocation

    if 'belivay_trust_score' not in queryset.query.annotations:
        queryset = annotate_trust_score(queryset)

    products_with_distance = []
    
    if not user_lat or not user_lon:
        # Pas de localisation utilisateur: retourner les meilleurs par trust_score
        return list(queryset.order_by('-belivay_trust_score')[:limit])
    
    # Chercher tous les emplacements de vendeurs dans la zone
    nearby_locations = VendorLocation.objects.filter(
        is_active=True,
        latitude__isnull=False,
        longitude__isnull=False,
    ).select_related('vendor_profile__user')
    
    # Calculer la distance pour chaque emplacement
    location_distances = {}
    for location in nearby_locations:
        distance = haversine_distance(
            float(user_lat), float(user_lon),
            float(location.latitude), float(location.longitude)
        )
        
        if distance <= max_distance_km:
            location_distances[location.vendor_profile.user_id] = distance
    
    # Filtrer les produits par vendeurs proches
    products_in_zone = queryset.filter(vendor_id__in=location_distances.keys())
    
    # Annoter avec la distance du vendeur
    for product in products_in_zone:
        vendor_distance = location_distances.get(product.vendor_id, float('inf'))
        products_with_distance.append({
            'product': product,
            'distance': vendor_distance,
            'trust_score': float(product.belivay_trust_score or 0),
        })
    
    # Trier: distance (croissante) puis trust_score (décroissante)
    products_with_distance.sort(
        key=lambda x: (x['distance'], -x['trust_score'])
    )
    
    return [item['product'] for item in products_with_distance[:limit]]


def get_homepage_featured_rotation(queryset, page=1, page_size=20, seed=None):
    """
    Retourne une rotation des produits d'accueil avec un déterminisme basé sur:
    1. Trust Score élevé
    2. Bay Box Score élevé
    3. Récence
    4. Rotation quotidienne (seed=date) pour éviter répétition
    
    Args:
        queryset: QuerySet de produits
        page: Numéro de page (1-indexed)
        page_size: Nombre de produits par page
        seed: Seed pour la rotation (ex: date du jour, pour rotation quotidienne)
    
    Returns:
        List of paginated products
    """
    import hashlib
    from datetime import datetime, timedelta

    # Autonome : annote belivay_trust_score si ce n'est pas deja fait, pour
    # que la fonction reste correcte quel que soit le queryset recu (evite
    # la fragilite "ca ne marche que si l'appelant a annote au prealable").
    if 'belivay_trust_score' not in queryset.query.annotations:
        queryset = annotate_trust_score(queryset)

    # Si seed non fourni, utiliser le jour actuel
    if seed is None:
        seed = str(datetime.now().date())
    
    # Créer un hash déterministe basé sur le seed
    seed_hash = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    
    # Ajouter de la variation : changer l'ordre chaque jour
    # Mais maintenir la cohérence au sein de la même journée
    daily_rotation = seed_hash % 100
    
    # Annoter avec un score de rotation basé sur:
    # - trust_score (principal)
    # - un offset pseudo-random stable pour ce seed
    rotation_score = ExpressionWrapper(
        F('belivay_trust_score') + 
        (daily_rotation / 100.0),  # Petit offset pour rotation quotidienne
        output_field=FloatField(),
    )
    
    queryset = queryset.annotate(
        rotation_score=rotation_score
    ).order_by('-rotation_score', '-belivay_rating_average', '-created_at')
    
    # Paginer
    start = (page - 1) * page_size
    end = start + page_size
    
    return list(queryset[start:end])


def get_related_products(master_product, exclude_vendor=None, limit=5, user_lat=None, user_lon=None):
    """
    Retourne les produits "liés" d'une fiche produit maître pour recommandations:
    1. Autres offres du même MasterProduct (différents vendeurs)
    2. Priorité aux vendeurs proches de l'acheteur si la position est fournie
       (ramassage plus simple à regrouper pour la livraison)
    3. Trust Score puis prix croissant à distance égale

    Args:
        master_product: Instance de MasterProduct
        exclude_vendor: Vendeur à exclure (pour ne pas recommander la même offre)
        limit: Nombre max de produits à retourner
        user_lat, user_lon: Position de l'acheteur (optionnel)

    Returns:
        List of related products
    """
    from apps.catalog.models import Product, MasterProduct

    if not master_product:
        return []

    queryset = Product.objects.filter(
        moderation_status='APPROVED',
        master=master_product,
    ).exclude(
        vendor=exclude_vendor
    ).select_related('vendor', 'category')
    queryset = annotate_trust_score(queryset)

    if user_lat and user_lon:
        return _order_by_distance_then_trust_score(queryset, user_lat, user_lon, limit)

    return list(queryset.order_by('-belivay_trust_score', 'price_xaf')[:limit])


def _order_by_distance_then_trust_score(queryset, user_lat, user_lon, limit):
    """
    Trie un queryset de Product (deja annote belivay_trust_score) par
    distance boutique->acheteur puis par trust_score. Un vendeur sans
    emplacement connu passe apres ceux localises (distance infinie),
    jamais exclu.
    """
    from apps.vendors.models import VendorLocation

    vendor_ids = list(queryset.values_list('vendor_id', flat=True).distinct())
    locations = VendorLocation.objects.filter(
        is_active=True,
        vendor_profile__user_id__in=vendor_ids,
        latitude__isnull=False,
        longitude__isnull=False,
    ).values_list('vendor_profile__user_id', 'latitude', 'longitude')

    distance_by_vendor = {}
    for vendor_id, lat, lon in locations:
        d = haversine_distance(user_lat, user_lon, lat, lon)
        if vendor_id not in distance_by_vendor or d < distance_by_vendor[vendor_id]:
            distance_by_vendor[vendor_id] = d

    scored = [
        (distance_by_vendor.get(p.vendor_id, float('inf')), -float(p.belivay_trust_score or 0), p)
        for p in queryset
    ]
    scored.sort(key=lambda item: (item[0], item[1]))
    return [item[2] for item in scored[:limit]]


def get_cart_recommendations(master_products, user_lat=None, user_lon=None, limit=5):
    """
    Retourne les recommandations pour le panier (upselling):
    1. Produits de catégories complémentaires
    2. Vendeurs proches (pour regrouper la livraison)
    3. Trust Score élevé
    
    Args:
        master_products: List de MasterProduct actuellement dans le panier
        user_lat: Latitude utilisateur (optionnel)
        user_lon: Longitude utilisateur (optionnel)
        limit: Nombre max de recommandations
    
    Returns:
        List of recommended products
    """
    from apps.catalog.models import Product
    from apps.vendors.models import VendorLocation
    
    if not master_products:
        return []
    
    # Catégories des produits du panier
    cart_categories = set()
    cart_vendors = set()
    
    for mp in master_products:
        if mp.category:
            cart_categories.add(mp.category_id)
        # Chercher les vendeurs des offres pour ce master
        vendors = Product.objects.filter(
            master=mp, moderation_status='APPROVED'
        ).values_list('vendor_id', flat=True).distinct()
        cart_vendors.update(vendors)
    
    # Recommander : produits de categories complementaires, en excluant tout
    # produit deja d'un vendeur du panier OU deja l'un des masters du panier
    # (union des deux conditions, pas leur intersection : un produit d'un
    # vendeur du panier doit sortir meme si son master est different).
    queryset = Product.objects.filter(
        moderation_status='APPROVED',
        category_id__in=cart_categories,
    ).exclude(
        Q(vendor_id__in=cart_vendors) | Q(master__in=master_products)
    ).select_related('vendor', 'category')
    queryset = annotate_trust_score(queryset)

    # Priorise les vendeurs proches (ramassage groupe plus simple a livrer)
    if user_lat and user_lon:
        return _order_by_distance_then_trust_score(queryset, float(user_lat), float(user_lon), limit)

    return list(queryset.order_by('-belivay_trust_score')[:limit])
