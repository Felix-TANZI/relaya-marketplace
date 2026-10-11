# backend/apps/vendeur_core/parametres.py
# Paramètres du vendeur (registre CCH-15) lus par les moteurs : commission, versements, paliers, sanctions, litiges.
# Même source que le kit client (apps.client_core.parametres.registre : table ParametreMetier ou fichier livré).
import re
from dataclasses import dataclass

from apps.client_core.parametres import litiges, nombres, registre, version  # noqa: F401 - réexportés


def commission():
    from belivay_moteurs.registre import lire_commission

    return lire_commission(registre())


def versements():
    from belivay_moteurs.registre import lire_versements

    return lire_versements(registre())


def paliers():
    from belivay_moteurs.registre import lire_paliers

    return lire_paliers(registre())


def sanctions():
    from belivay_moteurs.registre import lire_sanctions

    return lire_sanctions(registre())


def valeur(code: str, defaut: str | None = None) -> str:
    """Valeur brute d'un paramètre (texte du registre) ; `defaut` si absent (paramètre « à ajouter au registre »)."""
    from belivay_moteurs.erreurs import ParametreAbsent

    reg = registre()
    if code in reg:
        return reg[code]
    if defaut is None:
        raise ParametreAbsent(code)
    return defaut


# ── Paramètres propres au vendeur (DP-57) : une lecture stricte par code ────────────────────────────────
# Même discipline que belivay_moteurs.registre : chaque valeur est lue avec une forme attendue précise
# (expression régulière) ; si la forme change, la lecture s'arrête (ParametreIllisible) au lieu de deviner.
# Aucune valeur n'est recopiée ici. `reg` : registre à lire (tests) ; par défaut celui du serveur.
_BLANC = "[   ]"
_N = r"(\d{1,3}(?:[   ]\d{3})+|\d+)"  # « 5 000 », « 1 000 000 », « 48 »


def _n(texte: str) -> int:
    return int(re.sub(_BLANC, "", texte))


def _forme(code: str, motif: str, reg: dict | None = None) -> re.Match:
    from belivay_moteurs.erreurs import ParametreAbsent, ParametreIllisible

    reg = registre() if reg is None else reg
    if code not in reg:
        raise ParametreAbsent(code)
    v = reg[code].strip()
    m = re.fullmatch(motif, v)
    if not m:
        raise ParametreIllisible(f"{code} : « {v} » ne suit pas la forme attendue")
    return m


def _illisible(code: str, pourquoi: str):
    from belivay_moteurs.erreurs import ParametreIllisible

    return ParametreIllisible(f"{code} : {pourquoi}")


def lien_mot_de_passe(reg: dict | None = None) -> int:
    """VD-MDP-LIEN « 15 minutes » → durée du lien de nouveau mot de passe, en minutes."""
    return _n(_forme("VD-MDP-LIEN", _N + r" minutes", reg).group(1))


@dataclass(frozen=True)
class KycDelais:
    auto_minutes: int
    humain_heures_ouvrees: int
    refus_max: int


def kyc_delais(reg: dict | None = None) -> KycDelais:
    """VD-KYC-DELAIS : réponse automatique, réponse humaine (heures ouvrées), refus avant décision humaine."""
    m = _forme(
        "VD-KYC-DELAIS",
        r"vérification automatique en (\d+) minutes au plus ; sinon une personne répond sous (\d+) h ouvrées ; "
        r"décision humaine après (\d+) refus",
        reg,
    )
    return KycDelais(int(m.group(1)), int(m.group(2)), int(m.group(3)))


def resiliation_preavis(reg: dict | None = None) -> int:
    """VD-RESILIATION-PREAVIS « 30 jours » → préavis de résiliation du contrat et de clôture du compte, en jours."""
    return _n(_forme("VD-RESILIATION-PREAVIS", _N + r" jours", reg).group(1))


@dataclass(frozen=True)
class SaisieAssistee:
    premieres_boutiques: int  # gratuite pour les N premières boutiques de chaque zone exploitée
    prix_session: int  # ensuite, francs la session


def saisie_assistee(reg: dict | None = None) -> SaisieAssistee:
    m = _forme(
        "VD-SAISIE-ASSISTEE",
        r"gratuite pour les (\d+) premières boutiques de chaque zone exploitée ; ensuite " + _N + r" F la session",
        reg,
    )
    return SaisieAssistee(int(m.group(1)), _n(m.group(2)))


