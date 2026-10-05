# backend/apps/cart/services.py
# Le panier vu par le serveur : lu depuis la base, recalculé depuis zéro par les moteurs.
#
#   - prix : celui de l'offre aujourd'hui (pont → catalog.Product.price_xaf), jamais celui envoyé par le site ;
#   - frais : belivay_moteurs.frais.calculer (CAL-06 à CAL-11), une sous-commande par boutique (CCY-15) ;
#   - changements de prix (CAL-11) : baisse appliquée tout de suite, hausse montrée et à accepter, article retiré
#     de la vente ou dernier exemplaire pris : à enlever ;
#   - comptoir : belivay_moteurs.comptoir.eligibilite (CAL-13, ordre CPN-36), avec le compte du client.
#
# Les données d'autres applications du kit (profil, adresse, abonnement) sont lues si l'application est
# installée (import paresseux) : chaque application du kit reste installable seule.

import importlib
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from apps.client_core import parametres, pont

from .models import FicheLogistique, LignePanier, Panier


def appeler(module: str, fonction: str, *args, defaut=None, **kwargs):
    """Fonction d'une autre application du kit si elle est installée, sinon `defaut`."""
    try:
        f = getattr(importlib.import_module(module), fonction)
    except (ImportError, AttributeError):
        return defaut
    return f(*args, **kwargs)


# ── Lecture ─────────────────────────────────────────────────────────────────────────────────────────────


def panier_de(user) -> Panier:
    return Panier.objects.get_or_create(client=user)[0]


def lignes_actives(panier: Panier):
    return panier.lignes.filter(retiree_le__isnull=True, reservee_pour__isnull=True)


def classe_de(product_id: int) -> tuple[str, bool]:
    """(classe de colis, gros carton) d'un produit ; sans fiche : BELIVAY_CLASSE_PAR_DEFAUT, sinon refus (D3)."""
    fiche = FicheLogistique.objects.filter(product_id=product_id).first()
    if fiche is not None:
        return fiche.classe, fiche.gros
    defaut = getattr(settings, "BELIVAY_CLASSE_PAR_DEFAUT", None)
    if defaut:
        return defaut, False
    from belivay_moteurs.erreurs import PanierInvalide

    raise PanierInvalide(f"produit {product_id} : classe de colis inconnue (fiche logistique à créer)")


def relais_du_panier(user, panier: Panier):
    rid = panier.relay_id
    if rid is None:
        profil = appeler("apps.client_accounts.services", "profil", user)
        rid = getattr(profil, "relais_habituel_id", None)
    return pont.relais(rid) if rid else None


def adresse_du_panier(user, panier: Panier):
    if panier.adresse_id:
        adresse = appeler("apps.client_accounts.services", "adresse", user, panier.adresse_id)
        if adresse is not None:
            return adresse
    return appeler("apps.client_accounts.services", "adresse_principale", user)


def _position(objet):
    if objet is None:
        return None
    for lat, lon in (("lat", "lon"), ("latitude", "longitude")):
        a, b = getattr(objet, lat, None), getattr(objet, lon, None)
        if a is not None and b is not None:
            return Decimal(str(a)), Decimal(str(b))
    return None


def distance_km(a, b) -> Decimal | None:
    """Distance géodésique affichée (CAL-04, DP-49) entre deux positions (lat, lon) ; None si l'une manque."""
    if not a or not b:
        return None
    from belivay_moteurs.geo import Position
    from belivay_moteurs.geo import distance_km as d

    return d(Position(*a), Position(*b))


def prix_flash(product_id) -> int | None:
    """Prix de l'offre flash en cours (apps.extras, FF-FLASH), None sans offre active."""
    o = appeler("apps.extras.services", "offre_flash", product_id)
    return int(o["prix"]) if o else None


def _avec_flash(lignes, produits: dict) -> dict:
    """Une ligne ajoutée « flash » se paie au prix de l'offre tant qu'elle court ; ensuite, au prix normal (hausse
    signalée par changements())."""
    from dataclasses import replace

    sortie = dict(produits)
    for lg in lignes:
        p = sortie.get(lg.product_id)
        if lg.flash and p is not None:
            prix = prix_flash(lg.product_id)
            if prix is not None:
                sortie[lg.product_id] = replace(p, prix=prix)
    return sortie


