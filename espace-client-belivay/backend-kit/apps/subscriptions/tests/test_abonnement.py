# backend/apps/subscriptions/tests/test_abonnement.py
# Routes de l'abonnement, cagnotte, abonnement offert, parrainage.

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.client_core.models import Interrupteur
from apps.client_core.tests.outils import client_connecte, creer_client
from apps.pickup.models import LigneSousCommande, MontantsCommande, SousCommande
from apps.subscriptions import services
from apps.subscriptions.models import Abonnement, CreditCagnotte, EssaiUtilise, Prelevement
from apps.wallet import services as wallet
from apps.wallet.prestataires import CarteConsole, MobileMoneyConsole
from belivay_moteurs.frais import FraisPanier

pytestmark = pytest.mark.django_db
NUMEROS = {}
MOYEN = "MTN MoMo · 6 77 ·· ·· 41"


@pytest.fixture(autouse=True)
def _numeros(monkeypatch):
    NUMEROS.clear()
    monkeypatch.setattr("apps.wallet.compte.numero_du_compte", lambda u: NUMEROS.get(u.pk, ""))


@pytest.fixture
def client_():
    u = creer_client()
    NUMEROS[u.pk] = "677123441"
    return u


@pytest.fixture
def api(client_):
    return client_connecte(client_)


def _cle(n):
    return {"HTTP_IDEMPOTENCY_KEY": f"cle-abo-{n:04d}"}


def _souscrire(api, palier="prime", formule="mois", n=1, moyen=MOYEN):
    return api.post("/api/me/subscription", {"palier": palier, "formule": formule, "moyen": moyen}, format="json", **_cle(n))


def test_prime_sans_abonnement(api):
    d = api.get("/api/me/subscription").json()
    assert d["abonnement"] is None and d["actif"] is False and d["essaiUtilise"] is False
    assert d["usage"] == {"relais": 0, "domicile": 0, "total": 0}
    assert d["parrainage"]["lien"].startswith("belivay.com/p/") and d["business"] == "aucune"


def test_module_ferme_404(api):
    Interrupteur.objects.create(code="FF-ABONNEMENT", ouvert=False)
    assert api.get("/api/me/subscription").status_code == 404
    assert api.post("/api/me/cagnotte/payout").status_code == 404


def test_souscrire_essai_puis_renouvellement_au_tarif(api, client_):
    r = _souscrire(api)
    assert r.status_code == 200, r.content
    a = r.json()
    assert a["palier"] == "prime" and a["montant"] == 4000 and a["moyen"] == MOYEN and a["echec"] is None
    assert MobileMoneyConsole.DEMANDES[-1]["montant_xaf"] == 1500  # ABO-ESSAI
    assert a["prochain"] - a["debut"] == 30 * 86_400_000
    d = api.get("/api/me/subscription").json()
    assert d["actif"] and d["essaiUtilise"]
    # Deuxième souscription Prime au mois sur le même compte : plein tarif, pas d'erreur
    _souscrire(api, n=2)
    assert MobileMoneyConsole.DEMANDES[-1]["montant_xaf"] == 4000


def test_essai_deja_utilise_par_ce_numero_409(api, client_):
    autre = creer_client()
    NUMEROS[autre.pk] = "677123441"
    EssaiUtilise.objects.create(client=autre, numero_empreinte=services._numero_essai(autre))
    r = _souscrire(api)
    assert r.status_code == 409 and r.json()["error"]["code"] == "trial_used"
    assert not Abonnement.objects.exists()


def test_souscrire_moyen_inconnu_et_palier_invalide(api):
    assert _souscrire(api, moyen="m999").status_code == 422
    assert _souscrire(api, palier="or", n=2).status_code == 400
    assert _souscrire(api, palier="pass", formule="mois", n=3).status_code == 400


def test_pass_7_jours_et_delai(api):
    a = _souscrire(api, "pass", "pass").json()
    assert a["prochain"] is None and a["fin"] - a["debut"] == 7 * 86_400_000 and a["montant"] == 1500
    r = _souscrire(api, "pass", "pass", n=2)
    assert r.status_code == 422 and r.json()["error"]["code"] == "pass_trop_tot"


