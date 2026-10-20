"""Lecture des paramètres du registre (CCH-15 : aucune valeur dans le code).

Source : logique-metier/parametres-en-vigueur.json (registre de CL-16 avec les décisions du porteur).
En production, les mêmes codes viendront de la configuration versionnée du serveur (réglée par la
console). Chaque valeur est lue avec une forme attendue précise : si la forme change, la lecture
s'arrête (ParametreIllisible) au lieu de deviner un montant.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import time
from decimal import Decimal
from pathlib import Path
from types import MappingProxyType

from .argent import francs
from .erreurs import ParametreAbsent, ParametreIllisible

# Registre du dépôt PG-BelivaY ; une fois intégrés au serveur, les moteurs reçoivent les paramètres de la
# configuration versionnée et n'utilisent pas ce chemin.
REGISTRE_PAR_DEFAUT = Path(__file__).resolve().parents[2] / "logique-metier" / "parametres-en-vigueur.json"

_NOMBRE = r"(\d{1,3}(?:[\s\u00a0\u202f]\d{3})*|\d+)"


SENS = "#sens"  # suffixe de la clé qui porte le sens d'un paramètre (« … après 5 commandes sans incident »)
VERSION = "#version"  # empreinte du registre lu : une commande garde la version de ses paramètres (CCH-15)


def charger_registre(chemin: Path | str = REGISTRE_PAR_DEFAUT) -> dict[str, str]:
    """Code → valeur, telle qu'écrite dans le registre ; « code#sens » → sens du paramètre."""
    texte = Path(chemin).read_text(encoding="utf-8")
    donnees = json.loads(texte)
    registre = {p["code"]: p["valeur"] for p in donnees["parametres"]}
    registre.update({p["code"] + SENS: p["sens"] for p in donnees["parametres"]})
    registre[VERSION] = hashlib.sha256(texte.encode("utf-8")).hexdigest()[:12]
    return registre


def _version(registre: dict[str, str]) -> str:
    """Version des paramètres ; un registre composé à la main (tests) sans version porte « non versionné »."""
    return registre.get(VERSION, "non versionné")


def _entier(texte: str) -> int:
    return int(re.sub(r"[\s\u00a0\u202f]", "", texte))


def _valeur(registre: dict[str, str], code: str) -> str:
    if code not in registre:
        raise ParametreAbsent(code)
    return registre[code].strip()


def _lire(registre: dict[str, str], code: str, motif: str) -> re.Match[str]:
    v = _valeur(registre, code)
    m = re.fullmatch(motif, v)
    if not m:
        raise ParametreIllisible(f"{code} : « {v} » ne suit pas la forme attendue")
    return m


@dataclass(frozen=True)
class PalierDistance:
    """Supplément dû tant que la distance est sous `borne_km` (ou égale, si `borne_comprise`) ;
    borne None : dernier palier, au-delà de toutes les bornes."""

    borne_km: Decimal | None
    borne_comprise: bool
    montant: int