@dataclass(frozen=True)
class PrixAnormal:
    bas_pour_cent: int  # sous ce pourcentage du prix habituel
    haut_fois: int  # au-delà de ce multiple du prix habituel


def prix_anormal(reg: dict | None = None) -> PrixAnormal:
    m = _forme(
        "VD-PRIX-ANORMAL",
        r"sous (\d+) % ou au-delà de (\d+) fois le prix habituel de la catégorie : relu par une personne, jamais bloqué",
        reg,
    )
    return PrixAnormal(int(m.group(1)), int(m.group(2)))


def contestation_reponse(reg: dict | None = None) -> int:
    """VD-CONTESTATION-REPONSE « 72 h ouvrées, dimanche non compté » → heures ouvrées."""
    return int(_forme("VD-CONTESTATION-REPONSE", r"(\d+) h ouvrées, dimanche non compté", reg).group(1))


def file_hors_ligne(reg: dict | None = None) -> int:
    """VD-FILE-HORS-LIGNE « 72 h » → âge maximal d'une action gardée hors connexion, en heures."""
    return int(_forme("VD-FILE-HORS-LIGNE", r"(\d+) h", reg).group(1))


@dataclass(frozen=True)
class Photos:
    minimum: int
    maximum: int
    cote_min_px: int
    compression_cote_px: int
    qualite_jpeg_pour_cent: int


def photos(reg: dict | None = None) -> Photos:
    m = _forme(
        "VD-PHOTOS",
        r"(\d+) au moins, (\d+) au plus ; " + _N + r" px au moins de côté ; allégées à " + _N + r" px, qualité JPEG (\d+) %",
        reg,
    )
    p = Photos(int(m.group(1)), int(m.group(2)), _n(m.group(3)), _n(m.group(4)), int(m.group(5)))
    if not 0 < p.minimum <= p.maximum:
        raise _illisible("VD-PHOTOS", "le minimum doit être positif et ne pas dépasser le maximum")
    if not 0 < p.qualite_jpeg_pour_cent <= 100:
        raise _illisible("VD-PHOTOS", "la qualité JPEG est un pourcentage")
    return p


@dataclass(frozen=True)
class FicheDelai:
    heures: int
    prioritaire_heures: int
    prioritaire_prix: int


def fiche_delai(reg: dict | None = None) -> FicheDelai:
    m = _forme("VD-FICHE-DELAI", r"(\d+) h ; (\d+) h en prioritaire, pour " + _N + r" F la fiche", reg)
    return FicheDelai(int(m.group(1)), int(m.group(2)), _n(m.group(3)))


def moderation(reg: dict | None = None) -> int:
    """VD-MODERATION « 48 h » → délai de vérification d'une offre envoyée, en heures."""
    return int(_forme("VD-MODERATION", r"(\d+) h", reg).group(1))


@dataclass(frozen=True)
class Gabarit:
    classe: str
    kg: int
    cm: int


@dataclass(frozen=True)
class Colis:
    diviseur: int  # poids volumétrique = volume (cm³) ÷ diviseur
    gabarits: tuple[Gabarit, ...]  # du plus petit au plus grand
    au_dela: str  # classe au-delà du dernier gabarit
    seuil_kg: int  # mesures demandées au-delà
    seuil_cm: int


def colis(reg: dict | None = None) -> Colis:
    m = _forme(
        "VD-COLIS",
        r"poids facturé = le plus grand du poids réel et du volume ÷ " + _N + r" ; (.+) · au-delà ([A-Z]+) ; "
        r"mesures demandées au-delà de (\d+) kg ou de (\d+) cm",
        reg,
    )
    gabarits = []
    for morceau in m.group(2).split(" · "):
        g = re.fullmatch(r"([A-Z]+) (\d+) kg et (\d+) cm", morceau)
        if not g:
            raise _illisible("VD-COLIS", f"gabarit « {morceau} » illisible")
        gabarits.append(Gabarit(g.group(1), int(g.group(2)), int(g.group(3))))
    for a, b in zip(gabarits, gabarits[1:], strict=False):
        if not (a.kg < b.kg and a.cm < b.cm):
            raise _illisible("VD-COLIS", "les gabarits doivent croître")
    return Colis(_n(m.group(1)), tuple(gabarits), m.group(3), int(m.group(4)), int(m.group(5)))


