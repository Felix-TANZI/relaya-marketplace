from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("shipping", "0003_shipmentmessage"),
    ]

    operations = [
        migrations.CreateModel(
            name="CourierSOSAlert",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("OPEN", "Ouverte"),
                            ("ACKNOWLEDGED", "Prise en charge"),
                            ("RESOLVED", "Resolue"),
                        ],
                        default="OPEN",
                        max_length=20,
                    ),
                ),
                ("message", models.TextField(blank=True, default="")),
                ("location", models.CharField(blank=True, default="", max_length=160)),
                ("latitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "courier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sos_alerts",
                        to="accounts.courierprofile",
                    ),
                ),
            ],
            options={
                "verbose_name": "Alerte SOS livreur",
                "verbose_name_plural": "Alertes SOS livreur",
                "ordering": ["-created_at"],
            },
        ),
    ]
