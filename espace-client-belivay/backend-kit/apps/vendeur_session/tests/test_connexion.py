# Session et connexion du vendeur : session (propriétaire, Préparation, sans boutique), connexion par identifiant,
# e-mail ou numéro, mots de passe faux et blocage (CNX-03), second facteur d'un appareil inconnu (CNX-01), connexion
# par numéro et code, mot de passe oublié (VD03-R04), appareil oublié, Face ID, déconnexion.
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.client_core.tests.outils import client_connecte, creer_client
from apps.otp.models import CodeOtp, JetonMdp
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import NotificationVendeur
from apps.vendeur_core.tests.outils import (
    ajouter_preparation,
    commande_client,
    creer_boutique_vendeur,
    creer_offre,
    preparation,
    proprietaire,
)
from apps.vendeur_session import services
from apps.vendeur_session.models import AppareilVendeur, DossierOuverture
from apps.vendeur_session.tests.outils import code

pytestmark = pytest.mark.django_db

NUMERO = "677124217"


def login(api, identifiant, mdp="motdepasse1", appareil="tel-1", **extra):
    return api.post(
        "/api/vendors/auth/login", {"identifiant": identifiant, "motDePasse": mdp, "appareil": appareil, **extra}, format="json"
    ).json()


# ── Session ───────────────────────────────────────────────────────────────────────────────────────────


def test_session_sans_compte():
    s = APIClient().get("/api/vendors/session").json()
    assert s["connecte"] is False and s["membre"] is None and s["boutique"] is None
    assert s["badges"] == {"notifications": 0, "commandes": 0, "messages": 0} and s["argentGele"] is False and s["maintenant"] > 0


def test_session_du_proprietaire_et_de_la_preparation():
    b = creer_boutique_vendeur()
    o = creer_offre(b)
    cmd = commande_client(o)
    NotificationVendeur.objects.create(boutique=b, type="versement", titre="Versement", texte="…", a=timezone.now(), argent=True)
    s = proprietaire(b).get("/api/vendors/session").json()
    assert s["connecte"] and s["membre"]["role"] == "proprietaire" and s["membre"]["initiales"] == "FP"
    assert s["proprietaire"] == {"prenom": "Franck", "nom": "Penga"}
    assert s["boutique"]["trustScore"] == 62.7 and s["boutique"]["palier"] == "Bronze" and s["boutique"]["plan"] == "Free"
    assert s["boutique"]["etat"] == "ouverte" and s["boutique"]["fermeA"] == "23:59"
    assert s["boutique"]["decouverte"]["active"] is True and s["boutique"]["decouverte"]["commandes"] == 1
    assert s["badges"]["commandes"] == 1 and s["badges"]["notifications"] == 2  # « à préparer » + versement
    assert s["argentGele"] is False
    p = preparation(b).get("/api/vendors/session").json()
    assert p["membre"]["role"] == "preparation" and p["badges"]["notifications"] == 1  # argent masqué
    assert p["argentGele"] is False
    # ANONYMAT : rien du client dans la session.
    client = cmd["client"]
    assert fuites(s, valeurs_interdites=(client.first_name, client.email)) == []


def test_argent_gele_par_un_litige(monkeypatch):
    b = creer_boutique_vendeur()
    commande_client(creer_offre(b))
    from apps.vendeur_core import faits as f

    monkeypatch.setattr(f, "faits", lambda c, t=None: type("F", (), {"gel": "litige"})())
    assert proprietaire(b).get("/api/vendors/session").json()["argentGele"] is True
    assert preparation(b).get("/api/vendors/session").json()["argentGele"] is False


def test_messages_non_lus_lus_dans_la_boutique(monkeypatch):
    import sys
    import types

    b = creer_boutique_vendeur()
    mod = types.ModuleType("apps.vendeur_boutique.services")
    mod.messages_non_lus = lambda boutique: 4
    monkeypatch.setitem(sys.modules, "apps.vendeur_boutique.services", mod)
    assert proprietaire(b).get("/api/vendors/session").json()["badges"]["messages"] == 4