@dataclass(frozen=True)
class ParametresLivraison:
    """Paramètres du moteur de frais du panier (CL-07, CAL-06 à CAL-11, DP-07, DP-18, DP-19, DP-25)."""

    ramassage: int  # LIV-R : R
    degressivite_pour_cent: Decimal  # LIV-DELTA : δ
    ramassage_suivant: int  # R′ = R × (1 − δ), même zone
    remise_relais: Mapping[str, int]  # LIV-REM-RELAIS, par classe de colis (DP-18, DP-25), non modifiable
    remise_domicile: int  # LIV-REM-DOM, par colis (DP-19)
    seuil_relais: int  # LIV-SEUIL-RELAIS
    seuil_domicile: int  # LIV-SEUIL-DOM
    classe_offerte: str  # LIV-OFFERT-CLASSE : la livraison offerte couvre le tarif de ce colis
    supplement_m_l: int  # LIV-SUPPL-M / L (DP-07)
    supplement_xl: tuple[PalierDistance, ...]  # LIV-SUPPL-XL, selon la distance (DP-07)
    xl_interdit_en_relais: bool  # LIV-XL-RELAIS
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_livraison(registre: dict[str, str]) -> ParametresLivraison:
    r = _entier(_lire(registre, "LIV-R", _NOMBRE + r" F").group(1))

    m = _lire(registre, "LIV-DELTA", r"(\d+) % \(R′ = " + _NOMBRE + r" F\)")
    delta = Decimal(m.group(1))
    r_prime = francs(Decimal(r) * (100 - delta) / 100)  # arrondi au franc, moitié vers le haut
    if r_prime != _entier(m.group(2)):
        raise ParametreIllisible(f"LIV-DELTA : R′ écrit {m.group(2)} F, calculé {r_prime} F")

    m = _lire(registre, "LIV-REM-RELAIS", _NOMBRE + r" F par colis S ou M, " + _NOMBRE + r" F par colis L")
    remise_relais = MappingProxyType({"S": _entier(m.group(1)), "M": _entier(m.group(1)), "L": _entier(m.group(2))})
    remise_domicile = _entier(_lire(registre, "LIV-REM-DOM", _NOMBRE + r" F par colis").group(1))

    seuil_relais = _entier(
        _lire(registre, "LIV-SEUIL-RELAIS", r"dès " + _NOMBRE + r" F de sous-total produits").group(1)
    )
    seuil_domicile = _entier(_lire(registre, "LIV-SEUIL-DOM", r"dès " + _NOMBRE + r" F").group(1))
    classe_offerte = _lire(registre, "LIV-OFFERT-CLASSE", r"tarif d’un colis (S|M|L)").group(1)

    supplement_m_l = _entier(
        _lire(registre, "LIV-SUPPL-M / L", _NOMBRE + r" F : aucun supplément de classe M ou L").group(1)
    )
    m = _lire(
        registre,
        "LIV-SUPPL-XL",
        _NOMBRE
        + r" F \(moins de (\d+) km\) · "
        + _NOMBRE
        + r" F \((\d+) à (\d+) km\) · "
        + _NOMBRE
        + r" F \(plus de (\d+) km\), distance de la livraison à domicile",
    )
    if not (m.group(2) == m.group(4) and m.group(5) == m.group(7)):
        raise ParametreIllisible("LIV-SUPPL-XL : les paliers de distance ne se suivent pas")
    paliers = (
        # « moins de 5 km » : 5 km exclu ; « 5 à 10 km » : 10 km compris ; « plus de 10 km » : au-delà.
        PalierDistance(Decimal(m.group(2)), False, _entier(m.group(1))),
        PalierDistance(Decimal(m.group(5)), True, _entier(m.group(3))),
        PalierDistance(None, False, _entier(m.group(6))),
    )
    xl_interdit = _lire(registre, "LIV-XL-RELAIS", r"(interdit|autorisé)").group(1) == "interdit"

    # Les livraisons de base écrites au registre doivent valoir R + remise d'un colis S (relais, domicile).
    for code, attendu in (("LIV-RELAIS-BASE", r + remise_relais["S"]), ("LIV-DOM-BASE", r + remise_domicile)):
        ecrit = _entier(_lire(registre, code, _NOMBRE + r" F").group(1))
        if ecrit != attendu:
            raise ParametreIllisible(f"{code} : {ecrit} F écrit, {attendu} F attendu (R + remise)")

    return ParametresLivraison(
        ramassage=r,
        degressivite_pour_cent=delta,
        ramassage_suivant=r_prime,
        remise_relais=remise_relais,
        remise_domicile=remise_domicile,
        seuil_relais=seuil_relais,
        seuil_domicile=seuil_domicile,
        classe_offerte=classe_offerte,
        supplement_m_l=supplement_m_l,
        supplement_xl=paliers,
        xl_interdit_en_relais=xl_interdit,
        version=_version(registre),
    )


