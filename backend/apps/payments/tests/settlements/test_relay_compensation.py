# backend/apps/payments/tests/settlements/test_relay_compensation.py
# Remuneration contractuelle des points relais.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/settlements/ -q
#
# ─────────────────────────────────────────────────────────────────────────────
# LE MODELE ECONOMIQUE, TEL QUE TU L'AS DEFINI
#
#   « Le point relais est paye convenablement a son contrat qu'il signera
#     avec l'administration BelivaY, et ca n'entre pas dans les frais de
#     livraison. »
#
# Consequence : ce n'est PAS une part du paiement de l'acheteur, donc pas un
# sequestre. C'est une CHARGE de la plateforme, qui rejoint le cycle de
# reglement par un ajustement.
#
# Cette distinction n'est pas cosmetique : un montant preleve sur le
# paiement de l'acheteur devrait lui etre expose, une charge de la
# plateforme ne le concerne pas.
# ─────────────────────────────────────────────────────────────────────────────

from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from apps.payments.config.models import RelayCompensationRule
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, trial_balance_total
from apps.payments.ledger.invariants import run_all
from apps.payments.ledger.models import LedgerAccount
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee
from apps.payments.settlements.models import Adjustment
from apps.payments.settlements.services import (
    compensate_relay_parcel, relay_accepts_size, relay_compensation_rule,
)

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def plan_comptable():
    for entree in coa.CHART:
        LedgerAccount.objects.get_or_create(code=entree["code"], defaults=entree)


@pytest.fixture
def relais():
    return create_payee(
        payee_type=PayeeType.RELAY_POINT, display_label="Relais Mokolo",
        momo_operator=MomoOperator.MTN, momo_number="237677123456")


@pytest.fixture
def autre_relais():
    return create_payee(
        payee_type=PayeeType.RELAY_POINT, display_label="Relais Bonaberi",
        momo_operator=MomoOperator.ORANGE, momo_number="237699000111")


@pytest.fixture
def tarif_par_defaut():
    return RelayCompensationRule.objects.create(
        config_key="relay-default", name="Tarif par defaut",
        payee_code="", basis="PER_PARCEL", amount_xaf=500, priority=0)


# ═══════════════════════════════════════════════════════════════════════════
# LA REGLE APPLICABLE
# ═══════════════════════════════════════════════════════════════════════════

class TestRegleApplicable:

    def test_le_tarif_par_defaut_s_applique(self, relais, tarif_par_defaut):
        regle = relay_compensation_rule(relais)
        assert regle.config_key == "relay-default"
        assert regle.amount_xaf == 500

    def test_un_contrat_nominatif_prime(self, relais, tarif_par_defaut):
        """
        C'est tout l'objet d'un contrat negocie : il prime sur le tarif
        general.
        """
        RelayCompensationRule.objects.create(
            config_key="relay-mokolo", name="Contrat Mokolo",
            payee_code=relais.payee_code, basis="PER_PARCEL",
            amount_xaf=750, contract_reference="CTR-2026-014", priority=10)

        regle = relay_compensation_rule(relais)
        assert regle.amount_xaf == 750
        assert regle.contract_reference == "CTR-2026-014"

    def test_le_contrat_d_un_autre_ne_s_applique_pas(
        self, relais, autre_relais, tarif_par_defaut,
    ):
        RelayCompensationRule.objects.create(
            config_key="relay-mokolo", name="Contrat Mokolo",
            payee_code=relais.payee_code, basis="PER_PARCEL",
            amount_xaf=750, priority=10)

        assert relay_compensation_rule(autre_relais).amount_xaf == 500

    def test_sans_aucune_regle_rien_n_est_du(self, relais):
        assert relay_compensation_rule(relais) is None
        assert compensate_relay_parcel(
            relais, order_id=1, parcel_reference="P-1") is None


# ═══════════════════════════════════════════════════════════════════════════
# LA REMUNERATION
# ═══════════════════════════════════════════════════════════════════════════