def test_compte_client_sans_boutique_ni_dossier_n_est_pas_connecte():
    u = creer_client()
    assert client_connecte(u).get("/api/vendors/session").json()["connecte"] is False
    DossierOuverture.objects.create(ref="VD-2026-0001", user=u, nom="Carine Mode", categorie="Mode Femme", cree_le=timezone.now())
    s = client_connecte(u).get("/api/vendors/session").json()
    assert s["connecte"] is True and s["boutique"] is None and s["membre"] is None


# ── Connexion ─────────────────────────────────────────────────────────────────────────────────────────


def test_connexion_par_identifiant_email_ou_numero_premiere_fois_sans_second_facteur():
    b = creer_boutique_vendeur()
    api = APIClient()
    r = login(api, b.identifiant.lower().lstrip("@"))
    assert r["ok"] is True and r["session"]["connecte"] and set(r["jetons"]) == {"access", "refresh"} and r["seSouvenir"] is True
    assert AppareilVendeur.objects.filter(user=b.proprietaire).count() == 1
    assert login(api, b.proprietaire.email.upper())["ok"] is True
    assert login(api, "+237 6 77 12 42 17", seSouvenir=False)["seSouvenir"] is False
    # Les jetons rendus ouvrent les routes du vendeur.
    a = APIClient()
    a.credentials(HTTP_AUTHORIZATION=f"Bearer {r['jetons']['access']}")
    assert a.get("/api/vendors/session").json()["membre"]["role"] == "proprietaire"


def test_preparation_se_connecte_par_email():
    b = creer_boutique_vendeur()
    m = ajouter_preparation(b)
    r = login(APIClient(), m.user.email)
    assert r["ok"] and r["session"]["membre"]["role"] == "preparation"


def test_mauvais_identifiants_puis_blocage_et_proprietaire_prevenu():
    b = creer_boutique_vendeur()
    api = APIClient()
    for restants in (4, 3, 2, 1):
        assert login(api, b.identifiant, "faux") == {"ok": False, "raison": "identifiants", "essaisRestants": restants}
    r = login(api, b.identifiant, "faux")
    assert r["ok"] is False and r["raison"] == "bloque" and r["jusqua"] > timezone.now().timestamp() * 1000
    n = NotificationVendeur.objects.get(boutique=b, titre="Connexion bloquée 15 min")
    assert n.urgent and not n.argent and "5 mots de passe faux" in n.texte
    # Même le bon mot de passe attend la fin du blocage.
    assert login(api, b.identifiant)["raison"] == "bloque"


def test_identifiant_inconnu_jamais_dit():
    api = APIClient()
    assert login(api, "@Personne") == {"ok": False, "raison": "identifiants", "essaisRestants": 4}
    assert login(api, "personne@exemple.cm")["raison"] == "identifiants"
    assert login(api, "690000000")["raison"] == "identifiants"
    assert login(api, "")["raison"] == "identifiants"
    # Un compte client sans espace vendeur non plus.
    u = creer_client(email="carine@exemple.cm")
    u.set_password("motdepasse1")
    u.save()
    assert login(api, "carine@exemple.cm")["raison"] == "identifiants"


