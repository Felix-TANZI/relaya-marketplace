# backend/apps/whatsapp_assistant/tests/test_orders.py
# Étape 6.1 — le client suit sa commande sur WhatsApp.
#
# Le point le plus sensible est la confidentialité : on ne doit voir QUE les
# commandes passées avec son propre numéro. C'est WhatsApp qui garantit ce
# numéro, et plusieurs tests vérifient qu'on ne déborde jamais.

import pytest
from django.contrib.auth.models import User

from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.shipping.models import Shipment
from apps.vendors.models import VendorProfile
from apps.whatsapp_assistant.models import WhatsAppContact
from apps.whatsapp_assistant.providers import IncomingMessage

from .test_conversation import FakeProvider

pytestmark = pytest.mark.django_db

CLIENT = "237690111222"                 # le numéro qui écrit
AUTRE_CLIENT = "237690333444"           # une autre personne, dont rien ne doit fuiter


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture(autouse=True)
def _site_public(settings):
    settings.WHATSAPP_SITE_URL = "https://belivay.com"


@pytest.fixture
def boutique():
    seller = User.objects.create_user(username="mama-ngo", password="p")
    VendorProfile.objects.create(
        user=seller, business_name="Boutique Mama Ngo", business_description="Mode",
        phone="+237690112233", address="Akwa", city="Douala", status=VendorProfile.Status.APPROVED,
    )
    category = Category.objects.create(name="Mode Femme", slug="mode-femme")
    product = Product.objects.create(
        title="Robe wax ceinturée", category=category, price_xaf=18500,
        is_active=True, moderation_status="APPROVED", vendor=seller,
    )
    return {"seller": seller, "product": product}


def commander(boutique, telephone, *, statut="PAID_IN_ESCROW", qty=2, colis=None, **extra):
    """Une commande passée avec ce numéro, tel qu'il a été tapé au checkout."""
    order = Order.objects.create(
        customer_phone=telephone, city="Douala", district="Bonamoussadi",
        address="Rue des Manguiers", total_xaf=38500, delivery_fee_xaf=1500,
        fulfillment_status=statut, payment_status="PAID", **extra,
    )
    OrderItem.objects.create(
        order=order, product=boutique["product"], title_snapshot=boutique["product"].title,
        price_xaf_snapshot=18500, qty=qty, line_total_xaf=18500 * qty,
    )
    for statut_colis in (colis or []):
        Shipment.objects.create(order=order, vendor=boutique["seller"], status=statut_colis)
    return order


def ecrire(provider, texte, wa_id=CLIENT, langue="fr"):
    contact, cree = WhatsAppContact.objects.get_or_create(wa_id=wa_id)
    if cree or not contact.language:
        contact.language = langue
        contact.save(update_fields=["language"])
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=wa_id, profile_name="Cliente",
        type="text", text=texte,
    )
    from apps.whatsapp_assistant.conversation.engine import handle_message

    handle_message(contact, message, provider)
    return contact


def toucher(provider, bouton, wa_id=CLIENT):
    contact, _ = WhatsAppContact.objects.get_or_create(wa_id=wa_id, defaults={"language": "fr"})
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=wa_id, profile_name="Cliente",
        type="interactive", text="", reply_id=bouton,
    )
    from apps.whatsapp_assistant.conversation.engine import handle_message

    handle_message(contact, message, provider)
    return contact


def tout_le_texte(provider) -> str:
    return "\n".join(str(envoi.get("body", "")) for envoi in provider.sent)


# ── Le client retrouve sa commande ─────────────────────────────────────────

def test_le_client_ecrit_ma_commande_et_voit_son_suivi(boutique, provider):
    commander(boutique, f"+{CLIENT}", colis=["ASSIGNED"])

    ecrire(provider, "ma commande")

    detail = provider.sent[0]["body"]
    assert "Commande BVY-" in detail
    assert "Payée · fonds sécurisés" in detail
    assert "Robe wax ceinturée × 2" in detail
    assert "38 500 FCFA" in detail
    assert "dont 1 500 FCFA de livraison" in detail
    assert "Bonamoussadi · Douala" in detail
    assert "Livreur assigné" in detail
    # Un bouton mène à la fiche dans l'application.
    assert provider.last["kind"] == "link"
    assert provider.last["button"] == "Ouvrir l'application"
    assert provider.last["url"].startswith("https://belivay.com/orders/")


def test_le_numero_est_reconnu_meme_ecrit_avec_des_espaces(boutique, provider):
    """Le checkout ne normalise pas : « +237 6 90 11 12 22 » doit marcher aussi."""
    commander(boutique, "+237 6 90 11 12 22", colis=["CREATED"])

    ecrire(provider, "mes commandes")

    assert "Commande BVY-" in provider.sent[0]["body"]


def test_le_numero_est_reconnu_sans_indicatif(boutique, provider):
    commander(boutique, "690111222")

    ecrire(provider, "suivi")

    assert "Commande BVY-" in provider.sent[0]["body"]


