# backend/apps/client_core/temps.py
# Dates échangées avec le site : millisecondes depuis 1970 (UTC), comme Date.now() du navigateur (REPRISE,
# décision D1). Les calculs de jour (garde, mois civil du portefeuille…) se font à l'heure de Yaoundé
# (Africa/Douala) dans les moteurs ; ici on ne fait que convertir.

from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo

from django.utils import timezone

YAOUNDE = ZoneInfo("Africa/Douala")


def ms(moment: datetime | date | None) -> int | None:
    if moment is None:
        return None
    if isinstance(moment, datetime):
        if timezone.is_naive(moment):
            moment = timezone.make_aware(moment, YAOUNDE)
        return int(moment.timestamp() * 1000)
    return int(datetime.combine(moment, time(0, 0), tzinfo=YAOUNDE).timestamp() * 1000)


def maintenant_ms() -> int:
    return ms(timezone.now())


def depuis_ms(valeur: int | None) -> datetime | None:
    if valeur is None:
        return None
    return datetime.fromtimestamp(int(valeur) / 1000, tz=UTC)


def aujourd_hui() -> date:
    """Le jour civil à Yaoundé."""
    return timezone.now().astimezone(YAOUNDE).date()
