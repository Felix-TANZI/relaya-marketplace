# backend/apps/whatsapp_assistant/bridge/support.py
# Pont vers le SUPPORT de BelivaY : SEUL fichier du module qui depose une
# demande d'aide et qui previent l'equipe.
#
# On reutilise le canal existant — ContactMessage (apps/contact), celui du
# formulaire de contact du site — plutot que d'inventer un second guichet.
# Un litige (Dispute) n'est PAS utilise ici : il exige une commande livree,
# des photos, et il gele le sequestre de paiement. Ce n'est pas le bon outil
# pour « j'ai une question ».

import logging

logger = logging.getLogger("apps.whatsapp_assistant")

SUBJECT_PREFIX = "WhatsApp"
MAX_MESSAGE = 4000


def email_of_phone(wa_id: str) -> str:
    """
    L'adresse donnee par cette personne lors de sa derniere commande. C'est le
    meme appariement par numero que le suivi de commande : WhatsApp garantit
    le numero de l'expediteur, on ne peut pas se faire passer pour un autre.
    """
    from apps.orders.models import Order

    from .orders import orders_of_phone

    commandes = orders_of_phone(wa_id)
    if not commandes:
        return ""
    emails = (
        Order.objects.filter(pk__in=[commande.id for commande in commandes])
        .exclude(customer_email="").exclude(customer_email__isnull=True)
        .order_by("-created_at").values_list("customer_email", flat=True)
    )
    return next(iter(emails), "")


def name_of_phone(wa_id: str, fallback: str = "") -> str:
    """Le nom du compte BelivaY s'il existe, sinon le nom du profil WhatsApp."""
    from apps.orders.models import Order

    order = (
        Order.objects.filter(customer_phone__endswith=wa_id[-9:], user__isnull=False)
        .select_related("user").order_by("-created_at").first()
    )
    if order and order.user:
        complet = order.user.get_full_name().strip()
        if complet:
            return complet
    return fallback or f"+{wa_id}"


def open_request(wa_id: str, name: str, email: str, message: str, about: str = "") -> int | None:
    """
    Depose la demande dans le guichet de BelivaY et previent l'equipe.
    Renvoie le numero de la demande, ou None si rien n'a pu etre enregistre.
    """
    from apps.contact.models import ContactMessage

    sujet = f"[{SUBJECT_PREFIX}] {about}" if about else f"[{SUBJECT_PREFIX}] Demande d'aide"
    demande = ContactMessage.objects.create(
        name=name[:255] or f"+{wa_id}",
        email=email,
        phone=f"+{wa_id}"[:20],
        subject=sujet[:255],
        message=message[:MAX_MESSAGE],
        user_agent="WhatsApp",                  # la trace du canal, faute de champ dedie
    )
    _send_emails(demande.id)
    _alert_team(demande)
    return demande.id


def _send_emails(demande_id: int) -> None:
    """Le meme envoi que le formulaire du site. Un courtier indisponible ne bloque rien."""
    from apps.contact.utils import send_contact_emails

    try:
        send_contact_emails.delay(demande_id)
    except Exception:                                       # noqa: BLE001
        logger.warning("Demande %s : e-mails de contact non envoyes (file indisponible).", demande_id)


def _alert_team(demande) -> None:
    """
    Previent l'equipe dans l'application. Le formulaire du site ne le fait pas
    — seul un e-mail part — donc une demande peut passer inapercue. On applique
    ici le motif deja utilise ailleurs : une notification par membre is_staff.
    """
    from django.contrib.auth.models import User

    from apps.accounts.models import UserNotification

    try:
        equipe = list(User.objects.filter(is_staff=True, is_active=True))
        UserNotification.objects.bulk_create([
            UserNotification(
                user=membre,
                title="Demande d'aide depuis WhatsApp",
                message=f"{demande.name} ({demande.phone}) : {demande.message[:160]}",
                notification_type=UserNotification.NotificationType.SUPPORT,
                action_url="/admin/operations/contact",
            )
            for membre in equipe
        ])
    except Exception:                                       # noqa: BLE001
        logger.exception("Demande %s : l'equipe n'a pas pu etre prevenue.", demande.id)
