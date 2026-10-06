# backend/apps/client_core/pagination.py
# Pagination par curseur (CAP-05) : jamais de numéro de page. Le client renvoie tel quel le next_cursor reçu.
#
#     elements, suivant = page(request, Litige.objects.filter(client=request.user), taille=20)
#     return Response({"litiges": [...], "maintenant": maintenant_ms(), "next_cursor": suivant})
#
# Curseur = identifiant du dernier élément rendu, encodé (opaque pour le client). Tri : du plus récent au plus
# ancien (clé primaire décroissante), stable même si des éléments arrivent entre deux pages.
# Tailles : 20 par page de résultats, 30 lignes pour le centre de notifications (CAP-05) ; ?limit= de 1 à 50.

import base64
import binascii

from rest_framework import status

from .erreurs import ErreurClient

LIMITE_MAX = 50


def _encoder(pk) -> str:
    return base64.urlsafe_b64encode(f"pk:{pk}".encode()).decode().rstrip("=")


def _decoder(curseur: str):
    try:
        brut = base64.urlsafe_b64decode(curseur + "=" * (-len(curseur) % 4)).decode()
    except (binascii.Error, UnicodeDecodeError, ValueError):
        brut = ""
    if not brut.startswith("pk:"):
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid_cursor", "Curseur de page invalide.")
    return brut[3:]


def page(request, queryset, taille: int = 20):
    """(éléments de la page, next_cursor ou None)."""
    try:
        limite = int(request.query_params.get("limit", taille))
    except (TypeError, ValueError):
        limite = taille
    limite = max(1, min(limite, LIMITE_MAX))
    qs = queryset.order_by("-pk")
    curseur = request.query_params.get("cursor")
    if curseur:
        qs = qs.filter(pk__lt=_decoder(curseur))
    elements = list(qs[: limite + 1])
    suivant = _encoder(elements[limite - 1].pk) if len(elements) > limite else None
    return elements[:limite], suivant
