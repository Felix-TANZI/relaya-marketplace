# backend/apps/wallet/tests/test_wallet.py
# Portefeuille (moteur portefeuille.py, registre WALLET-*), moyens Mobile Money, cartes, factures et PDF.

import re
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.client_core.models import Interrupteur
from apps.client_core.tests.outils import client_connecte, creer_client, creer_relais
from apps.otp.prestataires import SmsConsole
from apps.pickup.models import LigneSousCommande, MontantsCommande, SousCommande
from apps.wallet import services
from apps.wallet.models import Mouvement, MoyenPaiement, Recharge
from apps.wallet.pdf import Ligne, document
from apps.wallet.prestataires import MobileMoneyConsole

pytestmark = pytest.mark.django_db
NUMERO = "677123441"
CLE = {"HTTP_IDEMPOTENCY_KEY": "cle-essai-0001"}


@pytest.fixture
def client_(monkeypatch):
    monkeypatch.setattr("apps.wallet.compte.numero_du_compte", lambda u: NUMERO)
    return creer_client()


@pytest.fixture
def api(client_):
    return client_connecte(client_)


def _cle(n):
    return {"HTTP_IDEMPOTENCY_KEY": f"cle-essai-{n:04d}"}


def _recharger(api, montant, n=1, vieillir_h=0):
    r = api.post("/api/me/wallet/topups", {"montant": montant, "moyen": "compte"}, format="json", **_cle(n))
    assert r.status_code == 200, r.content
    rch = Recharge.objects.order_by("-pk").first()
    services.confirmer_recharge(rch.reference)
    if vieillir_h:
        Recharge.objects.filter(pk=rch.pk).update(confirmee_le=timezone.now() - timedelta(hours=vieillir_h))
    return r.json()


# ── Portefeuille ────────────────────────────────────────────────────────────────────────────────────────────


def test_portefeuille_vide_et_regles_du_registre(api):
    d = api.get("/api/me/wallet").json()
    assert d["solde"] == 0 and d["historique"] == []
    assert d["regles"] == {"plafond": 2_500_000, "rechargeMin": 500, "retraitMin": 1000, "retraitJour": 500_000, "versementHeures": 1}
    assert d["frais"] == {"gratuitsParMois": 1, "pourCent": 1, "minimum": 100, "attenteRechargeH": 72, "attenteNumeroH": 48}
    assert d["moyens"][0] == {"id": "compte", "operateur": "MTN", "numeroMasque": "6 77 ·· ·· 41", "duCompte": True, "parDefaut": True}


def test_portefeuille_ferme_404(api):
    Interrupteur.objects.create(code="FF-WALLET", ouvert=False)
    assert api.get("/api/me/wallet").status_code == 404
    assert api.post("/api/me/wallet/topups", {"montant": 1000, "moyen": "compte"}, format="json", **CLE).status_code == 404


def test_recharge_creditee_a_la_confirmation_seulement(api, client_):
    r = api.post("/api/me/wallet/topups", {"montant": 5000, "moyen": "compte"}, format="json", **CLE)
    assert r.json() == {"ok": True, "solde": 0, "montant": 5000, "frais": 0}
    assert MobileMoneyConsole.DEMANDES[-1]["numero"] == NUMERO
    rch = Recharge.objects.get()
    assert services.solde(client_) == 0
    services.confirmer_recharge(rch.reference)
    services.confirmer_recharge(rch.reference)  # webhook rejoué : un seul crédit
    assert services.solde(client_) == 5000
    assert Mouvement.objects.filter(client=client_).count() == 1
    d = api.get("/api/me/wallet").json()
    assert d["historique"][0]["libelle"] == "Recharge MTN MoMo" and d["historique"][0]["montant"] == 5000
    assert d["retirable"] == 0 and d["disponibleLe"] is not None  # recharge non utilisée : 72 h
    assert services.confirmer_recharge("INCONNUE") is None


