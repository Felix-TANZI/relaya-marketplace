from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shipping", "0004_couriersosalert"),
    ]

    operations = [
        migrations.AddField(
            model_name="shipment",
            name="accepted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="shipment",
            name="penalty_notified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
