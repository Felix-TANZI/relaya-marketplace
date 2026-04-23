# Generated manually for courier profiles

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_userfavorite_usernotification"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CourierProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("phone", models.CharField(max_length=20)),
                ("city", models.CharField(max_length=80)),
                ("zones", models.JSONField(blank=True, default=list)),
                (
                    "vehicle_type",
                    models.CharField(
                        choices=[
                            ("MOTORBIKE", "Moto"),
                            ("CAR", "Voiture"),
                            ("BIKE", "Velo"),
                            ("TRICYCLE", "Tricycle"),
                            ("VAN", "Camionnette"),
                        ],
                        default="MOTORBIKE",
                        max_length=20,
                    ),
                ),
                ("id_card", models.CharField(max_length=120)),
                ("is_active", models.BooleanField(default=True)),
                ("is_approved", models.BooleanField(default=False)),
                ("is_online", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="courier_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Profil livreur",
                "verbose_name_plural": "Profils livreurs",
                "ordering": ["-created_at"],
            },
        ),
    ]