def test_recharge_refus_minimum_et_plafond(api):
    r = api.post("/api/me/wallet/topups", {"montant": 400, "moyen": "compte"}, format="json", **CLE).json()
    assert r == {"ok": False, "refus": "minimum", "possible": 500}
    _recharger(api, 2_499_000, n=2)
    r = api.post("/api/me/wallet/topups", {"montant": 5000, "moyen": "compte"}, format="json", **_cle(3)).json()
    assert r == {"ok": False, "refus": "plafond", "possible": 1000}


def test_recharge_exige_idempotency_key(api):
    r = api.post("/api/me/wallet/topups", {"montant": 1000, "moyen": "compte"}, format="json")
    assert r.status_code == 400 and r.json()["error"]["code"] == "idempotency_key_required"


def test_recharge_moyen_inconnu(api):
    r = api.post("/api/me/wallet/topups", {"montant": 1000, "moyen": "m999"}, format="json", **CLE)
    assert r.status_code == 422 and r.json()["error"]["code"] == "moyen_inconnu"


def test_retrait_attente_recharge_puis_gratuit_puis_frais(api, client_):
    _recharger(api, 50_000, n=1)
    r = api.post("/api/me/wallet/withdrawals", {"montant": 10_000, "moyen": "compte"}, format="json", **_cle(2)).json()
    assert r == {"ok": False, "refus": "attente_recharge", "possible": 0}
    Recharge.objects.update(confirmee_le=timezone.now() - timedelta(hours=73))
    # Premier retrait du mois sur l'argent rechargé : gratuit (WALLET-RETRAIT-GRATUIT)
    assert api.get("/api/me/wallet/withdrawal-fee?montant=10000").json() == 0
    r = api.post("/api/me/wallet/withdrawals", {"montant": 10_000, "moyen": "compte"}, format="json", **_cle(3)).json()
    assert r == {"ok": True, "solde": 40_000, "montant": 10_000, "frais": 0}
    # Le suivant : 1 %, 100 F au moins (WALLET-RETRAIT-FRAIS) ; 20 000 × 1 % = 200 F
    assert api.get("/api/me/wallet/withdrawal-fee?montant=20000").json() == 200
    assert api.get("/api/me/wallet/withdrawal-fee?montant=5000").json() == 100
    r = api.post("/api/me/wallet/withdrawals", {"montant": 20_000, "moyen": "compte"}, format="json", **_cle(4)).json()
    assert r == {"ok": True, "solde": 20_000, "montant": 20_000, "frais": 200}
    assert MobileMoneyConsole.DEMANDES[-1]["versement"] == 19_800  # frais retenus sur le montant versé
    d = api.get("/api/me/wallet").json()
    assert d["retraitsGratuits"] == 0 and d["retireAujourdhui"] == 30_000
    assert d["historique"][0]["libelle"] == "Retrait vers MTN MoMo · frais 200 F"
    # Registre = état : Σ mouvements = solde
    assert sum(Mouvement.objects.filter(client=client_).values_list("montant", flat=True)) == services.solde(client_) == 20_000


def test_retrait_remboursement_sans_frais_et_refus(api, client_):
    services.crediter_remboursement(client_, 30_000, paye_par_carte=False, reference="LIT-1")
    services.crediter_remboursement(client_, 30_000, paye_par_carte=False, reference="LIT-1")  # idempotent
    assert services.solde(client_) == 30_000
    r = api.post("/api/me/wallet/withdrawals", {"montant": 500, "moyen": "compte"}, format="json", **_cle(1)).json()
    assert r == {"ok": False, "refus": "minimum", "possible": 1000}
    r = api.post("/api/me/wallet/withdrawals", {"montant": 40_000, "moyen": "compte"}, format="json", **_cle(2)).json()
    assert r == {"ok": False, "refus": "solde", "possible": 30_000}
    for i in range(3):  # remboursement : jamais de frais, même au 3e retrait du mois
        r = api.post("/api/me/wallet/withdrawals", {"montant": 5000, "moyen": "compte"}, format="json", **_cle(3 + i)).json()
        assert r["ok"] and r["frais"] == 0


