# backend/apps/payments/domain/exceptions.py
# Exceptions du domaine financier.
#
# Toutes heritent de DomainError. Aucune ne depend de Django ni de DRF :
# la traduction en reponse HTTP est faite par la couche api/, jamais ici.

class DomainError(Exception):
    """Racine de toutes les erreurs du domaine financier."""


# ── Monnaie ──────────────────────────────────────────────────────────────────

class MoneyError(DomainError):
    """Erreur d'arithmetique monetaire."""


class FloatForbidden(MoneyError):
    """
    Un float a ete introduit dans un calcul monetaire.

    Le float produit des erreurs de representation binaire qui se cumulent.
    Sur des milliers de transactions, l'ecart devient materiel.
    C'est une faute comptable, pas une approximation acceptable.
    """


class CurrencyMismatch(MoneyError):
    """Operation entre deux montants de devises differentes."""


class NegativeAmount(MoneyError):
    """Montant negatif la ou seul un montant positif a un sens."""


# ── Machines a etats ─────────────────────────────────────────────────────────

class StateError(DomainError):
    """Erreur de transition d'etat."""


class IllegalTransition(StateError):
    """
    Transition non declaree dans la machine a etats.

    Une transition absente de la table est TOUJOURS refusee.
    Le silence n'est jamais une option : un etat financier qui glisse
    sans declaration est un bug qui deplace de l'argent.
    """

    def __init__(self, machine: str, current: str, target: str, allowed):
        self.machine = machine
        self.current = current
        self.target = target
        self.allowed = list(allowed)
        allowed_txt = ", ".join(self.allowed) if self.allowed else "aucune"
        super().__init__(
            f"[{machine}] transition interdite {current} -> {target}. "
            f"Transitions autorisees depuis {current} : {allowed_txt}."
        )


class TerminalState(StateError):
    """Tentative de transition depuis un etat terminal."""


# ── Frais et repartition ─────────────────────────────────────────────────────

class FeeError(DomainError):
    """Erreur du moteur de frais."""


class NoApplicableRule(FeeError):
    """
    Aucune regle ne correspond au contexte.

    N'est jamais silencieux : une transaction sans regle de frais resolue
    signifie une configuration incomplete, pas des frais nuls.
    """


class InvalidFeeRule(FeeError):
    """Regle de frais incoherente (bornes inversees, taux hors limites...)."""


class DistributionError(DomainError):
    """Erreur de repartition entre beneficiaires."""


class IncompleteDistribution(DistributionError):
    """
    Les regles applicables a un composant ne couvrent pas exactement 100 %.

    Detecte a la configuration, pas en production. Un trou de repartition
    signifie de l'argent non attribue.
    """


class ConservationViolation(DistributionError):
    """
    La somme des parts ne correspond pas au montant reparti.

    Invariant absolu du domaine : aucun franc n'est cree, aucun n'est perdu.
    Cette exception ne devrait jamais se declencher en production ; si elle
    se declenche, le calcul est faux et la transaction doit echouer.
    """


# ── Politiques ───────────────────────────────────────────────────────────────

class PolicyError(DomainError):
    """Erreur de resolution d'une politique d'escrow."""


class NoApplicablePolicy(PolicyError):
    """Aucune politique d'escrow ne correspond au contexte."""