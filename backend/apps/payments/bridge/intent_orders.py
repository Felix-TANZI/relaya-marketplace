# backend/apps/payments/bridge/intent_orders.py
# Lien entre une intention de paiement et les commandes qu'elle couvre.
#
# Ce fichier vit dans bridge/ parce qu'il touche apps.orders. Le modele
# PaymentIntent lui-meme n'a AUCUNE reference vers les commandes : la
# dependance va du metier vers le financier, jamais l'inverse.

from django.core.exceptions import ValidationError
from django.db import models

from apps.payments.intents.models import PaymentIntent


class PaymentIntentOrder(models.Model):
    """Une intention couvre N commandes issues d'un meme panier."""

    intent = models.ForeignKey(
        PaymentIntent, on_delete=models.PROTECT, related_name="order_links",
    )
    order = models.ForeignKey(
        "orders.Order", on_delete=models.PROTECT, related_name="payment_intent_links",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        verbose_name = "Commande couverte par une intention"
        verbose_name_plural = "Commandes couvertes par une intention"
        constraints = [
            models.UniqueConstraint(
                fields=["intent", "order"], name="unique_intent_order",
            ),
        ]

    def __str__(self):
        return f"{self.intent.reference} -> commande #{self.order_id}"

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Le lien entre une intention et une commande ne se supprime pas."
        )


def link_orders(intent: PaymentIntent, orders) -> int:
    """Rattache des commandes a une intention. Idempotent."""
    cree = 0
    for order in orders:
        _, nouveau = PaymentIntentOrder.objects.get_or_create(
            intent=intent, order=order,
        )
        cree += int(nouveau)
    return cree


def orders_for_intent(intent: PaymentIntent):
    from apps.orders.models import Order
    return Order.objects.filter(payment_intent_links__intent=intent)


def intent_for_order(order) -> PaymentIntent | None:
    lien = PaymentIntentOrder.objects.filter(order=order).select_related("intent").first()
    return lien.intent if lien else None