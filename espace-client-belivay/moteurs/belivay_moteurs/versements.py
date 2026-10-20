"""Libération et versements du vendeur (paquet « Espace vendeur » : VD-02 p7, VD-09 p11, p25-26, p31, GEN-04,
VER-02, VER-04 ; décisions DP-23, DP-55 : Q-11 à Q-13, Q-15, Q-19 ; Q-58 à Q-60, Q-64, Q-65 ; DP-56 : Q-26 ;
DP-57 : A-8).

Une seule source pour la libération (audit V3) : `fermeture_du_retour`, `date_de_liberation` et
`vendredi_de_versement` acceptent une date (jour civil, litiges.py côté client) ou une heure (espace vendeur) ;
`litiges.fermeture_du_retour` et `litiges.liberation` les appellent.

    t_fermeture  = min(« Tout est en ordre » ; retrait + 7 j)                   VD-RET-FENETRE (Q-58)
    t_libération = t_fermeture + 3 j (Bronze, Argent) · 1 j (Or, Platine)      VD-LIB-* , jours calendaires
                   · 14 j (carte, quel que soit le palier, DP-23)
    après un litige gagné ou un retour refusé : max(date prévue ; fin du litige) (Q-60)
    versement(V) = Σ gardé libéré non versé, t_libération ≤ jeudi 23 h 59        VD-VER-ARRETE, heure de Yaoundé
                   versé le vendredi V avant 12 h, sans frais ni minimum          VD-VER-JOUR (Q-12, Q-59, Q-65)

- Le palier de libération est celui du Trust Score, jamais le palier de lancement (Q-10, paliers.py).
- Refus de l'opérateur : essais à + 24 h, + 48 h, + 72 h, puis versements suspendus ; ils reprennent seuls après la
  correction (après la revue de 7 jours si le numéro change) et tout le montant dû part le vendredi suivant ; un
  vendredi férié reste un jour de versement (Q-13, VD-VER-FERIE).
- Changement de numéro : 7 jours de revue ; le versement prévu pendant la revue est reporté, jamais envoyé à
  l'ancien numéro (F6, Q-19).
- Reprise d'un montant déjà libéré (vice caché, H7) : déduite des versements suivants (le contrat vaut accord
  écrit), le reste reporté ; au-delà de 30 jours, une demande de paiement Mobile Money part (Q-11).
- Reprise jamais payée (A-8, VD-REPRISE-IMPAYEE) : dès la demande Mobile Money restée impayée, les ventes sont
  bloquées jusqu'au règlement, avec relances ; 90 jours après la reprise, le recouvrement légal est proposé, décidé
  par une personne, contestable une fois.
- Cadeaux groupés (liste d'envies) : chaque cadeau payé est une commande normale, préparée dès le paiement et
  libérée à sa propre date ; le vendeur n'attend jamais la remise groupée (Q-15).
- Gel (LIB-02, GEL-01, GEL-02) : un litige, un retour, un recours possible ou en attente (litiges.fin_du_gel) ou une
  vérification anti-fraude gèle la somme aussitôt, même pendant le compte à rebours ; une somme gelée n'a jamais de
  date de versement et ne part pas le vendredi. Les cinq états de l'argent sont dans argent_vendeur.py.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from enum import Enum
from typing import Protocol, TypeVar

from .argent import pour_cent_affiche
from .delais import YAOUNDE
from .paliers import Palier
from .registre import ParametresVersements

Moment = TypeVar("Moment", date, datetime)  # jour civil (litiges.py) ou heure (espace vendeur)


class DelaisDeLiberation(Protocol):
    """Ce que demande la libération : ParametresVersements (VD-*) ou ParametresLitiges (RET-FENETRE, LIB-*), dont
    les valeurs concordent (registre._versements_concordants)."""

    fenetre_retour_jours: int
    lib_standard_jours: int
    lib_or_jours: int
    lib_carte_jours: int


def _verifier(*moments: date) -> None:
    if any(isinstance(m, datetime) and m.tzinfo is None for m in moments):
        raise ValueError("heure sans fuseau : les versements se comptent à l'heure de Yaoundé (Africa/Douala)")


# ── Libération ──────────────────────────────────────────────────────────────────────────────────────────


def fermeture_du_retour(retrait: Moment, tout_en_ordre: Moment | None, p: DelaisDeLiberation) -> Moment:
    """Sans confirmation du client, le retrait + 7 jours fait office de fermeture (Q-58, CAL-29)."""
    _verifier(retrait, *(m for m in (tout_en_ordre,) if m is not None))
    fin = retrait + timedelta(days=p.fenetre_retour_jours)
    return fin if tout_en_ordre is None else min(fin, tout_en_ordre)


def date_de_liberation(fermeture: Moment, palier: Palier, carte: bool, p: DelaisDeLiberation) -> Moment:
    """La seule règle de libération (PAL-02, VD09-R11, DP-23) : carte 14 jours ; Or et Platine 1 jour ; sinon 3
    jours, en jours calendaires. BLV-00007 confirmée le vendredi 18 à 18 h, Bronze : libérée le lundi 21 à 18 h."""
    _verifier(fermeture)
    if carte:
        jours = p.lib_carte_jours
    elif Palier(palier) in (Palier.OR, Palier.PLATINE):
        jours = p.lib_or_jours
    else:
        jours = p.lib_standard_jours
    return fermeture + timedelta(days=jours)


def liberation_apres_litige(prevue: datetime, fin_du_litige: datetime) -> datetime:
    """Litige gagné ou retour refusé : aussitôt si la date prévue est passée, sinon la date prévue (Q-60)."""
    _verifier(prevue, fin_du_litige)
    return max(prevue, fin_du_litige)


def progression_pour_cent(fermeture: datetime, liberation: datetime, maintenant: datetime) -> int:
    """Barre « Se libère » : 63 h 48 sur 72 h = 88,6 % → 89 % (VD-09 p11), entre 0 et 100."""
    _verifier(fermeture, liberation, maintenant)
    ecoule = min(max(maintenant - fermeture, timedelta(0)), liberation - fermeture)
    return pour_cent_affiche(int(ecoule.total_seconds()), int((liberation - fermeture).total_seconds()))


# ── Vendredi du versement ───────────────────────────────────────────────────────────────────────────────


def arrete(jour_arrete: date, p: ParametresVersements) -> datetime:
    """Fin de l'arrêté des comptes : jeudi 23 h 59 (la minute comprise), heure de Yaoundé."""
    return datetime.combine(jour_arrete, p.heure_arrete, YAOUNDE) + timedelta(minutes=1)


