# DEV-SRV-01 v1.8, C04 : nouvelle règle de paiement des vendeurs (bridge.versement_vendeur).
#   - versé r_versement_vendeur_j jour après la confirmation du client, quel que soit le palier ;
#   - un versement automatique par jour et par vendeur ; validation par UN opérateur sur les cas signalés ;
#   - nouveau compte (article au-delà du seuil), fraude confirmée : r_nouveau_gel_j / r_fraude_delai_j ;
#   - changement de numéro : r_blocage_numero_j ; défaut caché repris sur les versements suivants ;
#   - les vendeurs ne passent plus par le vendredi (relais et entreprises de livraison, inchangés).

from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from apps.accounts.models import TrustScoreProfile
from apps.payments.bridge import versement_vendeur as vv
from apps.payments.bridge.models import FraudeConfirmee, PayeeLink, RepereVersementVendeur
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import _cooling_hours_for, create_payee
from apps.payments.settlements.models import Adjustment, PayoutRequest
from apps.payments.settlements.services import (
    SettlementError, approve_payout, execute_payout, versements_du_vendredi,
)
from apps.payments.tests.dp42_aide import avec_role
from apps.payments.tests.settlements.test_settlements import (  # noqa: F401  (fixtures réutilisées)
    NUMERO, _mock, acheteur, configuration, liberer, plan_comptable,
)
from apps.regles import services as regles
from apps.vendors.models import VendorProfile
from tests.test_commission_v21 import commander
from tests.test_frais_v21 import boutique, offre

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _reglages():
    regles.cache.delete(regles.CLE_CACHE)
    yield
    regles.cache.delete(regles.CLE_CACHE)


@pytest.fixture(autouse=True)
def _dossier_complet(monkeypatch):
    """D19 (pièces validées) est testé ailleurs ; ici, le dossier du vendeur est complet."""
    monkeypatch.setattr("apps.payments.bridge.vendredi.refus_metier", lambda payee: None)


@pytest.fixture
def vendeur_user():
    user = User.objects.create_user("vendeur-c04", "v@belivay.cm", "x")
    VendorProfile.objects.create(user=user, business_name="Boutique C04", phone="690000004", city="Yaoundé",
                                 status=VendorProfile.Status.APPROVED)
    return user


@pytest.fixture
def vendeur(vendeur_user):
    """Le compte de versement du vendeur, rattaché à sa boutique, numéro vérifié depuis longtemps."""
    compte = create_payee(payee_type=PayeeType.VENDOR, display_label="Boutique C04",
                          momo_operator=MomoOperator.MTN, momo_number=NUMERO, settlement_cycle_key="")
    compte.kyc_status = "VERIFIED"
    compte.kyc_verified_at = timezone.now()
    compte.momo_changed_at = timezone.now() - timedelta(days=60)
    compte.save()
    PayeeLink.objects.create(payee_account=compte, vendor=vendeur_user.vendor_profile)
    return compte


def _operateur(nom="operateur-c04"):
    return avec_role(User.objects.create_user(nom, f"{nom}@belivay.cm", "x"), "finance-comptable")


# ── Délais ───────────────────────────────────────────────────────────────────────────────────────────────────────

def test_un_jour_apres_la_confirmation_quel_que_soit_le_palier():
    assert regles.reglage("r_versement_vendeur_j") == 1
    b = boutique("b-palier")
    o = commander([(offre(b, 14000), 1)])
    payee = create_payee(payee_type=PayeeType.VENDOR, display_label="B", momo_operator=MomoOperator.MTN,
                         momo_number=NUMERO)
    for tier in ("NEW", "GOLD"):
        TrustScoreProfile.objects.update_or_create(user=b, role=TrustScoreProfile.Role.VENDOR, defaults={"tier": tier})
        assert vv.delai_liberation(b, payee, o.id)[0] == 1          # plus de J+3 / J+1 selon le palier


def test_nouveau_compte_l_article_au_dela_du_seuil_reste_gele_plus_longtemps():
    b = boutique("b-neuf")
    payee = create_payee(payee_type=PayeeType.VENDOR, display_label="B", momo_operator=MomoOperator.MTN,
                         momo_number=NUMERO)
    cher = commander([(offre(b, regles.reglage("r_nouveau_gel_article") + 1000), 1)])
    pas_cher = commander([(offre(b, 14000, titre="Etui"), 1)])
    assert vv.nouveau_compte(payee)
    assert vv.delai_liberation(b, payee, cher.id) == (3, "C04 : nouveau compte, article au-delà du seuil")
    assert vv.delai_liberation(b, payee, pas_cher.id)[0] == 1


def test_fraude_confirmee_trois_jours_puis_retour_au_delai_normal(vendeur_user, vendeur):
    operateur = _operateur()
    f = FraudeConfirmee.objects.create(vendeur=vendeur_user, motif="Colis vide", confirmee_par=operateur)
    assert vv.fraude_active(vendeur_user)
    assert vv.delai_liberation(vendeur_user, vendeur, 1)[0] == regles.reglage("r_fraude_delai_j") == 3
    assert "fraude confirmée" in vv.signalements(vendeur, vendeur_user, 1000)
    plus_tard = f.confirmee_le + timedelta(days=regles.reglage("r_fraude_periode_j") + 1)
    assert not vv.fraude_active(vendeur_user, plus_tard)            # 30 jours sans incident : retour à 1 jour