def test_retrait_plafond_du_jour(api, client_):
    services.crediter_remboursement(client_, 600_000, paye_par_carte=False, reference="LIT-2")
    assert api.post("/api/me/wallet/withdrawals", {"montant": 450_000, "moyen": "compte"}, format="json", **_cle(1)).json()["ok"]
    r = api.post("/api/me/wallet/withdrawals", {"montant": 100_000, "moyen": "compte"}, format="json", **_cle(2)).json()
    assert r == {"ok": False, "refus": "plafond_jour", "possible": 50_000}


def test_retrait_refuse_par_l_operateur_rend_l_argent(api, client_, monkeypatch):
    services.crediter_remboursement(client_, 10_000, paye_par_carte=False, reference="LIT-3")
    _recharger(api, 5000, n=1, vieillir_h=80)
    from apps.wallet.prestataires import ResultatPaiement

    monkeypatch.setattr(MobileMoneyConsole, "verser", lambda self, **k: ResultatPaiement("refuse", k["reference"], motif="numero_ferme"))
    r = api.post("/api/me/wallet/withdrawals", {"montant": 12_000, "moyen": "compte"}, format="json", **_cle(2))
    assert r.status_code == 422 and r.json()["error"]["code"] == "versement_refuse"
    d = api.get("/api/me/wallet").json()
    assert d["solde"] == 15_000 and d["rembourse"] == 10_000 and d["retirable"] == 15_000


def test_remboursement_vers_le_moyen_d_origine(client_):
    assert services.crediter_remboursement(client_, 5000, paye_par_carte=True) == {"au_portefeuille": 0, "vers_le_moyen_d_origine": 5000}
    Interrupteur.objects.create(code="FF-WALLET", ouvert=False)
    assert services.crediter_remboursement(client_, 5000, paye_par_carte=False) == {"au_portefeuille": 0, "vers_le_moyen_d_origine": 5000}
    assert services.solde(client_) == 0


def test_payer_par_solde_prend_d_abord_les_recharges(api, client_):
    services.crediter_remboursement(client_, 3000, paye_par_carte=False, reference="LIT-4")
    _recharger(api, 4000, n=1)
    r = services.payer_par_solde(client_, 10_000, "BLV-1")
    assert r == {"par_le_solde": 7000, "complement_mobile_money": 3000, "biometrie": False}
    assert services.solde(client_) == 0


def test_numero_change_bloque_les_retraits(api, client_):
    from apps.otp.models import CodeOtp

    services.crediter_remboursement(client_, 10_000, paye_par_carte=False, reference="LIT-5")
    CodeOtp.objects.create(
        utilisateur=client_,
        objet="numero-nouveau",
        destination_empreinte="x",
        destination_masquee="x",
        code_empreinte="x",
        expire_le=timezone.now(),
        utilise_le=timezone.now() - timedelta(hours=1),
    )
    r = api.post("/api/me/wallet/withdrawals", {"montant": 5000, "moyen": "compte"}, format="json", **_cle(1)).json()
    assert r == {"ok": False, "refus": "attente_numero", "possible": 0}


# ── Moyens Mobile Money ─────────────────────────────────────────────────────────────────────────────────────


def _code():
    return re.search(r"\d{6}", SmsConsole.ENVOYES[-1]["texte"]).group(0)


