"""Les cinq états de l'argent du vendeur et la page Argent (paquet « Espace vendeur » : ARG-01, VD09-R04, LIB-01,
LIB-02, GEL-01, GEL-02 ; décisions DP-22, DP-55 ; Q-64).

    En cours   = payée, pas encore retirée par le client                    (ambre)
    Se libère  = retirée, date de libération à venir                        (orange)
    Gelé       = litige, retour, recours ou vérification anti-fraude        (rouge), jamais de date de versement
    À verser   = libérée, part le vendredi                                  (vert)
    Versé      = crédité, avec sa référence BLV-VS-nnnn                     (sans couleur, dans Versements)
    En circulation = À verser + Se libère + En cours + Gelé                  (ARG-01 : la somme est toujours juste)

- Le gel prime sur tout compte à rebours (LIB-02) : un litige ou un retour ouvert pendant « Se libère » fait passer
  la somme à « Gelé » aussitôt ; sa date de libération est recalculée à la fin du gel (versements.liberation_apres_
  litige, litiges.fin_du_gel).
- Vérification anti-fraude (GEL-02, Q-64) : frozen.checks{amount, count}, libellé « Vérification en cours », motif
  écrit sous 48 h (versements.echeance_motif_antifraude), sans échéance.
- Une seule source (GET /money/summary) : ce module calcule les états à partir des gains figés au paiement
  (versements.Gain) ; le serveur ne les recompte pas ailleurs.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from enum import Enum

from .registre import ParametresVersements
from .versements import Gain, MotifGel, vendredi_de_versement


class EtatArgent(str, Enum):
    EN_COURS = "En cours"
    SE_LIBERE = "Se libère"
    GELE = "Gelé"
    A_VERSER = "À verser"
    VERSE = "Versé"


def etat_de_l_argent(g: Gain, maintenant: datetime) -> EtatArgent:
    """VD09-R04. Ordre : versé, puis gelé (le gel prime, LIB-02), puis en cours, se libère, à verser."""
    if maintenant.tzinfo is None:
        raise ValueError("heure sans fuseau : l'argent se compte à l'heure de Yaoundé (Africa/Douala)")
    if g.verse:
        return EtatArgent.VERSE
    if g.gel is not None:
        return EtatArgent.GELE
    if g.liberation is None:
        return EtatArgent.EN_COURS
    return EtatArgent.SE_LIBERE if g.liberation > maintenant else EtatArgent.A_VERSER


def date_de_versement(g: Gain, maintenant: datetime, p: ParametresVersements) -> date | None:
    """Vendredi annoncé sur la carte ; jamais pour une somme gelée (GEL-01, « Sans date de versement ») ni en cours
    (date de libération inconnue) ; la date du versement passé pour une somme versée n'est pas recalculée ici."""
    if etat_de_l_argent(g, maintenant) in (EtatArgent.SE_LIBERE, EtatArgent.A_VERSER):
        return vendredi_de_versement(g.liberation, p)  # type: ignore[arg-type]
    return None


@dataclass(frozen=True)
class Verifications:
    """frozen.checks (Q-64) : sommes gelées pour vérification anti-fraude."""

    amount: int
    count: int


@dataclass(frozen=True)
class ResumeArgent:
    """GET /money/summary (ARG-01) : un total par état, et « En circulation »."""

    en_cours: int
    se_libere: int
    gele: int
    a_verser: int
    verse: int
    verifications: Verifications

    @property
    def en_circulation(self) -> int:
        """À verser + Se libère + En cours + Gelé (ARG-01) ; le versé n'y est plus."""
        return self.a_verser + self.se_libere + self.en_cours + self.gele


def resume(gains: Sequence[Gain], maintenant: datetime) -> ResumeArgent:
    """Jeu d'essai VD09-R04 : En cours 17 840 F · Se libère 17 840 F · Gelé 688 488 F · À verser 17 840 F · Versé
    35 680 F ⇒ En circulation 742 008 F."""
    totaux = dict.fromkeys(EtatArgent, 0)
    checks = [0, 0]
    for g in gains:
        etat = etat_de_l_argent(g, maintenant)
        totaux[etat] += g.garde
        if etat is EtatArgent.GELE and g.gel is MotifGel.VERIFICATION:
            checks[0] += g.garde
            checks[1] += 1
    return ResumeArgent(
        en_cours=totaux[EtatArgent.EN_COURS],
        se_libere=totaux[EtatArgent.SE_LIBERE],
        gele=totaux[EtatArgent.GELE],
        a_verser=totaux[EtatArgent.A_VERSER],
        verse=totaux[EtatArgent.VERSE],
        verifications=Verifications(*checks),
    )
