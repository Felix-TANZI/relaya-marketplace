# Domaine « messages » : le vendeur répond dans les conversations du client (kit client, apps.messaging), anonymes dans
# les deux sens ; filtre des coordonnées ; signature du membre ; non lus ; conversation fermée ; Support BelivaY.
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.messaging.models import Message
from apps.vendeur_boutique import services
from apps.vendeur_boutique.models import MessageSupportVendeur
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import CommandeVendeur
from apps.vendeur_core.tests.outils import (
    ajouter_preparation,
    commande_client,
    creer_boutique_vendeur,
    creer_offre,
    preparation,
    proprietaire,
)

from .outils import cle, valeurs_du_client

pytestmark = pytest.mark.django_db
V = "/api/vendors"


@pytest.fixture
def b():
    return creer_boutique_vendeur()


def _question(api_client, offre, texte="Bonjour, la couleur noire est bien celle de la photo ?"):
    r = api_client.post("/api/messages/threads", {"produit": str(offre.product_id), "texte": texte}, format="json")
    assert r.status_code == 200, r.content
    return r.json()["id"]


def test_question_avant_l_achat(b):
    from apps.client_core.tests.outils import client_connecte, creer_client

    offre = creer_offre(b)
    client = creer_client()
    _question(client_connecte(client), offre, "Mon numéro : 699 88 77 66")
    d = proprietaire(b).get(f"{V}/threads").json()
    f = next(x for x in d if x["type"] == "commande")
    assert f["ref"] is None and f["sujet"] == "Question d’un client" and f["commande"]["etape"] == "avant l’achat" and f["nonLus"] == 1
    assert f["dernier"]["texte"] == "Mon numéro : •••" and f["dernier"]["filtre"] is True and f["dernier"]["auteur"] is None
    assert fuites(d, valeurs_interdites=(client.first_name, client.email, "699 88 77 66")) == []


def test_conversation_de_commande_anonyme_et_reponse_signee(b):
    offre = creer_offre(b)
    r = commande_client(offre)
    cle_fil = _question(r["api"], offre)
    c = CommandeVendeur.objects.get(boutique=b)
    api = proprietaire(b)
    fils = api.get(f"{V}/threads").json()
    f = next(x for x in fils if x["type"] != "support")
    assert f["ref"] == c.ref and f["sujet"] == f"Client de {c.ref}" and f["ferme"] is False
    assert (
        f["commande"]["titre"] == "ITEL AC52"
        and f["commande"]["etape"] == "à préparer"
        and f["commande"]["echeance"] == int(c.echeance.timestamp() * 1000)
    )
    assert services.messages_non_lus(b) == 1
    # Réponse : filtrée, signée par le membre, lue par le client « Le vendeur ».
    m = api.post(f"{V}/threads/{f['id']}/messages", {"texte": "Oui ! Appelez-moi au 677 12 42 17"}, format="json", **cle()).json()
    assert m["de"] == "vendeur" and m["auteur"] == "Franck" and m["texte"] == "Oui ! Appelez-moi au •••" and m["filtre"] is True
    vu = Message.objects.filter(conversation__cle=cle_fil, de="eux").last()
    assert vu.qui == "Le vendeur" and "677" not in vu.texte
    conv_client = r["api"].get(f"/api/me/threads/{cle_fil}").json()["conversation"]
    assert "Franck" not in str(conv_client) and "Tonton" not in str(conv_client)
    assert services.messages_non_lus(b) == 0
    # Le client relance ; l'employée répond.
    r["api"].post(f"/api/me/threads/{cle_fil}/messages", {"texte": "Le livreur passe à quelle heure ?"}, format="json")
    ajouter_preparation(b)
    d = preparation(b).get(f"{V}/threads/{f['id']}").json()
    assert [x["de"] for x in d["messages"]] == ["client", "vendeur", "client"] and d["fil"]["nonLus"] == 1
    assert fuites(d, valeurs_interdites=valeurs_du_client(r)) == []
    assert fuites(fils, valeurs_interdites=valeurs_du_client(r)) == []
    assert preparation(b).post(f"{V}/threads/{f['id']}/read").status_code == 204
    assert services.messages_non_lus(b) == 0
    m = preparation(b).post(f"{V}/threads/{f['id']}/messages", {"texte": "Entre 14 h et 16 h."}, format="json", **cle()).json()
    assert m["auteur"] == "Aïcha"


