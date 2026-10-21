# backend/apps/vendors/business_hours.py
#
# Heures ouvrées vendeur — heures de service des réglages (R46.1, 8 h-18 h au lancement), du lundi
# au samedi, dimanche et jours de fermeture du vendeur exclus. Pas
# d'horaires individuels au lancement (rendrait le triage automatique du
# bon de preparation intestable) — seul le jour de fermeture varie par
# vendeur (VendorProfile.closed_days).

from datetime import datetime, time, timedelta

from django.utils import timezone

SUNDAY_WEEKDAY = 6  # datetime.weekday() : lundi=0 ... dimanche=6


def _heures_de_service():
    """R46.1 : r_ouverture et r_fermeture des réglages de l'admin (spec v2.1), jamais en dur."""
    from apps.orders.delais import _heure
    from apps.regles import services as regles

    return _heure(regles.reglage("r_ouverture")), _heure(regles.reglage("r_fermeture"))


def _is_open_day(date, closed_days) -> bool:
    return date.weekday() not in closed_days and date.weekday() != SUNDAY_WEEKDAY


def _day_start(date, tz):
    return timezone.make_aware(datetime.combine(date, _heures_de_service()[0]), tz)


def _day_end(date, tz):
    return timezone.make_aware(datetime.combine(date, _heures_de_service()[1]), tz)


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
