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
    # Libération et versement du vendeur : une seule source (versements.py, VD-LIB-*, VD-VER-*), audit V3.
    versements: ParametresVersements
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
        versements=_versements_concordants(registre),
        version=_version(registre),
    )


def _versements_concordants(registre: dict[str, str]) -> ParametresVersements:
    """La libération du vendeur est une seule règle écrite sous deux codes (client : RET-FENETRE, LIB-STD, LIB-OR,
    LIB-CARTE ; vendeur : VD-RET-FENETRE, VD-LIB-*) : les valeurs doivent concorder, sinon on s'arrête (audit V3)."""
    v = lire_versements(registre)
    client = (
        int(_lire(registre, "RET-FENETRE", r"(\d+) jours après le retrait").group(1)),
        int(_lire(registre, "LIB-STD", r"(\d+) j après fermeture du retour").group(1)),
        int(_lire(registre, "LIB-OR", r"(\d+) j").group(1)),
        int(_lire(registre, "LIB-CARTE", r"(\d+) j").group(1)),
    )
    if client != (v.fenetre_retour_jours, v.lib_standard_jours, v.lib_or_jours, v.lib_carte_jours):
        raise ParametreIllisible(
            "RET-FENETRE, LIB-STD, LIB-OR, LIB-CARTE et VD-RET-FENETRE, VD-LIB-* : une seule règle de libération, "
            "les valeurs doivent concorder (audit V3)"
        )
    return v


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


# ── Espace vendeur (DP-55, DP-56 ; paquet « Espace vendeur » du 1er octobre) ───────────────────────────


def _taux(texte: str) -> Decimal:
    """« 13,5 » → Decimal("13.5") : écriture française d'un taux, sans passer par un float."""
    return Decimal(texte.replace(",", "."))


@dataclass(frozen=True)
class Tranche:
    """Part du prix unitaire jusqu'à `borne` comprise (None : au-delà de la dernière borne), au taux Bronze."""

    borne: int | None
    taux_pour_cent: Decimal


@dataclass(frozen=True)
class Plan:
    prix_mensuel: int  # VD-PLAN-BOOST, VD-PLAN-PRO
    remise_pour_cent: Decimal  # part de la commission du mois rendue au vendeur (Q-04)


_JOURS = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")


@dataclass(frozen=True)
class ParametresCommission:
    """Commission du vendeur (VD-02 p5-6, familles M01 ; DP-55 : Q-01 à Q-09)."""

    bareme: Mapping[str, tuple[Tranche, ...]]  # VD-BAREME-A … E, tranches sans taux déjà complétées (Q-06)
    familles: Mapping[str, str]  # catégorie → famille (« Électronique » → « A »)
    multiplicateurs: Mapping[str, Decimal]  # VD-COM-PALIER : « Argent » → 0,85
    points_petit_prix: Decimal  # VD-COM-POINTS : +3 points…
    seuil_petit_prix: int  # … si le prix unitaire est sous 5 000 F (strictement)
    points_made_in_cameroon: Decimal  # VD-COM-POINTS : −2 points
    decouverte_mult: Decimal  # VD-DECOUV-MULT
    decouverte_mois: int  # VD-DECOUV-DUREE
    decouverte_commandes: int
    plancher_commande: int  # VD-COM-MIN
    plancher_taux_pour_cent: Decimal  # VD-COM-MIN-TAUX
    # VD-COM-M05 et VD-COM-M06 : lus « en attente » seulement (Q-02) ; emplacements dans commission.py.
    tva_pour_cent: Decimal  # VD-TVA
    prix_min: int  # VD-PRIX-MIN
    plans: Mapping[str, Plan]  # « Boost », « Pro » ; Free : aucune remise
    annuel_mois_payes: int  # VD-PLAN-ANNUEL : 10 mois payés pour 12 ; plafond mensuel = prix annuel ÷ 12 (A-3)
    essai_mois: int  # VD-PLAN-ESSAI : 1 mois offert (A-2)
    essai_rappel_jours: int  # rappel 3 jours avant la fin de l'essai
    grace_jours: int  # VD-PLAN-GRACE : 7 jours après un paiement échoué, puis Free (PLN-02)
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def _lire_bareme(registre: dict[str, str], famille: str) -> tuple[tuple[str, ...], tuple[Tranche, ...]]:
    code = f"VD-BAREME-{famille}"
    m = _lire(registre, code, r"([^:]+) : (.+)")
    categories = tuple(c.strip() for c in m.group(1).split(", "))
    tranches: list[Tranche] = []
    morceaux = m.group(2).split(" · ")
    for i, morceau in enumerate(morceaux):
        t = re.fullmatch(r"(?:(\d+(?:,\d+)?) %|sans taux) (?:jusqu’à " + _NOMBRE + r" F|au-delà)", morceau)
        if not t:
            raise ParametreIllisible(f"{code} : tranche « {morceau} » illisible")
        dernier = i == len(morceaux) - 1
        borne = None if t.group(2) is None else _entier(t.group(2))
        if (borne is None) != dernier:
            raise ParametreIllisible(f"{code} : seule la dernière tranche va « au-delà »")
        if borne is not None and tranches and borne <= (tranches[-1].borne or 0):
            raise ParametreIllisible(f"{code} : les bornes doivent croître")
        if t.group(1) is not None:
            taux = _taux(t.group(1))
        elif tranches:
            taux = tranches[-1].taux_pour_cent  # Q-06 (DP-55) : le taux de la tranche précédente continue
        else:
            raise ParametreIllisible(f"{code} : la première tranche doit avoir un taux")
        tranches.append(Tranche(borne, taux))
    return categories, tuple(tranches)


