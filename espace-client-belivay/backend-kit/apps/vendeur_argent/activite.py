# backend/apps/vendeur_argent/activite.py
# « Votre activité » (VD-04, INTEGRATION-API.md § 6) : montants gardés par jour (7 ou 30 jours) ou par mois (12 mois),
# carte de chaleur jour × heure des commandes payées, objectif du mois. Propriétaire seulement (aucun montant pour un
# employé, Q-18). Montants FIGÉS au paiement (CommandeVendeur.garde, moteur de commission) : rien n'est recalculé ici ;
# une commande annulée ne compte pas. Aucune donnée du client (GEN-01).
from datetime import date, datetime, time, timedelta

from apps.client_core.temps import YAOUNDE, ms
from apps.vendeur_core import horloge
from apps.vendeur_core.models import Boutique, CommandeVendeur

from .models import ObjectifMensuel

PERIODES = {"7d": 7, "30d": 30, "12m": 12}
OBJECTIF_MAX = 1_000_000_000


def _mois(j: date, decalage: int) -> date:
    n = j.year * 12 + j.month - 1 + decalage
    return date(n // 12, n % 12 + 1, 1)


def activite(b: Boutique, periode: str) -> dict:
    if periode not in PERIODES:
        periode = "30d"
    aujourd_hui = horloge.aujourd_hui()
    if periode == "12m":
        debut = _mois(aujourd_hui, -11)
        cases = [_mois(debut, i) for i in range(12)]
        cle = lambda j: j.replace(day=1)  # noqa: E731
    else:
        debut = aujourd_hui - timedelta(days=PERIODES[periode] - 1)
        cases = [debut + timedelta(days=i) for i in range(PERIODES[periode])]
        cle = lambda j: j  # noqa: E731
    commandes = CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True, payee_a__date__gte=debut - timedelta(days=1))
    montants = {c: {"garde": 0, "commandes": 0} for c in cases}
    chaleur = [[0] * 24 for _ in range(7)]  # lundi = 0
    for c in commandes.only("payee_a", "garde"):
        local = c.payee_a.astimezone(YAOUNDE)
        if local.date() < debut:
            continue
        k = cle(local.date())
        if k in montants:
            montants[k]["garde"] += c.garde
            montants[k]["commandes"] += 1
        chaleur[local.weekday()][local.hour] += 1
    serie = [{"jour": k.isoformat(), **v} for k, v in montants.items()]
    return {
        "periode": periode,
        "serie": serie,
        "total": sum(x["garde"] for x in serie),
        "commandes": sum(x["commandes"] for x in serie),
        "chaleur": chaleur,
        "objectif": objectif(b),
        "luA": horloge.maintenant_ms(),
    }


def objectif(b: Boutique) -> dict:
    mois = horloge.aujourd_hui().strftime("%Y-%m")
    o = ObjectifMensuel.objects.filter(boutique=b, mois=mois).first()
    debut = horloge.aujourd_hui().replace(day=1)
    atteint = sum(
        CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True, payee_a__gte=_debut_local(debut)).values_list("garde", flat=True)
    )
    return {"mois": mois, "montant": o.montant if o else None, "atteint": atteint, "majA": ms(o.maj_le) if o else None}


def _debut_local(j: date) -> datetime:
    return datetime.combine(j, time(0, 0), YAOUNDE)


def regler_objectif(b: Boutique, montant) -> dict:
    if isinstance(montant, bool) or not isinstance(montant, int) or not 0 < montant <= OBJECTIF_MAX:
        return {"ok": False, "raison": "montant"}
    mois = horloge.aujourd_hui().strftime("%Y-%m")
    ObjectifMensuel.objects.update_or_create(boutique=b, mois=mois, defaults={"montant": montant})
    return {"ok": True, "objectif": objectif(b)}
