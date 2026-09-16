# backend/apps/whatsapp_assistant/tests/test_remote_catalog.py
# Source « remote » : l'assistant présente le catalogue du site en ligne,
# lu par son API publique. Le site est simulé ; aucun appel réseau réel.

from io import BytesIO
from unittest.mock import MagicMock, patch

import io
import re

import pytest
from PIL import Image

from apps.whatsapp_assistant.bridge import catalog
from apps.whatsapp_assistant.models import WhatsAppContact

from .test_conversation import FakeProvider, ids, say

pytestmark = pytest.mark.django_db

SITE = "https://belivay.example"
GET_PATH = "apps.whatsapp_assistant.bridge.sources.remote.requests.get"

TREE = [
    {"id": 1, "name": "Mode Femme", "display_order": 1, "is_active": True, "is_deprecated": False, "children": [
        {"id": 11, "name": "Robes", "display_order": 0, "is_active": True, "is_deprecated": False, "children": []},
        {"id": 12, "name": "Sacs", "display_order": 1, "is_active": True, "is_deprecated": False, "children": []},
    ]},
    {"id": 2, "name": "Maison & Déco", "display_order": 2, "is_active": True, "is_deprecated": False, "children": []},
]


def _product(pid, title, category_id, price, **extra):
    return {
        "id": pid, "title": title, "price_xaf": price, "price_final": price, "compare_at_price": None,
        "category": {"id": category_id}, "master_slug": f"fiche-{pid}", "short_description": "",
        "rating_average": None, "reviews_count": 0, "images": [], "created_at": f"2026-09-0{pid}T10:00:00Z",
        **extra,
    }


PRODUCTS_PAGE_1 = {"count": 2, "next": f"{SITE}/api/catalog/products/?page=2", "results": [
    _product(1, "Robe du soir", 11, 20000, compare_at_price=25000,
             images=[{"image_url": f"{SITE}/media/products/robe.webp", "is_primary": True, "order": 0}]),
]}
PRODUCTS_PAGE_2 = {"count": 2, "next": None, "results": [_product(2, "Robe de plage", 11, 12000)]}


def _response(payload=None, status=200, content=b""):
    response = MagicMock(status_code=status, content=content)
    response.json.return_value = payload
    return response


def fake_site(url, params=None, **kwargs):
    if url.endswith("/api/catalog/categories/tree/"):
        return _response(TREE)
    if url.endswith("/api/catalog/products/") and params and params.get("search"):
        found = [p for p in PRODUCTS_PAGE_1["results"] + PRODUCTS_PAGE_2["results"]
                 if params["search"].lower() in p["title"].lower()]
        return _response({"results": found, "search_meta": {"mode": "exact"}})
    if url.endswith("/api/catalog/products/"):
        return _response(PRODUCTS_PAGE_1)
    if url.endswith("page=2"):
        return _response(PRODUCTS_PAGE_2)
    if url.endswith("/api/catalog/master-products/fiche-1/"):   # seule la fiche 1 est publiée
        return _response({"id": 1, "slug": "fiche-1"})
    return _response({}, status=404)


@pytest.fixture(autouse=True)
def _remote(settings):
    settings.WHATSAPP_CATALOG_SOURCE = "remote"
    settings.WHATSAPP_CATALOG_API_URL = SITE


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture
def contact():
    return WhatsAppContact.objects.create(wa_id="237690000001", profile_name="Owen", language="fr")


def test_les_categories_sont_celles_du_site_en_ligne(provider, contact):
    with patch(GET_PATH, side_effect=fake_site):
        message = say(provider, contact, reply_id="shop")

    assert [r.title for r in message["rows"]] == ["Mode Femme", "Maison & Déco"]
    assert message["rows"][0].description == "2 sous-catégories · 2 articles"   # 2 pages lues
    assert message["rows"][1].description == "Bientôt disponible"


def test_une_categorie_du_site_montre_les_articles_de_ses_sous_categories(provider, contact):
    with patch(GET_PATH, side_effect=fake_site):
        message = say(provider, contact, reply_id="all:1")

    assert [r.title for r in message["rows"]] == ["Robe de plage", "Robe du soir"]   # plus récent d'abord
    assert message["rows"][0].description == "12 000 FCFA"