def _en_attente(registre: dict[str, str], code: str, document: str) -> None:
    """M05 et M06 : seule la valeur « en attente » est prise en charge ; une valeur fournie demande d'abord le
    code de sa règle (on s'arrête plutôt que d'ignorer une règle d'argent)."""
    if _valeur(registre, code) != f"en attente de {document}":
        raise ParametreIllisible(f"{code} : règle {document} fournie, à coder dans commission.py avant de la lire")


def lire_commission(registre: dict[str, str]) -> ParametresCommission:
    if _valeur(registre, "VD-COM-MODELE") != (
        "VD-02, familles M01 : barème, puis palier, puis découverte ; un seul arrondi au franc, moitié vers le haut,"
        " à la fin"
    ):
        raise ParametreIllisible("VD-COM-MODELE : seul le modèle VD-02 (DP-55) est pris en charge")
    if _valeur(registre, "VD-BAREME-SANS-TAUX") != "taux de la tranche précédente":
        raise ParametreIllisible("VD-BAREME-SANS-TAUX : seule « taux de la tranche précédente » est prise en charge")
    bareme: dict[str, tuple[Tranche, ...]] = {}
    familles: dict[str, str] = {}
    for f in "ABCDE":
        categories, tranches = _lire_bareme(registre, f)
        bareme[f] = tranches
        for c in categories:
            if c in familles:
                raise ParametreIllisible(f"VD-BAREME-{f} : catégorie « {c} » déjà dans la famille {familles[c]}")
            familles[c] = f

    m = _lire(
        registre,
        "VD-COM-PALIER",
        r"Bronze × (\d+(?:,\d+)?) · Argent × (\d+(?:,\d+)?) · Or × (\d+(?:,\d+)?) · Platine × (\d+(?:,\d+)?)",
    )
    multiplicateurs = dict(zip(("Bronze", "Argent", "Or", "Platine"), (_taux(x) for x in m.groups()), strict=True))
    if any(not 0 < v <= 1 for v in multiplicateurs.values()):
        raise ParametreIllisible("VD-COM-PALIER : un multiplicateur doit être compris entre 0 (exclu) et 1")

    m_pts = _lire(
        registre,
        "VD-COM-POINTS",
        r"\+(\d+(?:,\d+)?) points si le prix unitaire est sous "
        + _NOMBRE
        + r" F · −(\d+(?:,\d+)?) points si Made in Cameroon",
    )
    m_dec = _lire(registre, "VD-DECOUV-MULT", r"× (\d+(?:,\d+)?) sur la commission")
    decouverte_mult = _taux(m_dec.group(1))
    if not 0 < decouverte_mult <= 1:
        raise ParametreIllisible("VD-DECOUV-MULT : une réduction doit être comprise entre 0 (exclu) et 1")
    m_duree = _lire(
        registre,
        "VD-DECOUV-DUREE",
        r"(\d+) mois ou (\d+) commandes encaissées et non remboursées en totalité, la première limite atteinte",
    )
    m_tva = _lire(registre, "VD-TVA", r"(\d+(?:,\d+)?) % de la commission ; nouveau taux annoncé 30 jours avant")
    _en_attente(registre, "VD-COM-M05", "M05")
    _en_attente(registre, "VD-COM-M06", "M06")

    plans = {}
    for nom in ("Boost", "Pro"):
        mp = _lire(
            registre,
            f"VD-PLAN-{nom.upper()}",
            _NOMBRE + r" F par mois ; remise de (\d+(?:,\d+)?) % de la commission du mois",
        )
        plans[nom] = Plan(_entier(mp.group(1)), _taux(mp.group(2)))
    if _valeur(registre, "VD-PLAN-REMISE-PLAFOND") != "prix du plan, et jamais sous les commissions minimales":
        raise ParametreIllisible("VD-PLAN-REMISE-PLAFOND : seul le plafond de DP-55 est pris en charge")
    m_an = _lire(
        registre, "VD-PLAN-ANNUEL", r"(\d+) mois payés pour 12 ; remise plafonnée chaque mois au prix annuel ÷ 12"
    )
    m_essai = _lire(
        registre,
        "VD-PLAN-ESSAI",
        r"(\d+) mois offerts? ; rappel (\d+) jours avant la fin ; sans premier paiement confirmé, retour à Free sans "
        r"rien perdre",
    )
    m_grace = _lire(
        registre, "VD-PLAN-GRACE", r"(\d+) jours après un paiement échoué, puis retour à Free sans rien perdre"
    )
    if _valeur(registre, "VD-PLAN-TVA") != (
        "au taux de VD-TVA, en plus du prix du plan ; la remise rend aussi la TVA de sa part de commission"
    ):
        raise ParametreIllisible("VD-PLAN-TVA : seule la TVA en plus du prix du plan (audit C5) est prise en charge")

    return ParametresCommission(
        bareme=MappingProxyType(bareme),
        familles=MappingProxyType(familles),
        multiplicateurs=MappingProxyType(multiplicateurs),
        points_petit_prix=_taux(m_pts.group(1)),
        seuil_petit_prix=_entier(m_pts.group(2)),
        points_made_in_cameroon=_taux(m_pts.group(3)),
        decouverte_mult=decouverte_mult,
        decouverte_mois=int(m_duree.group(1)),
        decouverte_commandes=int(m_duree.group(2)),
        plancher_commande=_entier(_lire(registre, "VD-COM-MIN", _NOMBRE + r" F par sous-commande").group(1)),
        plancher_taux_pour_cent=_taux(
            _lire(registre, "VD-COM-MIN-TAUX", r"(\d+(?:,\d+)?) % du prix des articles").group(1)
        ),
        tva_pour_cent=_taux(m_tva.group(1)),
        prix_min=_entier(
            _lire(
                registre,
                "VD-PRIX-MIN",
                _NOMBRE + r" F ; publication refusée si le vendeur garderait moins de 0 F",
            ).group(1)
        ),
        plans=MappingProxyType(plans),
        annuel_mois_payes=int(m_an.group(1)),
        essai_mois=int(m_essai.group(1)),
        essai_rappel_jours=int(m_essai.group(2)),
        grace_jours=int(m_grace.group(1)),
        version=_version(registre),
    )


