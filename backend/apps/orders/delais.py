# backend/apps/orders/delais.py
# Heure promise au client et échéance du vendeur (BV-DEV-01, algorithme A3), sur de vraies dates : le moteur
# BV-DEV-09 raisonne sur des jours de la semaine sans fermeture de boutique ; ici les heures ouvrées retirent aussi
# les `fermetures_boutique` (R44.1). Sans fermeture, le résultat est celui du moteur (vérifié sur les tests
# « promesse » de BV-DEV-07, tests/test_delais_v21.py).
#
#   R46.1  jours de service lundi à samedi, de r_ouverture à r_fermeture ; aucune livraison le dimanche
#   R45.1  debut ; R44.4 boutique fermée : sa prochaine heure ouvrée
#   R45.2  pret = debut + delai_h heures ouvrées ; un pret exactement à r_fermeture reste ce jour-là
#   R44.2  echeance = max(pret ; debut + r_echeance_h d'horloge sans les heures du dimanche)
#   R45.3  domicile ; R45.4 relais (t_creneaux) ; R45.6 texte ; R45.7 la promesse au paiement fait foi

import math
from datetime import date, datetime, time, timedelta
from fractions import Fraction

from django.utils import timezone

from apps.regles import services as regles

DIMANCHE = 6
JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]


