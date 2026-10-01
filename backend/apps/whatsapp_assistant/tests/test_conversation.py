# backend/apps/whatsapp_assistant/tests/test_conversation.py
# Étape 3 — le client choisit sa langue, parcourt les catégories de l'admin,
# consulte les articles approuvés, cherche un article, demande de l'aide.
# Un faux fournisseur enregistre ce que l'assistant enverrait.

from datetime import timedelta
from io import BytesIO
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from apps.catalog.models import Category, Product, ProductImage
from apps.vendors.models import VendorProfile
from apps.whatsapp_assistant.conversation.engine import handle_message
from apps.whatsapp_assistant.models import WhatsAppContact
from apps.whatsapp_assistant.providers import IncomingMessage, WhatsAppProvider

pytestmark = pytest.mark.django_db


class FakeProvider(WhatsAppProvider):
    name = "fake"

    def __init__(self):
        self.sent = []
        self.uploads = []

    def verify_signature(self, body, headers):
        return True

    def parse_webhook(self, payload):
        return []

    def send_text(self, to, text):
        self.sent.append({"kind": "text", "to": to, "body": text})
        return f"wamid.{len(self.sent)}"

    def send_buttons(self, to, body, buttons, image_id=None, footer=""):
        self.sent.append({"kind": "buttons", "to": to, "body": body, "buttons": buttons,
                          "image_id": image_id, "footer": footer})
        return f"wamid.{len(self.sent)}"

    def send_link_button(self, to, body, button_text, url, image_id=None, footer=""):
        self.sent.append({"kind": "link", "to": to, "body": body, "button": button_text, "url": url,
                          "image_id": image_id, "footer": footer})
        return f"wamid.{len(self.sent)}"

    def send_image(self, to, media_id, caption=""):
        self.sent.append({"kind": "image", "to": to, "media_id": media_id, "body": caption})
        return f"wamid.{len(self.sent)}"

    def upload_media(self, content, mime_type, filename):
        self.uploads.append({"mime_type": mime_type, "filename": filename, "size": len(content)})
        return f"media.{len(self.uploads)}"

    def send_list(self, to, body, button_label, sections, header="", footer=""):
        rows = [row for section in sections for row in section.rows]
        self.sent.append({"kind": "list", "to": to, "body": body, "button": button_label, "rows": rows})
        return f"wamid.{len(self.sent)}"

    def send_template(self, to, name, language, body_params=(), button_payloads=()):
        self.sent.append({"kind": "template", "to": to, "name": name, "language": language,
                          "params": list(body_params), "buttons": list(button_payloads)})
        return f"wamid.{len(self.sent)}"

    def send_location(self, to, latitude, longitude, name="", address=""):
        self.sent.append({"kind": "location", "to": to, "latitude": latitude, "longitude": longitude,
                          "body": name, "address": address})
        return f"wamid.{len(self.sent)}"

    @property
    def last(self):
        return self.sent[-1]


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture
def contact():
    return WhatsAppContact.objects.create(wa_id="237690000001", profile_name="Owen Test", language="fr")


def say(provider, contact, text="", reply_id="", kind=None):
    message = IncomingMessage(
        message_id=f"wamid.in.{len(provider.sent)}", wa_id=contact.wa_id, profile_name=contact.profile_name,
        type=kind or ("interactive" if reply_id else "text"), text=text, reply_id=reply_id,
    )
    handle_message(contact, message, provider)
    contact.refresh_from_db()
    return provider.last


def ids(message):
    if message["kind"] == "buttons":
        return [b.id for b in message["buttons"]]
    return [r.id for r in message["rows"]]


@pytest.fixture
def catalogue():
    mode = Category.objects.create(name="Mode Femme", slug="mode-femme", display_order=1)
    robes = Category.objects.create(name="Robes", slug="robes", parent=mode)
    pagnes = Category.objects.create(name="Pagnes", slug="pagnes", parent=mode)
    sacs = Category.objects.create(name="Sacs", slug="sacs", parent=mode)          # aucun article
    tech = Category.objects.create(name="Tech", slug="tech", display_order=2)
    vide = Category.objects.create(name="Maison", slug="maison", display_order=4)  # aucun article
    cachee = Category.objects.create(name="Cachée", slug="cachee", display_order=3, is_active=False)

    seller = User.objects.create_user(username="mama-ngo", password="p")
    VendorProfile.objects.create(
        user=seller, business_name="Boutique Mama Ngo", business_description="Mode",
        phone="+237690112233", address="Akwa", city="Douala", status=VendorProfile.Status.APPROVED,
    )

    def product(title, category, price_xaf, status="APPROVED", **extra):
        return Product.objects.create(
            title=title, category=category, price_xaf=price_xaf, is_active=True,
            moderation_status=status, vendor=seller, **extra,
        )

    return {
        "mode": mode, "robes": robes, "pagnes": pagnes, "sacs": sacs, "tech": tech,
        "vide": vide, "cachee": cachee,
        "robe": product("Robe wax ceinturée", robes, 18500, compare_at_price=24000,
                        short_description="Coupe cintrée, wax authentique."),
        "pagne": product("Pagne wax 6 yards", pagnes, 12000),
        "robe_attente": product("Robe en attente", robes, 9000, status="PENDING"),
        "casque": product("Casque Bluetooth", tech, 15000),
        "enceinte": product("Enceinte portable", tech, 22000),
        "cache": product("Article caché", cachee, 5000),
    }


