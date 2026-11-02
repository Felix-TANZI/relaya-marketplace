# backend/apps/catalog/offers.py
# Tache D5 — une seule fiche par produit dans la grille.
#
# Le client cherche un produit, jamais un vendeur : chaque produit a une seule
# fiche, derriere laquelle plusieurs vendeurs placent leur offre. La grille ne
# doit donc sortir qu'UNE offre par MasterProduct.
#
# Choix de l'offre representante, dans l'ordre :
#   1. le prix effectivement paye par le client, le plus bas ;
#   2. a egalite, le Trust Score du vendeur le plus eleve ;
#   3. a egalite encore, le plus petit identifiant (pour que deux appels
#      identiques renvoient toujours la meme fiche).
#
# LIMITE CONNUE, A LEVER AVEC D8 : le critere est le prix du produit, pas le
# cout TOTAL LIVRE (produit + livraison reelle). D8 remplacera l'ordre de tri
# ci-dessus ; la structure du regroupement, elle, ne bougera pas. La regle
# metier le prevoit explicitement : tant que la zone du client est inconnue,
# on affiche le prix du produit le plus bas et on recalcule des que l'adresse
# est connue.
#
# Tout se fait en SQL, volontairement : un regroupement fait en Python apres
# coup fausserait la pagination et le comptage.

from __future__ import annotations

from django.db.models import (
    Case, F, IntegerField, OuterRef, Q, QuerySet, Subquery, Value, When,
)
from django.db.models.functions import Coalesce
from django.utils import timezone

from .flash import flash_ouvert
from .models import PromotionCampaign


def regroupable(qs) -> bool:
    """
    Dit si `qs` peut encore recevoir le regroupement.

    La passe floue de la recherche renvoie `ranked[:FUZZY_LIMIT]`, un queryset
    deja tronque — et Django refuse de filtrer apres une decoupe. Plutot que
    de risquer une erreur 500 sur une recherche approximative, on laisse
    passer le resultat tel quel : une fiche en double y est moins grave.
    """
    if not isinstance(qs, QuerySet):
        return False

    requete = qs.query
    tronque = getattr(requete, "is_sliced", None)
    if tronque is None:  # garde-fou si l'attribut disparait d'une version
        tronque = requete.low_mark != 0 or requete.high_mark is not None
    return not tronque


def annotate_effective_price(qs):
    """
    Ajoute `effective_price` : le prix que le client paierait aujourd'hui.

    Reproduit fidelement ProductSerializer.get_price_final(), mais en SQL —
    sans quoi on regrouperait sur le prix catalogue et une offre en promotion
    perdrait face a une offre plus chere affichee moins cher.

    Si les deux calculs divergent un jour, c'est le serializer qui fait foi :
    c'est lui que le client voit. Le test `test_fiche_unique` compare les deux
    pour que l'ecart ne puisse pas passer inapercu.
    """
    maintenant = timezone.now()

    # Campagne active du produit, FLASH prioritaire — meme regle que
    # PromotionCampaign.is_active_now et que le tri de _get_active_campaign().
    campagnes = (
        PromotionCampaign.objects
        .filter(
            product=OuterRef("pk"),
            status=PromotionCampaign.Status.APPROVED,
            starts_at__lte=maintenant,
            ends_at__gte=maintenant,
        )
        .filter(
            ~Q(campaign_type=PromotionCampaign.CampaignType.FLASH)
            | Q(stock_reserved__gt=F("stock_claimed"))
        )
    )
    if not flash_ouvert():  # FF-FLASH fermé : la vente flash ne fait plus le prix (même règle que flash.choisir)
        campagnes = campagnes.exclude(campaign_type=PromotionCampaign.CampaignType.FLASH)
    campagne_active = (
        campagnes
        .annotate(
            priorite=Case(
                When(campaign_type=PromotionCampaign.CampaignType.FLASH, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        .order_by("priorite", "id")
        .values("promo_price_xaf")[:1]
    )

    # Hors campagne : remise en pourcentage, ou prix catalogue tel quel.
    prix_hors_campagne = Case(
        When(compare_at_price__gt=F("price_xaf"), then=F("price_xaf")),
        When(
            discount__gt=0,
            then=F("price_xaf") - F("price_xaf") * F("discount") / Value(100),
        ),
        default=F("price_xaf"),
        output_field=IntegerField(),
    )

    return qs.annotate(
        effective_price=Coalesce(
            Subquery(campagne_active, output_field=IntegerField()),
            prix_hors_campagne,
            output_field=IntegerField(),
        )
    )


def one_offer_per_master(qs):
    """
    Ne garde qu'une offre par MasterProduct.

    `qs` doit etre le queryset DEJA filtre (categorie, recherche, stock...) :
    l'offre representante est choisie parmi les offres que le client voit
    reellement. Sinon, filtrer par categorie pourrait elire une offre absente
    du resultat et faire disparaitre la fiche entiere.

    Les produits sans master n'ont rien a regrouper : ils passent tels quels.
    """
    qs = annotate_effective_price(qs)

    representante = (
        qs.filter(master=OuterRef("master"))
        .order_by("effective_price", "-belivay_trust_score", "id")
        .values("id")[:1]
    )

    return qs.filter(Q(master__isnull=True) | Q(id=Subquery(representante)))
