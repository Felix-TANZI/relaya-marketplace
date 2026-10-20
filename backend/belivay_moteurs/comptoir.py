"""Paiement au comptoir et code de retrait (CL-07, CL-08, CL-09 ; CAL-13, CAL-18 ; CPN-33 à CPN-37,
CCP-01 à CCP-07, CCO-04 ; décisions DP-24, DP-26, DP-29).

- Éligibilité calculée par le serveur ; si le panier n'est pas éligible, le bouton est absent et une ligne
  discrète dit pourquoi, selon l'ordre de priorité de CPN-36.
- Plafond sur le sous-total S : 15 000 F jusqu'au premier retrait (CCO-04), puis 50 000 F, puis 100 000 F
  après 5 commandes sans incident.
- La livraison se paie d'avance ; le reste se règle en Mobile Money au retrait ; montant dû = garde + reste.
- Livraison offerte : l'avance est de 0 F, le client ne paie rien avant le retrait (DP-48).
- Deux refus au comptoir : paiement d'avance obligatoire, définitivement ; la livraison n'est pas remboursée.
- Refus au comptoir : la garde due est retenue sur la livraison payée d'avance, jamais au-delà ; le surplus
  n'est pas réclamé (DP-24).
- Code : biométrie dès CODE-BIO ; renvois payants limités par 24 h ; trois codes faux ⇒ blocage 24 h, le
  client demande un nouveau code dans l'application (DP-26).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .argent import ecrire
from .frais import Classe, FraisPanier, Mode, Panier
from .registre import ParametresPaiement


@dataclass(frozen=True)
class CompteClient:
    commandes_retirees: int
    commandes_sans_incident: int
    refus_au_comptoir: int  # refus sans motif d'une commande validée
    ifa_negatif: bool  # palier IFA négatif (jamais affiché au client)


class Motif(str, Enum):
    """Pourquoi le paiement au comptoir n'est pas proposé, dans l'ordre de priorité de CPN-36."""

    GROS_COLIS_DOMICILE = "gros colis livré à domicile"
    NOUVEAU_COMPTE = "panier au-delà du plafond d'un nouveau compte"
    PLAFOND_STANDARD = "panier au-delà du plafond"
    PLAFOND_FIDELE = "panier au-delà du plafond fidèle"
    VENDEUR = "un vendeur ne le propose pas"
    COMPTE = "pas disponible pour ce compte"  # IFA négatif ou refus : jamais la note ni le palier
    # Cas où le bouton n'a pas de sens : aucune ligne n'est prévue par la spécification.
    DOMICILE = "livraison à domicile"
    ETRANGER = "payeur à l'étranger"
    EXPRESS = "livraison express"


class PalierComptoir(str, Enum):
    NOUVEAU = "nouveau compte"  # jusqu'au premier retrait (CCO-04)
    STANDARD = "standard"
    FIDELE = "fidèle"  # après COMPTOIR-FIDELE-N commandes sans incident


@dataclass(frozen=True)
class Eligibilite:
    propose: bool
    motif: Motif | None
    ligne: str | None  # « Paiement au comptoir non proposé : … » (CPN-35, CPN-36) ; None : pas de ligne prévue
    plafond: int
    palier: PalierComptoir


def palier_comptoir(compte: CompteClient, p: ParametresPaiement) -> PalierComptoir:
    if compte.commandes_retirees == 0:
        return PalierComptoir.NOUVEAU
    if compte.commandes_sans_incident >= p.commandes_fidele:
        return PalierComptoir.FIDELE
    return PalierComptoir.STANDARD


def plafond(compte: CompteClient, p: ParametresPaiement) -> int:
    return {
        PalierComptoir.NOUVEAU: p.comptoir_nouveau,
        PalierComptoir.STANDARD: p.comptoir_standard,
        PalierComptoir.FIDELE: p.comptoir_fidele,
    }[palier_comptoir(compte, p)]


def eligibilite(
    panier: Panier,
    frais: FraisPanier,
    compte: CompteClient,
    p: ParametresPaiement,
    *,
    vendeur_refuse: bool = False,
    depuis_l_etranger: bool = False,
    express: bool = False,
) -> Eligibilite:
    """Éligibilité au paiement au comptoir (CAL-13, CPN-34 à CPN-36, CCP-02, CCP-03)."""
    pl, palier = plafond(compte, p), palier_comptoir(compte, p)

    def non(motif: Motif, texte: str | None) -> Eligibilite:
        ligne = f"Paiement au comptoir non proposé : {texte}" if texte else None
        return Eligibilite(False, motif, ligne, pl, palier)

    gros = any(sc.classe_colis in (Classe.XL, Classe.HG) for sc in panier.sous_commandes)
    if gros:
        return non(Motif.GROS_COLIS_DOMICILE, "gros colis livré à domicile.")
    if panier.mode is Mode.DOMICILE:
        return non(Motif.DOMICILE, None)
    if depuis_l_etranger:
        return non(Motif.ETRANGER, None)
    if express:
        return non(Motif.EXPRESS, None)
    s = frais.sous_total
    if s > pl:
        if palier is PalierComptoir.NOUVEAU:
            return non(Motif.NOUVEAU_COMPTE, f"panier au-delà de {ecrire(pl)} pour un nouveau compte.")
        if palier is PalierComptoir.STANDARD:
            return non(Motif.PLAFOND_STANDARD, f"panier au-delà de {ecrire(pl)}.")
        return non(Motif.PLAFOND_FIDELE, f"panier au-delà de {ecrire(pl)}.")
    if vendeur_refuse:
        return non(Motif.VENDEUR, "un vendeur de ce panier ne le propose pas.")
    if compte.ifa_negatif or compte.refus_au_comptoir >= p.refus_avant_avance:
        return non(Motif.COMPTE, "pas disponible pour ton compte.")
    return Eligibilite(True, None, None, pl, palier)


@dataclass(frozen=True)
class PartageComptoir:
    maintenant: int  # livraison payée d'avance (CCP-06)
    au_retrait: int  # « Montant dû au retrait », jamais « payé » (CCP-07)

    @property
    def sans_avance(self) -> bool:
        """Livraison offerte : rien à payer avant le retrait (DP-48)."""
        return self.maintenant == 0


def partage(frais: FraisPanier) -> PartageComptoir:
    """« 900 F de livraison maintenant, 18 500 F au retrait en Mobile Money. » (CPN-37)."""
    return PartageComptoir(frais.total - frais.sous_total, frais.sous_total)


def montant_du_au_retrait(reste_de_la_commande: int, garde: int) -> int:
    """Montant dû = garde + reste de la commande validée (CAL-13) : BLV-51940, 24 000 F + 0 F."""
    return reste_de_la_commande + garde


def apres_refus(compte: CompteClient, p: ParametresPaiement) -> tuple[CompteClient, bool]:
    """Un refus au comptoir sans motif : commande annulée, livraison non remboursée (CCP-06) ; renvoie le compte
    mis à jour et si le paiement d'avance devient obligatoire, définitivement (CCP-04)."""
    nouveau = CompteClient(
        compte.commandes_retirees, compte.commandes_sans_incident, compte.refus_au_comptoir + 1, compte.ifa_negatif
    )
    return nouveau, nouveau.refus_au_comptoir >= p.refus_avant_avance