def test_plusieurs_commandes_donnent_une_liste(boutique, provider):
    premiere = commander(boutique, f"+{CLIENT}", statut="DELIVERED")
    seconde = commander(boutique, f"+{CLIENT}", statut="PREPARING")

    ecrire(provider, "mes commandes")

    assert provider.last["kind"] == "list"
    identifiants = {row.id for row in provider.last["rows"]}
    assert identifiants == {f"ord:{premiere.id}", f"ord:{seconde.id}"}

    # Toucher une ligne ouvre son détail.
    provider.sent.clear()
    toucher(provider, f"ord:{seconde.id}")
    assert f"BVY-{seconde.id}" in provider.sent[0]["body"]
    assert "En préparation" in provider.sent[0]["body"]


# ── Confidentialité ────────────────────────────────────────────────────────

def test_on_ne_voit_jamais_la_commande_d_un_autre(boutique, provider):
    voisine = commander(boutique, f"+{AUTRE_CLIENT}", colis=["ASSIGNED"])

    ecrire(provider, "ma commande")

    assert "aucune commande" in provider.last["body"]
    assert f"BVY-{voisine.id}" not in tout_le_texte(provider)


def test_un_bouton_vers_la_commande_d_un_autre_ne_donne_rien(boutique, provider):
    """Même en devinant l'identifiant, on n'ouvre pas la commande du voisin."""
    voisine = commander(boutique, f"+{AUTRE_CLIENT}")
    commander(boutique, f"+{CLIENT}")

    toucher(provider, f"ord:{voisine.id}")

    assert "aucune commande" in provider.last["body"]
    assert "Robe wax" not in tout_le_texte(provider)


def test_sans_commande_le_client_est_oriente(boutique, provider):
    ecrire(provider, "ou est ma commande")

    assert provider.last["kind"] == "text"
    assert "autre numéro" in provider.last["body"]
    assert "aide" in provider.last["body"]


# ── Ce que le message dit, et ne dit pas ───────────────────────────────────

def test_une_commande_non_payee_le_dit(boutique, provider):
    order = commander(boutique, f"+{CLIENT}", statut="CREATED")
    Order.objects.filter(pk=order.pk).update(payment_status="PENDING")

    ecrire(provider, "commande")

    detail = provider.sent[0]["body"]
    assert "En attente de paiement" in detail
    assert "Paiement non finalisé" in detail
    assert "Mobile Money" in detail
    # Le bouton mène au paiement, pas a une page d'information.
    assert provider.last["kind"] == "link"
    assert provider.last["button"] == "💳 Payer ma commande"
    assert provider.last["url"].startswith("https://belivay.com/orders/")


def test_plusieurs_colis_sont_suivis_un_par_un(boutique, provider):
    commander(boutique, f"+{CLIENT}", colis=["PICKED_UP", "OUT_FOR_DELIVERY"])

    ecrire(provider, "ma commande")

    detail = provider.sent[0]["body"]
    assert "Suivi de vos 2 colis" in detail
    assert "Ramassé chez le vendeur" in detail
    assert "En cours de livraison" in detail
    assert "Boutique Mama Ngo" in detail


def test_sans_colis_le_client_sait_pourquoi(boutique, provider):
    commander(boutique, f"+{CLIENT}")

    ecrire(provider, "ma commande")

    assert "sera confié à un livreur" in provider.sent[0]["body"]


def test_le_code_de_reception_ne_sort_jamais(boutique, provider):
    order = commander(boutique, f"+{CLIENT}", colis=["ASSIGNED"])
    colis = order.shipments.first()
    code = colis.ensure_pickup_confirmation_code()
    colis.receipt_confirmation_code = "123456"
    colis.save(update_fields=["receipt_confirmation_code"])

    ecrire(provider, "ma commande")

    texte = tout_le_texte(provider)
    assert code not in texte
    assert "123456" not in texte
    assert "reste dans l'application" in texte


def test_une_commande_terminee_n_affiche_plus_la_consigne(boutique, provider):
    commander(boutique, f"+{CLIENT}", statut="BUYER_CONFIRMED", colis=["DELIVERED"])

    ecrire(provider, "ma commande")

    detail = provider.sent[0]["body"]
    assert "Réception confirmée" in detail
    assert "code de réception" not in detail


def test_le_client_anglophone_est_servi_en_anglais(boutique, provider):
    commander(boutique, f"+{CLIENT}", colis=["IN_TRANSIT"])

    ecrire(provider, "my order", langue="en")

    detail = provider.sent[0]["body"]
    assert "Order BVY-" in detail
    assert "On the way" in detail


# ── L'assistant shopping n'est pas perturbé ────────────────────────────────

def test_une_recherche_normale_reste_une_recherche(boutique, provider):
    commander(boutique, f"+{CLIENT}")

    ecrire(provider, "robe wax")

    assert "Commande BVY-" not in tout_le_texte(provider)
    # Le resultat est une liste d'articles : le titre est dans ses lignes.
    assert provider.last["kind"] == "list"
    assert any("Robe wax" in row.title for row in provider.last["rows"])
