from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("vendeur_croissance", "0002_ventes_flash")]

    operations = [
        migrations.AlterField(
            model_name="venteflash",
            name="origine",
            field=models.CharField(
                choices=[("vendeur", "Vendeur"), ("merite", "Merite"), ("selection", "Selection")], default="vendeur", max_length=10
            ),
        ),
    ]
