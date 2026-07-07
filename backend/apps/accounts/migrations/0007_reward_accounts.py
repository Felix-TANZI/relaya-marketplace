from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_usercart"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RewardAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("CLIENT", "Client"), ("VENDOR", "Vendeur"), ("COURIER", "Livreur"), ("RELAY", "Point Relais")], max_length=20)),
                ("points_balance", models.IntegerField(default=0)),
                ("lifetime_points", models.PositiveIntegerField(default=0)),
                ("trust_score", models.PositiveIntegerField(default=70)),
                ("tier", models.CharField(choices=[("BRONZE", "Bronze"), ("SILVER", "Argent"), ("GOLD", "Or"), ("PLATINUM", "Platine")], default="BRONZE", max_length=20)),
                ("last_recalculated_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reward_accounts", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Compte récompenses",
                "verbose_name_plural": "Comptes récompenses",
                "ordering": ["user_id", "role"],
                "unique_together": {("user", "role")},
            },
        ),
        migrations.CreateModel(
            name="RewardTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("delta", models.IntegerField()),
                ("source", models.CharField(choices=[("ORDER", "Commande"), ("REVIEW", "Avis"), ("DISPUTE", "Litige"), ("DELIVERY", "Livraison"), ("PROMOTION", "Promotion"), ("MANUAL", "Manuel")], default="MANUAL", max_length=20)),
                ("reason", models.CharField(max_length=180)),
                ("reference", models.CharField(blank=True, default="", max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("account", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="transactions", to="accounts.rewardaccount")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reward_transactions_created", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Transaction récompense",
                "verbose_name_plural": "Transactions récompenses",
                "ordering": ["-created_at"],
            },
        ),
    ]