@dataclass(frozen=True)
class ParametresVersements:
    """Libération et versements du vendeur (VD-02 p7, VD-09 ; DP-55 : Q-11 à Q-13, Q-15 ; Q-58 à Q-60, Q-65)."""

    fenetre_retour_jours: int  # VD-RET-FENETRE
    lib_standard_jours: int  # VD-LIB-BRONZE-ARGENT
    lib_or_jours: int  # VD-LIB-OR-PLATINE
    lib_carte_jours: int  # VD-LIB-CARTE
    jour_versement: int  # VD-VER-JOUR : 4 = vendredi
    heure_versement: time  # « avant 12 h »
    jour_arrete: int  # VD-VER-ARRETE : 3 = jeudi
    heure_arrete: time  # 23 h 59, à l'heure de Yaoundé
    essais: int  # VD-VER-ESSAIS
    intervalle_essais_heures: int
    revue_numero_jours: int  # VD-NUM-REVUE
    reprise_demande_jours: int  # VD-REPRISE
    recouvrement_jours: int  # VD-REPRISE-IMPAYEE : recouvrement légal proposé 90 jours après la reprise (A-8)
    gel_motif_heures: int  # VD-GEL-ANTIFRAUDE : motif écrit sous 48 h (GEL-02, Q-64)
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_versements(registre: dict[str, str]) -> ParametresVersements:
    m_ver = _lire(registre, "VD-VER-JOUR", r"(\w+), avant (\d{1,2}) h, sans frais ni minimum")
    m_arr = _lire(registre, "VD-VER-ARRETE", r"(\w+) (\d{1,2}) h (\d{2})")
    for m in (m_ver, m_arr):
        if m.group(1) not in _JOURS:
            raise ParametreIllisible(f"jour inconnu : « {m.group(1)} »")
    if (_JOURS.index(m_ver.group(1)) - _JOURS.index(m_arr.group(1))) % 7 != 1:
        raise ParametreIllisible("VD-VER-ARRETE : l'arrêté est la veille du jour de versement")
    if _valeur(registre, "VD-VER-FERIE") != "versement maintenu":
        raise ParametreIllisible("VD-VER-FERIE : seul « versement maintenu » est pris en charge (Q-13)")
    m_ess = _lire(registre, "VD-VER-ESSAIS", r"(\d+) essais à (\d+) h d’intervalle, puis versements suspendus")

    def jours_apres_fermeture(code: str) -> int:
        return int(_lire(registre, code, r"(\d+) jours? après la fermeture du retour").group(1))

    return ParametresVersements(
        fenetre_retour_jours=int(
            _lire(
                registre, "VD-RET-FENETRE", r"(\d+) jours après le retrait, ou plus tôt sur « Tout est en ordre »"
            ).group(1)
        ),
        lib_standard_jours=jours_apres_fermeture("VD-LIB-BRONZE-ARGENT"),
        lib_or_jours=jours_apres_fermeture("VD-LIB-OR-PLATINE"),
        lib_carte_jours=jours_apres_fermeture("VD-LIB-CARTE"),
        jour_versement=_JOURS.index(m_ver.group(1)),
        heure_versement=time(int(m_ver.group(2))),
        jour_arrete=_JOURS.index(m_arr.group(1)),
        heure_arrete=time(int(m_arr.group(2)), int(m_arr.group(3))),
        essais=int(m_ess.group(1)),
        intervalle_essais_heures=int(m_ess.group(2)),
        revue_numero_jours=int(_lire(registre, "VD-NUM-REVUE", r"(\d+) jours, versements reportés").group(1)),
        reprise_demande_jours=int(
            _lire(
                registre,
                "VD-REPRISE",
                r"déduite des versements suivants ; le reste est reporté ; demande Mobile Money après (\d+) jours",
            ).group(1)
        ),
        recouvrement_jours=int(
            _lire(
                registre,
                "VD-REPRISE-IMPAYEE",
                r"ventes bloquées dès la demande Mobile Money jusqu'au règlement, avec relances ; recouvrement légal "
                r"proposé (\d+) jours après la reprise, décidé par une personne, contestable une fois",
            ).group(1)
        ),
        gel_motif_heures=int(
            _lire(registre, "VD-GEL-ANTIFRAUDE", r"motif écrit sous (\d+) h ; sans échéance").group(1)
        ),
        version=_version(registre),
    )


