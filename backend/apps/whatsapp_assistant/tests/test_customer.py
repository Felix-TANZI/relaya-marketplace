# backend/apps/whatsapp_assistant/tests/test_customer.py
# Le client est prévenu à chaque étape de sa livraison, sans rien demander.
#
# Deux exigences : chaque étape n'est annoncée qu'une fois, et une étape qui ne
# le concerne pas (« arrivé au point relais » pour une livraison à domicile)
# ne lui est jamais envoyée.

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User

from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.shipping.models import RelayParcel, Shipment
from apps.vendors.models import VendorProfile
from apps.whatsapp_assistant.models import CustomerNotification, WhatsAppContact
from apps.whatsapp_assistant.providers import IncomingMessage

from .test_conversation import FakeProvider

pytestmark = pytest.mark.django_db

GET_PROVIDER = "apps.whatsapp_assistant.conversation.customer.get_provider"
CLIENT_WA = "237677889900"


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture(autouse=True)
def _assistant_actif(settings):
    settings.WHATSAPP_ASSISTANT_ENABLED = "1"
    settings.WHATSAPP_CUSTOMER_NOTIFICATIONS = "1"
    settings.WHATSAPP_CUSTOMER_NOTIFY_OVERRIDE = ""
    # Les autres volets ne doivent pas parasiter ces essais.
    settings.WHATSAPP_COURIER_NOTIFICATIONS = "0"
    settings.WHATSAPP_VENDOR_NOTIFICATIONS = "0"
    settings.WHATSAPP_RELAY_NOTIFICATIONS = "0"


@pytest.fixture
def boutique():
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
    return {"seller": seller, "robe": robe}


def commander(boutique, *, telephone=f"+{CLIENT_WA}", relais=None):
    order = Order.objects.create(
        customer_phone=telephone, city="Yaoundé", district="Bastos",
        address="Rue 1.234", total_xaf=37000, delivery_fee_xaf=1500,
        fulfillment_status="PAID_IN_ESCROW", payment_status="PAID",
        relay_point=relais,
    )
    OrderItem.objects.create(
        order=order, product=boutique["robe"], title_snapshot=boutique["robe"].title,
        price_xaf_snapshot=18500, qty=2, line_total_xaf=37000,
    )
    shipment = Shipment.objects.create(order=order, vendor=boutique["seller"], status="ASSIGNED")
    return {"order": order, "shipment": shipment}


def avancer(colis, statut, provider, capture):
    """Le colis franchit une étape, comme dans l'application livreur."""
    with patch(GET_PROVIDER, return_value=provider):
        with capture(execute=True):
            envoi = Shipment.objects.get(pk=colis["shipment"].id)
            envoi.status = statut
            envoi.save(update_fields=["status", "updated_at"])


def etapes(provider):
    return [envoi["params"][1] for envoi in provider.sent if envoi["kind"] == "template"]


# ── Les quatre moments ─────────────────────────────────────────────────────

def test_le_client_est_prevenu_au_depart_du_colis(boutique, provider,
                                                  django_capture_on_commit_callbacks):
    colis = commander(boutique)

    avancer(colis, "PICKED_UP", provider, django_capture_on_commit_callbacks)

    envoi = provider.last
    assert envoi["kind"] == "template"
    assert envoi["to"] == CLIENT_WA
    assert envoi["name"] == "belivay_suivi_commande"
    assert envoi["params"][0] == f"BVY-{colis['order'].id}-{colis['shipment'].id}"
    assert envoi["params"][1] == "Parti de chez le vendeur"
    assert envoi["buttons"] == [f"ord:{colis['order'].id}"]

    trace = CustomerNotification.objects.get()
    assert trace.kind == "picked_up"
    assert trace.recipient == CLIENT_WA
    assert trace.error == ""


def test_les_etapes_se_suivent_sans_se_repeter(boutique, provider,
                                               django_capture_on_commit_callbacks):
    colis = commander(boutique)

    for statut in ("PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"):
        avancer(colis, statut, provider, django_capture_on_commit_callbacks)

    assert etapes(provider) == [
        "Parti de chez le vendeur",
        "Le livreur est en route",
        "Livré",
    ]
    assert CustomerNotification.objects.count() == 3