class TestRemuneration:

    def test_un_colis_remis_genere_un_ajustement(self, relais, tarif_par_defaut):
        ajustement = compensate_relay_parcel(
            relais, order_id=42, parcel_reference="RELAY-PARCEL-7")

        assert ajustement is not None
        assert ajustement.amount_xaf == 500
        assert ajustement.direction == Adjustment.Direction.DEBIT
        assert ajustement.status == Adjustment.Status.APPROVED

    def test_aucun_approbateur_humain(self, relais, tarif_par_defaut):
        """
        LE choix de conception a justifier.

        La decision a ete prise a la SIGNATURE DU CONTRAT, pas colis par
        colis. Exiger une approbation par remise rendrait le dispositif
        inutilisable et pousserait a approuver en masse sans lire — ce qui
        est pire qu'une approbation absente.

        La piste d'audit remonte au CONTRAT, pas a une personne.
        """
        ajustement = compensate_relay_parcel(
            relais, order_id=42, parcel_reference="RELAY-PARCEL-8")

        assert ajustement.approved_by is None
        assert ajustement.source_contract.startswith("relay-default#v")
        assert "Regle relay-default" in ajustement.reason

    def test_le_motif_est_explicite(self, relais):
        """Une somme sans explication est contractuellement indefendable."""
        RelayCompensationRule.objects.create(
            config_key="relay-mokolo", name="Contrat Mokolo",
            payee_code=relais.payee_code, basis="PER_PARCEL",
            amount_xaf=750, contract_reference="CTR-2026-014", priority=10)

        ajustement = compensate_relay_parcel(
            relais, order_id=42, parcel_reference="RELAY-PARCEL-9")
        assert "CTR-2026-014" in ajustement.reason
        assert "RELAY-PARCEL-9" in ajustement.reason

    def test_remuneration_idempotente(self, relais, tarif_par_defaut):
        """Un colis deja remunere ne l'est pas deux fois."""
        premier = compensate_relay_parcel(
            relais, order_id=42, parcel_reference="RELAY-PARCEL-10")
        second = compensate_relay_parcel(
            relais, order_id=42, parcel_reference="RELAY-PARCEL-10")

        assert second.pk == premier.pk
        assert Adjustment.objects.filter(payee=relais).count() == 1

    def test_c_est_une_charge_pas_un_sequestre(self, relais, tarif_par_defaut):
        """
        LE test qui verifie le modele economique.

        Le point relais n'etant PAS paye par l'acheteur, aucun sequestre
        n'est cree : c'est une charge de la plateforme.
        """
        from apps.payments.escrow.models import EscrowHold

        compensate_relay_parcel(
            relais, order_id=42, parcel_reference="RELAY-PARCEL-11")

        assert not EscrowHold.objects.filter(payee=relais).exists()
        assert balance(coa.ESCROW_LIABILITY) == 0
        assert balance(coa.PAYABLE_ADJUSTMENT,
                       payee_code=relais.payee_code) == 500
        assert balance(coa.EXPENSE_WRITEOFF) == 500

    def test_la_comptabilite_reste_equilibree(self, relais, tarif_par_defaut):
        """
        I4 (solvabilite) est exclu, et il a RAISON de se declencher : ce
        test cree une dette de 1 500 XAF sans qu'aucun encaissement n'ait
        alimente la tresorerie.

        En production, les commissions couvrent ces charges. Ici, le systeme
        est vide — signaler l'insolvabilite est le comportement correct, il
        n'est simplement pas le sujet de ce test.
        """
        for numero in range(3):
            compensate_relay_parcel(
                relais, order_id=numero, parcel_reference=f"RELAY-P-{numero}")

        assert trial_balance_total() == 0

        rapport = run_all()
        hors_solvabilite = [v for v in rapport["violations"] if v.code != "I4"]
        assert not hors_solvabilite, [
            (v.code, v.detail) for v in hors_solvabilite
        ]

    def test_l_insolvabilite_est_correctement_signalee(
        self, relais, tarif_par_defaut,
    ):
        """
        Le corollaire : creer une charge sans tresorerie DOIT alerter.

        C'est exactement ce que le tableau de bord remonterait en
        production si les commissions ne couvraient plus les charges.
        """
        compensate_relay_parcel(
            relais, order_id=1, parcel_reference="RELAY-INSOLV")

        rapport = run_all()
        codes = [v.code for v in rapport["violations"]]
        assert "I4" in codes
        assert rapport["must_freeze_payouts"] is True