@dataclass(frozen=True)
class ConditionsPalier:
    """PAL-01 : Trust Score minimal, commandes livrées et non remboursées, note moyenne, visite, audit."""

    trust_score: int
    commandes_livrees: int = 0
    note: Decimal = Decimal(0)
    visite: bool = False
    audit: bool = False


@dataclass(frozen=True)
class ParametresPaliers:
    """Paliers du vendeur (PAL-01, C4, TRU-07, ACC-15 ; DP-21 ; DP-55 : Q-10) et plafond de démarrage (Q-14)."""

    conditions: Mapping[str, ConditionsPalier]  # « Argent », « Or », « Platine » (Bronze : KYC validé)
    montee_jours: int  # VD-PAL-MONTEE
    descente_jours: int  # VD-PAL-DESCENTE (DP-21)
    lancement_mois: int  # VD-PAL-LANCEMENT
    lancement_produits: Mapping[str, int]  # « Argent » → 15 produits actifs
    plafond_demarrage: int  # VD-PLAFOND-DEMARRAGE
    demarrage_commandes: int  # « jusqu'à 10 commandes livrées sans incident »
    alerte_ecart_points: int  # VD-ALERTE-SEUIL : à 3 points ou moins d'un seuil (ACC-25 ; DP-57 A-5)
    alerte_frequence_jours: int  # une fois par seuil et par semaine (SAN-02)
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_paliers(registre: dict[str, str]) -> ParametresPaliers:
    conditions = {}
    for nom, code in (("Argent", "VD-PAL-ARGENT"), ("Or", "VD-PAL-OR"), ("Platine", "VD-PAL-PLATINE")):
        morceaux = _valeur(registre, code).split(" ; ")
        m = re.fullmatch(r"Trust Score (\d+)", morceaux[0])
        if not m:
            raise ParametreIllisible(f"{code} : le Trust Score doit venir en premier")
        champs: dict[str, object] = {"trust_score": int(m.group(1))}
        for morceau in morceaux[1:]:
            if mc := re.fullmatch(r"(\d+) commandes livrées", morceau):
                champs["commandes_livrees"] = int(mc.group(1))
            elif mn := re.fullmatch(r"note (\d,\d)", morceau):
                champs["note"] = _taux(mn.group(1))
            elif morceau == "visite physique":
                champs["visite"] = True
            elif morceau == "audit trimestriel":
                champs["audit"] = True
            else:
                raise ParametreIllisible(f"{code} : condition « {morceau} » inconnue")
        conditions[nom] = ConditionsPalier(**champs)
    seuils = [c.trust_score for c in conditions.values()]
    if seuils != sorted(set(seuils)):
        raise ParametreIllisible("VD-PAL-ARGENT, OR, PLATINE : les seuils de Trust Score doivent croître")

    m_lanc = _lire(
        registre,
        "VD-PAL-LANCEMENT",
        r"(\d+) mois après la signature : Argent dès (\d+) produits actifs, Or dès (\d+), Platine dès (\d+)",
    )
    m_dem = _lire(
        registre,
        "VD-PLAFOND-DEMARRAGE",
        _NOMBRE + r" F par sous-commande, jusqu’à (\d+) commandes livrées sans incident",
    )
    return ParametresPaliers(
        conditions=MappingProxyType(conditions),
        montee_jours=int(_lire(registre, "VD-PAL-MONTEE", r"conditions tenues (\d+) jours de suite").group(1)),
        descente_jours=int(
            _lire(registre, "VD-PAL-DESCENTE", r"Trust Score sous le seuil du palier (\d+) jours de suite").group(1)
        ),
        lancement_mois=int(m_lanc.group(1)),
        lancement_produits=MappingProxyType(
            {"Argent": int(m_lanc.group(2)), "Or": int(m_lanc.group(3)), "Platine": int(m_lanc.group(4))}
        ),
        plafond_demarrage=_entier(m_dem.group(1)),
        demarrage_commandes=int(m_dem.group(2)),
        alerte_ecart_points=int(
            _lire(
                registre,
                "VD-ALERTE-SEUIL",
                r"à (\d+) points ou moins d'un seuil \(montée : seuil du palier suivant ; descente : seuil du palier\) ;"
                r" une fois par seuil et par semaine",
            ).group(1)
        ),
        alerte_frequence_jours=7,  # « par semaine » (SAN-02)
        version=_version(registre),
    )


