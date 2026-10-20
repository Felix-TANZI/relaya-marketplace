# Questions d'aide du vendeur (VD11-R63) chargées depuis donnees/aide.json (copie de espace-vendeur/src/demo/aide.ts).
import json
from pathlib import Path

from django.db import migrations


def charger(apps, schema_editor):
    Question = apps.get_model("vendeur_boutique", "QuestionAideVendeur")
    d = json.loads((Path(__file__).resolve().parent.parent / "donnees" / "aide.json").read_text(encoding="utf-8"))
    for i, q in enumerate(d["questions"], start=1):
        mots = " ".join(d["interdits"]) if q.get("mots") == "interdits" else q.get("mots", "")
        Question.objects.update_or_create(
            cle=q["cle"],
            defaults={
                "ordre": i,
                "theme": q["theme"],
                "question": q["question"],
                "reponse": q["reponse"],
                "calcul": q.get("calcul", ""),
                "ecran": q.get("ecran", ""),
                "lien": q.get("lien", ""),
                "mots": mots,
            },
        )


class Migration(migrations.Migration):
    dependencies = [("vendeur_boutique", "0001_initial")]

    operations = [migrations.RunPython(charger, migrations.RunPython.noop)]