def _heure(h) -> time:
    """Heure décimale du réglage (13.5) → time(13, 30)."""
    minutes = round(Fraction(str(h)) * 60)
    return time(int(minutes // 60), int(minutes % 60))


def _a(jour: date, h, tz) -> datetime:
    return timezone.make_aware(datetime.combine(jour, _heure(h)), tz)


def _decimale(dt: datetime) -> Fraction:
    return Fraction(dt.hour) + Fraction(dt.minute, 60) + Fraction(dt.second, 3600)


class Calendrier:
    """Heures de service (R46.1) moins les fermetures d'une boutique (R44.1, R44.4)."""

    def __init__(self, ferme=lambda jour: False):
        self.ouverture = regles.reglage("r_ouverture")
        self.fermeture = regles.reglage("r_fermeture")
        self.ferme = ferme
        self.tz = timezone.get_current_timezone()

    def jour_de_service(self, jour: date) -> bool:
        return jour.weekday() != DIMANCHE

    def ouvre(self, jour: date) -> bool:
        return self.jour_de_service(jour) and not self.ferme(jour)

    def prochaine_heure_ouvree(self, dt: datetime) -> datetime:
        """R45.1 : avant r_ouverture → ce jour à r_ouverture ; à r_fermeture ou après, ou jour fermé → le jour ouvré
        suivant à r_ouverture ; sinon l'instant lui-même."""
        dt = timezone.localtime(dt, self.tz)
        jour = dt.date()
        if self.ouvre(jour):
            if dt < _a(jour, self.ouverture, self.tz):
                return _a(jour, self.ouverture, self.tz)
            if dt < _a(jour, self.fermeture, self.tz):
                return dt
        jour += timedelta(days=1)
        while not self.ouvre(jour):
            jour += timedelta(days=1)
        return _a(jour, self.ouverture, self.tz)

    def ajouter_heures_ouvrees(self, debut: datetime, heures) -> datetime:
        """R45.2 : ce qui dépasse r_fermeture continue le jour ouvré suivant ; exactement r_fermeture reste ce jour."""
        curseur, reste = timezone.localtime(debut, self.tz), timedelta(hours=float(heures))
        while True:
            fin = _a(curseur.date(), self.fermeture, self.tz)
            if curseur + reste <= fin:
                return curseur + reste
            reste -= fin - curseur
            jour = curseur.date() + timedelta(days=1)
            while not self.ouvre(jour):
                jour += timedelta(days=1)
            curseur = _a(jour, self.ouverture, self.tz)


def calendrier_boutique(vendeur) -> Calendrier:
    """Fermetures de la boutique : jour hebdomadaire (closed_days), « Fermer aujourd'hui » (closed_today_date),
    fermetures programmées (ShopClosure) et pause (paused_since à paused_until)."""
    profil = getattr(vendeur, "vendor_profile", None)
    if profil is None:
        return Calendrier()
    hebdo = set(profil.closed_days or [])
    plages = list(profil.closures.values_list("start_date", "end_date"))
    pause = None
    if profil.paused_until:
        debut = timezone.localtime(profil.paused_since).date() if profil.paused_since else date.min
        pause = (debut, timezone.localtime(profil.paused_until).date())

    def ferme(jour: date) -> bool:
        return (jour.weekday() in hebdo or jour == profil.closed_today_date
                or any(a <= jour <= b for a, b in plages) or (pause is not None and pause[0] <= jour < pause[1]))

    return Calendrier(ferme)


def pret_et_echeance(paye_le: datetime, delai_h, vendeur=None) -> dict:
    """debut (R45.1), pret (R45.2) et echeance (R44.2) d'une boutique pour un paiement à `paye_le`."""
    cal = calendrier_boutique(vendeur) if vendeur is not None else Calendrier()
    debut = cal.prochaine_heure_ouvree(paye_le)
    pret = cal.ajouter_heures_ouvrees(debut, delai_h)
    # R44.2 : r_echeance_h d'horloge depuis debut, les heures du dimanche (0 h à 24 h) n'étant pas comptées.
    curseur, reste = debut, timedelta(hours=regles.reglage("r_echeance_h"))
    while reste > timedelta(0):
        if curseur.weekday() == DIMANCHE:
            curseur = timezone.make_aware(datetime.combine(curseur.date() + timedelta(days=1), time()), cal.tz)
            continue
        minuit = timezone.make_aware(datetime.combine(curseur.date() + timedelta(days=1), time()), cal.tz)
        if curseur + reste <= minuit:
            curseur, reste = curseur + reste, timedelta(0)
        else:
            reste -= minuit - curseur
            curseur = minuit
    return {"debut": debut, "pret": pret, "echeance": max(pret, curseur)}


def _jour_de_service_suivant(jour: date) -> date:
    jour += timedelta(days=1)
    return jour + timedelta(days=1) if jour.weekday() == DIMANCHE else jour


def promesse(pret: datetime, mode: str) -> datetime:
    """R45.3 (domicile) et R45.4 (relais, t_creneaux) ; les jours suivants sont des jours de service (R46.1)."""
    tz = timezone.get_current_timezone()
    pret = timezone.localtime(pret, tz)
    jour, h = pret.date(), _decimale(pret)
    if mode == "domicile":
        limite = Fraction(str(regles.reglage("r_heure_limite")))
        if h <= limite:
            return _a(jour, min(regles.reglage("r_fermeture"), math.ceil(h + regles.reglage("r_promesse_h"))), tz)
        return _a(_jour_de_service_suivant(jour), regles.reglage("r_heure_limite"), tz)
    matin, apres_midi = regles.table("t_creneaux")
    if h < Fraction(str(matin["prets_jusqua_h"])):
        return _a(jour, apres_midi["depot_avant_h"], tz)
    if h <= Fraction(str(apres_midi["prets_jusqua_h"])):
        return _a(_jour_de_service_suivant(jour), matin["depot_avant_h"], tz)
    return _a(_jour_de_service_suivant(jour), apres_midi["depot_avant_h"], tz)


def texte(promesse_dt: datetime, paye_le: datetime, mode: str) -> str:
    """R45.6, mot pour mot : « Livré {quand} avant {heure} » ou « Disponible au relais {quand} avant {heure} »."""
    tz = timezone.get_current_timezone()
    p, jour_paiement = timezone.localtime(promesse_dt, tz), timezone.localtime(paye_le, tz).date()
    ecart = (p.date() - jour_paiement).days
    quand = "aujourd'hui" if ecart == 0 else ("demain" if ecart == 1 else JOURS[p.weekday()])
    heure = f"{p.hour} h" if p.minute == 0 else f"{p.hour} h {p.minute:02d}"
    return ("Livré" if mode == "domicile" else "Disponible au relais") + f" {quand} avant {heure}"


def promesse_commande(paye_le: datetime, mode: str, vendeurs, delai_h=None) -> dict:
    """A3 pour une commande : chaque boutique a son pret et son echeance ; la promesse part du dernier colis prêt
    (une course ramasse toutes les boutiques, R08.7 ; au relais le code part à l'arrivée du dernier colis, R50.1)."""
    delai_h = regles.reglage("r_prep_h") if delai_h is None else delai_h
    boutiques = {v.pk: pret_et_echeance(paye_le, delai_h, v) for v in vendeurs}
    pret = max(b["pret"] for b in boutiques.values()) if boutiques else Calendrier().ajouter_heures_ouvrees(
        Calendrier().prochaine_heure_ouvree(paye_le), delai_h)
    p = promesse(pret, mode)
    return {"boutiques": boutiques, "pret": pret, "promesse": p, "texte": texte(p, paye_le, mode)}


def figer_au_paiement(order, paye_le: datetime) -> None:
    """Fige A3 sur la commande payée : pret et echeance de chaque colis (une boutique), promesse et texte de la
    commande (R45.7). prep_deadline reçoit le dernier pret, pour l'escalier existant des rappels de préparation."""
    from apps.shipping.models import Shipment

    mode = "relais" if order.delivery_method == "PICKUP" else "domicile"
    colis = list(Shipment.objects.filter(order=order).select_related("vendor__vendor_profile"))
    r = promesse_commande(paye_le, mode, [c.vendor for c in colis if c.vendor_id])
    for c in colis:
        b = r["boutiques"].get(c.vendor_id)
        if b is not None:
            Shipment.objects.filter(pk=c.pk).update(pret_prevu=b["pret"], echeance_vendeur=b["echeance"])
    type(order).objects.filter(pk=order.pk).update(promesse_at=r["promesse"], promesse_texte=r["texte"],
                                                   prep_deadline=r["pret"])
