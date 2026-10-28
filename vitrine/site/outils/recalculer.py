"""Applique src/demo/recalculs.json aux écrans du site (src/pages) : chaque montant du prototype que les décisions
du porteur changent (DP-47) devient sa valeur recalculée dans les textes {t("…")} des écrans, comme
outils/corrections.mjs le fait au prototype pour la comparaison. Une entrée « routes » ne touche que ces écrans ;
une entrée limitée à un bloc (« dans ») ou à des états (« etats ») est appliquée par la régénération de l'écran.
Les textes entiers sont remplacés en une passe (un texte remplacé ne l'est pas une seconde fois). Un texte du
prototype qui est aussi la valeur recalculée d'une autre entrée du même écran est ambigu (« + 1 100 F retrait » :
ancien prix d'un colis M, nouveau prix d'un colis L) : il n'est pas touché, l'écran se régénère
(outils/ecran.mjs --ecraser, puis outils/reprises.py).
  python3 outils/recalculer.py"""
import glob
import json
import re
from pathlib import Path

R = json.loads(Path("src/demo/recalculs.json").read_text(encoding="utf-8"))
SEP = r"(\\u00A0|\\u202F| | | )"


def composant(route):
    return "".join(m[:1].upper() + m[1:] for m in route.split("-"))


def lit(v):
    return re.sub(r"[\u00A0\u202F\u2060\u200B\u2009]", lambda m: f"\\u{ord(m.group(0)):04X}", json.dumps(v, ensure_ascii=False))


def norme(v):
    return re.sub(r"[\s\u00A0\u202F]+", " ", v).strip()


total = 0
ambigus = set()
for f in sorted(glob.glob("src/pages/CL-*/*.tsx")):
    s = Path(f).read_text(encoding="utf-8")
    avant = s
    ici = [r for r in R if not r.get("routes") or any(f.endswith("/" + composant(x) + ".tsx") for x in r["routes"])]
    recalcules = {norme(r["site"]) for r in ici if norme(r["site"]) != norme(r["prototype"])}
    noeuds = {}
    for r in ici:
        if norme(r["prototype"]) in recalcules:
            if lit(r["prototype"]) in s or re.search(SEP.join(map(re.escape, r["prototype"].split())), s):
                ambigus.add(f"{f} : {r['prototype']!r}")
            continue
        if r.get("dans") or r.get("etats"):
            continue  # limité à un bloc ou à des états : appliqué par la génération (outils/ecran.mjs)
        if r.get("noeud"):
            noeuds.setdefault(lit(r["prototype"]), lit(r["site"]))
    s = re.sub(r'\{t\(("(?:[^"\\]|\\.)*")\)\}', lambda m, noeuds=noeuds: "{t(" + noeuds.get(m.group(1), m.group(1)) + ")}", s)
    for r in ici:
        if r.get("noeud") or r.get("dans") or r.get("etats") or norme(r["prototype"]) in recalcules:
            continue
        if r.get("texte"):
            s = re.sub(r"(?<![\d,.])" + re.escape(r["prototype"]) + r"(?![\d]|[,.]\d)", lambda m, r=r: r["site"], s)
            continue
        g, n = r["prototype"].split(), r["site"].split()
        motif = re.compile(r"(?<![\d,.])" + SEP.join(g) + r"(?![\d]|[,.]\d)")

        def remplace(m, g=g, n=n):
            seps = [m.group(i + 1) for i in range(len(g) - 1)] or [" "]
            return "".join(x + (seps[min(i, len(seps) - 1)] if i < len(n) - 1 else "") for i, x in enumerate(n))

        s = motif.sub(remplace, s)
    if s != avant:
        total += 1
        Path(f).write_text(s, encoding="utf-8")
        print("recalculé :", f)
print(total, "écrans")
if ambigus:
    print("textes ambigus laissés tels quels (une entrée qui les touche change : régénérer l'écran) :\n  " + "\n  ".join(sorted(ambigus)))
