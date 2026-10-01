# backend/apps/accounts/account_deletion.py
# Suppression de compte à l'initiative de l'utilisateur
# (App Store Review Guideline 5.1.1(v)).
#
# Le compte n'est pas supprimé physiquement : les commandes, transactions,
# écritures comptables et litiges doivent être conservés (obligations
# légales/comptables) et y sont rattachés par clé étrangère. On :
#   1. anonymise l'identité (nom, email, identifiant, mot de passe),
#   2. efface les données personnelles annexes (profil, avatar, coordonnées
#      des commandes, moyens de versement, favoris, notifications, panier…),
#   3. désactive le compte (is_active=False) : SimpleJWT refuse alors tout
#      jeton existant, et les sessions sont fermées,
#   4. révoque l'autorisation "Sign in with Apple" si le compte y est lié.
#
# La suppression est refusée tant qu'une commande, une livraison ou un litige
# est en cours (sinon le vendeur, le livreur ou l'arbitrage perdraient les
# coordonnées nécessaires) : l'utilisateur voit la raison et pourra réessayer.

import logging
import secrets

from django.db import transaction

logger = logging.getLogger(__name__)


# Commandes payées mais pas encore terminées côté acheteur.
BUYER_ACTIVE_ORDER_STATUSES = (
    "PAID_IN_ESCROW",
    "VENDOR_ACKNOWLEDGED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "DRIVER_ASSIGNED",
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "DISPUTED",
)
# Côté vendeur, s'ajoutent les commandes confirmées dont les fonds ne sont
# pas encore libérés.
VENDOR_ACTIVE_ORDER_STATUSES = BUYER_ACTIVE_ORDER_STATUSES + (
    "BUYER_CONFIRMED",
    "AUTO_CONFIRMED",
)
OPEN_DISPUTE_STATUSES = ("OPEN", "IN_PROGRESS")
FINISHED_SHIPMENT_STATUSES = ("DELIVERED", "FAILED", "CANCELLED")


class AccountDeletionBlocked(Exception):
    """La suppression est impossible pour l'instant (raison lisible)."""


def deletion_blockers(user):
    """Retourne la liste des raisons (texte) empêchant la suppression."""
    from apps.orders.models import Dispute, Order
    from apps.shipping.models import Shipment

    if user.is_staff or user.is_superuser:
        return ["Les comptes d'administration ne peuvent pas être supprimés depuis l'application."]
    if hasattr(user, "delivery_organization_profile") or hasattr(user, "relay_point_profile"):
        return [
            "Ce compte est rattaché à un partenaire BelivaY (entreprise de livraison ou point relais) "
            "lié par contrat : sa clôture est traitée avec l'équipe BelivaY."
        ]

    reasons = []
    if Order.objects.filter(user=user, fulfillment_status__in=BUYER_ACTIVE_ORDER_STATUSES).exists():
        reasons.append("Vous avez une commande en cours. Attendez sa livraison (ou son annulation) avant de supprimer votre compte.")

    if Dispute.objects.filter(status__in=OPEN_DISPUTE_STATUSES).filter(
        _q_dispute_involves(user)
    ).exists():
        reasons.append("Un litige vous concernant est encore ouvert.")

    if hasattr(user, "vendor_profile"):
        if Order.objects.filter(
            items__product__vendor=user,
            fulfillment_status__in=VENDOR_ACTIVE_ORDER_STATUSES,
        ).exists():
            reasons.append("Votre boutique a des commandes en cours ou des fonds pas encore reversés.")

    if hasattr(user, "courier_profile"):
        if Shipment.objects.filter(courier__user=user).exclude(status__in=FINISHED_SHIPMENT_STATUSES).exists():
            reasons.append("Des livraisons vous sont encore assignées.")

    return reasons


def _q_dispute_involves(user):
    from django.db.models import Q

    return Q(opened_by=user) | Q(vendor=user) | Q(order__user=user)


