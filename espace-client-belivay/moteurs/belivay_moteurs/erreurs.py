"""Erreurs des moteurs de calcul."""


class ErreurMoteur(Exception):
    """Base de toutes les erreurs des moteurs."""


class ValeurInterdite(ErreurMoteur):
    """Valeur qui ne doit jamais entrer dans un calcul d'argent (float, booléen)."""


class ParametreIllisible(ErreurMoteur):
    """La valeur d'un paramètre du registre n'a pas la forme attendue : on s'arrête plutôt que deviner."""


class ParametreAbsent(ErreurMoteur):
    """Un paramètre nécessaire au calcul manque dans le registre."""


class PanierInvalide(ErreurMoteur):
    """Panier impossible : vide, quantité nulle, prix négatif, colis interdit dans le mode choisi…"""


class VenteInvalide(ErreurMoteur):
    """Vente impossible à calculer : sans article, prix ou quantité invalides, famille inconnue…"""


class OffreRefusee(ErreurMoteur):
    """BelivaY ne perd jamais (DP-55) : une offre ou une vente où le vendeur garderait moins de 0 F est refusée."""


class AnnonceRefusee(ErreurMoteur):
    """DP-59 : annonce, enchère, emplacement, Boost ou mouvement du solde publicitaire refusé (seuil de qualité, prix
    plancher, budget, solde insuffisant, remise flash trop faible)."""
