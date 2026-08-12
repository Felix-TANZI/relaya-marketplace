# backend/apps/payments/management/commands/execute_payouts.py
# Execute les versements approuves.
#
#   python manage.py execute_payouts --dry-run
#   python manage.py execute_payouts
#
# UN SEUL WORKER doit executer cette commande. C'est une PRUDENCE
# OPERATIONNELLE, jamais un mecanisme de surete : la surete vient de
# l'idempotence, des contraintes en base, des verrous et de la machine
# a etats. Si la surete en dependait, le systeme deviendrait non sur au
# premier passage a deux workers.

from django.core.management.base import BaseCommand

from apps.payments.settlements.models import PayoutRequest
from apps.payments.settlements.services import execute_approved_payouts


class Command(BaseCommand):
    help = "Execute les versements approuves aupres du prestataire."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("MODE SIMULATION\n"))
            approuves = PayoutRequest.objects.filter(
                status=PayoutRequest.Status.APPROVED
            ).select_related("payee")[:options["limit"]]
            for demande in approuves:
                self.stdout.write(
                    f"  {demande.reference}  {demande.payee.payee_code:20} "
                    f"{demande.amount_xaf:>10} XAF  -> "
                    f"{demande.payee_operator} {demande.payee_msisdn_masked}"
                )
            self.stdout.write(f"\n  Total : {approuves.count()}")
            return

        resultats = execute_approved_payouts(limit=options["limit"])
        self.stdout.write(
            f"  {resultats['examines']} examine(s), "
            f"{resultats['verses']} verse(s), "
            f"{resultats['echoues']} echoue(s), "
            f"{resultats['inconnus']} a issue INCONNUE"
        )
        if resultats["montant_xaf"]:
            montant = f"{resultats['montant_xaf']:,}".replace(",", " ")
            self.stdout.write(self.style.SUCCESS(f"  {montant} FCFA verse(s)."))

        if resultats["inconnus"]:
            self.stdout.write(self.style.ERROR(
                f"\n{resultats['inconnus']} versement(s) a issue INCONNUE.\n"
                "NE JAMAIS RETENTER sans reconciliation : l'argent est "
                "peut-etre deja parti."
            ))