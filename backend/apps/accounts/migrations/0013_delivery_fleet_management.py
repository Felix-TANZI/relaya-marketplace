from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0012_payoutaccount"),
    ]

    operations = [
        migrations.AddField(
            model_name="courierprofile",
            name="availability_status",
            field=models.CharField(
                choices=[
                    ("AVAILABLE", "Disponible"),
                    ("ABSENT", "Absent"),
                    ("LEAVE", "En congé"),
                    ("SUSPENDED", "Suspendu"),
                ],
                default="AVAILABLE",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="courierprofile",
            name="availability_note",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.CreateModel(
            name="DeliveryVehicle",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=120)),
                ("registration", models.CharField(max_length=40)),
                ("vehicle_type", models.CharField(choices=[("MOTORBIKE", "Moto"), ("CAR", "Voiture"), ("BIKE", "Velo"), ("TRICYCLE", "Tricycle"), ("VAN", "Camionnette")], max_length=20)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("assigned_courier", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_company_vehicle", to="accounts.courierprofile")),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="vehicles", to="accounts.deliveryorganizationprofile")),
            ],
            options={"ordering": ["label"]},
        ),
        migrations.AddConstraint(
            model_name="deliveryvehicle",
            constraint=models.UniqueConstraint(fields=("organization", "registration"), name="unique_org_vehicle_registration"),
        ),
    ]