def test_second_facteur_d_un_appareil_inconnu():
    b = creer_boutique_vendeur()
    api = APIClient()
    assert login(api, b.identifiant, appareil="tel-1")["ok"]
    r = login(api, b.identifiant, appareil="ordi-2", HTTP_USER_AGENT="x")
    assert r["ok"] is False and r["raison"] == "deuxieme_facteur"
    d = r["defi"]
    assert d["canal"] == "sms" and d["destination"] == "677 •• •• 17" and d["valideMinutes"] == 10 and "codeDemo" not in d
    assert d["appareil"]["lieu"] == "Yaoundé" and d["renvoiSecondes"] > 0 and d["renvoisRestants"] == 2
    assert api.get("/api/vendors/auth/2fa", {"appareil": "ordi-2"}).json()["id"] == d["id"]
    assert api.get("/api/vendors/auth/2fa", {"appareil": "autre"}).status_code == 404
    assert api.post("/api/vendors/auth/2fa/resend", {"appareil": "ordi-2"}, format="json").json()["raison"] == "trop_tot"
    assert api.post("/api/vendors/auth/2fa/resend", {"appareil": "inconnu"}, format="json").json()["raison"] == "trop_tot"
    faux = api.post(
        "/api/vendors/auth/2fa", {"appareil": "ordi-2", "code": "000000" if code() != "000000" else "111111"}, format="json"
    ).json()
    assert faux == {"ok": False, "raison": "code", "essaisRestants": 4}
    ok = api.post("/api/vendors/auth/2fa", {"appareil": "ordi-2", "code": code(), "challenge_id": d["id"]}, format="json").json()
    assert ok["ok"] and "jetons" in ok and ok["session"]["connecte"]
    # L'appareil est reconnu : plus de second facteur ; le code ne resert pas.
    assert login(api, b.identifiant, appareil="ordi-2")["ok"]
    assert api.post("/api/vendors/auth/2fa", {"appareil": "ordi-2", "code": "123456"}, format="json").json() == {
        "ok": False,
        "raison": "expire",
    }


def test_second_facteur_renvoi_apres_le_delai_et_code_expire():
    b = creer_boutique_vendeur()
    api = APIClient()
    login(api, b.identifiant, appareil="tel-1")
    login(api, b.identifiant, appareil="ordi-2")
    CodeOtp.objects.update(cree_le=timezone.now() - timedelta(seconds=90))
    r = api.post("/api/vendors/auth/2fa/resend", {"appareil": "ordi-2"}, format="json").json()
    assert r["ok"] and r["envoi"]["renvoisRestants"] == 1
    CodeOtp.objects.update(expire_le=timezone.now() - timedelta(seconds=1))
    assert api.post("/api/vendors/auth/2fa", {"appareil": "ordi-2", "code": code()}, format="json").json()["raison"] == "expire"


def test_trop_d_envois_dans_l_heure():
    b = creer_boutique_vendeur()
    api = APIClient()
    login(api, b.identifiant, appareil="tel-1")
    for _ in range(3):
        CodeOtp.objects.update(cree_le=timezone.now() - timedelta(seconds=90))
        login(api, b.identifiant, appareil="ordi-2")
    CodeOtp.objects.update(cree_le=timezone.now() - timedelta(seconds=90))
    r = api.post("/api/vendors/auth/2fa/resend", {"appareil": "ordi-2"}, format="json").json()
    assert r["ok"] is False and r["raison"] == "limite" and r["jusqua"] > 0
    # Une nouvelle connexion montre le défi en cours (son code vaut encore).
    assert login(api, b.identifiant, appareil="ordi-2")["raison"] == "deuxieme_facteur"


def test_code_bloque_apres_cinq_essais():
    b = creer_boutique_vendeur()
    api = APIClient()
    login(api, b.identifiant, appareil="tel-1")
    login(api, b.identifiant, appareil="ordi-2")
    faux = "000000" if code() != "000000" else "111111"
    for _ in range(4):
        api.post("/api/vendors/auth/2fa", {"appareil": "ordi-2", "code": faux}, format="json")
    r = api.post("/api/vendors/auth/2fa", {"appareil": "ordi-2", "code": faux}, format="json").json()
    assert r["raison"] == "bloque" and r["jusqua"] > 0


