# Domaine « boutique » : identité interne et aperçu client, « Fermer aujourd'hui » (Préparation : le jour même), horaires,
# pause, fermetures programmées, emplacement (200 m), repère, vitrine interne, avis (anonymes) et réponse privée.
from datetime import timedelta
from decimal import Decimal

import pytest

from apps.aftersales.models import AvisCommande
from apps.vendeur_boutique import services
from apps.vendeur_boutique.models import MessageSupportVendeur
from apps.vendeur_core import horloge
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import FermetureBoutique
from apps.vendeur_core.tests.outils import creer_boutique_vendeur, preparation, proprietaire

from .outils import cle, commande_retiree, valeurs_du_client

pytestmark = pytest.mark.django_db
V = "/api/vendors"


@pytest.fixture
def b():
    return creer_boutique_vendeur()


def test_ma_boutique_et_ce_que_voit_le_client(b):
    r = proprietaire(b).get(f"{V}/shop")
    assert r.status_code == 200
    d = r.json()
    assert d["nom"] == "Tonton PG" and d["titulaire"] == "Franck Penga" and d["statut"] == "particulier"
    assert d["apercuClient"] == {"palier": "Bronze", "trustScore": 62.7}
    assert d["position"] == {"lat": 3.852, "lon": 11.517}
    assert d["passageLivreur"] == [{"jours": "lun–dim", "de": "00:00", "a": "23:59"}]
    assert d["fermeeAujourdhui"] is False and d["fermeeJusqua"] is None and d["pause"] is None
    assert preparation(b).get(f"{V}/shop").status_code == 200


def test_jours_du_passage_en_mots():
    assert services._jours_texte([0, 1, 2, 3, 4]) == "lun–ven"
    assert services._jours_texte([5]) == "sam"
    assert services._jours_texte([0, 2]) == "lun, mer"


def test_fermer_aujourdhui_jusqua_la_prochaine_ouverture(b):
    api = preparation(b)
    d = api.post(f"{V}/shop/closed-today", {"fermee": True}, format="json").json()
    assert d["fermeeAujourdhui"] is True and d["fermeeLe"] == horloge.aujourd_hui().isoformat()
    assert d["fermeeJusqua"] > horloge.maintenant_ms()
    # L'accès Préparation rouvre le jour même (Q-18).
    d = api.post(f"{V}/shop/closed-today", {"fermee": False}, format="json").json()
    assert d["fermeeAujourdhui"] is False and d["fermeeJusqua"] is None
    # … mais ne rouvre pas une boutique fermée un autre jour.
    b.fermee_le = horloge.aujourd_hui() - timedelta(days=1)
    b.save()
    r = api.post(f"{V}/shop/closed-today", {"fermee": False}, format="json")
    assert r.status_code == 403 and r.json()["error"]["code"] == "owner_only"
    assert proprietaire(b).post(f"{V}/shop/closed-today", {"fermee": "oui"}, format="json").status_code == 400


def test_horaires(b):
    api = proprietaire(b)
    h = [{"jour": j, "ouvert": j < 6, "de": "08:00", "a": "18:00"} for j in range(7)]
    d = api.put(f"{V}/shop/hours", {"horaires": h}, format="json").json()
    assert d["ok"] and d["boutique"]["horaires"][0] == {"jour": 0, "ouvert": True, "de": "08:00", "a": "18:00"}
    h[0]["a"] = "07:00"
    assert api.put(f"{V}/shop/hours", {"horaires": h}, format="json").json() == {"ok": False, "raison": "ordre"}
    assert api.put(f"{V}/shop/hours", {"horaires": [{"jour": 9, "de": "x", "a": "y"}]}, format="json").status_code == 400
    assert api.put(f"{V}/shop/hours", {"horaires": "non"}, format="json").status_code == 400
    assert api.put(f"{V}/shop/hours", {}, format="json").status_code == 400
    assert preparation(b).put(f"{V}/shop/hours", {"horaires": h}, format="json").status_code == 403


def test_pause_et_reprise(b):
    api = proprietaire(b)
    assert api.post(f"{V}/shop/pause", {"jours": 31}, format="json").json() == {"ok": False, "raison": "duree"}
    assert api.post(f"{V}/shop/pause", {"jours": True}, format="json").json()["raison"] == "duree"
    d = api.post(f"{V}/shop/pause", {"jours": 7}, format="json").json()
    assert d["ok"] and d["boutique"]["pause"] is not None and d["boutique"]["fermeeAujourdhui"] is True
    assert d["boutique"]["pause"]["jusqua"] % 1000 == 0
    d = api.post(f"{V}/shop/resume").json()
    assert d["pause"] is None
    assert preparation(b).post(f"{V}/shop/pause", {"jours": 7}, format="json").status_code == 403


