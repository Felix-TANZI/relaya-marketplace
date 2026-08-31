# backend/apps/payments/tests/providers/test_campay.py
# Tests de l'adaptateur CamPay et du recepteur de webhooks.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/providers/ -q
#
# COUCHE 1 de la strategie de test : un faux serveur HTTP local reproduit les
# reponses documentees de CamPay. Aucun reseau, aucun compte, deterministe,
# executable en integration continue.

from __future__ import annotations

import json
import threading
from decimal import Decimal
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import RequestFactory, override_settings

from apps.payments.application.collect import (
    create_payment_intent,
    initiate_collect,
)
from apps.payments.config.models import (
    DistributionRule,
    EscrowPolicy,
    FeeRule,
    ProviderConfig,
)
from apps.payments.domain.distribution import ComponentInput
from apps.payments.domain.enums import EconomicComponent, PayeeType as DomainPayeeType
from apps.payments.domain.money import Money
from apps.payments.infrastructure.providers.base import (
    CollectRequest,
    ProviderError,
    ProviderStatus,
    ProviderTimeout,
    WithdrawRequest,
)
from apps.payments.infrastructure.providers.campay import mapper
from apps.payments.infrastructure.providers.campay.client import (
    CampayClient,
    CircuitBreaker,
)
from apps.payments.infrastructure.providers.campay.errors import describe
from apps.payments.infrastructure.providers.campay.provider import CampayProvider
from apps.payments.intents.models import PaymentIntent
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance
from apps.payments.ledger.models import LedgerAccount, LedgerTransaction
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee
from apps.payments.webhooks.models import WebhookEvent, WebhookReplayGuard
from apps.payments.webhooks.receiver import handle
from apps.payments.webhooks.signature import verify as verify_signature

REF_OK = "872bc5e2-3d53-4081-9058-04a87314a087"
REF_PENDING = "d5dd74bd-87a2-48f0-9210-b00becfdb23d"
REF_FAILED = "24f319a9-894c-4cba-af2f-4cfff7945b42"
REF_INCONNUE = "00000000-0000-0000-0000-000000000000"


# ═══════════════════════════════════════════════════════════════════════════
# FAUX SERVEUR CAMPAY
# ═══════════════════════════════════════════════════════════════════════════

def _transaction(reference, statut, montant="50000", endpoint="collect",
                 externe="BLV-PAY-2026-0000001-A01"):
    """Objet transaction au format EXACT de CamPay."""
    return {
        "reference": reference,
        "status": statut,
        "amount": montant,
        "currency": "XAF",
        "operator": "MTN",
        "code": "D260612W0011SN",
        "operator_reference": "",
        "endpoint": endpoint,
        "signature": "eyJhbGciOiJIUzI1NiIsImFwcCI6IlRlc3QiLCJ0eXAiOiJKV1QifQ.e30.x",
        "external_reference": externe,
        "external_user": "None",
        "app_amount": montant,
        "phone_number": "237677123456",
        "description": "BelivaY",
        "reason": "None",
    }


class FauxCampay(BaseHTTPRequestHandler):
    """Reproduit les reponses documentees. Sert aussi a simuler les pannes."""

    scenarios: dict = {}
    appels: list = []

    def log_message(self, *args):
        pass

    def _repondre(self, code, charge):
        corps = json.dumps(charge).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        FauxCampay.appels.append(("GET", self.path))

        if self.path.startswith("/api/balance/"):
            return self._repondre(200, FauxCampay.scenarios.get(
                "balance", {"total_balance": "125000"},
            ))

        if self.path.startswith("/api/holder_info/"):
            return self._repondre(200, {"full_name": "JOHN DOE"})

        if "/api/transaction/" in self.path:
            reference = self.path.rstrip("/").split("/")[-1]
            if reference == REF_INCONNUE:
                return self._repondre(404, {"detail": "Not found."})
            if reference == REF_FAILED:
                charge = _transaction(reference, "FAILED")
                charge["reason"] = "ER301 Insufficient balance"
                return self._repondre(200, charge)
            if reference == REF_PENDING:
                return self._repondre(200, _transaction(reference, "PENDING"))
            return self._repondre(200, _transaction(reference, "SUCCESSFUL"))

        return self._repondre(404, {"detail": "Unknown path."})

    def do_POST(self):
        taille = int(self.headers.get("Content-Length") or 0)
        corps = json.loads(self.rfile.read(taille) or b"{}")
        FauxCampay.appels.append(("POST", self.path, corps))

        if self.path.startswith("/api/collect/"):
            scenario = FauxCampay.scenarios.get("collect", "ok")
            if scenario == "insufficient":
                return self._repondre(400, {"message": "ER301 Insufficient balance"})
            if scenario == "invalid_number":
                return self._repondre(400, {"message": "ER101 Invalid phone number"})
            if scenario == "server_error":
                return self._repondre(500, {"detail": "Internal error"})
            if scenario == "no_reference":
                return self._repondre(200, {"status": "PENDING"})
            return self._repondre(200, {
                "reference": REF_OK, "status": "PENDING",
                "ussd_code": "*126#", "operator": "MTN",
            })

        if self.path.startswith("/api/withdraw/"):
            scenario = FauxCampay.scenarios.get("withdraw", "ok")
            if scenario == "insufficient":
                return self._repondre(400, {"message": "ER301 Insufficient balance"})
            return self._repondre(200, _transaction(
                REF_OK, "SUCCESSFUL", endpoint="withdraw",
            ))

        return self._repondre(404, {"detail": "Unknown path."})


