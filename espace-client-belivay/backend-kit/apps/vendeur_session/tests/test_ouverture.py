# Ouverture en trois étapes (OUV, KYC, contrat) de bout en bout : refus de l'étape 1, code SMS → compte vendeur et
# jetons, pièces privées, numéro de versement, vérification (refus, 3 refus, accord → boutique créée), signature du
# contrat ; arrivée depuis l'espace client ; catégories et zone du point.
import base64
from datetime import datetime
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.client_core import pont
from apps.client_core.erreurs import ErreurClient
from apps.client_core.temps import YAOUNDE
from apps.client_core.tests.outils import client_connecte, creer_client
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import Boutique, Membre
from apps.vendeur_core.tests.outils import creer_boutique_vendeur
from apps.vendeur_session import ouverture
from apps.vendeur_session.models import DossierOuverture
from apps.vendeur_session.tests.outils import code

pytestmark = pytest.mark.django_db

BASTOS = {"lat": 3.896, "lon": 11.509, "precision": 12}
DOUALA = {"lat": 4.05, "lon": 9.7, "precision": 0}
PNG = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 32).decode()
JPG = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff" + b"0" * 32).decode()


@pytest.fixture(autouse=True)
def _prives(settings, tmp_path):
    settings.BELIVAY_FICHIERS_PRIVES = tmp_path / "prives"


def champs(**k):
    return {
        "nom": "Carine Mode",
        "categorie": "Mode Femme",
        "statut": "particulier",
        "telephone": "677 55 66 41",
        "point": BASTOS,
        "appareil": "tel-c",
        **k,
    }


def post(api, chemin, corps=None, **k):
    return api.post(f"/api/vendors/{chemin}", corps or {}, format="json", **k)


def ouvrir(api, **k):
    return post(api, "shops", champs(**k), HTTP_IDEMPOTENCY_KEY=f"ouvrir-{len(str(k))}-{k.get('nom', '')}-{k.get('telephone', '')}x").json()


def avec_jetons(r) -> APIClient:
    a = APIClient()
    a.credentials(HTTP_AUTHORIZATION=f"Bearer {r['jetons']['access']}")
    return a


def test_categories_et_zone():
    api = APIClient()
    cats = api.get("/api/vendors/categories").json()
    assert "Électronique" in cats and "Mode Femme" in cats
    assert api.get("/api/vendors/zone", {"lat": 3.896, "lon": 11.509}).json() == {"code": "Z1", "quartiers": "Bastos"}
    assert api.get("/api/vendors/zone", {"lat": 3.835, "lon": 11.486}).json()["code"] == "Z7"
    assert api.get("/api/vendors/zone", {"lat": 4.05, "lon": 9.7}).status_code == 404
    assert api.get("/api/vendors/zone", {"lat": "x"}).status_code == 404


def test_refus_de_l_etape_1():
    api = APIClient()
    assert ouvrir(api, nom="C") == {"ok": False, "raison": "nom"}
    assert ouvrir(api, categorie="Voitures") == {"ok": False, "raison": "categorie"}
    assert ouvrir(api, telephone="12345") == {"ok": False, "raison": "numero"}
    assert ouvrir(api, point=None) == {"ok": False, "raison": "point"}
    assert ouvrir(api, point=DOUALA) == {"ok": False, "raison": "hors_zone"}
    creer_boutique_vendeur()  # 677124217 : déjà le numéro d'un membre
    assert ouvrir(api, telephone="677124217") == {"ok": False, "raison": "deux_comptes"}
    assert post(api, "shops", {**champs(), "appareil": ""}, HTTP_IDEMPOTENCY_KEY="sans-appareil-1").status_code == 400
    assert api.get("/api/vendors/shops/current", {"appareil": "tel-c"}).status_code == 404


