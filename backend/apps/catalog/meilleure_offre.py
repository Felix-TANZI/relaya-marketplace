# backend/apps/catalog/meilleure_offre.py
# Meilleure offre d'un produit et sélection des offres du panier (BV-DEV-02, algorithmes A6 et A12), calculées par le
# moteur BV-DEV-09. Ce module mesure, pour chaque offre réelle, ce que le moteur attend :
#
#   prix          prix affiché : flash, sinon promotion, sinon normal (R27.2)
#   zone_b, niv_b, km_b   boutique de l'offre vers la destination (R27.2, R83)
#   format        format de la fiche maître (R62)
#   trust         Trust Score du vendeur ; nouveau : moins de r_nouveau_seuil commandes livrées sans incident (R32.3)
#   part_reelle   part des commandes payées du produit reçues par l'offre, r_periode_parts jours, zone de destination (R31.4)
#   dernier_service  rang de la dernière commande servie (1 = servie le moins récemment ; jamais servie : None)
#   delai_h       r_prep_h ; stock (R30.4) ; note des avis (R30.5) ; mic de la fiche (R30.6)
#
# et applique les conditions d'éligibilité que le moteur ne connaît pas (R32.1) : offre publiée, pièce d'identité du
# vendeur vérifiée, boutique ni en pause ni « Fermé aujourd'hui », position GPS renseignée. La couverture de la zone
# par une entreprise active (R74.4) arrive avec les entreprises de livraison (BV-DEV-05) : en attendant, une zone est
# couverte.

from datetime import timedelta

from django.utils import timezone

from apps.regles import services as regles

LIVREES = ("DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR")


def mois_depuis_ouverture(maintenant=None) -> int:
    """m (R29.1) : mois entamés depuis r_date_ouverture_achats ; 1 tant que les achats ne sont pas ouverts."""
    from datetime import date

    ouverture = regles.reglage("r_date_ouverture_achats")
    if not ouverture:
        return 1
    debut = date.fromisoformat(ouverture)
    jour = timezone.localdate(maintenant) if maintenant else timezone.localdate()
    if jour < debut:
        return 1
    return (jour.year - debut.year) * 12 + (jour.month - debut.month) + (1 if jour.day >= debut.day else 0)


def _boutique_eligible(vendeur) -> bool:
    """R32.1 : pièce d'identité vérifiée ; boutique non suspendue, position GPS renseignée, pas « Fermé aujourd'hui »."""
    from apps.vendors.kyc import identite_verifiee

    profil = getattr(vendeur, "vendor_profile", None)
    if profil is None or profil.is_paused or profil.closed_today_date == timezone.localdate():
        return False
    if not profil.locations.filter(is_active=True, latitude__isnull=False, longitude__isnull=False).exists():
        return False
    return identite_verifiee(vendeur)


def _trust(vendeur) -> float:
    from apps.accounts.models import TrustScoreProfile

    s = (TrustScoreProfile.objects.filter(user=vendeur, role=TrustScoreProfile.Role.VENDOR)
         .values_list("score", flat=True).first())
    return float(s) if s is not None else 50.0


def _nouveau(vendeur) -> bool:
    """R32.3 : moins de r_nouveau_seuil commandes livrées sans incident (litige perdu par le vendeur ou en cours)."""
    from apps.orders.models import Order

    livrees = (Order.objects.filter(items__product__vendor=vendeur, fulfillment_status__in=LIVREES)
               .exclude(disputes__resolution__in=["REFUND", "PARTIAL_REFUND", "EXCHANGE"]).distinct().count())
    return livrees < regles.reglage("r_nouveau_seuil")


def _commandes_du_produit(master, zone_dest, maintenant):
    """Commandes payées du produit, sur r_periode_parts jours glissants, dans la zone de destination (R31.4)."""
    from apps.orders.models import Order

    depuis = maintenant - timedelta(days=regles.reglage("r_periode_parts"))
    return (Order.objects.filter(items__product__master=master, payment_status=Order.PaymentStatus.PAID,
                                 created_at__gte=depuis, zone__code=zone_dest).distinct())