@pytest.fixture
def faux_serveur():
    FauxCampay.scenarios = {}
    FauxCampay.appels = []
    serveur = HTTPServer(("127.0.0.1", 0), FauxCampay)
    fil = threading.Thread(target=serveur.serve_forever, daemon=True)
    fil.start()
    port = serveur.server_address[1]
    yield f"http://127.0.0.1:{port}/api", FauxCampay
    serveur.shutdown()
    serveur.server_close()


@pytest.fixture
def prestataire(faux_serveur):
    url, _ = faux_serveur
    client = CampayClient(
        base_url=url, token="jeton-de-test",
        connect_timeout=2, read_timeout=3,
        max_attempts=2, backoff_seconds=(0, 0),
        breaker=CircuitBreaker("test-campay", threshold=3, cooldown_s=1),
    )
    client.breaker.reset()
    return CampayProvider(config=None, client=client)


# ═══════════════════════════════════════════════════════════════════════════
# TRADUCTION — le piege des "None"
# ═══════════════════════════════════════════════════════════════════════════

class TestMapper:

    def test_la_chaine_None_devient_vide(self):
        """
        PIEGE CAMPAY : les valeurs absentes sont la CHAINE "None", pas null.
        Un test de verite naif serait VRAI sur "None".
        """
        assert mapper.clean("None") == ""
        assert mapper.clean("null") == ""
        assert mapper.clean(None) == ""
        assert mapper.clean("BLV-PAY-1") == "BLV-PAY-1"

    def test_statut_inconnu_ne_devient_pas_echec(self):
        """
        Conclure a l'echec sur un statut qu'on ne comprend pas pourrait
        declencher un remboursement sur une transaction pourtant reussie.
        """
        assert mapper.to_status("SUCCESSFUL") == ProviderStatus.SUCCESSFUL
        assert mapper.to_status("FAILED") == ProviderStatus.FAILED
        assert mapper.to_status("PENDING") == ProviderStatus.PENDING
        assert mapper.to_status("QUELQUE_CHOSE") == ProviderStatus.UNKNOWN
        assert mapper.to_status("") == ProviderStatus.UNKNOWN

    def test_montant_chaine_vers_entier(self):
        assert mapper.to_amount_xaf("50000") == 50000
        assert mapper.to_amount_xaf("0.00") == 0
        assert mapper.to_amount_xaf("None") == 0

    def test_montant_decimal_non_nul_refuse(self):
        """Le XAF n'a pas de subdivision : tronquer serait perdre de l'argent."""
        with pytest.raises(ValueError, match="decimales"):
            mapper.to_amount_xaf("100.50")

    def test_normalisation_du_numero(self):
        assert mapper.normalise_msisdn("237677123456") == "237677123456"
        assert mapper.normalise_msisdn("677123456") == "237677123456"
        assert mapper.normalise_msisdn("+237 677 123 456") == "237677123456"
        assert mapper.normalise_msisdn("00237677123456") == "237677123456"

    def test_corps_encaissement(self):
        corps = mapper.build_collect_body(
            amount_xaf=50000, msisdn="677123456",
            external_reference="BLV-PAY-1-A01", description="Test",
        )
        assert corps["amount"] == "50000"        # chaine d'entier, jamais decimal
        assert corps["from"] == "237677123456"
        assert corps["external_reference"] == "BLV-PAY-1-A01"

    def test_montant_decimal_refuse_a_la_construction(self):
        with pytest.raises(ValueError):
            mapper.build_collect_body(
                amount_xaf=100.5, msisdn="677123456", external_reference="x",
            )

    def test_transaction_complete(self):
        analysee = mapper.parse_transaction(_transaction(REF_OK, "SUCCESSFUL"))
        assert analysee["provider_reference"] == REF_OK
        assert analysee["status"] == ProviderStatus.SUCCESSFUL
        assert analysee["amount_xaf"] == 50000
        assert analysee["operator"] == "MTN"
        assert analysee["endpoint"] == "collect"
        assert analysee["error_message"] == ""     # "None" nettoye


