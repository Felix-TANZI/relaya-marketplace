from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0014_shop_plans_certifications"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "ALTER TABLE orders_order "
                "ADD COLUMN IF NOT EXISTS delivery_method varchar(20) "
                "NOT NULL DEFAULT 'DELIVERY';"
            ),
            reverse_sql=(
                "ALTER TABLE orders_order "
                "DROP COLUMN IF EXISTS delivery_method;"
            ),
        ),
    ]
