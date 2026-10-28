# backend/apps/shipping/garde.py
# Garde au relais et colis non retiré (BV-DEV-01, algorithme A4), avec les fonctions du moteur BV-DEV-09 et les
# réglages de l'admin (t_garde, r_garde_*).
#
#   R37.1  j = ⌊(heures depuis le scan d'arrivée du DERNIER colis de la commande − heures de fermeture déclarée du
#          relais) ÷ r_garde_heures⌋ + 1 ; tous les colis d'une commande ont le même j. Les fermetures des relais ne
#          sont pas encore déclarées dans l'application : elles valent 0 tant qu'elles n'existent pas.
#   R36.2  garde_colis = min(Σ t_garde des jours 1 à j ; valeur_colis), pour chaque colis ; garde de la commande = Σ.
#   R38.1  part_garde du relais par colis.
#   R37.2, R39.1  renvoi au vendeur quand j > r_garde_jours.
#   R39.2  rembourse = max(0 ; arrondi(produits − couv_concernee − Σ garde_colis(r_garde_jours) − frais_absence non
#          payés)) ; la livraison payée et les frais Mobile Money ne sont pas rendus (R72).
#   R50.2  rappels par SMS aux jours r_rappel_j1 et r_rappel_j2.

from datetime import timedelta
from fractions import Fraction

from django.utils import timezone

from apps.regles import services as regles

EN_ATTENTE = ("EXPECTED",)
AU_RELAIS = ("RECEIVED", "STORED")


def colis_de_la_commande(order):
    from apps.shipping.models import RelayParcel

    return list(RelayParcel.objects.filter(shipment__order=order).select_related("shipment"))


def arrivee_du_dernier(order, colis=None):
    """Scan d'arrivée du dernier colis de la commande ; None tant qu'un colis est encore attendu (R37.1, R50.1)."""
    colis = colis if colis is not None else colis_de_la_commande(order)
    if not colis or any(c.status in EN_ATTENTE for c in colis):
        return None
    arrivees = [c.received_at for c in colis if c.received_at]
    return max(arrivees) if arrivees else None


def jour(order, at=None, colis=None):
    """j de la commande à l'instant `at` (R37.1) ; None tant que tous ses colis ne sont pas arrivés."""
    arrivee = arrivee_du_dernier(order, colis)
    if arrivee is None:
        return None
    heures = Fraction(int(((at or timezone.now()) - arrivee).total_seconds()), 3600)
    return regles.moteur().jour_garde(max(heures, 0), 0)


def valeur_colis(parcel) -> int:
    """valeur_colis : prix payés des articles du colis (une boutique de la commande, R64.6)."""
    commande, vendeur = parcel.shipment.order, parcel.shipment.vendor_id
    return sum(i.line_total_xaf for i in commande.items.filter(product__vendor_id=vendeur))


def garde_colis(parcel, j) -> int:
    """R36.2 pour ce colis au jour j."""
    if not j:
        return 0
    return int(regles.moteur().garde_colis(min(j, regles.reglage("r_garde_jours")), valeur_colis(parcel)))


def garde_commande(order, at=None) -> dict:
    """{j, colis: {parcel_id: garde_colis}, total} de la commande (A4, étape 3)."""
    colis = colis_de_la_commande(order)
    j = jour(order, at, colis)
    par_colis = {c.pk: garde_colis(c, j) for c in colis if c.status in AU_RELAIS}
    return {"j": j, "colis": par_colis, "total": sum(par_colis.values())}


def part_garde(j) -> int:
    """R38.1 : part du relais par colis, due même quand la garde est plafonnée."""
    return int(regles.moteur().part_garde(min(j or 0, regles.reglage("r_garde_jours"))))


def fin_du_jour_1(order, colis=None):
    arrivee = arrivee_du_dernier(order, colis)
    return arrivee + timedelta(hours=regles.reglage("r_garde_heures")) if arrivee else None


def echeance_renvoi(order, colis=None):
    """Instant où j dépasse r_garde_jours (R37.2) : le colis repart au vendeur."""
    arrivee = arrivee_du_dernier(order, colis)
    if arrivee is None:
        return None
    return arrivee + timedelta(hours=regles.reglage("r_garde_jours") * regles.reglage("r_garde_heures"))


def rembourse_non_retire(order, colis=None, frais_absence_non_payes=0) -> int:
    """R39.2 pour les colis non retirés de la commande (R85.4 pour couv_concernee)."""
    m = regles.moteur()
    colis = [c for c in (colis if colis is not None else colis_de_la_commande(order)) if c.status in AU_RELAIS]
    produits = sum(valeur_colis(c) for c in colis)
    if not produits or not order.subtotal_xaf:
        return 0
    couv = m.couv_concernee(order.couverture_xaf, produits, order.subtotal_xaf)
    gardes = [garde_colis(c, regles.reglage("r_garde_jours")) for c in colis]
    return int(m.rembourse_non_retire(produits, couv, gardes, frais_absence_non_payes))


# ── Places d'un relais (R40.2, R41.3) ────────────────────────────────────────────────────────────────────

def places_du_colis(parcel) -> int:
    """places(format) des colis de cette boutique (t_formats), lus dans les frais figés de la commande ; 1 par défaut
    pour une commande antérieure à la spec v2.1."""
    m = regles.moteur()
    detail = parcel.shipment.order.frais_detail or {}
    boutique = next((b for b in detail.get("boutiques", []) if b.get("vendeur") == parcel.shipment.vendor_id), None)
    if not boutique:
        return 1
    return sum(m.fmt[f]["places_relais"] for f in boutique.get("colis_b", []) if f in m.fmt) or 1


def places_occupees(relais) -> int:
    from apps.shipping.models import RelayParcel

    colis = RelayParcel.objects.filter(relay_point=relais, status__in=EN_ATTENTE + AU_RELAIS).select_related("shipment__order")
    return sum(places_du_colis(c) for c in colis)


def relais_sature(relais, places_occupees_=None) -> bool:
    """R41.3 : les places occupées atteignent r_relais_saturation de ses places → plus de nouveau paquet. Un relais
    sans capacité déclarée n'est pas limité."""
    capacite = relais.storage_capacity or 0
    if not capacite:
        return False
    occupees = places_occupees(relais) if places_occupees_ is None else places_occupees_
    return occupees >= Fraction(str(regles.reglage("r_relais_saturation"))) * capacite
