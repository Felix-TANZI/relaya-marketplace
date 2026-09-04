from django.core.management.base import BaseCommand

from apps.shipping.tournees import compose_all_tournees


class Command(BaseCommand):
    help = (
        "Compose les tournées par zone : regroupe les colis en attente une fois "
        "le seuil atteint, ou force la sortie après deux créneaux d'attente "
        "(Règles_Systeme_DEV v2.0 §5, règle verrouillée n°10). À planifier "
        "périodiquement (cron / tâche planifiée) — non déclenché automatiquement."
    )

    def handle(self, *args, **options):
        tournees = compose_all_tournees()
        forced = sum(1 for t in tournees if t.is_forced_exit)
        self.stdout.write(self.style.SUCCESS(
            f"{len(tournees)} tournée(s) composée(s), dont {forced} sortie(s) forcée(s)."
        ))
