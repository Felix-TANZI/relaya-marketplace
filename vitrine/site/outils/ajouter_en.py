"""Ajoute des traductions à src/i18n/en-complements.json (sans écraser ni doubler le dictionnaire du prototype)."""

import json
import sys

src = json.load(open(sys.argv[1], encoding="utf-8"))
p = "src/i18n/en-complements.json"
d = json.load(open(p, encoding="utf-8"))
proto = json.load(open("src/genere/en.json", encoding="utf-8"))
n = 0
for k, v in src.items():
    if k not in proto and k not in d:
        d[k] = v
        n += 1
json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
open(p, "a", encoding="utf-8").write("\n")
print(n, "traductions ajoutées")
