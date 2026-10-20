# backend/apps/notifications_client/tests/test_notifications.py
import hashlib
from datetime import datetime

import pytest
from django.utils import timezone

from apps.client_accounts import services as comptes
from apps.client_core.models import Interrupteur
from apps.client_core.temps import YAOUNDE
from apps.client_core.tests.outils import client_connecte, creer_client
from apps.notifications_client import regles, services
from apps.notifications_client.models import Appareil, JournalNotification
from apps.notifications_client.prestataires import PushConsole, TexteInterdit
from apps.otp.prestataires import SmsConsole

pytestmark = pytest.mark.django_db

ABONNEMENT = {"endpoint": "https://push.exemple/abc", "expirationTime": None, "keys": {"p256dh": "cle", "auth": "secret"}}


@pytest.fixture(autouse=True)
def _vider():
    PushConsole.ENVOYES.clear()
    SmsConsole.ENVOYES.clear()
    yield
    PushConsole.ENVOYES.clear()
    SmsConsole.ENVOYES.clear()


def a_midi(monkeypatch, heure=12.0):
    monkeypatch.setattr(services, "_heure", lambda moment=None: heure)


# ── Règles pures ────────────────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "heure,attendu", [(21.0, True), (23.5, True), (3.0, True), (6.99, True), (7.0, False), (12.0, False), (20.99, False)]
)
def test_heures_calmes_qui_passent_minuit(heure, attendu):
    assert regles.dans_heures_calmes(heure, True, 21, 7) is attendu  # exemple du site : de 21 h à 7 h


def test_heures_calmes_inactives_ou_vides():
    assert not regles.dans_heures_calmes(23, False, 21, 7)
    assert not regles.dans_heures_calmes(23, True, 8, 8)
    assert regles.dans_heures_calmes(13, True, 12, 14)


def test_push_promo_3_par_semaine_de_9_h_a_20_h():
    assert regles.promo_permise(10, 2, [3, 9, 20])
    assert not regles.promo_permise(10, 3, [3, 9, 20])
    assert not regles.promo_permise(8.5, 0, [3, 9, 20])
    assert not regles.promo_permise(20, 0, [3, 9, 20])


# ── Réglages ────────────────────────────────────────────────────────────────────────────────────────────


def test_reglages_par_defaut_et_numero_masque():
    u = creer_client()
    comptes.enregistrer_numero(u, "677123441")
    d = client_connecte(u).get("/api/me/notification-settings").json()
    assert d["numero"] == "6 77 ·· ·· 41" and d["verifie"] is True and d["canal"] == "sms"
    assert d["choix"] == {"messages": True, "suivi": True, "promotions": True}


