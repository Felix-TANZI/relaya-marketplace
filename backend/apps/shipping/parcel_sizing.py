# backend/apps/shipping/parcel_sizing.py
# Suggestion de categorie de colis, deduite du contenu de la commande.
#
# ─────────────────────────────────────────────────────────────────────────────
# UNE SUGGESTION, PAS UNE DECISION
#
# Le gerant du point relais a le colis EN MAIN. Aucune estimation ne battra
# ce qu'il voit. Ce module propose une categorie ; c'est lui qui tranche.
#
# Trois raisons de ne pas decider a sa place :
#
#   1. sa REMUNERATION en depend — lui retirer le dernier mot sur son propre
#      revenu serait mal recu, et a juste titre
#   2. une proposition fausse se corrige en un clic ; une decision fausse se
#      decouvre au versement, quand il est trop tard
#   3. le catalogue ne porte NI POIDS NI DIMENSIONS : toute estimation reste
#      une approximation par famille de produits
#
# ─────────────────────────────────────────────────────────────────────────────
# COMMENT ELLE FONCTIONNE
#
# On remonte l'arbre des categories jusqu'a trouver une regle. Une regle
# posee sur « Refrigeration & congelation » l'emporte sur celle de sa racine
# « Electromenager » — le plus precis gagne, comme pour les tarifs relais.
#
# Le prix sert d'INDICE SECONDAIRE seulement. Un bijou a 400 000 FCFA tient
# dans une poche : le prix seul serait un mauvais critere.
#
# Sur un panier multi-articles, la PLUS GROSSE categorie l'emporte. Un
# telephone et un refrigerateur voyagent dans le carton du refrigerateur.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging

logger = logging.getLogger("apps.shipping.parcel_sizing")

SMALL = "SMALL"
STANDARD = "STANDARD"
LARGE = "LARGE"
BULKY = "BULKY"

#: Du plus petit au plus gros. Sert a departager un panier melange.
ORDRE = [SMALL, STANDARD, LARGE, BULKY]


# ─────────────────────────────────────────────────────────────────────────────
# TABLE DE CORRESPONDANCE
#
# Les cles sont des FRAGMENTS de slug, cherches dans la chaine complete des
# categories parentes. Un fragment court attrape ses declinaisons :
# « refrigeration » attrape aussi « refrigeration-congelation ».
#
# L'ordre compte : la premiere correspondance trouvee en remontant de la
# feuille vers la racine gagne.
# ─────────────────────────────────────────────────────────────────────────────

REGLES: list[tuple[str, str]] = [
    # ── Encombrants : ne rentrent pas dans une voiture ───────────────────
    ("refrigeration", BULKY),
    ("congelateur", BULKY),
    ("lavage-sechage", BULKY),
    ("machine-a-laver", BULKY),
    ("cuisiniere", BULKY),
    ("climatisation", BULKY),
    ("groupe-electrogene", BULKY),
    ("mobilier", BULKY),
    ("meuble", BULKY),
    ("matelas", BULKY),
    ("salon", BULKY),
    ("velo", BULKY),

    # ── Gros colis : deux mains necessaires ──────────────────────────────
    # ─────────────────────────────────────────────────────────────────
    # ATTENTION AUX FRAGMENTS TROP COURTS
    #
    # « tele » attrapait « telephonie » : un ecouteur Bluetooth devenait un
    # gros colis. Les fragments doivent etre assez longs pour ne pas
    # mordre sur une famille voisine.
    # ─────────────────────────────────────────────────────────────────
    ("televiseur", LARGE),
    ("television", LARGE),
    ("ecran-tv", LARGE),
    ("cuisson", LARGE),
    ("micro-onde", LARGE),
    # « four » attraperait « fourniture scolaire » : on exige le tiret ou
    # le mot complet plutot que le fragment nu.
    ("four-encastrable", LARGE),
    ("four a", LARGE),
    ("ventilation", LARGE),
    ("onduleur", LARGE),
    ("solaire", LARGE),
    ("entretien-sol", LARGE),
    ("aspirateur", LARGE),
    ("electromenager", LARGE),
    ("menager", LARGE),
    ("decoration", LARGE),
    ("literie", LARGE),
    ("fitness", LARGE),
    ("musculation", LARGE),

    # ── Petits colis : tiennent dans une enveloppe ou une poche ──────────
    ("bijou", SMALL),
    ("montre", SMALL),
    ("accessoire-telephone", SMALL),
    ("coque", SMALL),
    ("ecouteur", SMALL),
    ("carte-memoire", SMALL),
    ("cle-usb", SMALL),
    ("parfum", SMALL),
    ("maquillage", SMALL),
    ("cosmetique", SMALL),
    ("soin-visage", SMALL),
    ("fourniture-scolaire", SMALL),
    ("papeterie", SMALL),
    ("stylo", SMALL),
    ("livre", SMALL),
    ("epice", SMALL),
    ("the", SMALL),
    ("cafe", SMALL),

    # ── Standard : le reste des familles connues ─────────────────────────
    ("mode-femme", STANDARD),
    ("mode-homme", STANDARD),
    ("chaussure", STANDARD),
    ("vetement", STANDARD),
    ("sac", STANDARD),
    ("bebe", STANDARD),
    ("enfant", STANDARD),
    ("jouet", STANDARD),
    ("sport", STANDARD),
    ("maison", STANDARD),
    ("cuisine", STANDARD),
    ("artisanat", STANDARD),
    ("supermarche", STANDARD),
    ("agroalimentaire", STANDARD),
    ("beaute", STANDARD),
    ("telephonie", STANDARD),
    ("smartphone", STANDARD),
    ("informatique", STANDARD),
    ("ordinateur", STANDARD),
]

