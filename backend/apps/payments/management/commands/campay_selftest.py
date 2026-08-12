# backend/apps/payments/management/commands/campay_selftest.py
# Test de bout en bout contre le VRAI bac a sable CamPay.
#
#   python manage.py campay_selftest                        # verifie l'acces
#   python manage.py campay_selftest --holder 237XXXXXXXXX
#   python manage.py campay_selftest --collect 237XXXXXXXXX --amount 100
#   python manage.py campay_selftest --status <reference>
#
# COUCHE 2 de la strategie de test : valide le flux SORTANT contre le vrai
# prestataire. Le conteneur a une sortie internet, aucun tunnel necessaire.
#
# Cette commande repond aussi a LA question du Jalon A : CamPay expose-t-il
# un solde par operateur ?
#
# NE JAMAIS lancer --collect en mode LIVE : cela declenche une vraie demande
# de paiement sur un vrai telephone.

import sys
import uuid

from django.core.management.base import BaseCommand

from apps.payments.infrastructure.providers.base import (
    CollectRequest,
    ProviderError,
    ProviderTimeout,
)
from apps.payments.infrastructure.providers.campay import CampayProvider
from apps.payments.infrastructure.providers.campay.client import (
    LIVE_BASE_URL,
    SANDBOX_BASE_URL,
)


