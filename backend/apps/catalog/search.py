# backend/apps/catalog/search.py
# Recherche tolérante aux fautes et au vocabulaire pour le catalogue.
#
# Trois passes successives, de la plus stricte à la plus large :
#   1. exacte   — tous les mots (ou leurs synonymes) sont présents
#   2. floue    — similarité trigramme, rattrape les fautes de frappe
#   3. connexe  — rien ne correspond : on propose la catégorie la plus proche
#
# La passe 1 couvre le cas normal sans coût supplémentaire. Les passes 2 et 3 ne
# s'exécutent que si la précédente n'a rien donné, elles ne pèsent donc jamais sur
# les recherches qui aboutissent.

import unicodedata

from django.db import DatabaseError
from django.db.models import Q, Value
from django.db.models.functions import Greatest

# Seuil de similarité mot à mot. En dessous, les rapprochements deviennent
# fantaisistes ("robe" ↔ "borne") ; au-dessus, les fautes de deux lettres passent
# à travers. 0.45 tolère environ une faute pour cinq caractères.
WORD_TRIGRAM_THRESHOLD = 0.45

# Seuil du rapprochement par rayon : plus permissif, puisqu'on ne promet ici
# qu'une piste explicitement présentée comme telle à l'utilisateur.
CATEGORY_THRESHOLD = 0.35

# Nombre de résultats flous retenus : au-delà, la pertinence s'effondre.
FUZZY_LIMIT = 60

# Mots vides ignorés : ils n'apportent aucun pouvoir discriminant et feraient
# échouer la passe exacte, qui exige la présence de chaque mot.
STOP_WORDS = {
    "de", "des", "du", "la", "le", "les", "un", "une", "et", "en", "au", "aux",
    "pour", "avec", "sur", "dans", "par", "a", "l", "d", "the", "of",
}

# Familles de mots interchangeables dans un contexte marchand camerounais.
# Chaque ensemble est bidirectionnel : chercher l'un ramène les autres.
SYNONYM_GROUPS = [
    {"telephone", "smartphone", "portable", "mobile", "phone", "cellulaire"},
    {"ordinateur", "laptop", "pc", "notebook", "portable"},
    {"televiseur", "television", "tv", "ecran", "smart tv"},
    {"casque", "ecouteur", "ecouteurs", "audio", "airpods"},
    {"chaussure", "basket", "sneaker", "soulier", "tennis"},
    {"sandale", "tong", "claquette", "nu pieds"},
    {"sac", "sacoche", "cartable", "besace", "pochette"},
    {"montre", "horloge", "bracelet connecte"},
    {"robe", "tenue", "ensemble"},
    {"pagne", "wax", "ankara", "tissu", "vlisco"},
    {"boubou", "bazin", "kaba", "gandoura", "djellaba"},
    {"chemise", "chemisier", "polo"},
    {"pantalon", "jean", "chino", "treillis"},
    {"creme", "lotion", "soin", "hydratant", "pommade"},
    {"savon", "gel douche", "nettoyant"},
    {"huile", "serum", "essence"},
    {"parfum", "fragrance", "eau de toilette", "deodorant"},
    {"maquillage", "cosmetique", "beaute", "makeup"},
    {"karite", "beurre de karite", "shea"},
    {"frigo", "refrigerateur", "congelateur"},
    {"canape", "fauteuil", "salon", "sofa"},
    {"lit", "matelas", "literie"},
    {"marmite", "casserole", "ustensile", "cuisine"},
    {"bebe", "enfant", "puericulture", "nourrisson"},
    {"poussette", "landau"},
    {"velo", "bicyclette", "bike"},
    {"ballon", "football", "foot"},
    {"halteres", "musculation", "fitness", "gym"},
    {"riz", "cereale", "cereales"},
    {"epice", "condiment", "assaisonnement"},
    {"chargeur", "cable", "adaptateur"},
    {"coque", "etui", "protection"},
    {"camera", "surveillance", "videosurveillance"},
    {"imprimante", "scanner"},
]


def _build_synonym_index():
    index = {}
    for group in SYNONYM_GROUPS:
        for word in group:
            index.setdefault(word, set()).update(group)
    return index


SYNONYMS = _build_synonym_index()

