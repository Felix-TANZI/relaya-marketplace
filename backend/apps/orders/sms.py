# backend/apps/orders/sms.py
# SMS d'une commande — feuille de route D7 ; spec v2.1, BV-DEV-05 :
#
#   R78.1  SMS par commande : r_sms_max (6) au plus — paiement protégé, code de retrait, deux rappels (R50.2),
#          incident, remerciement — plus le code de connexion ; jamais de promotion par SMS
#   R50.2  rappels par SMS aux jours r_rappel_j1 et r_rappel_j2 de garde
#   R89.2  le retrait par un tiers est annoncé dans l'application, pas par SMS
#
# Le SMS part au numéro donné à la commande (y compris pour une commande sans compte), par le prestataire du projet
# (apps.otp.prestataires). Chaque envoi est tracé (SmsCommande) : c'est ce qui borne le nombre par commande.

import logging

from apps.regles import services as regles

logger = logging.getLogger("apps.orders")

PAIEMENT_PROTEGE = "paiement_protege"
CODE_RETRAIT = "code_retrait"
RAPPEL_1 = "rappel_1"
RAPPEL_2 = "rappel_2"
INCIDENT = "incident"
REMERCIEMENT = "remerciement"
SORTES = (PAIEMENT_PROTEGE, CODE_RETRAIT, RAPPEL_1, RAPPEL_2, INCIDENT, REMERCIEMENT)


def envoyer(order, sorte: str, texte: str) -> bool:
    """Envoie un SMS de commande (R78.1) ; faux s'il n'est pas parti (pas de numéro, déjà envoyé, plafond atteint)."""
    from apps.orders.models import SmsCommande
    from apps.otp.prestataires import sms

    if sorte not in SORTES:  # R78.1 : rien d'autre, jamais une promotion
        raise ValueError(f"SMS de commande inconnu : {sorte}")
    numero = (order.customer_phone or "").strip()
    if not numero:
        return False
    deja = SmsCommande.objects.filter(order=order, ok=True)
    if sorte != INCIDENT and deja.filter(sorte=sorte).exists():
        return False
    if deja.count() >= regles.reglage("r_sms_max"):
        return False
    try:
        envoi = sms().envoyer(numero, f"BelivaY : {texte}")
    except Exception:  # un prestataire en panne ne bloque jamais l'action métier
        logger.exception("SMS %s non envoyé pour la commande #%s.", sorte, order.pk)
        return False
    SmsCommande.objects.create(order=order, sorte=sorte, ok=envoi.ok, reference=(envoi.reference or "")[:120])
    return envoi.ok


def paiement_protege(order) -> bool:
    # Feuille de route D21 : l'étape « paiement confirmé » entre aussi au centre de notifications (et part en push).
    if order.user_id:
        from apps.accounts.models import UserNotification

        UserNotification.objects.create(
            user_id=order.user_id, title=f"Paiement confirmé · commande #{order.pk}",
            message="Ton argent reste protégé jusqu'à la livraison. Le vendeur prépare ta commande.",
            notification_type=UserNotification.NotificationType.ORDER, action_url=f"/orders/{order.pk}",
        )
    return envoyer(order, PAIEMENT_PROTEGE,
                   f"paiement reçu pour la commande #{order.pk}. Ton argent reste protégé jusqu'à la livraison.")


def code_retrait(order, code: str, relais: str) -> bool:
    return envoyer(order, CODE_RETRAIT,
                   f"ta commande #{order.pk} est au relais {relais}. Code de retrait : {code}. Ne le donne qu'au guichet.")


def incident(order, message: str) -> bool:
    return envoyer(order, INCIDENT, f"incident sur ta commande #{order.pk} : {message[:100]}")


def remerciement(order) -> bool:
    return envoyer(order, REMERCIEMENT, f"merci ! Ta commande #{order.pk} t'a bien été remise.")
