"""Notes, avis et remise affichée (CL-04, CL-06, CL-13 ; CAL-30, CAL-31 ; AVIS-BAS, AVIS-FENETRE ; DP-35).

- Le Trust Score et le palier d'un vendeur viennent du service Scores de la console (CAL-30) : le client les lit
  tels quels, ils ne sont jamais recalculés ici ; la perte d'un palier (DP-21) relève aussi de la console.
- Note affichée = moyenne des notes vérifiées, à une décimale ; répartition par étoile, à l'unité (CAL-31).
- Départage et Trust Score : borne basse de Wilson sur p̂ = notes ≥ 4 ÷ n, z = 1,96 (CAL-31), jamais affichée.
- Dans le critère Satisfaction, une note ≥ 4 est un succès, ≤ 2 un échec (CAL-30).
- Remise affichée = arrondi((P_barré − P) ÷ P_barré × 100), seulement si P_barré > P (CAL-31).
- Une note basse (AVIS-BAS) propose un litige ; on note jusqu'à AVIS-FENETRE après le retrait.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal, localcontext
from enum import Enum

from .registre import ParametresAvis

# Niveau de confiance de 95 % fixé par la règle CAL-31 : une constante de méthode, pas une valeur commerciale.
Z_WILSON = Decimal("1.96")


def note_affichee(notes: tuple[int, ...]) -> Decimal | None:
    """Camon 30 : 590 ÷ 128 = 4,61 → « 4,6 » ; None sans avis."""
    if not notes:
        return None
    _verifier(notes)
    return (Decimal(sum(notes)) / len(notes)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def repartition(notes: tuple[int, ...]) -> dict[int, int]:
    """Part de chaque note de 5 à 1, en pour cent à l'unité."""
    _verifier(notes)
    if not notes:
        return {k: 0 for k in range(5, 0, -1)}
    n = len(notes)
    return {
        k: int((Decimal(notes.count(k)) * 100 / n).quantize(Decimal(1), rounding=ROUND_HALF_UP))
        for k in range(5, 0, -1)
    }


def borne_wilson(succes: int, n: int) -> Decimal:
    """Borne basse de Wilson (z = 1,96) : 3 avis à 5 étoiles ne passent pas devant 200 avis à 4,7 (CAL-31)."""
    if n <= 0:
        return Decimal(0)
    if not 0 <= succes <= n:
        raise ValueError("succès hors de 0 … n")
    with localcontext() as ctx:
        ctx.prec = 28
        z2 = Z_WILSON * Z_WILSON
        p = Decimal(succes) / n
        centre = p + z2 / (2 * n)
        marge = Z_WILSON * ((p * (1 - p) + z2 / (4 * n)) / n).sqrt()
        return (centre - marge) / (1 + z2 / n)


class Issue(str, Enum):
    SUCCES = "succès"
    NEUTRE = "neutre"
    ECHEC = "échec"


def issue_satisfaction(note: int) -> Issue:
    _verifier((note,))
    return Issue.SUCCES if note >= 4 else Issue.ECHEC if note <= 2 else Issue.NEUTRE


def note_basse(note: int, p: ParametresAvis) -> bool:
    """Une note basse propose un litige (DP-35)."""
    _verifier((note,))
    return note <= p.note_basse_max


def fin_de_notation(retrait: datetime, p: ParametresAvis) -> datetime:
    """BLV-51702, retirée sam. 19 sept. à 11 h 32 : avis possible jusqu'au sam. 26 sept. à 11 h 32."""
    return retrait + timedelta(days=p.fenetre_jours)


def remise_pour_cent(prix_barre: int | None, prix: int) -> int | None:
    """99 900 → 89 900 : −10 % ; aucune remise affichée si le prix barré n'est pas plus haut (CAL-31)."""
    if prix_barre is None or prix_barre <= prix:
        return None
    return int((Decimal(prix_barre - prix) * 100 / prix_barre).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _verifier(notes: tuple[int, ...]) -> None:
    if any(isinstance(x, bool) or not isinstance(x, int) or not 1 <= x <= 5 for x in notes):
        raise ValueError("une note est un entier de 1 à 5 étoiles")
