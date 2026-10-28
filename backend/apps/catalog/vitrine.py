"""
Ce que la vitrine montre d'un catalogue encore clairsemé — tâche D29.

    « N'afficher que les catégories assez remplies ; masquer celles qui sont
      presque vides. »

POURQUOI
    Une catégorie vide est une promesse non tenue : le visiteur clique sur
    « Électroménager », arrive sur une page sans rien, et doute du reste du
    site. Au lancement, beaucoup de catégories seront dans ce cas.

CE QUE LE SEUIL VAUT, ET POURQUOI
    `CATALOGUE_OFFRES_MINIMUM_PAR_CATEGORIE` vaut 1 par défaut : on masque ce
    qui est strictement vide, et rien d'autre. C'est le seul choix qui ne
    demande aucun arbitrage — une catégorie sans une seule offre n'est utile à
    personne. Monter le seuil (3, 5…) relève d'une décision produit : le
    réglage est là pour ça, modifiable sans toucher au code.

LE COMPTE SE FAIT SUR LE SOUS-ARBRE
    « Téléphonie » peut n'avoir aucune offre en propre et trois smartphones
    dans sa sous-catégorie. La masquer couperait l'accès à ses enfants. On
    compte donc une catégorie ET sa descendance.

LE FILTRE SE DEMANDE, IL NE S'IMPOSE PAS
    La vitrine passe `?vitrine=1` sur `categories/tree/` et
    `categories/`. Sans ce paramètre, rien n'est masqué.

    Ce n'était pas l'idée de départ — poser le filtre d'office semblait plus
    sûr. Les tests ont montré le contraire : `categories/tree/` est aussi
    « l'arbre qui alimente le sélecteur » du vendeur. Filtré d'office, un
    vendeur ne pourrait jamais déposer la PREMIÈRE offre d'une catégorie
    neuve, qui ne sortirait donc jamais de son vide. Même piège que
    `categories_flat`, la liste de choix des formulaires, qui n'est pas
    filtrée non plus.

    Un endpoint, deux publics : c'est à l'appelant de dire lequel il est.

    L'équipe, elle, n'est jamais filtrée même avec le paramètre : masquer une
    catégorie vide à l'administrateur qui cherche justement à la remplir
    n'aiderait personne.
"""

from django.conf import settings
from django.db.models import Count

from .models import Category, ModerationStatus, Product


def seuil_minimum() -> int:
    """Nombre d'offres publiées au-dessous duquel une catégorie est masquée."""
    return int(getattr(settings, "CATALOGUE_OFFRES_MINIMUM_PAR_CATEGORIE", 1))


def offres_par_categorie() -> dict[int, int]:
    """
    {id de catégorie: nombre d'offres publiées DIRECTES}, en une requête.

    « Publiée » veut dire ce que la vitrine sert vraiment : active et
    approuvée par la modération — la même condition que la liste des produits.
    """
    lignes = (
        Product.objects
        .filter(is_active=True, moderation_status=ModerationStatus.APPROVED)
        .values("category_id")
        .annotate(nombre=Count("id"))
    )
    return {
        ligne["category_id"]: ligne["nombre"]
        for ligne in lignes
        if ligne["category_id"] is not None
    }


def categories_trop_vides(seuil: int | None = None) -> set[int]:
    """
    Les catégories à masquer : celles dont le sous-arbre compte moins de
    `seuil` offres publiées.

    Deux requêtes, quel que soit le nombre de catégories : une pour les
    comptes, une pour la hiérarchie. Le reste se fait en mémoire, comme
    `Category.hidden_subtree_ids()` juste à côté.
    """
    if seuil is None:
        seuil = seuil_minimum()
    if seuil <= 0:
        return set()

    directs = offres_par_categorie()
    lignes = list(Category.objects.values_list("id", "parent_id"))

    enfants: dict[int | None, list[int]] = {}
    for cat_id, parent_id in lignes:
        enfants.setdefault(parent_id, []).append(cat_id)

    totaux: dict[int, int] = {}

    def total(cat_id: int, vus: frozenset[int]) -> int:
        # `vus` protège d'un cycle parent/enfant : une base abîmée ne doit pas
        # faire tourner la vitrine en boucle infinie.
        if cat_id in totaux:
            return totaux[cat_id]
        if cat_id in vus:
            return 0
        chemin = vus | {cat_id}
        somme = directs.get(cat_id, 0)
        for enfant in enfants.get(cat_id, ()):
            somme += total(enfant, chemin)
        totaux[cat_id] = somme
        return somme

    for cat_id, _ in lignes:
        total(cat_id, frozenset())

    return {cat_id for cat_id, nombre in totaux.items() if nombre < seuil}


def masquees_pour(utilisateur) -> set[int]:
    """
    Tout ce que la vitrine doit cacher à CE visiteur : les sous-arbres
    désactivés par l'admin, et — sauf pour l'équipe — les catégories trop
    vides.

    L'équipe voit le catalogue tel qu'il est : masquer une catégorie vide à
    l'administrateur qui cherche justement à la remplir n'aiderait personne.
    """
    masquees = set(Category.hidden_subtree_ids())
    if not getattr(utilisateur, "is_staff", False):
        masquees |= categories_trop_vides()
    return masquees
