# backend/apps/whatsapp_assistant/tests/test_remote_catalog.py
# Source « remote » : l'assistant présente le catalogue du site en ligne,
# lu par son API publique. Le site est simulé ; aucun appel réseau réel.

from io import BytesIO
from unittest.mock import MagicMock, patch

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
    if url.endswith("/api/catalog/masters/fiche-1/"):        # seule la fiche 1 est publiée
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
