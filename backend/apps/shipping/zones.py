# backend/apps/shipping/zones.py
# Zones, quartiers et adresse du client (BV-DEV-04, algorithme A9, étapes 1 à 4). Le référentiel est celui des
# réglages de l'admin (apps.regles) : t_zones, t_quartiers, t_alias, t_periurbains, t_zones_peripherie. Les contours
# tracés par l'équipe logistique (R75.2) sont portés par shipping.Zone (zone) et t_quartiers (quartier).
#
#   R73.1  12 zones ; chaque quartier est dans une seule zone.
#   R73.2  zones exploitées au lancement : celles de t_zones dont l'ouverture vaut « lancement ».
#   R76.2  recherche du quartier sans accents, tirets, espaces ni majuscules, avec les appellations de t_alias.
#   R76.3  épingle moins précise que r_epingle_precision_m : validation bloquée.
#   R76.4  l'épingle doit tomber dans le contour de la zone du quartier ; sinon on propose la zone où elle tombe.
#   R76.5  hors des 12 zones : « Cette adresse est hors de nos zones pour l'instant. », demande non servie gardée.
#   R06.1  niv(lieu) = periurbain dans le contour d'un quartier de t_periurbains ; sinon peripherie si sa zone est
#          dans t_zones_peripherie ; sinon centre.
#   R06.5  tant que le contour d'un quartier de t_periurbains n'est pas tracé, le niveau est celui du quartier choisi.
#
# Tant que les contours des zones ne sont pas tracés, la zone est celle du quartier choisi dans la liste (R75.2 :
# la carte BelivaY fait foi dès qu'elle existe).

import re
import unicodedata
from dataclasses import dataclass, field

from apps.regles import services as regles

MESSAGE_HORS_ZONE = "Cette adresse est hors de nos zones pour l'instant."  # R76.5, mot pour mot

TIER_PAR_OUVERTURE = {"lancement": "STANDARD", "vague 2": "VAGUE_2", "vague 3": "VAGUE_3"}
VILLE = "Yaoundé"


# ── Recherche du quartier (R76.2) ───────────────────────────────────────────────────────────────────────

def plier(texte: str) -> str:
    """Clé de recherche : sans accents, tirets, espaces, apostrophes ni majuscules (« Ngoa-Ekellé » = « ngoaekelle »)."""
    sans_accents = "".join(c for c in unicodedata.normalize("NFD", texte or "") if unicodedata.category(c) != "Mn")
    return re.sub(r"[\s\-_'’–—.]+", "", sans_accents).lower()


def quartiers() -> list[dict]:
    return regles.table("t_quartiers")


def quartier(nom: str) -> dict | None:
    """La ligne de t_quartiers de ce nom exact."""
    return next((q for q in quartiers() if q["quartier"] == nom), None)


def chercher_quartiers(texte: str) -> list[dict]:
    """Les quartiers que désigne ce texte : leur nom ou une appellation (colonne alias, t_alias). Une appellation
    qui mène à deux quartiers les donne tous les deux (R76.2)."""
    cle = plier(texte)
    if not cle:
        return []
    alias = regles.table("t_alias")
    trouves = []
    for q in quartiers():
        noms = [q["quartier"], *(q.get("alias") or []), *alias.get(q["quartier"], [])]
        if any(plier(n) == cle for n in noms):
            trouves.append(q)
    return trouves


# ── Zones ───────────────────────────────────────────────────────────────────────────────────────────────

def zones() -> list[dict]:
    return regles.table("t_zones")


def zone(code: str) -> dict | None:
    return next((z for z in zones() if z["zone"] == code), None)


def zone_exploitee(code: str) -> bool:
    """R73.2 : zone exploitée = ouverture « lancement » dans t_zones."""
    z = zone(code)
    return bool(z) and z["ouverture"] == "lancement"


def quartiers_de_zone(code: str) -> list[dict]:
    return [q for q in quartiers() if q["zone"] == code]


# ── Contours (GeoJSON, coordonnées [longitude, latitude]) ───────────────────────────────────────────────

def _dans_anneau(lon: float, lat: float, anneau) -> bool:
    dedans = False
    n = len(anneau)
    for i in range(n):
        x1, y1 = anneau[i][0], anneau[i][1]
        x2, y2 = anneau[(i + 1) % n][0], anneau[(i + 1) % n][1]
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            dedans = not dedans
    return dedans


def dans_contour(lat: float, lon: float, contour) -> bool:
    """Le point est-il dans le contour (Polygon ou MultiPolygon GeoJSON, trous compris) ?"""
    if not contour:
        return False
    if contour.get("type") == "Feature":
        contour = contour.get("geometry") or {}
    polygones = contour.get("coordinates") or []
    if contour.get("type") == "Polygon":
        polygones = [polygones]
    elif contour.get("type") != "MultiPolygon":
        return False
    for anneaux in polygones:
        if anneaux and _dans_anneau(lon, lat, anneaux[0]) and not any(_dans_anneau(lon, lat, t) for t in anneaux[1:]):
            return True
    return False