def test_ouverture_complete_jusqu_a_la_boutique_signee():
    api = APIClient()
    r = ouvrir(api)
    assert r["ok"] and r["envoi"]["destination"] == "677 •• •• 41"
    d = api.get("/api/vendors/shops/current", {"appareil": "tel-c"}).json()
    assert d["etape"] == "ouvrir" and d["ref"].startswith("VD-") and d["boutique"]["zone"] == {"code": "Z1", "quartiers": "Bastos"}
    assert d["boutique"]["point"]["precision"] == 12 and d["numeroVerifie"] is False
    assert api.get("/api/vendors/shops/current/code", {"appareil": "tel-c"}).json()["id"] == r["envoi"]["id"]
    assert post(api, "shops/current/resend", {"appareil": "tel-c"}).json()["raison"] == "trop_tot"
    # Recommencer l'étape 1 garde la même référence.
    assert ouvrir(api, nom="Carine Mode Femme")["ok"]
    assert api.get("/api/vendors/shops/current", {"appareil": "tel-c"}).json()["ref"] == d["ref"]
    faux = "000000" if code("677556641") != "000000" else "111111"
    assert post(api, "shops/current/verify", {"appareil": "tel-c", "code": faux}).json()["raison"] == "code"
    v = post(api, "shops/current/verify", {"appareil": "tel-c", "code": code("677556641")}).json()
    assert v["ok"] and set(v["jetons"]) == {"access", "refresh"}
    vendeur = avec_jetons(v)
    s = vendeur.get("/api/vendors/session").json()
    assert s["connecte"] is True and s["boutique"] is None
    d = vendeur.get("/api/vendors/shops/current").json()
    assert d["etape"] == "pieces" and d["numeroVerifie"] and d["boutique"]["telephone"] == "677 •• •• 41"
    # Le numéro MTN vérifié sert aussi au versement.
    assert d["versement"]["etat"] == "verifie" and d["versement"]["operateur"] == "MTN" and d["versement"]["masque"] == "···· 6641"
    assert vendeur.get("/api/vendors/shops/current/code").status_code == 404
    assert post(vendeur, "shops/current/resend").json()["raison"] == "trop_tot"

    # Étape 2 : pièces.
    def kyc(p, i, ref="current"):
        return post(vendeur, f"shops/{ref}/kyc", {"piece": p, "image": i}).json()

    assert kyc("recto", "") == {"ok": False, "raison": "illisible"}
    assert kyc("selfie", "data:image/png;base64,AAAA") == {"ok": False, "raison": "visage"}
    assert kyc("passeport", PNG) == {"ok": False, "raison": "illisible"}
    assert post(vendeur, "shops/current/submit", HTTP_IDEMPOTENCY_KEY="envoi-incomplet").json() == {"ok": False, "raison": "incomplet"}
    assert kyc("recto", PNG)["dossier"]["pieces"]["recto"]["etat"] == "recu"
    assert kyc("recto", JPG)["ok"]  # remplacée
    assert kyc("verso", PNG, d["ref"])["ok"]
    assert post(vendeur, "shops/VD-1999-0001/kyc", {"piece": "verso", "image": PNG}).status_code == 404
    dos = kyc("selfie", PNG)["dossier"]
    assert all(dos["pieces"][k]["etat"] == "recu" for k in ("recto", "verso", "selfie"))
    obj = DossierOuverture.objects.get(ref=d["ref"])
    assert obj.recto.name.endswith(".jpg") and obj.recto.storage.exists(obj.recto.name)
    with pytest.raises(ValueError):
        obj.recto.url  # noqa: B018 - jamais d'adresse publique
    # Numéro de versement : un autre numéro, Orange.
    assert post(vendeur, "shops/current/payout-number", {"telephone": "62"}).json() == {"ok": False, "raison": "numero"}
    assert post(vendeur, "shops/current/payout-number", {"telephone": "662000000"}).json() == {"ok": False, "raison": "operateur"}
    e = post(vendeur, "shops/current/payout-number", {"telephone": "699410890"}).json()
    assert e["ok"] and e["envoi"]["destination"] == "699 •• •• 90"
    assert (
        post(vendeur, "shops/current/payout-number/verify", {"code": faux if faux != code("699410890") else "222222"}).json()["raison"]
        == "code"
    )
    assert post(vendeur, "shops/current/payout-number/verify", {"code": code("699410890")}).json() == {"ok": True}
    d = vendeur.get("/api/vendors/shops/current").json()
    assert d["versement"]["operateur"] == "Orange" and d["versement"]["masque"] == "···· 0890"
    # Envoi pour vérification : date de réponse toujours affichée (48 h ouvrées).
    a = post(vendeur, "shops/current/submit", HTTP_IDEMPOTENCY_KEY="envoi-verification").json()
    assert a["ok"] and a["dossier"]["etape"] == "attente" and a["dossier"]["reponseAvant"] > a["dossier"]["envoyeA"]
    assert a["dossier"]["delais"] == {"autoMinutes": 15, "humainHeures": 48} and a["dossier"]["refusMax"] == 3
    # Signer avant l'accord : refusé.
    assert post(vendeur, "contract/sign", {"immatricule": False}, HTTP_IDEMPOTENCY_KEY="signer-trop-tot").json() == {
        "ok": False,
        "raison": "etape",
    }
    # Réponse du prestataire : refus avec motif, puis accord.
    r1 = ouverture.repondre_verification(d["ref"], False, "Photo floue.")
    assert (
        r1["etape"] == "pieces"
        and r1["refus"] == 1
        and r1["pieces"]["recto"] == {**r1["pieces"]["recto"], "etat": "refuse", "motif": "Photo floue."}
    )
    assert kyc("recto", PNG)["ok"]
    assert post(vendeur, "shops/current/submit", HTTP_IDEMPOTENCY_KEY="envoi-verification-2").json()["ok"]
    r2 = ouverture.repondre_verification(d["ref"], True)
    assert r2["etape"] == "contrat" and all(r2["pieces"][k]["etat"] == "verifie" for k in ("recto", "verso", "selfie"))
    assert ouverture.repondre_verification(d["ref"], False)["etape"] == "contrat"  # plus en attente : rien ne change
    b = Boutique.objects.get(nom="Carine Mode Femme")
    profil = pont.modele("vendeur").objects.get(pk=b.vendor_id)
    assert profil.status == "APPROVED" and profil.business_name == "Carine Mode Femme"
    assert b.identifiant == "@CarineModeFemme" and b.zone == "Z1" and b.numero_operateur == "Orange" and b.signature_le is None
    assert b.horaires[5] == {"jour": 5, "ouvert": True, "de": "08:00", "a": "14:00"} and b.passages[1]["de"] == "11:00"
    assert Membre.objects.get(boutique=b).role == "proprietaire"
    s = vendeur.get("/api/vendors/session").json()
    assert s["membre"]["role"] == "proprietaire" and s["boutique"]["nom"] == "Carine Mode Femme"
    # Étape 3 : contrat.
    c = r2["contrat"]
    assert c["minimumParCommande"] == 700 and c["plafondDemarrage"] == 500000 and c["commandesDemarrage"] == 10 and c["preavisJours"] == 30
    assert c["exemple"]["titre"] == "ITEL AC52" and c["exemple"]["prix"] == 20000 and c["exemple"]["gainDecouverte"] > 0
    assert "," in c["gardeMinPourCent"] or c["gardeMinPourCent"].isdigit()

    def signer(k, **o):
        return post(vendeur, "contract/sign", o, HTTP_IDEMPOTENCY_KEY=k).json()

    assert signer("signer-1", immatricule=True, rccm="faux", niu="M012345678901A") == {"ok": False, "raison": "rccm"}
    assert signer("signer-2", immatricule=True, rccm="RC-YAO-2024-B-01234", niu="faux") == {"ok": False, "raison": "niu"}
    sg = signer("signer-3", immatricule=True, rccm="rc-yao-2024-b-01234", niu="m012345678901a")
    assert (
        sg["ok"]
        and sg["dossier"]["etape"] == "signee"
        and sg["dossier"]["contrat"]["signeA"]
        and sg["dossier"]["contrat"]["rccm"] == "RC-YAO-2024-B-01234"
    )
    b.refresh_from_db()
    assert b.signature_le is not None and b.contrat_version == "2026-10" and b.statut == "entreprise" and b.niu == "M012345678901A"
    # Une nouvelle ouverture sur ce compte : refusée (409).
    assert post(vendeur, "shops", champs(telephone="677000111"), HTTP_IDEMPOTENCY_KEY="deuxieme-ouverture").status_code == 409
    # ANONYMAT : aucune pièce ni numéro complet dans le dossier.
    assert fuites(sg) == []


