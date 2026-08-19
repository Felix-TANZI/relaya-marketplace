from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def seed_external_services(apps, schema_editor):
    ExternalService = apps.get_model("common", "ExternalService")
    defaults = [
        ("openstreetmap-tiles", "Fond de carte OpenStreetMap/auto-heberge", "OpenStreetMap/Protomaps", "MAPS"),
        ("osrm-routing", "Calcul itineraires livreur", "OSRM", "ROUTING"),
        ("africastalking-sms", "SMS transactionnels", "Africa's Talking", "SMS"),
        ("brevo-email", "Emails transactionnels", "Brevo", "EMAIL"),
        ("campay-payments", "Paiements et escrow", "CamPay", "PAYMENT"),
        ("cloudflare-r2", "Stockage sauvegardes et medias", "Cloudflare R2", "STORAGE"),
        ("openrouter-ai", "Assistant catalogue IA", "OpenRouter", "AI"),
    ]
    for key, name, provider, service_type in defaults:
        ExternalService.objects.get_or_create(
            key=key,
            defaults={
                "name": name,
                "provider": provider,
                "service_type": service_type,
                "is_enabled": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ExternalService",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("key", models.SlugField(max_length=80, unique=True)),
                ("name", models.CharField(max_length=120)),
                ("provider", models.CharField(blank=True, default="", max_length=120)),
                ("service_type", models.CharField(choices=[("MAPS", "Carte"), ("ROUTING", "Itineraire"), ("LOCATION", "Localisation"), ("SMS", "SMS"), ("EMAIL", "Email"), ("PAYMENT", "Paiement"), ("STORAGE", "Stockage"), ("AI", "IA"), ("OTHER", "Autre")], default="OTHER", max_length=20)),
                ("is_enabled", models.BooleanField(default=True)),
                ("unit_cost_xaf", models.DecimalField(decimal_places=4, default=0, max_digits=12)),
                ("monthly_budget_xaf", models.PositiveIntegerField(default=0)),
                ("hard_disable_on_budget", models.BooleanField(default=False)),
                ("notes", models.TextField(blank=True, default="")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Service externe",
                "verbose_name_plural": "Services externes",
                "ordering": ["service_type", "name"],
            },
        ),
        migrations.CreateModel(
            name="ApiUsageEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("endpoint", models.CharField(blank=True, default="", max_length=255)),
                ("method", models.CharField(blank=True, default="", max_length=12)),
                ("units", models.PositiveIntegerField(default=1)),
                ("estimated_cost_xaf", models.DecimalField(decimal_places=4, default=0, max_digits=12)),
                ("status_code", models.PositiveIntegerField(blank=True, null=True)),
                ("success", models.BooleanField(default=True)),
                ("meta", models.JSONField(blank=True, default=dict)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("service", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="usage_events", to="common.externalservice")),
            ],
            options={
                "verbose_name": "Consommation API",
                "verbose_name_plural": "Consommations API",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="apiusageevent",
            index=models.Index(fields=["service", "-created_at"], name="common_apiu_service_d4f6d5_idx"),
        ),
        migrations.AddIndex(
            model_name="apiusageevent",
            index=models.Index(fields=["success", "-created_at"], name="common_apiu_success_461a17_idx"),
        ),
        migrations.RunPython(seed_external_services, migrations.RunPython.noop),
    ]
