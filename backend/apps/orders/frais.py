# backend/apps/orders/frais.py
# Frais de livraison et total à payer d'un panier réel (BV-DEV-01, algorithmes A1 et A2), calculés par le moteur
# BV-DEV-09 avec les réglages de l'admin. Ce module ne fait que préparer ses entrées et mettre en forme ses sorties :
#
#   articles   prix_i (prix payé : flash, sinon promotion, sinon normal, R27.2), q_i, poids_i, dimensions, carton_i
#              (fiche maître, R63.1)
#   boutiques  zone_b et niv_b (emplacement principal : quartier et position, R06.1), km_b (R83.2, R83.3),
#              detour_b (R83.4, mesuré sur le trajet qui part de b_base)
#   destination  zone_dest et niv_client : épingle et quartier du client (A9), ou zone du relais choisi
#
# Les refus gardent les codes de R91.3 (panier_min, boutique_min, relais_interdit, devis_hg) et les messages de R84.2
# mot pour mot ; les montants s'écrivent comme le veut R12.4.

from collections import OrderedDict
from dataclasses import dataclass, field
from fractions import Fraction

from apps.regles import services as regles
from apps.shipping.itineraire import detours_km, distance_route_km

MODES = {"DELIVERY": "domicile", "PICKUP": "relais"}


class FraisImpossibles(Exception):
    """Une donnée manque pour calculer les frais (fiche, position) : le panier ne peut pas être payé."""

    def __init__(self, code: str, message: str):
        self.code, self.message = code, message
        super().__init__(message)


def montant(n) -> str:
    """R12.4 : francs entiers, une espace entre les milliers (le « F » suit dans le texte)."""
    return f"{int(n):,}".replace(",", " ")


@dataclass
class Destination:
    mode: str                       # domicile ou relais
    zone_dest: str
    niv_client: str | None = None   # domicile seulement
    position: tuple | None = None   # (lat, lon) de l'épingle, domicile seulement


def destination_domicile(quartier: str, lat, lon) -> Destination:
    """Zone et niveau de l'épingle du client (A9, étapes 3 et 4)."""
    from apps.shipping import zones

    if lat is None or lon is None:
        raise FraisImpossibles("epingle", "Posez l'épingle sur votre porte.")
    lat, lon = float(lat), float(lon)
    trouves = zones.chercher_quartiers(quartier)
    code = zones.zone_de_position(lat, lon) or (trouves[0]["zone"] if len(trouves) == 1 else None)
    if code is None:
        raise FraisImpossibles("quartier_inconnu", "Choisissez votre quartier dans la liste.")
    q = trouves[0] if len(trouves) == 1 and trouves[0]["zone"] == code else {"quartier": "", "zone": code}
    return Destination("domicile", code, zones.niveau(q, lat, lon), (lat, lon))


def destination_relais(relais) -> Destination:
    """La zone du relais choisi (zone_dest, R83 : variable du dictionnaire)."""
    from apps.shipping import zones

    for nom in [*(relais.zones or []), relais.address or ""]:
        if str(nom).strip().upper() in {z["zone"] for z in zones.zones()}:
            return Destination("relais", str(nom).strip().upper())
        trouves = {q["zone"] for q in zones.chercher_quartiers(str(nom))}
        if len(trouves) == 1:
            return Destination("relais", trouves.pop())
    raise FraisImpossibles("relais_sans_zone", "Ce point relais n'est rattaché à aucune zone.")


