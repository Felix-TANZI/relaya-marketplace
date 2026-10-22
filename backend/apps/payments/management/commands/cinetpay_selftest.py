# backend/apps/payments/management/commands/cinetpay_selftest.py
# Test de bout en bout contre le VRAI bac a sable CinetPay.
#
#   python manage.py cinetpay_selftest --checkout --amount 500
#   python manage.py cinetpay_selftest --status <transaction_id>
#
# Objectif PRINCIPAL de cette commande : le contrat d'API CinetPay utilise
# dans ce module (voir infrastructure/providers/cinetpay/) N'A PAS PU ETRE
# VERIFIE contre la documentation primaire (docs.cinetpay.com injoignable
# au moment d'ecrire ce code — DNS bloque dans l'environnement de
# developpement). --checkout sert donc D'ABORD a observer une VRAIE reponse
# et a corriger mapper.py/errors.py en consequence, exactement comme le
# commentaire ER201 de campay_selftest.py documente une correction faite
# apres un appel reel.
#
# AUCUNE VRAIE CARTE BANCAIRE ne doit etre utilisee ici : --checkout ne fait
# qu'INITIER un paiement (obtenir une URL) sur le bac a sable CinetPay, qui
# ne deplace jamais de vrai argent. Ne jamais lancer --live sans validation
# explicite de l'equipe.

import sys
import uuid

from django.core.management.base import BaseCommand

from apps.payments.infrastructure.providers.base import (
    CheckoutRequest,
    ProviderError,
    ProviderTimeout,
)
from apps.payments.infrastructure.providers.cinetpay import CinetPayProvider


class Command(BaseCommand):
    help = "Verifie l'acces reel a CinetPay (bac a sable par defaut)."

    def add_arguments(self, parser):
        parser.add_argument("--live", action="store_true",
                            help="Environnement de PRODUCTION. Prudence.")
        parser.add_argument("--login", action="store_true",
                            help="Teste uniquement la connexion (/v1/oauth/login).")
        parser.add_argument("--checkout", action="store_true",
                            help="Initie un paiement de demonstration (pas de vraie carte).")
        parser.add_argument("--amount", type=int, default=500)
        parser.add_argument("--status", type=str, default=None,
                            help="transaction_id d'un paiement a consulter.")

    def handle(self, *args, **options):
        from apps.payments.config.models import ProviderConfig

        config = (
            ProviderConfig.current()
            .filter(provider_code="CINETPAY")
            .order_by("-priority")
            .first()
        )
        if config is None:
            self.stdout.write(self.style.ERROR(
                "Aucune configuration CINETPAY active. "
                "Lancer d'abord : python manage.py seed_financial_config"
            ))
            sys.exit(1)

        if options["live"] and config.mode != "LIVE":
            self.stdout.write(self.style.ERROR(
                "--live demande mais la configuration est en SANDBOX. "
                "Passer en LIVE via une demande de changement approuvee."
            ))
            sys.exit(1)

        self.stdout.write(self.style.HTTP_INFO(f"Environnement : {config.mode}"))
        self.stdout.write(self.style.WARNING(
            "Contrat d'API non confirme contre la documentation primaire — "
            "voir les commentaires dans infrastructure/providers/cinetpay/.\n"
        ))

        prestataire = CinetPayProvider(config=config)

        if options["login"]:
            self.stdout.write(self.style.HTTP_INFO("── Connexion (/v1/oauth/login) ──"))
            try:
                jeton = prestataire._client.login(force=True)
            except ProviderError as exc:
                self.stdout.write(self.style.ERROR(f"  Echec : {exc}"))
                sys.exit(1)
            self.stdout.write(self.style.SUCCESS(
                f"  Jeton obtenu ({len(jeton)} caracteres) — connexion reussie."
            ))
            self.stdout.write(
                "\n  Si ce test passe mais qu'un autre nom de champ de jeton "
                "etait attendu, le comportement aurait echoue avec une erreur "
                "explicite plutot que de renvoyer un faux succes."
            )

        if options["checkout"]:
            self.stdout.write(self.style.HTTP_INFO("── Initialisation d'un paiement ──"))
            reference = f"SELFTEST-{uuid.uuid4().hex[:12].upper()}"
            try:
                resultat = prestataire.create_checkout(CheckoutRequest(
                    external_reference=reference,
                    amount_xaf=options["amount"],
                    description="BelivaY selftest",
                    customer_name="Selftest",
                    customer_surname="BelivaY",
                    customer_email="selftest@belivay.com",
                    customer_phone="+237655000000",
                    return_url="https://belivay.com/paiement/succes",
                    failed_url="https://belivay.com/paiement/echec",
                    notify_url="https://belivay.com/api/payments/webhooks/cinetpay/",
                ))
            except ProviderTimeout as exc:
                self.stdout.write(self.style.ERROR(f"  Delai depasse : {exc}"))
                sys.exit(1)
            except ProviderError as exc:
                self.stdout.write(self.style.ERROR(f"  Echec : {exc}"))
                self.stdout.write(
                    "  Verifier CINETPAY_API_KEY_SANDBOX et CINETPAY_SITE_ID_SANDBOX "
                    "en variable d'environnement."
                )
                sys.exit(1)

            self.stdout.write(f"  Notre reference   : {reference}")
            self.stdout.write(f"  Acceptee          : {resultat.accepted}")
            self.stdout.write(f"  URL de paiement   : {resultat.payment_url or '(aucune)'}")
            self.stdout.write(f"  Jeton de paiement : {resultat.payment_token or '(aucun)'}")
            self.stdout.write(f"  Statut            : {resultat.status}")
            if resultat.error_code:
                self.stdout.write(self.style.ERROR(
                    f"  Erreur {resultat.error_code} : {resultat.error_message}"
                ))
            self.stdout.write(f"\n  Reponse brute : {resultat.raw_response}")
            self.stdout.write(self.style.WARNING(
                "\n  COMPARER cette reponse brute au contrat suppose dans "
                "mapper.py (parse_checkout_response). Corriger le mapper si "
                "les noms de champs different."
            ))
            if resultat.accepted:
                self.stdout.write(
                    f"\n  Suivre avec :\n"
                    f"    python manage.py cinetpay_selftest --status {reference}"
                )

        if options["status"]:
            self.stdout.write(self.style.HTTP_INFO("\n── Consultation ──"))
            try:
                etat = prestataire.get_transaction(options["status"])
            except ProviderError as exc:
                self.stdout.write(self.style.ERROR(f"  Echec : {exc}"))
                sys.exit(1)

            self.stdout.write(f"  Statut normalise : {etat.status}")
            self.stdout.write(f"  Statut brut      : {etat.raw_status}")
            self.stdout.write(f"  Montant          : {etat.amount_xaf} XAF")
            if etat.error_code:
                self.stdout.write(self.style.ERROR(
                    f"  Erreur {etat.error_code} : {etat.error_message}"
                ))
            self.stdout.write(f"\n  Reponse brute : {etat.raw_response}")
            self.stdout.write(self.style.WARNING(
                "\n  COMPARER cette reponse brute au contrat suppose dans "
                "mapper.py (parse_transaction). Corriger le mapper si les "
                "noms de champs different, en particulier la valeur de "
                "'status' utilisee pour reconnaitre un paiement reussi."
            ))

        if not options["login"] and not options["checkout"] and not options["status"]:
            self.stdout.write(
                "Rien a faire. Utiliser --login pour tester la connexion, "
                "--checkout pour initier un paiement de demonstration, ou "
                "--status <transaction_id> pour en consulter un."
            )

        self.stdout.write(self.style.SUCCESS("\nAuto-test termine."))