def test_trois_refus_verification_refusee():
    api = APIClient()
    ouvrir(api)
    v = avec_jetons(post(api, "shops/current/verify", {"appareil": "tel-c", "code": code("677556641")}).json())
    for p in ("recto", "verso", "selfie"):
        post(v, "shops/current/kyc", {"piece": p, "image": PNG})
    ref = v.get("/api/vendors/shops/current").json()["ref"]
    for i in range(3):
        post(v, "shops/current/kyc", {"piece": "recto", "image": PNG})
        assert post(v, "shops/current/submit", HTTP_IDEMPOTENCY_KEY=f"envoi-{i}-xxxx").json()["ok"]
        r = ouverture.repondre_verification(ref, False)
    assert r["etape"] == "refusee" and r["refus"] == 3 and r["pieces"]["recto"]["motif"]
    assert not Boutique.objects.filter(nom="Carine Mode").exists()
    with pytest.raises(ErreurClient):
        ouverture.repondre_verification("VD-0000-0000", True)
    # Après un refus définitif, une nouvelle ouverture repart d'un nouveau dossier.
    assert post(v, "shops", champs(), HTTP_IDEMPOTENCY_KEY="apres-refus-1").json()["ok"]
    assert v.get("/api/vendors/shops/current").json()["ref"] != ref


