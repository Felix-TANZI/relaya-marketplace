from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0024_product_variant"),
        ("orders", "0019_merge_20260707_2030"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="dispute",
            name="order_item",
            field=models.ForeignKey(blank=True, help_text="Article précis concerné par le litige. Requis pour les commandes multi-articles.", null=True, on_delete=django.db.models.deletion.CASCADE, related_name="disputes", to="orders.orderitem"),
        ),
        migrations.AddField(
            model_name="dispute",
            name="product",
            field=models.ForeignKey(blank=True, help_text="Snapshot relationnel du produit concerné, dérivé de order_item.", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="disputes", to="catalog.product"),
        ),
        migrations.AddField(
            model_name="dispute",
            name="vendor",
            field=models.ForeignKey(blank=True, help_text="Vendeur concerné par l'article litigieux.", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="vendor_disputes", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddIndex(
            model_name="dispute",
            index=models.Index(fields=["order_item", "opened_by", "status"], name="orders_disp_order_i_1bfe29_idx"),
        ),
    ]
