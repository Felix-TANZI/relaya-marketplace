# Contrat de l'espace vendeur, sur la boutique de démonstration complète (charger_demo_vendeur : toutes les applications
# vendeur) et de VRAIES commandes de clients :
#   1. chaque route /api/vendors/… du kit est dans le contrat (openapi.yaml → donnees/routes-contrat.json), et
#      inversement (test_contrat.py du socle client) ;
#   2. ANONYMAT (GEN-01, CTV-02) : aucune réponse de lecture, pour le propriétaire comme pour l'accès Préparation, ne porte
#      un champ interdit (client, relais, mode de livraison, total payé…) ni le nom, le numéro, l'e-mail ou le relais du
#      client des commandes ;
#   3. RÔLE (DP-55) : l'accès Préparation reçoit 403 owner_only sur l'argent, les versements, les plans et l'équipe, et
#      aucune réponse qu'il reçoit ne porte de montant (prix, gardé, gelé…) : null partout ;
#   4. aucune route de lecture ne répond 500.
import json
import re
from pathlib import Path

import pytest
from django.core.management import call_command
from django.urls import URLPattern, URLResolver, get_resolver

from apps.client_core.tests.outils import client_connecte, creer_client, creer_relais
from apps.vendeur_core import demo
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import Boutique, Membre, Offre

pytestmark = pytest.mark.django_db

ROUTES = json.loads((Path(__file__).resolve().parents[2] / "client_core" / "donnees" / "routes-contrat.json").read_text(encoding="utf-8"))
VENDEUR = [r for r in ROUTES if r["chemin"].startswith("/api/vendors/")]

# Lectures réservées au propriétaire (403 owner_only pour l'accès Préparation).
PROPRIETAIRE = re.compile(
    r"^/api/vendors/(money/|documents|payouts|payout-number|plans|payments/|visibility|services|stats|receipts|orders/\{id\}/receipt|"
    r"account/summary|shop/members|shop/change-requests|offers/quote|offers/\{id\}/price-advice|ads|promotions|seller/activity|seller/goal)"
)
RESEAU = re.compile(r"^/api/vendors/(shop/locations|hubs|delivery-settings)$")
# Champs de montant : jamais un nombre pour l'accès Préparation.
MONTANTS = {
    "prix",
    "garde",
    "gele",
    "gardeceMois",
    "gardeCeMois",
    "geleCeMois",
    "valeurColis",
    "prixUnitaire",
    "trajetRetour",
    "prixSession",
    "fichePrioPrix",
}


def _motifs(resolver=None, prefixe=""):
    resolver = resolver or get_resolver()
    for p in resolver.url_patterns:
        if isinstance(p, URLResolver):
            yield from _motifs(p, prefixe + str(p.pattern))
        elif isinstance(p, URLPattern):
            yield prefixe + str(p.pattern)


def _gabarit(motif: str) -> str:
    return "/" + re.sub(r"<(?:\w+:)?(\w+)>", "{x}", motif)


def test_chaque_route_vendeur_du_kit_est_dans_le_contrat():
    contrat = {re.sub(r"\{[^}]+\}", "{x}", r["chemin"]) for r in VENDEUR}
    kit = {_gabarit(m) for m in _motifs() if m.startswith("api/vendors/")}
    assert kit, "aucune route vendeur montée"
    assert sorted(kit - contrat) == []
    assert len(VENDEUR) >= 190


@pytest.fixture
def demo_complete():
    creer_relais("Relais Mvog-Ada", "Mvog-Ada")
    carine = creer_client("Carine", email="carine@gmail.com", last_name="Mballa")
    from apps.client_accounts.services import enregistrer_numero

    enregistrer_numero(carine, "677112241")
    call_command("charger_demo_vendeur", verbosity=0)
    b = Boutique.objects.get(identifiant="@Penga12")
    return {"b": b, "carine": carine}