# ── Langue et accueil ───────────────────────────────────────────────────────

def test_premier_contact_propose_la_langue(provider):
    newcomer = WhatsAppContact.objects.create(wa_id="237690000009", profile_name="Awa")

    message = say(provider, newcomer, "Bonjour")

    assert ids(message) == ["lang:fr", "lang:en"]
    assert newcomer.state == "language"


def test_choisir_le_francais_affiche_l_accueil(provider):
    newcomer = WhatsAppContact.objects.create(wa_id="237690000009", profile_name="Awa Mballa")

    message = say(provider, newcomer, "🇫🇷 Français", reply_id="lang:fr")

    assert newcomer.language == "fr"
    assert "Bonjour Awa" in message["body"]
    assert ids(message) == ["shop", "search", "help"]


def test_ecrire_english_choisit_l_anglais(provider):
    newcomer = WhatsAppContact.objects.create(wa_id="237690000009", profile_name="John")

    message = say(provider, newcomer, "English")

    assert newcomer.language == "en"
    assert "Hello John" in message["body"]
    assert message["buttons"][0].title == "🛍️ Shop"


def test_mots_cles_menu_et_langue(provider, contact):
    assert ids(say(provider, contact, "MENU !")) == ["shop", "search", "help"]
    assert ids(say(provider, contact, "langue")) == ["lang:fr", "lang:en"]


def test_aide_affiche_le_contact_humain(provider, contact):
    message = say(provider, contact, reply_id="help")

    assert "+237 689 00 28 12" in message["body"]
    assert "contact@belivay.com" in message["body"]


def test_message_non_textuel(provider, contact):
    message = say(provider, contact, kind="image")

    assert "type de message" in message["body"]


# ── Catégories de l'admin ───────────────────────────────────────────────────

def test_acheter_liste_les_categories_visibles_de_l_admin(provider, contact, catalogue):
    message = say(provider, contact, reply_id="shop")

    assert message["kind"] == "list"
    # Tout le catalogue, comme le site : seule « Cachée », désactivée par l'admin, n'y est pas.
    assert [r.title for r in message["rows"]] == ["Mode Femme", "Tech", "Maison"]
    assert message["rows"][0].description == "3 sous-catégories · 2 articles"
    assert message["rows"][1].description == "2 articles"
    assert message["rows"][2].description == "Bientôt disponible"


def test_une_categorie_ouvre_ses_sous_categories(provider, contact, catalogue):
    mode = catalogue["mode"]

    message = say(provider, contact, reply_id=f"cat:{mode.id}")

    # Ordre de l'admin, puis alphabétique.
    assert ids(message) == [
        f"all:{mode.id}", f"cat:{catalogue['pagnes'].id}", f"cat:{catalogue['robes'].id}",
        f"cat:{catalogue['sacs'].id}", "shop",
    ]
    assert message["rows"][3].description == "Bientôt disponible"


def test_une_sous_categorie_finale_montre_ses_articles_approuves(provider, contact, catalogue):
    message = say(provider, contact, reply_id=f"cat:{catalogue['robes'].id}")

    assert message["kind"] == "list"
    assert [r.title for r in message["rows"]] == ["Robe wax ceinturée"]      # l'article en attente est exclu
    assert message["rows"][0].description == "18 500 FCFA · Boutique Mama Ngo"
    assert contact.context["ids"] == [catalogue["robe"].id]


def test_tout_voir_regroupe_les_sous_categories(provider, contact, catalogue):
    message = say(provider, contact, reply_id=f"all:{catalogue['mode'].id}")

    assert {r.title for r in message["rows"]} == {"Robe wax ceinturée", "Pagne wax 6 yards"}


def test_une_categorie_encore_vide_le_dit(provider, contact, catalogue):
    message = say(provider, contact, reply_id=f"cat:{catalogue['sacs'].id}")

    assert "pas encore d'article" in message["body"]
    assert ids(message) == ["shop", "menu"]