class TestErrors:

    def test_codes_documentes(self):
        assert describe("ER101").retryable_by_user is True
        assert describe("ER102").retryable_by_user is True
        assert describe("ER301").retryable_by_user is True
        # ER201 ne devrait jamais survenir : on travaille en entiers
        assert describe("ER201").alerts_ops is True

    def test_code_inconnu_alerte(self):
        spec = describe("ER999")
        assert spec.code == "UNKNOWN"
        assert spec.alerts_ops is True

    def test_extraction_depuis_le_message(self):
        from apps.payments.infrastructure.providers.campay.errors import extract_error_code
        assert extract_error_code({"message": "ER301 Insufficient balance"}) == "ER301"
        assert extract_error_code({"error_code": "ER101"}) == "ER101"
        assert extract_error_code({"message": "rien de connu"}) == ""


# ═══════════════════════════════════════════════════════════════════════════
# CLIENT HTTP
# ═══════════════════════════════════════════════════════════════════════════

class TestClient:

    def test_encaissement_accepte(self, prestataire, faux_serveur):
        resultat = prestataire.collect(CollectRequest(
            external_reference="BLV-PAY-1-A01", amount_xaf=50000,
            msisdn="237677123456", operator="MTN",
        ))
        assert resultat.accepted is True
        assert resultat.provider_reference == REF_OK
        assert resultat.status == ProviderStatus.PENDING

    def test_solde_insuffisant_traduit(self, prestataire, faux_serveur):
        _, faux = faux_serveur
        faux.scenarios["collect"] = "insufficient"
        resultat = prestataire.collect(CollectRequest(
            external_reference="x", amount_xaf=50000,
            msisdn="237677123456", operator="MTN",
        ))
        assert resultat.accepted is False
        assert resultat.error_code == "ER301"

    def test_reponse_sans_reference_est_inconnue(self, prestataire, faux_serveur):
        """
        Une reponse 2xx sans reference : on ne sait pas si la demande est
        partie. Traite comme INCONNU, jamais comme un echec.
        """
        _, faux = faux_serveur
        faux.scenarios["collect"] = "no_reference"
        with pytest.raises(ProviderError, match="sans reference"):
            prestataire.collect(CollectRequest(
                external_reference="x", amount_xaf=50000,
                msisdn="237677123456", operator="MTN",
            ))

    def test_encaissement_jamais_rejoue(self, prestataire, faux_serveur):
        """
        Un encaissement ne doit pas etre retente automatiquement : cela
        multiplierait les invites sur le telephone de l'acheteur.
        """
        _, faux = faux_serveur
        faux.scenarios["collect"] = "server_error"
        with pytest.raises(ProviderError):
            prestataire.collect(CollectRequest(
                external_reference="x", amount_xaf=50000,
                msisdn="237677123456", operator="MTN",
            ))
        appels = [a for a in faux.appels if a[1].startswith("/api/collect/")]
        assert len(appels) == 1

    def test_consultation_est_rejouee(self, prestataire, faux_serveur):
        """La consultation est idempotente : elle PEUT etre retentee."""
        etat = prestataire.get_transaction(REF_OK)
        assert etat.status == ProviderStatus.SUCCESSFUL
        assert etat.amount_xaf == 50000

    def test_transaction_inconnue(self, prestataire, faux_serveur):
        etat = prestataire.get_transaction(REF_INCONNUE)
        assert etat.status == ProviderStatus.UNKNOWN
        assert etat.raw_status == "NOT_FOUND"

    def test_versement_jamais_rejoue(self, prestataire, faux_serveur):
        """
        LE point le plus critique : retenter un versement dont l'issue est
        inconnue peut doubler un versement reel.
        """
        resultat = prestataire.withdraw(WithdrawRequest(
            external_reference=mapper.new_withdraw_reference(),  # UUID4 exige
            amount_xaf=38250, msisdn="237677123456", operator="MTN",
        ))
        assert resultat.accepted is True
        appels = [a for a in faux_serveur[1].appels if a[1].startswith("/api/withdraw/")]
        assert len(appels) == 1

    def test_solde_marchand_insuffisant_sur_versement(self, prestataire, faux_serveur):
        _, faux = faux_serveur
        faux.scenarios["withdraw"] = "insufficient"
        resultat = prestataire.withdraw(WithdrawRequest(
            external_reference=mapper.new_withdraw_reference(),
            amount_xaf=999999, msisdn="237677123456", operator="MTN",
        ))
        assert resultat.accepted is False
        assert resultat.error_code == "ER301"

    def test_coupe_circuit(self, faux_serveur):
        url, faux = faux_serveur
        faux.scenarios["collect"] = "server_error"
        breaker = CircuitBreaker("test-breaker", threshold=1, cooldown_s=30)
        breaker.reset()
        client = CampayClient(
            base_url=url, token="t", max_attempts=1,
            backoff_seconds=(0,), breaker=breaker,
        )
        presta = CampayProvider(config=None, client=client)

        with pytest.raises(ProviderError):
            presta.collect(CollectRequest(
                external_reference="x", amount_xaf=1000,
                msisdn="237677123456", operator="MTN",
            ))
        assert breaker.is_open() is True

        from apps.payments.infrastructure.providers.base import ProviderUnavailable
        with pytest.raises(ProviderUnavailable, match="Coupe-circuit"):
            presta.get_transaction(REF_OK)
        breaker.reset()

    def test_jeton_absent(self, faux_serveur):
        from apps.payments.infrastructure.providers.base import ProviderUnavailable
        url, _ = faux_serveur
        client = CampayClient(base_url=url, token="")
        presta = CampayProvider(config=None, client=client)
        with pytest.raises(ProviderUnavailable, match="Jeton CamPay absent"):
            presta.get_transaction(REF_OK)

    def test_expurgation_des_secrets(self):
        from apps.payments.infrastructure.providers.campay.client import redact
        expurge = redact({"amount": "500", "token": "SECRET", "password": "x"})
        assert expurge["amount"] == "500"
        assert expurge["token"] == "***"
        assert expurge["password"] == "***"

    def test_solde_sans_ventilation_par_operateur(self, prestataire, faux_serveur):
        """Cas par defaut : mode degrade du plan comptable."""
        solde = prestataire.balance()
        assert solde.total_xaf == 125000
        assert solde.is_per_operator_authoritative is False

    def test_solde_avec_ventilation(self, prestataire, faux_serveur):
        """Si CamPay expose la ventilation, le mode nominal s'applique."""
        _, faux = faux_serveur
        faux.scenarios["balance"] = {"mtn_balance": "80000", "orange_balance": "45000"}
        solde = prestataire.balance()
        assert solde.is_per_operator_authoritative is True
        assert solde.per_operator == {"MTN": 80000, "ORANGE": 45000}
        assert solde.total_xaf == 125000


