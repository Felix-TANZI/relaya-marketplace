# backend/tests/test_d29_vrai_catalogue.py
# Tache D29 — « Mettre en ligne un vrai catalogue ».
#
# Trois puces sur quatre sont verifiables cote serveur :
#
#   « N'afficher que les categories assez remplies ; masquer celles qui sont
#     presque vides. »
#   « Verifier que chaque fiche a sa photo, son prix et sa categorie. »
#   « Retirer les produits et les donnees de demonstration de la version en
#     ligne. »
#
# La quatrieme — remplacer les images et les textes provisoires par de vraies
# photos — depend du contenu fourni cote front, comme le document le dit
# lui-meme (« Depend de : le contenu du catalogue, fourni cote front »).

import pytest
from django.core.management import call_command

from apps.catalog.models import Category, ModerationStatus, Product
from apps.catalog.vitrine import categories_trop_vides, masquees_pour

pytestmark = pytest.mark.django_db


@pytest.fixture
def vendeur(django_user_model):
    return django_user_model.objects.create_user("vendeur_d29", password="D29-2026")


def _offre(categorie, vendeur, titre="Article", publiee=True):
    return Product.objects.create(
        title=titre, category=categorie, vendor=vendeur, price_xaf=15000,
        is_active=publiee,
        moderation_status=(
            ModerationStatus.APPROVED if publiee else ModerationStatus.PENDING
        ),
    )


# ── « Masquer les categories presque vides » ────────────────────────────────

def test_une_categorie_vide_est_masquee(vendeur):
    vide = Category.objects.create(name="Electromenager", slug="electro-d29")
    pleine = Category.objects.create(name="Telephonie", slug="tel-d29")
    _offre(pleine, vendeur)

    masquees = categories_trop_vides()

    assert vide.id in masquees
    assert pleine.id not in masquees


def test_une_offre_non_publiee_ne_remplit_pas_une_categorie(vendeur):
    """
    Une offre en attente de moderation n'est pas visible du visiteur : elle ne
    doit pas faire croire que la categorie est remplie.
    """
    categorie = Category.objects.create(name="Mode", slug="mode-d29")
    _offre(categorie, vendeur, publiee=False)

    assert categorie.id in categories_trop_vides()


def test_une_categorie_parente_reste_visible_grace_a_ses_enfants(vendeur):
    """
    « Telephonie » peut n'avoir aucune offre en propre et trois smartphones
    dans sa sous-categorie. La masquer couperait l'acces a ses enfants.
    """
    parente = Category.objects.create(name="Telephonie", slug="tel-parent-d29")
    enfant = Category.objects.create(
        name="Smartphones", slug="smart-d29", parent=parente,
    )
    _offre(enfant, vendeur)

    masquees = categories_trop_vides()

    assert parente.id not in masquees
    assert enfant.id not in masquees


def test_le_seuil_est_reglable_sans_toucher_au_code(vendeur, settings):
    """
    Monter le seuil est une decision produit. Le reglage existe pour qu'elle
    se prenne dans la configuration, pas dans un fichier source.
    """
    categorie = Category.objects.create(name="Maison", slug="maison-d29")
    _offre(categorie, vendeur, titre="Un seul article")

    settings.CATALOGUE_OFFRES_MINIMUM_PAR_CATEGORIE = 1
    assert categorie.id not in categories_trop_vides()

    settings.CATALOGUE_OFFRES_MINIMUM_PAR_CATEGORIE = 3
    assert categorie.id in categories_trop_vides()


def test_un_seuil_a_zero_ne_masque_rien():
    """Possibilite de tout revoir, sans modifier le code."""
    Category.objects.create(name="Vide", slug="vide-d29")

    assert categories_trop_vides(0) == set()


