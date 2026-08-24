from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shipping", "0009_shipmentevidence"),
    ]

    operations = [
        migrations.AlterField(
            model_name="shipment",
            name="status",
            field=models.CharField(
                choices=[
                    ("CREATED", "Created"),
                    ("WAITING_MANUAL_ASSIGNMENT", "Waiting manual assignment"),
                    ("ZONE_UNCOVERED", "Zone uncovered"),
                    ("CAPACITY_BLOCKED", "Capacity blocked"),
                    ("VEHICLE_INCOMPATIBLE", "Vehicle incompatible"),
                    ("VALUE_LIMIT_EXCEEDED", "Parcel value exceeds courier trust tier"),
                    ("ASSIGNED", "Assigned"),
                    ("PICKED_UP", "Picked up"),
                    ("IN_TRANSIT", "In transit"),
                    ("OUT_FOR_DELIVERY", "Out for delivery"),
                    ("DELIVERED", "Delivered"),
                    ("FAILED", "Failed"),
                    ("CANCELLED", "Cancelled"),
                ],
                default="CREATED",
                max_length=32,
            ),
        ),
    ]