def _contours_de_zones() -> dict:
    from apps.shipping.models import Zone

    return {code: c for code, c in Zone.objects.filter(code__isnull=False).values_list("code", "contour") if c}


def zone_de_position(lat: float, lon: float) -> str | None:
    """La zone dont le contour contient le point ; None si aucune (ou si aucun contour n'est tracé)."""
    return next((code for code, c in _contours_de_zones().items() if dans_contour(lat, lon, c)), None)


def niveau(q: dict, lat: float | None = None, lon: float | None = None) -> str:
    """niv(lieu) du client qui a choisi le quartier q et posé l'épingle (lat, lon) : R06.1, R06.5, R90.2."""
    periurbains = set(regles.table("t_periurbains"))
    if lat is not None and lon is not None:
        for p in quartiers():
            if p["quartier"] in periurbains and p.get("contour") and dans_contour(lat, lon, p["contour"]):
                return "periurbain"  # R90.2 : l'épingle fait foi, quel que soit le quartier choisi
    if q["quartier"] in periurbains and not q.get("contour"):
        return q["niveau"]  # R06.5
    return "peripherie" if q["zone"] in regles.table("t_zones_peripherie") else "centre"  # R06.1


# ── Adresse du client (A9, étapes 1 à 4) ─────────────────────────────────────────────────────────────────

@dataclass
class Adresse:
    """Résultat de A9 : `refus` vide quand l'adresse est valable."""

    quartier: dict | None = None
    zone: str | None = None
    niveau: str | None = None
    exploitee: bool = False
    refus: str = ""
    message: str = ""
    propositions: list = field(default_factory=list)  # quartiers proposés (nom ambigu, autre zone)


def resoudre_adresse(texte_quartier: str, lat: float | None, lon: float | None, precision_m: float | None) -> Adresse:
    # Étape 1 (R76.1, R76.2) : un quartier de la liste et l'épingle de la porte.
    trouves = chercher_quartiers(texte_quartier)
    if not trouves:
        return Adresse(refus="quartier_inconnu", message="Quartier introuvable : choisissez « Autre quartier » et posez l'épingle.")
    if len(trouves) > 1:
        return Adresse(refus="quartier_ambigu", message="Plusieurs quartiers portent ce nom : choisissez le vôtre.",
                       propositions=[q["quartier"] for q in trouves])
    q = trouves[0]
    if lat is None or lon is None:
        return Adresse(quartier=q, refus="epingle", message="Posez l'épingle sur votre porte.")

    # Étape 2 (R76.3).
    if precision_m is None or precision_m > regles.reglage("r_epingle_precision_m"):
        return Adresse(quartier=q, refus="precision",
                       message=f"Position trop imprécise : rapprochez l'épingle de votre porte (précision de {regles.reglage('r_epingle_precision_m')} m au moins).")

    # Étape 3 (R76.4, R76.5).
    contours = _contours_de_zones()
    code = q["zone"]
    if contours:
        zone_epingle = next((c for c, contour in contours.items() if dans_contour(lat, lon, contour)), None)
        if zone_epingle is None and len(contours) == len(zones()):
            return Adresse(refus="hors_zone", message=MESSAGE_HORS_ZONE)
        if code in contours and zone_epingle != code:
            return Adresse(quartier=q, zone=zone_epingle, refus="autre_zone",
                           message="L'épingle n'est pas dans la zone de ce quartier.",
                           propositions=[p["quartier"] for p in quartiers_de_zone(zone_epingle)] if zone_epingle else [])

    # Étape 4 (R06.1, R06.5, R90.2).
    return Adresse(quartier=q, zone=code, niveau=niveau(q, lat, lon), exploitee=zone_exploitee(code))


# ── shipping.Zone suit t_zones et t_quartiers ────────────────────────────────────────────────────────────

def synchroniser_zones(Zone=None) -> int:
    """Crée ou met à jour les 12 zones (code, nom, vague, quartiers). Les contours et réglages propres à la zone
    (créneaux, amorçage) ne sont pas touchés. Utilisable dans une migration en passant le modèle historique."""
    if Zone is None:
        from apps.shipping.models import Zone
    n = 0
    for z in zones():
        Zone.objects.update_or_create(
            code=z["zone"],
            defaults={
                "name": f"{z['zone']} · {z['nom']}",
                "city": VILLE,
                "tier": TIER_PAR_OUVERTURE[z["ouverture"]],
                "districts": [q["quartier"] for q in quartiers_de_zone(z["zone"])],
                "surcharge_xaf": 0,  # la périphérie est payée par son niveau de prix (R06), pas par une majoration
                "is_active": True,
            },
        )
        n += 1
    return n
