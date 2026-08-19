from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0023_platformsettings_evidence_retention_days"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="address_precision",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Adresse structurée pour aider le livreur: quartier, repères, score et instruction.",
                verbose_name="Analyse de précision adresse",
            ),
        ),
    ]
