# backend/apps/orders/remboursement_auto.py
# Remboursement automatique sans retour du colis — feuille de route D32 ; spec v2.1, BV-DEV-01 :
#
#   R71.1  sans retour, pour un article de r_auto_rmb_max au plus (r_auto_rmb_max_eleve SI palier_client = Élevé),
#          livraison exclue
#   R71.2  r_auto_rmb_cmd commandes livrées sans litige perdu ; photo ; demande sous r_auto_rmb_demande_h ; au plus
#          r_auto_rmb_30j par 30 jours et r_auto_rmb_an par an par personne (compte, numéro, téléphone)
#   R71.3  payé par BelivaY ; le vendeur est payé normalement
#   R72.1  les frais Mobile Money de l'article sont remboursés aussi
#
# Feuille de route D32, en plus : la photo est comparée aux preuves de la remise (D15) ; dès qu'une limite est
# atteinte ou qu'un doute apparaît, traitement normal avec retour ; droit retiré au client pris en abus après
# validation humaine ; plafond mensuel global r_auto_rmb_plafond_mois (0 = fermé) avec alerte ; chaque cas journalisé.
#
# Choix prudents (à revoir avec l'équipe) : le seuil R71.1 porte sur la ligne de l'article (prix x quantité) ;
# palier_client n'est défini nulle part, tout client est donc Standard ; le « relais habituel » de R71.2 n'est
# pas encore une clé de comptage (il ne désigne pas une personne à lui seul).

import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.regles import services as regles

from .comptoir import LIVREES
from .models import Order, RemboursementAuto, RetraitDroitRemboursementAuto
from .retours import retire_le

logger = logging.getLogger("apps.orders")

PREUVES_DE_REMISE = ("RELAY_RELEASED", "CUSTOMER_DELIVERY")  # D15 : photo de la remise au client
COMPTES = (RemboursementAuto.Statut.VERSE, RemboursementAuto.Statut.INCONNU)
RAISONS = {
    "ferme": "Le remboursement automatique n'est pas ouvert.",
    "droit_retire": "Le remboursement automatique a été retiré à ce compte.",
    "montant": "L'article dépasse le montant du remboursement automatique.",
    "anciennete": "Pas encore assez de commandes livrées sans litige perdu.",
    "photo": "Une photo du problème est demandée.",
    "preuve_remise": "Aucune photo de la remise à comparer.",
    "doute_photo": "La photo envoyée est celle de la remise.",
    "delai": "La demande arrive après le délai du remboursement automatique.",
    "limite_30j": "Limite de remboursements automatiques sur 30 jours atteinte.",
    "limite_an": "Limite de remboursements automatiques sur l'année atteinte.",
    "plafond_mois": "Plafond mensuel des remboursements automatiques atteint.",
    "litige_ouvert": "Un autre litige est en cours sur cette commande.",
}


def plafond_mensuel() -> int:
    try:
        return int(regles.reglage("r_auto_rmb_plafond_mois") or 0)
    except regles.ReglageAbsent:
        return 0


def palier_client(user) -> str:
    """R71.1 : « Standard ou Élevé, défini par la spécification client ». Pas encore défini : Standard pour tous."""
    return "Standard"


def seuil(user) -> int:
    return regles.reglage("r_auto_rmb_max_eleve" if palier_client(user) == "Élevé" else "r_auto_rmb_max")


def _telephone(order) -> str:
    return "".join(ch for ch in (order.customer_phone or "") if ch.isdigit())[-9:]


def livrees_sans_litige_perdu(user, sauf=None) -> int:
    commandes = Order.objects.filter(user=user, fulfillment_status__in=LIVREES).exclude(
        disputes__resolution="REJECTED")
    if sauf is not None:
        commandes = commandes.exclude(pk=sauf.pk)
    return commandes.distinct().count()


def _deja(user, empreinte, telephone, depuis) -> int:
    personne = Q(client=user)
    if empreinte:
        personne |= Q(empreinte_numero=empreinte)
    if telephone:
        personne |= Q(telephone=telephone)
    return RemboursementAuto.objects.filter(personne, statut__in=COMPTES, created_at__gte=depuis).count()


def montants(order, item) -> tuple[int, int]:
    """R71.1 : l'article, livraison exclue ; R72.1 : sa part des frais Mobile Money payés."""
    from .frais import part_frais_momo

    article = int(item.line_total_xaf or 0)
    return article, part_frais_momo(order, article)


def _alerter_plafond(debut_mois) -> None:
    from django.contrib.auth.models import User

    from apps.accounts.models import UserNotification

    titre = f"Plafond mensuel des remboursements automatiques atteint ({debut_mois:%m/%Y})"
    for admin in User.objects.filter(is_staff=True, is_active=True):
        UserNotification.objects.get_or_create(user=admin, title=titre, defaults={
            "message": f"Le plafond r_auto_rmb_plafond_mois ({plafond_mensuel()} F) est atteint : les demandes "
                       "suivent le traitement normal jusqu'au mois prochain (D32).",
            "notification_type": UserNotification.NotificationType.SYSTEM})


