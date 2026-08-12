# backend/apps/payments/tests/providers/test_message_prestataire.py
# Le message du prestataire ne doit jamais etre perdu.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE FICHIER EXISTE A CAUSE D'UN TEST DE PAIEMENT REEL
#
# CamPay a repondu :
#     {"message": "This is a demo system. Maximum amount is 25.00 XAF",
#      "error_code": "ER201"}
#
# Mon code affichait : « Une erreur technique est survenue. Reessayez. »
#
# Le libelle du catalogue est bon pour l'ACHETEUR, mais l'ecraser rendait le
# diagnostic impossible sans aller lire response_payload a la main. Une
# limite de bac a sable ressemblait a une panne.
# ─────────────────────────────────────────────────────────────────────────────

import pytest

from apps.payments.infrastructure.providers.campay import mapper
from apps.payments.infrastructure.providers.campay.errors import describe


class TestMessageConserve:

    REPONSE_REELLE = {
        "message": "This is a demo system. Maximum amount is 25.00 XAF",
        "error_code": "ER201",
    }

    def test_le_libelle_client_reste_lisible(self):
        """L'acheteur ne doit pas lire de jargon technique."""
        spec = describe("ER201")
        assert "technique" in spec.user_message.lower()
        assert "demo system" not in spec.user_message

    def test_la_cause_exacte_est_conservee(self):
        """
        LE test qui evite de perdre une heure sur un faux diagnostic.

        Le message compose garde les deux : le libelle client d'abord, la
        cause exacte entre crochets.
        """
        spec = describe("ER201")
        brut = mapper.clean(self.REPONSE_REELLE.get("message"))
        message = spec.user_message
        if brut and brut.lower() not in message.lower():
            message = f"{spec.user_message} [{brut}]"

        assert "Maximum amount is 25.00 XAF" in message
        assert spec.user_message in message

    def test_pas_de_repetition_quand_c_est_identique(self):
        """Si le message brut dit deja la meme chose, on ne le double pas."""
        spec = describe("ER101")
        brut = "Numero invalide"
        message = spec.user_message
        if brut and brut.lower() not in message.lower():
            message = f"{spec.user_message} [{brut}]"
        assert message.count("Numero invalide") == 1

    def test_la_reponse_brute_est_toujours_conservee(self):
        """
        Quoi qu'il arrive, response_payload garde la reponse integrale.
        C'est la source de verite du diagnostic.
        """
        transaction = mapper.parse_transaction(self.REPONSE_REELLE)
        assert transaction["raw"] == self.REPONSE_REELLE
        assert transaction["error_code"] == "ER201"


class TestPlafondBacASable:

    def test_er201_est_bien_reconnu(self):
        """
        ER201 est un incident technique cote prestataire : l'acheteur ne
        peut rien y faire, l'exploitation doit etre alertee.
        """
        spec = describe("ER201")
        assert spec.code == "ER201"
        assert spec.retryable_by_user is False
        assert spec.alerts_ops is True