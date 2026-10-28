# Domaine « compte » : profil (codes SMS, titulaire), e-mail et téléphone (deux codes), appareils et sessions, mot de
# passe, sécurité, statut et grille, export, clôture (préavis, ce qui reste à solder), demande au support.
from datetime import timedelta

import pytest
from django.contrib.auth.models import User

from apps.client_core.erreurs import ErreurClient
from apps.otp.prestataires import SmsConsole
from apps.vendeur_boutique import services
from apps.vendeur_boutique.models import AppareilVendeur, MessageSupportVendeur, ProfilMembre
from apps.vendeur_core import horloge
from apps.vendeur_core.models import Membre
from apps.vendeur_core.tests.outils import (
    ajouter_preparation,
    commande_client,
    creer_boutique_vendeur,
    creer_offre,
    preparation,
    proprietaire,
)

from .outils import cle, code_email, code_sms, commande_retiree

pytestmark = pytest.mark.django_db
V = "/api/vendors"
TEL = "677124217"


@pytest.fixture(autouse=True)
def _sms():
    SmsConsole.ENVOYES.clear()
    yield
    SmsConsole.ENVOYES.clear()


@pytest.fixture
def b():
    return creer_boutique_vendeur()


def _code(api, motif, numero=TEL):
    r = api.post(f"{V}/me/codes", {"motif": motif}, format="json").json()
    assert r["ok"], r
    return code_sms(numero)


def test_profil_du_proprietaire_et_de_l_employe(b):
    d = proprietaire(b).get(f"{V}/me").json()
    assert d["prenom"] == "Franck" and d["titulaire"] is True and d["role"] == "proprietaire" and d["identifiant"] == b.identifiant
    m = ajouter_preparation(b)
    d = preparation(b).get(f"{V}/me").json()
    assert d["prenom"] == "Aïcha" and d["identifiant"] == "@AichaN" and d["titulaire"] is False and d["email"] == m.user.email


def test_code_par_motif(b):
    api = proprietaire(b)
    d = api.post(f"{V}/me/codes", {"motif": "profil"}, format="json").json()
    assert d == {"ok": True, "masque": "6•• •• •• 17", "renvoiSecondes": 60}
    assert api.post(f"{V}/me/codes", {"motif": "profil"}, format="json").json() == {"ok": False, "raison": "trop_tot"}
    assert api.post(f"{V}/me/codes", {"motif": "rien"}, format="json").status_code == 400


def test_modifier_le_profil(b):
    api = proprietaire(b)
    assert api.patch(f"{V}/me", {"prenom": " ", "code": "1"}, format="json").json()["raison"] == "nom"
    assert api.patch(f"{V}/me", {"prenom": "Paul", "code": "1"}, format="json").json()["raison"] == "titulaire"
    assert api.patch(f"{V}/me", {"photo": "data:image/png;base64,AA", "code": "000000"}, format="json").json()["raison"] == "code"
    code = _code(api, "profil")
    d = api.patch(f"{V}/me", {"photo": "data:image/png;base64,AA", "code": code}, format="json").json()
    assert d["ok"] and d["profil"]["photo"] == "data:image/png;base64,AA"
    assert api.patch(f"{V}/me", {"photo": "javascript:x", "code": code}, format="json").status_code == 400


def test_l_employe_change_son_nom_et_sa_photo_en_fichier(b):
    from django.core.files.uploadedfile import SimpleUploadedFile

    m = ajouter_preparation(b)
    api = preparation(b)
    code = _code(api, "profil", m.telephone)
    f = SimpleUploadedFile("p.png", b"\x89PNG....", content_type="image/png")
    d = api.patch(f"{V}/me", {"prenom": "Aïcha", "nom": "Nkoulou", "photo": f, "code": code}, format="multipart").json()
    assert d["ok"] and d["profil"]["nom"] == "Nkoulou" and d["profil"]["photo"].startswith("data:image/png;base64,")
    m.refresh_from_db()
    assert m.user.last_name == "Nkoulou"
    assert services._image("") == ""
    with pytest.raises(ErreurClient):
        services._image(SimpleUploadedFile("p.txt", b"x", content_type="text/plain"))
    with pytest.raises(ErreurClient):
        services._image(SimpleUploadedFile("p.png", b"x" * (services.PHOTO_MAX_OCTETS + 1), content_type="image/png"))