def test_boutique_sans_categorie(provider, contact):
    message = say(provider, contact, reply_id="shop")

    assert "aucun article en vente" in message["body"]
    assert ids(message) == ["menu"]


def test_les_categories_se_feuillettent_par_pages(provider, contact):
    for number in range(12):
        category = Category.objects.create(name=f"Catégorie {number:02d}", slug=f"cat-{number}", display_order=number)
        Product.objects.create(title=f"Article {number}", category=category, price_xaf=1000,
                               is_active=True, moderation_status="APPROVED")

    first = say(provider, contact, reply_id="shop")
    second = say(provider, contact, reply_id="cats:root:1")

    assert len(first["rows"]) == 10 and first["rows"][-1].id == "cats:root:1"
    assert [r.title for r in second["rows"]] == ["Catégorie 09", "Catégorie 10", "Catégorie 11"]


# ── Fiches articles ─────────────────────────────────────────────────────────

def test_fiche_article_avec_prix_barre_et_boutique(provider, contact, catalogue):
    say(provider, contact, reply_id=f"cat:{catalogue['robes'].id}")

    card = say(provider, contact, reply_id=f"prod:{catalogue['robe'].id}")

    assert card["kind"] == "buttons"
    assert "*Robe wax ceinturée*" in card["body"]
    assert "18 500 FCFA" in card["body"] and "~24 000 FCFA~" in card["body"]
    assert "Boutique Mama Ngo" in card["body"]
    assert ids(card) == ["list", "menu"]                       # un seul article : pas de « Suivant »


def test_suivant_passe_a_l_article_d_apres(provider, contact, catalogue):
    say(provider, contact, reply_id=f"cat:{catalogue['tech'].id}")
    first_id = contact.context["ids"][0]

    first = say(provider, contact, reply_id=f"prod:{first_id}")
    second = say(provider, contact, reply_id="next")

    assert ids(first) == ["next", "list", "menu"]
    assert first["body"] != second["body"]
    assert ids(second) == ["list", "menu"]


@pytest.fixture
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    settings.STORAGES = {**settings.STORAGES}       # recrée le stockage sur ce MEDIA_ROOT
    return tmp_path


def _webp_upload(name="visuel.webp", color=(200, 50, 50)):
    buffer = BytesIO()
    Image.new("RGBA", (60, 60), color + (255,)).save(buffer, format="WEBP")   # comme les images BelivaY
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/webp")


def test_la_photo_de_l_article_part_en_jpeg_et_n_est_deposee_qu_une_fois(provider, contact, catalogue, media_root):
    ProductImage.objects.create(product=catalogue["casque"], is_primary=True, image=_webp_upload("casque.webp"))

    first = say(provider, contact, reply_id=f"prod:{catalogue['casque'].id}")
    again = say(provider, contact, reply_id=f"prod:{catalogue['casque'].id}")

    assert first["image_id"] == again["image_id"] == "media.1"
    assert len(provider.uploads) == 1                 # identifiant réutilisé
    assert provider.uploads[0]["mime_type"] == "image/jpeg"
    assert provider.uploads[0]["filename"].endswith(".jpg")


# ── Affiches publicitaires ──────────────────────────────────────────────────

def _poster(title, order=0, **extra):
    from apps.whatsapp_assistant.models import WhatsAppPoster
    return WhatsAppPoster.objects.create(
        title=title, image=_webp_upload(f"{title}.webp"), display_order=order,
        caption_fr=f"{title} : la légende", caption_en=f"{title}: the caption", **extra,
    )


def test_l_affiche_part_avant_le_choix_de_la_langue(provider, media_root):
    _poster("Bienvenue")
    newcomer = WhatsAppContact.objects.create(wa_id="237690000009", profile_name="Awa")

    say(provider, newcomer, "Bonjour")

    assert [m["kind"] for m in provider.sent] == ["image", "buttons"]
    assert provider.sent[0]["body"] == "Bienvenue : la légende\n\n_Bienvenue: the caption_"   # bilingue
    assert ids(provider.sent[1]) == ["lang:fr", "lang:en"]


def test_bonjour_affiche_puis_accueil_mais_pas_deux_fois_de_suite(provider, contact, media_root):
    _poster("Promo")

    say(provider, contact, "Bonjour")
    say(provider, contact, "Salut")

    kinds = [m["kind"] for m in provider.sent]
    assert kinds == ["image", "buttons", "buttons"]           # 2e salutation : pas de nouvelle affiche
    assert provider.sent[0]["body"] == "Promo : la légende"   # langue connue : français seul