# ── Vers le moteur ──────────────────────────────────────────────────────────────────────────────────────


def vers_moteur(user, panier: Panier, lignes=None):
    """(belivay_moteurs.frais.Panier, {boutique: [lignes]}, {product_id: pont.Produit}) ; Panier None si vide."""
    from belivay_moteurs.frais import Article, SousCommande
    from belivay_moteurs.frais import Panier as PanierMoteur

    lignes = list(lignes if lignes is not None else lignes_actives(panier))
    produits = _avec_flash(lignes, pont.produits([lg.product_id for lg in lignes]))
    par_boutique: dict[str, list] = {}
    zones: dict[str, str] = {}
    positions: dict[str, tuple] = {}
    for lg in lignes:
        p = produits.get(lg.product_id)
        if p is None or not p.actif:
            continue
        nom = p.boutique.nom if p.boutique else f"Boutique {lg.vendor_id or '?'}"
        par_boutique.setdefault(nom, []).append(lg)
        zones[nom] = p.boutique.zone if p.boutique else ""
        if p.boutique and p.boutique.position:
            positions[nom] = p.boutique.position
    if not par_boutique:
        return None, {}, produits
    domicile = panier.mode == Panier.Mode.DOMICILE
    pos_adresse = _position(adresse_du_panier(user, panier)) if domicile else None
    sous = []
    for nom, lgs in par_boutique.items():
        articles = tuple(Article(str(lg.product_id), produits[lg.product_id].prix, lg.qte, classe_de(lg.product_id)[0]) for lg in lgs)
        sous.append(SousCommande(nom, zones[nom], articles, distance_km(positions.get(nom), pos_adresse) if domicile else None))
    return PanierMoteur(panier.mode, tuple(sous)), par_boutique, produits


def frais(user, panier: Panier):
    """(panier moteur, FraisPanier) ou (None, None) pour un panier vide."""
    from belivay_moteurs.frais import calculer

    moteur, _, _ = vers_moteur(user, panier)
    if moteur is None:
        return None, None
    return moteur, calculer(moteur, parametres.livraison())


def frais_en_dict(f) -> dict | None:
    if f is None:
        return None
    champs = (
        "sous_total",
        "ramassages",
        "remises",
        "supplements",
        "offert",
        "total",
        "seuil",
        "colis",
        "economie",
        "reste_ramassages",
        "manque_pour_seuil",
        "progression_pour_cent",
    )
    return {k: getattr(f, k) for k in champs}


# ── Changements de prix (CAL-11) ────────────────────────────────────────────────────────────────────────


def changements(panier: Panier, appliquer_baisses: bool = True) -> list[dict]:
    """ChangementPanier[] du site ; les baisses sont appliquées (prix_vu mis à jour) ; le reste attend l'accord."""
    sortie = []
    lignes = list(lignes_actives(panier))
    produits = _avec_flash(lignes, pont.produits([lg.product_id for lg in lignes]))
    for lg in lignes:
        p = produits.get(lg.product_id)
        base = {
            "id": str(lg.pk),
            "titre": p.titre if p else "",
            "variante": lg.variante or None,
            "dessin": pont.image(lg.product_id) if p else "",
            "qte": lg.qte,
        }
        if p is None or not p.actif:
            sortie.append({**base, "type": "retire", "avant": lg.prix_vu, "apres": lg.prix_vu})
        elif p.stock is not None and p.stock < lg.qte:
            sortie.append({**base, "type": "pris", "avant": lg.prix_vu, "apres": p.prix})
        elif p.prix > lg.prix_vu:
            sortie.append({**base, "type": "hausse", "avant": lg.prix_vu, "apres": p.prix})
        elif p.prix < lg.prix_vu:
            sortie.append({**base, "type": "baisse", "avant": lg.prix_vu, "apres": p.prix})
            if appliquer_baisses:
                LignePanier.objects.filter(pk=lg.pk).update(prix_vu=p.prix)
    return sortie


