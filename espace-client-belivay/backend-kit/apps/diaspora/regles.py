# backend/apps/diaspora/regles.py
# Règles du compte diaspora (DP-54), portées en Python pur depuis site/src/donnees/source.ts (PAYS_DIASPORA,
# AGE_DIASPORA, PLAFONDS_DIASPORA, nomCarte, COHERENCE_DIASPORA, controleDiaspora). Sans Django ; testées seules
# (tests/test_regles.py) avec les exemples du site (site/tests/diaspora.spec.ts, listes-statut.spec.ts).
#
# Le compte diaspora : majeur, vivant dans un pays accepté (jamais le Cameroun : compte normal ; jamais un pays sous
# sanctions), numéro de ce pays vérifié par SMS, carte à son nom. Paiement par carte (3-D Secure), PAY-CARTE-MAX
# par paiement et un plafond par mois ; des marchandises seulement, jamais d'argent liquide transféré.
#
# Contrôle de cohérence anti-fraude, refait par le serveur à chaque paiement (commande pour un proche, cadeau d'une
# liste payé par carte) :
# 1. Pays de la carte : celui que donne le prestataire (ResultatPaiement.pays_carte, CarteEnregistree.pays) ; à
#    défaut, le pays d'émission déclaré par le client. Les BIN de démonstration du site (BIN_DEMO) ne sont PAS
#    repris : en production, seul le prestataire connaît le pays d'un BIN.
# 2. Achat inhabituel : montant au-delà de MONTANT_X fois la moyenne des HABITUDE_N derniers paiements (dès
#    HABITUDE_MIN) ou, sans habitudes, au-delà de PREMIER_MAX ; paiements rapprochés : RAPPROCHEES paiements dans
#    les FENETRE_H dernières heures.
# Décision : carte émise au Cameroun ou dans un pays non accepté, ou REFUS_RAPPROCHEES paiements dans la fenêtre :
# refusé. Sinon chaque signal (pays, montant, rapprochees) compte pour un : 0 → accepté (3-D Secure seul) ;
# 1 → vérification renforcée (3-D Secure + code) ; SIGNAUX_REFUS ou plus → refusé. Un refus ne débite rien.

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date

# PARAMÈTRE À AJOUTER AU REGISTRE : DIA-PAYS (pays acceptés et indicatifs ; site : PAYS_DIASPORA)
PAYS_DIASPORA: tuple[tuple[str, str], ...] = (
    ("France", "+33"),
    ("Belgique", "+32"),
    ("Suisse", "+41"),
    ("Allemagne", "+49"),
    ("Italie", "+39"),
    ("Espagne", "+34"),
    ("Royaume-Uni", "+44"),
    ("Canada", "+1"),
    ("États-Unis", "+1"),
    ("Gabon", "+241"),
    ("Côte d’Ivoire", "+225"),
    ("Nigeria", "+234"),
    ("Afrique du Sud", "+27"),
)
CAMEROUN = "Cameroun"

# PARAMÈTRE À AJOUTER AU REGISTRE : DIA-AGE-MIN (18 ans)
AGE_DIASPORA = 18
# PARAMÈTRE À AJOUTER AU REGISTRE : DIA-PLAFOND-MOIS (500 000 F par mois : compte diaspora, ou même e-mail pour les
# cadeaux payés par carte ; le plafond par paiement est PAY-CARTE-MAX)
PLAFOND_MOIS = 500_000
# PARAMÈTRE À AJOUTER AU REGISTRE : DIA-LIENS-MAX (5 liens famille actifs ou invités)
LIENS_MAX = 5
# PARAMÈTRE À AJOUTER AU REGISTRE : DIA-DEMANDE-J (panier envoyé au proche diaspora : 7 jours)
DEMANDE_JOURS = 7
# PARAMÈTRE À AJOUTER AU REGISTRE : DIA-CODE-FAMILLE-H (code famille : 24 h, usage unique)
CODE_FAMILLE_HEURES = 24
# PARAMÈTRE À AJOUTER AU REGISTRE : DIA-INVITATION-J (lien d'invitation : 7 jours)
INVITATION_JOURS = 7


