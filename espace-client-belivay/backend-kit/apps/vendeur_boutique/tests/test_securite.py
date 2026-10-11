# Vague « équipe » (INTEGRATION-API.md § 8) et pages ajoutées servies par vendeur_boutique : droits par employé
# (403 forbidden_right, interdits retirés d'office), suspension et réactivation, journal ; emplacements multiples et
# demandes de modification ; questions des clients ; Apprendre et présentation ; recherche ; flux des événements.
import pytest

from apps.otp.prestataires import SmsConsole
from apps.vendeur_boutique import ajouts, lieux
from apps.vendeur_boutique.models import AppareilVendeur, DemandeModification
from apps.vendeur_core.models import Boutique, Membre
from apps.vendeur_core.tests.outils import (
    ajouter_preparation,
    commande_client,
    creer_boutique_vendeur,
    creer_offre,
    preparation,
    proprietaire,
)

from .outils import cle, code_sms

pytestmark = pytest.mark.django_db
V = "/api/vendors"
TEL = "677124217"
MELEN = {"lat": 3.8651, "lon": 11.4932}  # zone exploitée Z6 (ZONES-EXPLOITEES)


@pytest.fixture(autouse=True)
def _sms():
    SmsConsole.ENVOYES.clear()


@pytest.fixture
def b():
    return creer_boutique_vendeur()


def _code(api, ident, motif):
    api.post(f"{V}/shop/members/{ident}/code", {"motif": motif}, format="json")
    return code_sms(TEL)


def test_droits_par_employe_et_403_forbidden_right(b):
    o = creer_offre(b)
    aicha = ajouter_preparation(b)
    api, prep = proprietaire(b), preparation(b)
    # Sans droits enregistrés : le rôle Préparation d'avant.
    m = next(x for x in api.get(f"{V}/shop/members").json()["membres"] if x["id"] == str(aicha.pk))
    assert m["profil"] == "preparation" and "produits.stock" in m["droits"] and m["etat"] == "actif"
    assert prep.get(f"{V}/stock").status_code == 200
    # Gestion du stock seulement ; « argent.voir » coché : retiré d'office.
    assert (
        api.put(f"{V}/shop/members/{aicha.pk}/rights", {"droits": ["argent.voir"], "code": "000000"}, format="json").json()["raison"]
        == "droits"
    )
    code = _code(api, aicha.pk, "droits")
    r = api.put(
        f"{V}/shop/members/{aicha.pk}/rights", {"droits": ["produits.stock", "argent.voir", "commandes.voir"], "code": code}, format="json"
    ).json()
    assert r["ok"] and r["membre"]["droits"] == ["commandes.voir", "produits.voir", "produits.stock"] and r["membre"]["profil"] == "stock"
    assert prep.get(f"{V}/session").json()["membre"]["droits"] == ["commandes.voir", "produits.voir", "produits.stock"]
    refus = prep.get(f"{V}/threads")
    assert refus.status_code == 403 and refus.json()["error"]["code"] == "forbidden_right"
    assert prep.post(f"{V}/shop/closed-today", {"fermee": True}, format="json").json()["error"]["code"] == "forbidden_right"
    assert prep.post(f"{V}/stock/{o.pk}/adjust", {"nouveau": 9, "type": "reappro"}, format="json", **cle()).json()["ok"]
    assert prep.get(f"{V}/orders", {"state": "prep"}).status_code == 200
    j = api.get(f"{V}/shop/members/{aicha.pk}/journal").json()
    assert j[0]["domaine"] == "produits" and j[0]["texte"].endswith("5 → 9")
    assert api.get(f"{V}/shop/members/999/journal").json() == []