def test_ajouter_confirmer_defaut_retirer_un_numero(api, client_):
    r = api.post("/api/me/moyens-paiement", {"numero": "699112233"}, format="json").json()
    assert r["ok"] is True and set(r["envoi"]) >= {"destination", "valideMinutes", "renvoiSecondes"}
    assert MoyenPaiement.objects.get().numero_chiffre != b"699112233"  # chiffré au repos
    faux = api.post("/api/me/moyens-paiement/699112233/verify", {"code": "000000"}, format="json").json()
    assert faux["ok"] is False
    r = api.post("/api/me/moyens-paiement/699112233/verify", {"code": _code()}, format="json").json()
    assert r["ok"] is True and "client" in r
    lst = api.get("/api/me/moyens-paiement").json()
    assert [(m["id"], m["operateur"], m["parDefaut"]) for m in lst] == [("compte", "MTN", True), (lst[1]["id"], "Orange", False)]
    assert api.patch(f"/api/me/moyens-paiement/{lst[1]['id']}", {"par_defaut": True}, format="json").status_code == 204
    assert services.moyens(client_) == [{"operateur": "MTN", "parDefaut": False}, {"operateur": "Orange", "parDefaut": True}]
    assert api.delete(f"/api/me/moyens-paiement/{lst[1]['id']}").status_code == 204
    assert api.get("/api/me/moyens-paiement").json()[0]["parDefaut"] is True


def test_ajouter_moyen_refus(api):
    r = api.post("/api/me/moyens-paiement", {"numero": NUMERO}, format="json")
    assert r.status_code == 409 and r.json()["error"]["code"] == "deja"
    r = api.post("/api/me/moyens-paiement", {"numero": "662112233"}, format="json")  # Nexttel
    assert r.status_code == 422 and r.json()["error"]["code"] == "operateur_non_accepte"
    assert api.delete("/api/me/moyens-paiement/compte").status_code == 409


def test_moyen_d_un_autre_client_introuvable(api, monkeypatch):
    autre = creer_client()
    m = MoyenPaiement.objects.create(
        client=autre, operateur="MTN", numero_chiffre=b"x", numero_empreinte="e", numero_masque="6", verifie_le=timezone.now()
    )
    assert api.delete(f"/api/me/moyens-paiement/m{m.pk}").status_code == 404
    assert api.patch(f"/api/me/moyens-paiement/m{m.pk}", {"par_defaut": True}, format="json").status_code == 404


# ── Cartes ──────────────────────────────────────────────────────────────────────────────────────────────────


def test_cartes(api, client_):
    r = api.post("/api/me/cartes", {"jeton": "tok_visa_4242", "titulaire": "Carine Mballa"}, format="json").json()
    assert r["ok"] and r["carte"]["marque"] == "Visa" and r["carte"]["derniers"] == "4242" and r["carte"]["parDefaut"]
    r2 = api.post("/api/me/cartes", {"jeton": "tok_visa_4242"}, format="json")
    assert r2.status_code == 409 and r2.json()["error"]["code"] == "deja"
    c2 = api.post("/api/me/cartes", {"jeton": "tok_mc_5555"}, format="json").json()["carte"]
    assert c2["marque"] == "Mastercard" and not c2["parDefaut"]
    assert api.patch(f"/api/me/cartes/{c2['id']}", {"par_defaut": True}, format="json").status_code == 204
    assert services.carte_par_defaut(client_).ident == c2["id"]
    assert services.resoudre_moyen(client_, "Visa •••• 4242").type == "carte"
    assert api.delete(f"/api/me/cartes/{c2['id']}").status_code == 204
    assert [c["parDefaut"] for c in api.get("/api/me/cartes").json()] == [True]


# ── Factures ────────────────────────────────────────────────────────────────────────────────────────────────


def _commande(user, order_id, relais, remise=True, annulee=False, rembourse=0):
    mc = MontantsCommande.objects.create(
        order_id=order_id,
        client=user,
        relay_id=relais.pk,
        sous_total=11_800,
        ramassages=500,
        remises=400,
        total=12_700,
        version_parametres="t",
        moyen="mtn",
        numero_masque="6 77 ·· ·· 41",
        etat_paiement="payee",
        payee_le=timezone.now(),
        rembourse=rembourse,
    )
    sc = SousCommande.objects.create(
        order_id=order_id,
        n=1,
        boutique="Boutique secrète",
        sous_total=11_800,
        etat="annulee" if annulee else ("remise" if remise else "arrivee_relais"),
        remise_le=timezone.now() if remise and not annulee else None,
        annulee_le=timezone.now() if annulee else None,
        rembourse=rembourse if annulee else 0,
    )
    LigneSousCommande.objects.create(sous_commande=sc, product_id=1, titre="Beurre de karité pur 500 g", prix=3500, qte=2)
    LigneSousCommande.objects.create(sous_commande=sc, product_id=2, titre="Huile de coco vierge 500 ml", prix=4800, qte=1)
    return mc


