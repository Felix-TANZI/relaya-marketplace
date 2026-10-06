# backend/apps/client_core/erreurs.py
# Format d'erreur de l'espace client (CAP-04) :
#
#     HTTP 409
#     {"error": {"code": "price_changed", "message": "Le prix a changé…", "data": {...}}}
#
# - code : stable, en snake_case, lu par le site (site/src/api/erreurs.ts) ; jamais affiché tel quel ;
# - message : déjà rédigé pour le client (français ; anglais quand les traductions seront faites, CAP-08) ;
# - data : détails utiles à l'écran (champs fautifs, nouveau montant, essais restants…).
#
# PORTÉE : seules les vues du kit (VueClient, apps.client_core.vues) utilisent ce gestionnaire, par
# get_exception_handler(). Les routes existantes de relaya-marketplace gardent le format DRF ({"detail": …}) :
# le site comprend les deux. Pour l'étendre à tout le serveur plus tard, il suffira de le déclarer dans
# REST_FRAMEWORK["EXCEPTION_HANDLER"] (voir REPRISE-BACKEND.md, décision D7).
#
# Les erreurs des moteurs purs (belivay_moteurs) sont traduites ici, une fois pour toutes :
#   TransitionRefusee, AnnulationImpossible → 409 state_changed
#   PanierInvalide                          → 422 panier_invalide
#   ParametreAbsent, ParametreIllisible     → 503 parametres_indisponibles (registre mal réglé : alerte)

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.views import exception_handler as gestionnaire_drf

logger = logging.getLogger("apps.client_core")


class ErreurClient(exceptions.APIException):
    """Erreur métier au format CAP-04. Lever : raise ErreurClient(409, "price_changed", "…", {"total": 12})."""

    def __init__(self, statut: int, code: str, message: str, data=None):
        super().__init__(detail=message, code=code)
        self.status_code = statut
        self.code = code
        self.message = message
        self.data = data


def conflit(code: str, message: str, data=None) -> ErreurClient:
    return ErreurClient(status.HTTP_409_CONFLICT, code, message, data)


def refus(code: str, message: str, data=None) -> ErreurClient:
    """422 : refus d'une règle métier (zone_non_servie, over_cap, fenetre_fermee…)."""
    return ErreurClient(status.HTTP_422_UNPROCESSABLE_ENTITY, code, message, data)


def introuvable(message: str = "Introuvable.", code: str = "not_found") -> ErreurClient:
    return ErreurClient(status.HTTP_404_NOT_FOUND, code, message)


def interdit(code: str, message: str, data=None) -> ErreurClient:
    return ErreurClient(status.HTTP_403_FORBIDDEN, code, message, data)


MESSAGES = {
    "invalid": "Certaines informations ne sont pas valides.",
    "not_authenticated": "Ta session a expiré. Reconnecte-toi.",
    "forbidden": "Tu n'as pas accès à cette action.",
    "not_found": "Introuvable.",
    "method_not_allowed": "Action non permise sur cette adresse.",
    "throttled": "Trop de tentatives. Patiente un peu avant de réessayer.",
    "state_changed": "La situation a changé entre-temps. Recharge et réessaie.",
    "parametres_indisponibles": "Le service est momentanément indisponible. Réessaie dans un instant.",
}


def _corps(code: str, message: str, data=None) -> dict:
    erreur = {"code": code, "message": message}
    if data is not None:
        erreur["data"] = data
    return {"error": erreur}


def _traduire_moteur(exc):
    """Erreurs des moteurs purs → ErreurClient ; None si ce n'en est pas une."""
    try:
        from belivay_moteurs.annulation import AnnulationImpossible
        from belivay_moteurs.erreurs import PanierInvalide, ParametreAbsent, ParametreIllisible
        from belivay_moteurs.etats import TransitionRefusee
    except ImportError:  # pragma: no cover - paquet des moteurs absent : rien à traduire
        return None
    if isinstance(exc, (TransitionRefusee, AnnulationImpossible)):
        return conflit("state_changed", MESSAGES["state_changed"], {"detail": str(exc)})
    if isinstance(exc, PanierInvalide):
        return refus("panier_invalide", str(exc))
    if isinstance(exc, (ParametreAbsent, ParametreIllisible)):
        logger.error("Registre des paramètres illisible : %s", exc)
        return ErreurClient(status.HTTP_503_SERVICE_UNAVAILABLE, "parametres_indisponibles", MESSAGES["parametres_indisponibles"])
    return None


# 429 sans délai dans les données : délai connu par code (OTP-RENVOI : une heure après trop d'envois).
DELAIS_429 = {"trop_d_envois": 3600}


def secondes_a_attendre(data, code: str = "") -> int | None:
    """Délai d'un refus 429 du kit, en secondes entières : data.renvoiSecondes, data.retry_after, ou data.prochain
    (instant en ms) ; sinon le délai connu du code ; None si inconnu."""
    import math
    import time

    d = data if isinstance(data, dict) else {}
    for cle in ("renvoiSecondes", "retry_after"):
        if isinstance(d.get(cle), (int, float)) and d[cle] >= 0:
            return max(1, math.ceil(d[cle]))
    if isinstance(d.get("prochain"), (int, float)):
        return max(1, math.ceil((d["prochain"] - time.time() * 1000) / 1000))
    return DELAIS_429.get(code)


def gestionnaire_erreurs(exc, context):
    """Gestionnaire d'exceptions DRF des vues du kit (CAP-04)."""
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()
    exc = _traduire_moteur(exc) or exc

    if isinstance(exc, ErreurClient):
        reponse = gestionnaire_drf(exc, context)
        reponse.data = _corps(exc.code, exc.message, exc.data)
        if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            attendre = secondes_a_attendre(exc.data, exc.code)
            if attendre is not None:
                reponse["Retry-After"] = str(attendre)  # le site affiche « réessaie dans X s » (CAP-04, exposé par CORS)
        return reponse

    reponse = gestionnaire_drf(exc, context)
    if reponse is None:
        return None  # erreur imprévue : 500 de Django, journalisée par Django

    if isinstance(exc, exceptions.ValidationError):
        reponse.data = _corps("invalid", MESSAGES["invalid"], {"fields": reponse.data})
        reponse.status_code = status.HTTP_400_BAD_REQUEST
    elif isinstance(exc, (exceptions.NotAuthenticated, exceptions.AuthenticationFailed)):
        reponse.data = _corps("not_authenticated", MESSAGES["not_authenticated"])
    elif isinstance(exc, exceptions.PermissionDenied):
        reponse.data = _corps("forbidden", MESSAGES["forbidden"])
    elif isinstance(exc, exceptions.NotFound):
        reponse.data = _corps("not_found", MESSAGES["not_found"])
    elif isinstance(exc, exceptions.MethodNotAllowed):
        reponse.data = _corps("method_not_allowed", MESSAGES["method_not_allowed"])
    elif isinstance(exc, exceptions.Throttled):
        reponse.data = _corps("throttled", MESSAGES["throttled"], {"retry_after": exc.wait})
    else:
        code = getattr(exc, "default_code", "error")
        reponse.data = _corps(str(code), str(getattr(exc, "detail", "")) or MESSAGES["invalid"])
    return reponse
