from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_reward_accounts"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DeliveryOrganizationProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("company_name", models.CharField(max_length=160)),
                ("manager_name", models.CharField(blank=True, default="", max_length=120)),
                ("phone", models.CharField(max_length=20)),
                ("city", models.CharField(blank=True, default="", max_length=80)),
                ("zones", models.JSONField(blank=True, default=list)),
                ("address", models.CharField(blank=True, default="", max_length=255)),
                ("contract_reference", models.CharField(blank=True, default="", max_length=120)),
                ("status", models.CharField(choices=[("PENDING", "En attente"), ("APPROVED", "Approuvee"), ("SUSPENDED", "Suspendue")], default="PENDING", max_length=20)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="delivery_organization_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Organisation de livraison",
                "verbose_name_plural": "Organisations de livraison",
                "ordering": ["company_name"],
            },
        ),
    ]
