"""Les commandes de préférence d'un écran généré (data-act="set-lang|set-theme|set-text") suivent la
préférence en cours : la classe « on » n'est plus écrite en dur, elle dépend de langue, thème ou taille.
  python3 outils/preferences_actives.py <fichier.tsx>…"""
import re
import sys
from pathlib import Path

VARIABLE = {"set-lang": "langue", "set-theme": "theme", "set-text": "taille"}
for fichier in sys.argv[1:]:
    s = Path(fichier).read_text(encoding="utf-8")
    utilisees = set()

    def remplace(m, utilisees=utilisees):
        act, v, classes = m.group(1), m.group(2), m.group(3).split()
        var = VARIABLE[act]
        utilisees.add(var)
        autres = " ".join(c for c in classes if c != "on")
        expr = f"{var} === '{v}' ? '{(autres + ' on').strip()}' : '{autres}'"
        return f'data-act="{act}" data-v="{v}" className={{{expr}}}'

    s2 = re.sub(r'data-act="(set-lang|set-theme|set-text)" data-v="(\w+)" className="([^"]*)"', remplace, s)
    if utilisees:
        def prefs(m, utilisees=utilisees):
            noms = [n.strip() for n in m.group(1).split(",")]
            noms += [u for u in sorted(utilisees) if u not in noms]
            return "const { " + ", ".join(noms) + " } = usePreferences()"
        s2 = re.sub(r"const \{ ([^}]*) \} = usePreferences\(\)", prefs, s2)
    Path(fichier).write_text(s2, encoding="utf-8")
    print(f"{fichier} : {sorted(utilisees)}")
