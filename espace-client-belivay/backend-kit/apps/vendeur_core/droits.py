# backend/apps/vendeur_core/droits.py
# Droits d'un accès employé (EQU-01 à EQU-04, Q-17, Q-18 ; même catalogue que espace-vendeur/src/donnees/droits.ts) :
# le propriétaire coche, pour chaque employé, ce qu'il peut faire ; certains droits ne s'ouvrent JAMAIS à un employé
# (argent, prix, réponse aux litiges, équipe) et sont retirés d'office. Le serveur applique ces droits sur chaque route
# vendeur (acces.EstMembre → droit_requis) : 403 forbidden_right hors des droits du membre, quoi que montre l'écran.
import re

from .models import Membre

# Ordre du catalogue (droits.ts, GROUPES_DROITS) ; valeur : droit supposé (cocher « préparer » coche « voir »).
CATALOGUE: dict[str, str | None] = {
    "commandes.voir": None,
    "commandes.preparer": "commandes.voir",
    "commandes.remettre": "commandes.voir",
    "produits.voir": None,
    "produits.stock": "produits.voir",
    "produits.prix": None,
    "litiges.voir": None,
    "litiges.preuves": "litiges.voir",
    "litiges.repondre": None,
    "retours.inspecter": None,
    "messages.voir": None,
    "messages.repondre": "messages.voir",
    "argent.voir": None,
    "boutique.fermer": None,
    "boutique.modifier": None,
    "equipe.gerer": None,
}
TOUS = list(CATALOGUE)
JAMAIS_POUR_UN_EMPLOYE = ("produits.prix", "litiges.repondre", "argent.voir", "boutique.modifier", "equipe.gerer")

PROFILS: dict[str, list[str]] = {
    # « Préparation » reprend l'accès unique d'avant (EQU-01) : un membre sans droits enregistrés l'a.
    "preparation": [
        "commandes.voir",
        "commandes.preparer",
        "commandes.remettre",
        "produits.voir",
        "produits.stock",
        "litiges.voir",
        "litiges.preuves",
        "retours.inspecter",
        "messages.voir",
        "messages.repondre",
        "boutique.fermer",
    ],
    "stock": ["commandes.voir", "produits.voir", "produits.stock"],
    "service_client": ["commandes.voir", "messages.voir", "messages.repondre", "litiges.voir", "litiges.preuves"],
}


def normaliser(droits) -> list[str]:
    """Droits retenus pour un employé : connus, sans les interdits, avec les droits supposés ; ordre du catalogue."""
    garde = {d for d in (droits or []) if isinstance(d, str) and d in CATALOGUE and d not in JAMAIS_POUR_UN_EMPLOYE}
    for d in list(garde):
        if CATALOGUE[d]:
            garde.add(CATALOGUE[d])
    return [d for d in TOUS if d in garde]


def profil_de(droits) -> str:
    n = normaliser(droits)
    return next((k for k, p in PROFILS.items() if normaliser(p) == n), "personnalise")


def droits_de(m: Membre) -> list[str]:
    if m.role == Membre.Role.PROPRIETAIRE:
        return list(TOUS)
    return normaliser(PROFILS["preparation"] if m.droits is None else m.droits)


def profil_du_membre(m: Membre) -> str | None:
    return None if m.role == Membre.Role.PROPRIETAIRE else profil_de(droits_de(m))


# Routes sous /api/vendors/ réservées à un droit (INTEGRATION-API.md § 8). Première règle qui correspond ; une route
# absente reste ouverte à tout membre (lecture seule de la boutique, des horaires, du palier, de l'aide…) ou est déjà
# réservée au propriétaire par sa vue (403 owner_only).
_R: list[tuple[str, str, str | None]] = [
    ("POST", r"threads/support", None),  # la conversation « Support BelivaY » reste ouverte à tout membre
    ("GET", r"orders/[^/]+/handover-code", "commandes.remettre"),
    ("POST", r"orders/[^/]+/(handover-code/renew|not-ready)", "commandes.remettre"),
    ("POST", r"orders/[^/]+/(ready|stockout|extend|slip(/.*)?)", "commandes.preparer"),
    ("GET", r"(orders(/.*)?|handovers|receipts|pickups|shop/activity)", "commandes.voir"),
    ("POST|DELETE", r"disputes/[^/]+/evidence(/.*)?", "litiges.preuves"),
    ("GET", r"disputes(/.*)?", "litiges.voir"),
    ("POST|PUT|DELETE", r"returns/[^/]+/(receive|photos(/.*)?|draft|inspection)", "retours.inspecter"),
    ("POST", r"threads/[^/]+/messages", "messages.repondre"),
    ("GET|POST", r"threads(/.*)?", "messages.voir"),
    ("GET", r"questions(/.*)?", "messages.voir"),
    ("POST", r"questions/[^/]+/report", "messages.voir"),
    ("PUT", r"offers/\d+/stock", "produits.stock"),
    ("POST", r"stock/[^/]+/adjust", "produits.stock"),
    ("GET", r"(offers(/.*)?|stock(/.*)?)", "produits.voir"),
    ("POST", r"shop/closed-today", "boutique.fermer"),
]
REGLES = [(set(m.split("|")), re.compile(p + "$"), d) for m, p, d in _R]
OFFRE = re.compile(r"offers/\d+$")


def droit_requis(methode: str, chemin: str, corps=None) -> str | None:
    """Droit qu'il faut pour cette requête (chemin relatif à /api/vendors/) ; None : aucun droit particulier."""
    c = chemin.split("/api/vendors/", 1)[-1].strip("/")
    if methode in ("PUT", "PATCH") and OFFRE.match(c) and hasattr(corps, "keys") and "stock" in corps:
        return "produits.stock"  # « Réapprovisionner » depuis la fiche de l'offre
    return next((d for ms, rx, d in REGLES if methode in ms and rx.match(c)), None)