def test_le_numero_d_un_compte_client_rattache_le_meme_compte():
    from apps.client_accounts.services import enregistrer_numero

    carine = creer_client()
    enregistrer_numero(carine, "677556641")
    api = APIClient()
    assert ouvrir(api)["ok"]
    v = post(api, "shops/current/verify", {"appareil": "tel-c", "code": code("677556641")}).json()
    assert DossierOuverture.objects.get().user == carine and v["ok"]
    # Un autre compte connecté ne peut pas prendre ce numéro.
    autre = client_connecte(creer_client(prenom="Paul"))
    assert post(autre, "shops", champs(), HTTP_IDEMPOTENCY_KEY="autre-compte-1").json() == {"ok": False, "raison": "deux_comptes"}


def test_arrivee_depuis_l_espace_client():
    from apps.client_accounts.services import enregistrer_numero, ouvrir_boutique

    carine = creer_client()
    api = client_connecte(carine)
    assert api.get("/api/vendors/shops/from-client").status_code == 404
    enregistrer_numero(carine, "677556641")
    assert ouvrir_boutique(carine, "Carine Mode", "Mode Femme", "particulier")["ok"]
    a = api.get("/api/vendors/shops/from-client").json()
    assert a["prenom"] == "Carine" and a["boutique"] == {"nom": "Carine Mode", "categorie": "Mode Femme", "statut": "particulier"}
    assert a["telephone"] == "677 •• •• 41" and a["operateur"] == "MTN" and a["ref"].startswith("VD-")

    def confirmer(p, k):
        return api.post("/api/vendors/shops/from-client", {"point": p, "appareil": "tel-c"}, format="json", HTTP_IDEMPOTENCY_KEY=k).json()

    assert confirmer(None, "arrivee-1") == {"ok": False, "raison": "point"}
    assert confirmer(DOUALA, "arrivee-2") == {"ok": False, "raison": "hors_zone"}
    r = confirmer(BASTOS, "arrivee-3")
    d = r["dossier"]
    assert r["ok"] and d["depuisClient"] and d["etape"] == "pieces" and d["numeroVerifie"] and d["versement"]["etat"] == "verifie"
    assert api.get("/api/vendors/shops/from-client").json()["ref"] == d["ref"]
    assert confirmer(BASTOS, "arrivee-4")["dossier"]["ref"] == d["ref"]  # déjà ouverte : le même dossier
    assert api.get("/api/vendors/session").json()["connecte"] is True
    # À l'accord : le VendorProfile en attente devient la boutique, la pièce du compte client est vérifiée.
    for p in ("recto", "verso", "selfie"):
        post(api, "shops/current/kyc", {"piece": p, "image": PNG})
    post(api, "shops/current/submit", HTTP_IDEMPOTENCY_KEY="arrivee-envoi")
    ouverture.repondre_verification(d["ref"], True)
    from apps.client_accounts.models import BoutiqueClient

    bc = BoutiqueClient.objects.get(user=carine)
    assert bc.piece == "verifiee" and Boutique.objects.get(proprietaire=carine).vendor_id == bc.vendor_id
    assert pont.modele("vendeur").objects.get(pk=bc.vendor_id).status == "APPROVED"


def test_heures_ouvrees_sans_le_dimanche():
    samedi = datetime(2026, 9, 26, 12, tzinfo=YAOUNDE)
    assert ouverture.plus_heures_ouvrees(samedi, 24) == datetime(2026, 9, 28, 12, tzinfo=YAOUNDE)


def test_identifiant_unique_et_lecture_d_image():
    creer_boutique_vendeur(nom="X")
    Boutique.objects.filter(nom="X").update(identifiant="@CarineMode")
    assert ouverture._identifiant_libre("Carine Mode") == "@CarineMode2"
    assert ouverture._identifiant_libre("***") == "@Boutique"
    webp = b"RIFF\x00\x00\x00\x00WEBP" + b"0" * 8
    heic = b"\x00\x00\x00\x18ftypheic" + b"0" * 8
    assert ouverture._lire_image("data:image/webp;base64," + base64.b64encode(webp).decode())[1] == "webp"
    assert ouverture._lire_image("data:image/heic;base64," + base64.b64encode(heic).decode())[1] == "heic"
    assert ouverture._lire_image("pas une image") is None
    assert ouverture._lire_image("data:image/png;base64,@@@") is None

    class Fichier:
        def read(self, n):
            return b"\x89PNG\r\n\x1a\n0000"

    assert ouverture._lire_image(Fichier())[1] == "png"
    assert ouverture.zone_du_point(Decimal("3.9"), Decimal("11.51"))["code"] == "Z1"
