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

# Réglages demandés par la feuille de route V2 Élite mais absents de BV-DEV-07 (fichier verrouillé) : créés par
# migration, modifiables dans l'admin comme les autres. Toute autre différence avec la référence est une anomalie.
REGLAGES_FEUILLE_DE_ROUTE = {
    "r_auto_rmb_plafond_mois",  # D32 : plafond mensuel global du remboursement automatique (0 = fermé)
    "r_wallet_code_essais",     # sécurité main 2 : codes Wallet faux avant blocage (R03.5)
    "r_wallet_code_blocage_h",  # sécurité main 2 : durée du blocage du code Wallet, en heures
    "r_code_relais_echecs",     # sécurité main 2 : codes de retrait faux qui bloquent un relais (R66.1)
    "r_code_relais_fenetre_h",  # sécurité main 2 : période de ce comptage, en heures
    "r_secours_jours_max",      # DP-42 : durée maximale d'un accès de valideur de secours
    "r_rappel_valideurs_h1",    # DP-42 : premier rappel du vendredi aux valideurs
    "r_rappel_valideurs_h2",    # DP-42 : second rappel du vendredi aux valideurs
    "r_palier_eleve_livrees",   # R71.1 : palier Élevé, commandes livrées sans litige perdu
    "r_palier_eleve_litige_mois",       # R71.1 : palier Élevé, aucun litige perdu depuis (mois)
    "r_palier_eleve_anciennete_mois",   # R71.1 : palier Élevé, ancienneté du compte (mois)
    "r_relais_habituel_jours",  # R71.2 : relais habituel par défaut, fenêtre des retraits
}


def empreinte_fichier(chemin: Path) -> str:
    """sha256 du fichier, fins de ligne ramenées à LF (git les convertit en CRLF sous Windows)."""
    return hashlib.sha256(chemin.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


@lru_cache(maxsize=1)
def donnees_reference() -> dict:
    """Le JSON BV-DEV-07 complet : meta, reglages, variables, tables, regles, algorithmes, derives, tests."""
    return json.loads(FICHIER_DONNEES.read_text(encoding="utf-8"))