def test_suspendre_reactiver_annuler(b):
    aicha = ajouter_preparation(b)
    AppareilVendeur.objects.create(membre=aicha, appareil_id="a1", nom="Android", jti="j1", premiere=aicha.depuis, vu_a=aicha.depuis)
    api, prep = proprietaire(b), preparation(b)
    assert api.post(f"{V}/shop/members/{b.membres.get(role='proprietaire').pk}/suspend").json()["raison"] == "proprietaire"
    r = api.post(f"{V}/shop/members/{aicha.pk}/suspend").json()
    assert r["ok"] and r["membre"]["etat"] == "suspendu" and r["membre"]["suspenduLe"]
    assert AppareilVendeur.objects.get(membre=aicha).revoque_le is not None
    assert prep.get(f"{V}/stock").json()["error"]["code"] == "pas_vendeur"  # session coupée tout de suite
    assert api.post(f"{V}/shop/members/{aicha.pk}/suspend").json()["raison"] == "etat"
    assert api.post(f"{V}/shop/members/{aicha.pk}/reactivate", {"code": "000000"}, format="json").json()["raison"] == "code"
    r = api.post(f"{V}/shop/members/{aicha.pk}/reactivate", {"code": _code(api, aicha.pk, "reactivation")}, format="json").json()
    assert r["ok"] and r["membre"]["etat"] == "actif" and prep.get(f"{V}/stock").status_code == 200
    # Invitation acceptée par le code, pas encore installée : annulable sans code.
    d = api.post(
        f"{V}/shop/members", {"prenomNom": "Mireille T.", "telephone": "694185266", "droits": ["messages.repondre"]}, format="json", **cle()
    ).json()
    m = api.post(f"{V}/shop/members/invitations/{d['invitation']}/confirm", {"code": code_sms(TEL)}, format="json", **cle()).json()[
        "membre"
    ]
    assert m["profil"] == "personnalise" and m["droits"] == ["messages.voir", "messages.repondre"] and m["inviteJusqua"] > m["depuis"]
    assert api.delete(f"{V}/shop/members/invitations/{aicha.pk}").json()["raison"] == "introuvable"
    e = api.delete(f"{V}/shop/members/invitations/{m['id']}").json()["equipe"]
    assert [h["action"] for h in e["historique"]][:4] == ["annulation", "ajout", "reactivation", "suspension"]
    assert not Membre.objects.get(pk=m["id"]).actif


def test_lieux_principal_et_centres(b):
    from apps.client_core.tests.outils import creer_relais

    creer_relais("Relais Melen", "Melen", lat="3.866000", lon="11.494000")
    ajouter_preparation(b)
    api, prep = proprietaire(b), preparation(b)
    l0 = api.get(f"{V}/shop/locations").json()
    assert len(l0["lieux"]) == 1 and l0["lieux"][0]["principal"] and l0["max"] == lieux.LIEUX_MAX
    assert {c["type"] for c in l0["centres"]} == {"centre_zone", "relais"}
    assert prep.get(f"{V}/shop/locations").status_code == 200 and prep.get(f"{V}/hubs").status_code == 200
    assert prep.post(f"{V}/shop/locations", {}, format="json", **cle()).json()["error"]["code"] == "owner_only"

    def ajouter(**n):
        corps = {
            "nom": "Entrepôt de Melen",
            "type": "entrepot",
            "adresse": "",
            "repere": "",
            "horaires": None,
            "position": MELEN,
            "precision": 12,
            "centre": None,
            **n,
        }
        return api.post(f"{V}/shop/locations", corps, format="json", **cle()).json()

    assert ajouter(nom="X")["raison"] == "nom"
    assert ajouter(precision=400)["raison"] == "position"
    assert ajouter(position={"lat": 4.05, "lon": 9.7})["raison"] == "hors_zone"
    lieu = ajouter()["lieu"]
    assert lieu["statut"] == "a_verifier" and lieu["zone"] == "Z6"
    centre = next(c for c in l0["centres"] if c["type"] == "relais")
    depot = ajouter(nom="Dépôt au relais", centre=centre["id"])["lieu"]
    assert depot["statut"] == "verifie" and depot["type"] == "collecte"
    # Un lieu à vérifier ne devient pas principal ; vérifié par l'agent de zone, avec le code : oui.
    assert api.post(f"{V}/shop/locations/{lieu['id']}/principal", {"code": "1"}, format="json").json()["raison"] == "a_verifier"
    lieux.verifier_lieu(int(lieu["id"]), True)
    api.post(f"{V}/shop/locations/principal-code")
    r = api.post(f"{V}/shop/locations/{lieu['id']}/principal", {"code": code_sms(TEL)}, format="json").json()
    assert r["ok"] and r["lieux"]["lieux"][0]["id"] == lieu["id"]
    b.refresh_from_db()
    assert b.zone == "Z6" and float(b.lat) == pytest.approx(MELEN["lat"])
    # Au-delà de 200 m : « À vérifier », l'ancien point sert.
    r = api.put(f"{V}/shop/locations/{depot['id']}/point", {"lat": 3.8700, "lon": 11.4932}, format="json").json()
    assert r["nouvelleVerification"] and r["lieu"]["statut"] == "a_verifier" and r["lieu"]["position"] == depot["position"]
    assert api.delete(f"{V}/shop/locations/{lieu['id']}").json()["raison"] == "principal"
    assert (
        api.patch(f"{V}/shop/locations/{depot['id']}", {"nom": "Relais de Melen"}, format="json").json()["lieu"]["nom"] == "Relais de Melen"
    )
    assert len(api.delete(f"{V}/shop/locations/{depot['id']}").json()["lieux"]["lieux"]) == 2