def _lieu_boutique(vendeur_user):
    """(position, zone_b, niv_b) de l'emplacement principal de la boutique (R06.1, R27.4)."""
    from apps.shipping import zones

    profil = getattr(vendeur_user, "vendor_profile", None)
    emplacements = profil.locations.filter(is_active=True).order_by("-is_main", "id") if profil else []
    e = next(iter(emplacements), None)
    if e is None or e.latitude is None or e.longitude is None:
        raise FraisImpossibles("boutique_sans_position", "Une boutique du panier n'a pas encore sa position.")
    lat, lon = float(e.latitude), float(e.longitude)
    q = zones.quartier(e.quartier) if e.quartier else None
    code = zones.zone_de_position(lat, lon) or (q["zone"] if q else None)
    if code is None:
        raise FraisImpossibles("boutique_sans_zone", "Une boutique du panier n'est rattachée à aucune zone.")
    q = q if q and q["zone"] == code else {"quartier": "", "zone": code}
    return (lat, lon), code, zones.niveau(q, lat, lon)


def _prix_payes(produits) -> dict:
    from apps.catalog.models import Product
    from apps.catalog.offers import annotate_effective_price

    ids = [p.pk for p in produits]
    return dict(annotate_effective_price(Product.objects.filter(pk__in=ids)).values_list("pk", "effective_price"))


def _article(produit, qty: int, prix: int) -> dict:
    m = produit.master
    if m is None or m.poids_kg is None or None in (m.dim_l1_cm, m.dim_l2_cm, m.dim_l3_cm):
        raise FraisImpossibles("fiche_incomplete", f"« {produit.title} » n'a pas encore son poids et ses dimensions.")
    return dict(prix_i=prix, q_i=qty, poids_i=m.poids_kg, dimensions_cm=[m.dim_l1_cm, m.dim_l2_cm, m.dim_l3_cm],
                carton_i=m.carton)


def _messages_minimums(boutiques) -> list[str]:
    """R84.2 : un message par minimum manquant, mot pour mot ; [produit] = premier article de la boutique."""
    st = sum(b["st_b"] for b in boutiques)
    messages = []
    if st < regles.reglage("r_panier_min"):
        messages.append(f"Encore {montant(regles.reglage('r_panier_min') - st)} F pour commander")
    for b in boutiques:
        if b["st_b"] < regles.reglage("r_boutique_min"):
            messages.append(f"Le colis de {b['premier_article']} doit atteindre {montant(regles.reglage('r_boutique_min'))} F : "
                            f"ajoute {montant(regles.reglage('r_boutique_min') - b['st_b'])} F")
    return messages


def libelle_livraison(r: dict, mode: str) -> str:
    """R07.5 : jamais le mot « gratuite »."""
    if not r.get("couverture"):
        return ""
    if r["frais_client"] == 0:
        return "Livraison offerte"
    couv_max = regles.reglage("r_relais") if mode == "relais" else regles.reglage("r_niv_centre")
    return f"Livraison offerte jusqu'à {montant(couv_max)} F"


@dataclass
class Devis:
    ok: bool
    refus: dict = field(default_factory=dict)
    messages: list = field(default_factory=list)
    detail: dict = field(default_factory=dict)

    @property
    def frais_client(self) -> int:
        return self.detail.get("frais_client", 0)


