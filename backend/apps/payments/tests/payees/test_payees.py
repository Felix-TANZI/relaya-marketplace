# backend/apps/payments/tests/payees/test_payees.py
# Tests de l'identite financiere et du pont metier.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/payees/ -q

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.payments.bridge.actors import (
    BridgeError,
    payee_for_delivery_company,
    payee_for_vendor,
    payee_types_map,
    platform_payee,
    subject_for_payee,
)
from apps.payments.bridge.models import PayeeLink
from apps.payments.payees import crypto
from apps.payments.payees.models import (
    KycStatus,
    MomoOperator,
    PayeeAccount,
    PayeeMomoChange,
    PayeeType,
)
from apps.payments.payees.services import (
    PayeeError,
    assert_can_receive_payout,
    can_receive_payout,
    change_momo_number,
    create_payee,
    hold_payouts,
    payout_blockers,
    release_hold,
    reject_kyc,
    shared_number_payees,
    verify_kyc,
)

pytestmark = pytest.mark.django_db

NUMERO = "237677123456"
AUTRE_NUMERO = "237699887766"


@pytest.fixture
def admin_user():
    return User.objects.create_user("admin-finance", "af@belivay.cm", "x")


@pytest.fixture
def vendeur():
    """Compte vendeur pret a etre regle : KYC valide, numero pose il y a longtemps."""
    compte = create_payee(
        payee_type=PayeeType.VENDOR,
        display_label="Boutique Mode Yaounde",
        momo_operator=MomoOperator.MTN,
        momo_number=NUMERO,
    )
    compte.kyc_status = KycStatus.VERIFIED
    compte.kyc_verified_at = timezone.now()
    compte.momo_changed_at = timezone.now() - timedelta(days=30)
    compte.save()
    return compte


# ═══════════════════════════════════════════════════════════════════════════
# CHIFFREMENT
# ═══════════════════════════════════════════════════════════════════════════

class TestCrypto:

    def test_aller_retour(self):
        chiffre = crypto.encrypt(NUMERO)
        assert crypto.decrypt(chiffre) == NUMERO
        assert NUMERO.encode() not in chiffre

    def test_masquage(self):
        assert crypto.mask(NUMERO) == "237·····456"
        assert NUMERO[3:9] not in crypto.mask(NUMERO)

    def test_empreinte_deterministe(self):
        assert crypto.fingerprint(NUMERO) == crypto.fingerprint(NUMERO)
        assert crypto.fingerprint(NUMERO) != crypto.fingerprint(AUTRE_NUMERO)

    def test_empreinte_ignore_les_espaces(self):
        assert crypto.fingerprint("237 677 123 456") == crypto.fingerprint(NUMERO)

    def test_empreinte_non_reversible(self):
        assert NUMERO not in crypto.fingerprint(NUMERO)

    def test_donnee_corrompue_detectee(self):
        with pytest.raises(crypto.DecryptionFailed):
            crypto.decrypt(b"donnee-invalide-quelconque")


# ═══════════════════════════════════════════════════════════════════════════
# COMPTE BENEFICIAIRE
# ═══════════════════════════════════════════════════════════════════════════

class TestPayeeAccount:

    def test_code_genere_avec_prefixe_de_type(self):
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="Boutique A")
        assert compte.payee_code.startswith("PAY-VND-")

    def test_codes_sequentiels_par_type(self):
        a = create_payee(payee_type=PayeeType.VENDOR, display_label="A")
        b = create_payee(payee_type=PayeeType.VENDOR, display_label="B")
        c = create_payee(payee_type=PayeeType.RELAY_POINT, display_label="C")
        assert a.payee_code == "PAY-VND-000001"
        assert b.payee_code == "PAY-VND-000002"
        assert c.payee_code == "PAY-RLY-000001"

    def test_kyc_demarre_en_attente(self):
        """Aucun versement possible tant qu'un humain n'a pas verifie."""
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="A")
        assert compte.kyc_status == KycStatus.PENDING
        assert can_receive_payout(compte) is False

    def test_type_courier_refuse_en_phase_1(self):
        with pytest.raises(PayeeError, match="Phase 2"):
            create_payee(payee_type=PayeeType.COURIER, display_label="Livreur")

    def test_suppression_refusee(self, vendeur):
        with pytest.raises(ValidationError):
            vendeur.delete()

    def test_numero_jamais_en_clair_en_base(self, vendeur):
        vendeur.refresh_from_db()
        assert vendeur.momo_number_masked == "237·····456"
        assert NUMERO.encode() not in bytes(vendeur.momo_number_enc)
        # Restitution possible pour emettre le versement
        assert vendeur.momo_number == NUMERO

    def test_aucun_numero_exige_un_operateur(self):
        with pytest.raises(PayeeError, match="operateur"):
            create_payee(payee_type=PayeeType.VENDOR, display_label="A",
                         momo_number=NUMERO)