def vendredi_de_versement(liberation: date, p: ParametresVersements) -> date:
    """Premier vendredi dont l'arrêté (la veille, 23 h 59) suit la libération. Libéré jeudi 24 à 23 h 59 : versé
    vendredi 25 ; libéré vendredi 25 à 10 h : versé vendredi 2 oct. (Q-59). Un vendredi férié compte (Q-13). Un
    jour civil compte dès 0 h, heure de Yaoundé (libéré un jeudi : vendredi ; un vendredi : le suivant)."""
    _verifier(liberation)
    if not isinstance(liberation, datetime):
        liberation = datetime.combine(liberation, time(0), YAOUNDE)
    local = liberation.astimezone(YAOUNDE)
    jeudi = local.date() + timedelta(days=(p.jour_arrete - local.weekday()) % 7)
    if local >= arrete(jeudi, p):
        jeudi += timedelta(days=7)
    return jeudi + timedelta(days=(p.jour_versement - p.jour_arrete) % 7)


def heure_limite(vendredi: date, p: ParametresVersements) -> datetime:
    """« Versé vendredi avant 12 h » (GEN-04)."""
    return datetime.combine(vendredi, p.heure_versement, YAOUNDE)


class MotifGel(str, Enum):
    """Ce qui peut geler une somme (GEL-02, LIB-02 ; recours : DP-56 Q-26). Un gel est toujours attaché à une
    commande précise."""

    LITIGE = "litige"
    RETOUR = "retour"
    RECOURS = "recours"  # décision rendue, délai de recours ouvert ou recours en attente de réponse
    VERIFICATION = "vérification anti-fraude"  # « Vérification en cours », frozen.checks (Q-64)


@dataclass(frozen=True)
class Gain:
    """Montant gardé d'une vente, tel que figé au paiement."""

    reference: str  # BLV-00007
    garde: int
    liberation: datetime | None  # None : pas encore retirée (ou date pas encore connue)
    verse: bool = False
    gel: MotifGel | None = None  # le gel prime sur tout compte à rebours (LIB-02)


def montant_du(vendredi: date, gains: Sequence[Gain], p: ParametresVersements) -> int:
    """Σ gardé libéré non versé et non gelé dont l'arrêté tombe au plus tard la veille de ce vendredi (F4), sans
    minimum : 600 F libérés jeudi soir partent vendredi (Q-12). Ce qui n'est pas parti s'ajoute au vendredi suivant.
    Une somme gelée ne part pas, même si sa date de libération est passée (LIB-02, GEL-01)."""
    return sum(
        g.garde
        for g in gains
        if not g.verse
        and g.gel is None
        and g.liberation is not None
        and vendredi_de_versement(g.liberation, p) <= vendredi
    )


def echeance_motif_antifraude(debut_du_gel: datetime, p: ParametresVersements) -> datetime:
    """Gel pour vérification anti-fraude (GEL-02, Q-64, VD-GEL-ANTIFRAUDE) : le motif est écrit au vendeur au plus
    tard 48 h après le gel ; le gel lui-même n'a pas d'échéance."""
    _verifier(debut_du_gel)
    return debut_du_gel + timedelta(hours=p.gel_motif_heures)


def motif_antifraude_en_retard(
    debut_du_gel: datetime, motif_ecrit: datetime | None, maintenant: datetime, p: ParametresVersements
) -> bool:
    """Vrai si le motif n'a pas été écrit à temps (alerte de la console, GEL-02)."""
    _verifier(maintenant, *(m for m in (motif_ecrit,) if m is not None))
    echeance = echeance_motif_antifraude(debut_du_gel, p)
    return (motif_ecrit if motif_ecrit is not None else maintenant) > echeance


