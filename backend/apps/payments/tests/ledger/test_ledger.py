# backend/apps/payments/tests/ledger/test_ledger.py
# Tests du registre comptable.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/ledger/ -q
#
# Ces tests verifient les proprietes qui protegent l'argent :
# equilibre, immuabilite, chainage, solvabilite, non-transit par les produits.

import pytest
from django.db import connection, transaction as db_transaction

from apps.payments.domain.money import Money
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import (
    balance,
    payee_totals,
    psp_treasury,
    raw_balance,
    revenue_summary,
    third_party_liabilities,
    trial_balance,
    trial_balance_total,
)
from apps.payments.ledger.invariants import (
    NOT_APPLICABLE,
    OK,
    VIOLATED,
    check_hash_chain,
    check_no_escrow_revenue_transit,
    check_reserved_accounts,
    check_solvency,
    check_trial_balance,
    check_transaction_balance,
    run_all,
)
from apps.payments.ledger.models import (
    LedgerAccount,
    LedgerEntry,
    LedgerImmutableError,
    LedgerTransaction,
    UnbalancedTransaction,
)
from apps.payments.ledger.posting import (
    PostingError,
    credit,
    debit,
    post,
    reverse,
)

pytestmark = pytest.mark.django_db

#: I8 (equation de sequestre) est un invariant INTER-DOMAINES : il compare
#: le registre aux objets EscrowHold. Les tests de ce fichier ecrivent
#: directement au registre, sans creer de sequestres — I8 signalerait donc
#: legitimement un ecart. On l'exclut ici : ces tests portent sur le REGISTRE.
def invariants_du_registre(**kw):
    rapport = run_all(**kw)
    violations = [v for v in rapport["violations"] if v.code != "I8"]
    return {"ok": not violations, "violations": violations,
            "results": rapport["results"]}


VENDEUR = "PAY-VND-000341"
TRANSPORTEUR = "PAY-DLV-000012"


@pytest.fixture(autouse=True)
def plan_comptable():
    """Le plan comptable est un prerequis de tout test du registre."""
    for entree in coa.CHART:
        LedgerAccount.objects.get_or_create(code=entree["code"], defaults=entree)


def encaissement(montant=50000, operateur="MTN"):
    """
    Encaissement type du referentiel : panier 50 000 FCFA.

    45 000 marchandise (commission 15%) + 5 000 transport (70/30)
    Frais PSP 2% portes par la plateforme.
    """
    return post(
        kind=LedgerTransaction.Kind.COLLECT,
        lines=[
            debit(coa.PSP_AVAILABLE_MTN, 49000, label="Encaisse net"),
            debit(coa.EXPENSE_PSP_COLLECT, 1000, label="Frais CamPay 2%"),
            credit(coa.ESCROW_LIABILITY, 42350, label="Mise sous sequestre"),
            credit(coa.REVENUE_COMMISSION, 6150, label="Commission 15%"),
            credit(coa.REVENUE_TRANSPORT_SHARE, 1500, label="Part plateforme transport"),
        ],
        description="Encaissement panier BLV-PAY-2026-0001847",
        source_type="PaymentIntent",
        source_ref="BLV-PAY-2026-0001847",
        correlation_id="corr-001",
    )


# ═══════════════════════════════════════════════════════════════════════════
# ECRITURE
# ═══════════════════════════════════════════════════════════════════════════

