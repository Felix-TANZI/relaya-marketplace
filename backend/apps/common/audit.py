# backend/apps/common/audit.py
# Journal d'audit OHADA via signals.
# Un modèle est audité APRÈS appel à register_audit(Model).
# Tant qu'aucun modèle n'est enregistré, les signals ne font rien (zéro impact).

from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import AuditLog

_AUDITED: set = set()


def register_audit(*models) -> None:
    """Active l'audit pour un ou plusieurs modèles."""
    for model in models:
        _AUDITED.add(model)


def unregister_audit(*models) -> None:
    """Désactive l'audit (utile notamment en tests)."""
    for model in models:
        _AUDITED.discard(model)


def _record(action, instance) -> None:
    AuditLog.objects.create(
        action=action,
        content_type=ContentType.objects.get_for_model(type(instance)),
        object_id=str(instance.pk),
        object_repr=str(instance)[:255],
    )


@receiver(post_save, dispatch_uid="common_audit_post_save")
def _audit_post_save(sender, instance, created, **kwargs):
    if sender not in _AUDITED:
        return
    if created:
        action = AuditLog.Action.CREATE
    elif getattr(instance, "deleted_at", None) is not None:
        action = AuditLog.Action.SOFT_DELETE
    else:
        action = AuditLog.Action.UPDATE
    _record(action, instance)


@receiver(post_delete, dispatch_uid="common_audit_post_delete")
def _audit_post_delete(sender, instance, **kwargs):
    if sender not in _AUDITED:
        return
    _record(AuditLog.Action.DELETE, instance)