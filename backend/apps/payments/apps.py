from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"

    def ready(self):
        from apps.payments.config import admin  # noqa: F401
        from apps.payments.ledger import admin as ledger_admin  # noqa: F401
        from apps.payments.payees import admin as payees_admin  # noqa: F401
        from apps.payments.intents import admin as intents_admin  # noqa: F401
        from apps.payments.webhooks import admin as webhooks_admin  # noqa: F401
        from apps.payments.escrow import admin as escrow_admin  # noqa: F401
        from apps.payments.settlements import admin as settlements_admin  # noqa: F401
        from apps.payments.tasks import admin as tasks_admin  # noqa: F401
        from apps.payments import tasks as _tasks  # noqa: F401  enregistre les tâches
        from apps.payments.reconciliation import admin as rec_admin  # noqa: F401
        from apps.payments.risk import admin as risk_admin  # noqa: F401

        from apps.payments.bridge import signals as payments_signals
        payments_signals.register()