class TestPosting:

    def test_ecriture_equilibree(self):
        tx = encaissement()
        assert tx.is_balanced
        assert tx.imbalance() == 0
        assert tx.entries.count() == 5
        assert tx.reference.startswith("BLV-LDG-")

    def test_desequilibre_refuse_avant_ecriture(self):
        with pytest.raises(UnbalancedTransaction):
            post(
                kind=LedgerTransaction.Kind.COLLECT,
                lines=[
                    debit(coa.PSP_AVAILABLE_MTN, 50000),
                    credit(coa.ESCROW_LIABILITY, 40000),  # ecart de 10 000
                ],
            )
        # AUCUNE ecriture ne doit subsister
        assert LedgerTransaction.objects.count() == 0
        assert LedgerEntry.objects.count() == 0

    def test_une_seule_ligne_refusee(self):
        with pytest.raises(PostingError):
            post(kind=LedgerTransaction.Kind.COLLECT,
                 lines=[debit(coa.PSP_AVAILABLE_MTN, 50000)])

    def test_montant_negatif_refuse(self):
        with pytest.raises(PostingError):
            post(kind=LedgerTransaction.Kind.COLLECT,
                 lines=[debit(coa.PSP_AVAILABLE_MTN, -100),
                        credit(coa.ESCROW_LIABILITY, -100)])

    def test_montant_nul_refuse(self):
        with pytest.raises(PostingError):
            post(kind=LedgerTransaction.Kind.COLLECT,
                 lines=[debit(coa.PSP_AVAILABLE_MTN, 0),
                        credit(coa.ESCROW_LIABILITY, 0)])

    def test_float_refuse(self):
        with pytest.raises(PostingError):
            post(kind=LedgerTransaction.Kind.COLLECT,
                 lines=[debit(coa.PSP_AVAILABLE_MTN, 50000.0),
                        credit(coa.ESCROW_LIABILITY, 50000)])

    def test_money_accepte(self):
        tx = post(
            kind=LedgerTransaction.Kind.COLLECT,
            lines=[debit(coa.PSP_AVAILABLE_MTN, Money(50000)),
                   credit(coa.ESCROW_LIABILITY, Money(50000))],
        )
        assert tx.total_debit() == 50000

    def test_compte_inconnu_refuse(self):
        with pytest.raises(PostingError, match="inconnus"):
            post(kind=LedgerTransaction.Kind.COLLECT,
                 lines=[debit("9999", 100), credit(coa.ESCROW_LIABILITY, 100)])

    def test_compte_reserve_refuse(self):
        """Les comptes hors perimetre Phase 1 sont inaccessibles."""
        with pytest.raises(PostingError, match="reserve"):
            post(kind=LedgerTransaction.Kind.PAYOUT,
                 lines=[debit("2021", 1000, payee_code="PAY-CUR-1"),
                        credit(coa.PSP_AVAILABLE_MTN, 1000)])

    def test_compte_auxiliaire_exige_un_beneficiaire(self):
        with pytest.raises(PostingError, match="payee_code"):
            post(kind=LedgerTransaction.Kind.ESCROW_RELEASE,
                 lines=[debit(coa.ESCROW_LIABILITY, 1000),
                        credit(coa.PAYABLE_VENDOR, 1000)])  # payee_code manquant

    def test_beneficiaire_sur_compte_non_auxiliaire_refuse(self):
        with pytest.raises(PostingError, match="pas auxiliaire"):
            post(kind=LedgerTransaction.Kind.COLLECT,
                 lines=[debit(coa.PSP_AVAILABLE_MTN, 1000, payee_code="PAY-X"),
                        credit(coa.ESCROW_LIABILITY, 1000)])


# ═══════════════════════════════════════════════════════════════════════════
# IMMUABILITE
# ═══════════════════════════════════════════════════════════════════════════

class TestImmutability:

    def test_transaction_non_modifiable(self):
        tx = encaissement()
        tx.description = "modifie"
        with pytest.raises(LedgerImmutableError):
            tx.save()

    def test_transaction_non_supprimable(self):
        tx = encaissement()
        with pytest.raises(LedgerImmutableError):
            tx.delete()

    def test_ecriture_non_modifiable(self):
        tx = encaissement()
        ligne = tx.entries.first()
        ligne.amount_xaf = 999999
        with pytest.raises(LedgerImmutableError):
            ligne.save()

    def test_ecriture_non_supprimable(self):
        tx = encaissement()
        with pytest.raises(LedgerImmutableError):
            tx.entries.first().delete()

    def test_compte_non_supprimable(self):
        compte = LedgerAccount.objects.get(code=coa.ESCROW_LIABILITY)
        with pytest.raises(LedgerImmutableError):
            compte.delete()


# ═══════════════════════════════════════════════════════════════════════════
# CONTRE-PASSATION
# ═══════════════════════════════════════════════════════════════════════════

