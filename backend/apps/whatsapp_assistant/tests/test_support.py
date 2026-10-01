# backend/apps/whatsapp_assistant/tests/test_support.py
# Étape 6.4 — parler à un humain.
#
# Le point le plus important n'est pas l'envoi de la demande, c'est le SILENCE
# qui suit : tant qu'un conseiller a la main, l'assistant ne doit rien
# répondre, sous peine de parler par-dessus lui.

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from apps.accounts.models import UserNotification
from apps.catalog.models import Category, Product
from apps.contact.models import ContactMessage
from apps.orders.models import Order, OrderItem
from apps.vendors.models import VendorProfile
from apps.whatsapp_assistant.models import WhatsAppContact
from apps.whatsapp_assistant.providers import IncomingMessage

from .test_conversation import FakeProvider

pytestmark = pytest.mark.django_db

ENVOI_EMAILS = "apps.whatsapp_assistant.bridge.support.send_contact_emails"
CLIENT = "237690111222"


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture(autouse=True)
def _pas_d_envoi_reel():
    """La file Celery n'est pas là : on vérifie qu'on l'appelle, sans rien envoyer."""
    with patch("apps.contact.utils.send_contact_emails.delay") as envoi:
        yield envoi


@pytest.fixture
def catalogue():
    seller = User.objects.create_user(username="mama-ngo", password="p")
    VendorProfile.objects.create(
        user=seller, business_name="Boutique Mama Ngo", business_description="Mode",
        phone="+237690112233", address="Akwa", city="Douala",
        status=VendorProfile.Status.APPROVED,
    )
    category = Category.objects.create(name="Mode Femme", slug="mode-femme")
    return Product.objects.create(
        title="Robe wax ceinturée", category=category, price_xaf=18500,
        is_active=True, moderation_status="APPROVED", vendor=seller,
    )


def commander(catalogue, email="aurelie@example.com"):
    order = Order.objects.create(
        customer_phone=f"+{CLIENT}", customer_email=email, city="Douala",
        address="Akwa", total_xaf=18500, fulfillment_status="PAID_IN_ESCROW",
        payment_status="PAID",
    )
    OrderItem.objects.create(
        order=order, product=catalogue, title_snapshot=catalogue.title,
        price_xaf_snapshot=18500, qty=1, line_total_xaf=18500,
    )
    return order


def contact_de(wa_id=CLIENT, langue="fr", nom="Aurélie"):
    contact, cree = WhatsAppContact.objects.get_or_create(
        wa_id=wa_id, defaults={"language": langue, "profile_name": nom},
    )
    if cree or not contact.language:
        contact.language = langue
        contact.profile_name = nom
        contact.save(update_fields=["language", "profile_name"])
    return contact


def envoyer(provider, texte="", reply_id="", kind=None, wa_id=CLIENT):
    contact = contact_de(wa_id)
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=wa_id, profile_name=contact.profile_name,
        type=kind or ("interactive" if reply_id else "text"), text=texte, reply_id=reply_id,
    )
    from apps.whatsapp_assistant.conversation.engine import handle_message

    handle_message(contact, message, provider)
    contact.refresh_from_db()
    return contact


def tout_le_texte(provider) -> str:
    return "\n".join(str(envoi.get("body", "")) for envoi in provider.sent)


# ── Ouvrir une demande ─────────────────────────────────────────────────────

def test_le_client_demande_un_humain_et_sa_demande_part(catalogue, provider, _pas_d_envoi_reel):
    commander(catalogue)

    contact = envoyer(provider, "parler a un humain")
    assert "Dites-nous tout" in provider.last["body"]
    assert contact.state == "support:ask"

    provider.sent.clear()
    contact = envoyer(provider, "Ma commande est arrivée abîmée, que dois-je faire ?")

    demande = ContactMessage.objects.get()
    assert demande.message == "Ma commande est arrivée abîmée, que dois-je faire ?"
    assert demande.phone == f"+{CLIENT}"
    assert demande.email == "aurelie@example.com"       # repris de sa commande
    assert demande.subject.startswith("[WhatsApp]")
    assert demande.status == "NEW"
    assert demande.user_agent == "WhatsApp"
    # Le même envoi d'e-mails que le formulaire du site.
    _pas_d_envoi_reel.assert_called_once_with(demande.id)
    assert f"n° {demande.id}" in provider.sent[0]["body"]


def test_l_equipe_est_prevenue_dans_l_application(catalogue, provider):
    """Le formulaire du site n'alerte personne en interne : ici, si."""
    commander(catalogue)
    staff = User.objects.create_user(username="support-belivay", is_staff=True)
    User.objects.create_user(username="simple-client")           # ne doit rien recevoir

    envoyer(provider, "je veux parler a un conseiller")
    envoyer(provider, "Mon colis n'est jamais arrivé chez moi.")

    notifications = UserNotification.objects.filter(notification_type="SUPPORT")
    assert [n.user_id for n in notifications] == [staff.id]
    assert "Mon colis n'est jamais arrivé" in notifications[0].message


