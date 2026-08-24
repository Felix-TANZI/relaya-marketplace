from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0013_delivery_fleet_management"),
    ]

    operations = [
        migrations.CreateModel(
            name="ComplianceDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("owner_role", models.CharField(choices=[("DELIVERY_ORGANIZATION", "Organisation livraison"), ("RELAY_POINT", "Point relais")], max_length=30)),
                ("document_type", models.CharField(max_length=60)),
                ("file", models.FileField(upload_to="compliance/%Y/%m/")),
                ("status", models.CharField(choices=[("PENDING", "En cours de vérification"), ("APPROVED", "Validé"), ("REJECTED", "Rejeté")], default="PENDING", max_length=20)),
                ("review_note", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="compliance_documents", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.AddConstraint(
            model_name="compliancedocument",
            constraint=models.UniqueConstraint(fields=("user", "owner_role", "document_type"), name="unique_role_compliance_document"),
        ),
    ]
