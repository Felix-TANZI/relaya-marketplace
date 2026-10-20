# backend/apps/contenus/views.py
from django.utils.cache import patch_cache_control
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from apps.client_core.erreurs import ErreurClient
from apps.client_core.vues import VueClient, VuePublique

from . import services

# Contenus publics : gardés 5 minutes par le navigateur et le CDN, servis encore 1 h pendant la mise à jour.
CACHE = {"public": True, "max_age": 300, "stale_while_revalidate": 3600}


class ContenuAccueil(VuePublique):
    """GET /api/content/home → ContenuAccueil (site/src/donnees/contenus.ts)."""

    def get(self, request):
        r = Response(services.contenu_accueil(request))
        patch_cache_control(r, **CACHE)
        return r


class PageContenu(VuePublique):
    """GET /api/content/pages/{slug}?lang= → {slug, titre, corps (Markdown), image, majLe} ; 404 sinon."""

    def get(self, request, slug):
        p = services.page(slug, request.query_params.get("lang") or "fr", request)
        if p is None:
            raise ErreurClient(status.HTTP_404_NOT_FOUND, "not_found", "Cette page n'existe pas.")
        r = Response(p)
        patch_cache_control(r, **CACHE)
        return r


class TeleverserMedia(VueClient):
    """POST /api/admin/media (multipart : fichier, alt?) — équipe seulement (is_staff) → {id, url, srcset?, alt?}."""

    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        fichier = request.FILES.get("fichier") or request.FILES.get("file")
        if fichier is None:
            raise ErreurClient(
                status.HTTP_400_BAD_REQUEST, "validation_error", "Aucune photo reçue.", {"fields": {"fichier": ["obligatoire"]}}
            )
        try:
            media = services.televerser(fichier, alt=request.data.get("alt", ""), par=request.user.pk)
        except services.PhotoRefusee as e:
            message = "Format refusé : JPEG, PNG, WebP ou AVIF." if str(e) == "type" else "Photo trop lourde (8 Mo au plus)."
            raise ErreurClient(status.HTTP_422_UNPROCESSABLE_ENTITY, f"photo_{e}", message) from e
        return Response({"id": media.pk, **services.photo(media, request)})