def test_l_email_est_demande_quand_on_ne_le_connait_pas(provider, _pas_d_envoi_reel):
    contact = envoyer(provider, "humain")
    provider.sent.clear()

    contact = envoyer(provider, "Je n'arrive pas à créer mon compte sur le site.")
    assert "adresse e-mail" in provider.last["body"]
    assert contact.state == "support:email"
    assert ContactMessage.objects.count() == 0          # rien n'est parti sans adresse

    provider.sent.clear()
    envoyer(provider, "pas-une-adresse")
    assert "ne semble pas valide" in provider.last["body"]
    assert ContactMessage.objects.count() == 0

    provider.sent.clear()
    envoyer(provider, "paul@example.com")

    demande = ContactMessage.objects.get()
    assert demande.email == "paul@example.com"
    # Son message a été gardé de côté : il n'a pas eu à le retaper.
    assert demande.message == "Je n'arrive pas à créer mon compte sur le site."


def test_un_message_trop_court_est_refuse_gentiment(catalogue, provider):
    commander(catalogue)
    envoyer(provider, "humain")
    provider.sent.clear()

    envoyer(provider, "aide")

    assert "un peu court" in provider.last["body"]
    assert ContactMessage.objects.count() == 0


def test_le_client_peut_annuler(catalogue, provider):
    commander(catalogue)
    envoyer(provider, "humain")
    provider.sent.clear()

    contact = envoyer(provider, "annuler")

    assert "annulée" in provider.last["body"]
    assert contact.state == ""
    assert ContactMessage.objects.count() == 0


# ── Le silence pendant qu'un conseiller répond ─────────────────────────────

def _passer_la_main(catalogue, provider):
    commander(catalogue)
    envoyer(provider, "humain")
    contact = envoyer(provider, "Ma commande est arrivée abîmée, que faire ?")
    provider.sent.clear()
    return contact


def test_l_assistant_se_tait_quand_un_conseiller_a_la_main(catalogue, provider):
    contact = _passer_la_main(catalogue, provider)
    assert contact.state == "human"

    envoyer(provider, "Vous êtes là ?")
    envoyer(provider, "robe wax")                       # ne doit PAS lancer une recherche

    assert provider.sent == []


def test_le_silence_vaut_aussi_pour_une_photo(catalogue, provider):
    """Le client envoie la photo de son article abîmé : l'assistant ne s'interpose pas."""
    _passer_la_main(catalogue, provider)

    envoyer(provider, kind="image")

    assert provider.sent == []


def test_le_client_peut_reprendre_avec_l_assistant(catalogue, provider):
    contact = _passer_la_main(catalogue, provider)

    contact = envoyer(provider, "menu")

    assert contact.state != "human"
    assert "Me revoilà" in tout_le_texte(provider)
    assert provider.last["kind"] == "buttons"           # l'accueil est revenu


def test_l_assistant_reprend_la_main_apres_le_delai(catalogue, provider):
    contact = _passer_la_main(catalogue, provider)
    # Le conseiller n'a pas répondu : la mise en retrait expire.
    contact.context = {"until": (timezone.now() - timedelta(minutes=1)).isoformat()}
    contact.save(update_fields=["context"])

    contact = envoyer(provider, "bonjour")

    assert contact.state != "human"
    assert provider.sent != []                          # l'assistant a repris son cours


def test_la_duree_du_retrait_est_reglable(catalogue, provider, settings):
    settings.WHATSAPP_HUMAN_HANDOVER_HOURS = "2"
    from django.utils.dateparse import parse_datetime

    contact = _passer_la_main(catalogue, provider)

    fin = parse_datetime(contact.context["until"])
    assert timedelta(hours=1, minutes=55) < (fin - timezone.now()) <= timedelta(hours=2)


# ── L'écran d'aide mène enfin quelque part ─────────────────────────────────

def test_l_ecran_d_aide_propose_un_conseiller(provider):
    envoyer(provider, "aide")

    boutons = [b.id for b in provider.last["buttons"]]
    assert boutons[0] == "human"
    assert "Besoin d'aide" in provider.last["body"]


def test_le_bouton_conseiller_ouvre_la_demande(catalogue, provider):
    commander(catalogue)

    contact = envoyer(provider, reply_id="human")

    assert "Dites-nous tout" in provider.last["body"]
    assert contact.state == "support:ask"


# ── Le reste de l'assistant n'est pas perturbé ─────────────────────────────

def test_une_recherche_normale_reste_une_recherche(catalogue, provider):
    envoyer(provider, "robe wax")

    assert provider.last["kind"] == "list"
    assert any("Robe wax" in row.title for row in provider.last["rows"])


@pytest.mark.parametrize("phrase", [
    "humain",
    "je veux parler a un humain",
    "parler a un conseiller",
    "j ai une reclamation",
    "I want to talk to a human",
])
def test_les_facons_de_reclamer_une_personne(catalogue, provider, phrase):
    """Personne n'ecrit la meme formule : toutes doivent ouvrir la demande."""
    envoyer(provider, phrase)

    assert "Dites-nous tout" in provider.last["body"] or "Tell us everything" in provider.last["body"]