def etats_produit(reg: dict | None = None) -> tuple[str, ...]:
    """VD-ETATS-PRODUIT : la liste des états d'un article, dans l'ordre (le premier est l'état par défaut)."""
    etat = r"[A-ZÀ-Ý][^\W\d_]*(?: [^\W\d_]+)*"  # « Occasion bon état » : une majuscule, des mots
    m = _forme("VD-ETATS-PRODUIT", etat + r"(?:, " + etat + r")+", reg)
    etats = tuple(e.strip() for e in m.group(0).split(", "))
    if len(set(etats)) != len(etats):
        raise _illisible("VD-ETATS-PRODUIT", "un état apparaît deux fois")
    return etats


@dataclass(frozen=True)
class PreparationDelais:
    defaut_heures: int
    choix_heures: tuple[int, ...]


def preparation_delais(reg: dict | None = None) -> PreparationDelais:
    m = _forme("VD-PREPARATION-DELAIS", r"(\d+) h par défaut ; au choix ((?:\d+, )*\d+) ou (\d+) h", reg)
    choix = tuple(int(x) for x in m.group(2).split(", ")) + (int(m.group(3)),)
    if list(choix) != sorted(set(choix)):
        raise _illisible("VD-PREPARATION-DELAIS", "les délais au choix doivent croître")
    if int(m.group(1)) not in choix:
        raise _illisible("VD-PREPARATION-DELAIS", "le délai par défaut doit être l'un des délais au choix")
    return PreparationDelais(int(m.group(1)), choix)


def rappel_prix(reg: dict | None = None) -> int:
    """VD-RAPPEL-PRIX « 7 jours » → rappel après « Rester à ce prix », en jours."""
    return int(_forme("VD-RAPPEL-PRIX", r"(\d+) jours", reg).group(1))


def prix_auto(reg: dict | None = None) -> int:
    """VD-PRIX-AUTO → baisse maximale du prix automatique à chaque fois, en %."""
    return int(_forme("VD-PRIX-AUTO", r"baisse de (\d+) % au plus à chaque fois, jamais sous le plancher choisi", reg).group(1))


def doublon(reg: dict | None = None) -> int:
    """VD-DOUBLON « 85 % de ressemblance » → seuil de similarité d'une fiche en double, en %."""
    v = int(_forme("VD-DOUBLON", r"(\d+) % de ressemblance", reg).group(1))
    if not 0 < v <= 100:
        raise _illisible("VD-DOUBLON", "la ressemblance est un pourcentage")
    return v


@dataclass(frozen=True)
class ConseilPrix:
    centile: int  # plancher du prix conseillé : ce centile des prix pratiqués
    jours: int  # sur cette période


def conseil_prix(reg: dict | None = None) -> ConseilPrix:
    m = _forme("VD-CONSEIL-PRIX", r"(\d+)e centile des prix pratiqués sur (\d+) jours", reg)
    c = ConseilPrix(int(m.group(1)), int(m.group(2)))
    if not 0 < c.centile <= 100:
        raise _illisible("VD-CONSEIL-PRIX", "le centile est compris entre 1 et 100")
    return c


def prefixes_cm(reg: dict | None = None) -> dict[str, tuple[str, ...]]:
    """VD-PREFIXES-CM « MTN : 67, 68, 650 à 654 · Orange : 69, 655 à 659 » → opérateur → préfixes, dans l'ordre."""
    m = _forme("VD-PREFIXES-CM", r"[^:·]+ : [\d, à]+(?: · [^:·]+ : [\d, à]+)*", reg)
    out: dict[str, tuple[str, ...]] = {}
    for bloc in m.group(0).split(" · "):
        nom, _, liste = bloc.partition(" : ")
        prefixes: list[str] = []
        for morceau in liste.split(", "):
            p = re.fullmatch(r"(\d+)(?: à (\d+))?", morceau)
            if not p:
                raise _illisible("VD-PREFIXES-CM", f"préfixe « {morceau} » illisible")
            if p.group(2):
                de, a = int(p.group(1)), int(p.group(2))
                if len(p.group(1)) != len(p.group(2)) or de > a:
                    raise _illisible("VD-PREFIXES-CM", f"plage « {morceau} » illisible")
                prefixes += [str(x) for x in range(de, a + 1)]
            else:
                prefixes.append(p.group(1))
        nom = nom.strip()
        if nom in out:
            raise _illisible("VD-PREFIXES-CM", f"opérateur « {nom} » deux fois")
        out[nom] = tuple(prefixes)
    tous = [p for ps in out.values() for p in ps]
    if len(set(tous)) != len(tous):
        raise _illisible("VD-PREFIXES-CM", "un préfixe est donné deux fois")
    return out


