from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.utils import timezone

from apps.aftersales.tests.fabriques import PNG, PNG_DATA_URL, commande_retiree
from apps.client_core.models import Interrupteur
from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit
from apps.messaging import services
from apps.messaging.models import Conversation, DemandeRappel, EtatService, Message, ThemeFaq

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _medias(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def carine():
    return creer_client()


@pytest.fixture
def api(carine):
    return client_connecte(carine)


# ── Conversations ───────────────────────────────────────────────────────────────────────────────────────


def test_ecrire_au_support_masque_avant_l_enregistrement(api, carine):
    r = api.post("/api/me/threads/support/messages", {"texte": "Appelle-moi au 6 77 12 34 41 ou carine@gmail.com"}, format="json")
    assert r.status_code == 200 and r.json() == {"masques": ["email", "numero"]}
    textes = list(Message.objects.values_list("texte", flat=True))
    assert not any("677" in t or "gmail" in t for t in textes)
    assert textes[0] == "Appelle-moi au {{numero}} ou {{email}}"
    assert textes[-1].startswith("headset||Message envoyé. Une personne te répond ici sous 2")
    c = api.get("/api/me/threads").json()
    assert c["conversations"][0]["id"] == "support" and c["next_cursor"] is None
    assert c["conversations"][0]["apercu"].startswith("Message envoyé.")


def test_message_vide_refuse(api):
    assert api.post("/api/me/threads/support/messages", {"texte": "  "}, format="json").status_code == 400


def test_photo_multipart(api):
    r = api.post(
        "/api/me/threads/support/messages", {"photo": SimpleUploadedFile("a.png", PNG, content_type="image/png")}, format="multipart"
    )
    assert r.status_code == 200
    m = Message.objects.get(de="photo")
    assert m.photo.name.startswith("messagerie/")


def test_ouvrir_marque_lue_et_non_lus(api, carine):
    conv = services.conversation_support(carine)
    Message.objects.create(conversation=conv, de="eux", qui="Support BelivaY", texte="Bonjour Carine.")
    assert services.non_lus(carine) == 1
    liste = api.get("/api/me/threads").json()
    assert liste["conversations"][0]["nonLus"] == 1
    d = api.get("/api/me/threads/support").json()
    assert d["conversation"]["messages"][0]["qui"] == "Support BelivaY"
    assert services.non_lus(carine) == 0
    Message.objects.create(conversation=conv, de="eux", texte="Autre chose ?", cree_le=timezone.now() + timedelta(seconds=1))
    assert services.non_lus(carine) == 1
    assert api.post("/api/me/threads/read").status_code == 204
    Conversation.objects.update(lu_le=timezone.now() + timedelta(seconds=5))  # lu après le dernier message
    assert services.non_lus(carine) == 0


def test_conversation_d_un_autre_client_404(api):
    autre = creer_client()
    services.ouvrir_conversation_dossier(autre, "Dossier LIT-9", "LIT-9")
    assert api.get("/api/me/threads/LIT-9").status_code == 404
    assert api.post("/api/me/threads/LIT-9/messages", {"texte": "x"}, format="json").status_code == 404


def test_poser_une_question_au_vendeur(api, carine):
    p = creer_produit(creer_boutique(), titre="Pagne wax")
    r = api.post("/api/messages/threads", {"produit": str(p.pk), "texte": "Il est en coton ? www.exemple.com"}, format="json")
    assert r.status_code == 200 and r.json() == {"id": f"q-{p.pk}", "masques": ["lien"]}
    conv = Conversation.objects.get(cle=f"q-{p.pk}")
    assert conv.type == "vendeur" and conv.vendor_id == p.vendor.vendor_profile.pk
    assert conv.entete["sous"] == "Le vendeur ne voit ni ton nom ni ton numéro."
    api.post("/api/messages/threads", {"produit": str(p.pk), "texte": "Merci"}, format="json")
    assert Conversation.objects.filter(cle=f"q-{p.pk}").count() == 1  # une conversation par produit
    assert api.post("/api/messages/threads", {"produit": "999999", "texte": "x"}, format="json").status_code == 404


# ── Aide ────────────────────────────────────────────────────────────────────────────────────────────────


def test_aide(api, carine):
    commande_retiree(carine, etat="arrivee_relais")
    EtatService.objects.create(nom="MTN MoMo", ok=True, detail="Paiements normaux")
    api.post("/api/me/threads/support/messages", {"texte": "Bonjour"}, format="json")
    d = api.get("/api/help").json()
    assert d["support"]["ouverture"] == 7 and d["support"]["fermeture"] == 21 and isinstance(d["support"]["ouvert"], bool)
    assert d["conversations"] == {"nombre": 1, "nonLus": 0}
    assert d["whatsapp"] is None  # SUP-WA « à publier »
    assert len(d["commandesEnCours"]) == 1
    assert d["services"] == [{"nom": "MTN MoMo", "ok": True, "detail": "Paiements normaux"}]
    assert d["dossier"] is None and set(d) >= {"numero", "numeroVerifie"}


def test_aide_avec_un_dossier(api, carine):
    o, *_ = commande_retiree(carine)
    api.post(
        "/api/disputes",
        {"ref": f"BLV-{o.pk}", "colis": 1, "pb": "abime", "description": "", "souhait": "rembourse", "photos": [PNG_DATA_URL]},
        format="json",
        HTTP_IDEMPOTENCY_KEY="cle-aide-00001",
    )
    d = api.get("/api/help").json()
    assert d["dossier"]["libelle"].startswith("Ton dossier LIT-") and d["dossier"]["sous"].startswith("Réponse du vendeur avant ")


# ── Questions fréquentes ────────────────────────────────────────────────────────────────────────────────


def test_faq_publique_chargee_depuis_le_site(api_client):
    call_command("charger_faq", stdout=open("/dev/null", "w"))
    assert ThemeFaq.objects.count() == 8
    r = api_client.get("/api/help/faq")
    assert r.status_code == 200
    themes = r.json()
    assert themes[0]["cle"] == "paiement" and themes[0]["questions"][0]["q"] == "Comment je paie ?"
    toutes = [q for t in themes for q in t["questions"]]
    remb = [q for q in toutes if q["q"] == "Quand arrive mon remboursement ?"]
    assert len(remb) == 1 and remb[0]["module"] == {"ff": "FF-WALLET", "ouvert": True}  # FF-WALLET ouvert (DP-50)
    Interrupteur.objects.create(code="FF-WALLET", ouvert=False)
    remb = [q for t in api_client.get("/api/help/faq").json() for q in t["questions"] if q["q"] == "Quand arrive mon remboursement ?"]
    assert remb[0]["module"]["ouvert"] is False
    cherche = api_client.get("/api/help/faq", {"q": "relais", "lang": "en"}).json()
    assert cherche and all("relais" in (q["q"] + q["r"]).lower() for t in cherche for q in t["questions"])


def test_conversion_du_fichier_du_site():
    from pathlib import Path

    from apps.messaging.management.commands.charger_faq import DEFAUT, ts_vers_json

    ts = Path(__file__).resolve().parents[4] / "site" / "src" / "demo" / "faq.ts"
    if not ts.exists():
        pytest.skip("site absent")
    import json

    assert ts_vers_json(ts.read_text(encoding="utf-8")) == json.loads(DEFAUT.read_text(encoding="utf-8"))


# ── Rappel ──────────────────────────────────────────────────────────────────────────────────────────────


def test_rappel(api, carine):
    assert api.get("/api/support/callback").content in (b"", b"null")
    o, *_ = commande_retiree(carine)
    r = api.post("/api/support/callback", {"sujet": "Paiement", "commande": f"BLV-{o.pk}", "creneau": "Dès que possible"}, format="json")
    assert r.status_code == 200
    rappel = r.json()
    assert rappel["sujet"] == "Paiement" and rappel["commande"] == f"BLV-{o.pk}" and rappel["jour"] in ("aujourdhui", "demain")
    assert api.get("/api/support/callback").json() == rappel
    # Une nouvelle demande remplace la précédente.
    api.post("/api/support/callback", {"motif": "Livraison", "creneau": "Avant 12 h", "precision": "Après 9 h"}, format="json")
    assert DemandeRappel.objects.filter(annule_le__isnull=True).count() == 1
    assert api.get("/api/support/callback").json()["precision"] == "Après 9 h"
    assert api.delete("/api/support/callback").status_code == 204
    assert api.get("/api/support/callback").content in (b"", b"null")


def test_rappel_commande_d_un_autre_400(api):
    o, *_ = commande_retiree(creer_client())
    r = api.post("/api/support/callback", {"sujet": "x", "commande": f"BLV-{o.pk}", "creneau": "Avant 12 h"}, format="json")
    assert r.status_code == 400
    assert (
        api.post("/api/support/callback", {"sujet": "x", "creneau": "Avant 12 h", "precision": "x" * 201}, format="json").status_code == 400
    )
