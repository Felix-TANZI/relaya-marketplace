# backend/apps/common/models.py
# Socle de données partagé BelivaY.
#   - TimeStampedModel : horodatage création/màj (base des futurs modèles)
#   - SoftDeleteModel  : suppression douce (deleted_at) + managers
#   - AuditLog         : journal d'audit immuable (OHADA)

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.db.models import Sum
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Horodatage automatique. À utiliser comme base des nouveaux modèles."""
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ─── Suppression douce ──────────────────────────────────────────────────────────

class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)

    def delete(self):
        """Suppression douce en masse."""
        return self.update(deleted_at=timezone.now())

    def hard_delete(self):
        """Suppression réelle en masse (à utiliser en connaissance de cause)."""
        return super().delete()


class SoftDeleteManager(models.Manager):
    """Manager par défaut : ne renvoie que les lignes vivantes."""
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager):
    """Manager d'échappement : renvoie TOUT (vivants + supprimés)."""
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(TimeStampedModel):
    """
    Suppression douce : delete() marque deleted_at au lieu d'effacer.
      - objects      → lignes vivantes uniquement
      - all_objects  → tout (admin, audit, restauration)
    Ajout 100 % additif : deleted_at / deleted_by sont nullable.
    """
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def delete(self, using=None, keep_parents=False, hard=False, deleted_by=None):
        if hard:
            return super().delete(using=using, keep_parents=keep_parents)
        self.deleted_at = timezone.now()
        if deleted_by is not None:
            self.deleted_by = deleted_by
        self.save(update_fields=["deleted_at", "deleted_by", "updated_at"])
        return (1, {self._meta.label: 1})

    def hard_delete(self, using=None, keep_parents=False):
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=["deleted_at", "deleted_by", "updated_at"])


# ─── Audit immuable (OHADA) ─────────────────────────────────────────────────────

class AuditLogImmutableError(Exception):
    """Levée si on tente de modifier ou supprimer une entrée d'audit."""


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE      = "CREATE",      "Création"
        UPDATE      = "UPDATE",      "Modification"
        DELETE      = "DELETE",      "Suppression"
        SOFT_DELETE = "SOFT_DELETE", "Suppression douce"
        RESTORE     = "RESTORE",     "Restauration"

    action       = models.CharField(max_length=20, choices=Action.choices)
    content_type = models.ForeignKey(
        "contenttypes.ContentType",
        null=True, blank=True,
        on_delete=models.SET_NULL,
    )
    object_id    = models.CharField(max_length=64, db_index=True)  # supporte int ET UUID
    object_repr  = models.CharField(max_length=255, blank=True)
    actor        = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
    )
    changes      = models.JSONField(null=True, blank=True)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True, db_index=True)

    content_object = GenericForeignKey("content_type", "object_id")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Journal d'audit"
        verbose_name_plural = "Journaux d'audit"
        indexes = [models.Index(fields=["content_type", "object_id"])]

    def __str__(self):
        return f"{self.action} · {self.object_repr or self.object_id}"

    def save(self, *args, **kwargs):
        # Immuabilité : on autorise l'insertion, jamais la modification
        if self.pk is not None:
            raise AuditLogImmutableError("Une entrée d'audit ne peut pas être modifiée.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise AuditLogImmutableError("Une entrée d'audit ne peut pas être supprimée.")


class ExternalService(TimeStampedModel):
    """
    Service externe facture ou critique.

    L'admin peut couper un service, fixer un coût unitaire estimatif et suivre
    les volumes consommés sans attendre la facture fournisseur.
    """

    class ServiceType(models.TextChoices):
        MAPS = "MAPS", "Carte"
        ROUTING = "ROUTING", "Itineraire"
        LOCATION = "LOCATION", "Localisation"
        SMS = "SMS", "SMS"
        EMAIL = "EMAIL", "Email"
        PAYMENT = "PAYMENT", "Paiement"
        STORAGE = "STORAGE", "Stockage"
        AI = "AI", "IA"
        OTHER = "OTHER", "Autre"

    key = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=120)
    provider = models.CharField(max_length=120, blank=True, default="")
    service_type = models.CharField(max_length=20, choices=ServiceType.choices, default=ServiceType.OTHER)
    is_enabled = models.BooleanField(default=True)
    unit_cost_xaf = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    monthly_budget_xaf = models.PositiveIntegerField(default=0)
    hard_disable_on_budget = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default="")
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        ordering = ["service_type", "name"]
        verbose_name = "Service externe"
        verbose_name_plural = "Services externes"

    def __str__(self):
        return f"{self.name} ({self.provider or self.key})"

    def current_month_usage(self):
        start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return self.usage_events.filter(created_at__gte=start).aggregate(
            units=Sum("units"),
            cost=Sum("estimated_cost_xaf"),
        )

    def is_budget_exceeded(self) -> bool:
        if not self.monthly_budget_xaf:
            return False
        cost = self.current_month_usage().get("cost") or 0
        return cost >= self.monthly_budget_xaf

    def can_call(self) -> bool:
        if not self.is_enabled:
            return False
        return not (self.hard_disable_on_budget and self.is_budget_exceeded())


class ApiUsageEvent(TimeStampedModel):
    """Journal de consommation des API externes."""

    service = models.ForeignKey(ExternalService, on_delete=models.CASCADE, related_name="usage_events")
    endpoint = models.CharField(max_length=255, blank=True, default="")
    method = models.CharField(max_length=12, blank=True, default="")
    units = models.PositiveIntegerField(default=1)
    estimated_cost_xaf = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    status_code = models.PositiveIntegerField(null=True, blank=True)
    success = models.BooleanField(default=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["service", "-created_at"],
                name="common_apiu_service_d4f6d5_idx",
            ),
            models.Index(
                fields=["success", "-created_at"],
                name="common_apiu_success_461a17_idx",
            ),
        ]
        verbose_name = "Consommation API"
        verbose_name_plural = "Consommations API"

    def __str__(self):
        return f"{self.service.key} · {self.units} unite(s)"


def record_api_usage(service_key, *, endpoint="", method="", units=1, status_code=None, success=True, actor=None, meta=None):
    service, _ = ExternalService.objects.get_or_create(
        key=service_key,
        defaults={
            "name": service_key.replace("-", " ").title(),
            "service_type": ExternalService.ServiceType.OTHER,
        },
    )
    estimated_cost = service.unit_cost_xaf * units
    return ApiUsageEvent.objects.create(
        service=service,
        endpoint=endpoint,
        method=method,
        units=units,
        estimated_cost_xaf=estimated_cost,
        status_code=status_code,
        success=success,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        meta=meta or {},
    )
