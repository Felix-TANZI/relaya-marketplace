# Sécurité avant la mise en service de main 2 (liste du porteur, étape 15) :
#
#   Apple    le compte se retrouve par l'identité Apple (« sub ») ; l'e-mail ne sert qu'à rattacher ou créer, et
#            seulement s'il vient du jeton et qu'Apple l'a vérifié ; nonce émis par le serveur, à usage unique
#   Wallet   le code à 4 chiffres (R03.5) se bloque après r_wallet_code_essais erreurs pendant r_wallet_code_blocage_h ;
#            réinitialisation par un code envoyé au numéro vérifié
#   Retrait  le relais scanne le QR du colis (R66.2) puis saisit le code ; essais comptés sur ce colis (R66.1) et
#            limite par relais ; même chose sur WhatsApp
#   DP-02    le code de retrait est chiffré, vérifié par empreinte HMAC, absent de l'admin Django

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import connection
from rest_framework.test import APIClient

from apps.accounts.models import AppleIdentity
from apps.regles import services as regles
from apps.shipping.models import RelayParcel, RelayPickupAttempt
from tests.test_livraison_publication import _colis_au_relais, _referentiel  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


# ── Apple ──────────────────────────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def jeton(monkeypatch, settings):
    """Le jeton Apple « vérifié » : on choisit ses claims, la signature est simulée."""
    from apps.accounts import views

    settings.APPLE_CLIENT_IDS = ["com.belivay.client"]
    claims = {"sub": "apple-sub-1", "email": "awa@privaterelay.appleid.com", "email_verified": "true",
              "aud": "com.belivay.client"}
    monkeypatch.setattr(views, "_verify_apple_identity_token", lambda j: dict(claims))
    return claims


def _nonce(c):
    return c.post("/api/auth/apple/nonce/").json()["nonce"]


def _connexion(c, **donnees):
    return c.post("/api/auth/apple/", {"identity_token": "jwt", **donnees}, format="json")


def test_apple_sans_nonce_du_serveur_est_refuse(jeton):
    c = APIClient()
    jeton["nonce"] = "invente"
    assert _connexion(c).status_code == 401
    assert not User.objects.filter(email="awa@privaterelay.appleid.com").exists()


def test_apple_le_nonce_ne_sert_qu_une_fois(jeton):
    c = APIClient()
    jeton["nonce"] = _nonce(c)
    assert _connexion(c).status_code == 200
    assert _connexion(c).status_code == 401                                   # jeton rejoué


def test_apple_accepte_l_empreinte_du_nonce(jeton):
    import hashlib

    c = APIClient()
    brut = _nonce(c)
    jeton["nonce"] = hashlib.sha256(brut.encode()).hexdigest()               # iOS : Apple reçoit l'empreinte
    assert _connexion(c, nonce=brut).status_code == 200


def test_apple_retrouve_le_compte_par_sub_d_abord(jeton):
    c = APIClient()
    proprietaire = User.objects.create_user(username="awa", email="ancien@exemple.cm", password="p")
    AppleIdentity.objects.create(user=proprietaire, subject="apple-sub-1", client_id="com.belivay.client")
    autre = User.objects.create_user(username="autre", email="awa@privaterelay.appleid.com", password="p")
    jeton["nonce"] = _nonce(c)
    r = _connexion(c)
    assert r.status_code == 200
    assert AppleIdentity.objects.get(subject="apple-sub-1").user == proprietaire   # jamais le compte « autre »
    assert not AppleIdentity.objects.filter(user=autre).exists()


def test_apple_n_utilise_jamais_l_email_envoye_a_cote(jeton):
    c = APIClient()
    victime = User.objects.create_user(username="victime", email="victime@exemple.cm", password="p")
    jeton.pop("email")
    jeton["nonce"] = _nonce(c)
    r = _connexion(c, email="victime@exemple.cm")
    assert r.status_code == 400
    assert not AppleIdentity.objects.filter(user=victime).exists()