@dataclass(frozen=True)
class ParametresSanctions:
    """Sanctions et contrôle au ramassage du vendeur (SAN-01 à SAN-06, CTRL-RAMASSAGE ; DP-56 : Q-31 ; DP-57 : L-1).
    Les durées sont des valeurs de départ réglables en console (L-1)."""

    visibilite_jours: int  # VD-SAN-VISIBILITE : niveau 2, visibilité réduite
    suspension_sous_score: int  # VD-SAN-SUSPENSION : proposée sous 40
    non_preparations: int  # … ou après 3 non-préparations…
    non_preparations_jours: int  # … en 30 jours glissants
    suspension_max_jours: int  # jusqu'à la décision humaine, 30 jours au plus
    probatoire_commandes: int  # VD-PROBATOIRE : 20 commandes contrôlées à 100 %
    renforce_sous_score: int  # VD-CTRL-RENFORCE : 100 % sous 60…
    renforce_baisse_points: int  # … ou après une baisse de 8 points en une semaine
    controle_premieres: int  # CTRL-RAMASSAGE : 100 % des 5 premières commandes
    controle_sous_seuil: int  # puis 1 sur 20…
    controle_seuil_score: int  # … sous un Trust Score de 70
    controle_ensuite: int  # puis 1 sur 100
    version: str = "non versionné"  # empreinte du registre (CCH-15)


