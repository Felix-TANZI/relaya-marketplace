from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0017_merge_0016_dispute_can_reply_flags_0016_order_delivery_method"),
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
                    ("SYSTEM", "Système"),
                ],
                default="ADMIN",
                max_length=10,
                verbose_name="Rôle de l'expéditeur",
            ),
        ),
    ]
