# backend/apps/contenus/services.py
# Photos (téléversement, variantes srcset) et contenus de l'accueil au format du site (site/src/donnees/contenus.ts :
# camelCase, `image: {url, srcset?, alt?}`).
import io
import json
import logging
import os
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction

from .models import BandeauAccueil, CarteConfiance, CategorieAccueil, Media, PageContenu, ReglagesAccueil

log = logging.getLogger(__name__)

ACCUEIL_JSON = Path(__file__).resolve().parent / "donnees" / "accueil.json"

# Téléversement : formats d'image du web, 8 Mo au plus (une photo de téléphone ; elle est redimensionnée ensuite).
TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif"}
TAILLE_MAX = 8 * 1024 * 1024
# Largeurs des variantes (srcset) : vignette, carte, plein écran de téléphone, bandeau d'ordinateur.
LARGEURS = (320, 640, 960, 1600)


def contenu_par_defaut() -> dict:
    return json.loads(ACCUEIL_JSON.read_text(encoding="utf-8"))


# ——— Photos ———


def _absolue(request, url: str) -> str:
    if not url or url.startswith(("http://", "https://", "//")) or request is None:
        return url
    return request.build_absolute_uri(url)


def photo(media: Media | None, request=None) -> dict | None:
    """Une photo au format du site : {url, srcset?, alt?} ; None sans photo (le site garde le dessin)."""
    if media is None:
        return None
    url = media.url_externe or (media.fichier.url if media.fichier else "")
    if not url:
        return None
    out = {"url": _absolue(request, url)}
    if media.variantes:
        out["srcset"] = ", ".join(f"{_absolue(request, default_storage.url(chemin))} {largeur}w" for chemin, largeur in media.variantes)
    if media.alt:
        out["alt"] = media.alt
    return out


def _variantes(media: Media) -> None:
    """Variantes WebP de largeur LARGEURS (plus petites que l'original) : seulement si Pillow est installé (relaya
    l'a, pour ImageField). Sans Pillow, la photo reste servie seule (pas de srcset)."""
    try:
        from PIL import Image  # noqa: PLC0415
    except ImportError:  # pragma: no cover - dépend de l'environnement
        return
    media.fichier.open("rb")
    try:
        img = Image.open(media.fichier)
        img.load()
    except Exception:  # fichier qui n'est pas une image lisible : refusé plus haut, ou format non décodé
        log.warning("photo illisible pour les variantes : %s", media.fichier.name)
        return
    finally:
        media.fichier.close()
    media.largeur, media.hauteur = img.size
    base, _ = os.path.splitext(media.fichier.name)
    variantes = []
    for largeur in LARGEURS:
        if largeur >= img.width:
            break
        copie = img.copy()
        copie.thumbnail((largeur, round(img.height * largeur / img.width)))
        tampon = io.BytesIO()
        copie.convert("RGBA" if copie.mode in ("RGBA", "LA", "P") else "RGB").save(tampon, "WEBP", quality=80)
        chemin = default_storage.save(f"{base}-{largeur}.webp", ContentFile(tampon.getvalue()))
        variantes.append([chemin, largeur])
    if variantes:
        variantes.append([media.fichier.name, img.width])
    media.variantes = variantes


class PhotoRefusee(ValueError):
    pass


def televerser(fichier, *, alt: str = "", par: int | None = None) -> Media:
    """Enregistre une photo téléversée (type et taille contrôlés) et ses variantes."""
    type_ = getattr(fichier, "content_type", "") or ""
    if type_ not in TYPES:
        raise PhotoRefusee("type")
    if fichier.size > TAILLE_MAX:
        raise PhotoRefusee("taille")
    media = Media(alt=alt[:200], par=par)
    nom = Path(fichier.name or "photo").stem[:60] or "photo"
    media.fichier.save(f"{nom}{TYPES[type_]}", fichier, save=False)
    _variantes(media)
    media.save()
    return media