def test_prelevement_refuse_grace_puis_payer(api, client_):
    _souscrire(api, "plus", "mois")
    pr = Prelevement.objects.get()
    services.confirmer_prelevement(pr.reference, reussi=False)
    a = api.get("/api/me/subscription").json()
    assert a["actif"] and a["abonnement"]["echec"]["tentatives"] == 1 and a["abonnement"]["prochain"] is None
    # Grâce finie (ABO-GRACE = 7 jours) : palier Gratuit
    Abonnement.objects.update(echec_le=timezone.now() - timedelta(days=8))
    assert api.get("/api/me/subscription").json()["actif"] is False
    r = api.post("/api/me/subscription/pay", {"moyen": MOYEN}, format="json", **_cle(9)).json()
    assert r["echec"] is None and r["montant"] == 2500
    assert abs(r["prochain"] - (timezone.now() + timedelta(days=30)).timestamp() * 1000) < 60_000  # à partir d'aujourd'hui
    assert api.get("/api/me/subscription").json()["actif"]


def test_resilier_reprendre_changer_moyen(api, client_):
    a = _souscrire(api, "duo", "an").json()
    assert api.post("/api/me/subscription/cancel").status_code == 204
    d = api.get("/api/me/subscription").json()["abonnement"]
    assert d["resilie"] and d["fin"] == a["prochain"] and d["prochain"] is None
    assert api.post("/api/me/subscription/resume").status_code == 204
    d = api.get("/api/me/subscription").json()["abonnement"]
    assert d["resilie"] is None and d["prochain"] == a["prochain"]
    api.post("/api/me/cartes", {"jeton": "tok_visa_4242"}, format="json")
    assert api.patch("/api/me/subscription", {"moyen": "Visa •••• 4242"}, format="json").status_code == 204
    assert api.get("/api/me/subscription").json()["abonnement"]["moyen"] == "Visa •••• 4242"


def test_offrir_a_un_numero_inconnu_et_a_soi(api, client_):
    assert api.post(
        "/api/subscription-gifts",
        {"numero": "12", "prenom": "Awa", "palier": "prime", "mois": 3, "message": "", "carte": "tok_x"},
        format="json",
    ).json() == {"ok": False, "raison": "inconnu"}
    r = api.post(
        "/api/subscription-gifts",
        {"numero": "699887766", "prenom": "Awa", "palier": "prime", "mois": 3, "message": "Bon courage", "carte": "tok_visa"},
        format="json",
    ).json()
    assert r["ok"] and r["pourCeCompte"] is False and r["du"] is None and r["ref"].startswith("CAD-")
    assert CarteConsole.PAIEMENTS[-1]["montant_xaf"] == 12_000 + 240  # 3 mois + frais carte 2 %
    # Le cadeau attend l'inscription du numéro
    nouveau = creer_client()
    assert services.appliquer_cadeaux_en_attente(nouveau, "699887766") == 1
    assert services.courant(nouveau).offert_par == client_.first_name
    # À soi : commence à la fin de l'abonnement en cours
    actuel = _souscrire(api, "plus", "mois").json()
    r = api.post(
        "/api/subscription-gifts",
        {"numero": "677123441", "prenom": "Moi", "palier": "duo", "mois": 12, "message": "", "carte": "tok_visa"},
        format="json",
    ).json()
    assert r["pourCeCompte"] and r["du"] == actuel["prochain"] and r["au"] - r["du"] == 365 * 86_400_000
    d = api.get("/api/me/subscription").json()["abonnement"]
    assert d["palier"] == "duo" and d["prochain"] is None and d["montant"] == 0


def test_offrir_carte_refusee(api):
    r = api.post(
        "/api/subscription-gifts",
        {"numero": "699887766", "prenom": "Awa", "palier": "plus", "mois": 1, "message": "", "carte": "tok_refus"},
        format="json",
    )
    assert r.status_code == 422 and r.json()["error"]["code"] == "carte_refusee"


