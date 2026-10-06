# Bouchon de relaya-marketplace (apps/orders/models.py, commit 9546ffe) : champs lus par le kit seulement.
from django.contrib.auth.models import User
from django.db import models


class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders", null=True, blank=True)
    customer_phone = models.CharField(max_length=20, default="")
    delivery_method = models.CharField(max_length=20, default="PICKUP")
    city = models.CharField(max_length=50, default="Yaoundé")
    district = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=255, blank=True)
    relay_point = models.ForeignKey("accounts.RelayPointProfile", on_delete=models.SET_NULL, null=True, blank=True)
    authorized_pickup_name = models.CharField(max_length=120, blank=True, default="")
    authorized_pickup_phone = models.CharField(max_length=20, blank=True, default="")
    payment_status = models.CharField(max_length=20, default="PENDING")
    fulfillment_status = models.CharField(max_length=30, default="CREATED")
    subtotal_xaf = models.PositiveIntegerField(default=0)
    delivery_fee_xaf = models.PositiveIntegerField(default=0)
    total_xaf = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT)
    title_snapshot = models.CharField(max_length=200)
    price_xaf_snapshot = models.PositiveIntegerField()
    qty = models.PositiveIntegerField()
    line_total_xaf = models.PositiveIntegerField(default=0)
