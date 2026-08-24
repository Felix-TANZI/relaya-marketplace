# backend/apps/payments/management/commands/escrow_tick.py
# Fait avancer les echeances de sequestre.
#
#   python manage.py escrow_tick --dry-run
#   python manage.py escrow_tick
#
# Deux passes :
#   1. Auto-confirmation — sequestres dont le delai sans litige est echu
#   2. Liberation        — ceux dont l'echeance post-confirmation est atteinte
#
# NECESSAIRE ET NON OPTIONNEL. CamPay ne notifie que sur SUCCESSFUL ou
# FAILED, et un acheteur peut simplement ne jamais confirmer sa reception.
# Sans auto-confirmation, un vendeur ne serait jamais paye.
#
# Idempotente : la relancer n'a aucun effet supplementaire.
# Sera portee par l'ordonnanceur au Lot 9.

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.payments.escrow.models import EscrowHold
from apps.payments.escrow.services import auto_confirm_due_holds, release_due_holds


class Command(BaseCommand):
    help = "Applique les echeances de sequestre (auto-confirmation, liberation)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--limit", type=int, default=200)

    def handle(self, *args, **options):
        maintenant = timezone.now()

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("MODE SIMULATION — aucune ecriture\n"))

            a_confirmer = EscrowHold.objects.filter(
                status=EscrowHold.Status.HELD,
                auto_confirm_at__isnull=False, auto_confirm_at__lte=maintenant,
            )
            a_liberer = EscrowHold.objects.filter(
                status=EscrowHold.Status.RELEASE_SCHEDULED,
                release_at__isnull=False, release_at__lte=maintenant,
            ).select_related("payee")

            self.stdout.write(self.style.HTTP_INFO("── Auto-confirmation ──"))
            for hold in a_confirmer[:options["limit"]]:
                self.stdout.write(
                    f"  {hold.reference}  {hold.component:16} "
                    f"{hold.net_amount_xaf:>9} XAF"
                )
            self.stdout.write(f"  Total : {a_confirmer.count()}")

            self.stdout.write(self.style.HTTP_INFO("\n── Liberation ──"))
            for hold in a_liberer[:options["limit"]]:
                self.stdout.write(
                    f"  {hold.reference}  {hold.component:16} "
                    f"{hold.payable_amount_xaf:>9} XAF  -> {hold.payee.payee_code}"
                )
            self.stdout.write(f"  Total : {a_liberer.count()}")
            return

        self.stdout.write(self.style.HTTP_INFO("── Auto-confirmation ──"))
        confirmation = auto_confirm_due_holds(limit=options["limit"], now=maintenant)
        self.stdout.write(
            f"  {confirmation['examines']} examine(s), "
            f"{confirmation['programmes']} programme(s), "
            f"{confirmation['erreurs']} erreur(s)"
        )

        self.stdout.write(self.style.HTTP_INFO("\n── Liberation ──"))
        liberation = release_due_holds(limit=options["limit"], now=maintenant)
        self.stdout.write(
            f"  {liberation['examines']} examine(s), "
            f"{liberation['liberes']} libere(s), "
            f"{liberation['erreurs']} erreur(s)"
        )
        if liberation["montant_xaf"]:
            montant = f"{liberation['montant_xaf']:,}".replace(",", " ")
            self.stdout.write(self.style.SUCCESS(f"  {montant} FCFA libere(s)."))

        if confirmation["erreurs"] or liberation["erreurs"]:
            self.stdout.write(self.style.WARNING(
                "\nDes erreurs sont survenues. Consulter les sequestres "
                "concernes dans l'administration."
            ))
        else:
            self.stdout.write(self.style.SUCCESS("\nEcheances traitees."))