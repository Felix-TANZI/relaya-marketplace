# backend/apps/payments/tests/test_admin_integrity.py
# Garde-fou permanent sur les administrations du module financier.
#
# CE FICHIER EXISTE A CAUSE D'UNE ERREUR REPETEE.
#
# Django 5.1 leve TypeError quand format_html est appele sans argument
# d'interpolation. J'ai introduit ce defaut au Lot 6, corrige UNE occurrence,
# puis retrouve vingt autres au Lot 7 — et encore quatre au Lot 8.
#
# Ces appels ne plantent QUE lorsque la branche est atteinte : un badge
# « en vigueur », un compte « derivable », une transaction « alteree ».
# Autrement dit, ils plantent precisement quand on a besoin de l'information.
#
# Ce test rend le defaut impossible a reintroduire.

import ast
import pathlib

import pytest


def _fichiers_admin():
    racine = pathlib.Path(__file__).resolve().parents[1]
    return sorted(racine.rglob("*/admin.py")) + sorted(racine.glob("admin.py"))


def test_aucun_format_html_sans_argument():
    """
    format_html("<span>texte</span>") leve TypeError en Django 5.1.
    Pour du HTML statique, utiliser mark_safe.
    """
    fautes = []
    for fichier in _fichiers_admin():
        arbre = ast.parse(fichier.read_text(encoding="utf-8"))
        for noeud in ast.walk(arbre):
            if (isinstance(noeud, ast.Call)
                    and isinstance(noeud.func, ast.Name)
                    and noeud.func.id == "format_html"
                    and len(noeud.args) <= 1
                    and not noeud.keywords):
                fautes.append(f"{fichier.name}:{noeud.lineno}")

    assert not fautes, (
        "format_html sans argument d'interpolation (utiliser mark_safe) : "
        + ", ".join(fautes)
    )


def test_aucun_formatage_numerique_dans_format_html():
    """
    format_html convertit ses arguments en SafeString AVANT l'interpolation.
    Un gabarit '{:05d}' echoue donc avec « Unknown format code 'd' ».
    Le nombre doit etre formate en amont.
    """
    fautes = []
    for fichier in _fichiers_admin():
        arbre = ast.parse(fichier.read_text(encoding="utf-8"))
        for noeud in ast.walk(arbre):
            if not (isinstance(noeud, ast.Call)
                    and isinstance(noeud.func, ast.Name)
                    and noeud.func.id == "format_html"
                    and noeud.args):
                continue
            gabarit = noeud.args[0]
            morceaux = []
            if isinstance(gabarit, ast.Constant) and isinstance(gabarit.value, str):
                morceaux = [gabarit.value]
            elif isinstance(gabarit, ast.JoinedStr):
                morceaux = [
                    v.value for v in gabarit.values
                    if isinstance(v, ast.Constant) and isinstance(v.value, str)
                ]
            for texte in morceaux:
                for interdit in ("{:0", "{:,", "{:.", "{:>", "{:<"):
                    if interdit in texte:
                        fautes.append(f"{fichier.name}:{noeud.lineno} ({interdit})")

    assert not fautes, (
        "Formatage numerique dans un gabarit format_html — formater le "
        "nombre AVANT : " + ", ".join(fautes)
    )


def test_mark_safe_importe_partout_ou_il_est_utilise():
    manquants = []
    for fichier in _fichiers_admin():
        src = fichier.read_text(encoding="utf-8")
        if "mark_safe(" in src and "import mark_safe" not in src:
            manquants.append(fichier.name)
    assert not manquants, "mark_safe utilise sans import : " + ", ".join(manquants)