# ═══════════════════════════════════════════════════════════════════════════
# SIGNATURE — et sa limite
# ═══════════════════════════════════════════════════════════════════════════

class TestSignature:

    def test_sans_cle_configuree_non_verifiable(self):
        with override_settings(CAMPAY_WEBHOOK_KEY=""):
            controle = verify_signature("a.b.c")
            assert controle.valid is None
            assert controle.is_rejected is False   # non verifiable != invalide

    def test_signature_absente_non_verifiable(self):
        controle = verify_signature("")
        assert controle.valid is None

    def test_jwt_illisible_rejete(self):
        with override_settings(CAMPAY_WEBHOOK_KEY="cle-test"):
            controle = verify_signature("pas-un-jwt")
            assert controle.valid is False
            assert controle.is_rejected is True

    def test_signature_valide_acceptee(self):
        import jwt as pyjwt
        import time
        jeton = pyjwt.encode(
            {"iat": int(time.time()), "source": "CamPay"},
            "cle-test", algorithm="HS256",
        )
        with override_settings(CAMPAY_WEBHOOK_KEY="cle-test"):
            controle = verify_signature(jeton)
            assert controle.valid is True

    def test_mauvaise_cle_rejetee(self):
        import jwt as pyjwt
        import time
        jeton = pyjwt.encode(
            {"iat": int(time.time()), "source": "CamPay"},
            "autre-cle", algorithm="HS256",
        )
        with override_settings(CAMPAY_WEBHOOK_KEY="cle-test"):
            assert verify_signature(jeton).valid is False

    def test_signature_trop_ancienne_rejetee(self):
        import jwt as pyjwt
        import time
        jeton = pyjwt.encode(
            {"iat": int(time.time()) - 7200, "source": "CamPay"},
            "cle-test", algorithm="HS256",
        )
        with override_settings(CAMPAY_WEBHOOK_KEY="cle-test"):
            controle = verify_signature(jeton)
            assert controle.valid is False
            assert "ancienne" in controle.reason

    def test_la_signature_ne_lie_pas_le_contenu(self):
        """
        CONSTAT DE SECURITE FONDAMENTAL.

        Une signature valide reste valide sur N'IMPORTE QUEL corps : elle ne
        contient aucune empreinte du contenu. Elle est donc rejouable sur un
        message forge.

        C'est la raison d'etre du principe P6 : la re-interrogation est le
        SEUL mecanisme d'authentification reel.
        """
        import jwt as pyjwt
        import time
        jeton = pyjwt.encode(
            {"iat": int(time.time()), "source": "CamPay"},
            "cle-test", algorithm="HS256",
        )
        with override_settings(CAMPAY_WEBHOOK_KEY="cle-test"):
            # La MEME signature valide un montant de 100 comme de 10 000 000
            assert verify_signature(jeton).valid is True
        # Rien dans le jeton ne mentionne un montant ni une reference
        from apps.payments.webhooks.signature import decode_unverified
        _, charge = decode_unverified(jeton)
        assert "amount" not in charge
        assert "reference" not in charge


