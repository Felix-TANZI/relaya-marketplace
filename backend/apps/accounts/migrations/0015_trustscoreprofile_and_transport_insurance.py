from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0014_compliancedocument"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="deliveryorganizationprofile",
            name="transport_insurance_verified",
            field=models.BooleanField(
                default=False,
                help_text="Obligatoire pour confier sans plafond un colis à un livreur de palier Or.",
            ),
        ),
        migrations.CreateModel(
            name="TrustScoreProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("VENDOR", "Vendeur"), ("COURIER", "Livreur"), ("RELAY_POINT", "Point relais")], max_length=20)),
                ("score", models.DecimalField(decimal_places=2, default=70, max_digits=5)),
                ("tier", models.CharField(choices=[("NEW", "Nouveau"), ("CONFIRMED", "Confirmé"), ("GOLD", "Or")], default="NEW", max_length=20)),
                ("candidate_tier", models.CharField(blank=True, choices=[("NEW", "Nouveau"), ("CONFIRMED", "Confirmé"), ("GOLD", "Or")], default="", max_length=20)),
                ("candidate_since", models.DateTimeField(blank=True, null=True)),
                ("veto_active", models.BooleanField(default=False)),
                ("veto_reason", models.CharField(blank=True, default="", max_length=255)),
                ("breakdown", models.JSONField(blank=True, default=dict)),
                ("sample_size", models.PositiveIntegerField(default=0)),
                ("calculated_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="trust_score_profiles", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["role", "-score"]},
        ),
        migrations.AddConstraint(
            model_name="trustscoreprofile",
            constraint=models.UniqueConstraint(fields=("user", "role"), name="unique_trust_score_user_role"),
        ),
    ]
