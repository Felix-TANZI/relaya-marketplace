# backend/apps/vendeur_core/horloge.py
# L'heure de l'espace vendeur. En production : timezone.now(). Sur le serveur d'essai, un décalage (table Horloge, réglé
# par POST /api/_essai/horloge) fait avancer le temps pour les parcours de bout en bout : libération après la fenêtre de
# retour, arrêté du jeudi, versement du vendredi. Toutes les applications vendeur lisent l'heure ici, jamais ailleurs.
from datetime import datetime, timedelta

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from apps.client_core.temps import YAOUNDE

CLE = "vendeur_core:horloge"


def decalage() -> timedelta:
    if not getattr(settings, "BELIVAY_ESSAI_ROUTES", False):
        return timedelta(0)
    s = cache.get(CLE)
    if s is None:
        from .models import Horloge

        h = Horloge.objects.first()
        s = h.decalage_secondes if h else 0
        cache.set(CLE, s, timeout=None)
    return timedelta(seconds=s)


def maintenant() -> datetime:
    """Heure du serveur (UTC, avec fuseau), décalage d'essai compris."""
    return timezone.now() + decalage()


def maintenant_yaounde() -> datetime:
    return maintenant().astimezone(YAOUNDE)


def maintenant_ms() -> int:
    return int(maintenant().timestamp() * 1000)


def aujourd_hui():
    return maintenant_yaounde().date()


def regler(secondes: int) -> int:
    """Pose le décalage (essai seulement) ; rend le décalage en secondes."""
    from .models import Horloge

    h = Horloge.objects.first() or Horloge()
    h.decalage_secondes = int(secondes)
    h.save()
    cache.delete(CLE)
    return h.decalage_secondes


def avancer(secondes: int) -> int:
    return regler(int(decalage().total_seconds()) + int(secondes))