def accepter_changements(user, panier: Panier) -> None:
    """Hausses acceptées ; retirés enlevés ; « pris » enlevés et gardés en favori (CL-08)."""
    for c in changements(panier):
        lg = LignePanier.objects.get(pk=int(c["id"]))
        if c["type"] in ("hausse", "baisse"):
            lg.prix_vu = c["apres"]
            lg.save(update_fields=["prix_vu"])
        elif c["type"] == "pris":
            pont.mettre_en_favori(user, lg.product_id)
            lg.delete()
        else:
            lg.delete()


# ── Comptoir (CAL-13) ───────────────────────────────────────────────────────────────────────────────────


def compte_comptoir(user):
    """CompteClient du moteur comptoir.py, construit depuis les commandes retirées et les refus au comptoir."""
    from apps.pickup.models import CompteComptoir, MontantsCommande, SousCommande
    from belivay_moteurs.comptoir import CompteClient

    commandes = MontantsCommande.objects.filter(client=user).values_list("order_id", flat=True)
    retirees = set(SousCommande.objects.filter(order_id__in=commandes, remise_le__isnull=False).values_list("order_id", flat=True))
    avec_incident = set(
        SousCommande.objects.filter(order_id__in=retirees, etat__in=["en_litige", "retour_en_cours"]).values_list("order_id", flat=True)
    )
    refus = CompteComptoir.objects.filter(client=user).values_list("refus", flat=True).first() or 0
    # Palier IFA négatif : relaya n'a pas de palier IFA acheteur (CORRESPONDANCE § 11.3) ; décision D11.
    ifa_negatif = bool(appeler("apps.client_accounts.services", "ifa_negatif", user, defaut=False))
    return CompteClient(len(retirees), len(retirees - avec_incident), refus, ifa_negatif)


def eligibilite_comptoir(user, moteur, f) -> dict | None:
    if moteur is None:
        return None
    from belivay_moteurs.comptoir import eligibilite, partage

    e = eligibilite(moteur, f, compte_comptoir(user), parametres.paiement())
    p = partage(f)
    return {
        "propose": e.propose,
        "ligne": e.ligne,
        "plafond": e.plafond,
        "palier": e.palier.value,
        "maintenant": p.maintenant,
        "au_retrait": p.au_retrait,
    }


# ── Ce que le site lit : DonneesPanier (source.ts) ──────────────────────────────────────────────────────


def ligne_en_dict(lg: LignePanier, p, classe: str, relais_pos=None) -> dict:
    offres = []
    for o in pont.autres_offres(lg.product_id):
        if o.boutique is None:
            continue
        km = distance_km(relais_pos, o.boutique.position)
        offres.append(
            {
                "boutique": o.boutique.nom,
                "zone": o.boutique.zone,
                "prix": o.prix,
                "km": float(km) if km is not None else 0.0,
                "score": 0,
                "ventes": 0,
            }
        )
    d = {
        "id": str(lg.pk),
        "p": str(lg.product_id),
        "titre": p.titre,
        "variante": lg.variante or None,
        "dessin": pont.image(lg.product_id),
        "prix": p.prix,
        "qte": lg.qte,
        "stock": p.stock if p.stock is not None else lg.qte,
        "classe": classe,
        "boutique": p.boutique.nom if p.boutique else "",
        "offres": offres,
    }
    if lg.options:
        d["options"] = [{"nom": k, "valeurs": [v], "choisi": v} for k, v in lg.options.items()]
    return d