class Command(BaseCommand):
    help = "Verifie l'acces reel a CamPay (bac a sable par defaut)."

    def add_arguments(self, parser):
        parser.add_argument("--live", action="store_true",
                            help="Environnement de PRODUCTION. Prudence.")
        parser.add_argument("--collect", type=str, default=None,
                            help="Numero a debiter. Declenche une VRAIE demande.")
        parser.add_argument("--amount", type=int, default=100)
        parser.add_argument("--status", type=str, default=None,
                            help="Reference d'une transaction a consulter.")
        parser.add_argument("--holder", type=str, default=None,
                            help="Numero dont on veut le titulaire.")
        parser.add_argument("--probe-idempotency", type=str, default=None,
                            metavar="MSISDN",
                            help=("Sonde le comportement d'idempotence de "
                                  "/withdraw/. Exige un solde marchand > 0. "
                                  "Emet DEUX versements avec la MEME reference."))
        parser.add_argument("--probe-amount", type=int, default=1)

    def handle(self, *args, **options):
        from apps.payments.config.models import ProviderConfig

        config = (
            ProviderConfig.current()
            .filter(provider_code="CAMPAY")
            .order_by("-priority")
            .first()
        )
        if config is None:
            self.stdout.write(self.style.ERROR(
                "Aucune configuration CAMPAY active. "
                "Lancer d'abord : python manage.py seed_financial_config"
            ))
            sys.exit(1)

        if options["live"] and config.mode != "LIVE":
            self.stdout.write(self.style.ERROR(
                "--live demande mais la configuration est en SANDBOX. "
                "Passer en LIVE via une demande de changement approuvee."
            ))
            sys.exit(1)

        base = LIVE_BASE_URL if config.mode == "LIVE" else SANDBOX_BASE_URL
        self.stdout.write(self.style.HTTP_INFO(f"Environnement : {config.mode}"))
        self.stdout.write(f"Base          : {base}\n")

        prestataire = CampayProvider(config=config)

        # ── 1. Acces et authentification ─────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("── 1. Acces et authentification ──"))
        try:
            solde = prestataire.balance()
        except ProviderTimeout as exc:
            self.stdout.write(self.style.ERROR(f"  Delai depasse : {exc}"))
            sys.exit(1)
        except ProviderError as exc:
            self.stdout.write(self.style.ERROR(f"  Echec : {exc}"))
            self.stdout.write(
                "  Verifier CAMPAY_TOKEN_SANDBOX (ou CAMPAY_TOKEN_LIVE) "
                "en variable d'environnement."
            )
            sys.exit(1)

        self.stdout.write(self.style.SUCCESS("  Authentification acceptee."))
        self.stdout.write(f"  Solde total : {solde.total_xaf} XAF")

        # ── 2. LA question du Jalon A ────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO(
            "\n── 2. Solde expose par operateur ? (Jalon A) ──"
        ))
        if solde.is_per_operator_authoritative:
            self.stdout.write(self.style.SUCCESS(
                "  OUI — CamPay expose un solde par operateur."
            ))
            for operateur, montant in solde.per_operator.items():
                self.stdout.write(f"    {operateur:8} {montant} XAF")
            self.stdout.write(
                "\n  => Passer exposes_balance_per_operator a True dans "
                "ProviderConfig.\n"
                "     Les comptes 1011 et 1012 deviennent reconciliables, "
                "et l'invariant\n     de liquidite par porteur devient bloquant."
            )
        else:
            self.stdout.write(self.style.WARNING(
                "  NON — aucun solde par operateur detecte."
            ))
            self.stdout.write(
                "  => Le MODE DEGRADE s'applique. Le compte 1010 fait foi, et la\n"
                "     ventilation MTN/Orange reste une estimation non opposable.\n"
                "     L'invariant I5 restera en N/A."
            )
        self.stdout.write(f"\n  Reponse brute : {solde.raw_response}")

        # ── 3. Titulaire d'un numero ─────────────────────────────────────────
        if options["holder"]:
            self.stdout.write(self.style.HTTP_INFO("\n── 3. Titulaire du numero ──"))
            try:
                nom = prestataire.holder_info(options["holder"])
                self.stdout.write(f"  {options['holder']} -> {nom or '(inconnu)'}")
                if nom:
                    self.stdout.write(
                        "  Utilisable en controle anti-fraude : verifier que le "
                        "numero\n  de versement appartient au partenaire declare."
                    )
            except ProviderError as exc:
                self.stdout.write(self.style.WARNING(f"  Indisponible : {exc}"))

        # ── 4. Consultation d'une transaction ────────────────────────────────
        if options["status"]:
            self.stdout.write(self.style.HTTP_INFO("\n── 4. Consultation ──"))
            try:
                etat = prestataire.get_transaction(options["status"])
                self.stdout.write(f"  Statut normalise : {etat.status}")
                self.stdout.write(f"  Statut brut      : {etat.raw_status}")
                self.stdout.write(f"  Montant          : {etat.amount_xaf} XAF")
                self.stdout.write(f"  Operateur        : {etat.operator}")
                self.stdout.write(f"  Notre reference  : {etat.external_reference or '(aucune)'}")
                if etat.error_code:
                    self.stdout.write(self.style.ERROR(
                        f"  Erreur {etat.error_code} : {etat.error_message}"
                    ))
                self.stdout.write(f"\n  Reponse brute : {etat.raw_response}")
            except ProviderError as exc:
                self.stdout.write(self.style.ERROR(f"  Echec : {exc}"))

        # ── 5. Encaissement reel ─────────────────────────────────────────────
        if options["collect"]:
            self.stdout.write(self.style.HTTP_INFO("\n── 5. Demande d'encaissement ──"))
            self.stdout.write(self.style.WARNING(
                f"  Une demande de {options['amount']} XAF va etre envoyee "
                f"au {options['collect']}."
            ))
            reference = f"SELFTEST-{uuid.uuid4().hex[:12].upper()}"
            try:
                resultat = prestataire.collect(CollectRequest(
                    external_reference=reference,
                    amount_xaf=options["amount"],
                    msisdn=options["collect"],
                    operator="",
                    description="BelivaY selftest",
                ))
            except (ProviderError, ProviderTimeout) as exc:
                self.stdout.write(self.style.ERROR(f"  Echec : {exc}"))
                sys.exit(1)

            self.stdout.write(f"  Acceptee         : {resultat.accepted}")
            self.stdout.write(f"  Reference CamPay : {resultat.provider_reference}")
            self.stdout.write(f"  Statut           : {resultat.status}")
            if resultat.error_code:
                self.stdout.write(self.style.ERROR(
                    f"  Erreur {resultat.error_code} : {resultat.error_message}"
                ))
            self.stdout.write(f"\n  Notre reference : {reference}")
            self.stdout.write(
                "\n  IDEMPOTENCE — a verifier : relancer la MEME commande avec\n"
                "  la meme external_reference doit-il creer une seconde "
                "transaction ?\n  Si oui, CamPay ne garantit pas l'idempotence "
                "et il faut une couche\n  de deduplication cote BelivaY."
            )
            if resultat.provider_reference:
                self.stdout.write(
                    f"\n  Suivre avec :\n"
                    f"    python manage.py campay_selftest "
                    f"--status {resultat.provider_reference}"
                )

        # ── 6. Sonde d'idempotence ───────────────────────────────────────────
        if options["probe_idempotency"]:
            self._probe_idempotency(
                prestataire, options["probe_idempotency"],
                options["probe_amount"], solde,
            )

        self.stdout.write(self.style.SUCCESS("\nAuto-test termine."))

    def _probe_idempotency(self, prestataire, msisdn, montant, solde):
        """
        Repond a une question que la documentation CamPay laisse ambigue.

        Elle affirme deux choses contradictoires sur /withdraw/ :
          « you will get the results of the first request »
          « A request with a duplicate UUID will be rejected »

        Cette sonde emet DEUX versements avec la MEME reference et observe.

        A QUOI CA SERT — et a quoi ca ne sert PAS :
        le code ne rejoue JAMAIS un versement, quelle que soit la reponse.
        Cette sonde documente le comportement reel du prestataire pour la
        reconciliation, elle ne change aucune decision de conception.
        """
        from apps.payments.infrastructure.providers.base import WithdrawRequest
        from apps.payments.infrastructure.providers.campay import mapper

        self.stdout.write(self.style.HTTP_INFO(
            "\n── 6. Sonde d'idempotence sur /withdraw/ ──"
        ))

        if solde.total_xaf < montant:
            self.stdout.write(self.style.ERROR(
                f"  Solde marchand insuffisant ({solde.total_xaf} XAF) pour "
                f"sonder avec {montant} XAF.\n"
                "  Crediter d'abord le bac a sable :\n"
                "    python manage.py campay_selftest --collect <numero> --amount 500"
            ))
            return

        reference = mapper.new_withdraw_reference()
        self.stdout.write(f"  Reference partagee : {reference}")
        self.stdout.write(f"  Montant            : {montant} XAF vers {msisdn}\n")

        resultats = []
        for essai in (1, 2):
            try:
                resultat = prestataire.withdraw(WithdrawRequest(
                    external_reference=reference, amount_xaf=montant,
                    msisdn=msisdn, operator="",
                    description=f"Sonde idempotence {essai}",
                ))
                resultats.append(resultat)
                self.stdout.write(
                    f"  Appel {essai} : accepte={resultat.accepted} "
                    f"reference={resultat.provider_reference or '(aucune)'} "
                    f"statut={resultat.status} "
                    f"erreur={resultat.error_code or '—'}"
                )
            except Exception as exc:
                resultats.append(None)
                self.stdout.write(self.style.ERROR(
                    f"  Appel {essai} : exception — {type(exc).__name__} : {exc}"
                ))

        self.stdout.write(self.style.HTTP_INFO("\n  Verdict :"))
        premier, second = (resultats + [None, None])[:2]

        if premier is None:
            self.stdout.write(self.style.WARNING(
                "  Le premier appel a echoue : sonde non concluante."
            ))
        elif second is None:
            self.stdout.write(self.style.WARNING(
                "  Le second appel a leve une exception. "
                "Probable REJET du doublon."
            ))
        elif (second.accepted
              and second.provider_reference == premier.provider_reference):
            self.stdout.write(self.style.SUCCESS(
                "  IDEMPOTENT — le second appel renvoie la MEME transaction.\n"
                "  Une reprise apres incident peut interroger sans risque."
            ))
        elif (second.accepted
              and second.provider_reference != premier.provider_reference):
            self.stdout.write(self.style.ERROR(
                "  NON IDEMPOTENT — le second appel a cree une SECONDE "
                "transaction.\n"
                "  DOUBLE VERSEMENT REEL. Ne jamais rejouer un /withdraw/, "
                "sous aucune condition."
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f"  DOUBLON REJETE — erreur {second.error_code or '(sans code)'} : "
                f"{second.error_message[:100]}\n"
                "  La reprise apres incident doit passer par la lecture "
                "(/history/), jamais par un renvoi."
            ))

        self.stdout.write(
            "\n  Dans TOUS les cas, la conception reste inchangee : un "
            "versement n'est\n  jamais rejoue, et un etat inconnu se resout "
            "par lecture, pas par ecriture."
        )