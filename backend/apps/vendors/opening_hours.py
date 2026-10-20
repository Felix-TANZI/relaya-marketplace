# backend/apps/vendors/opening_hours.py
#
# Port Python du calendrier d'ouverture de la boutique (espace-vendeur,
# src/calculs/ouverture.ts) : échéances de préparation comptées en heures
# d'ouverture (horaires, « Fermer aujourd'hui »), options de « Plus de temps »
# et passage du livreur qui suit. Le commentaire du fichier TS d'origine dit
# « À porter dans moteurs/ (Python) pour le serveur » — moteurs/ est le
# prototype du CEO qu'on laisse de côté ; ce module est le port réel pour le
# vrai backend Django, câblé sur apps/vendors/views.py.
#
# Les instants sont en millisecondes depuis l'epoch (comme `Instant` côté
# TS), indépendants du fuseau Django : Yaoundé = UTC+1 fixe toute l'année
# (pas d'heure d'été), exactement comme le fait le TS d'origine (DECALAGE).
# Ça garantit que le serveur calcule exactement les mêmes échéances que les
# écrans (comptes à rebours vivants recalculés côté client).
#
# SIMPLIFICATIONS signalées (pas des règles inventées, des trous non câblés) :
# - CalendrierBoutique.fermetures (fermetures programmées, domaine "boutique"
#   VD-11) : toujours vide ici, ce domaine n'est pas encore branché ;
# - CalendrierBoutique.passages (tournée réelle du livreur par zone) : une
#   fenêtre quotidienne fixe (8h-18h, Lun-Sam) sert de valeur par défaut, à
#   remplacer quand la vraie tournée (Tournee, apps.shipping) sera exposée
#   au vendeur.

from datetime import datetime, timedelta
from datetime import timezone as dt_timezone
from typing import overload

H = 3_600_000          # 1 heure en ms
J = 24 * H             # 1 jour en ms
DECALAGE = H           # Yaoundé : UTC+1 toute l'année


def now_ms() -> int:
    return int(datetime.now(dt_timezone.utc).timestamp() * 1000)


@overload
def dt_to_ms(dt: None) -> None: ...
@overload
def dt_to_ms(dt: datetime) -> int: ...


def dt_to_ms(dt) -> int | None:
    """
    datetime (aware ou naïf, interprété UTC) → Instant (ms). None → None.

    Les deux surcharges ci-dessus ne changent rien à l'exécution : elles
    disent seulement ce que le corps fait déjà, à savoir que le resultat ne
    vaut None que si l'entree valait None. Sans elles, les appelants qui ont
    deja verifie leur date recevaient un `int | None` et devaient le
    retester — six fausses erreurs dans `apps/vendors/views.py`.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=dt_timezone.utc)
    return int(dt.timestamp() * 1000)


def ms_to_dt(ms):
    if ms is None:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=dt_timezone.utc)


def _jour_de(t: int) -> str:
    """Jour civil « AAAA-MM-JJ » à Yaoundé de l'instant t."""
    d = datetime.fromtimestamp((t + DECALAGE) / 1000, tz=dt_timezone.utc)
    return d.strftime('%Y-%m-%d')


def _minuit(j: str) -> int:
    d = datetime.strptime(j, '%Y-%m-%d').replace(tzinfo=dt_timezone.utc)
    return int(d.timestamp() * 1000) - DECALAGE


def _semaine(j: str) -> int:
    """0 = lundi … 6 = dimanche (comme (getUTCDay()+6)%7 côté TS)."""
    return datetime.strptime(j, '%Y-%m-%d').weekday()


def _lendemain(j: str) -> str:
    d = datetime.strptime(j, '%Y-%m-%d').replace(tzinfo=dt_timezone.utc)
    return (d + timedelta(days=1)).strftime('%Y-%m-%d')


def _a_heure(j: str, hm: str) -> int:
    h, m = int(hm[0:2]), int(hm[3:5])
    return _minuit(j) + (h * 60 + m) * 60_000


