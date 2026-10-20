from datetime import timedelta

import pytest

from apps.aftersales import services
from apps.aftersales.models import AvisCommande, VoteAvis
from apps.client_core.tests.outils import client_connecte, creer_client

from .fabriques import PNG_DATA_URL, commande_retiree

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _medias(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def carine():
    return creer_client(prenom="Carine")


@pytest.fixture
def api(carine):
    return client_connecte(carine)


def test_commande_a_noter(api, carine):
    o, *_ = commande_retiree(carine, prix=(18_500, 14_500))
    d = api.get(f"/api/orders/BLV-{o.pk}/reviews").json()
    assert d["fenetreJours"] == 7 and d["prenom"] == "Carine"
    c = d["commande"]
    assert c["ref"] == f"BLV-{o.pk}" and c["retireeLe"] and c["relais"] == "Relais Mvog-Ada" and c["gerant"] == "Mme Ngono"
    assert len(c["colis"]) == 2 and c["colis"][0]["produit"] and c["titre"].endswith(" +1")
    assert c["avis"] is None
    assert client_connecte(creer_client()).get(f"/api/orders/BLV-{o.pk}/reviews").status_code == 404


def test_noter_puis_modifier(api, carine):
    o, *_ = commande_retiree(carine)
    r = api.post(f"/api/orders/BLV-{o.pk}/reviews", {"notes": [5, 4], "commentaire": "Parfait", "photo": PNG_DATA_URL}, format="json")
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert api.get(f"/api/orders/BLV-{o.pk}/reviews").json()["commande"]["avis"]["notes"] == [5, 4]
    r = api.put(f"/api/orders/BLV-{o.pk}/reviews", {"notes": [2, 4], "commentaire": "Finalement abîmé", "photo": None}, format="json")
    assert r.status_code == 200
    a = AvisCommande.objects.get()
    assert a.notes == [2, 4] and a.note_basse is True and not a.photo  # AVIS-BAS : 2 étoiles ou moins


def test_une_note_par_colis_puis_le_relais(api, carine):
    o, *_ = commande_retiree(carine, prix=(1_000, 2_000))
    assert api.post(f"/api/orders/BLV-{o.pk}/reviews", {"notes": [5, 5]}, format="json").status_code == 400
    assert api.post(f"/api/orders/BLV-{o.pk}/reviews", {"notes": [5, 6, 5]}, format="json").status_code == 400


def test_non_retiree_ou_pas_a_moi_403(api, carine):
    o, *_ = commande_retiree(carine, etat="arrivee_relais")
    r = api.post(f"/api/orders/BLV-{o.pk}/reviews", {"notes": [5, 5]}, format="json")
    assert r.status_code == 403 and r.json()["error"]["code"] == "non_eligible"
    autre, *_ = commande_retiree(creer_client())
    assert api.post(f"/api/orders/BLV-{autre.pk}/reviews", {"notes": [5, 5]}, format="json").status_code == 403


def test_fenetre_fermee_410(api, carine):
    o, *_ = commande_retiree(carine, retiree_il_y_a=timedelta(days=8))
    r = api.post(f"/api/orders/BLV-{o.pk}/reviews", {"notes": [5, 5]}, format="json")
    assert r.status_code == 410 and r.json()["error"]["data"] == {"raison": "ferme"}


def test_avis_a_donner(carine):
    o, *_ = commande_retiree(carine)
    commande_retiree(carine, retiree_il_y_a=timedelta(days=9))
    a = services.avis_a_donner(carine)
    assert [x["ref"] for x in a] == [f"BLV-{o.pk}"] and a[0]["article"] and a[0]["jusqua"]
    AvisCommande.objects.create(client=carine, order_id=o.pk, notes=[5, 5])
    assert services.avis_a_donner(carine) == []


def test_vote_utile_et_signaler(api, carine):
    assert api.post("/api/reviews/42/vote", {"action": "utile"}, format="json").status_code == 204
    assert VoteAvis.objects.get().utile is True
    api.post("/api/reviews/42/vote", {"action": "utile"}, format="json")
    assert VoteAvis.objects.get().utile is False  # se décoche
    api.post("/api/reviews/42/vote", {"action": "signaler"}, format="json")
    assert VoteAvis.objects.count() == 1 and VoteAvis.objects.get().signale_le
    assert api.post("/api/reviews/abc/vote", {"action": "utile"}, format="json").status_code == 404
    assert api.post("/api/reviews/42/vote", {"action": "aimer"}, format="json").status_code == 400