def test_une_deuxieme_fraude_allonge_la_periode(vendeur_user):
    operateur = _operateur()
    FraudeConfirmee.objects.create(vendeur=vendeur_user, motif="1", confirmee_par=operateur)
    derniere = FraudeConfirmee.objects.create(vendeur=vendeur_user, motif="2", confirmee_par=operateur)
    jour_45 = derniere.confirmee_le + timedelta(days=45)
    assert vv.fraude_active(vendeur_user, jour_45)                   # 30 × 2 = 60 jours


def test_le_vendeur_ne_confirme_pas_sa_propre_fraude(vendeur_user):
    from django.db import IntegrityError, transaction

    with pytest.raises(IntegrityError), transaction.atomic():
        FraudeConfirmee.objects.create(vendeur=vendeur_user, motif="x", confirmee_par=vendeur_user)


# ── Versement quotidien ──────────────────────────────────────────────────────────────────────────────────────────

def test_le_premier_versement_attend_un_operateur_puis_les_suivants_partent_seuls(acheteur, vendeur, vendeur_user):
    liberer(acheteur, vendeur, montant=20000, order_id=11, cle="c04-1")
    jour1 = timezone.now()
    r = vv.versements_vendeurs_du_jour(jour1)
    assert r["a_valider"] == 1 and r["automatiques"] == 0
    premier = PayoutRequest.objects.get(payee=vendeur)
    assert premier.status == PayoutRequest.Status.PENDING_APPROVAL and premier.required_approvals == 1
    assert "premier versement" in premier.justification
    assert vv.versements_vendeurs_du_jour(jour1)["a_valider"] == 0   # un seul versement par jour

    premier = approve_payout(premier, approved_by=_operateur())       # UN opérateur suffit (pas DP-42)
    assert premier.status == PayoutRequest.Status.APPROVED
    assert execute_payout(premier).status == PayoutRequest.Status.PAID

    liberer(acheteur, vendeur, montant=20000, order_id=12, cle="c04-2")
    r = vv.versements_vendeurs_du_jour(jour1 + timedelta(days=1))
    assert r["automatiques"] == 1                                     # aucun cas signalé : approuvé par le système
    second = PayoutRequest.objects.filter(payee=vendeur).order_by("-requested_at").first()
    assert second.status == PayoutRequest.Status.APPROVED and second.required_approvals == 0
    assert second.psp_fee_xaf > 0                                     # r_versement, à la charge du vendeur
    assert execute_payout(second).status == PayoutRequest.Status.PAID


def test_seul_un_operateur_finance_ou_direction_valide(acheteur, vendeur):
    liberer(acheteur, vendeur, montant=20000, order_id=21, cle="c04-3")
    vv.versements_vendeurs_du_jour()
    demande = PayoutRequest.objects.get(payee=vendeur)
    quelconque = User.objects.create_user("curieux-c04", "c@belivay.cm", "x")
    with pytest.raises(SettlementError):
        approve_payout(demande, approved_by=quelconque)


def test_montant_inhabituel_signale(acheteur, vendeur, vendeur_user):
    liberer(acheteur, vendeur, montant=20000, order_id=41, cle="c04-5")
    vv.versements_vendeurs_du_jour()
    premier = approve_payout(PayoutRequest.objects.get(payee=vendeur), approved_by=_operateur())
    execute_payout(premier)                                          # un versement payé d'environ 20 000 F
    multiple = regles.reglage("r_montant_inhabituel_x")
    assert "montant inhabituel" in vv.signalements(vendeur, vendeur_user, int(premier.amount_xaf * multiple) + 1000)
    assert "montant inhabituel" not in vv.signalements(vendeur, vendeur_user, premier.amount_xaf)


def test_forte_baisse_du_trust_score_signalee(vendeur, vendeur_user):
    TrustScoreProfile.objects.create(user=vendeur_user, role=TrustScoreProfile.Role.VENDOR, score=Decimal("60"))
    RepereVersementVendeur.objects.create(vendeur=vendeur_user, score=Decimal("80"))
    assert "forte baisse du Trust Score" in vv.signalements(vendeur, vendeur_user, 1000)


def test_les_vendeurs_ne_passent_plus_par_le_vendredi(acheteur, vendeur):
    liberer(acheteur, vendeur, montant=20000, order_id=31, cle="c04-4")
    vendredi_matin = timezone.make_aware(datetime(2026, 10, 23, 9, 0))
    versements_du_vendredi(vendredi_matin)
    assert not PayoutRequest.objects.filter(payee=vendeur).exists()


# ── Numéro, défaut caché ─────────────────────────────────────────────────────────────────────────────────────────

def test_changement_de_numero_bloque_sept_jours(vendeur):
    assert _cooling_hours_for(vendeur) == 24 * regles.reglage("r_blocage_numero_j") == 168
    vendeur.momo_changed_at = timezone.now() - timedelta(days=4)
    assert vendeur.payout_blockers(cooling_hours=_cooling_hours_for(vendeur))
    vendeur.momo_changed_at = timezone.now() - timedelta(days=8)
    assert not vendeur.payout_blockers(cooling_hours=_cooling_hours_for(vendeur))


def test_un_defaut_cache_apres_versement_est_repris_sur_les_versements_suivants(vendeur, vendeur_user):
    creance = vv.reprendre_defaut_cache(vendeur=vendeur_user, commande_id=99, montant_xaf=4000,
                                        motif="écran défectueux", par=_operateur())
    assert creance.direction == Adjustment.Direction.CREDIT and creance.remaining_xaf == 4000
    assert creance.status == Adjustment.Status.PENDING_APPROVAL            # validée par une seconde personne
    assert creance.payee == vendeur
