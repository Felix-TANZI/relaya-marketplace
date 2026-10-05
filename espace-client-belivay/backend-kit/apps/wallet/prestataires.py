# backend/apps/wallet/prestataires.py
# Prestataires d'argent vus du kit : carte (Visa, Mastercard, Apple Pay, Google Pay) et Mobile Money.
#
# CARTE — settings.BELIVAY_CARTE :
#   "apps.wallet.prestataires.CarteConsole" : développement et essais (accepte tout, sauf les numéros de refus
#   ci-dessous) ; à écrire : CinetPay (principal), Flutterwave (secours) (PAY-CARTE-PSP), même interface.
#   Le numéro de carte n'arrive JAMAIS au serveur BelivaY (CAP-24) : le site le saisit dans le champ sécurisé du
#   prestataire, qui rend un jeton ; le serveur ne garde que le jeton, la marque et les 4 derniers chiffres.
#   3-D Secure : payer() peut répondre « action_requise » avec l'adresse de la page de la banque.
#
# MOBILE MONEY : relaya-marketplace a déjà tout (payments/application/collect.py, CamPay, webhooks à 7 couches) :
#   le kit NE refait PAS l'encaissement Mobile Money ; il appelle leur service par MobileMoneyRelaya (à brancher,
#   décision D9). MobileMoneyConsole sert aux essais.

import logging
import secrets
from dataclasses import dataclass, field
from decimal import Decimal

from django.conf import settings
from django.utils.module_loading import import_string

logger = logging.getLogger("apps.wallet")


@dataclass(frozen=True)
class ResultatPaiement:
    statut: str  # "reussi" | "action_requise" (3-D Secure) | "en_attente" (Mobile Money : validation sur le téléphone) | "refuse"
    reference: str = ""
    redirection: str | None = None  # 3-D Secure
    motif: str = ""  # refus : card_declined, insufficient_funds…
    pays_carte: str | None = None  # pays d'émission (BIN) donné par le prestataire
    extra: dict = field(default_factory=dict)


@dataclass(frozen=True)
class CarteEnregistree:
    jeton: str
    marque: str  # Visa | Mastercard
    derniers: str
    expire: str  # « 08/29 »
    pays: str | None = None


class Carte:
    def enregistrer(self, jeton_prestataire: str, titulaire: str) -> CarteEnregistree:  # pragma: no cover - interface
        raise NotImplementedError

    def payer(
        self, *, montant_xaf: int, devise: str, montant_devise: Decimal | None, jeton: str, reference: str, email: str = ""
    ) -> ResultatPaiement:  # pragma: no cover
        raise NotImplementedError

    def rembourser(self, *, reference: str, montant_xaf: int) -> ResultatPaiement:  # pragma: no cover - interface
        raise NotImplementedError

    def taux_usd(self) -> Decimal:  # pragma: no cover - interface
        """Francs pour 1 dollar US, taux du jour du prestataire (figé au paiement, CAL-26)."""
        raise NotImplementedError


class CarteConsole(Carte):
    """Essais : « tok_refus » est refusé, « tok_3ds » demande 3-D Secure, tout autre jeton passe."""

    PAIEMENTS: list[dict] = []

    def enregistrer(self, jeton_prestataire: str, titulaire: str) -> CarteEnregistree:
        marque = "Mastercard" if jeton_prestataire.startswith("tok_mc") else "Visa"
        return CarteEnregistree(
            jeton=f"carte_{secrets.token_hex(8)}",
            marque=marque,
            derniers=jeton_prestataire[-4:].rjust(4, "4"),
            expire="08/29",
            pays="France",
        )

    def payer(self, *, montant_xaf, devise, montant_devise, jeton, reference, email=""):
        CarteConsole.PAIEMENTS.append(
            {"montant_xaf": montant_xaf, "devise": devise, "montant_devise": montant_devise, "jeton": jeton, "reference": reference}
        )
        if jeton == "tok_refus":
            return ResultatPaiement("refuse", reference, motif="card_declined")
        if jeton == "tok_3ds":
            return ResultatPaiement("action_requise", reference, redirection=f"https://3ds.exemple/{reference}")
        return ResultatPaiement("reussi", f"console-{reference}", pays_carte="France")

    def rembourser(self, *, reference, montant_xaf):
        return ResultatPaiement("reussi", f"remb-{reference}")

    def taux_usd(self) -> Decimal:
        return Decimal("578.50")  # valeur de démonstration du prototype ; en production : le prestataire


class MobileMoney:
    def demander(self, *, montant_xaf: int, numero: str, reference: str, motif: str) -> ResultatPaiement:  # pragma: no cover
        raise NotImplementedError

    def verser(self, *, montant_xaf: int, numero: str, reference: str) -> ResultatPaiement:  # pragma: no cover - interface
        """Retrait du portefeuille, versement de cagnotte : argent envoyé vers un numéro."""
        raise NotImplementedError


class MobileMoneyConsole(MobileMoney):
    DEMANDES: list[dict] = []

    def demander(self, *, montant_xaf, numero, reference, motif):
        MobileMoneyConsole.DEMANDES.append({"montant_xaf": montant_xaf, "numero": numero, "reference": reference, "motif": motif})
        return ResultatPaiement("en_attente", reference)

    def verser(self, *, montant_xaf, numero, reference):
        MobileMoneyConsole.DEMANDES.append({"versement": montant_xaf, "numero": numero, "reference": reference})
        return ResultatPaiement("reussi", reference)


def carte() -> Carte:
    return import_string(getattr(settings, "BELIVAY_CARTE", "apps.wallet.prestataires.CarteConsole"))()


def mobile_money() -> MobileMoney:
    return import_string(getattr(settings, "BELIVAY_MOBILE_MONEY", "apps.wallet.prestataires.MobileMoneyConsole"))()