def test_apple_un_email_non_verifie_ne_rattache_rien(jeton):
    c = APIClient()
    User.objects.create_user(username="awa", email="awa@privaterelay.appleid.com", password="p")
    jeton["email_verified"] = "false"
    jeton["nonce"] = _nonce(c)
    assert _connexion(c).status_code == 400
    assert not AppleIdentity.objects.exists()


def test_apple_un_compte_deja_lie_a_un_autre_sub_n_est_pas_repris(jeton):
    c = APIClient()
    u = User.objects.create_user(username="awa", email="awa@privaterelay.appleid.com", password="p")
    AppleIdentity.objects.create(user=u, subject="apple-sub-AUTRE", client_id="com.belivay.client")
    jeton["nonce"] = _nonce(c)
    assert _connexion(c).status_code == 409


def test_apple_android_le_retour_verifie_aussi_le_nonce(jeton):
    c = APIClient()
    jeton["nonce"] = _nonce(c)
    r = c.post("/api/auth/apple/callback/", {"id_token": "jwt", "code": "c", "state": "s1"})
    ticket = r["Location"].split("ticket=")[1].split("&")[0]
    assert c.post("/api/auth/apple/ticket/", {"ticket": ticket}, format="json").status_code == 200
    r = c.post("/api/auth/apple/callback/", {"id_token": "jwt", "code": "c", "state": "s2"})
    ticket = r["Location"].split("ticket=")[1].split("&")[0]
    assert c.post("/api/auth/apple/ticket/", {"ticket": ticket}, format="json").status_code == 401   # même nonce


# ── Code du Wallet ─────────────────────────────────────────────────────────────────────────────────────────

def test_le_code_wallet_se_bloque_apres_trop_d_erreurs():
    from apps.payments.wallet import services as wallet

    u = User.objects.create_user(username="cli_w", password="p")
    wallet.definir_code(u, "4821")
    for _ in range(regles.reglage("r_wallet_code_essais") - 1):
        with pytest.raises(wallet.WalletError) as e:
            wallet.controler_code(u, "0000")
        assert e.value.code == "code_faux"
    with pytest.raises(wallet.WalletError) as e:
        wallet.controler_code(u, "0000")
    assert e.value.code == "code_bloque"
    with pytest.raises(wallet.WalletError) as e:
        wallet.controler_code(u, "4821")                                    # même le bon code, pendant le blocage
    assert e.value.code == "code_bloque"
    p = wallet.portefeuille_de(u)
    assert p.code_bloque_jusqua is not None


def test_un_paiement_refuse_pour_code_faux_garde_l_erreur_comptee(monkeypatch):
    """Le paiement échoue sur le code (R03.5) : le compteur, lui, reste (sa transaction est à part)."""
    from types import SimpleNamespace

    from apps.payments.wallet import services as wallet

    monkeypatch.setattr(wallet, "ouvert", lambda: True)
    u = User.objects.create_user(username="cli_w2", password="p")
    wallet.definir_code(u, "4821")
    intention = SimpleNamespace(amount_xaf=regles.reglage("r_wallet_code_des") + 1)
    with pytest.raises(wallet.WalletError) as e:
        wallet.payer(intention, user=u, code="1111")
    assert e.value.code == "code_faux"
    assert wallet.portefeuille_de(u).code_echecs == 1


def test_changer_de_code_compte_aussi_les_erreurs():
    from apps.payments.wallet import services as wallet

    u = User.objects.create_user(username="cli_w3", password="p")
    wallet.definir_code(u, "4821")
    with pytest.raises(wallet.WalletError):
        wallet.definir_code(u, "1234", ancien="9999")
    assert wallet.portefeuille_de(u).code_echecs == 1


