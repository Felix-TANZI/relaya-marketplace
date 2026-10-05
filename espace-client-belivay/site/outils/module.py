"""Entoure un bloc d'un écran généré par <Module ff="…"> (bloc d'un module fermé au lancement, CCH-18).

Le bloc va de la ligne qui contient `debut` à la ligne qui ferme l'élément ouvert sur cette ligne (indentation
du JSX généré), pour chaque occurrence dans le fichier. `debut` peut porter deux lignes qui se suivent,
séparées par « || » (la balise d'ouverture, puis son texte), pour viser un bloc précis.
  python3 outils/module.py <fichier.tsx> <FF-…[,FF-…]> '<extrait de la ligne d'ouverture>' [nombre d'éléments frères]
Plusieurs interrupteurs (séparés par des virgules) : bloc affiché si l'un d'eux au moins est ouvert.
"""
import re
import sys
from pathlib import Path

fichier, ff, debut = sys.argv[1:4]
freres = int(sys.argv[4]) if len(sys.argv) > 4 else 1
lignes = Path(fichier).read_text(encoding="utf-8").split("\n")
sortie, i, n = [], 0, 0
while i < len(lignes):
    l = lignes[i]
    parts = debut.split("||")
    if all(i + k < len(lignes) and p in lignes[i + k] for k, p in enumerate(parts)) and "<Module" not in lignes[i - 1]:
        ind = len(l) - len(l.lstrip())
        j = i
        for _ in range(freres):
            # fin de l'élément ouvert à la ligne j : ligne fermante de même indentation, ou ligne auto-fermante
            if re.search(r"/>\s*$", lignes[j]) or re.search(r"</[\w.]+>\s*$", lignes[j]) and lignes[j].strip().startswith("<") and lignes[j].count("<") >= 2:
                fin = j
            else:
                fin = next(k for k in range(j + 1, len(lignes)) if len(lignes[k]) - len(lignes[k].lstrip()) == ind and lignes[k].lstrip().startswith("</"))
            j = fin + 1
        attr = f'ff="{ff}"' if "," not in ff else "ff={[" + ", ".join(f"'{x}'" for x in ff.split(",")) + "]}"
        sortie.append(" " * ind + f"<Module {attr}>")
        sortie.extend(lignes[i:j])
        sortie.append(" " * ind + "</Module>")
        n += 1
        i = j
        continue
    sortie.append(l)
    i += 1
texte = "\n".join(sortie)
if n and "import { Module }" not in texte:
    texte = texte.replace("import { Ecran } from '../../composants/coque'\n", "import { Ecran } from '../../composants/coque'\nimport { Module } from '../../composants/Module'\n", 1)
Path(fichier).write_text(texte, encoding="utf-8")
print(f"{fichier} : {n} bloc(s) entouré(s) ({ff})")