def lire_sanctions(registre: dict[str, str]) -> ParametresSanctions:
    m_sus = _lire(
        registre,
        "VD-SAN-SUSPENSION",
        r"proposée sous un Trust Score de (\d+) ou après (\d+) non-préparations en (\d+) jours glissants ; jusqu'à la "
        r"décision humaine, (\d+) jours au plus",
    )
    m_ren = _lire(
        registre,
        "VD-CTRL-RENFORCE",
        r"100 % au ramassage si le Trust Score passe sous (\d+) ou perd (\d+) points en une semaine",
    )
    m_ctrl = _lire(
        registre,
        "CTRL-RAMASSAGE",
        r"100 % des (\d+) premières commandes, puis 1 sur (\d+) sous un Trust Score de (\d+), puis 1 sur (\d+)",
    )
    return ParametresSanctions(
        visibilite_jours=int(_lire(registre, "VD-SAN-VISIBILITE", r"(\d+) jours").group(1)),
        suspension_sous_score=int(m_sus.group(1)),
        non_preparations=int(m_sus.group(2)),
        non_preparations_jours=int(m_sus.group(3)),
        suspension_max_jours=int(m_sus.group(4)),
        probatoire_commandes=int(
            _lire(
                registre, "VD-PROBATOIRE", r"(\d+) commandes contrôlées à 100 % au ramassage après une suspension"
            ).group(1)
        ),
        renforce_sous_score=int(m_ren.group(1)),
        renforce_baisse_points=int(m_ren.group(2)),
        controle_premieres=int(m_ctrl.group(1)),
        controle_sous_seuil=int(m_ctrl.group(2)),
        controle_seuil_score=int(m_ctrl.group(3)),
        controle_ensuite=int(m_ctrl.group(4)),
        version=_version(registre),
    )


@dataclass(frozen=True)
class Emplacements:
    """Emplacements de l'accueil vendus à la semaine (VD-PUB-A-LA-UNE, VD-PUB-CARROUSEL)."""

    places: int
    tarif_semaine: int  # tarif fixe
    enchere_min: int  # plancher de l'enchère hebdomadaire