# Rattachement conceptuel d'un mot à un rayon. La similarité trigramme est
# orthographique : « robe » ne ressemble pas à « Vêtements », aucun caractère
# commun ne les rapproche. Cette table apporte le sens que l'orthographe ne porte
# pas, pour proposer un rayon cohérent quand la recherche ne donne rien.
# Les valeurs sont des fragments cherchés dans le nom des catégories.
CONCEPT_CATEGORIES = {
    "robe": ("vetement", "mode", "femme"),
    "chemise": ("vetement", "mode", "homme"),
    "pantalon": ("vetement", "mode"),
    "tshirt": ("vetement", "mode"),
    "boubou": ("vetement", "mode"),
    "pagne": ("vetement", "mode", "tissu"),
    "chaussure": ("chaussure", "shoes"),
    "sandale": ("chaussure", "shoes"),
    "telephone": ("electronique", "telephone", "phone"),
    "ordinateur": ("electronique", "informatique"),
    "televiseur": ("electronique",),
    "casque": ("electronique", "audio", "accessoire"),
    "chargeur": ("electronique", "accessoire"),
    "camera": ("electronique", "securite"),
    "imprimante": ("electronique", "informatique"),
    "montre": ("accessoire", "montre"),
    "sac": ("accessoire", "maroquinerie"),
    "creme": ("beaute", "sante", "cosmetique"),
    "savon": ("beaute", "sante", "hygiene"),
    "huile": ("beaute", "sante"),
    "parfum": ("beaute", "sante"),
    "maquillage": ("beaute", "sante", "cosmetique"),
    "karite": ("beaute", "sante"),
    "frigo": ("maison", "electromenager"),
    "canape": ("maison", "meuble"),
    "lit": ("maison", "meuble", "literie"),
    "marmite": ("maison", "cuisine"),
    "bebe": ("bebe", "enfant", "puericulture"),
    "poussette": ("bebe", "enfant", "puericulture"),
    "velo": ("sport", "loisir"),
    "ballon": ("sport", "loisir"),
    "halteres": ("sport", "loisir", "fitness"),
    "riz": ("aliment", "supermarche", "epicerie"),
    "epice": ("aliment", "supermarche", "epicerie"),
}


def _concept_hints(tokens):
    """Fragments de rayon suggérés par les mots de la requête et leurs synonymes."""
    hints = set()
    for token in tokens:
        for variant in expand_token(token):
            hints.update(CONCEPT_CATEGORIES.get(variant, ()))
    return hints


def normalize(text):
    """Minuscules sans accents : « Beauté » et « beaute » deviennent comparables."""
    if not text:
        return ""
    stripped = unicodedata.normalize("NFKD", str(text))
    stripped = "".join(char for char in stripped if not unicodedata.combining(char))
    return stripped.casefold().strip()


def _singular(word):
    """Dépluralisation minimale : suffit pour « chaussures » → « chaussure »."""
    if len(word) > 3 and word.endswith("x"):
        return word[:-1]
    if len(word) > 3 and word.endswith("s"):
        return word[:-1]
    return word


def tokenize(query):
    """Mots significatifs de la requête, normalisés et sans mots vides."""
    cleaned = "".join(char if char.isalnum() else " " for char in normalize(query))
    return [word for word in cleaned.split() if word and word not in STOP_WORDS]


def expand_token(token):
    """Un mot et tout son voisinage lexical : pluriel, singulier, synonymes."""
    variants = {token, _singular(token)}
    for variant in list(variants):
        variants.update(SYNONYMS.get(variant, set()))
    return {variant for variant in variants if len(variant) >= 2}


# Champs interrogés, du plus au moins signifiant.
SEARCH_FIELDS = (
    "title",
    "short_description",
    "description",
    "sku",
    "category__name",
    "master__title",
    "master__brand",
)


def _token_filter(token):
    """Un mot est trouvé si l'une de ses variantes apparaît dans l'un des champs."""
    condition = Q()
    for variant in expand_token(token):
        for field in SEARCH_FIELDS:
            condition |= Q(**{f"{field}__unaccent__icontains": variant})
    return condition


def _exact_pass(queryset, tokens):
    """Tous les mots doivent être présents — le comportement attendu par défaut."""
    condition = Q()
    for token in tokens:
        condition &= _token_filter(token)
    return queryset.filter(condition).distinct()


def _loose_pass(queryset, tokens):
    """Au moins un mot présent : rattrape les requêtes trop longues ou bavardes."""
    condition = Q()
    for token in tokens:
        condition |= _token_filter(token)
    return queryset.filter(condition).distinct()


