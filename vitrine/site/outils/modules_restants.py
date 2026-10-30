"""Liens vers un module fermé au lancement qui ne sont pas encore dans un <Module> (écrans générés)."""
import glob
import json
import re
import sys
from pathlib import Path

PAGES = json.loads(Path("src/genere/pages.json").read_text(encoding="utf-8"))
FERMEES = {p["route"]: p["interrupteur"] for p in PAGES if p["interrupteur"]}
fichiers = sys.argv[1:] or sorted(glob.glob("src/pages/CL-*/*.tsx"))
for f in fichiers:
    s = Path(f).read_text(encoding="utf-8").split("\n")
    pile = 0
    vus = set()
    for i, l in enumerate(s):
        pile += l.count("<Module") - l.count("</Module>")
        m = re.search(r'<Link to="/([a-z0-9-]+)', l)
        if m and m.group(1) in FERMEES and pile == 0:
            cle = l.strip()
            if cle in vus:
                continue
            vus.add(cle)
            print(f"{f}:{i + 1} {FERMEES[m.group(1)]}")
            for k in range(max(0, i - 4), min(len(s), i + 4)):
                print("   ", s[k][:150])