def mesurer(offres, destination, maintenant=None) -> list[dict]:
    """Entrées du moteur (A6) pour les offres éligibles d'un même produit, vers `destination` (frais.Destination)."""
    from apps.catalog.offers import annotate_effective_price
    from apps.catalog.regles_catalogue import colis_fiche
    from apps.orders.frais import FraisImpossibles, _lieu_boutique
    from apps.orders.models import OrderItem
    from apps.shipping.itineraire import distance_route_km

    maintenant = maintenant or timezone.now()
    offres = [o for o in offres if o.is_active and o.moderation_status == "APPROVED" and o.master_id]
    if not offres:
        return []
    master = offres[0].master
    colis = colis_fiche(master)
    if colis is None:
        return []
    prix = dict(annotate_effective_price(type(offres[0]).objects.filter(pk__in=[o.pk for o in offres]))
                .values_list("pk", "effective_price"))
    commandes = list(_commandes_du_produit(master, destination.zone_dest, maintenant).values_list("pk", flat=True))
    servies = {}  # offre → dernière commande payée reçue (toutes zones) pour dernier_service
    for pid, quand in (OrderItem.objects.filter(product__in=offres, order__payment_status="PAID")
                       .values_list("product_id", "order__created_at").order_by("order__created_at")):
        servies[pid] = quand
    rangs = {pid: rang for rang, (pid, _) in enumerate(sorted(servies.items(), key=lambda x: x[1]), start=1)}

    mesures = []
    for o in offres:
        if not _boutique_eligible(o.vendor):
            continue
        try:
            position, zone_b, niv_b = _lieu_boutique(o.vendor)
        except FraisImpossibles:
            continue
        km = 0.0
        if destination.mode == "domicile" and destination.position:
            km = float(distance_route_km(position, destination.position)[0])
        recues = OrderItem.objects.filter(order_id__in=commandes, product=o).values("order").distinct().count()
        avis = list(o.reviews.filter(is_approved=True).values_list("rating", flat=True))
        stock = getattr(getattr(o, "inventory", None), "quantity", 0) or 0
        mesures.append({
            "id": o.pk, "prix": int(prix.get(o.pk, o.price_xaf)), "zone_b": zone_b, "niv_b": niv_b, "km_b": km,
            "format": colis["format"], "trust": _trust(o.vendor), "nouveau": _nouveau(o.vendor),
            "part_reelle": recues / len(commandes) if commandes else 0.0, "dernier_service": rangs.get(o.pk),
            "delai_h": regles.reglage("r_prep_h"), "stock": stock,
            "note": sum(avis) / len(avis) if avis else None, "mic": master.made_in_cameroon, "zone_couverte": True,
            "vendeur": o.vendor_id,
        })
    return mesures


def meilleure_offre(offres, destination, maintenant=None) -> dict | None:
    """A6 : {retenue, ctl_min, tol, phase, en_course[...]} ; None si aucune offre éligible (R32.4 : « Indisponible »)."""
    mesures = mesurer(offres, destination, maintenant)
    mesures = [o for o in mesures if o["stock"] > 0 and o["trust"] >= regles.reglage("r_trust_min")]
    if not mesures:
        return None
    dest = {"zone_dest": destination.zone_dest, "niv_client": destination.niv_client or "centre"}
    try:
        return regles.moteur().meilleure_offre(mesures, destination.mode, dest, mois_depuis_ouverture(maintenant))
    except ValueError:  # toutes les offres en contrôle (R33.2)
        return None


def destination_par_defaut(user):
    """R27.3 : adresse par défaut du client ; sinon le relais de sa zone ; sinon le relais de la zone Z6."""
    from apps.accounts.models import RelayPointProfile
    from apps.orders.frais import Destination, FraisImpossibles, destination_relais

    if user is not None and getattr(user, "is_authenticated", False):
        from apps.client_accounts.services import adresse_principale

        a = adresse_principale(user)
        if a is not None and a.zone and a.lat is not None:
            return Destination("domicile", a.zone, a.niveau or "centre", (float(a.lat), float(a.lon)))
    for relais in RelayPointProfile.objects.filter(is_active=True, status=RelayPointProfile.Status.APPROVED):
        try:
            d = destination_relais(relais)
        except FraisImpossibles:
            continue
        if d.zone_dest == "Z6":
            return d
    return Destination("relais", "Z6")


