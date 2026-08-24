from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0020_dispute_order_item_target"),
    ]

    operations = [
        migrations.AlterField(
            model_name="disputemessage",
            name="sender_role",
            field=models.CharField(
                choices=[
                    ("VENDOR", "Vendeur"),
                    ("ADMIN", "Admin BelivaY"),
                    ("CLIENT", "Client"),
                    ("COURIER", "Livreur"),
                    ("LOGISTICS", "Organisation logistique"),
                    ("SYSTEM", "Système"),
                ],
                default="ADMIN",
                max_length=10,
                verbose_name="Rôle de l'expéditeur",
            ),
        ),
    ]
