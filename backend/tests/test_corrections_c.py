# Revue du 29 octobre 2026 — groupe C (règles, P1). Chaque test échoue avant sa correction et passe après.

from datetime import timedelta

import pytest
from django.contrib.auth.models import Group, User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.orders.models import Return
from tests.test_retours_d18 import _livree, _referentiel, _retour  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db

PHOTO_DATA_URI = ("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9Q"
                  "DwADhgGAWjR9awAAAABJRU5ErkJggg==")


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


# ── C1 · R66.3 : une photo à chaque changement de main, retours compris ───────────────────────────────────

def test_c1_le_vendeur_ne_recoit_pas_un_retour_sans_photo():
    o = _livree(timedelta(days=1))
    ret = _retour(o, status=Return.Status.AWAITING_DROPOFF)
    vendeur = _client(ret.vendor)
    url = f"/api/vendors/returns/BLV-{o.pk}/receive"
    r = vendeur.post(url, {}, format="json")
    assert r.status_code == 400 and r.json()["raison"] == "photo_obligatoire"
    ret.refresh_from_db()
    assert ret.received_at is None
    r = vendeur.post(url, {"photo": PHOTO_DATA_URI}, format="json")
    assert r.status_code == 200 and r.json()["ok"] is True
    ret.refresh_from_db()
    assert ret.received_at is not None and ret.photos.count() == 1


def test_c1_l_equipe_ne_constate_pas_un_retour_sans_photo():
    o = _livree(timedelta(days=1))
    ret = _retour(o, status=Return.Status.APPROVED)
    agent = User.objects.create_user("litiges_c1", password="p", is_staff=True)
    agent.groups.add(Group.objects.get_or_create(name="gestion-litiges")[0])
    url = f"/api/vendors/admin/returns/{ret.pk}/received/"
    assert _client(agent).post(url, {}, format="multipart").status_code == 400
    ret.refresh_from_db()
    assert ret.status == Return.Status.APPROVED
    photo = SimpleUploadedFile("r.png", b"\x89PNG\r\n\x1a\n-retour", content_type="image/png")
    assert _client(agent).post(url, {"photo": photo}, format="multipart").status_code == 200
    ret.refresh_from_db()
    assert ret.status == Return.Status.RECEIVED and ret.photos.count() == 1


def test_c1_l_admin_django_ne_marque_plus_une_livraison_sans_photo():
    from django.contrib import admin

    from apps.shipping.models import Shipment

    actions = admin.site._registry[Shipment].actions
    assert "mark_delivered" not in actions


# ── C2 · R41.1 : plafond de valeur des colis par relais ───────────────────────────────────────────────────

def test_c2_un_relais_n_est_pas_propose_si_un_colis_depasse_son_plafond():
    from apps.shipping.garde import plafonds_des_paliers
    from tests.test_frais_v21 import boutique, offre, relais_biyem_assi

    relais = relais_biyem_assi()
    assert relais.palier == "Starter"                                                  # par défaut (R41.2 à venir)
    plafond = plafonds_des_paliers()["Starter"]                                         # lu dans t_paliers_relais
    bon_marche, cher = offre(boutique("b_c2a"), 14000), offre(boutique("b_c2b"), plafond + 1000)
    url = "/api/shipping/relay-points/nearby/?city=YAOUNDE&panier="
    ids = lambda r: [p["id"] for p in r.json()]  # noqa: E731
    assert relais.pk in ids(APIClient().get(f"{url}{bon_marche.pk}:1"))
    assert relais.pk not in ids(APIClient().get(f"{url}{cher.pk}:1"))
    relais.palier = "Premium"
    relais.save(update_fields=["palier"])
    assert relais.pk in ids(APIClient().get(f"{url}{cher.pk}:1"))                       # plafond Premium suffisant


