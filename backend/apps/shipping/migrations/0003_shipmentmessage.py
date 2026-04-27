import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shipping", "0002_shipment_courier"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ShipmentMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("channel", models.CharField(choices=[("CLIENT", "Client"), ("VENDOR", "Vendeur"), ("SUPPORT", "Support")], max_length=16)),
                ("sender_role", models.CharField(choices=[("COURIER", "Livreur"), ("SYSTEM", "Systeme")], default="COURIER", max_length=16)),
                ("message", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shipment_messages", to=settings.AUTH_USER_MODEL)),
                ("shipment", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="shipping.shipment")),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
    ]
