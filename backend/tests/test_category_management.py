# backend/tests/test_category_management.py
# Gestion des catégories par l'admin : image, arbre public, filtre produits
# par sous-arbre et règles de publication côté vendeur.

from io import BytesIO
from pathlib import Path

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.catalog.models import Category, Product
from apps.catalog.serializers import ProductCreateUpdateSerializer

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _media_root(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    # R2FallbackStorage fige MEDIA_ROOT à sa création : réaffecter STORAGES
    # force Django à le recréer, sinon les fichiers iraient dans mediafiles/.
    settings.STORAGES = {**settings.STORAGES}
    return tmp_path


@pytest.fixture
def admin_client(api_client):
    admin = User.objects.create_user(username="admin-cat", password="p", is_staff=True)
    api_client.force_authenticate(user=admin)
    return api_client


def _png(name="visuel.png", size=(900, 400), color=(244, 121, 32)):
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def _stored_path(category, media_root):
    return Path(media_root) / category.image.name


# ═══════════════════════════════════════════════════════════════════════════
# IMAGE — création, remplacement, retrait
# ═══════════════════════════════════════════════════════════════════════════

def test_admin_cree_une_categorie_avec_image(admin_client, _media_root):
    resp = admin_client.post(
        "/api/catalog/admin/categories/create/",
        {"name": "Mode Femme", "parent": "", "image": _png()},
        format="multipart",
    )

    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert body["parent"] is None
    assert body["image_url"].endswith(".webp")
    category = Category.objects.get(pk=body["id"])
    assert category.slug == "mode-femme"
    assert _stored_path(category, _media_root).exists()


def test_image_remplacee_supprime_l_ancien_fichier(
    admin_client, _media_root, django_capture_on_commit_callbacks,
):
    category = Category.objects.create(name="Sport", slug="sport", image=_png("a.png"))
    old_path = _stored_path(category, _media_root)
    assert old_path.exists()

    with django_capture_on_commit_callbacks(execute=True):
        resp = admin_client.patch(
            f"/api/catalog/admin/categories/{category.id}/update/",
            {"image": _png("b.png", color=(5, 150, 105))},
            format="multipart",
        )

    assert resp.status_code == 200, resp.json()
    category.refresh_from_db()
    assert category.image.name.endswith(".webp")
    assert _stored_path(category, _media_root).exists()
    assert not old_path.exists()


def test_retrait_de_l_image(admin_client, _media_root, django_capture_on_commit_callbacks):
    category = Category.objects.create(name="Maison", slug="maison", image=_png())
    old_path = _stored_path(category, _media_root)

    with django_capture_on_commit_callbacks(execute=True):
        resp = admin_client.patch(
            f"/api/catalog/admin/categories/{category.id}/update/",
            {"remove_image": "true"},
            format="multipart",
        )

    assert resp.status_code == 200, resp.json()
    assert resp.json()["image_url"] is None
    category.refresh_from_db()
    assert not category.image
    assert not old_path.exists()


def test_fichier_qui_n_est_pas_une_image_est_refuse(admin_client):
    faux = SimpleUploadedFile("note.png", b"pas une image", content_type="image/png")

    resp = admin_client.post(
        "/api/catalog/admin/categories/create/",
        {"name": "Beauté", "image": faux},
        format="multipart",
    )

    assert resp.status_code == 400
    assert "image" in resp.json()
    assert not Category.objects.filter(name="Beauté").exists()


def test_un_client_ne_peut_pas_creer_de_categorie(api_client):
    client = User.objects.create_user(username="client-cat", password="p")
    api_client.force_authenticate(user=client)

    resp = api_client.post(
        "/api/catalog/admin/categories/create/",
        {"name": "Pirate"},
        format="multipart",
    )

    assert resp.status_code == 403


def test_slug_vide_du_formulaire_est_genere_a_la_creation(admin_client):
    """Le formulaire admin envoie slug="" en création : le slug est calculé."""
    resp = admin_client.post(
        "/api/catalog/admin/categories/create/",
        {"name": "Épicerie fine", "slug": "", "parent": None},
        format="json",
    )

    assert resp.status_code == 201, resp.json()
    assert resp.json()["slug"] == "epicerie-fine"


def test_slug_vide_en_edition_conserve_l_ancien(admin_client):
    category = Category.objects.create(name="Jouets", slug="jouets")

    resp = admin_client.patch(
        f"/api/catalog/admin/categories/{category.id}/update/",
        {"slug": "", "description": "Pour les enfants"},
        format="json",
    )

    assert resp.status_code == 200, resp.json()
    category.refresh_from_db()
    assert category.slug == "jouets"
    assert category.description == "Pour les enfants"


# ═══════════════════════════════════════════════════════════════════════════
# NOMS — pas de doublon entre sœurs
# ═══════════════════════════════════════════════════════════════════════════

def test_nom_en_double_sous_le_meme_parent_refuse(admin_client):
    mode = Category.objects.create(name="Mode", slug="mode")
    Category.objects.create(name="Robes", slug="robes", parent=mode)

    resp = admin_client.post(
        "/api/catalog/admin/categories/create/",
        {"name": "robes", "parent": mode.id},
        format="json",
    )

    assert resp.status_code == 400
    assert "Robes" in resp.json()["name"][0] or "robes" in resp.json()["name"][0]


def test_meme_nom_sous_un_autre_parent_accepte(admin_client):
    femme = Category.objects.create(name="Femme", slug="femme")
    homme = Category.objects.create(name="Homme", slug="homme")
    Category.objects.create(name="Chaussures", slug="chaussures-femme", parent=femme)

    resp = admin_client.post(
        "/api/catalog/admin/categories/create/",
        {"name": "Chaussures", "parent": homme.id},
        format="json",
    )

    assert resp.status_code == 201, resp.json()
    assert resp.json()["slug"] != "chaussures-femme"


# ═══════════════════════════════════════════════════════════════════════════
# ARBRE PUBLIC — ce que voient le client et le vendeur
# ═══════════════════════════════════════════════════════════════════════════

def test_arbre_public_expose_image_et_parent(api_client):
    root = Category.objects.create(name="Tech", slug="tech", image=_png())
    Category.objects.create(name="Casques", slug="casques", parent=root)
    Category.objects.create(name="Cachée", slug="cachee", parent=root, is_active=False)

    resp = api_client.get("/api/catalog/categories/tree/")

    assert resp.status_code == 200
    tech = next(node for node in resp.json() if node["slug"] == "tech")
    assert tech["image_url"].startswith("http")
    assert tech["parent"] is None
    assert [child["slug"] for child in tech["children"]] == ["casques"]
    assert tech["children"][0]["parent"] == root.id
    assert tech["children"][0]["image_url"] is None


# ═══════════════════════════════════════════════════════════════════════════
# FILTRE PRODUITS — une catégorie englobe ses sous-catégories
# ═══════════════════════════════════════════════════════════════════════════

def _product(title, category, moderation_status="APPROVED"):
    return Product.objects.create(
        title=title, category=category, price_xaf=1000, is_active=True,
        moderation_status=moderation_status,
    )


def test_filtre_categorie_inclut_toutes_les_descendantes(api_client):
    tel = Category.objects.create(name="Téléphonie", slug="telephonie")
    smart = Category.objects.create(name="Smartphones", slug="smartphones", parent=tel)
    android = Category.objects.create(name="Android", slug="android", parent=smart)
    autre = Category.objects.create(name="Maison", slug="maison-filtre")
    _product("Tecno Spark", android)
    _product("Coque", tel)
    _product("Lampe", autre)

    by_id = api_client.get(f"/api/catalog/products/?category={tel.id}&page_size=50")
    by_slug = api_client.get("/api/catalog/products/?category_slug=smartphones&page_size=50")

    assert by_id.status_code == 200
    assert {p["title"] for p in by_id.json()["results"]} == {"Tecno Spark", "Coque"}
    assert {p["title"] for p in by_slug.json()["results"]} == {"Tecno Spark"}


def test_filtre_slug_inconnu_ne_renvoie_rien(api_client):
    _product("Lampe", Category.objects.create(name="Maison", slug="maison-inconnu"))

    resp = api_client.get("/api/catalog/products/?category_slug=nexiste-pas")

    assert resp.status_code == 200
    assert resp.json()["results"] == []


# ═══════════════════════════════════════════════════════════════════════════
# VENDEUR — ne publie que dans une sous-catégorie finale et visible
# ═══════════════════════════════════════════════════════════════════════════

def _offer(category, instance=None, **extra):
    data = {"title": "Offre", "price_xaf": 5000, "category": category.id, **extra}
    return ProductCreateUpdateSerializer(instance=instance, data=data, partial=instance is not None)


def test_vendeur_publie_dans_une_sous_categorie_finale():
    mode = Category.objects.create(name="Mode", slug="mode-v")
    robes = Category.objects.create(name="Robes", slug="robes-v", parent=mode)

    serializer = _offer(robes)

    assert serializer.is_valid(), serializer.errors


def test_vendeur_ne_peut_pas_choisir_une_categorie_qui_a_des_sous_categories():
    mode = Category.objects.create(name="Mode", slug="mode-parent")
    Category.objects.create(name="Robes", slug="robes-parent", parent=mode)

    serializer = _offer(mode)

    assert not serializer.is_valid()
    assert "sous-catégories" in serializer.errors["category"][0]


def test_vendeur_peut_choisir_un_parent_dont_les_enfants_sont_masques():
    mode = Category.objects.create(name="Mode", slug="mode-masque")
    Category.objects.create(name="Robes", slug="robes-masque", parent=mode, is_active=False)

    serializer = _offer(mode)

    assert serializer.is_valid(), serializer.errors


@pytest.mark.parametrize("flag", [{"is_active": False}, {"is_deprecated": True}])
def test_vendeur_refuse_si_la_categorie_ou_un_ancetre_est_masque(flag):
    mode = Category.objects.create(name="Mode", slug="mode-flag", **flag)
    robes = Category.objects.create(name="Robes", slug="robes-flag", parent=mode)

    serializer = _offer(robes)

    assert not serializer.is_valid()
    assert "Mode" in serializer.errors["category"][0]


def test_modifier_un_produit_sans_changer_sa_categorie_reste_possible():
    """L'admin a ajouté des sous-catégories après coup : le produit n'est pas bloqué."""
    mode = Category.objects.create(name="Mode", slug="mode-existant")
    product = _product("Ancienne offre", mode)
    Category.objects.create(name="Robes", slug="robes-existant", parent=mode)

    serializer = _offer(mode, instance=product, price_xaf=4500)

    assert serializer.is_valid(), serializer.errors


# ═══════════════════════════════════════════════════════════════════════════
# PARCOURS COMPLET — admin crée, vendeur publie, client voit
# ═══════════════════════════════════════════════════════════════════════════

def _approved_vendor(username="vendeur-parcours"):
    from apps.vendors.models import VendorLocation, VendorProfile

    user = User.objects.create_user(username=username, password="p")
    profile = VendorProfile.objects.create(
        user=user, business_name="Boutique Parcours", business_description="Mode",
        phone="+237699000010", address="Akwa, Douala", city="Douala",
        status=VendorProfile.Status.APPROVED,
    )
    VendorLocation.objects.create(
        vendor=profile, name="Boutique principale", address="Marché Central, Douala",
        description="Entrée principale, à côté de la pharmacie.",
        is_active=True, is_main=True,
    )
    return user


def _public_titles(api_client, **params):
    query = "&".join(f"{key}={value}" for key, value in params.items())
    resp = api_client.get(f"/api/catalog/products/?page_size=100&{query}")
    assert resp.status_code == 200
    return {p["title"] for p in resp.json()["results"]}


def test_parcours_admin_vendeur_client(admin_client, _media_root):
    from rest_framework.test import APIClient

    # 1. L'admin crée « Mode Femme » (avec image) puis la sous-catégorie « Robes ».
    mode = admin_client.post(
        "/api/catalog/admin/categories/create/",
        {"name": "Mode Femme", "slug": "", "parent": "", "image": _png()},
        format="multipart",
    ).json()
    robes = admin_client.post(
        "/api/catalog/admin/categories/create/",
        {"name": "Robes", "slug": "", "parent": mode["id"]},
        format="json",
    ).json()

    # 2. Le vendeur voit ces catégories dans l'arbre qui alimente son sélecteur…
    anonymous = APIClient()
    tree = anonymous.get("/api/catalog/categories/tree/").json()
    mode_node = next(n for n in tree if n["id"] == mode["id"])
    assert mode_node["image_url"] and [c["id"] for c in mode_node["children"]] == [robes["id"]]

    # … ne peut pas publier dans le parent, qui a des sous-catégories …
    seller = APIClient()
    seller.force_authenticate(user=_approved_vendor())
    offer = {
        "title": "Robe wax ceinturée", "description": "Coupe cintrée, wax authentique.",
        "short_description": "Robe wax, tailles 36 à 44.", "price_xaf": 18500, "is_active": True,
    }
    refused = seller.post("/api/vendors/products/", {**offer, "category": mode["id"]}, format="json")
    assert refused.status_code == 400
    assert "category" in refused.json()

    # … et publie dans « Robes ».
    created = seller.post("/api/vendors/products/", {**offer, "category": robes["id"]}, format="json")
    assert created.status_code == 201, created.json()
    product_id = created.json()["id"]

    # 3. Tant que l'admin n'a pas validé l'offre, le client ne la voit pas.
    assert "Robe wax ceinturée" not in _public_titles(anonymous, category=robes["id"])

    # 4. L'admin valide : le client la trouve dans « Robes » ET dans « Mode Femme ».
    approved = admin_client.post(f"/api/vendors/admin/products/{product_id}/approve/", {}, format="json")
    assert approved.status_code == 200, approved.content
    assert "Robe wax ceinturée" in _public_titles(anonymous, category=robes["id"])
    assert "Robe wax ceinturée" in _public_titles(anonymous, category_slug="mode-femme")

    # 5. L'admin désactive « Mode Femme » : la catégorie et ses produits quittent la boutique.
    admin_client.post(f"/api/catalog/admin/categories/{mode['id']}/toggle-active/", {"value": False}, format="json")
    assert "Robe wax ceinturée" not in _public_titles(anonymous)
    assert all(n["id"] != mode["id"] for n in anonymous.get("/api/catalog/categories/tree/").json())


def test_seul_l_admin_peut_ecrire_via_l_api_catalogue(api_client):
    category = Category.objects.create(name="Maison", slug="maison-droits")
    product = _product("Lampe", category)
    client = User.objects.create_user(username="client-droits", password="p")
    api_client.force_authenticate(user=client)

    assert api_client.post("/api/catalog/categories/", {"name": "Pirate", "slug": "pirate"}, format="json").status_code == 403
    assert api_client.patch(f"/api/catalog/categories/{category.id}/", {"name": "Piratée"}, format="json").status_code == 403
    assert api_client.patch(f"/api/catalog/products/{product.id}/", {"price_xaf": 1}, format="json").status_code == 403
    assert api_client.delete(f"/api/catalog/products/{product.id}/").status_code == 403
    # La lecture reste ouverte à tous.
    assert api_client.get("/api/catalog/categories/").status_code == 200
    assert api_client.get(f"/api/catalog/products/{product.id}/").status_code == 200


def test_offre_en_attente_ou_refusee_invisible_du_client(api_client):
    category = Category.objects.create(name="Sport", slug="sport-moderation")
    _product("Ballon validé", category)
    _product("Ballon en attente", category, moderation_status="PENDING")
    _product("Ballon refusé", category, moderation_status="REJECTED")

    assert _public_titles(api_client, category=category.id) == {"Ballon validé"}