@dataclass(frozen=True)
class Coherence:
    """PARAMÈTRE À AJOUTER AU REGISTRE : DIA-COHERENCE (site : COHERENCE_DIASPORA)."""

    MONTANT_X: int = 3
    HABITUDE_N: int = 5
    HABITUDE_MIN: int = 2
    PREMIER_MAX: int = 100_000
    FENETRE_H: int = 24
    RAPPROCHEES: int = 2
    REFUS_RAPPROCHEES: int = 4
    SIGNAUX_REFUS: int = 2


COHERENCE = Coherence()


def pays_accepte(pays: str, indicatif: str | None = None) -> bool:
    return any(p == pays and (indicatif is None or i == indicatif) for p, i in PAYS_DIASPORA)


def indicatif_de(pays: str) -> str | None:
    return next((i for p, i in PAYS_DIASPORA if p == pays), None)


def nom_carte(x: str) -> str:
    """Le nom sur la carte est celui du compte : mêmes mots, sans accents ni majuscules, dans n'importe quel ordre."""
    sans = "".join(c for c in unicodedata.normalize("NFD", x or "") if unicodedata.category(c) != "Mn")
    return " ".join(sorted(m for m in re.split(r"[^a-z]+", sans.lower()) if m))


def age_le(naissance: date, jour: date) -> int:
    return jour.year - naissance.year - ((jour.month, jour.day) < (naissance.month, naissance.day))


def numero_etranger_valide(numero: str) -> bool:
    """6 à 12 chiffres, jamais un numéro camerounais (+237)."""
    brut = re.sub(r"\D", "", numero or "")
    return 6 <= len(brut) <= 12 and not re.match(r"^(00)?237", brut)


@dataclass(frozen=True)
class Controle:
    decision: str  # accepte | renforce | refuse
    pays_carte: str
    signaux: tuple[str, ...] = field(default=())
    motif: str | None = None  # refus : cameroun | pays | rapprochees | signaux

    def en_dict(self) -> dict:
        d = {"decision": self.decision, "paysCarte": self.pays_carte, "signaux": list(self.signaux)}
        if self.motif:
            d["motif"] = self.motif
        return d


def controle_diaspora(
    *, pays_carte: str, pays_compte: str, montant: int, historique: list[tuple[int, int]], maintenant: int, r: Coherence = COHERENCE
) -> Controle:
    """historique : [(instant en ms, montant)] des paiements déjà faits (même compte, ou même e-mail pour un cadeau)."""
    recentes = sorted(historique, key=lambda x: -x[0])
    proches = sum(1 for le, _ in recentes if le > maintenant - r.FENETRE_H * 3600_000)
    if pays_carte == CAMEROUN:
        return Controle("refuse", pays_carte, (), "cameroun")
    if not pays_accepte(pays_carte):
        return Controle("refuse", pays_carte, (), "pays")
    if proches >= r.REFUS_RAPPROCHEES:
        return Controle("refuse", pays_carte, ("rapprochees",), "rapprochees")
    habitudes = recentes[: r.HABITUDE_N]
    avec_habitudes = len(habitudes) >= r.HABITUDE_MIN
    signaux: list[str] = []
    if pays_carte != pays_compte:
        signaux.append("pays")
    # « montant > MONTANT_X × moyenne », en entiers (pas de float dans un calcul d'argent)
    if (montant * len(habitudes) > r.MONTANT_X * sum(m for _, m in habitudes)) if avec_habitudes else (montant > r.PREMIER_MAX):
        signaux.append("montant")
    if proches >= r.RAPPROCHEES:
        signaux.append("rapprochees")
    if len(signaux) >= r.SIGNAUX_REFUS:
        return Controle("refuse", pays_carte, tuple(signaux), "signaux")
    return Controle("renforce" if signaux else "accepte", pays_carte, tuple(signaux))


def depasse_plafonds(*, montant: int, deja_ce_mois: int, par_paiement: int, par_mois: int) -> bool:
    return montant > par_paiement or deja_ce_mois + montant > par_mois