# ═══════════════════════════════════════════════════════════════════════════
# LE CYCLE DE REGLEMENT
# ═══════════════════════════════════════════════════════════════════════════

class TestCycleDeReglement:

    def test_la_remuneration_rejoint_le_lot(self, relais, tarif_par_defaut):
        """
        L'ajustement rejoint le cycle comme n'importe quelle somme due :
        aucun mecanisme special n'est necessaire.
        """
        from apps.payments.settlements.services import build_batch

        for numero in range(4):
            compensate_relay_parcel(
                relais, order_id=numero, parcel_reference=f"RELAY-B-{numero}")

        lot = build_batch(relais)
        # Aucun sequestre libere : il n'y a rien a agreger cote escrow.
        assert lot is None

        du = Adjustment.objects.filter(
            payee=relais, direction=Adjustment.Direction.DEBIT,
            status=Adjustment.Status.APPROVED,
        ).count()
        assert du == 4

    def test_le_montant_du_est_visible(self, relais, tarif_par_defaut):
        from apps.payments.settlements.services import amount_due

        for numero in range(3):
            compensate_relay_parcel(
                relais, order_id=numero, parcel_reference=f"RELAY-D-{numero}")

        vue = amount_due(relais)
        assert vue["pending_bonus_xaf"] == 1500
        assert vue["due_xaf"] == 1500


# ═══════════════════════════════════════════════════════════════════════════
# GOUVERNANCE
# ═══════════════════════════════════════════════════════════════════════════

class TestGouvernance:

    def test_la_regle_est_un_modele_gouverne(self):
        """
        Un tarif contractuel se modifie par demande de changement approuvee,
        jamais par edition directe.
        """
        from apps.payments.config.change_control import TARGET_MODELS
        assert "RelayCompensationRule" in TARGET_MODELS

    def test_le_montant_fige_survit_a_un_changement_de_tarif(
        self, relais, tarif_par_defaut,
    ):
        """
        Renegocier le contrat ne doit pas changer ce qui est du sur des
        colis deja remis.
        """
        ajustement = compensate_relay_parcel(
            relais, order_id=1, parcel_reference="RELAY-G-1")
        assert ajustement.amount_xaf == 500

        RelayCompensationRule.objects.filter(
            config_key="relay-default").update(is_active=False)
        RelayCompensationRule.objects.create(
            config_key="relay-default", version=2, name="Nouveau tarif",
            payee_code="", basis="PER_PARCEL", amount_xaf=900, priority=0)

        ajustement.refresh_from_db()
        assert ajustement.amount_xaf == 500

        suivant = compensate_relay_parcel(
            relais, order_id=2, parcel_reference="RELAY-G-2")
        assert suivant.amount_xaf == 900


# ═══════════════════════════════════════════════════════════════════════════
# CATEGORIES DE COLIS
# ═══════════════════════════════════════════════════════════════════════════