# ═══════════════════════════════════════════════════════════════════════════
# RECEPTEUR DE WEBHOOKS
# ═══════════════════════════════════════════════════════════════════════════

pytestmark_db = pytest.mark.django_db


@pytest.fixture
def plan_comptable(db):
    for entree in coa.CHART:
        LedgerAccount.objects.get_or_create(code=entree["code"], defaults=entree)


@pytest.fixture
def campay_branche(monkeypatch, prestataire):
    """
    Branche le recepteur de webhooks sur le faux serveur.

    Le recepteur construit son propre prestataire via le registre : sans
    cette substitution, il pointerait vers le vrai domaine CamPay sans jeton.
    """
    from apps.payments.infrastructure.providers import registry

    monkeypatch.setattr(
        registry, "get_provider_for", lambda code: prestataire,
    )
    monkeypatch.setattr(
        "apps.payments.webhooks.receiver.get_provider_for",
        lambda code: prestataire,
    )
    return prestataire


@pytest.fixture
def configuration(db, faux_serveur):
    url, _ = faux_serveur
    ProviderConfig.objects.create(
        config_key="provider-campay", provider_code="CAMPAY",
        mode=ProviderConfig.Mode.SANDBOX, is_enabled=True, priority=100,
        supported_operators=["MTN", "ORANGE"],
        min_amount_xaf=100, max_amount_xaf=1_000_000,
    )
    FeeRule.objects.create(
        config_key="fee-psp-collect", name="Frais PSP",
        scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
        value=Decimal("2"), bearer=FeeRule.Bearer.PLATFORM, priority=10,
    )
    DistributionRule.objects.create(
        config_key="dist-goods", name="Marchandise",
        component=DistributionRule.Component.GOODS,
        payee_type=DistributionRule.PayeeType.VENDOR,
        basis=DistributionRule.Basis.REMAINDER, priority=10,
    )
    EscrowPolicy.objects.create(config_key="escrow-default", name="Defaut")


def _requete_webhook(reference, statut="SUCCESSFUL", methode="GET", ip="127.0.0.1"):
    champs = {
        "reference": reference, "status": statut, "amount": "50000",
        "currency": "XAF", "operator": "MTN", "code": "D260612W0011SN",
        "operator_reference": "", "endpoint": "collect", "signature": "",
        "external_reference": "None", "external_user": "None", "reason": "None",
    }
    fabrique = RequestFactory()
    if methode == "GET":
        return fabrique.get("/api/payments/webhooks/campay/", data=champs,
                            REMOTE_ADDR=ip)
    return fabrique.post("/api/payments/webhooks/campay/", data=champs,
                         content_type="application/json", REMOTE_ADDR=ip)