class TestReversal:

    def test_contre_passation_annule_les_soldes(self):
        tx = encaissement()
        avant = balance(coa.ESCROW_LIABILITY)
        assert avant == 42350

        contre = reverse(tx, reason="Double encaissement detecte.")
        assert balance(coa.ESCROW_LIABILITY) == 0
        assert contre.reverses_id == tx.seq
        assert contre.kind == LedgerTransaction.Kind.REVERSAL

    def test_l_originale_reste_intacte(self):
        tx = encaissement()
        reverse(tx, reason="Erreur.")
        tx.refresh_from_db()
        assert tx.entries.count() == 5
        assert LedgerTransaction.objects.filter(seq=tx.seq).exists()

    def test_double_contre_passation_refusee(self):
        tx = encaissement()
        reverse(tx, reason="Premiere.")
        with pytest.raises(PostingError, match="deja contre-passee"):
            reverse(tx, reason="Seconde.")

    def test_motif_obligatoire(self):
        tx = encaissement()
        with pytest.raises(PostingError):
            reverse(tx, reason="  ")


# ═══════════════════════════════════════════════════════════════════════════
# CHAINE D'INTEGRITE
# ═══════════════════════════════════════════════════════════════════════════

class TestHashChain:

    def test_chainage_correct(self):
        t1 = encaissement()
        t2 = encaissement()
        t2.refresh_from_db()
        assert t1.entry_hash
        assert t2.previous_hash == t1.entry_hash
        assert check_hash_chain().status == OK

    def test_declencheur_bloque_l_alteration(self):
        """
        Defense de premier niveau : la base refuse toute modification,
        y compris via un queryset qui contourne save().
        """
        tx = encaissement()
        ligne = tx.entries.first()

        if connection.vendor != "postgresql":
            pytest.skip("Les declencheurs sont specifiques a PostgreSQL.")

        with pytest.raises(Exception, match="immuable"):
            with db_transaction.atomic():
                LedgerEntry.objects.filter(pk=ligne.pk).update(amount_xaf=99999)

        ligne.refresh_from_db()
        assert ligne.amount_xaf == 49000

    def test_alteration_detectee_si_les_declencheurs_sont_contournes(self):
        """
        Defense de second niveau : la chaine d'empreintes.

        Les declencheurs ne couvrent pas tout — restauration d'une sauvegarde
        corrompue, superutilisateur desactivant les triggers, incident de
        replication. On simule ici ce contournement pour verifier que
        l'alteration reste DETECTABLE meme quand elle a pu aboutir.
        """
        tx = encaissement()
        ligne = tx.entries.first()

        if connection.vendor == "postgresql":
            # session_replication_role = replica neutralise les declencheurs
            # pour la session courante. C'est exactement ce que fait une
            # restauration de sauvegarde ou un outil de replication.
            with connection.cursor() as cur:
                cur.execute("SET CONSTRAINTS ALL IMMEDIATE")
                cur.execute("SET session_replication_role = replica")
            try:
                LedgerEntry.objects.filter(pk=ligne.pk).update(amount_xaf=99999)
            finally:
                with connection.cursor() as cur:
                    cur.execute("SET session_replication_role = DEFAULT")
        else:
            LedgerEntry.objects.filter(pk=ligne.pk).update(amount_xaf=99999)

        tx.refresh_from_db()
        assert tx.verify_hash() is False
        assert check_hash_chain().status == VIOLATED

    def test_chaine_vide_est_valide(self):
        assert check_hash_chain().status == OK


# ═══════════════════════════════════════════════════════════════════════════
# SOLDES
# ═══════════════════════════════════════════════════════════════════════════

