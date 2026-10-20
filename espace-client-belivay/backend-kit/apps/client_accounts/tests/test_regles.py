# backend/apps/client_accounts/tests/test_regles.py
# Règles pures, avec les exemples du site (source-demo.ts).
import pytest

from apps.client_accounts import regles

ZONES = [("Z1", "Bastos"), ("Z3", "Mokolo"), ("Z6", "Melen"), ("Z7", "Biyem-Assi")]


@pytest.mark.parametrize(
    "saisi,attendu",
    [
        ("Bastos", ("Z1", "Bastos")),
        ("  bastos ", ("Z1", "Bastos")),
        ("biyem assi", ("Z7", "Biyem-Assi")),
        ("BIYEM-ASSI", ("Z7", "Biyem-Assi")),
    ],
)
def test_zone_du_quartier(saisi, attendu):
    assert regles.zone_du_quartier(saisi, ZONES) == attendu


@pytest.mark.parametrize("saisi", ["Odza", "Akwa, Douala", ""])
def test_zone_non_servie(saisi):
    assert regles.zone_du_quartier(saisi, ZONES) is None


def test_ville_de():
    assert regles.ville_de("Akwa, Douala") == "Douala"
    assert regles.ville_de(" Odza ") == "Odza"


def test_reperes_courts():
    assert regles.reperes_courts("Mvog-Ada", "carrefour Emana, portail vert") == "Mvog-Ada, carrefour Emana"
    assert regles.reperes_courts("Mvog-Ada", "") == "Mvog-Ada"


def test_nom_boutique():
    assert regles.nom_boutique("  Carine   Mode ") == ("Carine Mode", None)
    assert regles.nom_boutique("Ab")[1] == "nom-court"
    assert regles.nom_boutique("x" * 41)[1] == "nom-long"


def test_lettres_code():
    assert regles.lettres_code("Karine") == "KRN"  # exemple du site : KRN-4821
    assert regles.lettres_code("Éa") == "XXX"


def test_mot_de_passe():
    regle = "8 caractères au moins, dont un chiffre"
    assert regles.mot_de_passe_ok("motdepasse1", regle)
    assert not regles.mot_de_passe_ok("motdepasse", regle)
    assert not regles.mot_de_passe_ok("court1", regle)
    with pytest.raises(ValueError):
        regles.mot_de_passe_ok("x", "au moins huit")


def test_lecture_du_tableau_legal_du_site():
    from apps.client_accounts.management.commands.charger_legal import documents_depuis_ts

    ts = """import type { DocumentLegal } from '../donnees/source'
export const LEGAL: DocumentLegal[] = [
 {
  cle: "cgu",
  aAccepter: true,
  fr: {
   titre: "Conditions\\u00A0: test",
   grille: null,
   points: ["a: b", "c"],
  },
 },
]
"""
    assert documents_depuis_ts(ts) == [
        {"cle": "cgu", "aAccepter": True, "fr": {"titre": "Conditions : test", "grille": None, "points": ["a: b", "c"]}}
    ]