def test_une_meme_etape_n_est_annoncee_qu_une_fois(boutique, provider,
                                                   django_capture_on_commit_callbacks):
    colis = commander(boutique)
    avancer(colis, "PICKED_UP", provider, django_capture_on_commit_callbacks)
    envois = len(provider.sent)

    # Le colis repasse par le même statut (correction, re-sauvegarde…).
    avancer(colis, "OUT_FOR_DELIVERY", provider, django_capture_on_commit_callbacks)
    avancer(colis, "PICKED_UP", provider, django_capture_on_commit_callbacks)

    assert len([e for e in provider.sent if e["params"][1] == "Parti de chez le vendeur"]) == 1
    assert len(provider.sent) == envois + 1


def test_la_destination_est_annoncee_a_la_livraison(boutique, provider,
                                                    django_capture_on_commit_callbacks):
    colis = commander(boutique)

    avancer(colis, "DELIVERED", provider, django_capture_on_commit_callbacks)

    assert provider.last["params"][2] == "Livraison à Bastos · Yaoundé"


# ── Le point relais ────────────────────────────────────────────────────────

@pytest.fixture
def relais():
    from apps.accounts.models import RelayPointProfile

    gerant = User.objects.create_user(username="relais-bastos")
    return RelayPointProfile.objects.create(
        user=gerant, name="Relais Bastos", phone="+237677445566",
        city="Yaoundé", address="Carrefour Bastos", relay_code="BAS-01",
        is_active=True, status=RelayPointProfile.Status.APPROVED,
    )


def test_le_client_est_prevenu_quand_son_colis_arrive_au_relais(boutique, relais, provider,
                                                                django_capture_on_commit_callbacks):
    colis = commander(boutique, relais=relais)
    RelayParcel.objects.create(shipment=colis["shipment"], relay_point=relais, status="STORED")

    avancer(colis, "IN_TRANSIT", provider, django_capture_on_commit_callbacks)

    assert provider.last["params"][1] == "Arrivé à votre point relais"
    assert provider.last["params"][2] == "À retirer : Relais Bastos · Yaoundé"


def test_une_livraison_a_domicile_n_annonce_pas_le_relais(boutique, provider,
                                                          django_capture_on_commit_callbacks):
    """IN_TRANSIT existe aussi hors relais : le client ne doit pas lire un contresens."""
    colis = commander(boutique)

    avancer(colis, "IN_TRANSIT", provider, django_capture_on_commit_callbacks)

    assert provider.sent == []


# ── Ce qui ne doit rien déclencher ─────────────────────────────────────────

def test_un_client_sans_numero_valide_est_ignore(boutique, provider,
                                                 django_capture_on_commit_callbacks):
    colis = commander(boutique, telephone="00000")

    avancer(colis, "PICKED_UP", provider, django_capture_on_commit_callbacks)

    assert provider.sent == []
    assert CustomerNotification.objects.count() == 0


def test_le_reglage_permet_de_couper_les_envois(boutique, provider, settings,
                                                django_capture_on_commit_callbacks):
    settings.WHATSAPP_CUSTOMER_NOTIFICATIONS = "0"
    colis = commander(boutique)

    avancer(colis, "PICKED_UP", provider, django_capture_on_commit_callbacks)

    assert provider.sent == []


def test_un_statut_sans_interet_pour_le_client_ne_dit_rien(boutique, provider,
                                                           django_capture_on_commit_callbacks):
    colis = commander(boutique)

    avancer(colis, "INCIDENT", provider, django_capture_on_commit_callbacks)

    assert provider.sent == []


def test_le_numero_du_client_est_reconnu_avec_des_espaces(boutique, provider,
                                                          django_capture_on_commit_callbacks):
    colis = commander(boutique, telephone="+237 6 77 88 99 00")

    avancer(colis, "PICKED_UP", provider, django_capture_on_commit_callbacks)

    assert provider.last["to"] == CLIENT_WA


# ── Le bouton ramène au suivi déjà construit ───────────────────────────────

def test_le_bouton_du_message_ouvre_le_suivi(boutique, provider,
                                             django_capture_on_commit_callbacks):
    colis = commander(boutique)
    avancer(colis, "PICKED_UP", provider, django_capture_on_commit_callbacks)
    bouton = provider.last["buttons"][0]
    provider.sent.clear()

    contact = WhatsAppContact.objects.get(wa_id=CLIENT_WA)
    contact.language = "fr"
    contact.save(update_fields=["language"])
    message = IncomingMessage(
        message_id="wamid.in.1", wa_id=CLIENT_WA, profile_name="Cliente",
        type="interactive", text="", reply_id=bouton,
    )
    from apps.whatsapp_assistant.conversation.engine import handle_message

    handle_message(contact, message, provider)

    assert f"Commande BVY-{colis['order'].id}" in provider.sent[0]["body"]