def test_fiche_du_site_avec_photo_et_lien_vers_la_fiche_en_ligne(provider, contact):
    buffer = BytesIO()
    Image.new("RGB", (40, 40), (10, 120, 200)).save(buffer, format="WEBP")
    image_urls = []

    def site_with_media(url, params=None, **kwargs):
        if url.endswith(".webp"):                    # la photo, téléchargée puis convertie
            image_urls.append(url)
            return _response(content=buffer.getvalue())
        return fake_site(url, params, **kwargs)

    # remote.py et media.py utilisent le même requests.get : un seul faux site.
    with patch(GET_PATH, side_effect=site_with_media):
        say(provider, contact, reply_id="prod:1")

    card = provider.sent[-2]
    assert card["kind"] == "link"
    assert "~25 000 FCFA~" in card["body"]
    assert card["url"].startswith(f"{SITE}/product/fiche-1?utm_source=whatsapp")
    assert image_urls == [f"{SITE}/media/products/robe.webp"]
    assert card["image_id"] == "media.1" and provider.uploads[0]["mime_type"] == "image/jpeg"


def test_fiche_du_site_pas_encore_publiee(provider, contact):
    with patch(GET_PATH, side_effect=fake_site):
        card = say(provider, contact, reply_id="prod:2")              # fiche-2 : 404 sur le site

    assert card["kind"] == "buttons"
    assert "Bientôt disponible à l'achat en ligne" in card["body"]


def test_la_recherche_passe_par_le_site(provider, contact):
    with patch(GET_PATH, side_effect=fake_site):
        message = say(provider, contact, "plage")

    assert [r.title for r in message["rows"]] == ["Robe de plage"]


def test_le_catalogue_est_garde_en_cache_quelques_secondes(provider, contact):
    with patch(GET_PATH, side_effect=fake_site) as get:
        catalog.root_categories()
        calls_after_first = get.call_count
        catalog.root_categories()

    assert get.call_count == calls_after_first       # aucun nouvel appel au site

def test_les_adresses_appelees_existent_vraiment_dans_le_site():
    """
    Garde-fou ne : le faux site de ces tests reproduisait la meme adresse
    erronee que le code (« masters » au lieu de « master-products »), donc
    l'erreur passait inapercue et le bouton « Acheter » etait masque partout.
    On confronte desormais chaque adresse appelee aux routes reelles de Django.
    """
    from django.urls import resolve
    from django.urls.exceptions import Resolver404

    from apps.whatsapp_assistant.bridge.sources import remote

    source = io.open(remote.__file__, encoding="utf-8").read()
    appelees = set(re.findall(r'"(/api/[^"{}]*(?:\{[a-z_]+\}[^"]*)?)"', source))
    assert appelees, "aucune adresse trouvee dans remote.py"

    for adresse in sorted(appelees):
        # Les gabarits contiennent une variable : on la remplit d'une valeur type.
        concrete = re.sub(r"\{[a-z_]+\}", "essai", adresse)
        try:
            resolve(concrete)
        except Resolver404:                     # pragma: no cover - c'est l'echec attendu
            raise AssertionError(
                f"remote.py appelle {adresse!r}, qui ne correspond a aucune route du site."
            )

def test_la_photo_est_trouvee_dans_les_deux_champs():
    """
    BelivaY range la photo tantot dans « images » (televersee par le vendeur),
    tantot dans « media » (galerie). N'en lire qu'un seul laissait la moitie du
    catalogue sans photo sur WhatsApp.
    """
    from apps.whatsapp_assistant.bridge.sources.remote import _first_image

    televersee = {"images": [{"image_url": "https://site/a.webp", "is_primary": True, "order": 0}]}
    galerie = {"media": [{"url": "https://site/b.jpg", "media_type": "image", "sort_order": 0}]}
    les_deux = {**televersee, **galerie}
    video_seule = {"media": [{"url": "https://site/c.mp4", "media_type": "video", "sort_order": 0}]}

    assert _first_image(televersee) == "https://site/a.webp"
    assert _first_image(galerie) == "https://site/b.jpg"
    assert _first_image(les_deux) == "https://site/a.webp"      # la televersee prime
    assert _first_image(video_seule) is None                    # une video n'est pas une photo
    assert _first_image({}) is None

    # L'ordre declare par le site est respecte.
    desordre = {"media": [{"url": "https://site/2.jpg", "media_type": "image", "sort_order": 2},
                          {"url": "https://site/1.jpg", "media_type": "image", "sort_order": 1}]}
    assert _first_image(desordre) == "https://site/1.jpg"
