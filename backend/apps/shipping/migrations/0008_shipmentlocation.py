import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0012_payoutaccount"),
        ("shipping", "0007_assignment_and_relayparcel"),
    ]

    operations = [
        migrations.CreateModel(
            name="ShipmentLocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("latitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("longitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("accuracy_m", models.FloatField(blank=True, null=True)),
                ("speed_mps", models.FloatField(blank=True, null=True)),
                ("heading_deg", models.FloatField(blank=True, null=True)),
                ("source", models.CharField(choices=[("DEVICE", "Appareil livreur"), ("SIMULATION", "Simulation locale")], default="DEVICE", max_length=16)),
                ("captured_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("courier", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shipment_locations", to="accounts.courierprofile")),
                ("shipment", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="locations", to="shipping.shipment")),
            ],
            options={
                "ordering": ["captured_at", "id"],
                "indexes": [
                    models.Index(fields=["shipment", "-captured_at"], name="shipping_lo_shipmen_4ea9a9_idx"),
                    models.Index(fields=["courier", "-captured_at"], name="shipping_lo_courier_1be985_idx"),
                ],
            },
        ),
    ]
