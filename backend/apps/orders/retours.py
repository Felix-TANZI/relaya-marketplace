# backend/apps/orders/retours.py
# Retours et litiges — feuille de route D18 ; spec v2.1, BV-DEV-01 :
#
#   R67.1  retour pendant r_retour_j après le RETRAIT, sur motif seulement : non conforme, abîmé, contrefaçon
#   R67.2  un défaut caché se signale dans les r_defaut_cache_h après le retrait
#   R68.1  le remboursement part quand le colis est récupéré et inspecté, r_inspection_h après sa réception au plus ;
#          sinon il part d'office
#   R69.1  course de retour r_retour, payée après arbitrage par la partie en tort ; gratuite pour le client si le
#          problème est validé
#   R70.1  le vendeur a r_litige_reponse_h pour répondre ; son silence renvoie à l'arbitrage BelivaY
#   R70.2  client silencieux r_litige_silence_j : litige clos ; remplacement sous r_remplacement_h, sinon remboursement

from datetime import timedelta

from django.utils import timezone

from apps.regles import services as regles

# R67.1 : les seuls motifs ; « mauvais article » est une non-conformité. R67.2 : le défaut caché, dans son délai.
MOTIFS_RETOUR = {"DAMAGED", "NOT_AS_DESCRIBED", "WRONG_ITEM", "COUNTERFEIT"}
DEFAUT_CACHE = "HIDDEN_DEFECT"


def retire_le(order, vendeur=None):
    """Quand le client a eu le colis entre les mains (retrait au relais ou remise à domicile) ; None sinon."""
    from apps.shipping.models import Shipment, ShipmentEvent

    colis = Shipment.objects.filter(order=order)
    if vendeur is not None:
        colis = colis.filter(vendor=vendeur)
    moments = []
    for c in colis.select_related("relay_parcel"):
        parcel = getattr(c, "relay_parcel", None)
        if parcel is not None and parcel.picked_up_at:
            moments.append(parcel.picked_up_at)
            continue
        livre = (ShipmentEvent.objects.filter(shipment=c, status=Shipment.Status.DELIVERED)
                 .order_by("-created_at").values_list("created_at", flat=True).first())
        if livre:
            moments.append(livre)
    return max(moments) if moments else None


def refus_de_retour(order, motif: str, vendeur=None, maintenant=None) -> str | None:
    """Message de refus d'un retour ou d'un litige après réception (R67.1, R67.2) ; None s'il est recevable."""
    maintenant = maintenant or timezone.now()
    retrait = retire_le(order, vendeur) or order.updated_at
    if motif == DEFAUT_CACHE:
        limite = retrait + timedelta(hours=regles.reglage("r_defaut_cache_h"))
        if maintenant > limite:
            return f"Un défaut caché se signale dans les {regles.reglage('r_defaut_cache_h')} h après le retrait."
        return None
    if motif not in MOTIFS_RETOUR:
        return "Le retour se fait sur motif seulement : article non conforme, abîmé ou contrefait."
    if maintenant > retrait + timedelta(days=regles.reglage("r_retour_j")):
        return f"Le délai de {regles.reglage('r_retour_j')} jours après le retrait est dépassé pour cette commande."
    return None


def echeance_vendeur(dispute):
    """R70.1 : le vendeur répond dans les r_litige_reponse_h après l'ouverture du litige."""
    return dispute.created_at + timedelta(hours=regles.reglage("r_litige_reponse_h"))


def attribuer_frais_de_retour(ret) -> None:
    """R69.1 : après l'inspection, la course de retour (r_retour) revient à la partie en tort. Problème validé : le
    vendeur, ou l'acteur de la chaîne de garde dont la preuve manque (D15) ; non validé : le client."""
    from apps.shipping.preuves import chaine_de_garde

    if ret.inspection_passed is None:
        return
    partie = "client"
    if ret.inspection_passed:
        partie = "vendeur"
        for colis in ret.order.shipments.filter(vendor=ret.vendor):
            responsable = chaine_de_garde(colis)["responsable"]
            if responsable:
                partie = "transporteur" if responsable == "livreur" else responsable
                break
    ret.frais_retour_xaf = regles.reglage("r_retour")
    ret.frais_retour_partie = partie
    ret.save(update_fields=["frais_retour_xaf", "frais_retour_partie", "updated_at"])
    from apps.payments.bridge.retours import facturer_course_de_retour

    facturer_course_de_retour(ret)  # créance sur la partie en tort, approuvée par un tiers
