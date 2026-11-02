# Revue du 29 octobre 2026 — groupe B (argent, P0/P1). Chaque test échoue avant sa correction et passe après.

import pytest
from django.contrib.auth.models import Group, User

from apps.accounts.models import UserNotification
from apps.payments.settlements import dp42
from apps.payments.settlements.models import PayoutRequest
from apps.payments.settlements.services import build_batch, confirm_batch, request_payout
from apps.payments.tests.settlements.test_settlements import (  # noqa: F401  (fixtures)
    _mock, acheteur, configuration, liberer, operateur, plan_comptable, vendeur,
)

pytestmark = pytest.mark.django_db


def _membre(nom, *groupes):
    u = User.objects.create_user(nom, f"{nom}@belivay.cm", "x")
    for g in groupes:
        u.groups.add(Group.objects.get_or_create(name=g)[0])
    return u


# ── B1 · R22.2, R43.1 : le lot du vendredi n'est jamais refusé ────────────────────────────────────────────

def test_b1_un_lot_du_vendredi_au_dela_du_maximum_est_cree_signale_et_attend_ses_validations(
        acheteur, vendeur, operateur):
    finance = _membre("fin_b1", "finance")
    liberer(acheteur, vendeur, montant=7_000_000, cle="gros-b1")
    demande = request_payout(confirm_batch(build_batch(vendeur)), requested_by=operateur, liste="vendredi-b1")
    assert demande.amount_xaf > 5_000_000                                          # au-delà du maximum de la politique
    assert demande.status == PayoutRequest.Status.PENDING_APPROVAL and demande.montant_eleve is True
    assert demande.required_approvals == 2                                         # DP-42 comme tout lot
    assert UserNotification.objects.filter(user=finance, title__startswith="Versement d'un montant eleve").exists()
    assert dp42.liste_du_vendredi("vendredi-b1")["detail"][0]["montant_eleve"] is True


# ── B2 · DP-42 : la validation groupée contrôle le détail, pas seulement le total ─────────────────────────

def _second_vendeur():
    from datetime import timedelta

    from django.utils import timezone

    from apps.payments.payees.models import MomoOperator, PayeeType
    from apps.payments.payees.services import create_payee
    from apps.payments.tests.settlements.test_settlements import NUMERO

    compte = create_payee(payee_type=PayeeType.VENDOR, display_label="Boutique B", momo_operator=MomoOperator.MTN,
                          momo_number=NUMERO[:-1] + "1", settlement_cycle_key="cycle-weekly-friday")
    compte.kyc_status, compte.kyc_verified_at = "VERIFIED", timezone.now()
    compte.momo_changed_at = timezone.now() - timedelta(days=30)
    compte.save()
    return compte


def test_b2_echanger_deux_montants_a_total_egal_fait_refuser_la_validation(acheteur, vendeur, operateur):
    autre = _second_vendeur()
    liberer(acheteur, vendeur, montant=40_000, cle="b2-a", order_id=1)
    liberer(acheteur, autre, montant=60_000, cle="b2-b", order_id=2)
    a = request_payout(confirm_batch(build_batch(vendeur)), requested_by=operateur, liste="vendredi-b2")
    b = request_payout(confirm_batch(build_batch(autre)), requested_by=operateur, liste="vendredi-b2")
    vue = dp42.liste_du_vendredi("vendredi-b2")                                   # ce que voit le comptable
    total = vue["total_en_attente_xaf"]
    PayoutRequest.objects.filter(pk=a.pk).update(amount_xaf=b.amount_xaf)       # échange à total égal
    PayoutRequest.objects.filter(pk=b.pk).update(amount_xaf=a.amount_xaf)
    assert dp42.liste_du_vendredi("vendredi-b2")["total_en_attente_xaf"] == total
    comptable = _membre("compta_b2", "finance", "finance-comptable")
    with pytest.raises(dp42.Dp42Error, match="a changé"):
        dp42.valider_liste("vendredi-b2", par=comptable, empreinte=vue["empreinte"])
    with pytest.raises(dp42.Dp42Error, match="a changé"):
        dp42.valider_liste("vendredi-b2", par=comptable, empreinte="")           # empreinte absente : refus
    assert not a.approvals.exists() and not b.approvals.exists()


# ── B3 · DP-42 : le valideur de secours est accordé et retiré par la Direction seulement ──────────────────

def test_b3_un_superutilisateur_hors_direction_n_accorde_ni_ne_retire_un_secours():
    from datetime import timedelta

    from django.utils import timezone

    chef = User.objects.create_superuser("chef_b3", "c@b.cm", "x")
    remplacant = _membre("rempl_b3", "finance")
    fin = timezone.now() + timedelta(days=1)
    with pytest.raises(dp42.Dp42Error, match="porteur"):
        dp42.accorder_secours(user=remplacant, role="direction", fin=fin, motif="Congés", par=chef)
    porteur = _membre("porteur_b3", "finance", "direction")
    s = dp42.accorder_secours(user=remplacant, role="direction", fin=fin, motif="Congés", par=porteur)
    with pytest.raises(dp42.Dp42Error, match="porteur"):
        dp42.revoquer_secours(s, par=chef)
    with pytest.raises(dp42.Dp42Error, match="porteur"):
        dp42.revoquer_secours(s, par=remplacant)                                   # ni la personne elle-même
    dp42.revoquer_secours(s, par=porteur)


def test_b3_la_direction_ne_s_accorde_pas_le_secours_a_elle_meme():
    from datetime import timedelta

    from django.utils import timezone

    porteur = _membre("porteur_b3b", "finance", "direction")
    with pytest.raises(dp42.Dp42Error, match="soi-même"):
        dp42.accorder_secours(user=porteur, role="comptable", fin=timezone.now() + timedelta(days=1), motif="x",
                              par=porteur)
