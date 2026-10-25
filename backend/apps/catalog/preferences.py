# backend/apps/catalog/preferences.py
# Accueil personnalisé et ordre des Flash Deals — feuille de route D9 :
#
#   « Ordonner l'accueil, catégorie par catégorie, selon ces choix puis selon ce que le client regarde, met en favori
#     et achète ; sans choix, servir l'accueil général. »
#   « Ordonner les Flash Deals et leurs notifications selon les préférences du client ; le prix, le stock et le compte
#     à rebours restent les mêmes pour tous. »
#
# Un « univers » est une catégorie racine (son slug) : c'est ce que le client choisit à la première ouverture
# (client_accounts : ProfilClient.interets). Rien n'est personnalisé si le client a coupé la personnalisation
# (ProfilClient.personnalisation, écran Confidentialité).
#
# Poids (choix de l'équipe tech, à régler ici seulement) : un univers choisi passe toujours devant les signaux ;
# parmi les signaux, un achat compte plus qu'un favori, un favori plus qu'une fiche vue.

from datetime import timedelta

from django.utils import timezone

from .models import Category

POIDS_CHOIX = 1000
POIDS_ACHAT, POIDS_FAVORI, POIDS_VU = 8, 5, 2
FENETRE_JOURS = 90


def racines() -> dict[int, int]:
    """id de catégorie -> id de sa racine."""
    parents = dict(Category.objects.values_list("id", "parent_id"))
    racine = {}
    for cid in parents:
        c = cid
        while parents.get(c):
            c = parents[c]
        racine[cid] = c
    return racine


def personnalisation_permise(user) -> bool:
    if not getattr(user, "is_authenticated", False):
        return False
    try:
        from apps.client_accounts.services import profil
    except ImportError:
        return True
    return bool(profil(user).personnalisation)


def scores(user) -> dict[int, int]:
    """Score de chaque univers (id de la catégorie racine) pour ce client ; {} = accueil général."""
    if not personnalisation_permise(user):
        return {}
    from apps.accounts.models import UserFavorite
    from apps.orders.models import OrderItem

    from .models import Product

    racine = racines()
    slug_vers_id = {slug: cid for cid, slug in Category.objects.filter(parent__isnull=True).values_list("id", "slug")}
    s: dict[int, int] = {}
    try:
        from apps.client_accounts.services import profil

        choisis = list(profil(user).interets or [])
    except ImportError:
        choisis = []
    for rang, slug in enumerate(choisis):
        if slug in slug_vers_id:
            s[slug_vers_id[slug]] = s.get(slug_vers_id[slug], 0) + POIDS_CHOIX - rang

    depuis = timezone.now() - timedelta(days=FENETRE_JOURS)

    def ajouter(categories, poids):
        for cid in categories:
            r = racine.get(cid)
            if r:
                s[r] = s.get(r, 0) + poids

    ajouter(OrderItem.objects.filter(order__user=user, order__payment_status__in=["PAID", "VALIDATED"],
                                     order__created_at__gte=depuis, product__isnull=False)
            .values_list("product__category_id", flat=True), POIDS_ACHAT)
    ajouter(UserFavorite.objects.filter(user=user).values_list("product__category_id", flat=True), POIDS_FAVORI)
    try:
        from apps.client_accounts.models import ProduitVu

        vus = ProduitVu.objects.filter(user=user, le__gte=depuis).values_list("product_id", flat=True)
        ajouter(Product.objects.filter(pk__in=list(vus)).values_list("category_id", flat=True), POIDS_VU)
    except ImportError:
        pass
    return s


def ordonner_campagnes(user, campagnes) -> list:
    """Flash Deals de l'univers préféré d'abord ; à égalité, celui qui finit le plus tôt."""
    s = scores(user)
    if not s:
        return sorted(campagnes, key=lambda c: c.ends_at)
    racine = racines()
    return sorted(campagnes, key=lambda c: (-s.get(racine.get(c.product.category_id), 0), c.ends_at))


def notifier_flash(campagne) -> int:
    """
    Alerte flash à l'approbation d'un Flash Deal (D9). Seuls les clients qui ont activé l'alerte flash la reçoivent,
    et seulement si le Flash Deal est dans un univers qu'ils préfèrent, ou s'ils n'ont aucune préférence (accueil
    général). La limite hebdomadaire PUSH-PROMO et les heures calmes restent celles de notifications_client.
    """
    try:
        from apps.notifications_client import services as notifications
        from apps.notifications_client.models import ReglagesNotifications
    except ImportError:
        return 0
    univers = racines().get(campagne.product.category_id)
    titre = f"Vente flash : {campagne.product.title}"[:120]
    texte = f"{campagne.promo_price_xaf} F au lieu de {campagne.reference_price_xaf} F, stock limité."
    n = 0
    for reglage in ReglagesNotifications.objects.filter(flash=True).select_related("user"):
        s = scores(reglage.user)
        if s and s.get(univers, 0) <= 0:
            continue
        resultat = notifications.envoyer_notification(reglage.user, "flash", titre, texte,
                                                      lien=f"/products/{campagne.product_id}")
        n += bool(resultat.get("centre") or resultat.get("pousses"))
    return n