def test_demandes_de_modification(b):
    api = proprietaire(b)
    api.post(f"{V}/shop/change-requests/code")
    code = code_sms(TEL)

    def demander(**d):
        corps = {
            "champ": "officiel",
            "valeur": "",
            "rccm": "RC-YAO-2024-B-12345",
            "niu": "M012345678901A",
            "motif": "Passage en entreprise",
            "pieces": [{"nom": "rccm.pdf", "taille": 1000}],
            "code": code,
            **d,
        }
        return api.post(f"{V}/shop/change-requests", corps, format="json", **cle()).json()

    assert demander(rccm="12")["raison"] == "rccm"
    assert demander(niu="X")["raison"] == "niu"
    assert demander(motif="court")["raison"] == "motif"
    assert demander(pieces=[])["raison"] == "pieces"
    assert demander(code="000000")["raison"] == "code"
    d = demander()["demande"]
    assert (
        d["statut"] == "en_attente" and d["valeur"] == "RCCM RC-YAO-2024-B-12345 · NIU M012345678901A" and d["reponseAvant"] > d["creeeLe"]
    )
    assert demander()["raison"] == "deja"
    lieux.decider_demande(int(d["id"]), True, "Pièces conformes")
    b.refresh_from_db()
    assert b.statut == Boutique.Statut.ENTREPRISE and b.niu == "M012345678901A"
    dm = api.get(f"{V}/shop/change-requests").json()[0]
    assert dm["statut"] == "acceptee" and dm["historique"][-1]["par"] == "belivay"
    assert api.delete(f"{V}/shop/change-requests/{d['id']}").json()["raison"] == "etat"
    assert [e["type"] for e in api.get(f"{V}/events").json()["evenements"]] == ["demande_modification", "demande_decidee"]


def test_demande_annulee(b):
    api = proprietaire(b)
    api.post(f"{V}/shop/change-requests/code")
    n = api.post(
        f"{V}/shop/change-requests",
        {"champ": "nom", "valeur": "Tonton PG Express", "motif": "Nouvelle enseigne", "pieces": [], "code": code_sms(TEL)},
        format="json",
        **cle(),
    ).json()
    assert n["ok"] and api.delete(f"{V}/shop/change-requests/{n['demande']['id']}").json()["demande"]["statut"] == "annulee"
    assert DemandeModification.objects.get().statut == "annulee"


