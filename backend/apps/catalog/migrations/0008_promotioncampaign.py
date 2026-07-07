from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0007_product_promo_sku_attributes"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PromotionCampaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("campaign_type", models.CharField(choices=[("REGULAR", "Promotion régulière"), ("FLASH", "Flash Deal")], default="REGULAR", max_length=12)),
                ("status", models.CharField(choices=[("DRAFT", "Brouillon"), ("PENDING", "En attente"), ("APPROVED", "Approuvée"), ("REJECTED", "Rejetée"), ("SUSPENDED", "Suspendue"), ("EXPIRED", "Expirée")], default="PENDING", max_length=12)),
                ("title", models.CharField(max_length=160)),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("reference_price_xaf", models.PositiveIntegerField()),
                ("promo_price_xaf", models.PositiveIntegerField()),
                ("stock_reserved", models.PositiveIntegerField(default=0)),
                ("stock_claimed", models.PositiveIntegerField(default=0)),
                ("placement_fee_xaf", models.PositiveIntegerField(default=0)),
                ("commission_uplift_points", models.PositiveIntegerField(default=0)),
                ("rejection_reason", models.TextField(blank=True, default="")),
                ("admin_note", models.TextField(blank=True, default="")),
                ("approved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="approved_promotions", to=settings.AUTH_USER_MODEL)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="promotion_campaigns", to="catalog.product")),
                ("requested_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="requested_promotions", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Campagne promotionnelle",
                "verbose_name_plural": "Campagnes promotionnelles",
                "ordering": ["-starts_at", "-created_at"],
            },
        ),
    ]
