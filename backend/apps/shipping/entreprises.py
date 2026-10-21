# backend/apps/shipping/entreprises.py
# Entreprises de livraison (BV-DEV-05) : plafond de valeur des colis et couverture des zones, avec les réglages de l'admin.
#
#   R56.1  valeur maximale d'un colis par palier (t_paliers_entreprise) : Nouveau, Confirmé, Or (sans plafond)
#   R56.2  Or sans assurance des marchandises valide : plafond de Confirmé
#   R56.3  le plafond s'applique colis par colis (valeur_colis) ; un colis au-dessus NE DOIT JAMAIS être visible de
#          l'entreprise
#   R74    une zone est couverte quand une entreprise active la déclare ; R59.3 : au moins r_ent_min_zone par zone exploitée
#
# Le palier vient du Trust Score existant (NEW, CONFIRMED, GOLD, PLATINUM), libellés Nouveau, Confirmé et Or.

from apps.regles import services as regles

PALIER_PAR_TIER = {"NEW": "Nouveau", "CONFIRMED": "Confirmé", "GOLD": "Or", "PLATINUM": "Or"}


def plafond_palier(tier: str):
    """R56.1 : valeur maximale d'un colis du palier ; None : sans plafond."""
    palier = PALIER_PAR_TIER.get(tier, "Nouveau")
    return next(p["valeur_max_colis"] for p in regles.table("t_paliers_entreprise") if p["palier"] == palier)


def plafond_effectif(tier: str, assurance_valide: bool):
    """R56.2, R56.3 : sans assurance des marchandises valide, un palier Or garde le plafond de Confirmé."""
    plafond = plafond_palier(tier)
    if plafond is None and not assurance_valide:
        return plafond_palier("CONFIRMED")
    return plafond


def valeur_colis(shipment) -> int:
    """valeur_colis du colis d'une boutique : prix payés de ses articles (R64.6) ; colis sans boutique : toute la commande."""
    if not shipment.vendor_id:
        return shipment.order.subtotal_xaf
    return sum(i.line_total_xaf for i in shipment.order.items.filter(product__vendor_id=shipment.vendor_id))


def plafond_organisation(organisation):
    """Le plus grand plafond effectif parmi les livreurs actifs de l'entreprise (ce qu'elle peut transporter)."""
    from apps.accounts.models import TrustScoreProfile
    from apps.accounts.trust_score import get_trust_score_profile

    plafonds = []
    for livreur in organisation.couriers.filter(is_active=True, is_approved=True).select_related("user"):
        tier = get_trust_score_profile(livreur.user, TrustScoreProfile.Role.COURIER).tier
        plafonds.append(plafond_effectif(tier, organisation.transport_insurance_verified))
    if not plafonds:
        return 0
    return None if None in plafonds else max(plafonds)


def zones_de(organisation) -> set:
    """Codes Z1 à Z12 déclarés par l'entreprise : un code, un quartier, ou la ville (toutes les zones)."""
    from apps.shipping import zones

    codes = {z["zone"] for z in zones.zones()}
    couvertes = set()
    for nom in organisation.zones or []:
        nom = str(nom).strip()
        if nom.upper() in codes:
            couvertes.add(nom.upper())
        elif zones.plier(nom) in (zones.plier("Yaoundé"), zones.plier("Yaounde")):
            couvertes |= codes
        else:
            couvertes |= {q["zone"] for q in zones.chercher_quartiers(nom)}
    return couvertes


def entreprises_actives():
    from apps.accounts.models import DeliveryOrganizationProfile

    return DeliveryOrganizationProfile.objects.filter(is_active=True, status=DeliveryOrganizationProfile.Status.APPROVED)


def zones_couvertes() -> set:
    """R74 : zones couvertes par au moins une entreprise active."""
    couvertes = set()
    for org in entreprises_actives():
        couvertes |= zones_de(org)
    return couvertes


def zones_sous_le_minimum() -> dict:
    """R59.3 : zones exploitées qui ont moins de r_ent_min_zone entreprises actives → {zone: nombre}."""
    from apps.shipping import zones

    par_zone = {z["zone"]: 0 for z in zones.zones() if zones.zone_exploitee(z["zone"])}
    for org in entreprises_actives():
        for code in zones_de(org):
            if code in par_zone:
                par_zone[code] += 1
    minimum = regles.reglage("r_ent_min_zone")
    return {z: n for z, n in par_zone.items() if n < minimum}
