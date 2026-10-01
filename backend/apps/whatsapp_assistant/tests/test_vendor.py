# backend/apps/whatsapp_assistant/tests/test_vendor.py
# Étape 6.2 — le vendeur est prévenu quand une commande est payée, et la fait
# avancer depuis WhatsApp.
#
# Deux points sont surveillés de près : l'anonymat de l'acheteur (BelivaY le
# masque déjà à ses vendeurs, l'assistant ne doit pas le trahir) et le fait
# que les transitions passent bien par le serializer du portail vendeur.

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User

from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.vendors.models import VendorProfile
from apps.whatsapp_assistant.bridge import vendor_orders
from apps.whatsapp_assistant.models import VendorNotification, WhatsAppContact
from apps.whatsapp_assistant.providers import IncomingMessage

from .test_conversation import FakeProvider

pytestmark = pytest.mark.django_db

GET_PROVIDER = "apps.whatsapp_assistant.conversation.vendor.get_provider"
VENDEUR_WA = "237690112233"             # le numéro de la boutique
CLIENT_NOM = "Aurélie Nkomo"
CLIENT_TEL = "677889900"


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture(autouse=True)
def _assistant_actif(settings):
    settings.WHATSAPP_ASSISTANT_ENABLED = "1"
    settings.WHATSAPP_VENDOR_NOTIFICATIONS = "1"
    settings.WHATSAPP_VENDOR_NOTIFY_OVERRIDE = ""


@pytest.fixture
def boutique():
    seller = User.objects.create_user(
        username="mama-ngo", password="p", first_name="Mama", last_name="Ngo",
    )
    profile = VendorProfile.objects.create(
        user=seller, business_name="Boutique Mama Ngo", business_description="Mode",
        phone="+237 6 90 11 22 33", address="Akwa", city="Douala",
        status=VendorProfile.Status.APPROVED,
    )
    category = Category.objects.create(name="Mode Femme", slug="mode-femme")
    robe = Product.objects.create(
        title="Robe wax ceinturée", category=category, price_xaf=18500,
        is_active=True, moderation_status="APPROVED", vendor=seller,
    )
    return {"seller": seller, "profile": profile, "robe": robe, "category": category}


def commander(boutique, *, qty=2, statut="CREATED", payee=False, **extra):
    order = Order.objects.create(
        customer_phone=f"+237{CLIENT_TEL}", city="Yaoundé", district="Bastos",
        address="Rue 1.234", total_xaf=18500 * qty, delivery_fee_xaf=1500,
        fulfillment_status=statut, payment_status="PAID" if payee else "PENDING", **extra,
    )
    OrderItem.objects.create(
        order=order, product=boutique["robe"], title_snapshot=boutique["robe"].title,
        price_xaf_snapshot=18500, qty=qty, line_total_xaf=18500 * qty,
    )
    return order


def payer(order, provider, capture):
    """Le paiement aboutit, comme dans l'application."""
    with patch(GET_PROVIDER, return_value=provider):
        with capture(execute=True):
            vendor_orders.mark_paid_for_test(order.id)


def ecrire(provider, texte, wa_id=VENDEUR_WA, langue="fr"):
    contact, cree = WhatsAppContact.objects.get_or_create(wa_id=wa_id)
    if cree or not contact.language:
        contact.language = langue
        contact.save(update_fields=["language"])
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=wa_id, profile_name="Boutique",
        type="text", text=texte,
    )
    from apps.whatsapp_assistant.conversation.engine import handle_message

    handle_message(contact, message, provider)
    return contact


def toucher(provider, bouton, wa_id=VENDEUR_WA):
    contact, _ = WhatsAppContact.objects.get_or_create(wa_id=wa_id, defaults={"language": "fr"})
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=wa_id, profile_name="Boutique",
        type="interactive", text="", reply_id=bouton,
    )
    from apps.whatsapp_assistant.conversation.engine import handle_message

    handle_message(contact, message, provider)
    return contact


def tout_le_texte(provider) -> str:
    return "\n".join(
        str(envoi.get("body", "")) + " " + " ".join(str(p) for p in envoi.get("params", []))
        for envoi in provider.sent
    )


# ── Le paiement prévient la boutique ───────────────────────────────────────

def test_le_paiement_previent_le_vendeur(boutique, provider, django_capture_on_commit_callbacks):
    order = commander(boutique)

    payer(order, provider, django_capture_on_commit_callbacks)

    envoi = provider.last
    assert envoi["kind"] == "template"
    assert envoi["to"] == VENDEUR_WA               # numéro reconnu malgré les espaces
    assert envoi["name"] == "belivay_nouvelle_commande"
    assert envoi["params"][0] == f"BVY-{order.id}"
    assert envoi["params"][1] == "2 articles"
    assert envoi["buttons"] == [f"ack:{order.id}", f"sale:{order.id}"]

    trace = VendorNotification.objects.get(order_id=order.id)
    assert trace.recipient == VENDEUR_WA
    assert trace.error == ""


