# backend/apps/client_accounts/regles.py
# Règles pures du compte client, portées du site (site/src/demo/source-demo.ts, comportement attendu) : sans Django,
# testées avec les exemples du site (tests/test_regles.py).
#
#   zone_du_quartier   — CCO-11, DP-09 : le quartier d'une adresse doit être une zone exploitée (ZONES-EXPLOITEES) ;
#                        comparaison sans casse, accents ni tirets (« biyem assi » = « Biyem-Assi »).
#   ville_de           — « Akwa, Douala » → « Douala » (message 422 zone_non_servie).
#   reperes_courts     — « Mvog-Ada, carrefour Emana » : le quartier et le premier repère (page du compte).
#   nom_boutique       — CL-13 : nom de 3 à 40 caractères, espaces resserrés.
#   lettres_code       — préfixe du code de boutique : trois consonnes du prénom (« Karine » → « KRN »).
#   mot_de_passe_ok    — MDP-LONG : « 8 caractères au moins, dont un chiffre » (lu dans la valeur du registre).

import re
import unicodedata

# PARAMÈTRE À AJOUTER AU REGISTRE : BOUT-NOM-LONG (« de 3 à 40 caractères », source-demo.ts ouvrirBoutique)
NOM_BOUTIQUE_MIN = 3
NOM_BOUTIQUE_MAX = 40


def _plier(texte: str) -> str:
    sans_accents = "".join(c for c in unicodedata.normalize("NFD", texte or "") if unicodedata.category(c) != "Mn")
    return re.sub(r"[\s\-_'’]+", " ", sans_accents).strip().lower()


def zone_du_quartier(quartier: str, zones: list[tuple[str, str]]) -> tuple[str, str] | None:
    """(code, nom officiel) de la zone exploitée qui porte ce nom ; None : zone non servie."""
    cle = _plier(quartier)
    return next(((code, nom) for code, nom in zones if _plier(nom) == cle), None) if cle else None


def ville_de(quartier: str) -> str:
    q = (quartier or "").strip()
    return q.split(",")[-1].strip() if "," in q else q


def reperes_courts(quartier: str, reperes: str) -> str:
    premier = (reperes or "").split(",")[0].strip()
    return f"{quartier}, {premier}" if premier else quartier


def nom_boutique(nom: str) -> tuple[str, str | None]:
    """(nom resserré, raison du refus ou None) ; raisons du site : nom-court, nom-long."""
    propre = re.sub(r"\s+", " ", (nom or "").strip())
    if len(propre) < NOM_BOUTIQUE_MIN:
        return propre, "nom-court"
    if len(propre) > NOM_BOUTIQUE_MAX:
        return propre, "nom-long"
    return propre, None


def lettres_code(prenom: str) -> str:
    lettres = re.sub(r"[^A-Za-z]", "", unicodedata.normalize("NFD", prenom or "")).upper() + "XXX"
    return re.sub(r"[AEIOUY]", "", lettres)[:3]


def mot_de_passe_ok(mot_de_passe: str, regle: str) -> bool:
    """`regle` : la valeur de MDP-LONG, « 8 caractères au moins, dont un chiffre »."""
    m = re.search(r"(\d+)", regle or "")
    if m is None:
        raise ValueError(f"MDP-LONG illisible : {regle!r}")
    if len(mot_de_passe or "") < int(m.group(1)):
        return False
    if "chiffre" in regle and not re.search(r"\d", mot_de_passe):
        return False
    if "lettre" in regle and not re.search(r"[^\W\d_]", mot_de_passe):
        return False
    return True