def test_fermetures_programmees(b):
    api = proprietaire(b)
    j = horloge.aujourd_hui()
    corps = lambda du, au: {"du": du.isoformat(), "au": au.isoformat(), "motif": " Fêtes "}  # noqa: E731
    assert (
        api.post(f"{V}/shop/closures", corps(j + timedelta(days=1), j + timedelta(days=2)), format="json", **cle()).json()["raison"]
        == "preavis_48h"
    )
    assert api.post(f"{V}/shop/closures", {"du": "x", "au": "2026-01-01"}, format="json", **cle()).json()["raison"] == "dates"
    assert (
        api.post(f"{V}/shop/closures", corps(j + timedelta(days=9), j + timedelta(days=5)), format="json", **cle()).json()["raison"]
        == "dates"
    )
    d = api.post(f"{V}/shop/closures", corps(j + timedelta(days=5), j + timedelta(days=9)), format="json", **cle()).json()
    assert d["ok"] and d["boutique"]["fermetures"][0]["motif"] == "Fêtes"
    fid = d["boutique"]["fermetures"][0]["id"]
    assert (
        api.post(f"{V}/shop/closures", corps(j + timedelta(days=8), j + timedelta(days=12)), format="json", **cle()).json()["raison"]
        == "chevauche"
    )
    # Écourter : « Rouvrir dès … » ; un jour hors de la fermeture est refusé.
    assert api.patch(f"{V}/shop/closures/{fid}", {"au": (j + timedelta(days=9)).isoformat()}, format="json").json()["raison"] == "dates"
    assert api.patch(f"{V}/shop/closures/999", {"au": (j + timedelta(days=6)).isoformat()}, format="json").json()["raison"] == "dates"
    d = api.patch(f"{V}/shop/closures/{fid}", {"au": (j + timedelta(days=6)).isoformat()}, format="json").json()
    assert d["ok"] and d["boutique"]["fermetures"][0]["au"] == (j + timedelta(days=6)).isoformat()
    d = api.delete(f"{V}/shop/closures/{fid}").json()
    assert d["fermetures"] == [] and FermetureBoutique.objects.get(pk=fid).annulee_le is not None
    assert preparation(b).delete(f"{V}/shop/closures/{fid}").status_code == 403


def test_fermeture_du_jour_dans_la_boutique(b):
    j = horloge.aujourd_hui()
    FermetureBoutique.objects.create(boutique=b, du=j, au=j, annoncee_le=horloge.maintenant())
    assert proprietaire(b).get(f"{V}/shop").json()["fermeeAujourdhui"] is True


def test_emplacement_200_metres(b):
    api = proprietaire(b)
    # 100 m environ au nord : le point change tout de suite.
    d = api.put(f"{V}/shop/location", {"lat": 3.8529, "lon": 11.517}, format="json").json()
    assert d["ok"] and d["nouvelleVerification"] is False and 90 < d["metres"] < 110
    assert d["boutique"]["position"]["lat"] == 3.8529 and d["boutique"]["point"]["enAttente"] is None
    # 1,1 km : nouvelle vérification, l'ancien point sert jusque-là (Q-91).
    d = api.put(f"{V}/shop/location", {"lat": 3.8629, "lon": 11.517}, format="json").json()
    assert d["nouvelleVerification"] is True and d["metres"] > 1000
    assert d["boutique"]["position"]["lat"] == 3.8529 and d["boutique"]["point"]["enAttente"]["lat"] == 3.8629
    b.refresh_from_db()
    services.valider_point(b)
    assert b.lat == Decimal("3.862900") and b.point_attente is None and b.point_verifie_le == horloge.aujourd_hui()
    assert api.put(f"{V}/shop/location", {"lat": "nord", "lon": 1}, format="json").status_code == 400
    assert api.put(f"{V}/shop/location", {"lat": 95, "lon": 1}, format="json").status_code == 400
    assert api.put(f"{V}/shop/location", {"lat": 3.8}, format="json").status_code == 400
    assert preparation(b).put(f"{V}/shop/location", {"lat": 3.8, "lon": 11.5}, format="json").status_code == 403


def test_premier_point(b):
    b.lat = b.lon = None
    b.save()
    d = services.replacer(b, 3.85, 11.5)
    assert d["metres"] == 0 and d["nouvelleVerification"] is False