class TestBalances:

    def test_sens_normal_applique(self):
        encaissement()
        # 2010 est un passif : credite -> solde positif dans son sens normal
        assert balance(coa.ESCROW_LIABILITY) == 42350
        assert raw_balance(coa.ESCROW_LIABILITY) == -42350
        # 1011 est un actif : debite -> solde positif
        assert balance(coa.PSP_AVAILABLE_MTN) == 49000
        assert raw_balance(coa.PSP_AVAILABLE_MTN) == 49000

    def test_balance_generale_equilibree(self):
        encaissement()
        assert trial_balance_total() == 0
        assert check_trial_balance().status == OK

    def test_solde_par_beneficiaire(self):
        encaissement()
        post(
            kind=LedgerTransaction.Kind.ESCROW_RELEASE,
            lines=[
                debit(coa.ESCROW_LIABILITY, 38250),
                credit(coa.PAYABLE_VENDOR, 38250, payee_code=VENDEUR),
            ],
            source_type="EscrowHold", source_ref="1",
        )
        assert balance(coa.PAYABLE_VENDOR, payee_code=VENDEUR) == 38250
        assert balance(coa.PAYABLE_VENDOR, payee_code=TRANSPORTEUR) == 0

    def test_montant_du_net_des_creances(self):
        encaissement()
        post(kind=LedgerTransaction.Kind.ESCROW_RELEASE,
             lines=[debit(coa.ESCROW_LIABILITY, 38250),
                    credit(coa.PAYABLE_VENDOR, 38250, payee_code=VENDEUR)])
        # Penalite : le vendeur doit 3 000 a BelivaY
        post(kind=LedgerTransaction.Kind.ADJUSTMENT,
             lines=[debit(coa.RECEIVABLE_PARTNER, 3000, payee_code=VENDEUR),
                    credit(coa.REVENUE_COMMISSION, 3000)],
             description="Penalite de retard")

        totaux = payee_totals(VENDEUR)
        assert totaux["payable_xaf"] == 38250
        assert totaux["receivable_xaf"] == 3000
        assert totaux["amount_due_xaf"] == 35250

    def test_chiffre_affaires_et_marge(self):
        encaissement()
        resume = revenue_summary()
        assert resume["revenue_total"] == 7650      # 6150 + 1500
        assert resume["expense_total"] == 1000      # frais PSP
        assert resume["net_margin_xaf"] == 6650

    def test_le_sequestre_n_est_pas_un_produit(self):
        """
        Principe P8 : les 42 350 dus aux tiers ne doivent JAMAIS apparaitre
        dans le chiffre d'affaires. Les comptabiliser en produit conduirait
        a surpayer massivement l'impot.
        """
        encaissement()
        assert revenue_summary()["revenue_total"] == 7650
        assert third_party_liabilities()["total"] == 42350

    def test_tresorerie_psp(self):
        encaissement()
        tresorerie = psp_treasury(degraded=False)
        assert tresorerie["available"][coa.PSP_AVAILABLE_MTN] == 49000
        assert tresorerie["per_operator_authoritative"] is True
        assert psp_treasury(degraded=True)["per_operator_authoritative"] is False


# ═══════════════════════════════════════════════════════════════════════════
# INVARIANTS
# ═══════════════════════════════════════════════════════════════════════════

class TestInvariants:

    def test_registre_vide_est_coherent(self):
        rapport = run_all()
        assert rapport["ok"] is True

    def test_encaissement_respecte_tous_les_invariants(self):
        encaissement()
        rapport = invariants_du_registre()
        assert rapport["ok"] is True, [
            (r.code, r.detail) for r in rapport["violations"]
        ]

    def test_solvabilite_ok_apres_encaissement(self):
        encaissement()
        resultat = check_solvency()
        assert resultat.status == OK
        assert resultat.data["detenu"] >= resultat.data["du"]

    def test_insolvabilite_detectee(self):
        """
        Scenario : on verse plus que ce qu'on detient.
        La plateforme doit alors plus qu'elle ne possede.
        """
        encaissement()
        post(kind=LedgerTransaction.Kind.ESCROW_RELEASE,
             lines=[debit(coa.ESCROW_LIABILITY, 42350),
                    credit(coa.PAYABLE_VENDOR, 42350, payee_code=VENDEUR)])
        # Sortie de tresorerie sans reduire la dette : on vide le compte PSP
        post(kind=LedgerTransaction.Kind.ADJUSTMENT,
             lines=[debit(coa.EXPENSE_WRITEOFF, 49000),
                    credit(coa.PSP_AVAILABLE_MTN, 49000)],
             description="Sortie exceptionnelle")

        resultat = check_solvency()
        assert resultat.status == VIOLATED
        assert resultat.data["deficit"] > 0
        assert run_all()["must_freeze_payouts"] is True

    def test_transit_sequestre_vers_produit_detecte(self):
        """
        Le scenario que le principe P8 interdit : debiter le sequestre
        et crediter un produit dans le meme mouvement.
        """
        encaissement()
        post(kind=LedgerTransaction.Kind.ADJUSTMENT,
             lines=[debit(coa.ESCROW_LIABILITY, 1000),
                    credit(coa.REVENUE_COMMISSION, 1000)],
             description="Ecriture fautive")
        assert check_no_escrow_revenue_transit().status == VIOLATED

    def test_contre_passation_exclue_du_controle_p8(self):
        """Une contre-passation inverse legitimement les sens."""
        tx = encaissement()
        reverse(tx, reason="Annulation.")
        assert check_no_escrow_revenue_transit().status == OK

    def test_comptes_reserves_non_mouvementes(self):
        encaissement()
        assert check_reserved_accounts().status == OK

    def test_liquidite_par_porteur_en_mode_degrade(self):
        from apps.payments.ledger.invariants import check_operator_liquidity
        resultat = check_operator_liquidity(degraded=True)
        assert resultat.status == NOT_APPLICABLE
        assert resultat.blocking is False

    def test_liquidite_insuffisante_detectee(self):
        """
        Mode nominal : on verifie qu'un versement Orange planifie superieur
        au pool Orange est detecte AVANT de declencher un ER301 chez CamPay.
        """
        from apps.payments.ledger.invariants import check_operator_liquidity
        encaissement()  # credite MTN uniquement
        resultat = check_operator_liquidity(
            pending_by_operator={"ORANGE": 200000}, degraded=False,
        )
        assert resultat.status == VIOLATED
        assert resultat.data["manques"]["ORANGE"]["manque"] == 200000

    def test_equation_sequestre_detecte_l_absence_de_sequestres(self):
        """
        I8 est ACTIVE depuis le Lot 10.

        Ce test ecrit 42 350 XAF au compte de sequestre sans creer le moindre
        EscrowHold : l'invariant doit le signaler. C'est precisement son role
        — un ecart entre le registre et les sequestres signale un bug.
        """
        from apps.payments.ledger.invariants import check_escrow_equation

        assert check_escrow_equation().status == OK   # registre vide

        encaissement()
        resultat = check_escrow_equation()
        assert resultat.status == VIOLATED
        assert resultat.data["ledger"] == 42350
        assert resultat.data["holds"] == 0