def test_oublier_l_appareil():
    b = creer_boutique_vendeur()
    api = APIClient()
    jetons = login(api, b.identifiant, appareil="tel-1")["jetons"]
    a = APIClient()
    a.credentials(HTTP_AUTHORIZATION=f"Bearer {jetons['access']}")
    assert a.post("/api/vendors/auth/devices/forget", {"appareil": "tel-1"}, format="json").json() == {"ok": True}
    assert login(api, b.identifiant, appareil="tel-1")["raison"] == "deuxieme_facteur"
    assert APIClient().post("/api/vendors/auth/devices/forget", {}, format="json").status_code == 401


def test_appareil_par_en_tete():
    b = creer_boutique_vendeur()
    api = APIClient()
    api.post(
        "/api/vendors/auth/login", {"identifiant": b.identifiant, "motDePasse": "motdepasse1"}, format="json", HTTP_X_DEVICE_ID="tete-1"
    )
    assert AppareilVendeur.objects.filter(user=b.proprietaire).count() == 1
    r = api.post(
        "/api/vendors/auth/login", {"identifiant": b.identifiant, "motDePasse": "motdepasse1"}, format="json", HTTP_X_DEVICE_ID="tete-1"
    ).json()
    assert r["ok"]


# ── Connexion par numéro et code ──────────────────────────────────────────────────────────────────────


def test_connexion_par_numero_et_code():
    b = creer_boutique_vendeur()
    m = ajouter_preparation(b)
    api = APIClient()

    def otp(t, **k):
        return api.post("/api/vendors/auth/otp", {"telephone": t, "canal": "whatsapp", "appareil": "tel-9", **k}, format="json").json()

    assert otp("12") == {"ok": False, "raison": "numero"}
    assert otp("690000000") == {"ok": False, "raison": "inconnu"}
    n = m.telephone[-9:]
    r = otp(n, seSouvenir=False)
    assert r["ok"] and r["envoi"]["canal"] == "whatsapp"
    assert api.get("/api/vendors/auth/otp", {"appareil": "tel-9"}).json()["id"] == r["envoi"]["id"]
    assert api.get("/api/vendors/auth/otp", {"appareil": "x"}).status_code == 404
    assert api.post("/api/vendors/auth/otp/resend", {"appareil": "tel-9", "canal": "sms"}, format="json").json()["raison"] == "trop_tot"
    assert api.post("/api/vendors/auth/otp/resend", {"appareil": "x"}, format="json").json()["raison"] == "trop_tot"
    assert api.post("/api/vendors/auth/otp", {"telephone": n}, format="json").status_code == 400  # appareil manquant
    v = api.post("/api/vendors/auth/verify", {"appareil": "tel-9", "code": code(n)}, format="json").json()
    assert v["ok"] and v["session"]["membre"]["role"] == "preparation" and v["seSouvenir"] is False
    assert AppareilVendeur.objects.filter(user=m.user).exists()
    assert api.post("/api/vendors/auth/verify", {"appareil": "tel-9", "code": "1"}, format="json").json()["raison"] == "expire"


def test_connexion_par_numero_limite():
    b = creer_boutique_vendeur()
    api = APIClient()
    for _ in range(3):
        CodeOtp.objects.update(cree_le=timezone.now() - timedelta(seconds=90))
        assert api.post("/api/vendors/auth/otp", {"telephone": NUMERO, "appareil": "t"}, format="json").json()["ok"]
    CodeOtp.objects.update(cree_le=timezone.now() - timedelta(seconds=90))
    r = api.post("/api/vendors/auth/otp", {"telephone": NUMERO, "appareil": "t"}, format="json").json()
    assert r["raison"] == "limite"
    assert b


# ── Mot de passe oublié ───────────────────────────────────────────────────────────────────────────────