def test_regler_une_categorie_et_categorie_verrouillee():
    c = client_connecte(creer_client())
    r = c.put("/api/me/notification-settings", {"cle": "promotions", "actif": False}, format="json")
    assert r.json() == {"messages": True, "suivi": True, "promotions": False}
    r = c.put("/api/me/notification-settings", {"cle": "retrait", "actif": False}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "category_locked"
    assert c.put("/api/me/notification-settings", {"cle": "inconnue", "actif": False}, format="json").status_code == 400
    assert c.put("/api/me/notification-settings", {"cle": "suivi", "actif": False, "flash": True}, format="json").status_code == 400


def test_whatsapp_exige_le_consentement():
    u = creer_client()
    c = client_connecte(u)
    r = c.put("/api/me/notification-settings", {"canal": "whatsapp"}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "consentement_requis"
    assert c.post("/api/me/consents", {"canal": "whatsapp"}, format="json").status_code == 204
    assert c.put("/api/me/notification-settings", {"canal": "whatsapp"}, format="json").status_code == 200
    assert services.reglages(u).canal == "whatsapp"


def test_whatsapp_ferme_par_son_interrupteur():
    Interrupteur.objects.create(code="FF-WHATSAPP-CANAL", ouvert=False)
    u = creer_client()
    c = client_connecte(u)
    c.post("/api/me/consents", {"canal": "whatsapp"}, format="json")
    r = c.put("/api/me/notification-settings", {"canal": "whatsapp"}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "canal_indisponible"


def test_heures_calmes_et_alerte_flash():
    u = creer_client()
    c = client_connecte(u)
    assert c.put("/api/me/notification-settings", {"calme": {"actif": True, "debut": 21, "fin": 7}}, format="json").status_code == 200
    assert c.put("/api/me/notification-settings", {"flash": True}, format="json").status_code == 200
    r = services.reglages(u)
    assert (r.calme_actif, r.calme_debut, r.calme_fin, r.flash) == (True, 21, 7, True)
    assert c.get("/api/me/notification-settings").json()["calme"] == {"actif": True, "debut": 21, "fin": 7}


# ── Appareils (CAP-17) ──────────────────────────────────────────────────────────────────────────────────


def test_enregistrer_puis_retirer_un_appareil():
    u = creer_client()
    c = client_connecte(u)
    assert c.post("/api/devices", {"type": "webpush", "abonnement": ABONNEMENT}, format="json").json() == {"ok": True}
    assert c.post("/api/devices", {"type": "webpush", "abonnement": ABONNEMENT}, format="json").json() == {"ok": True}
    assert Appareil.objects.filter(user=u, revoque_le__isnull=True).count() == 1  # même adresse : un seul abonnement
    cle = hashlib.sha256(ABONNEMENT["endpoint"].encode()).hexdigest()
    assert c.delete(f"/api/devices/{cle}").json() == {"ok": True}
    assert c.delete(f"/api/devices/{cle}").json() == {"ok": False}


def test_webpush_sans_cles_400():
    r = client_connecte(creer_client()).post("/api/devices", {"type": "webpush", "abonnement": {"endpoint": "https://x"}}, format="json")
    assert r.status_code == 400


def test_appareil_d_un_autre_client_non_retire():
    u = creer_client()
    a = services.enregistrer_appareil(u, "webpush", ABONNEMENT)
    assert client_connecte(creer_client()).delete(f"/api/devices/{a.pk}").json() == {"ok": False}


def test_suppression_du_compte_revoque_les_appareils():
    u = creer_client()
    services.enregistrer_appareil(u, "webpush", ABONNEMENT)
    comptes.fermer_toutes_sessions(u)
    assert services.appareils_actifs(u) == []


# ── Envoi ───────────────────────────────────────────────────────────────────────────────────────────────


def test_jamais_de_code_dans_une_notification():
    with pytest.raises(TexteInterdit):
        services.envoyer_notification(creer_client(), "retrait", "Ton colis est arrivé", "Code 123456")


def test_push_selon_les_choix(monkeypatch):
    a_midi(monkeypatch)
    u = creer_client()
    services.enregistrer_appareil(u, "webpush", ABONNEMENT)
    assert services.envoyer_notification(u, "suivi", "En route", "Ton colis part")["pousses"] == 1
    r = services.reglages(u)
    r.suivi = False
    r.save()
    assert services.envoyer_notification(u, "suivi", "En route", "Ton colis part")["raison"] == "choix"
    # Retrait : catégorie verrouillée, toujours poussée
    assert services.envoyer_notification(u, "retrait", "Ton colis est arrivé", "Au relais Mvog-Ada")["pousses"] == 1


def test_heures_calmes_sauf_critique(monkeypatch):
    a_midi(monkeypatch, 23.0)
    u = creer_client()
    services.enregistrer_appareil(u, "webpush", ABONNEMENT)
    r = services.reglages(u)
    r.calme_actif, r.calme_debut, r.calme_fin = True, 21, 7
    r.save()
    assert services.envoyer_notification(u, "suivi", "En route", "Ton colis part")["raison"] == "calme"
    assert services.envoyer_notification(u, "incident", "Incident", "Ton colis est retardé", critique=True)["pousses"] == 1


def test_limite_des_promotions(monkeypatch):
    a_midi(monkeypatch, 10.0)
    u = creer_client()
    services.enregistrer_appareil(u, "webpush", ABONNEMENT)
    resultats = [services.envoyer_notification(u, "promotions", "Promo", "−15 % sur la mode")["pousses"] for _ in range(4)]
    assert resultats == [1, 1, 1, 0]
    assert JournalNotification.objects.filter(user=u, raison="limite").count() == 1


def test_repli_sms_pour_une_alerte_critique_sans_appareil(monkeypatch):
    a_midi(monkeypatch)
    u = creer_client()
    comptes.enregistrer_numero(u, "677123441")
    r = services.envoyer_notification(u, "paiement", "Paiement refusé", "Réessaie depuis l'application", critique=True)
    assert r["sms"] == "sms" and SmsConsole.ENVOYES[-1]["numero"] == "677123441"
    r = services.envoyer_notification(u, "suivi", "En route", "Ton colis part")
    assert r["sms"] is None and r["raison"] == "aucun_appareil"


def test_heure_de_yaounde():
    moment = datetime(2026, 10, 5, 21, 30, tzinfo=YAOUNDE)
    assert services._heure(moment) == 21.5
    assert isinstance(services._heure(timezone.now()), float)