def test_changer_l_email_avec_deux_codes(b):
    api = proprietaire(b)
    User.objects.create_user(username="autre", email="deja@belivay.com")
    assert api.post(f"{V}/me/email/code", {"email": "pas-un-email"}, format="json").json()["raison"] == "email"
    assert api.post(f"{V}/me/email/code", {"email": b.proprietaire.email}, format="json").json()["raison"] == "meme"
    assert api.post(f"{V}/me/email/code", {"email": "deja@belivay.com"}, format="json").json()["raison"] == "pris"
    assert api.post(f"{V}/me/email/confirm", {"codeSms": "1", "codeEmail": "2"}, format="json").json()["raison"] == "code"
    assert api.post(f"{V}/me/email/code", {"email": "Franck@Nouveau.cm"}, format="json").json() == {"ok": True}
    sms = _code(api, "email")
    assert api.post(f"{V}/me/email/confirm", {"codeSms": sms, "codeEmail": "000000"}, format="json").json()["raison"] == "code"
    d = api.post(f"{V}/me/email/confirm", {"codeSms": sms, "codeEmail": code_email("franck@nouveau.cm")}, format="json").json()
    assert d["ok"] and d["profil"]["email"] == "franck@nouveau.cm"


def test_changer_de_telephone_avec_deux_codes(b):
    api = proprietaire(b)
    autre = ajouter_preparation(b)
    assert api.post(f"{V}/me/phone/codes", {"numero": "12345"}, format="json").json()["raison"] == "prefixe"
    assert api.post(f"{V}/me/phone/codes", {"numero": "+237 677 12 42 17"}, format="json").json()["raison"] == "meme"
    assert api.post(f"{V}/me/phone/codes", {"numero": autre.telephone}, format="json").json()["raison"] == "pris"
    assert api.put(f"{V}/me/phone", {"codeAncien": "1", "codeNouveau": "2"}, format="json").json()["raison"] == "code"
    assert api.post(f"{V}/me/phone/codes", {"numero": "699 00 11 22"}, format="json").json() == {"ok": True}
    d = api.put(f"{V}/me/phone", {"codeAncien": code_sms(TEL), "codeNouveau": code_sms("699001122")}, format="json").json()
    assert d["ok"] and d["profil"]["telephone"] == "+237 6 99 00 11 22"


def test_appareils_et_deconnexion(b):
    m = Membre.objects.get(boutique=b, role="proprietaire")
    a1 = services.enregistrer_appareil(m, "tel-1", "iPhone · Safari", "Yaoundé", jti="j1")
    services.enregistrer_appareil(m, "tel-1", "iPhone · Safari", "", jti="j1b")
    a2 = services.enregistrer_appareil(m, "pc-2", "Mac · Chrome", "Douala", type="ordinateur")
    services.enregistrer_appareil(m, "tab-3", "iPad · Safari", "Kribi", type="tablette")
    api = proprietaire(b)
    d = api.get(f"{V}/devices", HTTP_X_DEVICE_ID="tel-1").json()
    assert d[0]["id"] == str(a1.pk) and d[0]["actuel"] is True and d[0]["ouvertures"] == 2 and d[0]["lieu"] == "Yaoundé"
    assert len(d) == 3 and not any(k in x for x in d for k in ("ip", "adresseIp"))
    # L'appareil actuel ne se déconnecte pas lui-même.
    assert len(api.delete(f"{V}/devices/{a1.pk}", HTTP_X_DEVICE_ID="tel-1").json()) == 3
    d = api.delete(f"{V}/devices/{a2.pk}", HTTP_X_DEVICE_ID="tel-1").json()
    assert [x["nom"] for x in d] == ["iPhone · Safari", "iPad · Safari"]
    assert services.appareil_revoque(m, "pc-2") and not services.appareil_revoque(m, "tel-1")
    assert len(api.delete(f"{V}/devices/abc", HTTP_X_DEVICE_ID="tel-1").json()) == 2
    d = api.post(f"{V}/devices/revoke-others", HTTP_X_DEVICE_ID="tel-1").json()
    assert [x["nom"] for x in d] == ["iPhone · Safari"]
    # Reconnecté, l'appareil revient.
    services.enregistrer_appareil(m, "pc-2", "Mac · Chrome", "Douala")
    assert not services.appareil_revoque(m, "pc-2")


def test_mot_de_passe(b):
    api = proprietaire(b)
    corps = lambda ancien, nouveau, code="1": {"ancien": ancien, "nouveau": nouveau, "code": code}  # noqa: E731
    assert api.put(f"{V}/me/password", corps("faux", "Nouveau2026"), format="json").json()["raison"] == "ancien"
    assert api.put(f"{V}/me/password", corps("motdepasse1", "court"), format="json").json()["raison"] == "faible"
    assert api.put(f"{V}/me/password", corps("motdepasse1", "motdepasse1"), format="json").json()["raison"] == "identique"
    assert api.put(f"{V}/me/password", corps("motdepasse1", "Nouveau2026"), format="json").json()["raison"] == "code"
    code = _code(api, "mot_de_passe")
    assert api.put(f"{V}/me/password", corps("motdepasse1", "Nouveau2026", code), format="json").json() == {"ok": True}
    b.proprietaire.refresh_from_db()
    assert b.proprietaire.check_password("Nouveau2026")


