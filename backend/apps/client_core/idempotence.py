# backend/apps/client_core/idempotence.py
# Idempotency-Key (CAP-03) : toute création et toute action d'argent.
#
#     class PasserCommande(VueClient):
#         @idempotent()
#         def post(self, request): ...
#
# - Même clé, même corps, même route : la réponse gardée est rejouée (en-tête Idempotent-Replayed: true), sans
#   refaire l'action (double clic, réseau qui rejoue, onglet rouvert).
# - Même clé avec un autre corps ou une autre route : 422 idempotency_mismatch.
# - Même clé pendant que la première requête tourne encore : 409 idempotency_in_progress.
# - Seules les réponses 2xx sont gardées : après un refus (409 price_changed, 422 over_cap…), le client peut
#   réessayer avec la même clé une fois la situation réglée. Clés gardées 24 h (commande purger_idempotence).
#
# Le site envoie la clé (site/src/api/client.ts) : paiement = commande + n° de tentative, litige = colis + brouillon,
# annulation = sous-commande, comptoir = commande + tentative. Sans compte (cadeau, payeur à l'étranger), la clé est
# rattachée à l'appareil (X-Device-Id) ou, à défaut, à l'adresse IP.

import hashlib
import json
from datetime import timedelta
from functools import wraps

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from .erreurs import ErreurClient
from .models import CleIdempotence

DUREE = timedelta(hours=24)


def _empreinte(request) -> str:
    try:
        donnees = request.data
    except Exception:  # pragma: no cover - corps illisible : la vue lèvera sa propre erreur
        donnees = None
    if hasattr(donnees, "lists"):  # QueryDict (multipart) : valeurs multiples gardées
        donnees = {k: [str(x) for x in v] for k, v in donnees.lists()}
    canon = json.dumps(donnees, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()


def _auteur(request) -> tuple:
    if request.user and request.user.is_authenticated:
        return request.user, ""
    appareil = request.headers.get("X-Device-Id", "").strip()[:100]
    if appareil:
        return None, f"appareil:{appareil}"
    return None, f"ip:{request.META.get('REMOTE_ADDR', '')}"


def idempotent(requise: bool = True):
    """Décorateur d'une méthode de vue (post, put, patch, delete)."""

    def deco(methode):
        @wraps(methode)
        def enveloppe(self, request, *args, **kwargs):
            cle = (request.headers.get("Idempotency-Key") or "").strip()
            if not cle:
                if requise:
                    raise ErreurClient(
                        status.HTTP_400_BAD_REQUEST,
                        "idempotency_key_required",
                        "Cette action doit être envoyée avec une clé d'idempotence.",
                    )
                return methode(self, request, *args, **kwargs)
            if not 8 <= len(cle) <= 120:
                raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Clé d'idempotence invalide (8 à 120 caractères).")

            utilisateur, auteur = _auteur(request)
            empreinte = _empreinte(request)
            try:
                with transaction.atomic():
                    obj, cree = CleIdempotence.objects.select_for_update().get_or_create(
                        utilisateur=utilisateur,
                        auteur=auteur,
                        cle=cle,
                        defaults={"methode": request.method, "chemin": request.path, "empreinte": empreinte},
                    )
                    if not cree and obj.cree_le < timezone.now() - DUREE:
                        obj.delete()
                        obj = CleIdempotence.objects.create(
                            utilisateur=utilisateur,
                            auteur=auteur,
                            cle=cle,
                            methode=request.method,
                            chemin=request.path,
                            empreinte=empreinte,
                        )
                        cree = True
            except IntegrityError:
                raise ErreurClient(status.HTTP_409_CONFLICT, "idempotency_in_progress", "Cette action est déjà en cours.") from None

            if not cree:
                if (obj.methode, obj.chemin, obj.empreinte) != (request.method, request.path, empreinte):
                    raise ErreurClient(
                        status.HTTP_422_UNPROCESSABLE_ENTITY,
                        "idempotency_mismatch",
                        "Cette clé a déjà servi pour une autre action.",
                    )
                if obj.statut is None:
                    raise ErreurClient(status.HTTP_409_CONFLICT, "idempotency_in_progress", "Cette action est déjà en cours.")
                return Response(obj.reponse, status=obj.statut, headers={"Idempotent-Replayed": "true"})

            try:
                reponse = methode(self, request, *args, **kwargs)
            except Exception:
                obj.delete()
                raise
            if 200 <= reponse.status_code < 300:
                obj.statut = reponse.status_code
                obj.reponse = reponse.data
                obj.save(update_fields=["statut", "reponse"])
            else:
                obj.delete()
            return reponse

        enveloppe.idempotent = True
        return enveloppe

    return deco


def purger(avant=None) -> int:
    """Supprime les clés de plus de 24 h ; renvoie le nombre supprimé (tâche quotidienne)."""
    limite = avant or timezone.now() - DUREE
    n, _ = CleIdempotence.objects.filter(cree_le__lt=limite).delete()
    return n
