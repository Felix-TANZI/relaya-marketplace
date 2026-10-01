# backend/apps/whatsapp_assistant/tests/test_courier.py
# Étape 5 — le livreur est prévenu sur WhatsApp dès qu'un colis lui est
# assigné, voit ses adresses, et accepte sa mission depuis WhatsApp.
#
# Les envois passent par le faux fournisseur de test_conversation.py : rien ne
# sort vers Meta. L'assignation emprunte le vrai chemin des portails, donc le
# vrai signal.

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User

from apps.accounts.models import CourierProfile
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.shipping.models import Shipment, Zone
from apps.vendors.models import VendorLocation, VendorProfile
from apps.whatsapp_assistant.bridge import deliveries
from apps.whatsapp_assistant.models import CourierNotification, WhatsAppContact
from apps.whatsapp_assistant.providers import IncomingMessage

from .test_conversation import FakeProvider, say

pytestmark = pytest.mark.django_db

GET_PROVIDER = "apps.whatsapp_assistant.conversation.courier.get_provider"
COURIER_WA_ID = "237699955324"          # le numéro d'essai du livreur
CLIENT_PHONE = "677001122"              # ne doit apparaître dans aucun envoi


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture(autouse=True)
def _assistant_actif(settings):
    settings.WHATSAPP_ASSISTANT_ENABLED = "1"
    settings.WHATSAPP_COURIER_NOTIFICATIONS = "1"
    settings.WHATSAPP_COURIER_NOTIFY_OVERRIDE = ""
    settings.WHATSAPP_COURIER_APP_URL = "https://courier.belivay.com/courier"


@pytest.fixture
def livraison():
    """Un colis prêt à être assigné : une boutique, un client à domicile, un livreur."""
    seller = User.objects.create_user(username="mama-ngo", password="p")
    vendor = VendorProfile.objects.create(
        user=seller, business_name="Boutique Mama Ngo", business_description="Mode",
        phone="+237690112233", address="Akwa", city="Douala", status=VendorProfile.Status.APPROVED,
    )
    VendorLocation.objects.create(
        vendor=vendor, name="Marché Mokolo", address="Face station Tradex, Mokolo",
        description="Rideau bleu, 2e allée", phone="+237690112233",
        representative_name="Mama Ngo", representative_phone="+237690112244",
        latitude="3.874000", longitude="11.499000", is_active=True, is_main=True,
    )
    category = Category.objects.create(name="Mode Femme", slug="mode-femme")
    product = Product.objects.create(
        title="Robe wax ceinturée", category=category, price_xaf=18500,
        is_active=True, moderation_status="APPROVED", vendor=seller,
    )

    courier_user = User.objects.create_user(username="livreur-test", first_name="Paul", last_name="Mbarga")
    courier = CourierProfile.objects.create(
        user=courier_user, phone="+237 6 99 95 53 24", city="Yaoundé", id_card="CNI-TEST",
        preferred_language="fr", is_active=True, is_approved=True,
    )

    Zone.objects.create(name="Bastos", city="Yaoundé")
    order = Order.objects.create(
        customer_phone=f"+237{CLIENT_PHONE}", city="Yaoundé", district="Bastos",
        address=f"Rue 1.234, me joindre au {CLIENT_PHONE}",
        address_precision={"landmarks": ["Pharmacie du Soleil"], "driverHint": "Portail bleu à gauche"},
        note=f"Appelez le {CLIENT_PHONE} en arrivant", total_xaf=18500,
        delivery_latitude="3.889000", delivery_longitude="11.521000",
    )
    OrderItem.objects.create(
        order=order, product=product, title_snapshot=product.title,
        price_xaf_snapshot=18500, qty=2, line_total_xaf=37000,
    )
    shipment = Shipment.objects.create(order=order, vendor=seller, status=Shipment.Status.CREATED)
    return {"shipment": shipment, "courier": courier, "order": order, "product": product}


def assigner(livraison, provider, capture, shipment=None):
    """Assigne le colis comme le fait le portail des entreprises de livraison."""
    with patch(GET_PROVIDER, return_value=provider):
        with capture(execute=True):
            deliveries.assign_for_test((shipment or livraison["shipment"]).id, livraison["courier"].id)


def toucher(provider, bouton, wa_id=COURIER_WA_ID):
    """Le livreur touche un bouton depuis WhatsApp."""
    contact, _ = WhatsAppContact.objects.get_or_create(wa_id=wa_id)
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=wa_id, profile_name="Paul",
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


# ── L'assignation prévient le livreur ──────────────────────────────────────

