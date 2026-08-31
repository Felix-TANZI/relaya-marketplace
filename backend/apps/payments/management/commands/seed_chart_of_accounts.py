# backend/apps/payments/management/commands/seed_chart_of_accounts.py
# Seed idempotent du plan comptable.
#
#   python manage.py seed_chart_of_accounts --dry-run
#   python manage.py seed_chart_of_accounts

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerAccount


class Command(BaseCommand):
    help = "Cree le plan comptable BelivaY. Idempotent."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        simulation = options["dry_run"]
        if simulation:
            self.stdout.write(self.style.WARNING("MODE SIMULATION — aucune ecriture\n"))

        crees = existants = maj = 0

        with transaction.atomic():
            for entree in coa.CHART:
                existant = LedgerAccount.objects.filter(code=entree["code"]).first()

                if existant is not None:
                    # Le libelle et la description peuvent evoluer ; le TYPE et
                    # le SENS NORMAL ne changent jamais : ils determinent la
                    # lecture de toutes les ecritures passees.
                    if (existant.account_type != entree["account_type"]
                            or existant.normal_side != entree["normal_side"]):
                        self.stdout.write(self.style.ERROR(
                            f"  ! {entree['code']} : type ou sens divergent en base "
                            f"({existant.account_type}/{existant.normal_side}) vs "
                            f"definition ({entree['account_type']}/{entree['normal_side']}). "
                            "Intervention manuelle requise."
                        ))
                        continue
                    if existant.name != entree["name"] or existant.description != entree["description"]:
                        if not simulation:
                            LedgerAccount.objects.filter(pk=existant.pk).update(
                                name=entree["name"], description=entree["description"],
                            )
                        maj += 1
                        self.stdout.write(f"  ~ {entree['code']} (libelle actualise)")
                    else:
                        existants += 1
                        self.stdout.write(f"  = {entree['code']} {entree['name']}")
                    continue

                if simulation:
                    crees += 1
                    self.stdout.write(self.style.SUCCESS(
                        f"  + {entree['code']} {entree['name']} (serait cree)"))
                    continue

                LedgerAccount.objects.create(**entree)
                crees += 1
                self.stdout.write(self.style.SUCCESS(f"  + {entree['code']} {entree['name']}"))

            if simulation:
                transaction.set_rollback(True)

        self.stdout.write(
            f"\n{crees} compte(s) cree(s), {maj} actualise(s), {existants} inchange(s)."
        )

        if not simulation:
            reserves = LedgerAccount.objects.filter(is_reserved=True).count()
            dependants = LedgerAccount.objects.filter(
                psp_family=coa.FAMILY_PROVIDER).count()
            self.stdout.write(self.style.HTTP_INFO(
                f"\n{reserves} compte(s) reserve(s) — aucun mouvement autorise en Phase 1."
            ))
            self.stdout.write(self.style.WARNING(
                f"{dependants} compte(s) dependant(s) du prestataire — leur "
                "reconciliation est conditionnee au Jalon A."
            ))