def test_questions_des_clients(b):
    o = creer_offre(b)
    ajouter_preparation(b)
    api, prep = proprietaire(b), preparation(b)
    q = ajouts.poser_question(o, "Le chargeur est inclus ? Appelez le 677 12 42 17")
    assert "677" not in q.texte
    lst = api.get(f"{V}/questions").json()
    assert lst["compteurs"] == {"a_repondre": 1, "repondue": 0, "signalee": 0, "toutes": 1} and lst["plusAncienne"]
    assert prep.post(f"{V}/questions/{q.pk}/answer", {"texte": "Oui, il est inclus."}, format="json", **cle()).json()["raison"] == "reserve"
    assert api.post(f"{V}/questions/{q.pk}/answer", {"texte": "court"}, format="json", **cle()).json()["raison"] == "court"
    assert (
        api.post(f"{V}/questions/{q.pk}/answer", {"texte": "Écrivez-moi à moi@exemple.cm"}, format="json", **cle()).json()["raison"]
        == "coordonnees"
    )
    r = api.post(f"{V}/questions/{q.pk}/answer", {"texte": "Oui, le chargeur est dans la boîte."}, format="json", **cle()).json()
    assert r["ok"] and r["question"]["etat"] == "repondue" and r["question"]["reponse"]["auteur"] == "Franck P."
    assert api.post(f"{V}/questions/{q.pk}/report", {"motif": "autre"}, format="json").json()["ok"]
    assert api.post(f"{V}/questions/filter", {"texte": "mon 677 12 42 17"}, format="json").json()["filtre"] is True
    m = api.post(f"{V}/questions/templates", {"titre": "Garantie", "texte": "Garantie de trois mois chez nous."}, format="json").json()[
        "modele"
    ]
    assert api.get(f"{V}/questions/templates").json()[0] == m
    assert api.delete(f"{V}/questions/templates/{m['id']}").status_code == 204
    assert all(not x["propre"] for x in api.get(f"{V}/questions/templates").json())


def test_apprendre_presentation_recherche_evenements(b):
    o = creer_offre(b)
    ajouter_preparation(b)
    api, prep = proprietaire(b), preparation(b)
    assert api.put(f"{V}/learning/progress/photos", {"etape": 1, "fait": True}, format="json").json() == ["photos:1"]
    assert prep.get(f"{V}/learning/progress").json() == []  # par membre
    assert api.put(f"{V}/learning/progress/photos", {"etape": "x", "fait": True}, format="json").status_code == 400
    assert api.delete(f"{V}/learning/progress/photos").json() == []
    assert api.patch(f"{V}/me", {"bio": "x" * 161}, format="json").json()["raison"] == "long"
    assert api.patch(f"{V}/me", {"bio": "WhatsApp 677 12 42 17"}, format="json").json()["raison"] == "coordonnees"
    assert (
        api.patch(f"{V}/me", {"bio": "Téléphones neufs depuis 2019."}, format="json").json()["profil"]["bio"]
        == "Téléphones neufs depuis 2019."
    )
    r = commande_client(o)
    from apps.vendeur_core.models import CommandeVendeur

    ref = CommandeVendeur.objects.get(order_id=r["order_id"]).ref
    s = api.get(f"{V}/search", {"q": ref}).json()["resultats"]
    assert s[0]["exact"] and s[0]["vers"] == f"commande?ref={ref}"
    assert api.get(f"{V}/search", {"q": "itel"}).json()["resultats"]
    ev = api.get(f"{V}/events").json()
    assert ev["evenements"][0]["type"] == "commande_payee" and ev["evenements"][0]["ref"] == ref
    assert api.get(f"{V}/events", {"depuis": ev["curseur"]}).json()["evenements"] == []
    assert prep.get(f"{V}/events").json()["evenements"][0]["canal"] == "order.paid"  # droit commandes.voir
    flux = api.get(f"{V}/events/stream")
    assert flux["Content-Type"].startswith("text/event-stream") and b"event: order.paid" in flux.content
    assert api.get(f"{V}/shop/activity").json()[0]["ref"] == ref
