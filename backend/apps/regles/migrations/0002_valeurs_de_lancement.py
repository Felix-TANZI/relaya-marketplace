# Valeurs de lancement des 157 réglages r_… et des 23 tables t_… (BV-DEV-07, v2.1 du 18 octobre 2026).
# Ne crée que ce qui manque : une valeur déjà changée dans l'admin n'est jamais écrasée.

import json
from fractions import Fraction
from pathlib import Path

from django.db import migrations

FICHIER = Path(__file__).resolve().parents[1] / "donnees" / "BV-DEV-07_Donnees.json"


def charger(apps, schema_editor):
    Reglage = apps.get_model("regles", "Reglage")
    TableReglee = apps.get_model("regles", "TableReglee")
    d = json.loads(FICHIER.read_text(encoding="utf-8"))
    for nom, r in d["reglages"].items():
        v = r["valeur"]
        Reglage.objects.get_or_create(
            nom=nom,
            defaults={
                "valeur": v,
                "exact": str(Fraction(str(v))) if isinstance(v, float) else "",
                "unite": r["unite"],
                "libelle": r["libelle"],
                "regles": r.get("regles") or "",
            },
        )
    for nom, lignes in d["tables"].items():
        TableReglee.objects.get_or_create(nom=nom, defaults={"lignes": lignes})


class Migration(migrations.Migration):
    dependencies = [("regles", "0001_initial")]

    operations = [migrations.RunPython(charger, migrations.RunPython.noop)]