def test_mot_de_passe_oublie_bout_en_bout():
    b = creer_boutique_vendeur()
    api = APIClient()
    assert api.post("/api/vendors/auth/password-reset", {"identifiant": " "}, format="json").json() == {"ok": False, "raison": "vide"}
    inconnu = api.post("/api/vendors/auth/password-reset", {"identifiant": "@Personne"}, format="json").json()
    r = api.post("/api/vendors/auth/password-reset", {"identifiant": b.identifiant}, format="json").json()
    assert r["ok"] and inconnu["ok"] and r["lien"]["valideMinutes"] == 15 and set(r["lien"]) == set(inconnu["lien"])
    assert "jetonDemo" not in r["lien"]
    jeton = services.dernier_lien_mdp(NUMERO)
    assert jeton and JetonMdp.objects.get(utilise_le__isnull=True).expire_le < timezone.now() + timedelta(minutes=16)
    assert api.post("/api/vendors/auth/password-reset/open", {"jeton": "faux"}, format="json").json() == {"ok": False, "raison": "expire"}
    o = api.post("/api/vendors/auth/password-reset/open", {"jeton": jeton}, format="json").json()
    assert o["ok"] and o["nouveau"]["identifiant"] == b.identifiant and o["nouveau"]["envoi"]["destination"] == "677 •• •• 17"
    o2 = api.post("/api/vendors/auth/password-reset/open", {"jeton": jeton}, format="json").json()
    assert o2["nouveau"]["envoi"]["id"] == o["nouveau"]["envoi"]["id"]  # rouvert : même code

    def choisir(c, m):
        return api.post("/api/vendors/auth/password-reset/confirm", {"jeton": jeton, "code": c, "motDePasse": m}, format="json").json()

    assert choisir(code(), "court1") == {"ok": False, "raison": "faible"}
    assert choisir(code(), "sanschiffre") == {"ok": False, "raison": "faible"}
    assert choisir("000000" if code() != "000000" else "111111", "Nouveau2026")["raison"] == "code"
    assert choisir(code(), "Nouveau2026") == {"ok": True}
    assert login(api, b.identifiant, "Nouveau2026")["ok"]
    assert choisir(code(), "Nouveau2027") == {"ok": False, "raison": "expire"}  # lien consommé


def test_lien_expire():
    b = creer_boutique_vendeur()
    api = APIClient()
    api.post("/api/vendors/auth/password-reset", {"identifiant": b.proprietaire.email}, format="json")
    jeton = services.dernier_lien_mdp(NUMERO)
    JetonMdp.objects.update(expire_le=timezone.now() - timedelta(seconds=1))
    assert api.post("/api/vendors/auth/password-reset/open", {"jeton": jeton}, format="json").json()["raison"] == "expire"
    assert services.dernier_lien_mdp("690000000") is None


# ── Déconnexion, Face ID ──────────────────────────────────────────────────────────────────────────────


def test_deconnexion_met_le_jeton_en_liste_noire():
    b = creer_boutique_vendeur()
    j = login(APIClient(), b.identifiant)["jetons"]
    r = APIClient().post("/api/vendors/auth/logout", {"refresh": j["refresh"]}, format="json").json()
    assert r["connecte"] is False
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

    assert BlacklistedToken.objects.count() == 1
    assert APIClient().post("/api/vendors/auth/logout", {"refresh": "nimporte"}, format="json").status_code == 200


def test_biometrie():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    assert api.get("/api/vendors/me/biometrics").json() == {"proposee": False, "active": False}
    assert api.put("/api/vendors/me/biometrics", {"active": True}, format="json").json() == {"proposee": True, "active": True}
    assert api.put("/api/vendors/me/biometrics", {"active": False}, format="json").json() == {"proposee": True, "active": False}
    assert APIClient().get("/api/vendors/me/biometrics").status_code == 401


def test_nom_de_l_appareil():
    assert services.nom_appareil("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Mobile Safari/604.1") == "iPhone · Safari"
    assert services.nom_appareil("Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36") == "Android · Chrome"
    assert services.nom_appareil("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120") == "Windows · Edge"
    assert services.nom_appareil("Mozilla/5.0 (Macintosh) Firefox/120") == "Mac · Firefox"
    assert services.nom_appareil("") == "Ordinateur · Navigateur"
