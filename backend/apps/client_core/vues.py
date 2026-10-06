# backend/apps/client_core/vues.py
# Bases des vues du kit.
#
#   VueClient    — client connecté (JWT simplejwt), erreurs au format CAP-04.
#   VuePublique  — sans compte (lien de cadeau, cotisation, FAQ…) ; le jeton est lu s'il est présent.
#   a_finir()    — route du contrat déjà branchée dans les URL, logique pas encore écrite : 501 a_finir, avec la
#                  méthode du site et ce qui manque. Chaque a_finir est listé dans REPRISE-BACKEND.md ; le test
#                  test_contrat vérifie que toutes les routes de openapi.yaml existent (écrites ou a_finir).

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from .erreurs import ErreurClient, gestionnaire_erreurs


class VueClient(APIView):
    permission_classes = [IsAuthenticated]

    def get_exception_handler(self):
        return gestionnaire_erreurs


class VuePublique(VueClient):
    permission_classes = [AllowAny]


class _AFinir(VueClient):
    sources: tuple[str, ...] = ()
    manque: str = ""

    def _refuser(self, request, *args, **kwargs):
        raise ErreurClient(
            status.HTTP_501_NOT_IMPLEMENTED,
            "a_finir",
            "Cette fonction arrive bientôt.",
            {"route": f"{request.method} {request.path}", "sources": list(self.sources), "manque": self.manque},
        )

    get = post = put = patch = delete = _refuser


def a_finir(*sources: str, manque: str = "", publique: bool = False):
    """Vue 501 d'une route du contrat dont la logique reste à écrire (voir REPRISE-BACKEND.md)."""
    attrs = {"sources": sources, "manque": manque}
    if publique:
        attrs["permission_classes"] = [AllowAny]
    else:
        attrs["permission_classes"] = [IsAuthenticated]
    vue = type(f"AFinir_{'_'.join(sources) or 'route'}", (_AFinir,), attrs)
    return extend_schema(exclude=True)(vue).as_view()
