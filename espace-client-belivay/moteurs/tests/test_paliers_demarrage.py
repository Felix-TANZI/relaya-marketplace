"""Paliers du vendeur (PAL-01, C4, TRU-07, ACC-15 ; DP-21 ; DP-55 : Q-10) et plafond de démarrage (KYC-09 ; Q-14)."""

from datetime import date, timedelta
from decimal import Decimal

import pytest

from belivay_moteurs.demarrage import Incident, livrees_sans_incident, plafond_actif, quantite_attribuable
from belivay_moteurs.erreurs import VenteInvalide
from belivay_moteurs.litiges import Palier
from belivay_moteurs.paliers import EtatDuJour, evolution, palier_atteint, palier_de_lancement, paliers_effectifs
from belivay_moteurs.registre import charger_registre, lire_paliers

P = lire_paliers(charger_registre())
AUJOURD_HUI = date(2026, 9, 21)


def etat(score, livrees=0, note="4.5", visite=False, audit=False, jour=AUJOURD_HUI):
    return EtatDuJour(jour, Decimal(str(score)), livrees, Decimal(note), visite, audit)


def historique(jours, **kw):
    return [etat(jour=AUJOURD_HUI - timedelta(days=jours - 1 - i), **kw) for i in range(jours)]


def test_parametres():
    c = P.conditions
    assert (c["Argent"].trust_score, c["Argent"].commandes_livrees, c["Argent"].note) == (65, 10, Decimal("4.0"))
    assert (c["Or"].trust_score, c["Or"].commandes_livrees, c["Or"].note, c["Or"].visite) == (
        80,
        50,
        Decimal("4.3"),
        True,
    )
    assert (c["Platine"].trust_score, c["Platine"].audit) == (90, True)
    assert (P.montee_jours, P.descente_jours, P.lancement_mois) == (14, 14, 2)
    assert dict(P.lancement_produits) == {"Argent": 15, "Or": 40, "Platine": 80}
    assert (P.plafond_demarrage, P.demarrage_commandes) == (500_000, 10)


@pytest.mark.parametrize(
    "e, palier",
    [
        (etat("62.7", 7), Palier.BRONZE),  # Tonton PG : Trust Score 62,7, 7 livrées
        (etat(65, 10, "4.0"), Palier.ARGENT),
        (etat(65, 10, "3.9"), Palier.BRONZE),  # note sous 4,0
        (etat(64.9, 10), Palier.BRONZE),  # valeur exacte, pas l'arrondi affiché (65)
        (etat(85, 60, "4.4"), Palier.ARGENT),  # Or sans visite physique
        (etat(85, 60, "4.4", visite=True), Palier.OR),
        (etat(95, 60, "4.4", visite=True), Palier.OR),  # Platine sans audit
        (etat(95, 60, "4.4", visite=True, audit=True), Palier.PLATINE),
        (etat(95, 20, "4.8", audit=True), Palier.ARGENT),  # Platine demande aussi les conditions d'Or
    ],
)
def test_palier_atteint(e, palier):
    assert palier_atteint(e, P) is palier


def test_montee_apres_14_jours_de_suite():
    """C4 : seuil franchi et conditions tenues 14 jours."""
    argent = {"score": 66, "livrees": 12, "note": "4.2"}
    assert evolution(Palier.BRONZE, historique(14, **argent), P).montee is Palier.ARGENT
    assert evolution(Palier.BRONZE, historique(13, **argent), P).montee is None
    coupe = historique(14, **argent)
    coupe[5] = etat(64, 12, "4.2", jour=coupe[5].jour)
    assert evolution(Palier.BRONZE, coupe, P).montee is None
    assert evolution(Palier.ARGENT, historique(14, **argent), P) == evolution(Palier.ARGENT, [], P)


def test_descente_proposee_apres_14_jours_sous_le_seuil():
    """DP-21 : sous le seuil du palier 14 jours de suite ; proposée, validée par une personne (TRU-07)."""
    sous_or = {"score": 79, "livrees": 60, "note": "4.4", "visite": True}
    e = evolution(Palier.OR, historique(14, **sous_or), P)
    assert (e.montee, e.descente_proposee) == (None, Palier.ARGENT)
    assert evolution(Palier.OR, historique(13, **sous_or), P).descente_proposee is None
    assert (
        evolution(Palier.OR, historique(14, score=80, livrees=60, note="4.4", visite=True), P).descente_proposee is None
    )
    assert evolution(Palier.BRONZE, historique(14, score=10), P).descente_proposee is None


def test_releves_non_consecutifs_refuses():
    h = historique(3, score=70)
    with pytest.raises(ValueError, match="un jour manque"):
        evolution(Palier.BRONZE, [h[0], h[2]], P)


def test_palier_de_lancement():
    """ACC-15, Q-10 : 2 mois après la signature, selon les produits actifs."""
    signature = date(2026, 9, 1)
    assert palier_de_lancement(signature, date(2026, 10, 15), 45, P) is Palier.OR
    assert palier_de_lancement(signature, date(2026, 11, 1), 80, P) is Palier.PLATINE
    assert palier_de_lancement(signature, date(2026, 11, 2), 80, P) is None
    assert palier_de_lancement(signature, date(2026, 9, 2), 15, P) is Palier.ARGENT
    assert palier_de_lancement(signature, date(2026, 9, 2), 14, P) is Palier.BRONZE


def test_paliers_effectifs_multiplicateur_seulement():
    """Q-10 : 45 produits actifs, Trust Score Bronze : commission au palier Or, libération Bronze (3 jours)."""
    signature = date(2026, 9, 1)
    e = paliers_effectifs(Palier.BRONZE, signature, date(2026, 9, 21), 45, P)
    assert (e.commission, e.liberation) == (Palier.OR, Palier.BRONZE)
    e = paliers_effectifs(Palier.PLATINE, signature, date(2026, 9, 21), 20, P)
    assert (e.commission, e.liberation) == (Palier.PLATINE, Palier.PLATINE)  # le meilleur des deux
    e = paliers_effectifs("Bronze", signature, date(2026, 12, 1), 45, P)
    assert (e.commission, e.liberation) == (Palier.BRONZE, Palier.BRONZE)  # lancement fini


# ── Plafond de démarrage ────────────────────────────────────────────────────────────────────────────────


def test_livrees_sans_incident():
    commandes = [(), (Incident.RUPTURE,), [], {Incident.LITIGE_PERDU, Incident.RETOUR_DEFAUT}, (), ()]
    assert livrees_sans_incident(commandes) == 4
    assert plafond_actif(9, P) and not plafond_actif(10, P)


@pytest.mark.parametrize(
    "prix, quantite, sans_incident, deja, attribuable",
    [
        (200_000, 3, 0, 0, 2),  # Q-14 : 600 000 F demandés, 2 téléphones (400 000 F), le 3e ailleurs
        (500_000, 1, 0, 0, 1),  # 500 000 F tout juste : attribué
        (500_001, 1, 0, 0, 0),
        (200_000, 3, 10, 0, 3),  # 10 commandes livrées sans incident : plus de plafond
        (200_000, 2, 9, 400_000, 0),  # le plafond porte sur toute la sous-commande
        (50_000, 5, 0, 300_000, 4),
        (50_000, 5, 0, 600_000, 0),
    ],
)
def test_quantite_attribuable(prix, quantite, sans_incident, deja, attribuable):
    assert quantite_attribuable(prix, quantite, sans_incident, P, deja_attribue=deja) == attribuable


def test_quantite_invalide():
    with pytest.raises(VenteInvalide):
        quantite_attribuable(0, 1, 0, P)