def test_les_affiches_tournent_et_menu_n_en_envoie_pas(provider, contact, media_root, settings):
    settings.WHATSAPP_POSTER_COOLDOWN_MINUTES = "0"
    _poster("Première", order=1)
    _poster("Seconde", order=2)
    _poster("Expirée", order=3, ends_at=timezone.now() - timedelta(days=1))

    say(provider, contact, "Bonjour")
    say(provider, contact, "menu")
    say(provider, contact, "Bonjour")
    say(provider, contact, "Bonjour")

    captions = [m["body"] for m in provider.sent if m["kind"] == "image"]
    assert captions == ["Première : la légende", "Seconde : la légende", "Première : la légende"]


# ── Recherche ───────────────────────────────────────────────────────────────

def test_texte_libre_lance_la_recherche(provider, contact, catalogue):
    message = say(provider, contact, "robe")

    assert message["kind"] == "list"
    assert [r.title for r in message["rows"]] == ["Robe wax ceinturée"]
    assert "Résultats « robe »" in message["body"]


def test_recherche_sans_resultat(provider, contact, catalogue):
    message = say(provider, contact, "tronçonneuse")

    assert "Aucun article trouvé" in message["body"]
    assert ids(message) == ["shop", "menu"]


def test_un_article_masque_n_apparait_pas_dans_la_recherche(provider, contact, catalogue):
    message = say(provider, contact, "article caché")

    assert message["kind"] == "buttons"   # aucun résultat


def test_l_affiche_recherche_part_avant_l_invite_de_recherche(provider, contact, media_root):
    _poster("Accueil")
    _poster("Achetez en ligne", placement="search")

    say(provider, contact, reply_id="search")

    assert [m["kind"] for m in provider.sent] == ["image", "text"]
    assert provider.sent[0]["body"] == "Achetez en ligne : la légende"      # l'affiche « recherche »
    assert "Tapez le nom" in provider.sent[1]["body"]


def test_site_injoignable_le_client_est_prevenu(provider, contact, settings):
    settings.WHATSAPP_CATALOG_SOURCE = "remote"
    import requests
    with patch("apps.whatsapp_assistant.bridge.sources.remote.requests.get",
               side_effect=requests.ConnectionError("hors ligne")):
        message = say(provider, contact, reply_id="shop")

    assert "momentanément indisponible" in message["body"]
    assert ids(message) == ["menu"]


# ── Étape 4 : acheter dans l'application ────────────────────────────────────

def test_fiche_publiee_bouton_acheter_vers_la_page_du_produit(provider, contact, catalogue, settings):
    from apps.catalog.models import MasterProduct
    settings.PUBLIC_SITE_URL = "https://belivay.test"
    master = MasterProduct.objects.create(title="Casque", slug="casque-bluetooth",
                                          category=catalogue["tech"], moderation_status="APPROVED")
    Product.objects.filter(pk=catalogue["casque"].pk).update(master=master)
    say(provider, contact, reply_id=f"cat:{catalogue['tech'].id}")

    say(provider, contact, reply_id=f"prod:{catalogue['casque'].id}")

    card, navigation = provider.sent[-2], provider.sent[-1]
    assert card["kind"] == "link"
    assert card["button"] == "Acheter sur BelivaY"
    assert card["url"] == ("https://belivay.test/product/casque-bluetooth"
                           "?utm_source=whatsapp&utm_medium=assistant&utm_campaign=catalogue")
    assert "*Casque Bluetooth*" in card["body"] and "15 000 FCFA" in card["body"]
    assert "Acheter sur BelivaY" in navigation["body"]
    assert ids(navigation)[-2:] == ["list", "menu"]


def test_fiche_non_publiee_pas_de_lien_casse(provider, contact, catalogue, settings):
    from apps.catalog.models import MasterProduct
    settings.PUBLIC_SITE_URL = "https://belivay.test"
    master = MasterProduct.objects.create(title="Robe", slug="robe-wax", category=catalogue["robes"])  # en attente
    Product.objects.filter(pk=catalogue["robe"].pk).update(master=master)

    card = say(provider, contact, reply_id=f"prod:{catalogue['robe'].id}")

    assert card["kind"] == "buttons"
    assert "Bientôt disponible à l'achat en ligne" in card["body"]
    assert not any(m["kind"] == "link" for m in provider.sent)


def test_l_affiche_acheter_part_avant_les_categories(provider, contact, catalogue, media_root):
    _poster("Pour toute la famille", placement="shop")

    say(provider, contact, reply_id="shop")

    assert [m["kind"] for m in provider.sent] == ["image", "list"]
    assert provider.sent[0]["body"] == "Pour toute la famille : la légende"