def calculer(lignes: list[tuple], destination: Destination, moyen: str = "momo", user=None) -> Devis:
    """Frais et total d'un panier ; `lignes` : [(Product, quantité)] dans l'ordre du panier."""
    m = regles.moteur()
    mode = destination.mode

    # R01.1, R03.2 : le Wallet n'est un moyen de paiement que s'il est ouvert.
    if moyen == "wallet" and not regles.reglage("r_wallet_ouvert"):
        return Devis(False, {"refus": "wallet_ferme"}, ["Le paiement par le Wallet n'est pas encore ouvert."])
    if moyen not in ("momo", "wallet", "comptoir"):
        return Devis(False, {"refus": "moyen"}, ["Moyen de paiement non disponible."])

    prix = _prix_payes([p for p, _ in lignes])
    par_boutique = OrderedDict()
    for produit, qty in lignes:
        b = par_boutique.setdefault(produit.vendor_id, {"vendeur": produit.vendor, "articles": [], "premier_article": produit.title, "st_b": 0})
        p = int(prix.get(produit.pk, produit.price_xaf))
        b["articles"].append(_article(produit, qty, p))
        b["st_b"] += p * qty
    boutiques = list(par_boutique.values())

    # A1, étape 1 (R84) : tous les messages, avant tout autre calcul.
    messages = _messages_minimums(boutiques)
    if messages:
        r = m.commande(mode, {"zone_dest": destination.zone_dest, "niv_client": destination.niv_client},
                       [dict(zone_b="", niv_b="centre", km_b=0, detour_b=0, articles=b["articles"]) for b in boutiques])
        return Devis(False, {k: v for k, v in r.items() if k in ("refus", "b", "manque")}, messages)

    entrees, positions, sources = [], [], set()
    for b in boutiques:
        pos, zone_b, niv_b = _lieu_boutique(b["vendeur"])
        km = Fraction(0)
        if mode == "domicile":
            km, source = distance_route_km(pos, destination.position)
            sources.add(source)
        positions.append(pos)
        entrees.append(dict(zone_b=zone_b, niv_b=niv_b, km_b=km, detour_b=0, articles=b["articles"]))

    dest = {"zone_dest": destination.zone_dest, "niv_client": destination.niv_client}
    r = m.commande(mode, dest, entrees)
    if "refus" not in r and mode == "domicile" and len(entrees) > 1:
        # R83.4 : détours sur le trajet qui part de b_base (b_base ne dépend pas des détours, R08.1).
        for e, d in zip(entrees, detours_km(positions, destination.position, r["b_base"] - 1)):
            e["detour_b"] = d
        r = m.commande(mode, dest, entrees)
    if "refus" in r:
        message = {"relais_interdit": "Ce colis se livre seulement à domicile",  # R10.2, mot pour mot
                   "devis_hg": "Ce colis est hors gabarit : la livraison se fait sur devis."}.get(r["refus"], "")
        return Devis(False, r, [message] if message else [])

    detail = {k: (float(v) if isinstance(v, Fraction) else v) for k, v in r.items()}
    detail.update(
        mode=mode, moyen=moyen,
        boutiques=[{"vendeur": b["vendeur"].pk, "zone_b": e["zone_b"], "niv_b": e["niv_b"], "km_b": float(e["km_b"]),
                    "detour_b": float(e["detour_b"]), "colis_b": c, "st_b": b["st_b"]}
                   for b, e, c in zip(boutiques, entrees, r["colis_b"])],
        distances=sorted(sources),
        libelle_livraison=libelle_livraison(r, mode),
        reglages=regles.empreinte(),
    )
    if moyen == "comptoir":  # R42 (feuille de route D14) : avance maintenant, reste au comptoir du relais
        from . import comptoir

        bs = [dict(zone_b=e["zone_b"], niv_b=e["niv_b"], km_b=e["km_b"], detour_b=e["detour_b"], colis_b=c, st_b=b["st_b"])
              for b, e, c in zip(boutiques, entrees, r["colis_b"])]
        rc = m.comptoir(dest, bs, comptoir.compte(user), mode=mode)
        if "refus" in rc:
            return Devis(False, rc, [comptoir.MESSAGES.get(rc["refus"], "").format(**rc)])
        c = {k: int(rc[k]) for k in ("avance", "frais_momo_avance", "au_comptoir", "frais_momo_comptoir")}
        detail.update(comptoir=c, frais_momo=c["frais_momo_avance"], total_a_payer=c["avance"] + c["frais_momo_avance"])
    elif moyen == "wallet":  # R02.5
        detail.update(frais_momo=0, total_a_payer=r["base_paiement"])
    else:
        detail["total_a_payer"] = r["total_momo"]
    seuil = regles.reglage("r_seuil_relais") if mode == "relais" else regles.reglage("r_seuil_dom")
    if r["st"] < seuil:  # R07.6
        detail["manque_livraison_offerte"] = seuil - r["st"]
    return Devis(True, detail=detail)
