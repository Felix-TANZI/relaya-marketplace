from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0024_product_variant"),
        ("orders", "0020_dispute_order_item_target"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="productreview",
            unique_together=set(),
        ),
        migrations.AddField(
            model_name="productreview",
            name="order_item",
            field=models.OneToOneField(blank=True, help_text="Article de commande vérifiant l'achat réel du produit noté.", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="review", to="orders.orderitem"),
        ),
        migrations.AddIndex(
            model_name="productreview",
            index=models.Index(fields=["user", "-created_at"], name="product_rev_user_id_3f1601_idx"),
        ),
        migrations.AddConstraint(
            model_name="productreview",
            constraint=models.UniqueConstraint(condition=models.Q(("order_item__isnull", False)), fields=("order_item",), name="uniq_review_per_order_item"),
        ),
    ]