@pytest.mark.django_db
class TestWebhookReceiver:

    def test_message_journalise_avant_tout(self, configuration):
        handle(_requete_webhook(REF_OK), provider_code="CAMPAY")
        evenement = WebhookEvent.objects.first()
        assert evenement is not None
        assert evenement.raw_query
        assert evenement.body_sha256
        assert evenement.source_ip == "127.0.0.1"

    def test_webhook_get_analyse(self, configuration):
        """CamPay documente le callback en GET."""
        handle(_requete_webhook(REF_OK), provider_code="CAMPAY")
        evenement = WebhookEvent.objects.first()
        assert evenement.provider_reference == REF_OK
        assert evenement.reported_status == "SUCCESSFUL"
        assert evenement.endpoint == "collect"

    def test_webhook_post_analyse_aussi(self, configuration):
        """Accepte POST au cas ou la livraison changerait."""
        handle(_requete_webhook(REF_OK, methode="POST"), provider_code="CAMPAY")
        evenement = WebhookEvent.objects.first()
        assert evenement.provider_reference == REF_OK

    def test_rejeu_ignore(self, configuration):
        requete = _requete_webhook(REF_OK)
        handle(requete, provider_code="CAMPAY")
        second = handle(_requete_webhook(REF_OK), provider_code="CAMPAY")
        assert second.status == WebhookEvent.Status.IGNORED
        assert "deja recu" in second.processing_note
        assert WebhookReplayGuard.objects.count() == 1

    def test_message_vide_rejete(self, configuration):
        requete = RequestFactory().get("/api/payments/webhooks/campay/")
        evenement = handle(requete, provider_code="CAMPAY")
        assert evenement.status == WebhookEvent.Status.REJECTED

    def test_sans_reference_rejete(self, configuration):
        requete = RequestFactory().get(
            "/api/payments/webhooks/campay/", data={"status": "SUCCESSFUL"},
        )
        evenement = handle(requete, provider_code="CAMPAY")
        assert evenement.status == WebhookEvent.Status.REJECTED

    def test_allowlist_ip(self, configuration):
        ProviderConfig.objects.filter(config_key="provider-campay").update(
            webhook_ip_allowlist=["41.202.0.0/16"],
        )
        refuse = handle(_requete_webhook(REF_OK, ip="203.0.113.5"),
                        provider_code="CAMPAY")
        assert refuse.status == WebhookEvent.Status.REJECTED
        assert "hors de la liste" in refuse.processing_error

        accepte = handle(_requete_webhook(REF_PENDING, ip="41.202.10.5"),
                         provider_code="CAMPAY")
        assert accepte.status != WebhookEvent.Status.REJECTED

    def test_evenement_hors_perimetre_ignore(self, configuration, campay_branche):
        """Une transaction inconnue de BelivaY est ignoree proprement."""
        evenement = handle(_requete_webhook(REF_OK), provider_code="CAMPAY")
        assert evenement.status == WebhookEvent.Status.IGNORED
        assert "Aucune tentative BelivaY" in evenement.processing_note

    def test_journal_non_supprimable(self, configuration):
        handle(_requete_webhook(REF_OK), provider_code="CAMPAY")
        with pytest.raises(ValidationError):
            WebhookEvent.objects.first().delete()

    def test_le_statut_annonce_ne_decide_de_rien(
        self, configuration, plan_comptable, campay_branche,
    ):
        """
        LE test central du lot.

        Le message ANNONCE SUCCESSFUL sur une reference que le prestataire
        dit PENDING. Aucune confirmation ne doit avoir lieu.
        """
        evenement = handle(
            _requete_webhook(REF_PENDING, statut="SUCCESSFUL"),
            provider_code="CAMPAY",
        )
        assert evenement.reported_status == "SUCCESSFUL"
        assert evenement.verified_status == ProviderStatus.PENDING.value
        assert LedgerTransaction.objects.count() == 0

    def test_un_message_mensonger_ne_cree_aucune_ecriture(
        self, configuration, plan_comptable, campay_branche,
    ):
        """
        Scenario d'attaque : un tiers forge un webhook annoncant un paiement
        reussi sur une transaction qui a en realite echoue.
        """
        evenement = handle(
            _requete_webhook(REF_FAILED, statut="SUCCESSFUL"),
            provider_code="CAMPAY",
        )
        assert evenement.reported_status == "SUCCESSFUL"
        assert evenement.verified_status == ProviderStatus.FAILED.value
        assert LedgerTransaction.objects.count() == 0


