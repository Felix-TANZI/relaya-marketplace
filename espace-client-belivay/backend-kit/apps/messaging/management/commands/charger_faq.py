# backend/apps/messaging/management/commands/charger_faq.py
# Charge les questions fréquentes (ThemeFaq, QuestionFaq) :
#
#     python manage.py charger_faq                          # apps/messaging/donnees/faq.json (livré avec le kit)
#     python manage.py charger_faq --fichier faq-en.json --langue en
#     python manage.py charger_faq --depuis-ts ../site/src/demo/faq.ts --ecrire-json apps/messaging/donnees/faq.json
#
# Le JSON a la forme ThemeFaq[] du site (site/src/donnees/source.ts). --depuis-ts relit le fichier de démonstration
# du site (littéral TypeScript : clés sans guillemets, virgules finales, appels chemin('…')) sans exécuter de code.
# Les thèmes de la langue sont remplacés en entier (l'équipe support édite ensuite dans l'admin).

import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.messaging.models import QuestionFaq, ThemeFaq

DEFAUT = Path(__file__).resolve().parents[2] / "donnees" / "faq.json"


def ts_vers_json(source: str) -> list[dict]:
    """Le tableau `export const FAQ: ThemeFaq[] = [ … ]` de site/src/demo/faq.ts, en données Python."""
    debut = source.find("export const FAQ")
    if debut < 0:
        raise ValueError("« export const FAQ » introuvable")
    corps = source[source.index("=", debut) + 1 :]
    # Constantes du fichier (« const INFOS_DIASPORA = chemin('diaspora-infos') ») et appels chemin('x') → "/x".
    constantes = dict(re.findall(r"const (\w+) = chemin\('([\w-]+)'\)", source))
    sortie, i, n = [], 0, len(corps)
    while i < n:
        c = corps[i]
        if c == '"':
            j = i + 1
            while corps[j] != '"':
                j += 2 if corps[j] == "\\" else 1
            sortie.append(corps[i : j + 1])
            i = j + 1
        elif c.isalpha() or c == "_":
            j = i
            while j < n and (corps[j].isalnum() or corps[j] == "_"):
                j += 1
            mot = corps[i:j]
            reste = corps[j:].lstrip()
            if mot == "chemin":
                m = re.match(r"\(\s*'([\w-]+)'\s*\)", reste)
                sortie.append(json.dumps("/" + m.group(1)))
                j = len(corps) - len(reste) + m.end()
            elif reste.startswith(":"):
                sortie.append(json.dumps(mot))
            elif mot in constantes:
                sortie.append(json.dumps("/" + constantes[mot]))
            else:
                sortie.append(mot)  # true, false, null
            i = j
        else:
            sortie.append(c)
            i += 1
    texte = "".join(sortie)
    texte = re.sub(r",(\s*[}\]])", r"\1", texte)  # virgules finales
    return json.JSONDecoder().raw_decode(texte.strip())[0]


@transaction.atomic
def charger(themes: list[dict], langue: str = "fr") -> tuple[int, int]:
    ThemeFaq.objects.filter(langue=langue).delete()
    nq = 0
    for ordre, t in enumerate(themes):
        theme = ThemeFaq.objects.create(cle=t["cle"], langue=langue, titre=t["titre"], icone=t.get("icone", ""), ordre=ordre)
        for k, q in enumerate(t["questions"]):
            lien = q.get("lien") or {}
            module = q.get("module") or {}
            QuestionFaq.objects.create(
                theme=theme,
                ordre=k,
                question=q["q"],
                reponse=q["r"],
                lien_texte=lien.get("texte", ""),
                lien_vers=lien.get("vers", ""),
                module_ff=module.get("ff", ""),
                module_ouvert=module.get("ouvert") if module else None,
            )
            nq += 1
    return len(themes), nq


class Command(BaseCommand):
    help = "Charge les questions fréquentes (JSON ThemeFaq[] ou site/src/demo/faq.ts)."

    def add_arguments(self, parser):
        parser.add_argument("--fichier", default=str(DEFAUT))
        parser.add_argument("--depuis-ts", dest="ts", default=None)
        parser.add_argument("--ecrire-json", dest="ecrire", default=None)
        parser.add_argument("--langue", default="fr")

    def handle(self, *args, fichier, ts, ecrire, langue, **options):
        try:
            if ts:
                themes = ts_vers_json(Path(ts).read_text(encoding="utf-8"))
            else:
                themes = json.loads(Path(fichier).read_text(encoding="utf-8"))
        except (OSError, ValueError, AttributeError) as e:
            raise CommandError(f"Questions fréquentes illisibles : {e}") from e
        if ecrire:
            Path(ecrire).write_text(json.dumps(themes, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        nt, nq = charger(themes, langue)
        self.stdout.write(self.style.SUCCESS(f"{nt} thèmes, {nq} questions ({langue})."))
