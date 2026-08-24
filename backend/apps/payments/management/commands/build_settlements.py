# backend/apps/payments/management/commands/build_settlements.py
# Construit les lots de reglement d'un cycle.
#
#   python manage.py build_settlements --dry-run
#   python manage.py build_settlements --cycle cycle-weekly-friday
#   python manage.py build_settlements --confirm
#
# Agrege les sequestres liberes et non encore regles, impute les ajustements
# dans la limite du plafond de retenue, et produit UN lot par beneficiaire.

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.payments.escrow.models import EscrowHold
from apps.payments.payees.models import PayeeAccount
from apps.payments.settlements.services import (
    build_batches_for_cycle,
    confirm_batch,
    exceptional_share,
)


class Command(BaseCommand):
    help = "Construit les lots de reglement du cycle."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--cycle", type=str, default="")
        parser.add_argument("--payee-type", type=str, default="")
        parser.add_argument("--confirm", action="store_true",
                            help="Confirme les lots produits (les fige).")

    def handle(self, *args, **options):
        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("MODE SIMULATION\n"))
            qs = PayeeAccount.objects.filter(is_active=True)
            if options["cycle"]:
                qs = qs.filter(settlement_cycle_key=options["cycle"])
            if options["payee_type"]:
                qs = qs.filter(payee_type=options["payee_type"])

            total = 0
            for beneficiaire in qs:
                liberes = EscrowHold.objects.filter(
                    payee=beneficiaire, status=EscrowHold.Status.RELEASED,
                    settlement_batch_ref="",
                )
                montant = sum(h.payable_amount_xaf for h in liberes)
                if montant:
                    total += montant
                    self.stdout.write(
                        f"  {beneficiaire.payee_code:20} "
                        f"{liberes.count():>3} sequestre(s)  {montant:>10} XAF"
                    )
            self.stdout.write(f"\n  Total a regler : {total} XAF")
            return

        lots = build_batches_for_cycle(
            cycle_key=options["cycle"], payee_type=options["payee_type"],
        )
        if not lots:
            self.stdout.write("Aucun lot a produire.")
            return

        self.stdout.write(self.style.HTTP_INFO(f"── {len(lots)} lot(s) produit(s) ──"))
        for lot in lots:
            retenue = f"  retenue {-lot.adjustments_xaf}" if lot.adjustments_xaf < 0 else ""
            self.stdout.write(
                f"  {lot.reference}  {lot.payee.payee_code:20} "
                f"brut {lot.gross_amount_xaf:>9}  net {lot.net_amount_xaf:>9}{retenue}"
            )
            if options["confirm"]:
                try:
                    confirm_batch(lot)
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f"    {exc}"))

        part = exceptional_share()
        if part["alert"]:
            self.stdout.write(self.style.ERROR(
                f"\nALERTE : {part['share_by_amount_percent']} % des montants "
                f"regles le sont hors cycle (seuil {part['alert_threshold_percent']} %).\n"
                "Le modele s'apparente de fait a un portefeuille — "
                "exposition reglementaire."
            ))