def test_une_commande_non_payee_ne_previent_personne(boutique, provider,
                                                     django_capture_on_commit_callbacks):
    with patch(GET_PROVIDER, return_value=provider):
        with django_capture_on_commit_callbacks(execute=True):
            commander(boutique)

    assert provider.sent == []
    assert VendorNotification.objects.count() == 0


def test_la_meme_commande_n_est_annoncee_qu_une_fois(boutique, provider,
                                                     django_capture_on_commit_callbacks):
    order = commander(boutique)
    payer(order, provider, django_capture_on_commit_callbacks)
    envois = len(provider.sent)

    # La commande est re-sauvegardée (le vendeur confirme) : pas de second message.
    with patch(GET_PROVIDER, return_value=provider):
        with django_capture_on_commit_callbacks(execute=True):
            vendor_orders.acknowledge(order.id, boutique["seller"].id)

    assert len(provider.sent) == envois
    assert VendorNotification.objects.count() == 1


def test_une_boutique_non_approuvee_n_est_pas_derangee(boutique, provider,
                                                       django_capture_on_commit_callbacks):
    boutique["profile"].status = VendorProfile.Status.PENDING
    boutique["profile"].save(update_fields=["status"])
    order = commander(boutique)

    payer(order, provider, django_capture_on_commit_callbacks)

    assert provider.sent == []


def test_le_reglage_permet_de_couper_les_envois(boutique, provider, settings,
                                                django_capture_on_commit_callbacks):
    settings.WHATSAPP_VENDOR_NOTIFICATIONS = "0"
    order = commander(boutique)

    payer(order, provider, django_capture_on_commit_callbacks)

    assert provider.sent == []


# ── L'acheteur reste anonyme ───────────────────────────────────────────────

def test_le_vendeur_ne_voit_jamais_l_identite_de_l_acheteur(boutique, provider,
                                                            django_capture_on_commit_callbacks):
    acheteur = User.objects.create_user(username="cliente", first_name="Aurélie", last_name="Nkomo")
    order = commander(boutique, user=acheteur)
    payer(order, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, f"sale:{order.id}")

    texte = tout_le_texte(provider)
    assert CLIENT_TEL not in texte.replace(" ", "")
    assert "Aurélie" not in texte and "Nkomo" not in texte
    assert "Acheteur #" in texte                  # l'étiquette anonyme du portail
    assert "Bastos" in texte                      # la ville, elle, est utile au vendeur


def test_le_code_de_remise_ne_part_pas_par_message(boutique, provider,
                                                   django_capture_on_commit_callbacks):
    order = commander(boutique)
    payer(order, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, f"sale:{order.id}")

    assert "dans votre application" in tout_le_texte(provider)


# ── Les deux gestes ────────────────────────────────────────────────────────

