# backend/apps/wishlists/regles.py
# Règle commune des échanges entre clients (DP-54 ; consigne du porteur du 4 oct. : « la règle BelivaY ne perd
# jamais »), portée en Python pur depuis site/src/donnees/echanges.ts. Sans Django : testée seule
# (tests/test_regles.py, exemples du site et de site/tests/echanges.spec.ts).
#
# Rôles : le PAYEUR règle les articles ; le DESTINATAIRE reçoit le colis ; les frais de livraison sont payés par
# l'un OU l'autre, au choix fixé avant le paiement.
# 1. Articles toujours payés et bloqués avant l'envoi au vendeur.
# 2. Frais payés par le payeur : encaissés avec les articles.
# 3. Frais payés par le destinataire : encaissés à la remise ; le payeur donne sa garantie (frais + garde + renvoi
#    retenus sur le remboursement des articles si le destinataire refuse ou ne vient pas ; jamais plus que le payé).
# 4. « Destinataire paie » seulement si la valeur des articles couvre le pire cas (frais + garde maximale + renvoi).
# 5. Un compte diaspora paie toujours tout ; son proche ne paie que le supplément domicile qu'il a lui-même demandé,
#    si la garantie le couvre.
# 6. Le destinataire peut refuser sans frais tant que le vendeur n'a pas expédié.
#
# La grille de garde, l'ajout « gros colis » et le renvoi viennent du registre (GARDE-GRILLE, GARDE-GROS-AJOUT,
# GARDE-RENVOI) : chaque fonction reçoit `g`, un objet qui porte `grille`, `ajout_gros` et `renvoi`
# (belivay_moteurs.registre.ParametresGarde, lu par apps.client_core.parametres.garde()).

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from belivay_moteurs.argent import pourcentage_de

PAYEUR = "payeur"
DESTINATAIRE = "destinataire"


class Garde(Protocol):
    grille: tuple[int, ...]
    ajout_gros: int
    renvoi: int


@dataclass(frozen=True)
class Decision:
    ok: bool
    raison: str | None = None


def garde_max(g: Garde) -> int:
    return sum(g.grille)


def pire_cas(frais: int, g: Garde, gros: bool = False) -> int:
    """Ce qu'il faut couvrir si le destinataire ne paie pas : frais + garde complète + renvoi au vendeur."""
    return frais + garde_max(g) + (g.ajout_gros * len(g.grille) if gros else 0) + g.renvoi


def destinataire_peut_payer(*, articles: int, frais: int, g: Garde, gros: bool = False, payeur_diaspora: bool = False) -> Decision:
    """« Le destinataire paie la livraison » est-il permis pour ce colis ? (règle 4)"""
    if payeur_diaspora:
        return Decision(False, "diaspora")
    if frais <= 0:
        return Decision(False, "offert")
    if articles < pire_cas(frais, g, gros):
        return Decision(False, "garantie")
    return Decision(True)


def repartition(*, articles: int, frais: int, qui: str, g: Garde) -> dict:
    """Ce que chacun paie, et quand : {payeurMaintenant, destinataireALaRemise, garantie}."""
    return {
        "payeurMaintenant": articles + (frais if qui == PAYEUR else 0),
        "destinataireALaRemise": frais if qui == DESTINATAIRE else 0,
        "garantie": min(pire_cas(frais, g), articles) if qui == DESTINATAIRE else 0,
    }


def retenue_refus(*, articles: int, frais: int, qui: str, jours_garde: int, g: Garde) -> int:
    """Retenue si le destinataire refuse ou ne retire pas (jamais plus que le payé)."""
    garde = sum(g.grille[: max(0, jours_garde)])
    du = (frais if qui == DESTINATAIRE else 0) + garde + g.renvoi
    return min(du, articles + (frais if qui == PAYEUR else 0))


def refus_colis(*, articles: int, frais: int, qui: str, expedie: bool, jours_garde: int, g: Garde) -> dict:
    """Refus par le destinataire (règle 6) : sans frais avant l'expédition (payeur remboursé en entier) ; ensuite,
    retenue sur le remboursement des articles ; des frais payés par le payeur ont servi au transport."""
    if not expedie:
        return {"retenue": 0, "rembourse": articles + (frais if qui == PAYEUR else 0)}
    retenue = min(retenue_refus(articles=articles, frais=frais, qui=qui, jours_garde=jours_garde, g=g), articles)
    return {"retenue": retenue, "rembourse": articles - retenue}


# ── Compte diaspora (règle 5) ──────────────────────────────────────────────────────────────────────────


def supplement_au_proche(*, articles: int, supplement: int, demande_par_proche: bool, g: Garde, gros: bool = False) -> Decision:
    """« Laisser le supplément domicile au proche » est-il permis ?"""
    if not demande_par_proche:
        return Decision(False, "choix-payeur")
    if supplement <= 0:
        return Decision(False, "offert")
    if articles < pire_cas(supplement, g, gros):
        return Decision(False, "garantie")
    return Decision(True)


def total_diaspora(
    *, articles: int, frais_relais: int, frais_domicile: int, livraison: str, supplement_par: str, service_pour_cent: Decimal
) -> dict:
    """Ce que paie le compte diaspora maintenant (articles + livraison payée + frais de service carte), et ce que le
    proche paierait à la remise. service_pour_cent : PAY-CARTE-FRAIS (2 %)."""
    livr = frais_domicile if livraison == "domicile" else frais_relais
    supplement = max(0, frais_domicile - frais_relais) if livraison == "domicile" else 0
    a_la_remise = supplement if supplement_par == DESTINATAIRE else 0
    livraison_payee = livr - a_la_remise
    service = pourcentage_de(articles + livraison_payee, service_pour_cent)
    return {
        "livraison": livr,
        "supplement": supplement,
        "aLaRemise": a_la_remise,
        "livraisonPayee": livraison_payee,
        "service": service,
        "total": articles + livraison_payee + service,
    }


# ── Cotisations nées d'une liste ───────────────────────────────────────────────────────────────────────


def objectif_cotisation(*, prix: int, frais: int, qui: str, frais_pour_cent: Decimal) -> int:
    """Prix figé à la création (avec la livraison si les participants la paient) + COT-FRAIS (2 %)."""
    base = prix + (frais if qui == PAYEUR else 0)
    return base + pourcentage_de(base, frais_pour_cent)


def rappel_possible(dernier_ms: int | None, maintenant_ms: int, ecart_ms: int) -> tuple[bool, int | None]:
    """Le propriétaire relance ses invités au plus une fois par écart : (permis, prochain instant possible)."""
    if dernier_ms and maintenant_ms - dernier_ms < ecart_ms:
        return False, dernier_ms + ecart_ms
    return True, None