def examiner(dispute, maintenant=None) -> str:
    """La première condition non remplie (clé de RAISONS), ou "" si le remboursement automatique est accordé."""
    from apps.payments.bridge import remboursement_auto as pont
    from apps.shipping.models import ShipmentEvidence

    maintenant = maintenant or timezone.now()
    order, item, user = dispute.order, dispute.order_item, dispute.opened_by
    plafond = plafond_mensuel()
    if plafond <= 0:
        return "ferme"
    if RetraitDroitRemboursementAuto.objects.filter(client=user, valide_le__isnull=False).exists():
        return "droit_retire"
    article, frais = montants(order, item)
    if article > seuil(user):
        return "montant"
    if livrees_sans_litige_perdu(user, sauf=order) < regles.reglage("r_auto_rmb_cmd"):
        return "anciennete"
    photos = [e.sha256 for e in dispute.evidences.filter(evidence_type="PHOTO", uploaded_by=user)]
    if not photos:
        return "photo"
    remise = set(ShipmentEvidence.objects.filter(shipment__order=order, shipment__vendor=dispute.vendor,
                                                 stage__in=PREUVES_DE_REMISE).exclude(file="")
                 .values_list("sha256", flat=True))
    if not remise:
        return "preuve_remise"
    if remise & set(photos):
        return "doute_photo"
    retrait = retire_le(order, dispute.vendor)
    if retrait is None or maintenant > retrait + timedelta(hours=regles.reglage("r_auto_rmb_demande_h")):
        return "delai"
    if order.disputes.exclude(pk=dispute.pk).exclude(status__in=["RESOLVED", "CLOSED"]).exists():
        return "litige_ouvert"
    empreinte, telephone = pont.empreinte_payeur(order), _telephone(order)
    if _deja(user, empreinte, telephone, maintenant - timedelta(days=30)) >= regles.reglage("r_auto_rmb_30j"):
        return "limite_30j"
    if _deja(user, empreinte, telephone, maintenant - timedelta(days=365)) >= regles.reglage("r_auto_rmb_an"):
        return "limite_an"
    debut_mois = timezone.localtime(maintenant).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    deja_ce_mois = RemboursementAuto.objects.filter(statut__in=COMPTES, created_at__gte=debut_mois).aggregate(
        t=Sum("total_xaf"))["t"] or 0
    if deja_ce_mois + article + frais > plafond:
        _alerter_plafond(debut_mois)
        return "plafond_mois"
    return ""


def tenter(dispute, statut_avant: str) -> RemboursementAuto:
    """Examine la demande ; accordée, BelivaY rembourse tout de suite et le litige se ferme ; sinon il suit son
    cours normal (retour du colis). Le cas est journalisé dans les deux cas."""
    from apps.accounts.models import UserNotification
    from apps.payments.bridge import remboursement_auto as pont

    order, item = dispute.order, dispute.order_item
    raison = examiner(dispute)
    article, frais = montants(order, item)
    journal = RemboursementAuto(
        dispute=dispute, order=order, order_item=item, client=dispute.opened_by, vendor=dispute.vendor,
        article_xaf=article, frais_momo_xaf=frais, total_xaf=article + frais, raison=raison,
        empreinte_numero=pont.empreinte_payeur(order), telephone=_telephone(order), relais=order.relay_point,
        statut=RemboursementAuto.Statut.REFUSE)
    if raison:
        journal.save()
        return journal
    with transaction.atomic():
        journal.save()
        etat, reference = pont.verser(order, montant=article + frais, reference=f"rembt-auto-{dispute.pk}")
        journal.payout_reference = reference
        journal.statut = {"PAID": RemboursementAuto.Statut.VERSE, "UNKNOWN": RemboursementAuto.Statut.INCONNU}.get(
            etat, RemboursementAuto.Statut.ECHEC)
        journal.save(update_fields=["payout_reference", "statut"])
    if journal.statut == RemboursementAuto.Statut.ECHEC:
        return journal  # l'opérateur a refusé : le litige suit son cours normal
    dispute.status, dispute.resolution, dispute.refund_amount_xaf = "RESOLVED", "REFUND", article + frais
    dispute.save(update_fields=["status", "resolution", "refund_amount_xaf"])
    pont.degeler(order)
    # Après le dégel : le miroir du séquestre réécrit PAID_IN_ESCROW, le colis est pourtant entre les mains du client.
    Order.objects.filter(pk=order.pk).update(fulfillment_status=statut_avant)
    UserNotification.objects.create(
        user=dispute.opened_by, title=f"Remboursement automatique · commande #{order.pk}",
        message=f"Nous vous remboursons {article + frais} F, sans retour du colis.",
        notification_type=UserNotification.NotificationType.ORDER, action_url=f"/orders/{order.pk}")
    return journal


# ── Suivi pour l'administration (D32) ────────────────────────────────────────────────────────────────────

def suivi(maintenant=None) -> dict:
    maintenant = maintenant or timezone.now()
    debut_mois = timezone.localtime(maintenant).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ce_mois = RemboursementAuto.objects.filter(statut__in=COMPTES, created_at__gte=debut_mois)
    vendeurs = (RemboursementAuto.objects.filter(statut__in=COMPTES, created_at__gte=maintenant - timedelta(days=30))
                .values("vendor__username").annotate(nombre=Count("id"), montant=Sum("total_xaf")).order_by("-nombre"))
    return {"plafond_mois_xaf": plafond_mensuel(), "rembourse_ce_mois_xaf": ce_mois.aggregate(t=Sum("total_xaf"))["t"] or 0,
            "nombre_ce_mois": ce_mois.count(), "vendeurs_30j": list(vendeurs)}
