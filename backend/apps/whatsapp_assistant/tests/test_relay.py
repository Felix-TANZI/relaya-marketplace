# backend/apps/whatsapp_assistant/tests/test_relay.py
# Étape 6.3 — le point relais est prévenu qu'un colis part vers lui, le
# réceptionne, puis le remet au client contre son code.
#
# Deux points sont surveillés : la remise ne doit passer qu'avec le bon code,
# et le code ne doit jamais sortir de l'assistant — le gérant le saisit, on ne
# le lui envoie pas.

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User

from apps.accounts.models import RelayPointProfile
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.shipping.models import RelayParcel, Shipment
from apps.vendors.models import VendorProfile
from apps.whatsapp_assistant.bridge import relay as relay_bridge
from apps.whatsapp_assistant.models import RelayNotification, WhatsAppContact
from apps.whatsapp_assistant.providers import IncomingMessage

from .test_conversation import FakeProvider

pytestmark = pytest.mark.django_db

GET_PROVIDER = "apps.whatsapp_assistant.conversation.relay.get_provider"
RELAIS_WA = "237677445566"
CLIENT_TEL = "677889900"


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture(autouse=True)
def _assistant_actif(settings):
    settings.WHATSAPP_ASSISTANT_ENABLED = "1"
    settings.WHATSAPP_RELAY_NOTIFICATIONS = "1"
    settings.WHATSAPP_RELAY_NOTIFY_OVERRIDE = ""


@pytest.fixture
def relais():
    seller = User.objects.create_user(username="mama-ngo", password="p")
    VendorProfile.objects.create(
        user=seller, business_name="Boutique Mama Ngo", business_description="Mode",
        phone="+237690112233", address="Akwa", city="Douala",
        status=VendorProfile.Status.APPROVED,
    )
    category = Category.objects.create(name="Mode Femme", slug="mode-femme")
    robe = Product.objects.create(
        title="Robe wax ceinturée", category=category, price_xaf=18500,
        is_active=True, moderation_status="APPROVED", vendor=seller,
    )
    gerant = User.objects.create_user(username="relais-bastos")
    profile = RelayPointProfile.objects.create(
        user=gerant, name="Relais Bastos", manager_name="Paul Eyenga",
        phone="+237 6 77 44 55 66", city="Yaoundé", address="Carrefour Bastos",
        relay_code="BAS-01", opening_hours="8h – 19h",
        storage_capacity=0, is_active=True, status=RelayPointProfile.Status.APPROVED,
    )
    return {"seller": seller, "robe": robe, "gerant": gerant, "profile": profile}


def colis_vers_relais(relais, *, qty=2, statut_colis="ASSIGNED", statut_parcel="EXPECTED"):
    """Une commande à retirer au point relais, avec son colis annoncé."""
    order = Order.objects.create(
        customer_phone=f"+237{CLIENT_TEL}", city="Yaoundé", district="Bastos",
        address="Carrefour Bastos", total_xaf=18500 * qty, delivery_fee_xaf=1000,
        relay_point=relais["profile"], fulfillment_status="PAID_IN_ESCROW", payment_status="PAID",
    )
    OrderItem.objects.create(
        order=order, product=relais["robe"], title_snapshot=relais["robe"].title,
        price_xaf_snapshot=18500, qty=qty, line_total_xaf=18500 * qty,
    )
    shipment = Shipment.objects.create(order=order, vendor=relais["seller"], status=statut_colis)
    parcel = RelayParcel.objects.create(
        shipment=shipment, relay_point=relais["profile"], status=statut_parcel,
    )
    return {"order": order, "shipment": shipment, "parcel": parcel}


def ramasser(colis, provider, capture):
    """Le livreur récupère le colis chez le vendeur."""
    with patch(GET_PROVIDER, return_value=provider):
        with capture(execute=True):
            relay_bridge.pickup_for_test(colis["shipment"].id)


def ecrire(provider, texte, wa_id=RELAIS_WA, langue="fr"):
    contact, cree = WhatsAppContact.objects.get_or_create(wa_id=wa_id)
    if cree or not contact.language:
        contact.language = langue
        contact.save(update_fields=["language"])
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=wa_id, profile_name="Relais",
        type="text", text=texte,
    )
    from apps.whatsapp_assistant.conversation.engine import handle_message

    handle_message(contact, message, provider)
    contact.refresh_from_db()
    return contact


def toucher(provider, bouton, wa_id=RELAIS_WA):
    contact, _ = WhatsAppContact.objects.get_or_create(wa_id=wa_id, defaults={"language": "fr"})
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=wa_id, profile_name="Relais",
        type="interactive", text="", reply_id=bouton,
    )
    from apps.whatsapp_assistant.conversation.engine import handle_message

    handle_message(contact, message, provider)
    contact.refresh_from_db()
    return contact


def tout_le_texte(provider) -> str:
    return "\n".join(
        str(envoi.get("body", "")) + " " + " ".join(str(p) for p in envoi.get("params", []))
        for envoi in provider.sent
    )


# ── Le ramassage prévient le relais ────────────────────────────────────────