def test_c2_la_commande_vers_un_relais_trop_petit_est_refusee_et_le_colis_porte_sa_valeur():
    from rest_framework.exceptions import ValidationError
    from rest_framework.test import APIRequestFactory

    from apps.orders.serializers import OrderCreateSerializer
    from apps.shipping.garde import plafonds_des_paliers
    from apps.shipping.models import Shipment
    from tests.test_frais_v21 import boutique, offre, relais_biyem_assi

    def commander(produit, nom):
        requete = APIRequestFactory().post("/api/orders/")
        requete.user = User.objects.create_user(username=nom, password="p")
        s = OrderCreateSerializer(data={"cart_items": [{"product_id": produit.pk, "qty": 1}], "city": "YAOUNDE",
                                        "customer_phone": "+237699000001", "delivery_mode": "PICKUP",
                                        "relay_point_id": relais_biyem_assi().pk}, context={"request": requete})
        assert s.is_valid(), s.errors
        return s.save()

    cher = offre(boutique("b_c2c"), plafonds_des_paliers()["Starter"] + 1000)
    with pytest.raises(ValidationError, match="R41.1"):
        commander(cher, "cli_c2a")
    o = commander(offre(boutique("b_c2d"), 14000), "cli_c2b")
    assert Shipment.objects.get(order=o).valeur_colis_xaf == 14000


def test_c2_client_absent_le_relais_de_la_zone_trop_petit_donne_un_traitement_xl():
    from apps.shipping.models import Shipment
    from tests.test_partie2_etape12 import _agir, _preuves, _relais_bastos
    from tests.test_preuves_et_codes import _colis

    _relais_bastos()
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    from apps.shipping.garde import plafonds_des_paliers

    Shipment.objects.filter(pk=colis.pk).update(valeur_colis_xaf=plafonds_des_paliers()["Starter"] + 1)
    colis.refresh_from_db()
    _preuves(colis)
    _agir(colis, "ABSENT", latitude="3.889", longitude="11.516")
    colis.order.refresh_from_db()
    assert colis.order.relay_point_id is None                                          # R51.2 → traité comme un XL (R51.6)


# ── C3 · valeurs en dur passées en réglages r_… ───────────────────────────────────────────────────────────

def test_c3_les_trois_durees_sont_des_reglages_modifiables(monkeypatch):
    from django.core.cache import cache

    from apps.accounts import views
    from apps.regles import services as regles
    from apps.regles.models import Reglage

    for nom, valeur in (("r_envoi_interrompu_min", 30), ("r_apple_nonce_s", 600), ("r_apple_ticket_s", 120)):
        assert Reglage.objects.get(nom=nom).valeur == valeur                           # créés par migration
        assert regles.reglage(nom) == valeur
    vrai = regles.reglage
    monkeypatch.setattr(regles, "reglage", lambda nom: 45 if nom == "r_apple_nonce_s" else vrai(nom))
    r = APIClient().post("/api/auth/apple/nonce/")
    assert r.json()["expireDans"] == 45                                                 # lu dans le réglage
    cache.delete(f"apple-nonce:{r.json()['nonce']}")
    assert not hasattr(views, "APPLE_NONCE_SECONDES") and not hasattr(views, "APPLE_TICKET_SECONDES")


# ── C4 · R69.1 : course de retour impayée = prochaine commande bloquée ───────────────────────────────────

