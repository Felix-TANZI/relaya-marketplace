# Generated manually for courier relation on shipments

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_courierprofile"),
        ("shipping", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="shipment",
            name="courier",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="shipments",
                to="accounts.courierprofile",
            ),
        ),
    ]