def journaliser(master, destination, resultat: dict, raison: str, order=None):
    """R27.7 : offre retenue, phase, ctl_min, tol, offres en course avec score, part_cible et part_reelle, raison."""
    from apps.catalog.models import SelectionOffre

    return SelectionOffre.objects.create(
        master=master, order=order, mode=destination.mode, zone_dest=destination.zone_dest, raison=raison,
        phase=resultat.get("phase", ""), ctl_min=resultat.get("ctl_min") or 0, tol=resultat.get("tol") or 0,
        retenue_id=resultat.get("retenue"),
        en_course=[{k: (float(v) if isinstance(v, float) or hasattr(v, "numerator") else v)
                    for k, v in o.items() if k in ("id", "ctl", "score", "part_cible", "part_reelle", "retard")}
                   for o in resultat.get("en_course", [])],
    )


# ── A12 : sélection des offres du panier (R93) ───────────────────────────────────────────────────────────

def _article(produit):
    """Un article du panier : la fiche maître (et la variante choisie) ; ses offres en course viennent d'A6."""
    return f"{produit.master_id}-{produit.variant_id or 0}"


def selectionner_panier(lignes: list[tuple], destination, maintenant=None) -> dict:
    """R93.2 à R93.5 : refait la sélection pour le panier entier et la destination. Rend {lignes, choix, selections} ;
    `lignes` garde l'ordre du panier, chaque offre remplacée par l'offre retenue. Un article sans fiche maître garde
    son offre. Sans combinaison qui respecte R84.1, les lignes restent telles quelles (le devis bloque « Payer »)."""
    from apps.catalog.models import Product
    from apps.catalog.regles_catalogue import colis_fiche

    if any(p.master_id is None for p, _ in lignes):
        return {"lignes": lignes, "choix": {}, "selections": {}}
    articles, offres, vendeurs, selections, produits = [], {}, {}, {}, {}
    for produit, qty in lignes:
        cle = _article(produit)
        if cle in offres:
            continue
        candidates = Product.objects.filter(master=produit.master, is_active=True, moderation_status="APPROVED")
        if produit.variant_id:
            candidates = candidates.filter(variant=produit.variant)
        candidates = list(candidates.select_related("vendor", "master", "inventory"))
        r = meilleure_offre(candidates, destination, maintenant)
        if r is None:
            return {"lignes": lignes, "choix": {}, "selections": {}}
        selections[cle] = r
        produits.update({c.pk: c for c in candidates})
        colis = colis_fiche(produit.master)
        articles.append({"id": cle, "q": qty, "format": colis["format"], "pf": colis["pf_kg"], "vol": colis["volume_l"]})
        offres[cle] = [{"id": o["id"], "vendeur": o["vendeur"], "prix": o["prix"], "retard": o["retard"], "score": o["score"],
                        "part_reelle": o["part_reelle"], "part_cible": o["part_cible"]} for o in r["en_course"]]
        for o in r["en_course"]:
            vendeurs[o["vendeur"]] = {"zone_b": o["zone_b"], "niv_b": o["niv_b"], "km_b": o["km_b"], "detour_b": 0}
    dest = {"zone_dest": destination.zone_dest, "niv_client": destination.niv_client or "centre"}
    resultat = regles.moteur().selection_panier(destination.mode, dest, articles, offres, vendeurs)
    if "refus" in resultat:
        return {"lignes": lignes, "choix": {}, "selections": selections}
    choix = resultat["choix"]
    nouvelles = [(produits[choix[_article(p)]], qty) for p, qty in lignes]
    return {"lignes": nouvelles, "choix": choix, "selections": selections}