def test_je_confirme_puis_colis_pret(boutique, provider, django_capture_on_commit_callbacks):
    order = commander(boutique)
    payer(order, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    # « Je confirme » enchaîne accusé de réception ET mise en préparation.
    toucher(provider, f"ack:{order.id}")
    order.refresh_from_db()
    assert order.fulfillment_status == "PREPARING"
    assert order.prep_deadline is not None          # le délai de 4 h ouvrées a démarré
    assert "confirmée" in provider.sent[0]["body"]
    # Le bouton proposé devient « Colis prêt ».
    assert [b.id for b in provider.last["buttons"]] == [f"rdy:{order.id}", "sales"]

    provider.sent.clear()
    toucher(provider, f"rdy:{order.id}")
    order.refresh_from_db()
    assert order.fulfillment_status == "READY_FOR_PICKUP"
    assert "prête" in provider.sent[0]["body"]
    # Le colis est pret : le delai de preparation n'a plus lieu d'etre affiche.
    assert "À préparer avant" not in provider.sent[1]["body"]
    # Plus rien à faire ici : seul le retour à la liste reste.
    assert [b.id for b in provider.last["buttons"]] == ["sales"]


def test_confirmer_deux_fois_ne_change_rien(boutique, provider, django_capture_on_commit_callbacks):
    order = commander(boutique)
    payer(order, provider, django_capture_on_commit_callbacks)
    toucher(provider, f"ack:{order.id}")
    order.refresh_from_db()
    statut = order.fulfillment_status
    provider.sent.clear()

    toucher(provider, f"ack:{order.id}")

    order.refresh_from_db()
    assert order.fulfillment_status == statut
    assert "déjà à ce stade" in provider.sent[0]["body"] or "ne peut plus" in provider.sent[0]["body"]


def test_l_historique_du_coeur_est_bien_ecrit(boutique, provider,
                                              django_capture_on_commit_callbacks):
    """La transition doit passer par le serializer du portail, pas à côté."""
    order = commander(boutique)
    payer(order, provider, django_capture_on_commit_callbacks)

    toucher(provider, f"ack:{order.id}")

    actions = list(order.history.values_list("action", "new_value"))
    assert ("Statut livraison modifié par le vendeur", "VENDOR_ACKNOWLEDGED") in actions
    assert ("Statut livraison modifié par le vendeur", "PREPARING") in actions


def test_un_inconnu_ne_peut_rien_faire(boutique, provider, django_capture_on_commit_callbacks):
    order = commander(boutique)
    payer(order, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    toucher(provider, f"ack:{order.id}", wa_id="237655000000")

    order.refresh_from_db()
    assert order.fulfillment_status == "PAID_IN_ESCROW"
    assert "réservé aux vendeurs" in provider.last["body"]


def test_une_commande_d_une_autre_boutique_est_refusee(boutique, provider,
                                                       django_capture_on_commit_callbacks):
    autre = User.objects.create_user(username="autre-vendeur")
    VendorProfile.objects.create(
        user=autre, business_name="Autre Boutique", business_description="Tech",
        phone="+237690999888", address="Bonanjo", city="Douala",
        status=VendorProfile.Status.APPROVED,
    )
    ailleurs = Product.objects.create(
        title="Casque Bluetooth", category=boutique["category"], price_xaf=15000,
        is_active=True, moderation_status="APPROVED", vendor=autre,
    )
    order = Order.objects.create(
        customer_phone=f"+237{CLIENT_TEL}", city="Douala", address="Akwa",
        total_xaf=15000, fulfillment_status="PAID_IN_ESCROW", payment_status="PAID",
    )
    OrderItem.objects.create(
        order=order, product=ailleurs, title_snapshot=ailleurs.title,
        price_xaf_snapshot=15000, qty=1, line_total_xaf=15000,
    )

    toucher(provider, f"ack:{order.id}")

    order.refresh_from_db()
    assert order.fulfillment_status == "PAID_IN_ESCROW"
    assert "aucun de vos articles" in provider.last["body"]


# ── Le vendeur retrouve ce qu'il doit préparer ─────────────────────────────

def test_le_vendeur_ecrit_mes_ventes(boutique, provider, django_capture_on_commit_callbacks):
    order = commander(boutique)
    payer(order, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    ecrire(provider, "mes ventes")

    detail = provider.sent[0]["body"]
    assert f"Commande BVY-{order.id}" in detail
    assert "Robe wax ceinturée × 2" in detail
    assert "37 000 FCFA" in detail                 # sa part, pas le total avec livraison
    assert [b.id for b in provider.last["buttons"]] == [f"ack:{order.id}", "sales"]


def test_sans_commande_le_vendeur_est_rassure(boutique, provider):
    ecrire(provider, "mes ventes")

    assert "Aucune commande en attente" in provider.last["body"]


def test_seules_ses_parts_sont_comptees(boutique, provider, django_capture_on_commit_callbacks):
    """Une commande partagée avec une autre boutique : chacun ne voit que ses articles."""
    autre = User.objects.create_user(username="autre-vendeur")
    VendorProfile.objects.create(
        user=autre, business_name="Autre Boutique", business_description="Tech",
        phone="+237690999888", address="Bonanjo", city="Douala",
        status=VendorProfile.Status.APPROVED,
    )
    casque = Product.objects.create(
        title="Casque Bluetooth", category=boutique["category"], price_xaf=15000,
        is_active=True, moderation_status="APPROVED", vendor=autre,
    )
    order = commander(boutique, qty=1)
    OrderItem.objects.create(
        order=order, product=casque, title_snapshot=casque.title,
        price_xaf_snapshot=15000, qty=1, line_total_xaf=15000,
    )
    payer(order, provider, django_capture_on_commit_callbacks)
    provider.sent.clear()

    ecrire(provider, "mes ventes")

    detail = provider.sent[0]["body"]
    assert "Robe wax" in detail
    assert "Casque" not in detail                  # l'article du voisin n'apparaît pas
    assert "18 500 FCFA" in detail                 # sa part seule


def test_le_client_n_est_pas_confondu_avec_le_vendeur(boutique, provider):
    """« mes commandes » reste le suivi d'achat, même pour un numéro de vendeur."""
    ecrire(provider, "mes commandes")

    assert "à préparer" not in tout_le_texte(provider).lower()
