# Valeurs initiales des contenus de l'accueil : celles du site (donnees/accueil.json). Les rubriques déjà remplies
# sont gardées ; `manage.py charger_contenus --remplacer` revient au contenu du site.
import json
from pathlib import Path

from django.db import migrations

ACCUEIL = Path(__file__).resolve().parent.parent / "donnees" / "accueil.json"


def charger(apps, schema_editor):
    d = json.loads(ACCUEIL.read_text(encoding="utf-8"))
    Bandeau = apps.get_model("contenus", "BandeauAccueil")
    Categorie = apps.get_model("contenus", "CategorieAccueil")
    Carte = apps.get_model("contenus", "CarteConfiance")
    Reglages = apps.get_model("contenus", "ReglagesAccueil")
    if not Bandeau.objects.exists():
        for i, b in enumerate(d["carrousel"]):
            Bandeau.objects.create(ordre=i, lien=b["lien"], titre=b["titre"], sous=b["sous"], produits=b["produits"], dessin=b["dessin"])
    if not Categorie.objects.exists():
        for i, c in enumerate(d["categories"]):
            Categorie.objects.create(ordre=i, lien=c["lien"], titre=c["titre"], dessin=c["dessin"])
    if not Carte.objects.exists():
        for i, c in enumerate(d["confiance"]["cartes"]):
            Carte.objects.create(
                ordre=i, lien=c["lien"], icone=c["icone"], ton=c["ton"], titre=c["titre"], texte=c["texte"], action=c["action"]
            )
    if not Reglages.objects.exists():
        Reglages.objects.create(
            flash_titre=d["flash"]["titre"],
            flash_sous_titre=d["flash"]["sousTitre"],
            confiance_question=d["confiance"]["question"],
            confiance_marque=d["confiance"]["marque"],
        )


class Migration(migrations.Migration):
    dependencies = [("contenus", "0001_initial")]

    operations = [migrations.RunPython(charger, migrations.RunPython.noop)]