def plage_du_jour(j: str, cal: dict):
    """Plage d'ouverture [debut, fin] d'un jour civil, ou None (fermé)."""
    h = next((x for x in cal['horaires'] if x['jour'] == _semaine(j)), None)
    if not h or not h.get('ouvert'):
        return None
    if cal.get('fermeeLe') == j:
        return None
    for f in cal.get('fermetures', []):
        if f['du'] <= j <= f['au']:
            return None
    return (_a_heure(j, h['de']), _a_heure(j, h['a']))


def heures_ouvertes(de: int, a: int, cal: dict) -> int:
    if a <= de:
        return 0
    total = 0
    j = _jour_de(de)
    n = 0
    while _minuit(j) < a and n < 400:
        p = plage_du_jour(j, cal)
        if p:
            total += max(0, min(a, p[1]) - max(de, p[0]))
        j = _lendemain(j)
        n += 1
    return total


def ajouter_ouvertes(de: int, duree: int, cal: dict) -> int:
    """Instant atteint après `duree` ms d'ouverture depuis `de`."""
    reste = duree
    j = _jour_de(de)
    for _ in range(400):
        p = plage_du_jour(j, cal)
        if p:
            debut = max(de, p[0])
            if debut < p[1]:
                if reste <= p[1] - debut:
                    return debut + reste
                reste -= p[1] - debut
        j = _lendemain(j)
    return de + duree


def ouverture_suivante(t: int, cal: dict) -> int:
    return ajouter_ouvertes(t, 0, cal)


def ouverte_a(t: int, cal: dict) -> bool:
    p = plage_du_jour(_jour_de(t), cal)
    return bool(p) and p[0] <= t < p[1]


def ouverture_du_jour_suivant(t: int, cal: dict) -> int:
    j = _lendemain(_jour_de(t))
    for _ in range(60):
        p = plage_du_jour(j, cal)
        if p:
            return p[0]
        j = _lendemain(j)
    return _minuit(j)


def passage_suivant(t: int, cal: dict):
    """Premier passage du livreur dont la fin n'est pas encore passée à t."""
    j = _jour_de(t)
    for _ in range(60):
        if plage_du_jour(j, cal):
            for p in cal.get('passages', []):
                if _semaine(j) in p['jours']:
                    s = (_a_heure(j, p['de']), _a_heure(j, p['a']))
                    if s[1] > t:
                        return s
        j = _lendemain(j)
    return (t, t)


def options_de_delai(echeance: int, absolue: int, cal: dict) -> dict:
    prevu = passage_suivant(echeance, cal)

    def option(choix: str, e: int) -> dict:
        effet = 'inchange' if e <= prevu[0] else ('attend' if e < prevu[1] else 'suivant')
        ramassage = passage_suivant(e, cal) if effet == 'suivant' else prevu
        return {
            'choix': choix,
            'echeance': e,
            'possible': e <= absolue,
            'ramassage': {'debut': ramassage[0], 'fin': ramassage[1]},
            'effet': effet,
        }

    return {
        'ramassage': {'debut': prevu[0], 'fin': prevu[1]},
        'options': [
            option('+1h', ajouter_ouvertes(echeance, H, cal)),
            option('+2h', ajouter_ouvertes(echeance, 2 * H, cal)),
            option('demain', ouverture_du_jour_suivant(echeance, cal)),
        ],
    }


def calendar_for_vendor(vendor_profile) -> dict:
    """
    CalendrierBoutique minimal depuis VendorProfile : horaires fixes 8h-18h,
    Lun-Sam (verrouillé par décision produit, cf business_hours.py), dimanche
    toujours fermé + closed_days du vendeur. fermeeLe = closed_today_date
    (POST /shop/closed-today) si c'est bien la date du jour.
    """
    closed_days = set(vendor_profile.closed_days or [])
    SUNDAY = 6
    horaires = [
        {'jour': jour, 'ouvert': jour != SUNDAY and jour not in closed_days, 'de': '08:00', 'a': '18:00'}
        for jour in range(7)
    ]
    today = _jour_de(now_ms())
    fermee_le = today if (vendor_profile.closed_today_date and vendor_profile.closed_today_date.isoformat() == today) else None
    return {
        'horaires': horaires,
        'fermeeLe': fermee_le,
        'fermetures': [],
        'passages': [{'jours': [0, 1, 2, 3, 4, 5], 'de': '08:00', 'a': '18:00'}],
    }
