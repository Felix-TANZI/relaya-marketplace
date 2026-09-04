# backend/apps/vendors/business_hours.py
#
# Heures ouvrées vendeur — decision produit verrouillee : 8h-18h, du lundi
# au samedi, dimanche et jours de fermeture du vendeur exclus. Pas
# d'horaires individuels au lancement (rendrait le triage automatique du
# bon de preparation intestable) — seul le jour de fermeture varie par
# vendeur (VendorProfile.closed_days).

from datetime import datetime, time, timedelta

from django.utils import timezone

BUSINESS_START = time(8, 0)
BUSINESS_END = time(18, 0)
SUNDAY_WEEKDAY = 6  # datetime.weekday() : lundi=0 ... dimanche=6


def _is_open_day(date, closed_days) -> bool:
    return date.weekday() not in closed_days and date.weekday() != SUNDAY_WEEKDAY


def _day_start(date, tz):
    return timezone.make_aware(datetime.combine(date, BUSINESS_START), tz)


def _day_end(date, tz):
    return timezone.make_aware(datetime.combine(date, BUSINESS_END), tz)


def add_business_hours(start, hours, closed_days=()):
    """
    Avance `start` de `hours` heures ouvrées (8h-18h, Lun-Sam, jours de
    fermeture du vendeur exclus). Si `start` tombe hors plage ouvrée, la
    plage suivante sert de point de départ.
    """
    tz = timezone.get_current_timezone()
    cursor = timezone.localtime(start, tz)
    closed = set(closed_days) | {SUNDAY_WEEKDAY}

    while True:
        if _is_open_day(cursor.date(), closed):
            day_start = _day_start(cursor.date(), tz)
            day_end = _day_end(cursor.date(), tz)
            if cursor < day_start:
                cursor = day_start
                break
            if cursor < day_end:
                break
        cursor = _day_start(cursor.date() + timedelta(days=1), tz)

    remaining = timedelta(hours=hours)
    while remaining > timedelta(0):
        day_end = _day_end(cursor.date(), tz)
        available = day_end - cursor
        if remaining <= available:
            return cursor + remaining
        remaining -= available
        next_date = cursor.date() + timedelta(days=1)
        while not _is_open_day(next_date, closed):
            next_date += timedelta(days=1)
        cursor = _day_start(next_date, tz)
    return cursor
