# backend/apps/orders/flash.py
# Stock flash — feuille de route D9 : le stock d'un Flash Deal est le même pour tous et baisse à la commande.
#
#   reserver  à la création de la commande, atomiquement : refus si le stock flash ne suffit plus (le client revoit
#             alors le prix normal, R93.6 « Un prix a changé ») ;
#   rendre    si la commande est annulée, ou reste impayée au-delà du délai de paiement de son intention.

from datetime import timedelta

from django.db.models import F
from django.db.models.functions import Greatest
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Order, ReservationFlash


class FlashEpuise(Exception):
    pass


def reserver(order) -> int:
    """Une réservation par article payé au prix flash ; lève FlashEpuise si le stock restant ne suffit plus."""
    from apps.catalog.flash import campagne_active
    from apps.catalog.models import PromotionCampaign

    n = 0
    for item in order.items.select_related("product"):
        if item.product is None:
            continue
        campagne = campagne_active(item.product)
        if (campagne is None or campagne.campaign_type != PromotionCampaign.CampaignType.FLASH
                or item.price_xaf_snapshot != campagne.promo_price_xaf):
            continue
        pris = (PromotionCampaign.objects
                .filter(pk=campagne.pk, stock_claimed__lte=F("stock_reserved") - item.qty)
                .update(stock_claimed=F("stock_claimed") + item.qty))
        if not pris:
            raise FlashEpuise(f"Le stock de la vente flash « {campagne.title} » est épuisé.")
        ReservationFlash.objects.create(campaign=campagne, order=order, order_item=item, qty=item.qty)
        n += 1
    return n


def rendre(order) -> int:
    from apps.catalog.models import PromotionCampaign

    n = 0
    for r in ReservationFlash.objects.filter(order=order, rendue_le__isnull=True):
        PromotionCampaign.objects.filter(pk=r.campaign_id).update(
            stock_claimed=Greatest(F("stock_claimed") - r.qty, 0))
        ReservationFlash.objects.filter(pk=r.pk).update(rendue_le=timezone.now())
        n += 1
    return n


def rendre_les_impayees(maintenant=None) -> int:
    """Commandes encore impayées après le délai de paiement : le stock flash revient à la vente."""
    from apps.payments.application.collect import DEFAULT_EXPIRY_MINUTES

    limite = (maintenant or timezone.now()) - timedelta(minutes=DEFAULT_EXPIRY_MINUTES)
    impayees = Order.objects.filter(reservations_flash__rendue_le__isnull=True,
                                    payment_status__in=[Order.PaymentStatus.PENDING, Order.PaymentStatus.FAILED],
                                    created_at__lt=limite).distinct()
    return sum(rendre(o) for o in impayees)


@receiver(post_save, sender=Order, dispatch_uid="orders_flash_rendre_si_annulee")
def _annulee(sender, instance, **kwargs):
    if instance.fulfillment_status == Order.FulfillmentStatus.CANCELLED:
        rendre(instance)