def test_l_equipe_voit_le_catalogue_tel_qu_il_est(django_user_model):
    """
    Masquer une categorie vide a l'administrateur qui cherche justement a la
    remplir n'aiderait personne.
    """
    vide = Category.objects.create(name="Jardin", slug="jardin-d29")
    admin = django_user_model.objects.create_superuser("adm_d29", "a@d29.co", "p")
    visiteur = django_user_model.objects.create_user("client_d29", password="D29-2026")

    assert vide.id not in masquees_pour(admin)
    assert vide.id in masquees_pour(visiteur)


# ── Le filtre s'applique a la navigation, pas aux formulaires ───────────────

def test_la_vitrine_ne_montre_pas_une_categorie_vide(api_client, vendeur):
    """La vitrine demande le filtre : c'est elle qui parle au visiteur."""
    Category.objects.create(name="Sport", slug="sport-d29")
    pleine = Category.objects.create(name="Audio", slug="audio-d29")
    _offre(pleine, vendeur)

    reponse = api_client.get("/api/catalog/categories/tree/?vitrine=1")

    assert reponse.status_code == 200
    slugs = {c.get("slug") for c in _aplatir(reponse.json())}
    assert "audio-d29" in slugs
    assert "sport-d29" not in slugs


def test_le_selecteur_du_vendeur_montre_tout(api_client):
    """
    `categories/tree/` sans parametre est « l'arbre qui alimente le
    selecteur » du vendeur. Le filtrer empecherait de deposer la PREMIERE
    offre d'une categorie neuve, qui ne sortirait donc jamais de son vide.

    Ce test existe parce que j'avais pose le filtre d'office : six tests sont
    tombes, dont celui du parcours vendeur. Il fige la lecon.
    """
    Category.objects.create(name="Bricolage", slug="brico-d29")

    reponse = api_client.get("/api/catalog/categories/tree/")

    assert reponse.status_code == 200
    assert any(c.get("slug") == "brico-d29" for c in _aplatir(reponse.json()))


def test_la_liste_des_formulaires_montre_tout(api_client):
    """`categories/flat/` n'est jamais filtree, pour la meme raison."""
    Category.objects.create(name="Plomberie", slug="plomb-d29")

    reponse = api_client.get("/api/catalog/categories/flat/")

    assert reponse.status_code == 200
    corps = reponse.json()
    lignes = corps.get("results", corps) if isinstance(corps, dict) else corps
    assert any(c.get("slug") == "plomb-d29" for c in lignes)


def _aplatir(noeuds):
    """L'arbre des categories, a plat."""
    resultat = []
    file = list(noeuds.get("results", noeuds) if isinstance(noeuds, dict) else noeuds)
    while file:
        noeud = file.pop()
        if not isinstance(noeud, dict):
            continue
        resultat.append(noeud)
        file.extend(noeud.get("children", []) or [])
    return resultat


# ── « Verifier que chaque fiche a sa photo, son prix et sa categorie » ──────

def test_le_controle_signale_une_offre_sans_photo(capsys, vendeur):
    categorie = Category.objects.create(name="Images", slug="img-d29")
    _offre(categorie, vendeur, titre="Sans photo")

    with pytest.raises(SystemExit) as sortie:
        call_command("verifier_catalogue")

    assert sortie.value.code == 1
    assert "sans photo" in capsys.readouterr().out


def test_le_controle_signale_une_offre_de_demonstration(capsys, django_user_model):
    """
    « Retirer les produits et les donnees de demonstration de la version en
    ligne. » D31 empeche d'en creer de nouvelles ; ici on retrouve celles qui
    sont deja la.
    """
    demo = django_user_model.objects.create_user("demo_vendor_x", password="D29-2026")
    categorie = Category.objects.create(name="Demo", slug="demo-d29")
    _offre(categorie, demo, titre="Article de demonstration")

    with pytest.raises(SystemExit):
        call_command("verifier_catalogue")

    assert "demonstration" in capsys.readouterr().out


def test_un_catalogue_sain_est_annonce_comme_tel(capsys):
    """Sans offre publiee, il n'y a rien a reprocher."""
    call_command("verifier_catalogue")

    assert "presentable" in capsys.readouterr().out