def test_conversation_fermee_a_la_fin_du_delai(b):
    from apps.pickup.models import SousCommande

    offre = creer_offre(b)
    r = commande_client(offre)
    _question(r["api"], offre)
    c = CommandeVendeur.objects.get(boutique=b)
    SousCommande.objects.filter(order_id=c.order_id).update(etat="remise", remise_le=timezone.now() - timedelta(days=20))
    CommandeVendeur.objects.filter(pk=c.pk).update(prete_a=c.payee_a, remise_a=c.payee_a)
    api = proprietaire(b)
    f = next(x for x in api.get(f"{V}/threads").json() if x["type"] != "support")
    assert f["ferme"] is True and f["commande"]["etape"] == "livrée"
    r2 = api.post(f"{V}/threads/{f['id']}/messages", {"texte": "Merci"}, format="json", **cle())
    assert r2.status_code == 409 and r2.json()["error"]["code"] == "ferme"
    # Annulée : fermée aussi.
    CommandeVendeur.objects.filter(pk=c.pk).update(annulee_a=timezone.now())
    f = next(x for x in api.get(f"{V}/threads").json() if x["type"] != "support")
    assert f["ferme"] is True and f["commande"]["etape"] == "annulée"


def test_etapes_de_la_carte():
    from types import SimpleNamespace as N

    f = N(gel=None, retrait=None)
    assert services._etape(N(annulee_a=None, remise_a=1, prete_a=1), f) == "chez le livreur"
    assert services._etape(N(annulee_a=None, remise_a=None, prete_a=1), f) == "prête"
    assert services._etape(N(annulee_a=None), N(gel="litige", retrait=None)) == "litige"
    assert services._etape(N(annulee_a=None), N(gel="retour", retrait=None)) == "retour"


def test_conversation_inconnue_et_vides(b):
    api = proprietaire(b)
    assert api.get(f"{V}/threads/c999").status_code == 404
    assert api.get(f"{V}/threads/xyz").status_code == 404
    assert api.post(f"{V}/threads/c999/messages", {"texte": "x"}, format="json", **cle()).status_code == 404
    assert api.post(f"{V}/threads/c999/read").status_code == 404
    assert api.post(f"{V}/threads/support/messages", {"texte": "  "}, format="json", **cle()).json()["error"]["code"] == "vide"


def test_support_belivay(b):
    api = proprietaire(b)
    d = api.get(f"{V}/threads/support").json()
    assert d["fil"]["sujet"] == "Support BelivaY" and d["messages"] == []
    assert api.post(f"{V}/threads/support", {"texte": "Mon versement ?", "ref": "BLV-1"}, format="json", **cle()).json() == {
        "fil": "support"
    }
    d = api.get(f"{V}/threads/support").json()
    assert [m["de"] for m in d["messages"]] == ["vendeur", "support"] and d["messages"][0]["texte"] == "BLV-1 · Mon versement ?"
    assert d["messages"][0]["auteur"] == "Franck" and "2 h" in d["messages"][1]["texte"] and d["fil"]["nonLus"] == 0
    m = api.post(f"{V}/threads/support/messages", {"texte": "Merci"}, format="json", **cle()).json()
    assert m["de"] == "vendeur"
    services.repondre_support(b, "C'est parti vendredi.")
    assert services.messages_non_lus(b) == 1 and b.notifications.filter(type="message").exists()
    api.post(f"{V}/threads/support/read")
    assert services.messages_non_lus(b) == 0
    assert MessageSupportVendeur.objects.filter(boutique=b).count() == 5


def test_reponses_rapides(b):
    api = proprietaire(b)
    assert api.get(f"{V}/quick-replies?type=litige").json()[0].startswith("Je regarde")
    assert api.get(f"{V}/quick-replies").json() == services.REPONSES_RAPIDES["commande"]
