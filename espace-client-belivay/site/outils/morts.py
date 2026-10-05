"""Inventaire des contrôles morts (DP-54) : python3 outils/morts.py [--detail]
Compte, par page, ce qui ne fait rien de réel :
- lien vers un état écrit d'avance : l'adresse visée est un « case » d'un écran encore rendu par états
  (useEtat, balisage du prototype) ; les modes lus par un écran repris (?st=nouveau…) ne comptent pas ;
- lien « # » sans onClick ; bouton sans onClick ni type submit (hors interrupteurs pilotés par leur parent) ;
- data-act (gestes du prototype, actifs seulement en rendu par états).
L'accueil (DP-54 : ne plus y toucher) et le panier sont comptés à part."""

import glob
import re
import sys

fichiers = sorted(glob.glob("src/pages/**/*.tsx", recursive=True))
sources = {f: open(f, encoding="utf-8").read() for f in fichiers}

# États écrits d'avance encore rendus : « case "route?st=x" » dans un écran qui lit useEtat.
etats = set()
for s in sources.values():
    if "useEtat(" in s:
        etats |= {c for c in re.findall(r'case "([^"]+\?[^"]+)"', s)}


def balises(s, nom):
    """Balises ouvrantes <nom …> entières (accolades équilibrées : « => » ne coupe pas la balise)."""
    i = 0
    while True:
        i = s.find("<" + nom, i)
        if i < 0:
            return
        j, prof = i + 1, 0
        while j < len(s):
            c = s[j]
            if c == "{":
                prof += 1
            elif c == "}":
                prof -= 1
            elif c == ">" and prof == 0:
                break
            j += 1
        yield i, s[i : j + 1]
        i = j


def norm(adresse):
    route, _, q = adresse.lstrip("/").partition("?")
    return (route or "accueil") + ("?" + "&".join(sorted(q.split("&"))) if q else "")


etats_norm = {norm(e) for e in etats}
detail = "--detail" in sys.argv
total = 0
for f, s in sources.items():
    trouves = []
    for i, b in balises(s, "Link"):
        m = re.search(r'to="([^"]+\?[^"]+)"', b)
        if m and norm(m.group(1)) in etats_norm:
            trouves.append((i, "état", b))
    for i, b in balises(s, "a"):
        if re.match(r"<a[\s>]", b) and 'href="#"' in b and "onClick" not in b and "data-retirer" not in b:
            trouves.append((i, "#", b))
    for i, b in balises(s, "button"):
        if re.match(r"<button[\s>]", b) and "onClick" not in b and 'type="submit"' not in b and 'aria-disabled="true"' not in b and 'role="switch"' not in b:
            trouves.append((i, "bouton", b))
    for i, b in balises(s, ""):
        pass
    trouves += [(m.start(), "data-act", m.group(0)) for m in re.finditer(r"data-act=\"[^\"]+\"", s)]
    if not trouves:
        continue
    hors = f.endswith(("CL-04/Accueil.tsx", "CL-07/Panier.tsx"))
    if not hors:
        total += len(trouves)
    genres = {}
    for _, g, _ in trouves:
        genres[g] = genres.get(g, 0) + 1
    print(f"{f:50} {len(trouves):4}  " + "  ".join(f"{a}:{b}" for a, b in genres.items()) + ("  (hors périmètre)" if hors else ""))
    if detail and not hors:
        for i, g, b in trouves:
            print(f"    {s.count(chr(10), 0, i) + 1} {g}: {' '.join(b.split())[:130]}")
print("TOTAL (hors accueil et panier) :", total)
