# Revue du 29 octobre 2026 — B4 (décision du porteur) : pas de double validation pour les remboursements créés par le
# système. R68.1 (d'office r_inspection_h après la réception) et R35.4 (le jour même, sans remplaçant) partent seuls,
# toujours vers le moyen de paiement d'origine (R68.2) ; la finance et la direction en voient la liste quotidienne.

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.orders.bascule import RUPTURE, declencher
from apps.payments.settlements.models import Refund
from apps.payments.settlements.services import execute_approved_refunds
from tests.test_partie2_etape11 import _frais_momo, _payee, _referentiel, fiche, offre  # noqa: F401  (fixtures)
from apps.payments.tests.bridge.test_checkout import _mock, configuration, plan_comptable  # noqa: F401,E402

pytestmark = pytest.mark.django_db


def test_b4_sans_remplacant_le_remboursement_part_le_jour_meme_sans_approbation(fiche):
    seule = offre(fiche, "b4a", 12000)
    o = _payee(seule)
    declencher(o, seule.vendor, RUPTURE)                                               # aucune autre offre : R35.4
    r = Refund.objects.filter(detail__contains="R35.4").get()
    assert r.status == Refund.Status.APPROVED and r.approved_by_id is None             # personne n'a eu à approuver
    execute_approved_refunds()
    r.refresh_from_db()
    assert r.status == Refund.Status.PAID and r.created_at.date() == timezone.localdate()   # le jour même
    from apps.payments.settlements.services import remboursements_systeme_du_jour

    jour = remboursements_systeme_du_jour(timezone.localdate())
    assert jour["nombre"] == 1 and jour["detail"][0]["automatique"] is True


def test_b4_retour_non_inspecte_rembourse_d_office_apres_r_inspection_h(fiche, monkeypatch):
    from django.core.management import call_command

    from apps.orders.models import Return
    from apps.payments.bridge import events_in
    from apps.regles import services as regles

    seule = offre(fiche, "b4b", 12000)
    o = _payee(seule)
    events_in.dispute_opened(order_id=o.pk, reason="Retour", event_id=f"ret-b4-{o.pk}")   # séquestre gelé
    item = o.items.get()
    Return.objects.create(order=o, order_item=item, requested_by=o.user, vendor=item.product.vendor, reason="DAMAGED",
                          status=Return.Status.RECEIVED,
                          received_at=timezone.now() - timedelta(hours=regles.reglage("r_inspection_h") + 1))
    call_command("traiter_retours", stdout=open("/dev/null", "w"))
    r = Refund.objects.get(detail__contains="R68.1")
    assert r.status == Refund.Status.APPROVED and r.approved_by_id is None             # R68.1 : d'office
    execute_approved_refunds()
    r.refresh_from_db()
    assert r.status == Refund.Status.PAID                                              # vers le payeur d'origine (R68.2)


def test_b4_la_liste_quotidienne_est_reservee_a_la_finance_et_a_la_direction():
    from django.contrib.auth.models import Group, User
    from rest_framework.test import APIClient

    url = "/api/payments/v2/admin/payouts/remboursements-systeme/"
    for groupes, attendu in (((), 403), (("finance",), 200), (("direction",), 200)):
        u = User.objects.create_user(f"b4-{len(groupes)}-{'-'.join(groupes)}", password="p", is_staff=True)
        for g in groupes:
            u.groups.add(Group.objects.get_or_create(name=g)[0])
        c = APIClient()
        c.force_authenticate(u)
        assert c.get(url).status_code == attendu, groupes