# ═══════════════════════════════════════════════════════════════════════════
# ELIGIBILITE AU REGLEMENT
# ═══════════════════════════════════════════════════════════════════════════

class TestPayoutEligibility:

    def test_beneficiaire_conforme_est_reglable(self, vendeur):
        assert payout_blockers(vendeur) == []
        assert can_receive_payout(vendeur) is True

    def test_kyc_non_verifie_bloque(self, vendeur, admin_user):
        reject_kyc(vendeur, rejected_by=admin_user, reason="Piece illisible.")
        motifs = payout_blockers(vendeur)
        assert any("KYC" in m for m in motifs)

    def test_gel_bloque(self, vendeur, admin_user):
        hold_payouts(vendeur, held_by=admin_user, reason="Suspicion de fraude.")
        assert any("geles" in m for m in payout_blockers(vendeur))

    def test_absence_de_numero_bloque(self):
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="A")
        compte.kyc_status = KycStatus.VERIFIED
        compte.save()
        assert any("numero" in m.lower() for m in payout_blockers(compte))

    def test_compte_desactive_bloque(self, vendeur):
        vendeur.is_active = False
        vendeur.save()
        assert any("desactive" in m for m in payout_blockers(vendeur))

    def test_tous_les_motifs_sont_listes(self, vendeur, admin_user):
        """L'admin doit voir TOUT ce qui bloque, pas seulement le premier motif."""
        reject_kyc(vendeur, rejected_by=admin_user, reason="x")
        hold_payouts(vendeur, held_by=admin_user, reason="y")
        vendeur.is_active = False
        vendeur.save()
        assert len(payout_blockers(vendeur)) >= 3

    def test_exception_detaillee(self, vendeur, admin_user):
        hold_payouts(vendeur, held_by=admin_user, reason="Fraude.")
        with pytest.raises(PayeeError, match="Versement impossible"):
            assert_can_receive_payout(vendeur)


# ═══════════════════════════════════════════════════════════════════════════
# CHANGEMENT DE NUMERO — le vecteur d'attaque principal
# ═══════════════════════════════════════════════════════════════════════════

class TestMomoChange:

    def test_changement_bloque_les_versements(self, vendeur, admin_user):
        """
        LE test central du lot.

        Compromettre un compte, changer le numero, encaisser le reglement :
        c'est le scenario le plus rentable pour un attaquant. Sans periode
        de refroidissement, la compromission se solde par une perte seche.
        """
        assert can_receive_payout(vendeur) is True

        change_momo_number(vendeur, msisdn=AUTRE_NUMERO,
                           operator=MomoOperator.ORANGE, changed_by=admin_user,
                           reason="Changement d'operateur.")

        assert can_receive_payout(vendeur) is False
        assert any("refroidissement" in m.lower() for m in payout_blockers(vendeur))

    def test_versement_possible_apres_le_delai(self, vendeur, admin_user):
        change_momo_number(vendeur, msisdn=AUTRE_NUMERO,
                           operator=MomoOperator.ORANGE, changed_by=admin_user)
        plus_tard = timezone.now() + timedelta(hours=73)
        assert payout_blockers(vendeur, now=plus_tard) == []

    def test_changement_journalise(self, vendeur, admin_user):
        change_momo_number(vendeur, msisdn=AUTRE_NUMERO,
                           operator=MomoOperator.ORANGE, changed_by=admin_user,
                           reason="Migration Orange.", source_ip="41.202.10.5")

        journal = PayeeMomoChange.objects.filter(payee=vendeur).order_by("-created_at")
        assert journal.count() == 2  # creation initiale + changement
        dernier = journal.first()
        assert dernier.previous_masked == "237·····456"
        assert dernier.new_masked == "237·····766"
        assert dernier.changed_by == admin_user
        assert dernier.source_ip == "41.202.10.5"

    def test_journal_immuable(self, vendeur, admin_user):
        change_momo_number(vendeur, msisdn=AUTRE_NUMERO,
                           operator=MomoOperator.ORANGE, changed_by=admin_user)
        entree = PayeeMomoChange.objects.first()
        entree.reason = "falsifie"
        with pytest.raises(ValidationError):
            entree.save()
        with pytest.raises(ValidationError):
            entree.delete()

    def test_numero_identique_refuse(self, vendeur):
        with pytest.raises(PayeeError, match="deja"):
            change_momo_number(vendeur, msisdn=NUMERO, operator=MomoOperator.MTN)

    def test_numero_partage_detecte(self, vendeur):
        """
        Le signal d'une mule financiere : un meme numero servant plusieurs
        comptes distincts.
        """
        autre = create_payee(
            payee_type=PayeeType.RELAY_POINT, display_label="Relais Mokolo",
            momo_operator=MomoOperator.MTN, momo_number=NUMERO,
        )
        partages = shared_number_payees(vendeur)
        assert len(partages) == 1
        assert partages[0].pk == autre.pk

    def test_numero_unique_ne_declenche_rien(self, vendeur):
        create_payee(payee_type=PayeeType.RELAY_POINT, display_label="Relais",
                     momo_operator=MomoOperator.ORANGE, momo_number=AUTRE_NUMERO)
        assert shared_number_payees(vendeur) == []