def delete_account(user):
    """Anonymise et désactive le compte. Lève AccountDeletionBlocked si une
    activité en cours l'empêche."""
    reasons = deletion_blockers(user)
    if reasons:
        raise AccountDeletionBlocked(" ".join(reasons))

    # Révocation Apple avant d'effacer la liaison (appel réseau, hors
    # transaction ; un échec est journalisé mais n'empêche pas la suppression).
    _revoke_apple_authorization(user)

    with transaction.atomic():
        _anonymize_orders(user)
        _clear_personal_records(user)
        _anonymize_partner_profiles(user)
        _anonymize_profile(user)
        _close_sessions(user)

        user.username = f"deleted_{user.pk}_{secrets.token_hex(4)}"
        user.email = ""
        user.first_name = ""
        user.last_name = ""
        user.is_active = False
        user.set_unusable_password()
        user.save()

    logger.info("Compte %s supprimé (anonymisé) à la demande de l'utilisateur", user.pk)


def _revoke_apple_authorization(user):
    from . import apple
    from .models import AppleIdentity

    identity = AppleIdentity.objects.filter(user=user).first()
    if identity is None:
        return
    refresh_token = apple.decrypt_token(identity.refresh_token_encrypted)
    if not refresh_token:
        logger.warning("Compte %s lié à Apple sans refresh_token : révocation Apple impossible", user.pk)
        return
    try:
        apple.revoke_token(refresh_token, identity.client_id)
    except Exception as exc:
        logger.error("Révocation Apple échouée pour le compte %s : %s", user.pk, exc)


def _anonymize_orders(user):
    """Conserve les commandes (montants, articles, dates, statuts) mais retire
    les coordonnées de l'acheteur."""
    from apps.orders.models import Order

    Order.objects.filter(user=user).update(
        customer_email=None,
        customer_phone="",
        address="",
        address_precision={},
        delivery_latitude=None,
        delivery_longitude=None,
        note=None,
    )


def _clear_personal_records(user):
    from .models import (
        AppleIdentity,
        OTPCode,
        PayoutAccount,
        UserCart,
        UserFavorite,
        UserNotification,
    )

    AppleIdentity.objects.filter(user=user).delete()
    OTPCode.objects.filter(user=user).delete()
    PayoutAccount.objects.filter(user=user).delete()
    UserCart.objects.filter(user=user).delete()
    UserFavorite.objects.filter(user=user).delete()
    UserNotification.objects.filter(user=user).delete()


def _anonymize_profile(user):
    from .models import UserProfile

    profile = UserProfile.objects.filter(user=user).first()
    if profile is None:
        return
    if profile.avatar:
        profile.avatar.delete(save=False)
    profile.avatar = None
    profile.phone = None
    profile.date_of_birth = None
    profile.bio = None
    profile.newsletter_subscribed = False
    profile.sms_notifications = False
    profile.two_factor_enabled = False
    profile.two_factor_phone = ""
    profile.save()


def _anonymize_partner_profiles(user):
    """Comptes devenus vendeur ou livreur via l'application : la boutique et
    ses produits sont retirés de la vente, les coordonnées effacées. La
    raison sociale et l'historique des ventes restent (pièces comptables)."""
    from apps.catalog.models import Product
    from apps.vendors.models import VendorLocation, VendorProfile

    from .models import CourierProfile

    vendor = VendorProfile.objects.filter(user=user).first()
    if vendor is not None:
        for image in (vendor.profile_photo, vendor.banner_image):
            if image:
                image.delete(save=False)
        VendorProfile.objects.filter(pk=vendor.pk).update(
            status=VendorProfile.Status.SUSPENDED,
            is_online=False,
            phone="",
            whatsapp_phone="",
            default_withdrawal_phone="",
            address="",
            id_document="",
            profile_photo=None,
            banner_image=None,
        )
        VendorLocation.objects.filter(vendor=vendor).update(
            is_active=False,
            phone="",
            email="",
            representative_name="",
            representative_phone="",
        )
        Product.all_objects.filter(vendor=user).update(is_active=False)

    CourierProfile.objects.filter(user=user).update(
        is_active=False,
        is_online=False,
        availability_status=CourierProfile.AvailabilityStatus.SUSPENDED,
        phone="",
        id_card="",
    )


def _close_sessions(user):
    from .models import UserSession

    UserSession.objects.filter(user=user).update(is_active=False)
