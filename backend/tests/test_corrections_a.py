# Revue du 29 octobre 2026 — groupe A (sécurité, P0). Chaque test échoue sur 554fb6e et passe après la correction.

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import SystemCheckError
from django.test import override_settings

from apps.shipping.models import Shipment
from apps.shipping.serializers import ShipmentSerializer
from tests.test_preuves_et_codes import _colis, _referentiel  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


# ── A1 · DP-61 : jamais le vrai numéro ────────────────────────────────────────────────────────────────────

def _vu_par(colis, user):
    return ShipmentSerializer(colis, context={"request": type("R", (), {"user": user})()}).data


@override_settings(BELIVAY_APPELS="apps.shipping.appels.AppelConsole")
def test_a1_le_serializer_ne_renvoie_jamais_un_numero_complet_avec_la_console():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    complets = {colis.courier.phone, colis.order.customer_phone}
    personnel = User.objects.create_user("staff_a1", password="p", is_staff=True)  # personnel hors logistique
    for user in (colis.order.user, colis.courier.user, personnel):
        vu = _vu_par(colis, user)
        montres = {vu.get("courier_phone"), vu.get("customer_phone"), (vu.get("courier") or {}).get("phone")}
        assert not (montres & complets), user.username
        assert vu["appel_masque"] is False                                              # pas d'opérateur réel


def test_a1_sans_operateur_l_appel_est_indisponible():
    from apps.shipping import appels

    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    with pytest.raises(appels.AppelIndisponible):
        appels.appeler(colis, colis.order.user)


def test_a1_le_journal_de_la_console_est_borne():
    from apps.shipping import appels

    appels.AppelConsole.APPELS.clear()
    for i in range(appels.AppelConsole.APPELS.maxlen + 25):
        appels.AppelConsole().relier("+237677123441", "+237699887766", f"ref-{i}")
    assert len(appels.AppelConsole.APPELS) == appels.AppelConsole.APPELS.maxlen
    assert appels.AppelConsole.APPELS[-1]["reference"] == f"ref-{appels.AppelConsole.APPELS.maxlen + 24}"


@override_settings(BELIVAY_APPELS="apps.shipping.appels.AppelConsole", DEBUG=False)
def test_a1_check_deploy_echoue_avec_la_console():
    with pytest.raises(SystemCheckError, match="shipping.E061"):
        call_command("check", deploy=True, fail_level="ERROR")


def test_a1_le_conteneur_de_production_lance_le_controle_au_demarrage():
    from pathlib import Path

    from django.conf import settings

    dockerfile = (Path(settings.BASE_DIR) / "Dockerfile.prod").read_text(encoding="utf-8")
    cmd = next(l for l in dockerfile.splitlines() if l.startswith("CMD"))
    assert "check --deploy --fail-level ERROR &&" in cmd and cmd.index("check --deploy") < cmd.index("gunicorn")


# ── A2 · six écrans encore ouverts par is_staff : chacun à son équipe ─────────────────────────────────────

def _api(user):
    from rest_framework.test import APIClient

    c = APIClient()
    c.force_authenticate(user)
    return c


def _membre(nom, partie=None):
    from django.contrib.auth.models import Group

    from apps.common.droits import PARTIES

    u = User.objects.create_user(nom, password="p", is_staff=True)
    if partie:
        u.groups.add(Group.objects.get_or_create(name=PARTIES[partie])[0])
    return u


def test_a2_piece_kyc_le_proprietaire_et_la_conformite_seulement():
    from django.core.files.uploadedfile import SimpleUploadedFile

    from apps.accounts.models import ComplianceDocument

    proprietaire = User.objects.create_user("vendeur_kyc", password="p")
    doc = ComplianceDocument.objects.create(user=proprietaire, owner_role="VENDOR", document_type="ID_FRONT",
                                            file=SimpleUploadedFile("cni.png", b"\x89PNG-cni", content_type="image/png"))
    url = f"/api/auth/compliance-documents/{doc.pk}/file/"
    assert _api(_membre("staff_kyc")).get(url).status_code == 404                     # personnel hors équipe
    assert _api(_membre("conf_kyc", "conformite")).get(url).status_code == 200
    assert _api(proprietaire).get(url).status_code == 200                                # le propriétaire garde l'accès


def test_a2_transactions_reservees_a_la_finance():
    from apps.payments.models import PaymentTransaction

    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    tx = PaymentTransaction.objects.create(order=colis.order, provider=PaymentTransaction.Provider.choices[0][0],
                                           amount_xaf=1000, payer_phone="677000000")
    assert _api(_membre("staff_tx")).get(f"/api/payments/{tx.id}/").status_code == 404
    assert _api(_membre("fin_tx", "finance")).get(f"/api/payments/{tx.id}/").status_code == 200
    liste = _api(_membre("staff_tx2")).get(f"/api/payments/list/?order_id={colis.order_id}").json()
    assert (liste["results"] if isinstance(liste, dict) else liste) == []


def test_a2_ecriture_des_categories_reservee_au_catalogue():
    donnees = {"name": "Catégorie A2", "slug": "categorie-a2"}
    assert _api(_membre("staff_cat")).post("/api/catalog/categories/", donnees, format="json").status_code == 403
    assert _api(_membre("cat_cat", "catalogue")).post("/api/catalog/categories/", donnees,
                                                      format="json").status_code != 403