def test_assignation_envoie_le_modele_au_livreur(livraison, provider, django_capture_on_commit_callbacks):
    assigner(livraison, provider, django_capture_on_commit_callbacks)

    envoi = provider.last
    shipment_id = livraison["shipment"].id
    assert envoi["kind"] == "template"
    assert envoi["to"] == COURIER_WA_ID
    assert envoi["name"] == "belivay_nouvelle_mission"
    assert envoi["language"] == "fr"
    # {{1}} référence · {{2}} ramassage · {{3}} livraison
    assert envoi["params"][0] == f"BVY-{livraison['order'].id}-{shipment_id}"
    assert "Mama Ngo" in envoi["params"][1]
    assert "Bastos" in envoi["params"][2]
    # Les deux boutons du modèle reviennent tels quels quand il les touche.
    assert envoi["buttons"] == [f"acc:{shipment_id}", f"mis:{shipment_id}"]

    trace = CourierNotification.objects.get(kind="mission", shipment_id=shipment_id)
    assert trace.recipient == COURIER_WA_ID
    assert trace.error == ""


def test_meme_assignation_n_est_annoncee_qu_une_fois(livraison, provider, django_capture_on_commit_callbacks):
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    envois = len(provider.sent)

    # Le colis est re-sauvegardé (changement de statut) : pas de second message.
    with patch(GET_PROVIDER, return_value=provider):
        with django_capture_on_commit_callbacks(execute=True):
            shipment = Shipment.objects.get(pk=livraison["shipment"].id)
            shipment.status = Shipment.Status.PICKED_UP
            shipment.save(update_fields=["status", "updated_at"])

    assert len(provider.sent) == envois
    assert CourierNotification.objects.filter(kind="mission").count() == 1


def test_le_numero_du_client_ne_sort_jamais(livraison, provider, django_capture_on_commit_callbacks):
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    toucher(provider, f"mis:{livraison['shipment'].id}")

    texte = tout_le_texte(provider)
    assert CLIENT_PHONE not in texte.replace(" ", "")
    assert "[n° masqué]" in texte              # l'adresse et la note en contenaient un
    assert "Pharmacie du Soleil" in texte      # les repères utiles, eux, sont bien là


def test_livreur_sans_notification_si_assistant_coupe(livraison, provider, settings,
                                                      django_capture_on_commit_callbacks):
    settings.WHATSAPP_COURIER_NOTIFICATIONS = "0"
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    assert provider.sent == []


def test_livreur_non_approuve_n_est_pas_derange(livraison, provider, django_capture_on_commit_callbacks):
    livraison["courier"].is_approved = False
    livraison["courier"].save(update_fields=["is_approved"])
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    assert provider.sent == []


# ── « Voir les adresses » ──────────────────────────────────────────────────

def test_voir_les_adresses_donne_le_detail_et_les_epingles(livraison, provider,
                                                           django_capture_on_commit_callbacks):
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, f"mis:{livraison['shipment'].id}")

    genres = [envoi["kind"] for envoi in provider.sent]
    assert genres == ["text", "location", "location", "buttons"]

    detail = provider.sent[0]["body"]
    assert "Ramassage" in detail and "Marché Mokolo" in detail
    assert "Livraison à domicile" in detail and "Bastos" in detail
    assert "Portail bleu" in detail                       # l'indication d'accès
    assert "2 articles" in detail

    ramassage, livrer = provider.sent[1], provider.sent[2]
    assert (ramassage["latitude"], ramassage["longitude"]) == (3.874, 11.499)
    assert (livrer["latitude"], livrer["longitude"]) == (3.889, 11.521)

    boutons = [bouton.id for bouton in provider.sent[3]["buttons"]]
    assert boutons == [f"acc:{livraison['shipment'].id}", "mine"]


def test_un_inconnu_ne_voit_aucune_adresse(livraison, provider, django_capture_on_commit_callbacks):
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, f"mis:{livraison['shipment'].id}", wa_id="237655000000")

    assert provider.last["kind"] == "text"
    assert "réservé aux livreurs" in provider.last["body"]
    assert "Mokolo" not in tout_le_texte(provider)


# ── « Accepter » ───────────────────────────────────────────────────────────

def test_accepter_depuis_whatsapp_accepte_vraiment(livraison, provider,
                                                   django_capture_on_commit_callbacks):
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, f"acc:{livraison['shipment'].id}")

    shipment = Shipment.objects.get(pk=livraison["shipment"].id)
    assert shipment.accepted_at is not None
    assert "acceptée" in provider.sent[0]["body"]
    # Il enchaîne sur les adresses : il part tout de suite.
    assert [envoi["kind"] for envoi in provider.sent[1:]] == ["text", "location", "location", "buttons"]
    # Plus rien à accepter : seul « Mes missions » reste.
    assert [bouton.id for bouton in provider.last["buttons"]] == ["mine"]


def test_accepter_deux_fois_ne_change_rien(livraison, provider, django_capture_on_commit_callbacks):
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    toucher(provider, f"acc:{livraison['shipment'].id}")
    accepte_a = Shipment.objects.get(pk=livraison["shipment"].id).accepted_at
    provider.sent.clear()

    toucher(provider, f"acc:{livraison['shipment'].id}")

    assert Shipment.objects.get(pk=livraison["shipment"].id).accepted_at == accepte_a
    assert "déjà acceptée" in provider.sent[0]["body"]


