import uuid
from django.db import models
from apps.orders.models import Order


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PaymentTransaction(TimeStampedModel):
    class Provider(models.TextChoices):
        MTN_MOMO = "MTN_MOMO", "MTN Mobile Money"
        ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"

    class Status(models.TextChoices):
        INITIATED = "INITIATED", "Initiated"
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=30, choices=Provider.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)

    amount_xaf = models.PositiveIntegerField()
    payer_phone = models.CharField(max_length=20)

    external_ref = models.CharField(max_length=100, blank=True, null=True)
    raw_payload = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"{self.provider} {self.status} ({self.amount_xaf} XAF)"