def reference_de_versement(numero: int) -> str:
    """Référence annoncée avant le versement et retrouvée dans l'historique (VER-02) : BLV-VS-nnnn, attribuée à
    l'arrêté du jeudi ; au moins 4 chiffres. 4092 → « BLV-VS-4092 »."""
    if isinstance(numero, bool) or not isinstance(numero, int) or numero < 1:
        raise ValueError(f"numéro de versement invalide {numero!r}")
    return f"BLV-VS-{numero:04d}"


# ── Refus, suspension, changement de numéro ─────────────────────────────────────────────────────────────


def essais_apres_refus(refus: datetime, p: ParametresVersements) -> tuple[datetime, ...]:
    """Refusé vendredi 25 : essais samedi 26, dimanche 27 et lundi 28 à la même heure (F7)."""
    _verifier(refus)
    return tuple(refus + timedelta(hours=p.intervalle_essais_heures * i) for i in range(1, p.essais + 1))


def suspendu(refus_consecutifs: int, p: ParametresVersements) -> bool:
    """Le refus du vendredi, puis l'échec des 3 essais : versements suspendus, le support prend la main."""
    return refus_consecutifs > p.essais


def fin_de_revue(changement_de_numero: datetime, p: ParametresVersements) -> datetime:
    _verifier(changement_de_numero)
    return changement_de_numero + timedelta(days=p.revue_numero_jours)


def premier_versement_apres_correction(correction: datetime, numero_change: bool, p: ParametresVersements) -> date:
    """Reprise automatique (Q-13) : le vendredi qui suit la correction, ou la fin de la revue de 7 jours si le numéro
    a changé. Numéro changé lundi 21 sept. : revue jusqu'au lundi 28, versement vendredi 2 oct. (Q-19) ; corrigé
    mardi 29 sept. : revue jusqu'au mardi 6 oct., versement vendredi 9 oct. (Q-13)."""
    return vendredi_de_versement(fin_de_revue(correction, p) if numero_change else correction, p)


# ── Reprise d'un montant déjà libéré ────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class VersementNet:
    verse: int
    repris: int  # déduit ce vendredi, ligne « Repris » datée dans Mes gains
    reprise_reportee: int  # reste à reprendre sur les vendredis suivants
    demande_mobile_money: bool  # le reste n'est pas couvert après 30 jours (Q-11)


def appliquer_reprise(
    du: int, reprise_restante: int, reprise_decidee_le: date | None, vendredi: date, p: ParametresVersements
) -> VersementNet:
    """Reprise de 17 840 F, 10 000 F dus : 0 F versé, 7 840 F reportés (Q-11)."""
    if du < 0 or reprise_restante < 0:
        raise ValueError("montants négatifs")
    repris = min(du, reprise_restante)
    reste = reprise_restante - repris
    tard = reprise_decidee_le is not None and vendredi > reprise_decidee_le + timedelta(days=p.reprise_demande_jours)
    return VersementNet(du - repris, repris, reste, reste > 0 and tard)


# ── Reprise jamais payée (A-8) ──────────────────────────────────────────────────────────────────────────


class EtatReprise(str, Enum):
    SOLDEE = "soldée"
    DEDUITE = "déduite des versements"  # le reste est reporté sur les vendredis suivants (Q-11)
    VENTES_BLOQUEES = "ventes bloquées"  # demande Mobile Money impayée : jusqu'au règlement, avec relances
    RECOUVREMENT = "recouvrement légal proposé"  # décidé par une personne, contestable une fois


@dataclass(frozen=True)
class SuiviReprise:
    etat: EtatReprise
    ventes_bloquees: bool  # offres retirées des propositions aux clients, publication fermée
    demande_mobile_money: bool
    decision_humaine: bool  # le recouvrement ne part jamais seul


def suivi_reprise(reste: int, reprise_decidee_le: date, jour: date, p: ParametresVersements) -> SuiviReprise:
    """DP-57 (A-8) : reprise de 17 840 F décidée le 20 sept. et jamais couverte : déduite des versements jusqu'au 20
    oct. ; dès le 21 oct., demande Mobile Money et ventes bloquées jusqu'au règlement ; dès le 20 déc. (au-delà de
    90 jours), recouvrement légal proposé, décidé par une personne. Un reste à 0 F lève tout blocage."""
    if reste < 0:
        raise ValueError("reste négatif")
    if reste == 0:
        return SuiviReprise(EtatReprise.SOLDEE, False, False, False)
    depuis = jour - reprise_decidee_le
    if depuis > timedelta(days=p.recouvrement_jours):
        return SuiviReprise(EtatReprise.RECOUVREMENT, True, True, True)
    if depuis > timedelta(days=p.reprise_demande_jours):
        return SuiviReprise(EtatReprise.VENTES_BLOQUEES, True, True, False)
    return SuiviReprise(EtatReprise.DEDUITE, False, False, False)