def _fuzzy_pass(queryset, query):
    """
    Similarité trigramme, la passe qui corrige les fautes de frappe.

    On compare *mot à mot* (`TrigramWordSimilarity`) et non chaîne entière : une
    requête courte face à un titre long — « casqe » contre « Casque Bluetooth
    Premium » — obtient un score effondré en comparaison globale, alors que la
    comparaison au mot le plus proche la rattrape. La similarité globale reste
    dans le calcul pour les requêtes qui, elles, ressemblent au titre complet.
    """
    from django.contrib.postgres.search import TrigramSimilarity, TrigramWordSimilarity

    normalized = normalize(query)
    ranked = (
        queryset.annotate(
            search_rank=Greatest(
                TrigramWordSimilarity(normalized, "title"),
                TrigramWordSimilarity(normalized, "category__name"),
                TrigramWordSimilarity(normalized, "short_description"),
                TrigramSimilarity("title", normalized),
                Value(0.0),
            )
        )
        .filter(search_rank__gte=WORD_TRIGRAM_THRESHOLD)
        .order_by("-search_rank")
    )
    return ranked[:FUZZY_LIMIT]


def _related_pass(queryset, query):
    """
    Dernier recours : aucun produit ne ressemble à la requête. On cherche le rayon
    le plus proche, en confrontant aux noms de catégories non seulement la requête
    telle quelle mais aussi ses synonymes — « telephone » ne ressemble pas à
    « Électronique », alors que son synonyme « mobile » oriente le rapprochement.
    """
    from django.contrib.postgres.search import TrigramWordSimilarity

    from .models import Category

    tokens = tokenize(query)

    # 1. Rapprochement par le sens : « robe » → rayon Vêtements.
    hints = _concept_hints(tokens)
    if hints:
        for category in Category.objects.filter(is_active=True):
            name = normalize(category.name)
            if any(hint in name for hint in hints):
                return queryset.filter(category=category), category

    # 2. À défaut, rapprochement par l'orthographe du nom de rayon.
    candidates = {normalize(query)}
    for token in tokens:
        candidates.update(expand_token(token))

    best_category = None
    best_rank = 0.0

    for candidate in candidates:
        if len(candidate) < 3:
            continue
        match = (
            Category.objects.filter(is_active=True)
            .annotate(rank=TrigramWordSimilarity(candidate, "name"))
            .filter(rank__gte=CATEGORY_THRESHOLD)
            .order_by("-rank")
            .first()
        )
        if match is not None and match.rank > best_rank:
            best_category, best_rank = match, match.rank

    if best_category is None:
        return queryset.none(), None

    return queryset.filter(category=best_category), best_category


def smart_product_search(queryset, query):
    """
    Applique la recherche et décrit ce qui a été fait.

    Retourne `(queryset, meta)`. `meta` renseigne le frontend sur la nature des
    résultats pour qu'il puisse le dire à l'utilisateur plutôt que d'afficher
    des produits inattendus sans explication :

      mode="exact"   — correspondance franche
      mode="loose"   — une partie des mots seulement
      mode="fuzzy"   — orthographe rattrapée
      mode="related" — rien de correspondant, rayon voisin proposé
      mode="empty"   — aucune piste
    """
    tokens = tokenize(query)
    meta = {"query": query, "mode": "exact", "is_fallback": False, "suggested_category": None}

    if not tokens:
        return queryset, None

    try:
        results = _exact_pass(queryset, tokens)
        if results.exists():
            return results, meta

        if len(tokens) > 1:
            results = _loose_pass(queryset, tokens)
            if results.exists():
                meta.update(mode="loose", is_fallback=True)
                return results, meta

        results = _fuzzy_pass(queryset, query)
        if results.exists():
            meta.update(mode="fuzzy", is_fallback=True)
            return results, meta

        related, category = _related_pass(queryset, query)
        if category is not None and related.exists():
            meta.update(
                mode="related",
                is_fallback=True,
                suggested_category={"id": category.id, "name": category.name, "slug": category.slug},
            )
            return related, meta

    except DatabaseError:
        # pg_trgm ou unaccent indisponible : on se rabat sur une correspondance
        # partielle, dégradée mais fonctionnelle, plutôt que de renvoyer une 500.
        results = queryset.filter(
            Q(title__icontains=query) | Q(description__icontains=query)
        ).distinct()
        meta.update(mode="loose", is_fallback=not results.exists())
        return results, meta

    meta.update(mode="empty", is_fallback=True)
    return queryset.none(), meta