# ═══════════════════════════════════════════════════════════════════════════
# SCENARIO COMPLET
# ═══════════════════════════════════════════════════════════════════════════

class TestScenarioComplet:

    def test_cycle_encaissement_liberation_versement(self):
        """Parcours de bout en bout, avec verification des invariants a chaque etape."""
        # 1. Encaissement
        encaissement()
        assert invariants_du_registre()["ok"]

        # 2. Liberation du sequestre vendeur
        post(kind=LedgerTransaction.Kind.ESCROW_RELEASE,
             lines=[debit(coa.ESCROW_LIABILITY, 38250),
                    credit(coa.PAYABLE_VENDOR, 38250, payee_code=VENDEUR)],
             source_type="EscrowHold", source_ref="1")

        # 3. Liberation du sequestre transporteur
        post(kind=LedgerTransaction.Kind.ESCROW_RELEASE,
             lines=[debit(coa.ESCROW_LIABILITY, 3500),
                    credit(coa.PAYABLE_DELIVERY_COMPANY, 3500, payee_code=TRANSPORTEUR)],
             source_type="EscrowHold", source_ref="2")

        assert balance(coa.ESCROW_LIABILITY) == 42350 - 38250 - 3500
        assert invariants_du_registre()["ok"]

        # 4. Versement au vendeur — frais PSP a la charge de la plateforme.
        #    Le partenaire recoit l'INTEGRALITE de son net (referentiel §7.1).
        post(kind=LedgerTransaction.Kind.PAYOUT,
             lines=[debit(coa.PAYABLE_VENDOR, 38250, payee_code=VENDEUR),
                    debit(coa.EXPENSE_PSP_PAYOUT, 380, label="Frais CamPay 1%"),
                    credit(coa.PSP_AVAILABLE_MTN, 38630)],
             source_type="SettlementBatch", source_ref="BLV-STL-2026-W32-000147")

        assert balance(coa.PAYABLE_VENDOR, payee_code=VENDEUR) == 0
        assert balance(coa.PSP_AVAILABLE_MTN) == 49000 - 38630

        rapport = invariants_du_registre()
        assert rapport["ok"], [(r.code, r.detail) for r in rapport["violations"]]

        # 5. La base fiscale ne contient que le revenu propre
        assert revenue_summary()["revenue_total"] == 7650

    def test_conservation_sur_ecritures_multiples(self):
        for _ in range(30):
            encaissement()
        assert trial_balance_total() == 0
        assert check_transaction_balance().status == OK
        assert check_hash_chain().status == OK