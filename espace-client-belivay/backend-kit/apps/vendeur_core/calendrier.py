# backend/apps/vendeur_core/calendrier.py
# Heures d'ouverture de la boutique (VD05-R02, VD11-R13, REFVD-R134 ; DP-56 Q-38 et Q-53 ; P-6) : la préparation se compte
# en heures d'ouverture (horaires, « Fermer aujourd'hui », pause, fermetures programmées). Le calcul est celui du moteur
# belivay_moteurs.ouverture (portage de espace-vendeur/src/calculs/ouverture.ts, mêmes exemples) : ce module ne fait
# que traduire le calendrier de la boutique, au format du site, vers celui du moteur.
#
# Le calendrier (dict) a la forme de CalendrierBoutique du site :
#   {horaires: [{jour, ouvert, de, a}] (lundi = 0), fermeeLe: "AAAA-MM-JJ" | None, fermetures: [{du, au}],
#    passages: [{jours: [0…6], de, a}]}
from datetime import date, datetime, timedelta

from apps.client_core.temps import YAOUNDE
from belivay_moteurs import ouverture as moteur

H = timedelta(hours=1)


def _jour(t: datetime) -> date:
    return t.astimezone(YAOUNDE).date()


def vers_moteur(c: dict) -> moteur.Calendrier:
    return moteur.Calendrier(
        horaires=tuple(moteur.Horaire(int(h["jour"]), bool(h.get("ouvert")), h["de"], h["a"]) for h in c.get("horaires") or []),
        passages=tuple(moteur.Passage(tuple(int(j) for j in p["jours"]), p["de"], p["a"]) for p in c.get("passages") or []),
        fermee_le=date.fromisoformat(c["fermeeLe"]) if c.get("fermeeLe") else None,
        fermetures=tuple((date.fromisoformat(f["du"]), date.fromisoformat(f["au"])) for f in c.get("fermetures") or []),
    )


def plage_du_jour(j: date, c: dict) -> tuple[datetime, datetime] | None:
    return moteur.plage_du_jour(j, vers_moteur(c))


def heures_ouvertes(de: datetime, a: datetime, c: dict) -> timedelta:
    return moteur.heures_ouvertes(de, a, vers_moteur(c))


def ajouter_ouvertes(de: datetime, duree: timedelta, c: dict) -> datetime:
    return moteur.ajouter_ouvertes(de, duree, vers_moteur(c))


def ouverture_suivante(t: datetime, c: dict) -> datetime:
    """Début du délai d'une commande payée boutique fermée (E10) : l'instant même s'il tombe pendant l'ouverture."""
    return moteur.ouverture_suivante(t, vers_moteur(c))


def ouverte_a(t: datetime, c: dict) -> bool:
    return moteur.ouverte_a(t, vers_moteur(c))


def ouverture_du_jour_suivant(t: datetime, c: dict) -> datetime:
    return moteur.ouverture_du_jour_suivant(t, vers_moteur(c))


def passage_suivant(t: datetime, c: dict) -> tuple[datetime, datetime]:
    """Premier passage du livreur dont la fin n'est pas passée à `t`, un jour où la boutique est ouverte. Aucun passage
    sur 60 jours (créneaux à vérifier, le moteur refuse) : (t, t), aucun créneau annoncé, la commande entre quand même."""
    try:
        return moteur.passage_suivant(t, vers_moteur(c))
    except ValueError:
        return t, t


def options_de_delai(echeance: datetime, absolue: datetime, c: dict) -> tuple[tuple[datetime, datetime], list[dict]]:
    """Trois choix (VD05-R13) : + 1 h, + 2 h, demain à l'ouverture ; effet sur le ramassage (P-6)."""
    prevu, options = moteur.options_de_delai(echeance, absolue, vers_moteur(c))
    return prevu, [
        {"choix": o.choix, "echeance": o.echeance, "possible": o.possible, "ramassage": o.ramassage, "effet": o.effet} for o in options
    ]


# ── Le calendrier d'une boutique ────────────────────────────────────────────────────────────────────────


def calendrier(boutique) -> dict:
    """CalendrierBoutique de la boutique : horaires, « Fermer aujourd'hui », pause et fermetures programmées (jours
    entiers), passages du livreur."""
    from .models import FermetureBoutique

    fermetures = [
        {"du": f.du.isoformat(), "au": f.au.isoformat()}
        for f in FermetureBoutique.objects.filter(boutique=boutique, annulee_le__isnull=True)
    ]
    if boutique.pause_depuis and boutique.pause_jusqua:
        fermetures.append({"du": _jour(boutique.pause_depuis).isoformat(), "au": _jour(boutique.pause_jusqua).isoformat()})
    return {
        "horaires": boutique.horaires or [],
        "fermeeLe": boutique.fermee_le.isoformat() if boutique.fermee_le else None,
        "fermetures": fermetures,
        "passages": boutique.passages or [],
    }
