# backend/apps/regles/reference.py
# Lecture des fichiers de référence livrés avec la spécification (BV-DEV-07 et BV-DEV-09).

import hashlib
import json
from functools import lru_cache
from pathlib import Path

DOSSIER = Path(__file__).resolve().parent
FICHIER_DONNEES = DOSSIER / "donnees" / "BV-DEV-07_Donnees.json"
FICHIER_MOTEUR = DOSSIER / "moteur_reference.py"

# Empreintes publiées dans empreintes.txt de la livraison v2.1 du 18 octobre 2026.
EMPREINTE_DONNEES = "e9df827bb756d58f11ecb233a396011354c1029615edc1cb27072732bfcfd9dc"
EMPREINTE_MOTEUR = "21095446406de1570010586917913ce70c820ff50e851efc41ddcd0e7c63aa91"


def empreinte_fichier(chemin: Path) -> str:
    """sha256 du fichier, fins de ligne ramenées à LF (git les convertit en CRLF sous Windows)."""
    return hashlib.sha256(chemin.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


@lru_cache(maxsize=1)
def donnees_reference() -> dict:
    """Le JSON BV-DEV-07 complet : meta, reglages, variables, tables, regles, algorithmes, derives, tests."""
    return json.loads(FICHIER_DONNEES.read_text(encoding="utf-8"))