#: Au-dela, un article est rarement une enveloppe — meme sans regle connue.
#: Sert UNIQUEMENT a remonter SMALL vers STANDARD, jamais a descendre.
SEUIL_PRIX_XAF = 150_000


def _chaine_categories(produit) -> str:
    """
    Slugs de la categorie du produit et de tous ses parents, concatenes.

    On remonte l'arbre : une regle posee sur une sous-categorie precise
    l'emporte, et la racine sert de filet.
    """
    morceaux: list[str] = []
    categorie = getattr(produit, "category", None)
    # Garde-fou : un arbre mal forme ne doit pas boucler indefiniment.
    for _ in range(10):
        if categorie is None:
            break
        slug = getattr(categorie, "slug", "") or ""
        nom = getattr(categorie, "name", "") or ""
        morceaux.append(f"{slug} {nom}".lower())
        categorie = getattr(categorie, "parent", None)
    return " | ".join(morceaux)


def _taille_du_produit(produit) -> tuple[str, str]:
    """
    Retourne (taille, motif) pour un produit.

    Le motif explique la deduction : il remonte jusqu'a l'interface pour que
    le gerant comprenne POURQUOI cette categorie est proposee.
    """
    chaine = _chaine_categories(produit)
    titre = (getattr(produit, "title", "") or "").lower()
    corpus = f"{chaine} | {titre}"

    for fragment, taille in REGLES:
        if fragment in corpus:
            return taille, f"catégorie « {fragment.replace('-', ' ')} »"

    # Aucune regle : le prix departage, mais SEULEMENT vers le haut.
    prix = int(getattr(produit, "price_xaf", 0) or 0)
    if prix >= SEUIL_PRIX_XAF:
        return STANDARD, "article de valeur, catégorie inconnue"

    return STANDARD, "catégorie par défaut"


def suggest_parcel_size(order) -> dict:
    """
    Suggere une categorie pour le colis d'une commande.

    Retourne un dictionnaire avec la taille, sa justification, et le degre
    de confiance. Sur un panier melange, la PLUS GROSSE categorie l'emporte :
    un telephone et un refrigerateur voyagent dans le carton du
    refrigerateur.
    """
    defaut = {
        "parcel_size": STANDARD,
        "reason": "aucun article identifiable",
        "confident": False,
    }

    try:
        articles = list(order.items.select_related("product__category").all())
    except Exception:
        logger.debug("Articles illisibles pour la commande %s", order.pk)
        return defaut

    if not articles:
        return defaut

    meilleure = SMALL
    motif = ""
    reconnu = False

    for article in articles:
        produit = getattr(article, "product", None)
        if produit is None:
            continue
        taille, raison = _taille_du_produit(produit)
        if raison != "catégorie par défaut":
            reconnu = True
        if ORDRE.index(taille) >= ORDRE.index(meilleure):
            meilleure = taille
            motif = raison

    if not reconnu:
        return defaut

    # Plusieurs articles : le carton grossit, meme si chacun est petit.
    if len(articles) >= 3 and meilleure == SMALL:
        meilleure = STANDARD
        motif = f"{len(articles)} articles"

    return {
        "parcel_size": meilleure,
        "reason": motif or "catégorie par défaut",
        # `confident` reste faux quand la deduction repose sur un filet :
        # l'interface peut alors presenter la suggestion plus discretement.
        "confident": reconnu,
    }


def suggest_for_shipment(shipment) -> dict:
    """Suggere une categorie a partir d'une expedition."""
    commande = getattr(shipment, "order", None)
    if commande is None:
        return {
            "parcel_size": STANDARD,
            "reason": "commande introuvable",
            "confident": False,
        }
    return suggest_parcel_size(commande)