def donnees_panier(user, panier: Panier) -> dict:
    """DonneesPanier (source.ts) + changements, frais et comptoir calculés par le serveur."""
    chg = changements(panier)
    moteur, f = frais(user, panier)
    relais = relais_du_panier(user, panier)
    _, par_boutique, produits = vers_moteur(user, panier)
    lignes, boutiques = [], {}
    for nom, lgs in par_boutique.items():
        p0 = produits[lgs[0].product_id]
        boutiques[nom] = {
            "zone": p0.boutique.zone if p0.boutique else "",
            "delai": "",
            "palier": p0.boutique.palier if p0.boutique else "",
            "suggestions": [],
        }
        for lg in lgs:
            lignes.append(ligne_en_dict(lg, produits[lg.product_id], classe_de(lg.product_id)[0], relais.position if relais else None))
    adresse = adresse_du_panier(user, panier)
    comptoir = eligibilite_comptoir(user, moteur, f)
    plafond = comptoir["plafond"] if comptoir else _plafond_comptoir(user)
    return {
        "mode": panier.mode,
        "lignes": lignes,
        "boutiques": boutiques,
        "relais": relais.nom if relais else "",
        "adresse": (getattr(adresse, "libelle", None) or getattr(adresse, "nom", None)) if adresse is not None else None,
        "plafondComptoir": plafond,
        "numeroVerifie": bool(appeler("apps.client_accounts.services", "numero_verifie", user, defaut=None)),
        # Les favoris restent servis par relaya (GET /api/auth/favorites/) : le site les lit déjà.
        "favoris": [],
        "changements": chg,
        "frais": frais_en_dict(f),
        "comptoir": comptoir,
        "version_parametres": parametres.version(),
    }


def _plafond_comptoir(user) -> int:
    from belivay_moteurs.comptoir import plafond

    return plafond(compte_comptoir(user), parametres.paiement())


def lignes_figees(par_boutique: dict, produits: dict) -> list[dict]:
    """Lignes du panier figées pour une commande (pickup.services.creer_sous_commandes, PanierPartage.lignes)."""
    sortie = []
    for nom, lgs in par_boutique.items():
        for lg in lgs:
            p = produits[lg.product_id]
            classe, gros = classe_de(lg.product_id)
            sortie.append(
                {
                    "boutique": nom,
                    "zone": p.boutique.zone if p.boutique else "",
                    "vendor_id": p.boutique.id if p.boutique else None,
                    "product_id": lg.product_id,
                    "titre": p.titre,
                    "prix": p.prix,
                    "qte": lg.qte,
                    "classe": classe,
                    "gros": gros,
                }
            )
    return sortie


def moteur_depuis_lignes(mode: str, lignes: list[dict]):
    """Panier du moteur reconstruit depuis des lignes figées (panier partagé, commande)."""
    from belivay_moteurs.frais import Article, SousCommande
    from belivay_moteurs.frais import Panier as PanierMoteur

    par: dict[str, list[dict]] = {}
    for lg in lignes:
        par.setdefault(lg["boutique"], []).append(lg)
    sous = tuple(
        SousCommande(b, ls[0]["zone"], tuple(Article(str(x["product_id"]), x["prix"], x["qte"], x["classe"]) for x in ls))
        for b, ls in par.items()
    )
    return PanierMoteur(mode, sous) if sous else None


# ── Écritures ───────────────────────────────────────────────────────────────────────────────────────────


def ajouter(user, product_id: int, qte: int = 1, variante: str = "", options: dict | None = None, flash: bool = False) -> LignePanier:
    """Ajoute une offre au panier (même offre, même variante : quantité augmentée)."""
    p = pont.produit(product_id)
    if p is None or not p.actif:
        from apps.client_core.erreurs import refus

        raise refus("retire", "Cet article n'est plus en vente.")
    classe_de(p.id)  # refus clair si la classe de colis manque
    panier = panier_de(user)
    lg = lignes_actives(panier).filter(product_id=p.id, variante=variante or "").first()
    if lg is not None:
        lg.qte += qte
        lg.save(update_fields=["qte"])
    else:
        position = (lignes_actives(panier).order_by("-position").values_list("position", flat=True).first() or 0) + 1
        lg = LignePanier.objects.create(
            panier=panier,
            product_id=p.id,
            vendor_id=p.boutique.id if p.boutique else None,
            variante=variante or "",
            options=options or {},
            qte=qte,
            prix_vu=(prix_flash(p.id) if flash else None) or p.prix,
            flash=flash,
            position=position,
        )
    if p.stock is not None and lg.qte > p.stock:
        from apps.client_core.erreurs import refus

        lg.qte = max(p.stock, 0)
        lg.save(update_fields=["qte"])
        raise refus("stock", "Il n'en reste pas assez.", {"stock": p.stock})
    return lg


def retirer(lg: LignePanier) -> None:
    lg.retiree_le = timezone.now()
    lg.save(update_fields=["retiree_le"])
