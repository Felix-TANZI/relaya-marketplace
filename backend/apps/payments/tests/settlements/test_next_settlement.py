# backend/apps/payments/tests/settlements/test_next_settlement.py
# Date du prochain reglement.
#
# ─────────────────────────────────────────────────────────────────────────────
# UNE CLE N'EST PAS UNE DATE
#
# `amount_due` retournait « cycle-weekly » — une reference technique qu'un
# partenaire ne peut pas lire. L'interface a besoin d'une DATE pour afficher
# « vendredi 15 août · dans 4 jours ».
#
# La difference n'est pas cosmetique : une date est une information, un
# compte a rebours est un engagement.
# ─────────────────────────────────────────────────────────────────────────────

from datetime import datetime, timezone as tz

import pytest

from apps.payments.config.models import SettlementCycle

pytestmark = pytest.mark.django_db


def cycle(frequence, jour, cle="c"):
    return SettlementCycle.objects.create(
        config_key=cle, name="Test", frequency=frequence,
        anchor_day=jour, cutoff_hours=24, minimum_amount_xaf=1000)


# Mardi 11 août 2026, 10 h.
MARDI = datetime(2026, 8, 11, 10, 0, tzinfo=tz.utc)


class TestHebdomadaire:

    def test_le_vendredi_suivant(self):
        """anchor_day=5 signifie vendredi."""
        prochain = cycle(SettlementCycle.Frequency.WEEKLY, 5).next_run_at(MARDI)
        assert prochain.isoweekday() == 5
        assert (prochain.date() - MARDI.date()).days == 3

    def test_le_lundi_suivant_depuis_un_mardi(self):
        """Le jour vise est deja passe cette semaine : on attend la suivante."""
        prochain = cycle(SettlementCycle.Frequency.WEEKLY, 1).next_run_at(MARDI)
        assert prochain.isoweekday() == 1
        assert (prochain.date() - MARDI.date()).days == 6

    def test_la_date_est_dans_le_futur(self):
        for jour in range(1, 8):
            prochain = cycle(
                SettlementCycle.Frequency.WEEKLY, jour, f"c{jour}",
            ).next_run_at(MARDI)
            assert prochain >= MARDI.replace(hour=0, minute=0, second=0,
                                             microsecond=0)


class TestMensuel:

    def test_le_jour_du_mois_a_venir(self):
        prochain = cycle(
            SettlementCycle.Frequency.MONTHLY, 25).next_run_at(MARDI)
        assert prochain.day == 25
        assert prochain.month == 8

    def test_bascule_au_mois_suivant(self):
        """Le jour est passe : on vise le mois d'apres."""
        prochain = cycle(
            SettlementCycle.Frequency.MONTHLY, 5).next_run_at(MARDI)
        assert prochain.day == 5
        assert prochain.month == 9

    def test_le_31_est_ramene_au_28(self):
        """
        Tous les mois n'ont pas 31 jours. Ramener a 28 evite une date
        invalide en fevrier — mieux vaut regler plus tot que jamais.
        """
        prochain = cycle(
            SettlementCycle.Frequency.MONTHLY, 31).next_run_at(MARDI)
        assert prochain.day == 28


class TestAuSeuil:

    def test_aucune_date_annoncee(self):
        """
        Un cycle au seuil ne depend pas du calendrier mais du montant
        accumule. Annoncer une date qui ne tiendrait pas serait pire que ne
        rien annoncer.
        """
        assert cycle(
            SettlementCycle.Frequency.ON_THRESHOLD, 5).next_run_at(MARDI) is None


class TestIntegrationAmountDue:

    def test_amount_due_expose_la_date(self):
        from apps.payments.ledger import chart_of_accounts as coa
        from apps.payments.ledger.models import LedgerAccount
        from apps.payments.payees.models import MomoOperator, PayeeType
        from apps.payments.payees.services import create_payee
        from apps.payments.settlements.services import amount_due

        for entree in coa.CHART:
            LedgerAccount.objects.get_or_create(
                code=entree["code"], defaults=entree)

        SettlementCycle.objects.create(
            config_key="cycle-vendor", name="Hebdo vendeurs",
            frequency=SettlementCycle.Frequency.WEEKLY, anchor_day=5,
            cutoff_hours=24, minimum_amount_xaf=1000,
            default_payee_type="VENDOR")

        compte = create_payee(
            payee_type=PayeeType.VENDOR, display_label="Boutique",
            momo_operator=MomoOperator.MTN, momo_number="237677123456")

        vue = amount_due(compte)
        assert "next_settlement_at" in vue
        assert vue["next_settlement_at"] is not None
        assert vue["next_settlement_at"].isoweekday() == 5

    def test_sans_cycle_configure_la_date_est_nulle(self):
        """
        L'absence de cycle ne doit pas faire echouer l'ecran : le partenaire
        voit son montant, sans date.
        """
        from apps.payments.ledger import chart_of_accounts as coa
        from apps.payments.ledger.models import LedgerAccount
        from apps.payments.payees.models import MomoOperator, PayeeType
        from apps.payments.payees.services import create_payee
        from apps.payments.settlements.services import amount_due

        for entree in coa.CHART:
            LedgerAccount.objects.get_or_create(
                code=entree["code"], defaults=entree)

        compte = create_payee(
            payee_type=PayeeType.RELAY_POINT, display_label="Relais",
            momo_operator=MomoOperator.MTN, momo_number="237699000111")

        assert amount_due(compte)["next_settlement_at"] is None