class TestCategoriesDeColis:
    """
    Un encombrant n'occupe pas la meme place qu'un petit colis. Les
    contrats le refletent, et la grille doit pouvoir varier PAR RELAIS.
    """

    @pytest.fixture
    def grille_generale(self):
        for taille, montant in (("SMALL", 300), ("STANDARD", 500),
                                ("LARGE", 800), ("BULKY", 1500)):
            RelayCompensationRule.objects.create(
                config_key=f"relay-{taille.lower()}",
                name=f"Tarif general {taille}", payee_code="",
                parcel_size=taille, basis="PER_PARCEL",
                amount_xaf=montant, priority=0)

    def test_chaque_categorie_a_son_tarif(self, relais, grille_generale):
        attendus = {"SMALL": 300, "STANDARD": 500, "LARGE": 800, "BULKY": 1500}
        for taille, montant in attendus.items():
            assert relay_compensation_rule(relais, taille).amount_xaf == montant

    def test_un_contrat_nominatif_prime_sur_la_grille(
        self, relais, grille_generale,
    ):
        """
        Un relais qui a negocie l'encombrant garde le tarif general pour
        ses colis standard : la regle la plus PRECISE gagne, pas la plus
        recente.
        """
        RelayCompensationRule.objects.create(
            config_key="relay-mokolo-bulky", name="Mokolo encombrant",
            payee_code=relais.payee_code, parcel_size="BULKY",
            basis="PER_PARCEL", amount_xaf=2500,
            contract_reference="CTR-2026-014", priority=10)

        assert relay_compensation_rule(relais, "BULKY").amount_xaf == 2500
        assert relay_compensation_rule(relais, "STANDARD").amount_xaf == 500

    def test_un_tarif_unique_couvre_toutes_les_categories(self, relais):
        """
        Un relais peut avoir un contrat simple, sans grille : sa regle
        « toutes tailles » couvre tout.
        """
        RelayCompensationRule.objects.create(
            config_key="relay-simple", name="Contrat simple",
            payee_code=relais.payee_code, parcel_size="",
            basis="PER_PARCEL", amount_xaf=600, priority=10)

        for taille in ("SMALL", "STANDARD", "LARGE", "BULKY"):
            assert relay_compensation_rule(relais, taille).amount_xaf == 600

    def test_une_taille_inconnue_tombe_sur_le_filet(self, relais):
        """
        `Shipment.parcel_size` est un champ LIBRE : une valeur imprevue ne
        doit pas faire perdre sa remuneration au relais.
        """
        RelayCompensationRule.objects.create(
            config_key="relay-default", name="Filet", payee_code="",
            parcel_size="", basis="PER_PARCEL", amount_xaf=500, priority=0)

        assert relay_compensation_rule(relais, "PALETTE").amount_xaf == 500
        assert relay_compensation_rule(relais, "").amount_xaf == 500

    def test_la_remuneration_suit_la_categorie(self, relais, grille_generale):
        petit = compensate_relay_parcel(
            relais, order_id=1, parcel_reference="P-SMALL",
            parcel_size="SMALL")
        encombrant = compensate_relay_parcel(
            relais, order_id=2, parcel_reference="P-BULKY",
            parcel_size="BULKY")

        assert petit.amount_xaf == 300
        assert encombrant.amount_xaf == 1500
        assert "BULKY" in encombrant.reason


# ═══════════════════════════════════════════════════════════════════════════
# REFUS D'UNE CATEGORIE
# ═══════════════════════════════════════════════════════════════════════════

class TestRefusDeCategorie:
    """Un local exigu ne prend pas d'encombrant."""

    @pytest.fixture
    def refuse_encombrant(self, relais):
        RelayCompensationRule.objects.create(
            config_key="relay-default", name="Filet", payee_code="",
            parcel_size="", basis="PER_PARCEL", amount_xaf=500, priority=0)
        RelayCompensationRule.objects.create(
            config_key="relay-mokolo-nobulky", name="Mokolo sans encombrant",
            payee_code=relais.payee_code, parcel_size="BULKY",
            basis="PER_PARCEL", amount_xaf=0, is_accepted=False, priority=10)

    def test_la_grille_expose_le_refus(self, relais, refuse_encombrant):
        """
        LECTURE offerte au domaine livraison : il peut eviter de router un
        encombrant plutot que de le decouvrir a l'arrivee du livreur.
        """
        assert relay_accepts_size(relais, "BULKY") is False
        assert relay_accepts_size(relais, "STANDARD") is True

    def test_aucune_remuneration_pour_une_categorie_refusee(
        self, relais, refuse_encombrant,
    ):
        assert compensate_relay_parcel(
            relais, order_id=1, parcel_reference="P-REFUSE",
            parcel_size="BULKY") is None
        assert not Adjustment.objects.filter(payee=relais).exists()

    def test_les_autres_categories_restent_remunerees(
        self, relais, refuse_encombrant,
    ):
        ajustement = compensate_relay_parcel(
            relais, order_id=2, parcel_reference="P-OK",
            parcel_size="STANDARD")
        assert ajustement.amount_xaf == 500

    def test_sans_regle_du_tout_rien_n_est_refuse(self, relais):
        """
        L'absence de contrat ne vaut pas refus : bloquer un colis faute de
        configuration serait pire que l'accepter.
        """
        assert relay_accepts_size(relais, "BULKY") is True