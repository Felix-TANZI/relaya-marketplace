import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("publicite", "0002_lieu_vente_flash")]

    operations = [
        migrations.CreateModel(
            name="Signalement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("client", models.CharField(max_length=64)),
                (
                    "motif",
                    models.CharField(
                        choices=[
                            ("trompeuse", "Trompeuse ou prix faux"),
                            ("inappropriee", "Choquante ou inappropriée"),
                            ("interdit", "Produit interdit ou contrefait"),
                            ("repetitive", "Trop souvent affichée"),
                            ("autre", "Autre"),
                        ],
                        max_length=14,
                    ),
                ),
                ("a", models.DateTimeField()),
                ("traite", models.BooleanField(default=False)),
                (
                    "campagne",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="signalements", to="publicite.campagne"),
                ),
            ],
            options={"ordering": ["-a"]},
        ),
        migrations.AddConstraint(
            model_name="signalement",
            constraint=models.UniqueConstraint(fields=("campagne", "client"), name="pub_un_signalement_par_client"),
        ),
    ]
