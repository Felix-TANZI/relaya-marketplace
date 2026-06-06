# backend/apps/common/models.py
# Socle de données partagé BelivaY.
#   - TimeStampedModel : horodatage création/màj (base des futurs modèles)
#   - SoftDeleteModel  : suppression douce (deleted_at) + managers
#   - AuditLog         : journal d'audit immuable (OHADA)

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
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