@dataclass(frozen=True)
class ParametresGarde:
    """Paramètres de la garde et des rappels S0 à S5 (CL-10 ; CAL-19 à CAL-23 ; DP-08, DP-24, DP-29)."""

    grille: tuple[int, ...]  # GARDE-GRILLE : tarif des jours 1 à 7 (DP-08)
    ajout_gros: int  # GARDE-GROS-AJOUT : ajouté chaque jour dès le jour 1, cartons C1 et C2 (DP-08)
    renvoi: int  # GARDE-RENVOI : retenue en plus de la garde au renvoi au vendeur
    gain_relais_jour: int  # RELAIS-GAIN-GARDE
    gain_relais_jour_gros: int  # RELAIS-GAIN-GARDE-GROS
    heure_rappel: time  # GARDE-RAPPEL-H : heure de S0, S1, S2 (et S3 quand il n'est pas « dernier jour »)
    non_vu_heures: int  # GARDE-NONVU-H : relance par le canal de repli sans accusé fort
    seuil_sms_eco: int  # SMS-ECO : sous ce montant de panier, S1 et S2 partent en push (CSM-14)
    dissociation_heures: int = 24  # MSG-DISSOC : retard d'un colis sur les autres avant de dissocier le groupe (DP-32)
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_garde(registre: dict[str, str]) -> ParametresGarde:
    grille = tuple(int(x) for x in _lire(registre, "GARDE-GRILLE", r"\d+(?:, \d+){6}").group(0).split(", "))
    # La grille lisible par le serveur doit dire la même chose que les paramètres écrits jour par jour.
    attendu = {
        "GARDE-J1": f"gratuit ({grille[0]} F)" if grille[0] == 0 else None,
        "GARDE-J2-3": f"{grille[1]} F par jour (jours 2 et 3)" if grille[1] == grille[2] else None,
        "GARDE-J4-5": f"{grille[3]} F le jour 4, {grille[4]} F le jour 5",
        "GARDE-J6-7": f"{grille[5]} F le jour 6, {_ecrire_milliers(grille[6])} F le jour 7",
    }
    for code, texte in attendu.items():
        if texte is None or _valeur(registre, code) != texte:
            raise ParametreIllisible(
                f"{code} : « {_valeur(registre, code)} » ne correspond pas à GARDE-GRILLE {grille}"
            )
    if _valeur(registre, "GARDE-FERME") != "jamais facturé":
        raise ParametreIllisible("GARDE-FERME : seul « jamais facturé » est pris en charge")
    if _valeur(registre, "GARDE-PRORATA") != "jour entier":
        raise ParametreIllisible("GARDE-PRORATA : seul « jour entier » est pris en charge (DP-29)")

    m = _lire(registre, "GARDE-RAPPEL-H", r"(\d{1,2}) h (\d{2})")
    return ParametresGarde(
        grille=grille,
        ajout_gros=_entier(_lire(registre, "GARDE-GROS-AJOUT", r"\d+").group(0)),
        renvoi=_entier(_lire(registre, "GARDE-RENVOI", _NOMBRE + r" F").group(1)),
        gain_relais_jour=_entier(_lire(registre, "RELAIS-GAIN-GARDE", _NOMBRE + r" F par jour facturé").group(1)),
        gain_relais_jour_gros=_entier(
            _lire(registre, "RELAIS-GAIN-GARDE-GROS", _NOMBRE + r" F par jour facturé \(cartons C1 et C2\)").group(1)
        ),
        heure_rappel=time(int(m.group(1)), int(m.group(2))),
        non_vu_heures=int(_lire(registre, "GARDE-NONVU-H", r"(\d+) h après l’arrivée").group(1)),
        seuil_sms_eco=_entier(_lire(registre, "SMS-ECO", _NOMBRE + r" F de panier").group(1)),
        dissociation_heures=int(
            _lire(registre, "MSG-DISSOC", r"(\d+) h de retard d'un colis sur les autres colis du groupe").group(1)
        ),
        version=_version(registre),
    )


def _ecrire_milliers(n: int) -> str:
    return f"{n:,}".replace(",", " ")