def test_offrir_avec_3d_secure_puis_webhook(api):
    # La banque demande 3-D Secure : 422 action_requise avec l'adresse de la banque ; le cadeau attend (pas appliqué) ;
    # le webhook du prestataire (client_core.webhooks) l'applique au bénéficiaire, une seule fois ; refusé : jamais.
    from apps.client_core.webhooks import confirmer_paiement_externe
    from apps.subscriptions.models import AbonnementOffert

    awa = creer_client("Awa")
    from apps.client_accounts.services import enregistrer_numero

    enregistrer_numero(awa, "699887766")
    corps = {"numero": "699887766", "prenom": "Awa", "palier": "prime", "mois": 3, "message": "", "carte": "tok_3ds"}
    r = api.post("/api/subscription-gifts", corps, format="json", **_cle(31))
    assert r.status_code == 422 and r.json()["error"]["code"] == "action_requise"
    data = r.json()["error"]["data"]
    assert data["redirection"].startswith("https://") and data["ref"].startswith("CAD-")
    cadeau = AbonnementOffert.objects.get(ref=data["ref"])
    assert cadeau.paiement == "action" and cadeau.abonnement is None
    assert services.appliquer_cadeaux_en_attente(creer_client(), "699887766") == 0  # pas payé : jamais appliqué
    assert confirmer_paiement_externe(cadeau.paiement_ref) == "abonnement"
    cadeau.refresh_from_db()
    assert cadeau.paiement == "paye" and services.courant(awa).offert_par
    assert confirmer_paiement_externe(cadeau.paiement_ref) == "abonnement"  # rejoué : sans effet
    # Refusé par la banque : le cadeau n'est jamais appliqué.
    r = api.post("/api/subscription-gifts", {**corps, "numero": "699887700"}, format="json", **_cle(32))
    refuse = AbonnementOffert.objects.get(ref=r.json()["error"]["data"]["ref"])
    services.confirmer_cadeau(refuse.paiement_ref, reussi=False)
    refuse.refresh_from_db()
    assert refuse.paiement == "refuse" and services.appliquer_cadeaux_en_attente(creer_client(), "699887700") == 0


def _commande(user, order_id, sous_total=11_800, prime=0, mode="relais"):
    mc = MontantsCommande.objects.create(
        order_id=order_id,
        client=user,
        sous_total=sous_total,
        ramassages=500,
        remises=400,
        total=sous_total + 900 - prime,
        prime=prime,
        mode=mode,
        version_parametres="t",
        moyen="mtn",
        etat_paiement="payee",
        payee_le=timezone.now(),
    )
    sc = SousCommande.objects.create(order_id=order_id, n=1, boutique="B", sous_total=sous_total)
    LigneSousCommande.objects.create(sous_commande=sc, product_id=1, titre="Écouteurs sans fil", prix=sous_total, qte=1)
    return mc


def test_cagnotte_attente_credit_au_portefeuille(api, client_):
    _souscrire(api, "prime", "mois")
    _commande(client_, 52001, 11_800, prime=900)
    d = api.get("/api/me/subscription").json()
    assert d["cagnotte"]["attente"][0] == {
        "ref": "BLV-52001",
        "produit": "Écouteurs sans fil",
        "dessin": "",
        "base": 11_800,
        "montant": 236,
    }
    assert d["usage"] == {"relais": 1, "domicile": 0, "total": 1} and d["economies"]["relais"] == 900
    assert services.cagnotte_en_attente(client_) == 236
    assert api.get("/api/me/wallet").json()["cagnotteEnAttente"] == 236
    assert services.crediter_cagnotte(52001) == 236
    assert services.crediter_cagnotte(52001) == 236  # une fois par commande
    assert wallet.solde(client_) == 236 and services.cagnotte_en_attente(client_) == 0
    d = api.get("/api/me/subscription").json()["cagnotte"]
    assert d == {"disponible": 0, "versee": 236, "attente": []}


