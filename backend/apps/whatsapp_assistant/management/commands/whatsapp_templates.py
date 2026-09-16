# backend/apps/whatsapp_assistant/management/commands/whatsapp_templates.py
# Soumet à Meta les modèles de message des livreurs, et montre où en est leur
# validation. Meta met de quelques minutes à quelques heures à répondre ; tant
# qu'un modèle n'est pas APPROVED, le livreur ne reçoit rien.
#
#   python manage.py whatsapp_templates            # état des modèles
#   python manage.py whatsapp_templates --submit   # les envoyer pour validation

from django.core.management.base import BaseCommand, CommandError

from apps.whatsapp_assistant.conf import get_config
from apps.whatsapp_assistant.message_templates import definitions
from apps.whatsapp_assistant.providers import ProviderError, get_provider

STATUS_MARK = {"APPROVED": "OK", "PENDING": "..", "REJECTED": "KO", "PAUSED": "||"}


def _body(template: dict) -> str:
    """Le texte du corps d'un modele, local ou tel que Meta le connait."""
    for component in template.get("components", []):
        if component.get("type", "").upper() == "BODY":
            return component.get("text", "")
    return ""


class Command(BaseCommand):
    help = "Affiche ou soumet les modèles de message WhatsApp (livreurs)."

    def add_arguments(self, parser):
        parser.add_argument("--submit", action="store_true", help="Soumettre les modèles manquants à Meta.")
        parser.add_argument("--force", action="store_true", help="Resoumettre même ceux qui existent déjà.")

    def handle(self, *args, **options):
        config = get_config()
        if not config.business_account_id:
            raise CommandError(
                "WHATSAPP_BUSINESS_ACCOUNT_ID est absent du .env.\n"
                "Meta le donne dans « WhatsApp > Configuration de l'API » sous « Identifiant du compte "
                "WhatsApp Business ». Ajoutez-le, puis relancez le conteneur backend."
            )
        provider = get_provider(config)
        wanted = definitions(config.courier_app_url)

        try:
            existing = {(item.get("name"), item.get("language")): item for item in provider.list_templates()}
        except ProviderError as error:
            raise CommandError(f"Meta n'a pas répondu : {error}") from error

        self.stdout.write(self.style.MIGRATE_HEADING("Modèles attendus"))
        for definition in wanted:
            key = (definition["name"], definition["language"])
            current = existing.get(key)
            status = current.get("status", "?") if current else "ABSENT"
            self.stdout.write(f"  [{STATUS_MARK.get(status, '  ')}] {key[0]} ({key[1]}) : {status}")
            if current and current.get("rejected_reason") not in (None, "NONE"):
                self.stdout.write(self.style.WARNING(f"        motif de refus : {current['rejected_reason']}"))
            if current and _body(current) and _body(current) != _body(definition):
                self.stdout.write(self.style.WARNING(
                    "        le texte chez Meta ne correspond plus au texte local "
                    "(--force pour le resoumettre, avec une nouvelle validation a attendre)"
                ))

        if not options["submit"]:
            self.stdout.write("\nRien envoyé. Ajoutez --submit pour soumettre les modèles manquants.")
            return

        sent = 0
        for definition in wanted:
            key = (definition["name"], definition["language"])
            if key in existing and not options["force"]:
                continue
            try:
                result = provider.create_template(definition)
            except ProviderError as error:
                self.stdout.write(self.style.ERROR(f"  {key[0]} ({key[1]}) refusé : {error}"))
                continue
            sent += 1
            self.stdout.write(self.style.SUCCESS(
                f"  {key[0]} ({key[1]}) soumis : {result.get('status', 'PENDING')}"
            ))

        if sent:
            self.stdout.write(
                "\nMeta valide en général en quelques minutes. Relancez la commande sans --submit "
                "pour suivre, ou regardez « Modèles de message » dans le gestionnaire WhatsApp."
            )
        else:
            self.stdout.write("\nTous les modèles existent déjà (--force pour les resoumettre).")