def _valeurs(b: Boutique) -> dict:
    """Une valeur réelle pour chaque paramètre de chemin des lectures."""
    from apps.vendeur_croissance.models import Decision

    o = Offre.objects.filter(boutique=b, etat="en_vente").first()
    d = Decision.objects.filter(boutique=b).first()
    return {
        "/orders/{id}": demo.REFS["BLV-00008"],
        "/disputes/{id}": demo.REFS["BLV-00005"],
        "/returns/{id}": demo.REFS["BLV-00004"],
        "/offers/{id}": str(o.pk),
        "/sheets/{id}": str(o.fiche_id),
        "/catalog/barcode/{code}": "6941167600528",
        "/account/decisions/{id}": d.ident if d else "DEC-0",
        "/payments/{id}": "1",
        "/threads/{id}": "support",
    }


def _chemin(gabarit: str, valeurs: dict) -> str:
    for cle, v in valeurs.items():
        debut, param = cle.rsplit("/", 1)
        gabarit = gabarit.replace(f"{debut}/{param}", f"{debut}/{v}")
    return gabarit


def _montants_non_nuls(x, chemin="$") -> list[str]:
    out = []
    if isinstance(x, dict):
        for k, v in x.items():
            if k in MONTANTS and isinstance(v, (int, float)) and not isinstance(v, bool) and v != 0:
                out.append(f"{chemin}.{k} = {v}")
            out += _montants_non_nuls(v, f"{chemin}.{k}")
    elif isinstance(x, list):
        for i, v in enumerate(x):
            out += _montants_non_nuls(v, f"{chemin}[{i}]")
    return out


LECTURES = [r["chemin"] for r in VENDEUR if r["methode"] == "GET" and not r["chemin"].startswith("/api/vendors/auth/")]


def test_anonymat_role_et_lectures_sur_la_boutique_de_demonstration(demo_complete):
    b, carine = demo_complete["b"], demo_complete["carine"]
    valeurs = _valeurs(b)
    proprio = client_connecte(b.proprietaire)
    prep = client_connecte(Membre.objects.get(boutique=b, role="preparation").user)
    interdites = ("Carine", "Mballa ", " Mballa", "carine@gmail.com", "677112241", "77 11 22 41", "Relais Mvog-Ada")
    erreurs = []
    for gabarit in LECTURES:
        chemin = _chemin(gabarit, valeurs)
        for qui, api in (("propriétaire", proprio), ("préparation", prep)):
            r = api.get(chemin, {"state": "prep"} if gabarit.endswith("/orders") else {})
            if r.status_code >= 500:
                erreurs.append(f"{qui} GET {chemin} : {r.status_code}")
                continue
            if r.status_code == 403:
                code = r.json()["error"]["code"]
                if qui == "propriétaire" or code != "owner_only" or not PROPRIETAIRE.match(gabarit):
                    erreurs.append(f"{qui} GET {chemin} : 403 {code}")
                continue
            if qui == "préparation" and PROPRIETAIRE.match(gabarit) and r.status_code == 200:
                erreurs.append(f"préparation GET {chemin} : 200 au lieu de 403 owner_only")
            if r.status_code != 200 or not r.get("Content-Type", "").startswith("application/json"):
                continue
            corps = r.json()
            # Lieux de la boutique, centres BelivaY et relais préférés de la boutique : l'adresse est celle de la BOUTIQUE et
            # les relais ceux du réseau BelivaY (jamais le relais d'un client).
            reseau = RESEAU.match(gabarit)
            permis = {"lieu", "mode", *({"adresse", "relais"} if reseau else set())}
            a_taire = tuple(v for v in interdites if not (reseau and v.startswith("Relais")))
            erreurs += [f"{qui} GET {chemin} : fuite {f}" for f in fuites(corps, valeurs_interdites=a_taire, permis=permis)]
            if qui == "préparation":
                erreurs += [f"préparation GET {chemin} : montant {m}" for m in _montants_non_nuls(corps)]
    assert erreurs == [], "\n".join(erreurs)
    assert carine.pk  # le client des commandes de démo existe bien
