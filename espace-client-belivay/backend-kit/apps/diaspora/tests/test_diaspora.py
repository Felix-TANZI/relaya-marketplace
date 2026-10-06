# backend/apps/diaspora/tests/test_diaspora.py
# Diaspora de bout en bout (DP-54 ; site/tests/diaspora.spec.ts) : inscription à deux codes, liens famille (code,
# invitation, numéro), livraison du proche, paniers envoyés, commande pour un proche (contrôle de cohérence,
# plafonds, 3-D Secure), sans jamais l'adresse ni le numéro du proche.
import re
import uuid
from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from apps.client_core.chiffrement import chiffrer, empreinte
from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit, creer_relais
from apps.diaspora.models import CommandeDiaspora, CompteDiaspora, DemandeProche, LienFamille
from apps.otp.prestataires import SmsConsole

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _classe(settings):
    settings.BELIVAY_CLASSE_PAR_DEFAUT = "S"


def _code_sms():
    return re.search(r"\b(\d{6})\b", SmsConsole.ENVOYES[-1]["texte"]).group(1)


def _code_mail():
    return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)


INSCRIPTION = {
    "prenom": "Hervé",
    "nom": "Mbarga",
    "email": "herve.mbarga@exemple.fr",
    "motDePasse": "Belivay2026",
    "naissance": "1990-05-14",
    "pays": "France",
    "ville": "Lyon",
    "indicatif": "+33",
    "numero": "612345678",
}


def _inscrire(api_client, **extra):
    from apps.otp.services import envoyer

    envoyer(objet="diaspora", destination="33612345678")
    code = _code_sms()
    envoyer(objet="diaspora", destination=INSCRIPTION["email"])
    return api_client.post("/api/auth/diaspora/register", {**INSCRIPTION, "code": code, "codeEmail": _code_mail(), **extra}, format="json")


def test_inscription_diaspora(api_client):
    r = _inscrire(api_client)
    assert r.status_code == 200, r.content
    d = r.json()
    assert d["ok"] is True and d["access"] and d["refresh"]
    assert d["session"]["typeCompte"] == "diaspora" and d["session"]["client"]["prenom"] == "Hervé"
    c = CompteDiaspora.objects.get()
    assert (c.pays, c.ville, c.numero_masque) == ("France", "Lyon", "+33 61 ·· ·· 78")
    from apps.client_accounts.services import profil

    assert profil(c.client).type_compte == "diaspora"
    me = api_client.get("/api/me/family-links", HTTP_AUTHORIZATION=f"Bearer {d['access']}").json()
    assert me["compte"] == {"pays": "France", "ville": "Lyon", "indicatif": "+33", "numeroMasque": "+33 61 ·· ·· 78"}


@pytest.mark.parametrize(
    "extra,code",
    [
        ({"naissance": "2015-01-01"}, "age"),
        ({"pays": "Cameroun", "indicatif": "+237"}, "pays"),
        ({"indicatif": "+32"}, "pays"),
        ({"numero": "237677123441"}, "numero"),
        ({"code": "000000"}, "code"),
    ],
)
def test_inscription_refusee(api_client, extra, code):
    r = _inscrire(api_client, **extra)
    assert r.status_code == 422 and r.json()["error"]["code"] == code
    assert not CompteDiaspora.objects.exists()


def test_inscription_compte_existant(api_client):
    creer_client(email=INSCRIPTION["email"])
    assert _inscrire(api_client).json() == {"ok": False, "raison": "existe"}


# ── Liens famille ──────────────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def monde():
    from apps.client_accounts.services import enregistrer_numero, profil

    relais = creer_relais()
    herve = creer_client("Hervé")
    herve.last_name = "Mbarga"
    herve.save()
    CompteDiaspora.objects.create(
        client=herve,
        pays="France",
        ville="Lyon",
        indicatif="+33",
        numero_chiffre=chiffrer("33612345678"),
        numero_empreinte=empreinte("33612345678"),
        numero_masque="+33 61 ·· ·· 78",
        naissance="1990-05-14",
    )
    odile = creer_client("Odile")
    enregistrer_numero(odile, "699112233")
    p = profil(odile)
    p.relais_habituel_id = relais.pk
    p.save()
    b = creer_boutique()
    return {
        "relais": relais,
        "herve": herve,
        "odile": odile,
        "api_h": client_connecte(herve),
        "api_o": client_connecte(odile),
        "cartable": creer_produit(b, titre="Cartable scolaire", prix=20_000),
        "tele": creer_produit(b, titre="Téléviseur", prix=160_000),
    }