@dataclass(frozen=True)
class ParametresPaiement:
    """Comptoir, code de retrait, carte depuis l'étranger, transfert (CAL-13, CAL-18, CAL-25, CAL-26 ; DP-26, DP-37)."""

    comptoir_nouveau: int  # PAY-CPT-NOUV : jusqu'au premier retrait (CCO-04)
    comptoir_standard: int  # PAY-CPT-STD
    comptoir_fidele: int  # PAY-CPT-FID : après 5 commandes sans incident
    commandes_fidele: int  # « après 5 commandes sans incident »
    refus_avant_avance: int  # PAY-CPT-REFUS
    carte_max: int  # PAY-CARTE-MAX : par transaction, frais compris (CET-16)
    carte_frais_pour_cent: Decimal  # PAY-CARTE-FRAIS
    code_bio: int  # CODE-BIO
    code_renvois_24h: int  # CODE-RENVOI
    code_essais: int  # CODE-ESSAIS
    code_blocage_heures: int
    transfert: Mapping[str, int]  # TRANSFERT-RELAIS, par classe de colis (DP-37), non modifiable
    relais_ferme_transfert_heures: int = 24  # RELAIS-FERME-TRANSFERT-H (DP-42)
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_paiement(registre: dict[str, str]) -> ParametresPaiement:
    fid = _lire(registre, "PAY-CPT-FID", _NOMBRE + r" F")
    m_fid = re.search(r"après (\d+) commandes sans incident", _valeur_sens(registre, "PAY-CPT-FID"))
    if not m_fid:
        raise ParametreIllisible(
            "PAY-CPT-FID : nombre de commandes sans incident introuvable dans le sens du paramètre"
        )
    if _valeur(registre, "PAY-CARTE-ARRONDI") != "centime le plus proche":
        raise ParametreIllisible("PAY-CARTE-ARRONDI : seul « centime le plus proche » est pris en charge")
    m_essais = _lire(registre, "CODE-ESSAIS", r"(\d+) ⇒ blocage (\d+) h")
    m_transfert = _lire(registre, "TRANSFERT-RELAIS", _NOMBRE + r" F par colis S ou M, " + _NOMBRE + r" F par colis L")
    return ParametresPaiement(
        comptoir_nouveau=_entier(_lire(registre, "PAY-CPT-NOUV", _NOMBRE + r" F").group(1)),
        comptoir_standard=_entier(_lire(registre, "PAY-CPT-STD", _NOMBRE + r" F").group(1)),
        comptoir_fidele=_entier(fid.group(1)),
        commandes_fidele=int(m_fid.group(1)),
        refus_avant_avance=int(_lire(registre, "PAY-CPT-REFUS", r"\d+").group(0)),
        carte_max=_entier(_lire(registre, "PAY-CARTE-MAX", _NOMBRE + r" F").group(1)),
        carte_frais_pour_cent=Decimal(
            _lire(registre, "PAY-CARTE-FRAIS", r"(\d+(?:,\d+)?) %").group(1).replace(",", ".")
        ),
        code_bio=_entier(_lire(registre, "CODE-BIO", _NOMBRE + r" F").group(1)),
        code_renvois_24h=int(_lire(registre, "CODE-RENVOI", r"(\d+) par commande et par 24 h").group(1)),
        code_essais=int(m_essais.group(1)),
        code_blocage_heures=int(m_essais.group(2)),
        transfert=MappingProxyType(
            {
                "S": _entier(m_transfert.group(1)),
                "M": _entier(m_transfert.group(1)),
                "L": _entier(m_transfert.group(2)),
            }
        ),
        relais_ferme_transfert_heures=int(
            _lire(
                registre,
                "RELAIS-FERME-TRANSFERT-H",
                r"(\d+) h sans réponse du client : transfert automatique au relais ouvert le plus proche",
            ).group(1)
        ),
        version=_version(registre),
    )


def _valeur_sens(registre: dict[str, str], code: str) -> str:
    return _valeur(registre, code + SENS)


