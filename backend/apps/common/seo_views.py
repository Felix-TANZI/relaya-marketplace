# backend/apps/common/seo_views.py
# Sitemaps dynamiques : produits et categories.
#
# POURQUOI PAS django.contrib.sitemaps
#
# Le framework de Django construit ses URL a partir de `get_absolute_url()` du
# modele et du domaine de django.contrib.sites. Ici les pages vivent dans une
# application React servie sur un autre conteneur : les URL a publier sont
# celles du FRONTEND (belivay.com/product/<slug>), qu'aucun modele Django ne
# connait. Une vue explicite est plus courte et plus lisible qu'un adaptateur.
#
# Ces vues sont PUBLIQUES et sans authentification : un sitemap protege ne
# serait jamais lu par Googlebot.

from __future__ import annotations

from django.conf import settings
from django.http import HttpResponse
from django.utils.http import http_date
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET
from xml.sax.saxutils import escape

# Un sitemap ne peut pas depasser 50 000 URL ni 50 Mo (protocole sitemaps.org).
# On plafonne largement en dessous : au-dela, il faudra un index pagine.
LIMITE_URLS = 20000


def _base() -> str:
    return getattr(settings, "PUBLIC_SITE_URL", "https://belivay.com").rstrip("/")


def _rendre(entrees) -> HttpResponse:
    """
    Construit le XML a la main.

    Les slugs viennent de la base : ils sont echappes, sans quoi une
    apostrophe ou une esperluette casserait le document entier et Google
    rejetterait le sitemap complet.
    """
    lignes = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod, changefreq, priority in entrees:
        lignes.append("  <url>")
        lignes.append(f"    <loc>{escape(loc)}</loc>")
        if lastmod:
            lignes.append(f"    <lastmod>{lastmod:%Y-%m-%d}</lastmod>")
        lignes.append(f"    <changefreq>{changefreq}</changefreq>")
        lignes.append(f"    <priority>{priority}</priority>")
        lignes.append("  </url>")
    lignes.append("</urlset>")

    reponse = HttpResponse(
        "\n".join(lignes) + "\n",
        content_type="application/xml; charset=utf-8",
    )
    if entrees:
        recents = [e[1] for e in entrees if e[1]]
        if recents:
            reponse["Last-Modified"] = http_date(max(recents).timestamp())
    return reponse


@require_GET
@cache_control(max_age=3600, public=True)
def sitemap_produits(request) -> HttpResponse:
    """Fiches produit actives, la plus recemment modifiee en tete."""
    from apps.catalog.models import Product

    base = _base()
    lignes = (
        Product.objects.filter(is_active=True)
        .exclude(slug="")
        .order_by("-updated_at")
        .values_list("slug", "updated_at")[:LIMITE_URLS]
    )
    return _rendre([
        (f"{base}/product/{slug}", maj, "weekly", "0.8")
        for slug, maj in lignes
    ])


@require_GET
@cache_control(max_age=86400, public=True)
def sitemap_categories(request) -> HttpResponse:
    """Categories actives. Elles changent rarement, d'ou le cache d'un jour."""
    from apps.catalog.models import Category

    base = _base()
    lignes = (
        Category.objects.filter(is_active=True)
        .exclude(slug="")
        .order_by("slug")
        .values_list("slug", "updated_at")[:LIMITE_URLS]
    )
    return _rendre([
        (f"{base}/categorie/{slug}", maj, "weekly", "0.7")
        for slug, maj in lignes
    ])