# ═══════════════════════════════════════════════════════════════════════════
# CHARGES UTILES REELLES — copiees de la documentation CamPay
# ═══════════════════════════════════════════════════════════════════════════

#: Webhook GET, exactement tel que documente.
WEBHOOK_REEL = {
    "status": "SUCCESSFUL", "reference": "xyz", "amount": "100",
    "currency": "XAF", "operator": "MTN", "code": "ABC1234567890",
    "operator_reference": "1234567890", "signature": "asdfasdfasdfasdfasdf",
    "endpoint": "collect", "external_reference": "asdfasdfasdfadsasdf",
    "external_user": "xyz", "extra_first_name": "xyz", "extra_last_name": "xyz",
    "extra_email": "test@zyz.com", "phone_number": "237123456789",
    "redirect_url": "https://example.com/callback",
    "failure_redirect_url": "https://example.com/callback",
    "description": "test", "reason": "",
}

#: Reponse de /transaction/{ref}/ — amount ENTIER, nulls JSON reels.
STATUT_REEL = {
    "reference": "85ac913b-bf64-49c5-979e-d175f058a6af",
    "external_reference": "", "status": "PENDING", "amount": 2,
    "currency": "XAF", "operator": "MTN", "code": "D201102W0002LK",
    "operator_reference": None, "description": "Test", "external_user": "",
    "reason": None, "phone_number": "2376xxxxxxxx", "endpoint": "collect",
}

#: Reponse de /balance/ — repond a LA question du Jalon A.
SOLDE_REEL = {
    "total_balance": 125000, "mtn_balance": 80000,
    "orange_balance": 45000, "currency": "XAF",
}


class TestChargesUtilesReelles:
    """
    Ces tests utilisent les charges utiles EXACTES de la documentation CamPay,
    pas des exemples reconstruits. Ils protegent contre une derive silencieuse
    de l'analyseur.
    """

    def test_webhook_documente(self):
        analyse = mapper.parse_transaction(WEBHOOK_REEL)
        assert analyse["provider_reference"] == "xyz"
        assert analyse["status"] == ProviderStatus.SUCCESSFUL
        assert analyse["amount_xaf"] == 100
        assert analyse["operator"] == "MTN"
        assert analyse["endpoint"] == "collect"
        assert analyse["external_reference"] == "asdfasdfasdfadsasdf"
        assert analyse["error_message"] == ""

    def test_statut_avec_montant_entier_et_nulls(self):
        """
        La reponse de /transaction/ renvoie amount en ENTIER (2) et des null
        JSON reels, la ou /mass_payout_status/ renvoie des CHAINES ("0.00",
        "None"). Les deux formes doivent passer.
        """
        analyse = mapper.parse_transaction(STATUT_REEL)
        assert analyse["amount_xaf"] == 2
        assert analyse["status"] == ProviderStatus.PENDING
        assert analyse["error_message"] == ""      # null JSON nettoye
        assert analyse["external_reference"] == ""

    def test_solde_expose_par_operateur(self):
        """
        REPONSE DU JALON A : CamPay expose bien mtn_balance et orange_balance.

        Consequence : le MODE NOMINAL du plan comptable s'applique. Les
        comptes 1011 et 1012 sont reconciliables, et l'invariant I5
        (liquidite par porteur) devient BLOQUANT et non plus informatif.
        """
        solde = mapper.parse_balance(SOLDE_REEL)
        assert solde["per_operator_available"] is True
        assert solde["per_operator"] == {"MTN": 80000, "ORANGE": 45000}
        assert solde["total_xaf"] == 125000

    def test_solde_a_zero_reste_exploitable(self):
        solde = mapper.parse_balance(
            {"total_balance": 0, "mtn_balance": 0, "orange_balance": 0,
             "currency": "XAF"}
        )
        assert solde["per_operator_available"] is True
        assert solde["total_xaf"] == 0