@dataclass(frozen=True)
class ParametresLitiges:
    auto_standard: int
    auto_eleve: int
    vendeur_heures: int
    decision_heures: int  # après l'échéance du vendeur
    recours_heures: int
    arrangement_jours: int
    fenetre_retour_jours: int
    defaut_cache_heures: int
    vice_cache_jours: int
    inspection_heures: int
    trajet_retour: int
    remplacement_heures_ouvrees: int
    lib_standard_jours: int
    lib_or_jours: int
    lib_carte_jours: int
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_litiges(registre: dict[str, str]) -> ParametresLitiges:
    if _valeur(registre, "RET-SANS-RETOUR") != "aucun : le client dépose toujours le colis au relais":
        raise ParametreIllisible("RET-SANS-RETOUR : seul « aucun » est pris en charge (DP-10)")
    m_rempl = _lire(registre, "RET-REMPL-DELAI", r"(\d+) h ouvrées, dimanche non compté")
    m_arr = _lire(registre, "LIT-ARRANG-REPONSE-J", r"(\d+) jours ; sans réponse, le dossier revient en examen")

    def heures(code: str, motif: str = r"(\d+) h") -> int:
        return int(_lire(registre, code, motif).group(1))

    def jours(code: str, motif: str) -> int:
        return int(_lire(registre, code, motif).group(1))

    return ParametresLitiges(
        auto_standard=_entier(_lire(registre, "LIT-AUTO-STD", r"jusqu’à " + _NOMBRE + r" F").group(1)),
        auto_eleve=_entier(_lire(registre, "LIT-AUTO-ELEVE", r"jusqu’à " + _NOMBRE + r" F").group(1)),
        vendeur_heures=heures("LIT-VENDEUR-H"),
        decision_heures=heures("LIT-DECISION-H", r"(\d+) h après l'échéance du vendeur"),
        recours_heures=heures("LIT-RECOURS-H", r"un recours, sous (\d+) h après la décision"),
        arrangement_jours=int(m_arr.group(1)),
        fenetre_retour_jours=jours("RET-FENETRE", r"(\d+) jours après le retrait"),
        defaut_cache_heures=heures("RET-DEFAUT-H", r"(\d+) h après le retrait"),
        vice_cache_jours=jours("RET-VICE", r"(\d+) jours après le retrait"),
        inspection_heures=heures("RET-INSPECT-H"),
        trajet_retour=_entier(
            _lire(registre, "RET-TRAJET", _NOMBRE + r" F, à la charge de la partie en tort").group(1)
        ),
        remplacement_heures_ouvrees=int(m_rempl.group(1)),
        lib_standard_jours=jours("LIB-STD", r"(\d+) j après fermeture du retour"),
        lib_or_jours=jours("LIB-OR", r"(\d+) j"),
        lib_carte_jours=jours("LIB-CARTE", r"(\d+) j"),
        version=_version(registre),
    )


@dataclass(frozen=True)
class ParametresAvis:
    """Notes et avis (CL-06, CL-13 ; CAL-30, CAL-31 ; DP-35)."""

    note_basse_max: int  # AVIS-BAS : une note de ce nombre d'étoiles ou moins propose un litige
    fenetre_jours: int  # AVIS-FENETRE : notation possible jusqu'à ce nombre de jours après le retrait
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_avis(registre: dict[str, str]) -> ParametresAvis:
    return ParametresAvis(
        note_basse_max=int(_lire(registre, "AVIS-BAS", r"(\d) étoiles ou moins").group(1)),
        fenetre_jours=int(_lire(registre, "AVIS-FENETRE", r"(\d+) jours après le retrait").group(1)),
        version=_version(registre),
    )


