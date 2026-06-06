# backend/tests/test_common_spine.py
import pytest
from django.contrib.auth.models import User

from apps.common.models import AuditLog, AuditLogImmutableError
from apps.common.audit import register_audit, unregister_audit

pytestmark = pytest.mark.django_db


def test_auditlog_est_immuable():
    entry = AuditLog.objects.create(
        action=AuditLog.Action.CREATE,
        object_id="1",
        object_repr="exemple",
    )
    with pytest.raises(AuditLogImmutableError):
        entry.object_repr = "modifie"
        entry.save()
    with pytest.raises(AuditLogImmutableError):
        entry.delete()


def test_audit_signal_cree_une_entree_pour_un_modele_enregistre():
    register_audit(User)
    try:
        before = AuditLog.objects.count()
        user = User.objects.create_user(username="audit-demo", password="Passw0rd!123")
        after = AuditLog.objects.count()
        assert after == before + 1
        last = AuditLog.objects.order_by("-id").first()
        assert last.action == AuditLog.Action.CREATE
        assert last.object_id == str(user.pk)
    finally:
        unregister_audit(User)