def test_le_ramassage_previent_le_relais(relais, provider, django_capture_on_commit_callbacks):
    colis = colis_vers_relais(relais)

    ramasser(colis, provider, django_capture_on_commit_callbacks)

    envoi = provider.last
    assert envoi["kind"] == "template"
    assert envoi["to"] == RELAIS_WA                # numéro reconnu malgré les espaces
    assert envoi["name"] == "belivay_colis_relais"
    assert envoi["params"][0] == f"BVY-{colis['order'].id}-{colis['shipment'].id}"
    assert envoi["params"][1] == "2 articles"
    assert envoi["params"][2] == "Relais Bastos"
    assert envoi["buttons"] == [f"pcl:{colis['parcel'].id}"]

    trace = RelayNotification.objects.get(parcel_id=colis["parcel"].id)
    assert trace.recipient == RELAIS_WA
    assert trace.error == ""


def test_une_livraison_a_domicile_ne_previent_aucun_relais(relais, provider,
                                                           django_capture_on_commit_callbacks):
    """Sans colis relais rattaché, le ramassage ne concerne personne ici."""
    order = Order.objects.create(
        customer_phone=f"+237{CLIENT_TEL}", city="Douala", address="Akwa",
        total_xaf=18500, fulfillment_status="PAID_IN_ESCROW", payment_status="PAID",
    )
    OrderItem.objects.create(
        order=order, product=relais["robe"], title_snapshot=relais["robe"].title,
        price_xaf_snapshot=18500, qty=1, line_total_xaf=18500,
    )
    shipment = Shipment.objects.create(order=order, vendor=relais["seller"], status="ASSIGNED")

    with patch(GET_PROVIDER, return_value=provider):
        with django_capture_on_commit_callbacks(execute=True):
            relay_bridge.pickup_for_test(shipment.id)

    assert provider.sent == []


def test_le_meme_colis_n_est_annonce_qu_une_fois(relais, provider,
                                                 django_capture_on_commit_callbacks):
    colis = colis_vers_relais(relais)
    ramasser(colis, provider, django_capture_on_commit_callbacks)
    envois = len(provider.sent)

    with patch(GET_PROVIDER, return_value=provider):
        with django_capture_on_commit_callbacks(execute=True):
            relay_bridge.pickup_for_test(colis["shipment"].id)

    assert len(provider.sent) == envois
    assert RelayNotification.objects.count() == 1


def test_un_relais_suspendu_n_est_pas_derange(relais, provider,
                                              django_capture_on_commit_callbacks):
    relais["profile"].status = RelayPointProfile.Status.SUSPENDED
    relais["profile"].save(update_fields=["status"])
    colis = colis_vers_relais(relais)

    ramasser(colis, provider, django_capture_on_commit_callbacks)

    assert provider.sent == []


def test_le_reglage_permet_de_couper_les_envois(relais, provider, settings,
                                                django_capture_on_commit_callbacks):
    settings.WHATSAPP_RELAY_NOTIFICATIONS = "0"
    colis = colis_vers_relais(relais)

    ramasser(colis, provider, django_capture_on_commit_callbacks)

    assert provider.sent == []


# ── Réception ──────────────────────────────────────────────────────────────

def test_le_gerant_receptionne_le_colis(relais, provider, django_capture_on_commit_callbacks):
    colis = colis_vers_relais(relais)
    ramasser(colis, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, f"rcv:{colis['parcel'].id}")

    colis["parcel"].refresh_from_db()
    assert colis["parcel"].status == "STORED"
    assert colis["parcel"].received_at is not None
    assert colis["parcel"].pickup_code                 # le code du client vient d'être créé
    assert "réceptionné" in provider.sent[0]["body"]
    # Le colis passe côté « à remettre ».
    assert [b.id for b in provider.last["buttons"]] == ["give", "pcls"]


def test_le_code_du_client_n_est_jamais_envoye(relais, provider,
                                               django_capture_on_commit_callbacks):
    colis = colis_vers_relais(relais)
    ramasser(colis, provider, django_capture_on_commit_callbacks)
    toucher(provider, f"rcv:{colis['parcel'].id}")
    colis["parcel"].refresh_from_db()
    code = colis["parcel"].pickup_code
    provider.sent.clear()

    toucher(provider, f"pcl:{colis['parcel'].id}")

    assert code
    assert code not in tout_le_texte(provider)
    assert "annonce son code au guichet" in tout_le_texte(provider)


def test_receptionner_deux_fois_ne_change_rien(relais, provider,
                                               django_capture_on_commit_callbacks):
    colis = colis_vers_relais(relais)
    ramasser(colis, provider, django_capture_on_commit_callbacks)
    toucher(provider, f"rcv:{colis['parcel'].id}")
    colis["parcel"].refresh_from_db()
    recu_a = colis["parcel"].received_at
    provider.sent.clear()

    toucher(provider, f"rcv:{colis['parcel'].id}")

    colis["parcel"].refresh_from_db()
    assert colis["parcel"].received_at == recu_a
    assert "déjà réceptionné" in provider.sent[0]["body"]


