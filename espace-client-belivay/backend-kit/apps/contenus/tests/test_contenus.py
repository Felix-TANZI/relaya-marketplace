# backend/apps/contenus/tests/test_contenus.py
# Photos et contenus remplaçables : contenu de l'accueil (valeurs du site par défaut, admin), pages, téléversement.
import json

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.client_core.tests.outils import client_connecte, creer_client
from apps.contenus import services
from apps.contenus.models import BandeauAccueil, CarteConfiance, CategorieAccueil, Media, PageContenu, ReglagesAccueil

pytestmark = pytest.mark.django_db

# Un PNG de 1 × 1 pixel.
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
)


@pytest.fixture(autouse=True)
def _medias(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


def test_accueil_valeurs_du_site_apres_migration():
    # La migration 0002 a chargé le contenu du site : la route rend exactement accueil.json (sans photo).
    r = APIClient().get("/api/content/home")
    assert r.status_code == 200
    d = r.json()
    defaut = services.contenu_par_defaut()
    assert [b["titre"] for b in d["carrousel"]] == [b["titre"] for b in defaut["carrousel"]]
    assert d["carrousel"][0] == {**defaut["carrousel"][0], "image": None}
    assert [c["dessin"] for c in d["categories"]] == [c["dessin"] for c in defaut["categories"]]
    assert d["flash"] == defaut["flash"]
    assert d["confiance"] == defaut["confiance"]
    assert d["fondArrivee"] is None
    assert "max-age=300" in r["Cache-Control"] and "public" in r["Cache-Control"]


def test_rubrique_vide_revient_au_contenu_du_site():
    BandeauAccueil.objects.all().delete()
    CategorieAccueil.objects.update(actif=False)
    CarteConfiance.objects.all().delete()
    d = APIClient().get("/api/content/home").json()
    defaut = services.contenu_par_defaut()
    assert d["carrousel"] == defaut["carrousel"]
    assert d["categories"] == defaut["categories"]
    assert d["confiance"]["cartes"] == defaut["confiance"]["cartes"]


def test_modification_dans_l_admin_et_photo():
    media = Media.objects.create(url_externe="https://cdn.belivay.com/accueil/femme.webp", alt="Robes en wax")
    b = BandeauAccueil.objects.order_by("ordre").first()
    b.titre, b.image, b.ordre = "Mode femme · rentrée", media, 9
    b.save()
    BandeauAccueil.objects.exclude(pk=b.pk).filter(titre="Supermarché").update(ordre=0)
    r = ReglagesAccueil.courant()
    r.flash_titre, r.fond_arrivee = "Ventes éclair", media
    r.save()
    d = APIClient().get("/api/content/home").json()
    premier = next(x for x in d["carrousel"] if x["titre"] == "Mode femme · rentrée")
    assert premier["image"] == {"url": "https://cdn.belivay.com/accueil/femme.webp", "alt": "Robes en wax"}
    assert premier["dessin"]  # le dessin reste, en repli
    assert d["carrousel"][0]["titre"] == "Supermarché"  # l'ordre de l'admin
    assert d["flash"]["titre"] == "Ventes éclair"
    assert d["fondArrivee"]["url"].endswith("femme.webp")


def test_charger_contenus_remplacer():
    BandeauAccueil.objects.update(titre="x")
    call_command("charger_contenus")  # rubriques remplies : gardées
    assert set(BandeauAccueil.objects.values_list("titre", flat=True)) == {"x"}
    call_command("charger_contenus", "--remplacer")
    assert BandeauAccueil.objects.order_by("ordre").first().titre == "Mode femme"
    assert ReglagesAccueil.objects.count() == 1


def test_page_de_contenu():
    PageContenu.objects.create(slug="a-propos", titre="À propos", corps="# BelivaY\nTout près de toi.")
    PageContenu.objects.create(slug="brouillon", titre="B", corps="…", publie=False)
    c = APIClient()
    r = c.get("/api/content/pages/a-propos?lang=en")  # pas de version anglaise : la française
    assert r.status_code == 200
    assert r.json()["titre"] == "À propos" and r.json()["image"] is None and r.json()["majLe"] > 0
    r = c.get("/api/content/pages/brouillon")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


def test_televerser_equipe_seulement():
    photo = SimpleUploadedFile("robe.png", PNG, content_type="image/png")
    assert APIClient().post("/api/admin/media", {"fichier": photo}, format="multipart").status_code == 401
    photo.seek(0)
    assert client_connecte(creer_client()).post("/api/admin/media", {"fichier": photo}, format="multipart").status_code == 403


def test_televerser_photo():
    equipe = creer_client("Awa", is_staff=True)
    c = client_connecte(equipe)
    r = c.post(
        "/api/admin/media",
        {"fichier": SimpleUploadedFile("robe wax.png", PNG, content_type="image/png"), "alt": "Robe"},
        format="multipart",
    )
    assert r.status_code == 200, r.content
    d = r.json()
    assert d["url"].startswith("http://testserver/media/contenus/") and d["url"].endswith(".png")
    assert d["alt"] == "Robe"
    media = Media.objects.get(pk=d["id"])
    assert media.par == equipe.pk and media.fichier.name.startswith("contenus/")
    # Variantes : aucune pour une photo plus petite que la plus petite largeur (et aucune sans Pillow).
    assert "srcset" not in d


def _photo(largeur: int, hauteur: int, fmt: str = "JPEG", mode: str = "RGB") -> bytes:
    import io

    from PIL import Image

    tampon = io.BytesIO()
    Image.new(mode, (largeur, hauteur), (200, 120, 40) if mode == "RGB" else (200, 120, 40, 128)).save(tampon, fmt)
    return tampon.getvalue()


def test_variantes_webp_avec_pillow():
    # Pillow installé (comme chez relaya) : 1 200 px de large → WebP 320, 640, 960 (jamais plus large que l'original),
    # plus l'original en dernier dans le srcset ; dimensions relevées.
    pytest.importorskip("PIL")
    from PIL import Image

    c = client_connecte(creer_client(is_staff=True))
    r = c.post(
        "/api/admin/media",
        {"fichier": SimpleUploadedFile("bandeau.jpg", _photo(1200, 675), content_type="image/jpeg"), "alt": "Bandeau"},
        format="multipart",
    )
    assert r.status_code == 200, r.content
    d = r.json()
    parties = [x.rsplit(" ", 1) for x in d["srcset"].split(", ")]
    assert [p[1] for p in parties] == ["320w", "640w", "960w", "1200w"]
    assert all(p[0].startswith("http://testserver/media/contenus/") for p in parties)
    assert parties[-1][0] == d["url"] and d["url"].endswith(".jpg")
    media = Media.objects.get(pk=d["id"])
    assert (media.largeur, media.hauteur) == (1200, 675)
    from django.core.files.storage import default_storage

    for chemin, largeur in media.variantes[:-1]:
        assert chemin.endswith(f"-{largeur}.webp")
        with default_storage.open(chemin) as f:
            img = Image.open(f)
            assert img.format == "WEBP" and img.width == largeur and img.height == round(675 * largeur / 1200)


def test_variantes_png_transparent_et_grande_photo():
    # PNG avec transparence : variantes WebP gardant l'alpha ; 2 000 px → les quatre largeurs, 1 600 comprise.
    pytest.importorskip("PIL")
    from PIL import Image

    c = client_connecte(creer_client(is_staff=True))
    r = c.post(
        "/api/admin/media",
        {"fichier": SimpleUploadedFile("logo.png", _photo(2000, 1000, "PNG", "RGBA"), content_type="image/png")},
        format="multipart",
    )
    d = r.json()
    assert [x.rsplit(" ", 1)[1] for x in d["srcset"].split(", ")] == ["320w", "640w", "960w", "1600w", "2000w"]
    media = Media.objects.get(pk=d["id"])
    from django.core.files.storage import default_storage

    with default_storage.open(media.variantes[0][0]) as f:
        assert Image.open(f).mode == "RGBA"


def test_photo_illisible_sans_variantes():
    # Annoncée comme une image, mais illisible : enregistrée telle quelle, sans variantes (pas d'erreur 500).
    c = client_connecte(creer_client(is_staff=True))
    r = c.post(
        "/api/admin/media", {"fichier": SimpleUploadedFile("x.jpg", b"pas une image", content_type="image/jpeg")}, format="multipart"
    )
    assert r.status_code == 200 and "srcset" not in r.json()


def test_televerser_refus():
    c = client_connecte(creer_client(is_staff=True))
    assert c.post("/api/admin/media", {}, format="multipart").status_code == 400
    r = c.post("/api/admin/media", {"fichier": SimpleUploadedFile("x.gif", b"GIF89a", content_type="image/gif")}, format="multipart")
    assert r.status_code == 422 and r.json()["error"]["code"] == "photo_type"


def test_trop_lourde(monkeypatch):
    monkeypatch.setattr(services, "TAILLE_MAX", 10)
    c = client_connecte(creer_client(is_staff=True))
    r = c.post("/api/admin/media", {"fichier": SimpleUploadedFile("x.png", PNG, content_type="image/png")}, format="multipart")
    assert r.status_code == 422 and r.json()["error"]["code"] == "photo_taille"


def test_srcset_absolu():
    m = Media.objects.create(
        fichier="contenus/2026/10/robe.png", variantes=[["contenus/2026/10/robe-320.webp", 320], ["contenus/2026/10/robe.png", 1200]]
    )
    p = services.photo(m)
    assert p == {
        "url": "/media/contenus/2026/10/robe.png",
        "srcset": "/media/contenus/2026/10/robe-320.webp 320w, /media/contenus/2026/10/robe.png 1200w",
    }
    assert services.photo(None) is None
    assert services.photo(Media.objects.create()) is None


def test_accueil_json_est_le_contenu_du_site():
    # accueil.json est la copie de site/src/donnees/contenus.ts (CONTENU_ACCUEIL) : mêmes rubriques.
    d = json.loads(services.ACCUEIL_JSON.read_text(encoding="utf-8"))
    assert set(d) == {"carrousel", "categories", "flash", "confiance", "fondArrivee"}
    assert len(d["carrousel"]) == 6 and len(d["categories"]) == 11 and len(d["confiance"]["cartes"]) == 3


def test_admin_enregistre(admin_client):
    for chemin in ("media", "bandeauaccueil", "categorieaccueil", "carteconfiance", "reglagesaccueil", "pagecontenu"):
        assert admin_client.get(f"/django-admin/contenus/{chemin}/").status_code == 200