@dataclass(frozen=True)
class RetenueApresRefus:
    retenue: int  # garde retenue sur la livraison payée d'avance
    rendu: int  # reste de l'avance rendu au client (0 : CCP-06, la livraison n'est pas remboursée)
    non_reclame: int  # garde au-delà de l'avance, jamais réclamée au client


def retenue_apres_refus(avance_payee: int, garde_due: int) -> RetenueApresRefus:
    """Refus au comptoir (DP-24) : la garde due est retenue sur la livraison payée d'avance, sans la dépasser ;
    la livraison n'est pas remboursée (CCP-06). Le trajet de renvoi au
    vendeur n'est pas ajouté à la retenue d'un refus (DP-48)."""
    if avance_payee < 0 or garde_due < 0:
        raise ValueError("avance et garde sont des montants positifs ou nuls")
    retenue = min(garde_due, avance_payee)
    return RetenueApresRefus(retenue, 0, garde_due - retenue)


# ── Code de retrait (CAL-18, DP-26) ─────────────────────────────────────────────────────────────────────


def biometrie_requise(montant_commande: int, p: ParametresPaiement) -> bool:
    """Empreinte ou visage avant d'afficher le code dès CODE-BIO (BLV-52107, 196 780 F) ; au-dessous, au toucher."""
    return montant_commande >= p.code_bio


def renvoi_possible(renvois_dernieres_24h: int, p: ParametresPaiement) -> bool:
    return renvois_dernieres_24h < p.code_renvois_24h


@dataclass(frozen=True)
class EssaiCode:
    bloque: bool
    essais_restants: int
    blocage_heures: int  # 0 s'il n'y a pas de blocage
    nouveau_code_sur_demande: bool  # DP-26 : après le blocage, le client le demande dans l'application


def code_faux(codes_faux_avant: int, p: ParametresPaiement) -> EssaiCode:
    """Un code faux de plus au comptoir : au 3e, blocage 24 h et alerte au client (CAL-18, DP-26)."""
    faux = codes_faux_avant + 1
    if faux >= p.code_essais:
        return EssaiCode(True, 0, p.code_blocage_heures, True)
    return EssaiCode(False, p.code_essais - faux, 0, False)