def _relier(m):
    code = m["api_o"].post("/api/me/family-links/code").json()["code"]
    r = m["api_h"].post("/api/me/family-links", {"code": code}, format="json")
    assert r.status_code == 200, r.content
    return r.json()["lien"]


def test_code_famille_et_lien(monde):
    c = monde["api_o"].post("/api/me/family-links/code").json()
    assert re.fullmatch(r"FAM-[A-Z2-9]{4}", c["code"])
    assert monde["api_o"].get("/api/me/family-links").json()["code"]["code"] == c["code"]
    lien = monde["api_h"].post("/api/me/family-links", {"code": c["code"]}, format="json").json()["lien"]
    assert (lien["sens"], lien["prenom"], lien["relais"], lien["etat"], lien["pays"]) == ("diaspora", "Odile", "Mvog-Ada", "actif", None)
    vu_odile = monde["api_o"].get("/api/me/family-links").json()["liens"][0]
    assert (vu_odile["sens"], vu_odile["prenom"], vu_odile["pays"], vu_odile["relais"]) == (
        "cameroun",
        "Hervé",
        "France",
        "Relais Mvog-Ada",
    )
    # Usage unique : le même code ne sert plus ; un nouveau code → déjà relié.
    assert monde["api_h"].post("/api/me/family-links", {"code": c["code"]}, format="json").status_code == 404
    c2 = monde["api_o"].post("/api/me/family-links/code").json()["code"]
    r = monde["api_h"].post("/api/me/family-links", {"code": c2}, format="json")
    assert r.status_code == 409 and r.json()["error"]["code"] == "deja"


def test_lier_par_code_refus(monde):
    r = monde["api_h"].post("/api/me/family-links", {"code": "FAM-XXXX"}, format="json")
    assert r.status_code == 404 and r.json()["error"]["code"] == "code"
    assert monde["api_o"].post("/api/me/family-links", {"code": "FAM-XXXX"}, format="json").status_code == 403
    assert monde["api_h"].post("/api/me/family-links/code").status_code == 403


