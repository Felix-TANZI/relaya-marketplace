import uuid
from django.db import models
from apps.orders.models import Order

# ── Lot 2 : découverte des modèles de configuration financière ───────────────
from apps.payments.config import models as _config_models  # noqa: F401,E402

# ── Lot 3 : découverte des modèles du registre comptable ─────────────────────
from apps.payments.ledger import models as _ledger_models  # noqa: F401,E402

# ── Lot 4 : identité financière et pont métier ───────────────────────────────
from apps.payments.payees import models as _payees_models  # noqa: F401,E402
from apps.payments.bridge import models as _bridge_models  # noqa: F401,E402

# ── Lot 5 : intentions de paiement ───────────────────────────────────────────
from apps.payments.intents import models as _intents_models  # noqa: F401,E402

# ── Lot 6 : journal des webhooks ─────────────────────────────────────────────
from apps.payments.webhooks import models as _webhooks_models  # noqa: F401,E402

# ── Lot 7 : séquestres multi-acteurs ─────────────────────────────────────────
from apps.payments.escrow import models as _escrow_models  # noqa: F401,E402

# ── Lot 8 : règlements par cycle contractuel ─────────────────────────────────
from apps.payments.settlements import models as _settlements_models  # noqa: F401,E402

# ── Lot 9 : journal des exécutions de tâches ─────────────────────────────────
from apps.payments.tasks import models as _tasks_models  # noqa: F401,E402

# ── Lot 10 : réconciliation ──────────────────────────────────────────────────
from apps.payments.reconciliation import models as _rec_models  # noqa: F401,E402

# ── Lot 11 : risque et Trust Score ───────────────────────────────────────────
from apps.payments.risk import models as _risk_models  # noqa: F401,E402


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
