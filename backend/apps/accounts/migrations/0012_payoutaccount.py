from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_delivery_capacity_vehicle"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PayoutAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("owner_role", models.CharField(choices=[("VENDOR", "Vendeur"), ("COURIER", "Livreur"), ("DELIVERY_ORGANIZATION", "Organisation livraison"), ("RELAY_POINT", "Point relais")], max_length=30)),
                ("label", models.CharField(blank=True, default="", max_length=120)),
                ("phone_e164", models.CharField(max_length=20)),
                ("national_number", models.CharField(max_length=12)),
                ("operator", models.CharField(max_length=20)),
                ("status", models.CharField(choices=[("PENDING_VERIFICATION", "Verification requise"), ("VERIFIED", "Verifie"), ("DISABLED", "Desactive")], default="PENDING_VERIFICATION", max_length=30)),
                ("is_primary", models.BooleanField(default=False)),
                ("verification_code_hash", models.CharField(blank=True, default="", max_length=160)),
                ("verification_expires_at", models.DateTimeField(blank=True, null=True)),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("last_sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payout_accounts", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Compte de versement",
                "verbose_name_plural": "Comptes de versement",
                "ordering": ["-is_primary", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="payoutaccount",
            index=models.Index(fields=["user", "owner_role", "status"], name="accounts_pa_user_id_1906da_idx"),
        ),
        migrations.AddConstraint(
            model_name="payoutaccount",
            constraint=models.UniqueConstraint(fields=("user", "owner_role", "phone_e164"), name="uniq_payout_account_phone_per_role"),
        ),
    ]