def test_securite_face_id_et_export(b):
    api = proprietaire(b)
    d = api.get(f"{V}/me/security").json()
    assert d["faceId"] is True and d["telephoneMasque"] == "6•• •• •• 17" and d["exportPretLe"] is None and d["aSolder"] == []
    assert api.put(f"{V}/me/security/face-id", {"actif": False}, format="json").json()["faceId"] is False
    assert api.post(f"{V}/me/export", {"code": "1"}, format="json", **cle()).json()["raison"] == "code"
    code = _code(api, "export")
    d = api.post(f"{V}/me/export", {"code": code}, format="json", **cle()).json()
    assert d["ok"] and d["pret"] > horloge.maintenant_ms()
    assert api.get(f"{V}/me/security").json()["exportPretLe"] == d["pret"]
    from apps.otp.models import CodeOtp

    CodeOtp.objects.all().delete()
    code = _code(api, "export")
    assert api.post(f"{V}/me/export", {"code": code}, format="json", **cle()).json()["raison"] == "deja"
    # L'employé exporte ses propres données ; il ne voit rien à solder.
    ajouter_preparation(b)
    assert preparation(b).get(f"{V}/me/security").json()["aSolder"] == []


def test_statut_et_grille(b):
    d = proprietaire(b).get(f"{V}/account/summary").json()
    assert d["palier"] == "Bronze" and d["plan"] == "Free" and d["trustScore"] == 62.7
    assert {g["famille"] for g in d["grille"]} >= {"A", "B"} and all(0 < g["de"] <= g["a"] < 100 for g in d["grille"])
    assert d["plancherCommande"] > 0 and d["contratSigneLe"] == "2026-08-20"
    assert preparation(b).get(f"{V}/account/summary").status_code == 403


def test_cloture_avec_ce_qui_reste_a_solder(b):
    api = proprietaire(b)
    commande_client(creer_offre(b))  # une commande en cours
    assert api.post(f"{V}/account/closure", {"code": "1"}, format="json", **cle()).json()["raison"] == "code"
    code = _code(api, "cloture")
    d = api.post(f"{V}/account/closure", {"code": code, "motif": "Je déménage"}, format="json", **cle()).json()
    assert d["ok"] and d["aSolder"] == [{"type": "commandes", "nombre": 1, "route": "commandes"}]
    assert d["le"] - horloge.maintenant_ms() > 29 * 86400 * 1000
    from apps.otp.models import CodeOtp

    CodeOtp.objects.all().delete()
    assert api.post(f"{V}/account/closure", {"code": _code(api, "cloture")}, format="json", **cle()).json()["raison"] == "deja"
    assert preparation(b).post(f"{V}/account/closure", {"code": "1"}, format="json", **cle()).status_code == 403
    # Préavis passé : la clôture attend que la commande soit soldée.
    ProfilMembre.objects.filter(cloture_demandee_le__isnull=False).update(cloture_demandee_le=horloge.maintenant() - timedelta(days=31))
    assert [r for _, r in services.executer_clotures()] == [["commandes_en_cours"]]
    d = api.delete(f"{V}/account/closure").json()
    assert d["clotureDemandeeLe"] is None and d["clotureLe"] is None


def test_cloture_effective_quand_tout_est_solde(b):
    m = Membre.objects.get(boutique=b, role="proprietaire")
    p = services.profil_de(m)
    p.cloture_demandee_le = horloge.maintenant() - timedelta(days=31)
    p.save()
    assert services.executer_clotures() == [(b, [])]
    m.refresh_from_db()
    assert m.actif is False


def test_a_solder_litiges_et_versements(b, monkeypatch):
    c, _ = commande_retiree(b)
    from apps.vendeur_core import faits as module_faits

    reel = module_faits.faits
    monkeypatch.setattr(services, "faits", lambda x: reel(x).__class__(**{**reel(x).__dict__, "gel": "litige"}))
    monkeypatch.setattr(services, "_a_verser", lambda b: 15680)
    assert services.a_solder(b) == [
        {"type": "litiges", "nombre": 1, "route": "litiges"},
        {"type": "versements", "nombre": 1, "route": "versements"},
    ]
    assert services.cloture_bloquee(b) == ["argent_a_verser", "litiges"]


def test_demande_de_modification_au_support(b):
    d = proprietaire(b).post(f"{V}/me/corrections", {"quoi": "Changer le titulaire", "ref": "BLV-1"}, format="json", **cle()).json()
    assert d == {"fil": "support"}
    assert MessageSupportVendeur.objects.filter(boutique=b, de="vendeur").first().texte == "BLV-1 · Changer le titulaire"
    assert proprietaire(b).post(f"{V}/me/corrections", {}, format="json", **cle()).status_code == 400


def test_a_verser_sans_application_argent(b):
    assert services._a_verser(b) >= 0
    assert AppareilVendeur.objects.count() == 0