def test_reinitialiser_le_code_par_sms_au_numero_verifie(monkeypatch):
    from apps.payments.bridge import codes
    from apps.payments.wallet import services as wallet

    u = User.objects.create_user(username="cli_w4", password="p")
    wallet.definir_code(u, "4821")
    p = wallet.portefeuille_de(u)
    p.code_echecs, p.code_bloque_jusqua = 0, p.created_at.replace(year=2999)
    p.save()
    c = APIClient()
    c.force_authenticate(u)

    monkeypatch.setattr(codes, "numero_verifie", lambda user: None)
    r = c.post("/api/payments/v2/me/wallet/code/oublie/")
    assert r.status_code == 400 and r.json()["code"] == "numero_non_verifie"

    envoyes = {}
    monkeypatch.setattr(codes, "numero_verifie", lambda user: "+237699000001")
    monkeypatch.setattr(codes, "envoyer_code", lambda user, numero: envoyes.update(numero=numero) or {"envoye": 1})
    monkeypatch.setattr(codes, "verifier_code", lambda user, numero, code: {"ok": code == "123456"})
    assert c.post("/api/payments/v2/me/wallet/code/oublie/").status_code == 200
    assert envoyes["numero"] == "+237699000001"                             # jamais un numéro saisi
    r = c.post("/api/payments/v2/me/wallet/code/reinitialiser/", {"code_sms": "000000", "code": "5555"}, format="json")
    assert r.status_code == 400
    r = c.post("/api/payments/v2/me/wallet/code/reinitialiser/", {"code_sms": "123456", "code": "5555"}, format="json")
    assert r.status_code == 200
    p.refresh_from_db()
    assert p.code_valide("5555") and p.code_bloque_jusqua is None and p.code_echecs == 0


# ── Code de retrait au relais ──────────────────────────────────────────────────────────────────────────────

def _gerant(parcel):
    relais = parcel.relay_point
    relais.is_active, relais.status = True, relais.Status.APPROVED
    relais.save(update_fields=["is_active", "status"])
    c = APIClient()
    c.force_authenticate(relais.user)
    return c


def _verifier(c, code, **colis):
    return c.post("/api/shipping/relay-point/pickup/check/", {"pickup_code": code, **colis}, format="json")


def test_dp02_le_code_n_est_jamais_en_clair_en_base():
    parcel = _colis_au_relais("482913")
    with connection.cursor() as cur:
        cur.execute("SELECT * FROM shipping_relayparcel WHERE id = %s", [parcel.pk])
        ligne = cur.fetchone()
    assert all("482913" not in str(v) for v in ligne if not isinstance(v, (bytes, memoryview)))
    assert parcel.pickup_code_empreinte and parcel.pickup_code_empreinte != "482913"
    parcel.refresh_from_db()
    assert parcel.pickup_code == "482913"                                     # déchiffré pour le seul client


def test_dp02_la_migration_chiffre_les_codes_existants():
    """La migration 0032 transforme un code en clair en (chiffré, empreinte) lisibles par le modèle, et une
    tentative tracée en l'empreinte du code saisi."""
    import importlib

    from django.apps import apps as registre

    migration = importlib.import_module("apps.shipping.migrations.0032_code_retrait_chiffre")
    parcel = _colis_au_relais("000000")

    class Faux:
        """Le modèle historique : il a encore la colonne pickup_code (ici simulée)."""

        def __init__(self, vrai, lignes):
            self.vrai, self.lignes = vrai, lignes

        def get_model(self, app, nom):
            vrai = registre.get_model(app, nom)
            if nom == "RelayParcel":
                lignes = self.lignes

                class Gestion:
                    objects = type("Q", (), {
                        "exclude": lambda self, **k: type("R", (), {"only": lambda s, *a: lignes})(),
                        "filter": lambda self, **k: vrai.objects.filter(**k)})()
                return Gestion
            return vrai

    from types import SimpleNamespace

    migration.chiffrer_les_codes(Faux(RelayParcel, [SimpleNamespace(pk=parcel.pk, pickup_code=" ab12cd ")]), None)
    parcel.refresh_from_db()
    assert parcel.pickup_code == "AB12CD" and parcel.code_correct("ab12cd")