def test_le_stockage_plein_est_annonce_clairement(relais, provider,
                                                  django_capture_on_commit_callbacks):
    relais["profile"].storage_capacity = 1
    relais["profile"].save(update_fields=["storage_capacity"])
    premier = colis_vers_relais(relais)
    ramasser(premier, provider, django_capture_on_commit_callbacks)
    toucher(provider, f"rcv:{premier['parcel'].id}")     # la place unique est prise

    second = colis_vers_relais(relais)
    ramasser(second, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, f"rcv:{second['parcel'].id}")

    second["parcel"].refresh_from_db()
    assert second["parcel"].status == "EXPECTED"        # rien n'a été réceptionné
    assert "stockage est plein" in provider.last["body"]


# ── Remise au client ───────────────────────────────────────────────────────

def _receptionner(relais, provider, capture):
    colis = colis_vers_relais(relais)
    ramasser(colis, provider, capture)
    toucher(provider, f"rcv:{colis['parcel'].id}")
    colis["parcel"].refresh_from_db()
    return colis


def test_remise_avec_le_bon_code(relais, provider, django_capture_on_commit_callbacks):
    colis = _receptionner(relais, provider, django_capture_on_commit_callbacks)
    code = colis["parcel"].pickup_code
    provider.sent.clear()

    contact = toucher(provider, "give")
    assert "code de retrait" in provider.last["body"]
    assert contact.state == "relay:code"                # l'assistant attend le code

    provider.sent.clear()
    ecrire(provider, code)

    colis["parcel"].refresh_from_db()
    colis["shipment"].refresh_from_db()
    colis["order"].refresh_from_db()
    assert colis["parcel"].status == "PICKED_UP"
    assert colis["shipment"].status == "DELIVERED"
    assert colis["order"].fulfillment_status == "DELIVERED"
    assert "Remise confirmée" in provider.sent[0]["body"]


def test_un_mauvais_code_ne_remet_rien(relais, provider, django_capture_on_commit_callbacks):
    colis = _receptionner(relais, provider, django_capture_on_commit_callbacks)
    toucher(provider, "give")
    provider.sent.clear()

    ecrire(provider, "ZZZ999")

    colis["parcel"].refresh_from_db()
    assert colis["parcel"].status == "STORED"
    assert "Aucun colis en attente avec ce code" in provider.sent[0]["body"]


def test_le_gerant_peut_annuler_la_remise(relais, provider, django_capture_on_commit_callbacks):
    colis = _receptionner(relais, provider, django_capture_on_commit_callbacks)
    toucher(provider, "give")
    provider.sent.clear()

    contact = ecrire(provider, "annuler")

    colis["parcel"].refresh_from_db()
    assert colis["parcel"].status == "STORED"
    assert contact.state != "relay:code"
    assert "annulée" in provider.sent[0]["body"]


def test_pendant_la_saisie_du_code_rien_d_autre_ne_s_interpose(relais, provider,
                                                               django_capture_on_commit_callbacks):
    """Un code peut ressembler à n'importe quoi : il ne doit pas déclencher une recherche."""
    _receptionner(relais, provider, django_capture_on_commit_callbacks)
    toucher(provider, "give")
    provider.sent.clear()

    ecrire(provider, "robe wax")

    assert "Résultats" not in tout_le_texte(provider)
    assert "Aucun colis en attente avec ce code" in provider.sent[0]["body"]


def test_un_inconnu_ne_peut_rien_remettre(relais, provider, django_capture_on_commit_callbacks):
    colis = _receptionner(relais, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, "give", wa_id="237655000000")

    colis["parcel"].refresh_from_db()
    assert colis["parcel"].status == "STORED"
    assert "réservé aux points relais" in provider.last["body"]


# ── Le gérant consulte ses colis ───────────────────────────────────────────

def test_le_gerant_ecrit_mes_colis(relais, provider, django_capture_on_commit_callbacks):
    colis = colis_vers_relais(relais)
    ramasser(colis, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    ecrire(provider, "mes colis")

    detail = provider.sent[0]["body"]
    assert f"BVY-{colis['order'].id}-{colis['shipment'].id}" in detail
    assert "En route vers vous" in detail
    assert "2 articles" in detail
    assert [b.id for b in provider.last["buttons"]] == [f"rcv:{colis['parcel'].id}", "pcls"]


def test_sans_colis_le_gerant_est_rassure(relais, provider):
    ecrire(provider, "mes colis")

    assert "Rien à traiter" in provider.last["body"]


def test_les_frais_de_garde_sont_annonces(relais, provider, django_capture_on_commit_callbacks):
    colis = _receptionner(relais, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, f"pcl:{colis['parcel'].id}")

    detail = provider.sent[0]["body"]
    assert "Garde gratuite jusqu'au" in detail
    assert "À retirer avant le" in detail


def test_le_client_n_est_pas_confondu_avec_le_gerant(relais, provider):
    """Un numéro inconnu qui écrit « relais » n'ouvre pas le volet point relais."""
    ecrire(provider, "relais", wa_id="237690000123")

    assert "Rien à traiter" not in tout_le_texte(provider)
    assert "colis à traiter" not in tout_le_texte(provider)