def test_cagnotte_portefeuille_ferme_versement_mobile_money(api, client_):
    _souscrire(api, "duo", "mois")
    _commande(client_, 52002, 20_000)
    Interrupteur.objects.create(code="FF-WALLET", ouvert=False)
    assert services.crediter_cagnotte(52002) == 400
    assert api.get("/api/me/subscription").json()["cagnotte"]["disponible"] == 400
    assert api.post("/api/me/cagnotte/payout").json() == 400
    assert MobileMoneyConsole.DEMANDES[-1]["versement"] == 400
    assert api.post("/api/me/cagnotte/payout").json() == 0
    assert CreditCagnotte.objects.get().etat == "versee"


def test_cagnotte_expiree_et_palier_sans_cagnotte(api, client_):
    _souscrire(api, "plus", "mois")
    _commande(client_, 52003)
    assert services.crediter_cagnotte(52003) == 0  # Plus : pas de cagnotte
    CreditCagnotte.objects.create(
        client=client_, order_id=1, palier="prime", base=1000, montant=20, reste=20, expire_le=timezone.now() - timedelta(days=1)
    )
    assert api.post("/api/me/cagnotte/payout").json() == 0


def test_remise_livraison_pour_le_panier(client_, api):
    frais = FraisPanier(
        sous_total=12_000,
        ramassages=500,
        remises=400,
        supplements=0,
        offert=0,
        total=12_900,
        seuil=30_000,
        colis=1,
        economie=0,
        reste_ramassages=0,
        manque_pour_seuil=18_000,
        progression_pour_cent=40,
    )
    assert services.remise_livraison(client_, frais) == 0
    _souscrire(api, "prime", "mois")
    assert services.remise_livraison(client_, frais) == 900
    assert services.jours_garde_bonus(client_) == 4


def test_parrainage(api, client_):
    _souscrire(api, "duo", "mois")
    a = api.get("/api/me/subscription").json()
    code = a["parrainage"]["lien"].rsplit("/", 1)[1]
    filleuls = [creer_client(prenom=f"F{i}") for i in range(4)]
    for f in filleuls:
        assert services.enregistrer_filleul(code, f) is not None
    assert services.enregistrer_filleul(code, client_) is None  # jamais soi-même
    prochain = a["abonnement"]["prochain"]
    assert [services.filleul_a_retire(f) for f in filleuls] == [True, True, True, False]  # 3 par mois (ABO-PARRAIN)
    d = api.get("/api/me/subscription").json()
    assert d["parrainage"]["recompensesMois"] == 3 and d["parrainage"]["moisGagnes"] == 6  # Duo : 2 mois par proche
    assert d["abonnement"]["prochain"] == prochain + 180 * 86_400_000
    assert {f["etat"] for f in d["parrainage"]["filleuls"]} == {"retiree"}


def test_prelever_echeances_refus_ouvre_la_grace(api, client_, monkeypatch):
    _souscrire(api, "plus", "mois")
    Abonnement.objects.update(prochain=timezone.now() - timedelta(minutes=1))
    from apps.wallet.prestataires import ResultatPaiement

    monkeypatch.setattr(MobileMoneyConsole, "demander", lambda self, **k: ResultatPaiement("refuse", k["reference"], motif="solde"))
    assert services.prelever_echeances() == 1
    a = services.courant(client_)
    assert a.echec_le is not None and a.prochain is None and a.echec_montant == 2500


def test_abonnement_actif_et_cadeau_a_un_compte_existant(api, client_):
    from apps.client_accounts.services import enregistrer_numero

    assert services.abonnement_actif(client_) is False
    _souscrire(api, "plus", "mois")
    assert services.abonnement_actif(client_) is True
    proche = creer_client(prenom="Awa")
    enregistrer_numero(proche, "655443322")
    r = api.post(
        "/api/subscription-gifts",
        {"numero": "655443322", "prenom": "Awa", "palier": "plus", "mois": 1, "message": "", "carte": "tok_visa"},
        format="json",
    ).json()
    assert r["ok"] and r["pourCeCompte"] is False and r["du"] is None
    assert services.courant(proche).palier == "plus" and services.abonnement_actif(proche)