def test_factures_retirees_seulement(api, client_):
    relais = creer_relais()
    _commande(client_, 51388, relais)
    _commande(client_, 51400, relais, remise=False)
    _commande(client_, 51533, relais, annulee=True, rembourse=12_700)
    _commande(creer_client(), 51600, relais)
    d = api.get("/api/me/factures").json()
    assert [f["ref"] for f in d["factures"]] == ["BLV-51388"]
    f = d["factures"][0]
    assert f["lignes"] == [
        {"libelle": "Beurre de karité pur 500 g × 2", "montant": 7000},
        {"libelle": "Huile de coco vierge 500 ml", "montant": 4800},
        {"libelle": "Livraison au relais", "montant": 900},
    ]
    assert f["total"] == 12_700 and f["resume"] == "Beurre de karité pur 500 g ×2, huile de coco vierge 500 ml"
    assert f["retrait"]["relais"] == "Relais Mvog-Ada" and f["payePar"] == {"operateur": "MTN", "numero": "6 77 ·· ·· 41"}
    assert "Boutique secrète" not in str(d)  # émise par BelivaY, jamais le nom de la boutique
    assert d["annulees"][0]["ref"] == "BLV-51533" and "12 700 F remboursés" in d["annulees"][0]["texte"]
    assert "next_cursor" in d and isinstance(d["maintenant"], int)
    assert services.nombre_factures(client_) == 1


def test_facture_pdf(api, client_):
    relais = creer_relais()
    _commande(client_, 51388, relais)
    _commande(client_, 51400, relais, remise=False)
    r = api.get("/api/orders/BLV-51388/invoice.pdf")
    assert r.status_code == 200 and r["Content-Type"] == "application/pdf"
    assert r.content.startswith(b"%PDF") and b"BLV-51388" in r.content and r.content.rstrip().endswith(b"%%EOF")
    assert b"Boutique secr" not in r.content
    assert api.get("/api/orders/51400/invoice.pdf").status_code == 404  # pas encore retirée
    autre = client_connecte(creer_client())
    assert autre.get("/api/orders/51388/invoice.pdf").status_code == 404


def test_generateur_pdf_xref_coherente():
    pdf = document([Ligne("Facture été · 12 700 F", droite="12 700 F", gras=True)])
    assert pdf.startswith(b"%PDF-1.4")
    debut = int(pdf.rsplit(b"startxref\n", 1)[1].split(b"\n")[0])
    assert pdf[debut:].startswith(b"xref")
    # chaque entrée de la table pointe sur « n 0 obj »
    lignes = pdf[debut:].split(b"\n")[3:10]
    for i, li in enumerate(lignes, start=1):
        pos = int(li[:10])
        assert pdf[pos:].startswith(f"{i} 0 obj".encode())
    assert "été".encode("cp1252") in pdf


def test_numero_change_garde_l_ancien_comme_moyen(api, client_):
    services.crediter_remboursement(client_, 10_000, paye_par_carte=False, reference="LIT-6")
    services.numero_change(client_, "699112233", NUMERO)
    m = MoyenPaiement.objects.get(client=client_)
    assert m.operateur == "Orange" and m.verifie_le is not None
    r = api.post("/api/me/wallet/withdrawals", {"montant": 5000, "moyen": "compte"}, format="json", **_cle(1)).json()
    assert r == {"ok": False, "refus": "attente_numero", "possible": 0}