@dataclass(frozen=True)
class ParametresPublicite:
    """Revenus publicitaires (DP-59) : produits sponsorisés, À la une et carrousel, vente flash, Boost, solde."""

    trust_min: int  # VD-PUB-ELIGIBILITE (stock > 0 et aucun litige en cours : règles fixes)
    clic_plancher: int  # VD-PUB-CLIC
    pas_enchere: int  # second prix + 1 F
    budget_min: int  # VD-PUB-BUDGET
    part_max_pour_cent: Decimal  # VD-PUB-DENSITE
    max_par_fenetre: int
    fenetre: int
    a_la_une: Emplacements
    carrousel: Emplacements
    flash_points: Decimal  # VD-PUB-FLASH-MAJORATION
    flash_remise_min_pour_cent: Decimal  # FLASH-REMISE-MIN
    boost_24h: int  # VD-PUB-BOOST
    boost_7j: int
    boost_plafond: Decimal
    recharge_min: int  # VD-PUB-SOLDE
    version: str = "non versionné"


def _emplacements(registre: dict[str, str], code: str) -> Emplacements:
    m = _lire(
        registre,
        code,
        r"(\d+) places par semaine ; " + _NOMBRE + r" F la semaine, ou enchère hebdomadaire dès " + _NOMBRE + r" F",
    )
    return Emplacements(int(m.group(1)), _entier(m.group(2)), _entier(m.group(3)))


def lire_publicite(registre: dict[str, str]) -> ParametresPublicite:
    m_el = _lire(
        registre,
        "VD-PUB-ELIGIBILITE",
        r"stock supérieur à 0 ; Trust Score de (\d+) au moins ; aucun litige en cours",
    )
    m_clic = _lire(
        registre,
        "VD-PUB-CLIC",
        r"prix plancher " + _NOMBRE + r" F le clic ; coût = second prix \+ (\d+) F, jamais au-dessus de l'enchère ; "
        r"un clic facturé une fois par client et par jour",
    )
    m_bud = _lire(
        registre,
        "VD-PUB-BUDGET",
        _NOMBRE + r" F par jour au moins ; diffusion arrêtée quand le budget du jour ou le solde est atteint",
    )
    m_den = _lire(
        registre,
        "VD-PUB-DENSITE",
        r"(\d+(?:,\d+)?) % des positions au plus ; (\d+) annonces au plus sur (\d+) résultats ; jamais au-dessus "
        r"d'une offre moins chère et mieux notée du même produit",
    )
    m_fl = _lire(registre, "VD-PUB-FLASH-MAJORATION", r"(\d+(?:,\d+)?) points de commission pendant la vente flash")
    m_rem = _lire(registre, "FLASH-REMISE-MIN", r"(\d+(?:,\d+)?) %")
    m_bo = _lire(
        registre,
        "VD-PUB-BOOST",
        r"24 h : " + _NOMBRE + r" F · 7 jours : " + _NOMBRE + r" F ; classement × (\d+(?:,\d+)?) au plus",
    )
    m_so = _lire(
        registre,
        "VD-PUB-SOLDE",
        r"recharge Mobile Money de " + _NOMBRE + r" F au moins ; heures non diffusées remboursées au solde ; "
        r"jamais retenu sur les versements sans accord",
    )
    plafond = _taux(m_bo.group(3))
    if plafond < 1:
        raise ParametreIllisible("VD-PUB-BOOST : le multiplicateur doit valoir 1 au moins")
    max_fen, fen = int(m_den.group(2)), int(m_den.group(3))
    if not 0 < max_fen <= fen:
        raise ParametreIllisible("VD-PUB-DENSITE : annonces au plus entre 1 et la taille de la fenêtre")
    return ParametresPublicite(
        trust_min=int(m_el.group(1)),
        clic_plancher=_entier(m_clic.group(1)),
        pas_enchere=int(m_clic.group(2)),
        budget_min=_entier(m_bud.group(1)),
        part_max_pour_cent=_taux(m_den.group(1)),
        max_par_fenetre=max_fen,
        fenetre=fen,
        a_la_une=_emplacements(registre, "VD-PUB-A-LA-UNE"),
        carrousel=_emplacements(registre, "VD-PUB-CARROUSEL"),
        flash_points=_taux(m_fl.group(1)),
        flash_remise_min_pour_cent=_taux(m_rem.group(1)),
        boost_24h=_entier(m_bo.group(1)),
        boost_7j=_entier(m_bo.group(2)),
        boost_plafond=plafond,
        recharge_min=_entier(m_so.group(1)),
        version=_version(registre),
    )