def test_dp02_le_code_n_est_ni_affiche_ni_cherchable_dans_l_admin():
    from django.contrib import admin

    from django.test import RequestFactory

    modele_admin = admin.site._registry[RelayParcel]
    assert "pickup_code" not in modele_admin.list_display and "pickup_code" not in modele_admin.search_fields
    requete = RequestFactory().get("/django-admin/")
    requete.user = User.objects.create_superuser("admin_dp02", "a@b.cm", "p")
    champs = modele_admin.get_form(requete).base_fields
    assert not any(n.startswith("pickup_code") for n in champs)


def test_le_colis_se_scanne_avant_le_code():
    parcel = _colis_au_relais("482913")
    c = _gerant(parcel)
    r = _verifier(c, "482913")
    assert r.status_code == 400 and "colis" in r.json()                     # R66.2 : pas de code sans colis
    r = _verifier(c, "482913", colis=f'{{"shipment_id": {parcel.shipment_id}, "depot_code": "x"}}')
    assert r.status_code == 200 and [p["id"] for p in r.json()["parcels"]] == [parcel.pk]


def test_les_essais_se_comptent_sur_le_colis_et_le_bloquent():
    parcel = _colis_au_relais("482913")
    c = _gerant(parcel)
    ref = f"BVY-{parcel.shipment.order_id}-{parcel.shipment_id}"
    essais = regles.reglage("r_code_essais")
    for i in range(essais):
        r = _verifier(c, f"00000{i}", colis=ref).json()
    assert r["locked"] is True and r["attempts_left"] == 0
    r = _verifier(c, "482913", colis=ref).json()                              # le bon code ne passe plus
    assert r["locked"] is True and r["parcels"] == []
    r = c.post("/api/shipping/relay-point/pickup/", {"colis": ref, "pickup_code": "482913"}, format="json")
    assert r.status_code == 400
    parcel.refresh_from_db()
    assert parcel.status != RelayParcel.Status.PICKED_UP
    # aucune trace du code saisi en clair
    assert not RelayPickupAttempt.objects.filter(code__in=["482913", "000000"]).exists()


def test_la_limite_par_relais_bloque_les_remises(monkeypatch):
    vrai = regles.reglage
    monkeypatch.setattr(regles, "reglage", lambda nom: 3 if nom == "r_code_relais_echecs" else vrai(nom))
    a = _colis_au_relais("111111")
    c = _gerant(a)
    for i in range(3):
        _verifier(c, f"99999{i}", colis=str(a.shipment_id))                  # 3 codes faux en 1 h à ce relais
    autre = RelayParcel.objects.filter(relay_point=a.relay_point).exclude(pk=a.pk).first()
    cible = autre or a
    r = _verifier(c, cible.pickup_code or "111111", colis=str(cible.shipment_id)).json()
    assert r["locked"] is True                                                # même un bon code attend


def test_whatsapp_demande_la_reference_avec_le_code():
    from apps.whatsapp_assistant.bridge import relay as pont

    parcel = _colis_au_relais("482913")
    _gerant(parcel)
    ref = f"BVY-{parcel.shipment.order_id}-{parcel.shipment_id}"
    assert pont.hand_over("482913", parcel.relay_point_id)[0] == pont.ActionResult.BAD_REF
    for i in range(regles.reglage("r_code_essais")):
        resultat, _ = pont.hand_over(f"{ref} 00000{i}", parcel.relay_point_id)
    assert resultat == pont.ActionResult.LOCKED
    assert pont.hand_over(f"{ref} 482913", parcel.relay_point_id)[0] == pont.ActionResult.LOCKED


def test_whatsapp_remet_avec_la_reference_et_le_bon_code():
    from apps.whatsapp_assistant.bridge import relay as pont

    parcel = _colis_au_relais("482913")
    _gerant(parcel)
    ref = f"BVY-{parcel.shipment.order_id}-{parcel.shipment_id}"
    resultat, refs = pont.hand_over(f"{ref} 482913", parcel.relay_point_id)
    assert resultat == pont.ActionResult.DONE and refs == [ref]


@pytest.fixture(autouse=True)
def _cache_vide():
    cache.clear()
    yield
    cache.clear()