def test_repere_et_vitrine(b):
    api = proprietaire(b)
    assert api.put(f"{V}/shop/landmark", {"repere": "  "}, format="json").json()["raison"] == "vide"
    assert api.put(f"{V}/shop/landmark", {"repere": "x" * 121}, format="json").json()["raison"] == "long"
    assert api.put(f"{V}/shop/landmark", {"repere": "à côté du marché"}, format="json").json()["boutique"]["repere"] == "à côté du marché"
    assert api.patch(f"{V}/shop/showcase", {"description": "x" * 301}, format="json").json()["raison"] == "long"
    assert api.patch(f"{V}/shop/showcase", {"logo": "x" * (5 * 1024 * 1024)}, format="json").json() == {
        "ok": False,
        "raison": "long",
        "detail": "logo",
    }
    assert api.patch(f"{V}/shop/showcase", {"photo": 12}, format="json").status_code == 400
    d = api.patch(
        f"{V}/shop/showcase", {"photo": "data:image/png;base64,AAAA", "logo": None, "description": " Téléphones "}, format="json"
    ).json()
    assert d["boutique"]["vitrine"] == {"photo": "data:image/png;base64,AAAA", "logo": None, "description": "Téléphones"}
    assert preparation(b).patch(f"{V}/shop/showcase", {"description": "x"}, format="json").status_code == 403
    assert preparation(b).put(f"{V}/shop/landmark", {"repere": "x"}, format="json").status_code == 403


# ── Avis (anonymes, achat vérifié) et réponse privée ─────────────────────────────────────────────────────


def _avis(b, note=4, commentaire="Très bien, appelez-moi au 677 11 22 33", il_y_a_jours=2):
    c, r = commande_retiree(b)
    a = AvisCommande.objects.create(client=r["client"], order_id=c.order_id, notes=[note, 5], commentaire=commentaire)
    AvisCommande.objects.filter(pk=a.pk).update(envoye_le=horloge.maintenant() - timedelta(days=il_y_a_jours))
    return c, r, a


def test_avis_anonymes_et_achat_verifie(b):
    c, r, a = _avis(b)
    _avis(b, note=2, commentaire="")
    for api in (proprietaire(b), preparation(b)):
        d = api.get(f"{V}/reviews").json()
        assert d["nombre"] == 2 and d["note"] == 3.0 and d["poidsPourCent"] == 20
        x = next(x for x in d["liste"] if x["ref"] == c.ref)
        assert x["id"] == f"{a.pk}-1" and x["note"] == 4 and x["verifie"] is True and x["reponse"] is None
        assert x["commentaire"] == "Très bien, appelez-moi au •••"
        assert [j["etape"] for j in x["journal"]] == ["prete", "ramassage", "tournee"]
        assert "2 photos" in x["journal"][1]["texte"]
        assert fuites(d, valeurs_interdites=valeurs_du_client(r)) == []
    assert next(x for x in d["liste"] if x["ref"] != c.ref)["commentaire"] is None


def test_sans_avis(b):
    assert proprietaire(b).get(f"{V}/reviews").json() == {"note": None, "nombre": 0, "poidsPourCent": 20, "liste": []}


def test_journal_d_un_avis():
    from types import SimpleNamespace

    t = horloge.maintenant()
    c = SimpleNamespace(prete_a=t, echeance=t - timedelta(minutes=30), remise_a=None, payee_a=t, photos_remise=[])
    j = services._journal_avis(c, t + timedelta(days=3))
    assert j[0]["texte"] == "30 min après l’échéance" and j[1]["texte"] == "Retirée au relais 3 jours après"


def test_reponse_privee_par_le_support(b):
    c, r, a = _avis(b)
    api = proprietaire(b)
    ident = f"{a.pk}-1"
    url = f"{V}/reviews/{ident}/private-reply"
    assert preparation(b).post(url, {"texte": "Merci beaucoup pour votre avis."}, format="json", **cle()).status_code == 403
    assert api.post(url, {"texte": "Merci"}, format="json", **cle()).json()["raison"] == "trop_court"
    assert api.post(url, {"texte": "Écrivez-moi sur contact@tontonpg.cm"}, format="json", **cle()).json()["raison"] == "coordonnees"
    assert (
        api.post(f"{V}/reviews/0-1/private-reply", {"texte": "Merci beaucoup pour votre avis."}, format="json", **cle()).json()["raison"]
        == "delai_depasse"
    )
    d = api.post(url, {"texte": "Merci beaucoup pour votre avis."}, format="json", **cle()).json()
    assert d == {"ok": True, "fil": "support"}
    m = MessageSupportVendeur.objects.filter(boutique=b, de="vendeur").last()
    assert c.ref in m.texte and "Merci beaucoup" in m.texte and m.auteur == "Franck"
    assert api.post(url, {"texte": "Merci encore pour votre avis."}, format="json", **cle()).json()["raison"] == "deja_repondu"
    x = api.get(f"{V}/reviews").json()["liste"][0]
    assert x["reponse"]["texte"] == "Merci beaucoup pour votre avis." and x["reponse"]["fil"] == "support"


def test_reponse_apres_30_jours(b):
    _, _, a = _avis(b, il_y_a_jours=31)
    d = (
        proprietaire(b)
        .post(f"{V}/reviews/{a.pk}-1/private-reply", {"texte": "Merci beaucoup pour votre avis."}, format="json", **cle())
        .json()
    )
    assert d["raison"] == "delai_depasse"
