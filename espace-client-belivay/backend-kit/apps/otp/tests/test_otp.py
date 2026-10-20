# backend/apps/otp/tests/test_otp.py
import re

import pytest
from django.core import mail

from apps.client_accounts import services as comptes
from apps.client_core.tests.outils import client_connecte, creer_client
from apps.otp.models import CodeOtp, JetonMdp
from apps.otp.prestataires import SmsConsole

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _vider():
    SmsConsole.ENVOYES.clear()
    yield
    SmsConsole.ENVOYES.clear()


def dernier_code() -> str:
    return re.search(r"\d{6}", SmsConsole.ENVOYES[-1]["texte"]).group(0)


def envoyer(c, **corps):
    return c.post("/api/auth/otp/send", corps, format="json")


def verifier(c, **corps):
    return c.post("/api/auth/otp/verify", corps, format="json")


# ── Envoi ───────────────────────────────────────────────────────────────────────────────────────────────


def test_envoi_premier_numero_masque_et_regles_du_registre():
    c = client_connecte(creer_client())
    r = envoyer(c, purpose="numero-nouveau", destination="677123441")
    assert r.status_code == 202
    assert r.json() == {"destination": "6 77 ·· ·· 41 · MTN", "valideMinutes": 10, "renvoiSecondes": 60}
    assert SmsConsole.ENVOYES[-1]["numero"] == "677123441"


def test_envoi_whatsapp_le_dit_dans_la_destination():
    c = client_connecte(creer_client())
    r = envoyer(c, purpose="numero-nouveau", destination="699123441", canal="whatsapp")
    assert r.json()["destination"].endswith("· Orange · WhatsApp")
    assert SmsConsole.ENVOYES[-1]["canal"] == "whatsapp"


def test_renvoi_trop_tot_429():
    c = client_connecte(creer_client())
    envoyer(c, purpose="numero-nouveau", destination="677123441")
    r = envoyer(c, purpose="numero-nouveau", destination="677123441")
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "trop_tot"
    # Le délai part aussi dans l'en-tête Retry-After (le site affiche « réessaie dans X s »).
    assert 0 < int(r["Retry-After"]) <= r.json()["error"]["data"]["renvoiSecondes"] + 1


def test_sans_compte_seul_le_code_diaspora_part(api_client):
    r = envoyer(api_client, purpose="profil")
    assert r.status_code == 401
    r = envoyer(api_client, purpose="diaspora", canal="email", destination="awa@exemple.fr")
    assert r.status_code == 202
    assert r.json()["destination"] == "a•••@exemple.fr"
    assert len(mail.outbox) == 1


def test_objet_inconnu_ou_d_une_autre_route_400():
    c = client_connecte(creer_client())
    assert envoyer(c, purpose="n-importe").status_code == 400
    assert envoyer(c, purpose="cadeau", destination="a@b.cm").status_code == 400


def test_code_du_profil_part_au_numero_verifie():
    u = creer_client()
    comptes.enregistrer_numero(u, "677123441")
    r = envoyer(client_connecte(u), purpose="profil")
    assert r.status_code == 202 and SmsConsole.ENVOYES[-1]["numero"] == "677123441"


def test_numero_ancien_sans_numero_verifie_422():
    r = envoyer(client_connecte(creer_client()), purpose="change_old")
    assert r.status_code == 422 and r.json()["error"]["code"] == "numero_non_verifie"


def test_nouveau_numero_deja_pris_409_et_meme_422():
    autre = creer_client()
    comptes.enregistrer_numero(autre, "699000000")
    u = creer_client()
    comptes.enregistrer_numero(u, "677123441")
    c = client_connecte(u)
    assert envoyer(c, purpose="numero-nouveau", destination="699000000").json()["error"]["code"] == "utilise"
    assert envoyer(c, purpose="numero-nouveau", destination="677123441").status_code == 422


def test_second_code_du_numero_exige_le_code_a_l_ancien():
    u = creer_client()
    comptes.enregistrer_numero(u, "677123441")
    c = client_connecte(u)
    r = envoyer(c, purpose="numero-nouveau", destination="655998808")
    assert r.status_code == 409 and r.json()["error"]["code"] == "state_changed"
    envoyer(c, purpose="change_old")
    assert verifier(c, purpose="change_old", code=dernier_code()).json()["ok"] is True
    assert envoyer(c, purpose="numero-nouveau", destination="655998808").status_code == 202


def test_email_adresse_refuse_un_email_pris():
    creer_client(email="deja.pris@exemple.cm")
    u = creer_client()
    comptes.enregistrer_numero(u, "677123441")
    r = envoyer(client_connecte(u), purpose="email-adresse", destination="deja.pris@exemple.cm")
    assert r.status_code == 409 and r.json()["error"]["code"] == "pris"