class TestWithdrawReference:
    """
    CamPay impose un UUID4 sur external_reference pour /withdraw/.
    Nos references lisibles sont refusees sur cet endpoint.
    """

    def test_reference_lisible_refusee(self):
        with pytest.raises(ValueError, match="UUID4"):
            mapper.build_withdraw_body(
                amount_xaf=38250, msisdn="237677123456",
                external_reference="BLV-OUT-2026-000391",
            )

    def test_uuid4_accepte(self):
        reference = mapper.new_withdraw_reference()
        corps = mapper.build_withdraw_body(
            amount_xaf=38250, msisdn="237677123456",
            external_reference=reference,
        )
        assert corps["external_reference"] == reference
        assert corps["amount"] == "38250"
        assert corps["to"] == "237677123456"

    def test_reference_vide_acceptee(self):
        """Une reference vide fait naitre une nouvelle transaction cote CamPay."""
        corps = mapper.build_withdraw_body(
            amount_xaf=1000, msisdn="237677123456", external_reference="",
        )
        assert corps["external_reference"] == ""

    def test_uuid1_refuse(self):
        import uuid as _uuid
        with pytest.raises(ValueError, match="UUID4"):
            mapper.build_withdraw_body(
                amount_xaf=1000, msisdn="237677123456",
                external_reference=str(_uuid.uuid1()),
            )

    def test_encaissement_accepte_une_reference_lisible(self):
        """
        La contrainte UUID4 ne vaut QUE pour /withdraw/. L'encaissement
        accepte nos references lisibles, ce qui facilite le rapprochement.
        """
        corps = mapper.build_collect_body(
            amount_xaf=50000, msisdn="237677123456",
            external_reference="BLV-PAY-2026-0000001-A01",
        )
        assert corps["external_reference"] == "BLV-PAY-2026-0000001-A01"


class TestWebhookDeclencheurs:

    def test_le_webhook_ne_couvre_pas_les_transactions_bloquees(self):
        """
        CamPay ne notifie QUE sur SUCCESSFUL ou FAILED.

        Une transaction bloquee en PENDING — acheteur qui n'a jamais compose
        son code — ne genere AUCUN webhook. Le polling n'est donc pas un
        simple filet de securite : c'est le SEUL moyen de detecter ces cas.
        """
        assert "SUCCESSFUL" in mapper.WEBHOOK_TRIGGER_STATUSES
        assert "FAILED" in mapper.WEBHOOK_TRIGGER_STATUSES
        assert "PENDING" not in mapper.WEBHOOK_TRIGGER_STATUSES


class TestSoldeReelDuBacASable:
    """
    Reponse REELLE de /balance/ sur demo.campay.net, obtenue par un appel
    effectif. Elle contient deux champs absents de la documentation.
    """

    REPONSE_REELLE = {
        "total_balance": 0.0, "mtn_balance": 0, "orange_balance": 0,
        "currency": "XAF", "utility_balance": 0.0,
        "utility_commission_balance": 0.0,
    }

    def test_soldes_utility_exclus_du_solde_marchand(self):
        """
        utility_balance concerne le transfert de credit telephonique.
        L'inclure dans le solde marchand fausserait le controle de solvabilite.
        """
        solde = mapper.parse_balance({
            "total_balance": 125000, "mtn_balance": 80000,
            "orange_balance": 45000, "currency": "XAF",
            "utility_balance": 9999, "utility_commission_balance": 500,
        })
        assert solde["total_xaf"] == 125000
        assert solde["per_operator"] == {"MTN": 80000, "ORANGE": 45000}
        assert 9999 not in solde["per_operator"].values()

    def test_reponse_reelle_du_bac_a_sable(self):
        solde = mapper.parse_balance(self.REPONSE_REELLE)
        assert solde["per_operator_available"] is True
        assert solde["total_xaf"] == 0

    def test_solde_flottant_tolere(self):
        """
        La reponse reelle renvoie total_balance en FLOTTANT (0.0). Un montant
        de transaction avec decimales doit lever ; un SOLDE, non.
        """
        solde = mapper.parse_balance(
            {"total_balance": 125000.0, "mtn_balance": 80000.0,
             "orange_balance": 45000.0}
        )
        assert solde["total_xaf"] == 125000
        assert solde["per_operator"]["MTN"] == 80000

    def test_solde_arrondi_a_l_inferieur(self):
        """
        Mieux vaut sous-estimer ce qu'on detient : un solde surestime
        autoriserait un versement que le prestataire refuserait (ER301).
        """
        assert mapper.to_balance_xaf("99.99") == 99
        assert mapper.to_balance_xaf("100.01") == 100
        assert mapper.to_balance_xaf(4.95) == 4

    def test_montant_de_transaction_reste_strict(self):
        """La tolerance ne vaut QUE pour les soldes."""
        with pytest.raises(ValueError, match="decimales"):
            mapper.to_amount_xaf("100.50")