def equipe_max(reg: dict | None = None) -> int:
    """VD-EQUIPE-MAX « 3 accès employés par boutique, sur tous les plans » → accès Préparation par boutique."""
    return int(_forme("VD-EQUIPE-MAX", r"(\d+) accès employés par boutique, sur tous les plans", reg).group(1))


@dataclass(frozen=True)
class Services:
    photos_agent_prix: int  # francs le lot
    photos_agent_lot: int  # produits par lot


def services(reg: dict | None = None) -> Services:
    """VD-SERVICES « photos par un agent : 3 000 F les 10 produits » (fiche prioritaire : VD-FICHE-DELAI ; saisie
    assistée : VD-SAISIE-ASSISTEE)."""
    m = _forme("VD-SERVICES", r"photos par un agent : " + _N + r" F les (\d+) produits", reg)
    return Services(_n(m.group(1)), int(m.group(2)))


@dataclass(frozen=True)
class Visibilite:
    vitrine_jours: int
    merite_jours: int  # offre la moins chère livrée de sa zone N jours de suite
    score_min: int  # rien sous ce Trust Score
    flash_relue_au_dela: int  # remise de plus de N % relue par la console


def visibilite(reg: dict | None = None) -> Visibilite:
    m = _forme(
        "VD-VISIBILITE",
        r"vitrine de (\d+) jours et une vente flash le mois suivant, pour l['’]offre la moins chère livrée de sa zone "
        r"(\d+) jours de suite ; rien sous un Trust Score de (\d+) ; remise de plus de (\d+) % relue par la console",
        reg,
    )
    return Visibilite(int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)))


@dataclass(frozen=True)
class Demande:
    visibles_free: int  # recherches sans résultat visibles avec Free (toutes avec Boost)
    jours: int  # fenêtre glissante dans la zone


def demande(reg: dict | None = None) -> Demande:
    m = _forme(
        "VD-DEMANDE",
        r"(\d+) recherches sans résultat visibles avec Free, toutes avec Boost ; (\d+) jours glissants dans la zone",
        reg,
    )
    return Demande(int(m.group(1)), int(m.group(2)))


@dataclass(frozen=True)
class Simulateur:
    maximum: int  # curseur de 0 à N F de ventes par mois
    sur_mesure_des: int


def simulateur(reg: dict | None = None) -> Simulateur:
    m = _forme("VD-SIMULATEUR", r"curseur de 0 à " + _N + r" F de ventes par mois ; Sur-mesure dès " + _N + r" F", reg)
    return Simulateur(_n(m.group(1)), _n(m.group(2)))


def visite_agent(reg: dict | None = None) -> int:
    """VD-VISITE-AGENT « 72 h ouvrées, sinon remboursement » → heures ouvrées."""
    return int(_forme("VD-VISITE-AGENT", r"(\d+) h ouvrées, sinon remboursement", reg).group(1))


# Codes de l'espace vendeur créés par DP-57 (vague d'intégration), servis tels quels par GET /api/vendors/config.
CODES_CONSOLE = (
    "VD-MDP-LIEN",
    "VD-KYC-DELAIS",
    "VD-RESILIATION-PREAVIS",
    "VD-SAISIE-ASSISTEE",
    "VD-PRIX-ANORMAL",
    "VD-CONTESTATION-REPONSE",
    "VD-FILE-HORS-LIGNE",
    "VD-PHOTOS",
    "VD-FICHE-DELAI",
    "VD-MODERATION",
    "VD-COLIS",
    "VD-ETATS-PRODUIT",
    "VD-PREPARATION-DELAIS",
    "VD-RAPPEL-PRIX",
    "VD-PRIX-AUTO",
    "VD-DOUBLON",
    "VD-CONSEIL-PRIX",
    "VD-PREFIXES-CM",
    "VD-EQUIPE-MAX",
    "VD-SERVICES",
    "VD-VISIBILITE",
    "VD-DEMANDE",
    "VD-SIMULATEUR",
    "VD-VISITE-AGENT",
)


def parametres_console() -> dict[str, str]:
    """{code: valeur} des paramètres de DP-57 ; un code absent du registre arrête la lecture (ParametreAbsent)."""
    return {code: valeur(code) for code in CODES_CONSOLE}
