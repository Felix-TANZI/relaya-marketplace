# backend/apps/aftersales/regles.py
# Règles pures de l'après-vente portées du site (site/src/demo/source-demo.ts : ouvrirLitige, COMMANDES_LITIGE,
# deposerRetour, choisirRemplacement ; site/src/pages/CL-11). Sans Django : testées seules.
#
# - État d'un litige vu par le site (EtatLitige) à partir de l'état de la machine LITIGE, de la réponse du vendeur,
#   de l'issue de la décision, du retour et du remplacement.
# - Motif d'un retour (belivay_moteurs.litiges.Motif) à partir du problème choisi par le client.
# - Étapes du retour et du remplacement (EtapeRetour, EtapeRemplacement).
# - Dates en français, à l'heure de Yaoundé : « sam. 19 sept. à 11 h 32 », « dim. 6 déc. ».
# - « Payé par » : « MTN MoMo 6 77 ·· ·· 41 », « Orange Money … », « Carte … ».

from datetime import date, datetime
from zoneinfo import ZoneInfo

from belivay_moteurs.litiges import Motif

YAOUNDE = ZoneInfo("Africa/Douala")
NBSP = " "

LIBELLES_PROBLEME = {
    "jamais": "Jamais reçu",
    "abime": "Abîmé",
    "pas-commande": "Pas ce que j’ai commandé",
    "manque": "Il manque quelque chose",
    "autre": "Autre chose",
}

# Problème choisi → motif du moteur des litiges. « Jamais reçu » et « Il manque quelque chose » : l'article remis
# n'est pas celui de la commande (non conforme).
MOTIFS = {
    "jamais": Motif.NON_CONFORME,
    "abime": Motif.ABIME,
    "pas-commande": Motif.NON_CONFORME,
    "manque": Motif.NON_CONFORME,
    "autre": Motif.NON_CONFORME,
}


def etat_site(
    etat: str,
    *,
    souhait: str,
    reponse_vendeur: str = "",
    arrangement_en_attente: bool = False,
    issue: str = "",
    retire: bool = False,
    retour_clos: bool | None = None,
    remplacement: str | None = None,
    recours: bool = False,
) -> str:
    """EtatLitige du site. `retour_clos` : None sans retour ; `remplacement` : état de la machine REMPLACEMENT."""
    if retire:
        return "retire"
    if etat == "rembourse_automatiquement":
        return "rembourse"
    if etat in ("ouvert", "attente_vendeur"):
        if souhait == "signal":
            return "signal"
        return "arrangement" if arrangement_en_attente else "attente"
    if etat == "en_examen":
        if recours:  # le recours est repris par une autre personne : « Ton recours » (decision.conteste)
            return "examen"
        return {"conteste": "conteste", "silence": "silence"}.get(reponse_vendeur, "examen")
    # decide
    if issue == "refuse":
        return "refuse"
    if issue == "remplace":
        if remplacement == "rembourse":
            return "rembourse"
        return "remplace" if remplacement in ("expedie", "remis") else "accepte"
    if issue == "rembourse":
        return "accepte" if retour_clos is False else "rembourse"
    return "accepte"


ETAPES_RETOUR = {
    "accepte": "depot",
    "retour_depose": "depose",
    "collecte": "collecte",
    "recu": "inspection",
    "retour_inspecte": "inspection",
    "clos": "clos",
}


def etape_remplacement(etat: str, en_retard: bool) -> str | None:
    """EtapeRemplacement ; None quand le client a choisi d'être remboursé (le site n'affiche plus le remplacement)."""
    if etat == "attente":
        return "retard" if en_retard else "attente"
    return {"autre_vendeur": "autre", "expedie": "expedie", "remis": "remis"}.get(etat)


# ── Dates en français ───────────────────────────────────────────────────────────────────────────────────

JOURS = ("lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim.")
MOIS = ("janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc.")


def jour_fr(d: date | datetime) -> str:
    """« dim. 6 déc. »"""
    if isinstance(d, datetime):
        d = d.astimezone(YAOUNDE).date()
    return f"{JOURS[d.weekday()]} {d.day} {MOIS[d.month - 1]}"


def heure_fr(t: datetime) -> str:
    """« 11 h 32 », « 17 h »"""
    t = t.astimezone(YAOUNDE)
    return f"{t.hour}{NBSP}h" + (f"{NBSP}{t.minute:02d}" if t.minute else "")


def date_fr(t: datetime) -> str:
    """« sam. 19 sept. à 11 h 32 »"""
    return f"{jour_fr(t)} à {heure_fr(t)}"


def retire_le(t: datetime, aujourd_hui: date) -> str:
    """« retiré aujourd’hui à 10 h 32 », « retiré le sam. 19 sept. à 11 h 32 »"""
    if t.astimezone(YAOUNDE).date() == aujourd_hui:
        return f"retiré aujourd’hui à {heure_fr(t)}"
    return f"retiré le {date_fr(t)}"


def detail_colis(titres: list[str], retrait: str) -> str:
    """Les autres articles du colis puis le retrait : « + Chargeur rapide 33 W · retiré le … »."""
    return " · ".join([*(f"+ {t}" for t in titres[1:]), *([retrait] if retrait else [])])


MOYENS = {
    "mtn": "MTN MoMo",
    "orange": "Orange Money",
    "carte": "Carte",
    "wallet": "Portefeuille BelivaY",
    "apple": "Apple Pay",
    "google": "Google Pay",
    "autre": "Mobile Money",
}


def paye_par(moyen: str, numero_masque: str = "") -> str:
    nom = MOYENS.get(moyen, moyen or "")
    return f"{nom} {numero_masque}".strip()


def francs(montant: int) -> str:
    """« 15 800 F » (espaces insécables)."""
    return f"{montant:,}".replace(",", NBSP) + f"{NBSP}F"