# ═══════════════════════════════════════════════════════════════════════════
# KYC ET GEL
# ═══════════════════════════════════════════════════════════════════════════

class TestKycAndHold:

    def test_validation_kyc_tracee(self, admin_user):
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="A")
        verify_kyc(compte, verified_by=admin_user, note="Piece conforme.")
        compte.refresh_from_db()
        assert compte.kyc_status == KycStatus.VERIFIED
        assert compte.kyc_verified_by == admin_user
        assert compte.kyc_verified_at is not None

    def test_validation_exige_un_operateur(self):
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="A")
        with pytest.raises(PayeeError):
            verify_kyc(compte, verified_by=None)

    def test_rejet_exige_un_motif(self, admin_user):
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="A")
        with pytest.raises(PayeeError):
            reject_kyc(compte, rejected_by=admin_user, reason="  ")

    def test_gel_exige_un_motif(self, vendeur, admin_user):
        with pytest.raises(PayeeError):
            hold_payouts(vendeur, held_by=admin_user, reason="")

    def test_levee_de_gel(self, vendeur, admin_user):
        hold_payouts(vendeur, held_by=admin_user, reason="Verification.")
        release_hold(vendeur, released_by=admin_user)
        vendeur.refresh_from_db()
        assert vendeur.payout_hold is False
        assert can_receive_payout(vendeur) is True


# ═══════════════════════════════════════════════════════════════════════════
# PONT METIER
# ═══════════════════════════════════════════════════════════════════════════

class TestBridge:

    def test_compte_plateforme_unique(self):
        a = platform_payee()
        b = platform_payee()
        assert a.pk == b.pk
        assert a.payee_type == PayeeType.PLATFORM

    def test_rattachement_exige_exactement_une_entite(self):
        """
        La contrainte CHECK en base garantit ce qu'un GenericForeignKey
        ne pouvait pas garantir.
        """
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="A")
        lien = PayeeLink(payee_account=compte)  # aucune entite
        with pytest.raises(ValidationError):
            lien.full_clean()

    def test_contrainte_appliquee_en_base(self):
        """Contournement du full_clean : la base doit refuser aussi."""
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="A")
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                PayeeLink.objects.create(payee_account=compte)

    def test_incoherence_de_type_detectee(self):
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="A")
        lien = PayeeLink(payee_account=compte, is_platform=True)
        with pytest.raises(ValidationError, match="Incoherence de type"):
            lien.full_clean()

    def test_rattachement_non_supprimable(self):
        platform_payee()
        lien = PayeeLink.objects.filter(is_platform=True).first()
        with pytest.raises(ValidationError):
            lien.delete()

    def test_resolution_inverse(self):
        platform_payee()
        compte = PayeeAccount.objects.get(payee_type=PayeeType.PLATFORM)
        assert subject_for_payee(compte) is None  # plateforme : aucune entite

    def test_carte_des_types(self, vendeur):
        carte = payee_types_map([vendeur.payee_code])
        from apps.payments.domain.enums import PayeeType as DomainType
        assert carte[vendeur.payee_code] == DomainType.VENDOR


