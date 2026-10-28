# Domaines « notifications » (centre lu par membre, urgent vivant, argent masqué pour la Préparation, réglages) et
# « aide » (questions avec montants calculés, sans l'argent pour la Préparation, recherche, coordonnées officielles).
import pytest
from django.utils import timezone

from apps.vendeur_boutique import services
from apps.vendeur_core.models import CommandeVendeur, NotificationVendeur
from apps.vendeur_core.services import garde_par_vente, notifier
from apps.vendeur_core.tests.outils import (
    ajouter_preparation,
    commande_client,
    creer_boutique_vendeur,
    creer_offre,
    preparation,
    proprietaire,
)

pytestmark = pytest.mark.django_db
V = "/api/vendors"


@pytest.fixture
def b():
    b = creer_boutique_vendeur()
    ajouter_preparation(b)
    return b


def test_centre_de_notifications(b):
    commande_client(creer_offre(b))  # « à préparer » (urgent, SMS)
    c = CommandeVendeur.objects.get(boutique=b)
    notifier(b, "versement", "Vendredi : 15 680 F", "Référence BLV-VS-1", "versements", argent=True)
    notifier(b, "sanction", "Avertissement", "Retard répété", "contester?d=12")
    api = proprietaire(b)
    d = api.get(f"{V}/notifications").json()
    assert [n["type"] for n in d] == ["sanction", "versement", "preparer"]
    p = d[2]
    assert p["canal"] == "sms" and p["urgent"] is True and p["lu"] is False and p["titre"] == {"modele": "Nouvelle commande à préparer"}
    assert d[0]["contester"] == "contester?d=12" and d[1]["contester"] is None
    assert [n["type"] for n in api.get(f"{V}/notifications?filter=urgent").json()] == ["preparer"]
    assert [n["type"] for n in api.get(f"{V}/notifications?filter=argent").json()] == ["versement"]
    assert api.get(f"{V}/notifications?filter=autre").json() == d
    # Préparation : aucune notification d'argent.
    prep = preparation(b)
    assert [n["type"] for n in prep.get(f"{V}/notifications").json()] == ["sanction", "preparer"]
    assert prep.get(f"{V}/notifications?filter=argent").json() == []
    assert api.get(f"{V}/notifications/counts").json() == {"tout": 3, "urgent": 1, "argent": 1, "nonLues": 3}
    # Lue par membre.
    assert api.post(f"{V}/notifications/{p['id']}/read").status_code == 204
    assert api.get(f"{V}/notifications/unread-count").json() == {"nonLues": 2}
    assert prep.get(f"{V}/notifications/unread-count").json() == {"nonLues": 2}
    api.post(f"{V}/notifications/{p['id']}/read", {"lue": False}, format="json")
    assert api.get(f"{V}/notifications/unread-count").json() == {"nonLues": 3}
    assert api.post(f"{V}/notifications/999/read").status_code == 404
    v = next(n for n in d if n["type"] == "versement")
    assert prep.post(f"{V}/notifications/{v['id']}/read").status_code == 404
    assert api.post(f"{V}/notifications/read-all").status_code == 204
    assert services.notifications_non_lues(b.membres.get(role="proprietaire")) == 0
    # Commande prête : plus urgente.
    CommandeVendeur.objects.filter(pk=c.pk).update(prete_a=timezone.now())
    assert api.get(f"{V}/notifications?filter=urgent").json() == []


def test_urgent_vivant_litige_et_sans_commande(b):
    n = notifier(b, "litige", "BLV-X", "x", "litige?ref=BLV-INCONNU", urgent=True)
    assert services._urgent(b, n) is True
    commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(boutique=b)
    n = notifier(b, "litige", "Litige", "x", f"litige?ref={c.ref}", urgent=True)
    assert services._urgent(b, n) is False  # aucun litige ouvert sur la commande
    n = notifier(b, "retour", "Retour", "x", f"retours?ref={c.ref}", urgent=True)
    assert services._urgent(b, n) is True
    NotificationVendeur.objects.filter(pk=n.pk).update(a=timezone.now() - timezone.timedelta(days=400))
    assert all(x["id"] != str(n.pk) for x in services.notifications(b, b.membres.get(role="proprietaire")))


def test_reglages(b):
    api, prep = proprietaire(b), preparation(b)
    d = api.get(f"{V}/notifications/settings").json()
    assert d == {
        "commandesEtLitiges": True,
        "versements": True,
        "avis": True,
        "conseils": True,
        "sonDistinct": True,
        "silence": ["21:00", "07:00"],
    }
    d = api.put(f"{V}/notifications/settings", {"avis": False, "versements": False, "commandesEtLitiges": False}, format="json").json()
    assert d["avis"] is False and d["versements"] is False and d["commandesEtLitiges"] is True
    d = prep.put(f"{V}/notifications/settings", {"versements": True, "conseils": False}, format="json").json()
    assert d["versements"] is False and d["conseils"] is False


def test_questions_d_aide(b):
    api = proprietaire(b)
    q = api.get(f"{V}/help/questions").json()
    assert len(q) == 10 and q[0]["id"] == "q1" and q[0]["ecran"] == "versements"
    q2 = next(x for x in q if x["id"] == "q2")
    assert q2["reponse"]["montants"] == {"prix": 20000, "garde": garde_par_vente(b, "Électronique", 20000)}
    q8 = next(x for x in q if x["id"] == "q8")
    assert set(q8["reponse"]["montants"]) == {"argent", "bronze"} and q8["reponse"]["valeurs"]["note"].count(",") == 1
    q9 = next(x for x in q if x["id"] == "q9")
    assert q9["reponse"]["valeurs"] == {"palier": "Bronze", "score": 63}
    assert next(x for x in q if x["id"] == "q10")["ecran"] is None
    # Préparation : ni les questions d'argent, ni aucun montant.
    p = preparation(b).get(f"{V}/help/questions").json()
    assert all(x["theme"] != "argent" for x in p) and all("montants" not in x["reponse"] for x in p)
    assert "Vous garderez" not in next(x for x in p if x["id"] == "q8")["reponse"]["modele"]
    # Recherche sans accents ; les produits interdits se trouvent par leur nom.
    assert [x["id"] for x in api.get(f"{V}/help/questions?q=GELE").json()] == ["q3"]
    assert [x["id"] for x in api.get(f"{V}/help/questions?q=contrefacon").json()] == ["q10"]


def test_charger_les_questions_deux_fois(b):
    assert services.charger_questions() == 10
    assert services.charger_questions(remplacer=False) == 10


def test_interdits_contacts_conseil(b):
    api = proprietaire(b)
    assert "Armes, munitions et explosifs" in api.get(f"{V}/help/forbidden-products").json()
    c = api.get(f"{V}/help/contacts").json()
    assert c["telephone"] == "+237 689 002 812" and c["telephoneLien"] == "tel:+237689002812" and c["email"] == "contact@belivay.com"
    assert c["whatsapp"] == "https://wa.me/237689002812" and c["horaires"] == ["07:00", "21:00"] and c["delaiReponseH"] == 2
    assert [r["nom"] for r in c["reseaux"]] == ["facebook", "instagram", "tiktok"]
    assert api.get(f"{V}/help/tip").json()["titre"].startswith("Des photos")
