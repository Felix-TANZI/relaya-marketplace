# backend/scripts/cliquet_spectacular.py
# Revue du 29/10 (E1) : le schéma OpenAPI devient bloquant en CI, par cliquet (décision du porteur, 2026-10-31).
#
# La génération du schéma produit encore des avertissements et des erreurs (vues sans serializer, champs sans type),
# hérités et répartis dans tout le backend. Plutôt que de les masquer (continue-on-error), la CI échoue :
#   - si la génération plante ;
#   - si le nombre d'avertissements ou d'erreurs distincts dépasse le plafond ci-dessous.
# Aucune nouvelle dette n'entre donc. Quand une correction fait baisser un compte, abaisser le plafond dans le même
# commit : le cliquet ne remonte jamais.
#
# Usage (depuis backend/) : python scripts/cliquet_spectacular.py

import re
import subprocess
import sys

PLAFONDS = {"Warnings": 266, "Errors": 432}  # 2026-11-13 : 433 -> 432 (C04, réponses typées) ; mesurés en relaya.settings.test, comptes distincts


def main() -> int:
    sortie = subprocess.run([sys.executable, "manage.py", "spectacular", "--file", "/dev/null"],
                            capture_output=True, text=True)
    texte = sortie.stdout + sortie.stderr
    if sortie.returncode != 0:
        print(texte[-4000:])
        print("Cliquet OpenAPI : la génération du schéma a échoué.")
        return 1
    echec = False
    for nom, plafond in PLAFONDS.items():
        m = re.search(rf"^{nom}:\s+\d+ \((\d+) unique\)", texte, re.MULTILINE)
        compte = int(m.group(1)) if m else 0
        if compte > plafond:
            echec = True
            print(f"Cliquet OpenAPI : {compte} {nom.lower()} distincts, plafond {plafond}. Corrigez les nouveaux :")
        elif compte < plafond:
            print(f"Cliquet OpenAPI : {compte} {nom.lower()} distincts (plafond {plafond}) — abaissez le plafond.")
        else:
            print(f"Cliquet OpenAPI : {compte} {nom.lower()} distincts, au plafond.")
    if echec:
        print("\n".join(ligne for ligne in texte.splitlines() if "Warning" in ligne or "Error" in ligne)[-8000:])
    return 1 if echec else 0


if __name__ == "__main__":
    sys.exit(main())