def test_a2_variantes_en_attente_reservees_au_catalogue():
    from apps.catalog.models import Category, MasterProduct, ProductVariant

    cat = Category.objects.create(name="Tel A2", slug="tel-a2")
    master = MasterProduct.objects.create(title="Fiche A2", slug="fiche-a2", category=cat, variant_axes=["c"])
    ProductVariant.objects.create(master=master, axis_values={"c": "noir"}, is_active=True,
                                  moderation_status="PENDING")
    url = f"/api/catalog/master-products/{master.slug}/variants/?include_pending=true"
    assert len(_api(_membre("staff_var")).get(url).json()) == 0
    assert len(_api(_membre("cat_var", "catalogue")).get(url).json()) == 1


def test_a2_reglages_non_publics_reserves_au_pilotage():
    assert _api(_membre("staff_reg")).get("/api/regles/tables/t_zones/").status_code == 403
    assert _api(_membre("pil_reg", "pilotage")).get("/api/regles/tables/t_zones/").status_code == 200


def test_a2_suivi_d_expedition_reserve_a_la_logistique_hors_acteurs():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    url = f"/api/shipping/track/?order_id={colis.order_id}"
    assert _api(_membre("staff_trk")).get(url).status_code == 403
    assert _api(_membre("log_trk", "logistique")).get(url).status_code == 200
    assert _api(colis.order.user).get(url).status_code == 200                            # le client garde son suivi


# ── A3 · R66.1 : compteur d'essais sous verrou ────────────────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
def test_a3_essais_simultanes_jamais_plus_que_r_code_essais():
    import threading

    from django.db import connection

    from apps.regles import services as regles
    from apps.shipping import codes

    colis = _colis(True, Shipment.Status.PICKED_UP)
    depart = threading.Barrier(10)
    resultats, erreurs = [], []

    def essai():
        try:
            depart.wait()
            resultats.append(codes.essayer(Shipment.objects.get(pk=colis.pk), "retrait", False))
        except Exception as exc:  # noqa: BLE001
            erreurs.append(exc)
        finally:
            connection.close()

    fils = [threading.Thread(target=essai) for _ in range(10)]
    for f in fils:
        f.start()
    for f in fils:
        f.join()
    assert not erreurs, erreurs
    comptes = [r for r in resultats if r["compte"]]
    assert len(comptes) == regles.reglage("r_code_essais")                       # jamais plus de 3 essais comptés
    assert all(r["bloque_jusqu"] for r in resultats if not r["compte"])         # les suivants trouvent le blocage
    colis.refresh_from_db()
    assert colis.codes_essais["retrait"]["n"] == regles.reglage("r_code_essais")


# ── A4 · DP-02 : sel de l'empreinte ───────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("sel,motif", [("", "absent"), ("belivay-momo", "valeur publique"),
                                       ("sel-de-vingt-caracts", "trop court")])
def test_a4_le_preflight_bloque_un_sel_absent_public_ou_court(sel, motif):
    from apps.payments.tests.reporting.test_preflight import executer

    sortie, code = executer(PAYMENTS_FINGERPRINT_SALT=sel)
    assert code == 2 and "PAYMENTS_FINGERPRINT_SALT" in sortie and motif in sortie


def test_a4_aucun_sel_par_defaut_en_production():
    import importlib
    import os

    ancien = os.environ.pop("PAYMENTS_FINGERPRINT_SALT", None)
    try:
        import relaya.settings.base as base

        importlib.reload(base)
        assert base.PAYMENTS_FINGERPRINT_SALT == ""
    finally:
        if ancien is not None:
            os.environ["PAYMENTS_FINGERPRINT_SALT"] = ancien


# ── A5 · nonce Apple et ticket Android à usage unique, consommés atomiquement ─────────────────────────────

def test_a5_le_meme_nonce_ne_sert_qu_une_fois_meme_en_parallele(monkeypatch):
    import threading

    from django.core.cache import cache

    from apps.accounts import views

    cache.set("apple-nonce:n-a5", True)
    lecture_faite = threading.Barrier(2)
    vrai_delete = cache.delete

    def delete_apres_les_deux_lectures(cle, *a, **k):  # les deux requêtes ont « vu » le nonce avant la suppression
        if cle == "apple-nonce:n-a5":
            lecture_faite.wait(timeout=5)
        return vrai_delete(cle, *a, **k)

    monkeypatch.setattr(cache, "delete", delete_apres_les_deux_lectures)
    resultats = []
    fils = [threading.Thread(target=lambda: resultats.append(views._consommer_nonce_apple("n-a5"))) for _ in range(2)]
    for f in fils:
        f.start()
    for f in fils:
        f.join()
    assert sorted(resultats) == [False, True]                                          # le second est refusé


def test_a5_le_ticket_android_ne_sert_qu_une_fois(monkeypatch):
    from django.core.cache import cache
    from rest_framework.test import APIClient

    from apps.accounts import views

    appels = []
    monkeypatch.setattr(views, "_connexion_apple", lambda request, data: appels.append(data) or
                        __import__("rest_framework.response", fromlist=["Response"]).Response({"ok": True}))
    cache.set("apple-ticket:t-a5", {"identity_token": "jwt"})
    c = APIClient()
    assert c.post("/api/auth/apple/ticket/", {"ticket": "t-a5"}, format="json").status_code == 200
    assert c.post("/api/auth/apple/ticket/", {"ticket": "t-a5"}, format="json").status_code == 400
    assert len(appels) == 1