def test_cinq_liens_au_plus(monde):
    for i in range(5):
        LienFamille.objects.create(diaspora=monde["herve"], proche=creer_client(f"P{i}"), etat="actif")
    code = monde["api_o"].post("/api/me/family-links/code").json()["code"]
    r = monde["api_h"].post("/api/me/family-links", {"code": code}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "max"


def test_invitation_par_lien(monde):
    inv = monde["api_h"].post("/api/me/family-links/invitation").json()
    assert inv["type"] == "invitation" and re.fullmatch(r"INV-[A-Z2-9]{4}", inv["code"])
    assert monde["api_h"].post("/api/me/family-links/invitation").json()["code"] == inv["code"]  # le même tant qu'il vaut
    assert monde["api_o"].post("/api/me/family-links/invitation").json()["type"] == "famille"
    r = monde["api_h"].post(f"/api/me/family-links/invitation/{inv['code']}/accept", {"relais": "Relais Mvog-Ada"}, format="json")
    assert r.status_code == 403 and r.json()["error"]["code"] == "type"
    r = monde["api_o"].post("/api/me/family-links/invitation/INV-ZZZZ/accept", {"relais": "Relais Mvog-Ada"}, format="json")
    assert r.status_code == 404 and r.json()["error"]["code"] == "code"
    r = monde["api_o"].post(f"/api/me/family-links/invitation/{inv['code']}/accept", {"relais": "Relais Mvog-Ada"}, format="json")
    assert r.status_code == 200 and r.json()["lien"]["prenom"] == "Hervé" and r.json()["lien"]["pays"] == "France"
    r = monde["api_o"].post(f"/api/me/family-links/invitation/{inv['code']}/accept", {"relais": "Relais Mvog-Ada"}, format="json")
    assert r.status_code == 409


def test_invitation_par_numero(monde):
    r = monde["api_h"].post("/api/me/family-links/invite", {"prenom": "Odile", "numero": "699 11 22 33"}, format="json").json()
    assert r["ok"] is True and r["lien"]["etat"] == "invite"
    assert monde["api_h"].post("/api/me/family-links/invite", {"prenom": "Odile", "numero": "699112233"}, format="json").json() == {
        "ok": False,
        "raison": "deja",
    }
    assert monde["api_h"].post("/api/me/family-links/invite", {"prenom": "X", "numero": "+33 6 12"}, format="json").json() == {
        "ok": False,
        "raison": "numero",
    }
    vu = monde["api_o"].get("/api/me/family-links").json()["liens"][0]
    assert vu["sens"] == "cameroun" and vu["etat"] == "invite"
    assert monde["api_o"].post(f"/api/me/family-links/{vu['id']}/answer", {"accepte": True}, format="json").status_code == 204
    assert LienFamille.objects.get().etat == "actif" and LienFamille.objects.get().relay_id == monde["relais"].pk
    assert monde["api_o"].post(f"/api/me/family-links/{vu['id']}/answer", {"accepte": True}, format="json").status_code == 409


def test_livraison_du_proche_et_retrait_du_lien(monde):
    from apps.client_accounts.models import Adresse

    lien = _relier(monde)
    monde["api_o"].patch(
        f"/api/me/family-links/{lien['id']}/delivery", {"relais": "Relais Mvog-Ada", "domicile": True, "prefere": "domicile"}, format="json"
    )
    assert LienFamille.objects.get().domicile is False  # sans adresse au compte
    Adresse.objects.create(
        user=monde["odile"], nom="Maison", quartier="Mvog-Ada", reperes_chiffre=chiffrer("Derrière l'école"), principale=True
    )
    monde["api_o"].patch(
        f"/api/me/family-links/{lien['id']}/delivery", {"relais": "Relais Mvog-Ada", "domicile": True, "prefere": "domicile"}, format="json"
    )
    vu = monde["api_h"].get("/api/me/family-links").json()["liens"][0]
    assert (vu["domicile"], vu["prefere"], vu["ville"]) == (True, "domicile", "Yaoundé")
    assert "Derrière" not in str(vu)
    assert (
        monde["api_h"]
        .patch(
            f"/api/me/family-links/{lien['id']}/delivery",
            {"relais": "Relais Mvog-Ada", "domicile": False, "prefere": "relais"},
            format="json",
        )
        .status_code
        == 403
    )
    assert monde["api_h"].delete(f"/api/me/family-links/{lien['id']}").status_code == 204
    assert LienFamille.objects.get().etat == "retire"
    assert client_connecte(creer_client()).delete(f"/api/me/family-links/{lien['id']}").status_code == 404


# ── Paniers entre proches ──────────────────────────────────────────────────────────────────────────────


def _panier(user, produit, qte=1):
    from apps.cart.services import ajouter

    ajouter(user, produit.pk, qte)


def test_panier_envoye_refuse_puis_annule(monde):
    lien = _relier(monde)
    url = f"/api/me/family-links/{lien['id']}/requests"
    r = monde["api_o"].post(url, {"mot": "Merci", "livraison": "relais"}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "vide"
    _panier(monde["odile"], monde["cartable"])
    r = monde["api_o"].post(url, {"mot": "Merci Hervé", "livraison": "relais"}, format="json").json()
    d = r["demande"]
    assert (d["sens"], d["sousTotal"], d["fraisRelais"], d["fraisDomicile"], d["etat"], d["pays"]) == (
        "envoyee",
        20000,
        900,
        1500,
        "attente",
        "France",
    )
    assert monde["api_o"].post(url, {"mot": "", "livraison": "relais"}, format="json").status_code == 409
    assert monde["api_o"].post(url, {"mot": "", "livraison": "domicile"}, format="json").json()["error"]["code"] == "domicile"
    recue = monde["api_h"].get("/api/me/family-requests").json()["demandes"][0]
    assert recue["sens"] == "recue" and recue["prenom"] == "Odile" and recue["lignes"][0]["titre"] == "Cartable scolaire"
    assert (
        monde["api_h"].post(f"/api/me/family-requests/{d['id']}/decline", {"mot": "La semaine prochaine"}, format="json").status_code == 204
    )
    assert monde["api_o"].get("/api/me/family-requests").json()["demandes"][0]["motRefus"] == "La semaine prochaine"
    d2 = monde["api_o"].post(url, {"mot": "", "livraison": "relais"}, format="json").json()["demande"]
    assert monde["api_h"].delete(f"/api/me/family-requests/{d2['id']}").status_code == 409  # c'est au proche d'annuler
    assert monde["api_o"].delete(f"/api/me/family-requests/{d2['id']}").status_code == 204
    assert DemandeProche.objects.get(pk=d2["id"]).etat == "annulee"


def test_panier_envoye_plafond(monde):
    lien = _relier(monde)
    _panier(monde["odile"], monde["tele"])
    r = monde["api_o"].post(f"/api/me/family-links/{lien['id']}/requests", {"mot": "", "livraison": "relais"}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "plafond"


# ── Commande pour un proche ────────────────────────────────────────────────────────────────────────────

COMMANDE = {
    "carte": "tok_ok",
    "devise": "EUR",
    "mot": "Bonne rentrée",
    "titulaire": "MBARGA Herve",
    "bin": "42424242",
    "paysCarte": "France",
    "moyen": "carte",
}


def _commander(m, lien_id, **extra):
    return m["api_h"].post(
        f"/api/family-links/{lien_id}/orders", {**COMMANDE, **extra}, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4())
    )


def test_commander_pour_un_proche(monde):
    lien = _relier(monde)
    _panier(monde["herve"], monde["cartable"])
    r = _commander(monde, lien["id"])
    assert r.status_code == 200, r.content
    assert r.json()["ok"] is True
    c = CommandeDiaspora.objects.get()
    assert (c.montant, c.devise, str(c.en_devise), c.livraison, c.pays_carte) == (21318, "EUR", "32.50", "relais", "France")
    from apps.client_core.pont import commande

    o = commande(c.order_id)
    assert o.user_id == monde["odile"].pk and o.relay_id == monde["relais"].pk
    vu = monde["api_h"].get("/api/me/family-links").json()
    assert vu["depensesMois"] == 21318
    suivi = vu["liens"][0]["commandes"][0]
    assert (suivi["ref"], suivi["montant"], suivi["enDevise"], suivi["mot"]) == (c.ref, 21318, 32.5, "Bonne rentrée")
    assert _commander(monde, lien["id"]).json() == {"ok": False, "raison": "vide"}  # le panier est parti


def test_commander_pour_3d_secure_puis_webhook(monde):
    # La banque demande 3-D Secure : la commande attend (« 3-D Secure à valider »), l'adresse de la banque est rendue ;
    # le webhook du prestataire la confirme (idempotent) ; un refus annule la commande sans débit.
    from apps.diaspora.services import confirmer_paiement
    from apps.pickup.models import MontantsCommande

    lien = _relier(monde)
    _panier(monde["herve"], monde["cartable"])
    r = _commander(monde, lien["id"], carte="tok_3ds").json()
    c = CommandeDiaspora.objects.get()
    assert r == {"ok": True, "ref": c.ref, "redirection": f"https://3ds.exemple/{c.reference}"}
    assert c.etat_paiement == "action"
    assert confirmer_paiement("inconnue") is False
    assert confirmer_paiement(c.reference) is True
    assert confirmer_paiement(c.reference) is False  # déjà payée
    c.refresh_from_db()
    assert c.etat_paiement == "paye"
    from apps.client_core.pont import commande

    assert commande(c.order_id).payee is True
    assert MontantsCommande.objects.get(order_id=c.order_id).etat_paiement == "payee"

    _panier(monde["herve"], monde["cartable"])
    _commander(monde, lien["id"], carte="tok_3ds")
    c2 = CommandeDiaspora.objects.exclude(pk=c.pk).get()
    assert confirmer_paiement(c2.reference, reussi=False) is True
    c2.refresh_from_db()
    assert c2.etat_paiement == "rembourse" and commande(c2.order_id).payee is False


def test_commander_pour_refus(monde):
    lien = _relier(monde)
    _panier(monde["herve"], monde["cartable"])
    assert _commander(monde, lien["id"], titulaire="Paul Mbarga").json() == {"ok": False, "raison": "titulaire"}
    r = _commander(monde, lien["id"], paysCarte="Cameroun").json()
    assert r["raison"] == "coherence" and r["controle"]["motif"] == "cameroun"
    r = _commander(monde, lien["id"], paysCarte="Belgique").json()
    assert r == {"ok": False, "raison": "verification", "controle": {"decision": "renforce", "paysCarte": "Belgique", "signaux": ["pays"]}}
    from apps.otp.services import envoyer

    envoyer(objet="diaspora-renforce", destination="33612345678")
    assert _commander(monde, lien["id"], paysCarte="Belgique", codeSms=_code_sms()).json()["ok"] is True
    assert _commander(monde, "9999").json() == {"ok": False, "raison": "lien"}
    r = _commander(monde, lien["id"], livraison="domicile")
    assert r.status_code == 422 and r.json()["error"]["code"] == "domicile"


def test_code_renforce_par_la_route_publique(monde):
    # Le site demande le code de vérification renforcée par POST /api/auth/otp/send {purpose: diaspora-renforce} :
    # il part au numéro étranger vérifié du compte (jamais à une destination donnée), et commander_pour l'accepte.
    lien = _relier(monde)
    _panier(monde["herve"], monde["cartable"])
    r = monde["api_h"].post("/api/auth/otp/send", {"purpose": "diaspora-renforce", "destination": "+33 6 ·· ·· 78"}, format="json")
    assert r.status_code == 202, r.content
    assert SmsConsole.ENVOYES[-1]["numero"].endswith("612345678")
    assert _commander(monde, lien["id"], paysCarte="Belgique", codeSms=_code_sms()).json()["ok"] is True
    # Réservé aux comptes diaspora connectés.
    assert monde["api_o"].post("/api/auth/otp/send", {"purpose": "diaspora-renforce"}, format="json").status_code == 403
    assert APIClient().post("/api/auth/otp/send", {"purpose": "diaspora-renforce"}, format="json").status_code == 401


def test_commander_pour_plafond(monde):
    lien = _relier(monde)
    _panier(monde["herve"], monde["tele"])
    assert _commander(monde, lien["id"]).json() == {"ok": False, "raison": "plafond"}


def test_payer_le_panier_d_un_proche_chez_lui(monde):
    from apps.client_accounts.models import Adresse

    lien = _relier(monde)
    Adresse.objects.create(user=monde["odile"], nom="Maison", quartier="Mvog-Ada", reperes_chiffre=chiffrer("x"), principale=True)
    monde["api_o"].patch(
        f"/api/me/family-links/{lien['id']}/delivery", {"relais": "Relais Mvog-Ada", "domicile": True, "prefere": "domicile"}, format="json"
    )
    _panier(monde["odile"], monde["cartable"])
    d = (
        monde["api_o"]
        .post(f"/api/me/family-links/{lien['id']}/requests", {"mot": "", "livraison": "domicile"}, format="json")
        .json()["demande"]
    )
    # Le supplément domicile (600 F) laissé à Odile : la garantie le couvre (20 000 ≥ 600 + 2 000 + 500).
    r = _commander(monde, lien["id"], demande=d["id"], livraison="domicile", supplementPar="destinataire", moyen="apple", titulaire="")
    assert r.json()["ok"] is True, r.content
    c = CommandeDiaspora.objects.get()
    assert (c.a_la_remise, c.montant, c.moyen, c.carte) == (600, 21318, "apple", "Apple Pay")
    assert DemandeProche.objects.get().etat == "payee"
    r = _commander(monde, lien["id"], demande=d["id"], livraison="domicile", moyen="apple")
    assert r.status_code == 422 and r.json()["error"]["code"] == "demande"


def test_demande_expiree(monde):
    lien = _relier(monde)
    _panier(monde["odile"], monde["cartable"])
    d = (
        monde["api_o"]
        .post(f"/api/me/family-links/{lien['id']}/requests", {"mot": "", "livraison": "relais"}, format="json")
        .json()["demande"]
    )
    DemandeProche.objects.filter(pk=d["id"]).update(jusqua=timezone.now() - timedelta(minutes=1))
    assert monde["api_h"].get("/api/me/family-requests").json()["demandes"][0]["etat"] == "expiree"
    r = _commander(monde, lien["id"], demande=d["id"])
    assert r.status_code == 422 and r.json()["error"]["code"] == "demande"


# ── Code vérifié tout de suite, inscription par Google, Apple ou le numéro, proche actif ─────────────────


def test_code_diaspora_verifie_sans_compte_et_reste_valable(api_client):
    from apps.otp.services import envoyer

    envoyer(objet="diaspora", destination="33612345678")
    code = _code_sms()
    corps = {"purpose": "diaspora", "destination": "33612345678"}
    r = api_client.post("/api/auth/otp/verify", {**corps, "code": "000000"}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "code"
    assert api_client.post("/api/auth/otp/verify", {**corps, "code": code}, format="json").json() == {"ok": True}
    # Le code n'est pas consommé : l'inscription le recontrôle.
    envoyer(objet="diaspora", destination=INSCRIPTION["email"])
    r = api_client.post("/api/auth/diaspora/register", {**INSCRIPTION, "code": code, "codeEmail": _code_mail()}, format="json")
    assert r.json()["ok"] is True, r.content


def test_inscription_avec_le_numero_seul(api_client):
    from apps.otp.services import envoyer

    envoyer(objet="diaspora", destination="33612345678")
    corps = {k: v for k, v in INSCRIPTION.items() if k not in ("motDePasse", "email")}
    r = api_client.post("/api/auth/social/diaspora", {**corps, "fournisseur": "numero", "email": "", "code": _code_sms()}, format="json")
    assert r.status_code == 200, r.content
    d = r.json()
    assert d["ok"] is True and d["session"]["typeCompte"] == "diaspora" and d["session"]["proche"] is None
    u = CompteDiaspora.objects.get().client
    assert not u.has_usable_password() and u.email == ""


def test_inscription_google(api_client, monkeypatch):
    from apps.client_accounts import services as comptes
    from apps.otp.services import envoyer

    def verifier(fournisseur, jeton):
        if jeton != "jeton-google":
            raise comptes.JetonInvalide("faux")
        return {"sujet": "g-1", "email": "herve@gmail.com", "prenom": "Hervé", "nom": "Mbarga"}

    monkeypatch.setattr(comptes, "verifier_jeton_identite", verifier)
    r = api_client.post("/api/auth/social/lookup", {"provider": "google", "credential": "jeton-google"}, format="json")
    assert r.json() == {"jeton": "jeton-google", "prenom": "Hervé", "nom": "Mbarga", "email": "herve@gmail.com", "compte": None}
    r = api_client.post("/api/auth/social/lookup", {"provider": "google", "credential": "autre"}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "jeton"
    envoyer(objet="diaspora", destination="33612345678")
    corps = {k: v for k, v in INSCRIPTION.items() if k not in ("motDePasse",)}
    r = api_client.post(
        "/api/auth/social/diaspora", {**corps, "fournisseur": "google", "jeton": "jeton-google", "code": _code_sms()}, format="json"
    )
    assert r.json()["ok"] is True, r.content
    assert CompteDiaspora.objects.get().client.email == "herve@gmail.com"  # l'adresse du jeton, pas celle du formulaire


def test_proche_actif(monde):
    api_h = monde["api_h"]
    from apps.diaspora import services

    assert services.session(monde["herve"])["proche"] is None
    lien = _relier(monde)
    p = services.session(monde["herve"])["proche"]
    assert (p["id"], p["prenom"], p["quartier"], p["autres"]) == (lien["id"], "Odile", lien["relais"], 0)
    assert api_h.put("/api/me/active-relative", {"lien": lien["id"]}, format="json").json() == {"ok": True}
    assert api_h.put("/api/me/active-relative", {"lien": "999"}, format="json").status_code == 404
    assert monde["api_o"].put("/api/me/active-relative", {"lien": lien["id"]}, format="json").status_code == 403
