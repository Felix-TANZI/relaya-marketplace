# backend/apps/orders/models.py
# Modèles pour la gestion des commandes et des articles de commande.

from django.db import models
from django.contrib.auth.models import User
from apps.catalog.models import Product


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Order(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "PENDING_PAYMENT", "Pending payment"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    # Lien vers l'utilisateur
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders", null=True, blank=True)    

    # Customer info (v1: guest-friendly)
    customer_email = models.EmailField(blank=True, null=True)
    customer_phone = models.CharField(max_length=20)

    # Delivery
    city = models.CharField(max_length=20)  # YAOUNDE / DOUALA
    address = models.CharField(max_length=255)
    note = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING_PAYMENT)

    subtotal_xaf = models.PositiveIntegerField(default=0)
    delivery_fee_xaf = models.PositiveIntegerField(default=0)
    total_xaf = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Order #{self.id} - {self.status}"


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")

    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    title_snapshot = models.CharField(max_length=200)
    price_xaf_snapshot = models.PositiveIntegerField()
    qty = models.PositiveIntegerField()

    line_total_xaf = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Order #{self.order_id} - {self.title_snapshot} x{self.qty}"