def test_colis_repris_par_un_autre_livreur(livraison, provider, django_capture_on_commit_callbacks):
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    autre = CourierProfile.objects.create(
        user=User.objects.create_user(username="autre-livreur"), phone="+237690000009",
        city="Yaoundé", id_card="CNI-2", is_active=True, is_approved=True,
    )
    Shipment.objects.filter(pk=livraison["shipment"].id).update(courier=autre)
    provider.sent.clear()

    toucher(provider, f"acc:{livraison['shipment'].id}")

    assert "pas (ou plus) attribuée" in provider.last["body"]


# ── Tournée ────────────────────────────────────────────────────────────────

def test_une_tournee_envoie_un_message_par_colis_puis_le_recapitulatif(
    livraison, provider, django_capture_on_commit_callbacks,
):
    second = Shipment.objects.create(
        order=livraison["order"], vendor=livraison["product"].vendor, status=Shipment.Status.CREATED,
    )
    colis = [livraison["shipment"].id, second.id]

    with patch(GET_PROVIDER, return_value=provider):
        with django_capture_on_commit_callbacks(execute=True):
            tournee_id = deliveries.tour_for_test(colis, livraison["courier"].id)

    modeles = [envoi for envoi in provider.sent if envoi["kind"] == "template"]
    missions = [envoi for envoi in modeles if envoi["name"] == "belivay_nouvelle_mission"]
    recaps = [envoi for envoi in modeles if envoi["name"] == "belivay_recap_tournee"]

    assert len(missions) == 2                       # un message par colis
    assert len(recaps) == 1                         # un seul récapitulatif
    assert recaps[0]["params"][1] == "2"            # nombre de colis
    assert recaps[0]["buttons"] == [f"tour:{tournee_id}"]
    assert "\n" not in recaps[0]["params"][2]       # Meta refuse les sauts de ligne

    # Le récapitulatif mène aux arrêts, dans l'ordre.
    provider.sent.clear()
    toucher(provider, f"tour:{tournee_id}")
    assert provider.last["kind"] == "list"
    assert [row.id for row in provider.last["rows"]] == [f"mis:{colis[0]}", f"mis:{colis[1]}"]


# ── Le livreur écrit lui-même (sans attendre un modèle Meta) ───────────────

def ecrire(provider, texte, wa_id=COURIER_WA_ID):
    """Le livreur tape un mot dans WhatsApp, sans bouton."""
    contact, _ = WhatsAppContact.objects.get_or_create(wa_id=wa_id)
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=wa_id, profile_name="Paul",
        type="text", text=texte,
    )
    from apps.whatsapp_assistant.conversation.engine import handle_message

    handle_message(contact, message, provider)
    return contact


def test_le_livreur_ecrit_missions_et_obtient_sa_livraison(livraison, provider,
                                                           django_capture_on_commit_callbacks):
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    ecrire(provider, "Missions")

    # Une seule mission en cours : il reçoit directement ses adresses.
    assert [envoi["kind"] for envoi in provider.sent] == ["text", "location", "location", "buttons"]
    assert "Marché Mokolo" in provider.sent[0]["body"]


def test_le_livreur_sans_mission_est_rassure(livraison, provider):
    ecrire(provider, "mes missions")
    assert provider.last["kind"] == "text"
    assert "aucune mission en cours" in provider.last["body"]


def test_le_livreur_n_est_pas_arrete_par_le_choix_de_la_langue(livraison, provider,
                                                               django_capture_on_commit_callbacks):
    """Il n'a jamais écrit : sans ce raccourci, il tomberait sur « choisissez votre langue »."""
    assigner(livraison, provider, django_capture_on_commit_callbacks)
    WhatsAppContact.objects.filter(wa_id=COURIER_WA_ID).update(language="")
    provider.sent.clear()

    ecrire(provider, "missions")

    assert "langue" not in tout_le_texte(provider).lower()
    assert "Marché Mokolo" in provider.sent[0]["body"]


def test_un_client_qui_ecrit_livraison_cherche_un_article(provider):
    """Le mot-clé n'est reconnu que pour un numéro de livreur : le client cherche."""
    contact = WhatsAppContact.objects.create(wa_id="237690000001", profile_name="Cliente", language="fr")
    envoi = say(provider, contact, text="livraison")
    assert "Aucun article trouvé" in envoi["body"]


# ── Le client n'est pas dérangé ────────────────────────────────────────────

def test_un_bouton_client_reste_un_bouton_client(provider):
    contact = WhatsAppContact.objects.create(wa_id="237690000001", profile_name="Cliente", language="fr")
    envoi = say(provider, contact, reply_id="help")
    assert "Besoin d'aide" in envoi["body"]