def preparer(media: Media) -> None:
    """Pour l'admin Django : variantes d'une photo déposée par le formulaire (avant l'enregistrement)."""
    if media.fichier and not media.variantes:
        _variantes(media)


# ——— Contenus de l'accueil ———


def contenu_accueil(request=None) -> dict:
    """GET /api/content/home : chaque rubrique vient de l'admin, ou de accueil.json tant qu'elle y est vide."""
    defaut = contenu_par_defaut()
    reglages = ReglagesAccueil.courant()
    bandeaux = list(BandeauAccueil.objects.filter(actif=True).select_related("image"))
    categories = list(CategorieAccueil.objects.filter(actif=True).select_related("image"))
    cartes = list(CarteConfiance.objects.filter(actif=True))
    return {
        "carrousel": [
            {
                "lien": b.lien,
                "titre": b.titre,
                "sous": list(b.sous or []),
                "produits": b.produits,
                "dessin": b.dessin,
                "image": photo(b.image, request),
            }
            for b in bandeaux
        ]
        or defaut["carrousel"],
        "categories": [{"lien": c.lien, "titre": c.titre, "dessin": c.dessin, "image": photo(c.image, request)} for c in categories]
        or defaut["categories"],
        "flash": {"titre": reglages.flash_titre, "sousTitre": reglages.flash_sous_titre},
        "confiance": {
            "question": reglages.confiance_question,
            "marque": reglages.confiance_marque,
            "cartes": [
                {"lien": c.lien, "icone": c.icone, "ton": c.ton, "titre": c.titre, "texte": c.texte, "action": c.action} for c in cartes
            ]
            or defaut["confiance"]["cartes"],
        },
        "fondArrivee": photo(reglages.fond_arrivee, request),
    }


def page(slug: str, langue: str = "fr", request=None) -> dict | None:
    p = PageContenu.objects.filter(slug=slug, publie=True, langue=langue).select_related("image").first()
    if p is None and langue != "fr":
        p = PageContenu.objects.filter(slug=slug, publie=True, langue="fr").select_related("image").first()
    if p is None:
        return None
    return {"slug": p.slug, "titre": p.titre, "corps": p.corps, "image": photo(p.image, request), "majLe": int(p.maj_le.timestamp() * 1000)}


@transaction.atomic
def charger_contenus(remplacer: bool = False) -> dict[str, int]:
    """Valeurs initiales (accueil.json = contenu du site). Sans `remplacer`, une rubrique déjà remplie est gardée."""
    d = contenu_par_defaut()
    n = {"carrousel": 0, "categories": 0, "confiance": 0}
    if remplacer or not BandeauAccueil.objects.exists():
        BandeauAccueil.objects.all().delete()
        for i, b in enumerate(d["carrousel"]):
            BandeauAccueil.objects.create(
                ordre=i, lien=b["lien"], titre=b["titre"], sous=b["sous"], produits=b["produits"], dessin=b["dessin"]
            )
            n["carrousel"] += 1
    if remplacer or not CategorieAccueil.objects.exists():
        CategorieAccueil.objects.all().delete()
        for i, c in enumerate(d["categories"]):
            CategorieAccueil.objects.create(ordre=i, lien=c["lien"], titre=c["titre"], dessin=c["dessin"])
            n["categories"] += 1
    if remplacer or not CarteConfiance.objects.exists():
        CarteConfiance.objects.all().delete()
        for i, c in enumerate(d["confiance"]["cartes"]):
            CarteConfiance.objects.create(
                ordre=i, lien=c["lien"], icone=c["icone"], ton=c["ton"], titre=c["titre"], texte=c["texte"], action=c["action"]
            )
            n["confiance"] += 1
    if remplacer or not ReglagesAccueil.objects.exists():
        ReglagesAccueil.objects.all().delete()
        ReglagesAccueil.objects.create(
            flash_titre=d["flash"]["titre"],
            flash_sous_titre=d["flash"]["sousTitre"],
            confiance_question=d["confiance"]["question"],
            confiance_marque=d["confiance"]["marque"],
        )
    return n
