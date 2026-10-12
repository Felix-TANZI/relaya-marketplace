# backend/apps/vendors/vd07_idempotence.py
# Idempotency-Key pour les vues fonction (@api_view) du domaine VD-07 (litiges/retours vendeur).
# Meme principe que apps.client_core.idempotence.idempotent (CAP-03), adapte aux vues fonction et
# a un appelant toujours authentifie (le vendeur) — pas besoin de repli "appareil"/IP anonyme.
# Reutilise la table CleIdempotence (generique, deja utilisee par le domaine client).

import hashlib
import json
from datetime import timedelta
from functools import wraps

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from apps.client_core.models import CleIdempotence

DUREE = timedelta(hours=24)


def _empreinte(request) -> str:
    try:
        donnees = request.data
    except Exception:  # pragma: no cover - corps illisible : la vue levera sa propre erreur
        donnees = None
    if hasattr(donnees, "lists"):
        donnees = {k: [str(x) for x in v] for k, v in donnees.lists()}
    canon = json.dumps(donnees, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()


def idempotent_vendor(view):
    """Decore une vue fonction `(request, *args, **kwargs)`.

    Pas de clé envoyée : l'action s'exécute normalement, sans déduplication (compatibilité avec
    un appel qui n'enverrait pas Idempotency-Key). Même clé + même route + même corps : la
    réponse 2xx gardée est rejouée. Même clé + corps/route différents : 422. Même clé en cours de
    traitement : 409.
    """

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        cle = (request.headers.get("Idempotency-Key") or "").strip()
        if not cle:
            return view(request, *args, **kwargs)
        if not 8 <= len(cle) <= 120:
            return Response(
                {"detail": "Clé d'idempotence invalide (8 à 120 caractères).", "code": "invalid"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        empreinte = _empreinte(request)
        utilisateur = request.user if request.user and request.user.is_authenticated else None
        auteur = "" if utilisateur else f"ip:{request.META.get('REMOTE_ADDR', '')}"

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
                        utilisateur=utilisateur, auteur=auteur, cle=cle,
                        methode=request.method, chemin=request.path, empreinte=empreinte,
                    )
                    cree = True
        except IntegrityError:
            return Response(
                {"detail": "Cette action est déjà en cours.", "code": "idempotency_in_progress"},
                status=status.HTTP_409_CONFLICT,
            )

        if not cree:
            if (obj.methode, obj.chemin, obj.empreinte) != (request.method, request.path, empreinte):
                return Response(
                    {"detail": "Cette clé a déjà servi pour une autre action.", "code": "idempotency_mismatch"},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )
            if obj.statut is None:
                return Response(
                    {"detail": "Cette action est déjà en cours.", "code": "idempotency_in_progress"},
                    status=status.HTTP_409_CONFLICT,
                )
            return Response(obj.reponse, status=obj.statut, headers={"Idempotent-Replayed": "true"})

        try:
            reponse = view(request, *args, **kwargs)
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

    return wrapper