# ═══════════════════════════════════════════════════════════════════════════
# ISOLATION — principe P1
# ═══════════════════════════════════════════════════════════════════════════

class TestIsolation:

    #: Sous-paquets du NOUVEAU module financier.
    #: Les fichiers plats a la racine de apps/payments/ (models.py,
    #: serializers.py, views.py, urls.py, admin.py) appartiennent a l'ANCIEN
    #: module : PaymentTransaction a legitimement une cle etrangere vers Order.
    #: Ils seront supprimes en Phase 4 (contraction). Les inclure ici
    #: reviendrait a exiger d'un code condamne qu'il respecte une architecture
    #: qui ne le concerne pas.
    NOUVEAUX_PAQUETS = (
        "domain", "config", "ledger", "payees",
        # A completer au fil des lots :
        "intents", "escrow", "settlements",
        "application", "infrastructure", "api",
        "webhooks", "reconciliation", "risk", "audit", "tasks",
    )

    def test_seuls_les_paquets_du_nouveau_module_sont_isoles(self):
        """
        Aucun sous-paquet du nouveau module financier, hormis bridge/, ne doit
        importer apps.orders, apps.vendors, apps.accounts ou apps.shipping.

        C'est le garde-fou du principe P1. Il echoue des qu'un import
        interdit est introduit, y compris par une completion automatique
        de l'editeur.

        bridge/ est volontairement exclu : c'est SON role de connaitre les
        deux mondes.
        """
        import ast
        import pathlib

        interdits = ("apps.orders", "apps.vendors", "apps.accounts",
                     "apps.shipping", "apps.catalog")

        racine = pathlib.Path(__file__).resolve().parents[2]
        fautes = []

        for paquet in self.NOUVEAUX_PAQUETS:
            dossier = racine / paquet
            if not dossier.is_dir():
                continue  # le paquet n'existe pas encore a ce lot
            for fichier in dossier.rglob("*.py"):
                arbre = ast.parse(fichier.read_text(encoding="utf-8"))
                for noeud in ast.walk(arbre):
                    if isinstance(noeud, ast.Import):
                        noms = [a.name for a in noeud.names]
                    elif isinstance(noeud, ast.ImportFrom):
                        noms = [noeud.module or ""]
                    else:
                        continue
                    for nom in noms:
                        if any(nom.startswith(i) for i in interdits):
                            fautes.append(
                                f"{fichier.relative_to(racine)}: {nom}"
                            )

        assert not fautes, (
            "Imports metier hors de bridge/ : " + ", ".join(fautes)
        )

    def test_le_garde_fou_detecte_bien_une_violation(self):
        """
        Un test incapable d'echouer ne prouve rien.

        On injecte un import interdit dans un paquet surveille et on verifie
        que la detection le releve, puis on nettoie.
        """
        import ast
        import pathlib

        racine = pathlib.Path(__file__).resolve().parents[2]
        faux = racine / "payees" / "_verification_garde_fou.py"
        faux.write_text(
            "from apps.vendors.models import VendorProfile" + chr(10),
            encoding="utf-8",
        )
        try:
            trouve = False
            for noeud in ast.walk(ast.parse(faux.read_text(encoding="utf-8"))):
                if isinstance(noeud, ast.ImportFrom) and (noeud.module or "").startswith("apps.vendors"):
                    trouve = True
            assert trouve, "Le mecanisme de detection ne fonctionne pas."
        finally:
            faux.unlink(missing_ok=True)

    def test_payees_n_importe_pas_le_metier(self):
        import ast
        import pathlib

        racine = pathlib.Path(__file__).resolve().parents[2] / "payees"
        for fichier in racine.glob("*.py"):
            arbre = ast.parse(fichier.read_text(encoding="utf-8"))
            for noeud in ast.walk(arbre):
                if isinstance(noeud, ast.ImportFrom) and noeud.module:
                    assert not noeud.module.startswith("apps.vendors"), fichier.name
                    assert not noeud.module.startswith("apps.orders"), fichier.name