def test_c4_commande_refusee_tant_que_la_course_est_impayee_puis_acceptee():
    from django.utils import timezone
    from rest_framework.exceptions import ValidationError
    from rest_framework.test import APIRequestFactory

    from apps.orders import retours
    from apps.orders.serializers import OrderCreateSerializer
    from tests.test_frais_v21 import boutique, offre, relais_biyem_assi

    o = _livree(timedelta(days=1))
    ret = _retour(o, inspection_passed=False)
    retours.attribuer_frais_de_retour(ret)                                              # client en tort
    ret.refresh_from_db()
    du = retours.course_de_retour_due(ret)
    assert du > 0

    def commander():
        requete = APIRequestFactory().post("/api/orders/")
        requete.user = o.user
        s = OrderCreateSerializer(data={"cart_items": [{"product_id": offre(boutique(f"b_c4{timezone.now().microsecond}"),
                                                                             14000).pk, "qty": 1}],
                                        "city": "YAOUNDE", "customer_phone": "+237699000001",
                                        "delivery_mode": "PICKUP", "relay_point_id": relais_biyem_assi().pk},
                                  context={"request": requete})
        assert s.is_valid(), s.errors
        return s.save()

    with pytest.raises(ValidationError) as e:
        commander()
    assert str(du) in str(e.value.detail["course_retour"]) and str(e.value.detail["course_retour_montant_xaf"]) == str(du)
    ret.frais_retour_paye_le = timezone.now()                                           # payée (appli ou comptoir)
    ret.save(update_fields=["frais_retour_paye_le"])
    assert commander().pk


def test_c4_le_relais_encaisse_la_course_par_mobile_money_sur_le_numero_du_client(monkeypatch):
    from apps.orders import retours
    from tests.test_partie2_etape12 import _relais_bastos

    o = _livree(timedelta(days=1))
    ret = _retour(o, inspection_passed=False)
    retours.attribuer_frais_de_retour(ret)
    relais = _relais_bastos()
    envois = []
    monkeypatch.setattr("apps.payments.bridge.checkout_v2.prepare_payment_course_retour",
                        lambda r, payer_msisdn, payer_operator: envois.append((r.pk, payer_msisdn)) or r)
    monkeypatch.setattr("apps.payments.application.collect.initiate_collect",
                        lambda intent: type("I", (), {"intent": type("X", (), {"reference": "x", "amount_xaf": 1})(),
                                                      "status": "PENDING", "message": "ok"})())
    c = _client(relais.user)
    url = "/api/shipping/relay-point/comptoir/course-retour/"
    assert c.post(url, {"payer_msisdn": "+237600000000"}, format="json").status_code == 404     # rien de dû
    assert c.post(url, {"payer_msisdn": o.customer_phone}, format="json").status_code == 200
    assert envois == [(ret.pk, o.customer_phone.replace(" ", ""))]                    # jamais d'espèces : Mobile Money


# ── C5 · fermer l'ancienne part du transport, avec les deux validations de la configuration ──────────────

def test_c5_la_part_du_transport_se_ferme_par_demande_puis_approbation_d_un_second_compte():
    from decimal import Decimal

    from django.core.management import call_command

    from apps.payments.config.change_control import ChangeControlError, approve_change
    from apps.payments.config.models import ConfigChangeRequest, DistributionRule

    DistributionRule.objects.create(
        config_key="dist-transport-carrier", version=1, is_active=True, name="Part de l'entreprise (ancienne)",
        component=DistributionRule.Component.TRANSPORT, payee_type=DistributionRule.PayeeType.DELIVERY_COMPANY,
        basis=DistributionRule.Basis.PERCENT_OF_COMPONENT, value=Decimal("70"), priority=10)
    demandeur = User.objects.create_user("compta_c5", password="p")
    approbateur = User.objects.create_user("porteur_c5", password="p")
    call_command("request_locked_financial_config", username=demandeur.username, stdout=open("/dev/null", "w"))
    demande = ConfigChangeRequest.objects.get(target_key="dist-transport-carrier")
    assert demande.action == ConfigChangeRequest.Action.DEACTIVATE and demande.status == "PENDING"
    assert DistributionRule.objects.filter(config_key="dist-transport-carrier", is_active=True).exists()  # rien d'appliqué
    with pytest.raises(ChangeControlError):
        approve_change(demande, approved_by=demandeur)                                  # jamais la même personne
    approve_change(demande, approved_by=approbateur)
    assert not DistributionRule.objects.filter(config_key="dist-transport-carrier", is_active=True).exists()