@dataclass(frozen=True)
class ParametresPortefeuille:
    """Portefeuille BelivaY (CWL-01 à CWL-12 ; DP-06, DP-16, DP-17), fermé par FF-WALLET au lancement."""

    plafond: int  # WALLET-PLAFOND
    recharge_min: int  # WALLET-RECHARGE-MIN
    retrait_min: int  # WALLET-RETRAIT-MIN
    retrait_jour: int  # WALLET-RETRAIT-JOUR
    retrait_heures: int  # WALLET-RETRAIT-H
    retraits_gratuits_par_mois: int  # WALLET-RETRAIT-GRATUIT
    retrait_frais_pour_cent: Decimal  # WALLET-RETRAIT-FRAIS, sur l'argent rechargé seulement
    retrait_frais_min: int
    recharge_attente_heures: int  # WALLET-RECHARGE-ATTENTE
    numero_attente_heures: int  # WALLET-NUMERO-ATTENTE
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_portefeuille(registre: dict[str, str]) -> ParametresPortefeuille:
    frais = _lire(
        registre,
        "WALLET-RETRAIT-FRAIS",
        r"(\d+(?:,\d+)?) %, "
        + _NOMBRE
        + r" F au moins, sur l'argent rechargé seulement \(jamais sur un remboursement\)",
    )
    return ParametresPortefeuille(
        plafond=_entier(_lire(registre, "WALLET-PLAFOND", _NOMBRE + r" F").group(1)),
        recharge_min=_entier(_lire(registre, "WALLET-RECHARGE-MIN", _NOMBRE + r" F").group(1)),
        retrait_min=_entier(_lire(registre, "WALLET-RETRAIT-MIN", _NOMBRE + r" F").group(1)),
        retrait_jour=_entier(_lire(registre, "WALLET-RETRAIT-JOUR", _NOMBRE + r" F").group(1)),
        retrait_heures=int(_lire(registre, "WALLET-RETRAIT-H", r"(\d+) h").group(1)),
        retraits_gratuits_par_mois=int(_lire(registre, "WALLET-RETRAIT-GRATUIT", r"(\d+) par mois civil").group(1)),
        retrait_frais_pour_cent=Decimal(frais.group(1).replace(",", ".")),
        retrait_frais_min=_entier(frais.group(2)),
        recharge_attente_heures=int(_lire(registre, "WALLET-RECHARGE-ATTENTE", r"(\d+) h").group(1)),
        numero_attente_heures=int(_lire(registre, "WALLET-NUMERO-ATTENTE", r"(\d+) h").group(1)),
        version=_version(registre),
    )


@dataclass(frozen=True)
class ParametresBascule:
    """Vendeur suivant en cas de rupture, de lenteur ou de refus (CCY-06, CPY-15, CPY-16, CAN-24, CAN-25 ; DP-01)."""

    trust_min: int  # REMPL-TRUST-MIN
    ecart_max_pour_cent: Decimal  # REMPL-ECART : prix livré au plus ce pourcentage au-dessus, écart payé par BelivaY
    tentatives: int  # RUPTURE-TENTATIVES (DP-01)
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_bascule(registre: dict[str, str]) -> ParametresBascule:
    return ParametresBascule(
        trust_min=int(_lire(registre, "REMPL-TRUST-MIN", r"\d+").group(0)),
        ecart_max_pour_cent=Decimal(
            _lire(registre, "REMPL-ECART", r"≤ (\d+(?:,\d+)?) %, payé par BelivaY").group(1).replace(",", ".")
        ),
        tentatives=int(_lire(registre, "RUPTURE-TENTATIVES", r"\d+").group(0)),
        version=_version(registre),
    )


@dataclass(frozen=True)
class Zone:
    code: str  # « Z1 »
    nom: str  # « Bastos »


@dataclass(frozen=True)
class ParametresGeo:
    """Zones, relais et fond de plan (ZONES-EXPLOITEES, RELAIS-PAR-ZONE, CARTE-FOND ; DP-09, DP-49)."""

    zones: tuple[Zone, ...]  # ZONES-EXPLOITEES
    relais_par_zone: int  # RELAIS-PAR-ZONE
    fond_de_plan: str  # CARTE-FOND : OpenStreetMap, attribution visible (DP-49)
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_geo(registre: dict[str, str]) -> ParametresGeo:
    m = _lire(registre, "ZONES-EXPLOITEES", r"Z\d+ [^,]+(?:, Z\d+ [^,]+)*")
    zones = tuple(Zone(*z.strip().split(" ", 1)) for z in m.group(0).split(","))
    if len({z.code for z in zones}) != len(zones):
        raise ParametreIllisible("ZONES-EXPLOITEES : une zone apparaît deux fois")
    fond = _lire(registre, "CARTE-FOND", r"OpenStreetMap \(attribution « © OpenStreetMap contributors » visible\)")
    return ParametresGeo(
        zones=zones,
        relais_par_zone=int(_lire(registre, "RELAIS-PAR-ZONE", r"[1-9]\d*").group(0)),
        fond_de_plan=fond.group(0),
        version=_version(registre),
    )
