# backend/apps/client_core/interrupteurs.py
# Interrupteurs de module FF-* (CCH-17, CFS-01, CFS-02, CAP-13).
#
# - GET /api/config/flags rend l'état de chacun ; le site le lit au démarrage.
# - Une vue d'un module déclare son interrupteur : permission_classes = [IsAuthenticated, module("FF-WALLET")].
#   Fermé : 404 not_found, comme si la route n'existait pas (CAP-13).
# - Valeurs par défaut : settings.BELIVAY_INTERRUPTEURS_JSON (copie de site/src/config/interrupteurs.json, DP-50 :
#   tout ouvert) ; la table Interrupteur, réglée dans l'admin, l'emporte. Voir REPRISE-BACKEND.md, décision D4
#   (FF-WALLET fermé au lancement côté serveur ?).

import json
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from rest_framework import exceptions
from rest_framework.permissions import BasePermission

from .models import Interrupteur

CLE_CACHE = "client_core:interrupteurs"


def _defauts() -> dict[str, bool]:
    chemin = getattr(settings, "BELIVAY_INTERRUPTEURS_JSON", None)
    if not chemin or not Path(chemin).exists():
        return {}
    return {k: bool(v) for k, v in json.loads(Path(chemin).read_text(encoding="utf-8")).items()}


def etat() -> dict[str, bool]:
    e = cache.get(CLE_CACHE)
    if e is None:
        e = _defauts()
        e.update(dict(Interrupteur.objects.values_list("code", "ouvert")))
        cache.set(CLE_CACHE, e, timeout=None)
    return e


def ouvert(code: str) -> bool:
    return etat().get(code, False)


@receiver(post_save, sender=Interrupteur)
@receiver(post_delete, sender=Interrupteur)
def _oublier(**_):
    cache.delete(CLE_CACHE)


def module(code: str) -> type[BasePermission]:
    """Permission DRF : 404 tant que l'interrupteur `code` est fermé."""

    class ModuleOuvert(BasePermission):
        def has_permission(self, request, view):
            if not ouvert(code):
                raise exceptions.NotFound()
            return True

    ModuleOuvert.__name__ = f"Module_{code.replace('-', '_')}"
    return ModuleOuvert
