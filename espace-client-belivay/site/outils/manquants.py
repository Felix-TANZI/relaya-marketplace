"""Textes français sans traduction anglaise (DP-54) : python3 outils/manquants.py fichier.tsx… → JSON à traduire."""

import json
import re
import sys

cle = lambda x: re.sub(r"[\s  ]+", " ", x).strip()  # noqa: E731
connus = set()
for f in ["src/i18n/en-complements.json", "src/genere/en.json", "src/genere/en-etats.json"]:
    connus |= {cle(k) for k in json.load(open(f, encoding="utf-8"))}
manque = []
for f in sys.argv[1:]:
    s = open(f, encoding="utf-8").read()
    for x in re.findall(r"\bt[f]?\(\s*'((?:[^'\\]|\\.)*)'", s) + re.findall(r'\bt[f]?\(\s*"((?:[^"\\]|\\.)*)"', s):
        x = x.replace("\\u00A0", " ").replace("\\'", "'")
        if re.search(r"[a-zà-ÿ]", x) and cle(x) not in connus and x not in manque:
            manque.append(x)
print(json.dumps(manque, ensure_ascii=False, indent=0))
