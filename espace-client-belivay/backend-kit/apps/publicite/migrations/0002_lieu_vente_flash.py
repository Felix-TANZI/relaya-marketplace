from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("publicite", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="campagne",
            name="lieu",
            field=models.CharField(blank=True, default="", help_text="clic : recherche | categorie ; vide : les deux", max_length=10),
        ),
        migrations.AddField(
            model_name="campagne",
            name="vente_flash_id",
            field=models.PositiveBigIntegerField(
                blank=True, null=True, help_text="vendeur_croissance.VenteFlash (Promotions, prix payé) créée à la sélection"
            ),
        ),
    ]