# ── Vérification ────────────────────────────────────────────────────────────────────────────────────────


def test_premier_numero_verifie_rend_le_client():
    u = creer_client(prenom="Carine")
    c = client_connecte(u)
    envoyer(c, purpose="numero-nouveau", destination="677123441")
    r = verifier(c, numero="677123441", code=dernier_code())
    assert r.status_code == 200
    corps = r.json()
    assert corps["ok"] is True and corps["client"]["numeroMasque"] == "6 77 ·· ·· 41" and corps["client"]["operateur"] == "MTN"
    assert comptes.numero_verifie(u) == "677123441"


def test_premier_numero_code_faux_essais_restants():
    c = client_connecte(creer_client())
    envoyer(c, purpose="numero-nouveau", destination="677123441")
    r = verifier(c, numero="677123441", code="000000" if dernier_code() != "000000" else "111111")
    assert r.json() == {"ok": False, "essaisRestants": 4}


def test_premier_numero_deja_verifie_ailleurs_409_utilise():
    comptes.enregistrer_numero(creer_client(), "699000000")
    r = verifier(client_connecte(creer_client()), numero="699000000", code="123456")
    assert r.status_code == 409 and r.json()["error"]["code"] == "utilise"


def test_code_email_sms():
    u = creer_client()
    comptes.enregistrer_numero(u, "677123441")
    c = client_connecte(u)
    envoyer(c, purpose="email_sms")
    assert verifier(c, purpose="email_sms", code=dernier_code()).json()["ok"] is True
    assert CodeOtp.objects.get(objet="email-sms").utilise_le is not None


def test_verifier_exige_un_compte(api_client):
    assert verifier(api_client, numero="677123441", code="123456").status_code == 401


# ── Mot de passe oublié (CAP-16, MDP-LIEN, MDP-LONG) ────────────────────────────────────────────────────


def test_oubli_toujours_202_meme_sans_compte(api_client):
    r = api_client.post("/api/auth/password/forgot", {"email": "personne@exemple.cm"}, format="json")
    assert r.status_code == 202 and r.json() == {"destination": "p••••••@exemple.cm", "valideMinutes": 30}
    assert mail.outbox == []


def _jeton_du_mail() -> str:
    return re.search(r"jeton=([\w-]+)", mail.outbox[-1].body).group(1)


def test_oubli_puis_nouveau_mot_de_passe_ferme_les_sessions(api_client):
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
    from rest_framework_simplejwt.tokens import RefreshToken

    u = creer_client(email="carine@exemple.cm")
    RefreshToken.for_user(u)  # une session ouverte ailleurs
    assert api_client.post("/api/auth/password/forgot", {"email": "Carine@exemple.cm"}, format="json").status_code == 202
    assert "https://belivay.com/" in mail.outbox[-1].body
    jeton = _jeton_du_mail()
    r = api_client.post("/api/auth/password/reset", {"jeton": jeton, "mot_de_passe": "nouveau2026"}, format="json")
    assert r.status_code == 200 and r.json()["ok"] is True and r.json()["email"].endswith("@exemple.cm")
    u.refresh_from_db()
    assert u.check_password("nouveau2026")
    assert BlacklistedToken.objects.filter(token__user=u).exists()
    # usage unique
    r = api_client.post("/api/auth/password/reset", {"jeton": jeton, "mot_de_passe": "encore2026"}, format="json")
    assert r.status_code == 410 and r.json()["error"]["code"] == "expire"
    r = api_client.post("/api/auth/password/reset", {"jeton": "inconnu-123456", "mot_de_passe": "encore2026"}, format="json")
    assert r.status_code == 404 and r.json()["error"]["code"] == "invalide"


def test_nouveau_mot_de_passe_regle_mdp_long(api_client):
    u = creer_client(email="carine@exemple.cm")
    api_client.post("/api/auth/password/forgot", {"email": u.email}, format="json")
    jeton = _jeton_du_mail()
    for faible in ("court1", "sanschiffre"):
        r = api_client.post("/api/auth/password/reset", {"jeton": jeton, "mot_de_passe": faible}, format="json")
        assert r.status_code == 422 and r.json()["error"]["code"] == "regle"
    assert JetonMdp.objects.get().utilise_le is None  # le lien reste valable après un refus de règle


def test_un_nouveau_lien_annule_le_precedent(api_client):
    u = creer_client(email="carine@exemple.cm")
    api_client.post("/api/auth/password/forgot", {"email": u.email}, format="json")
    premier = _jeton_du_mail()
    api_client.post("/api/auth/password/forgot", {"email": u.email}, format="json")
    r = api_client.post("/api/auth/password/reset", {"jeton": premier, "mot_de_passe": "nouveau2026"}, format="json")
    assert r.status_code == 410
