# backend/tests/test_d27_simulations_connexion.py
# Tache D27 — « Retirer les simulations de connexion ».
#
# Deux exigences du document sont verifiables cote back-end :
#
#   « Retirer toutes les simulations de connexion de la version en ligne. »
#   « Pour un visiteur non connecte : aucune photo de profil, aucune
#     notification, et des compteurs seulement pour ce qu'il a reellement
#     ajoute. »
#
# La troisieme — « Laisser le visiteur parcourir la vitrine sans compte » —
# est D3, deja livree et couverte par tests/test_visiteur_sans_compte.py.

import pytest
from django.contrib.auth.models import User

pytestmark = pytest.mark.django_db

URL_DEMO = "/api/auth/bootstrap/demo-accounts/"
URL_ADMIN = "/api/auth/bootstrap/admin/"
JETON = "jeton-de-test-pour-d27"


# ── « Retirer toutes les simulations de connexion » ──────────────────────────
#
# L'endpoint fabrique admin_demo, vendeur_demo et livreur_demo avec un mot de
# passe par defaut. Il etait protege par le seul jeton X-Bootstrap-Token — que
# .github/workflows/deploy.yml transmet a la production. Il y etait donc
# joignable. Il faut desormais le jeton ET l'interrupteur.

def test_ferme_par_defaut(api_client, settings):
    """Sans reglage explicite, l'endpoint n'existe pas. C'est l'etat de la production."""
    settings.BOOTSTRAP_ADMIN_TOKEN = JETON

    reponse = api_client.post(URL_DEMO, HTTP_X_BOOTSTRAP_TOKEN=JETON)

    assert reponse.status_code == 404
    assert not User.objects.filter(username="admin_demo").exists()


def test_le_bon_jeton_ne_suffit_plus(api_client, settings):
    """
    Le coeur de D27 : meme avec le jeton exact, interrupteur ferme, rien n'est
    cree. C'est ce test qui tomberait si quelqu'un retirait le garde-fou.
    """
    settings.BOOTSTRAP_ADMIN_TOKEN = JETON
    settings.COMPTES_DEMO_AUTORISES = False

    reponse = api_client.post(URL_DEMO, HTTP_X_BOOTSTRAP_TOKEN=JETON)

    assert reponse.status_code == 404
    assert User.objects.filter(username__endswith="_demo").count() == 0


def test_404_et_non_403(api_client, settings):
    """
    On repond « introuvable », pas « interdit » : un 403 confirmerait que
    l'endpoint existe. Meme convention que les pieces d'identite (D19).
    """
    settings.BOOTSTRAP_ADMIN_TOKEN = JETON
    settings.COMPTES_DEMO_AUTORISES = False

    reponse = api_client.post(URL_DEMO, HTTP_X_BOOTSTRAP_TOKEN=JETON)

    assert reponse.status_code == 404
    assert reponse.status_code != 403


def test_le_serveur_de_test_peut_encore_s_en_servir(api_client, settings):
    """
    D23 installe un second serveur pour developper et tester. Il posera
    COMPTES_DEMO_AUTORISES=1 et gardera ses comptes de demonstration : on
    ferme la porte de la production, on ne la condamne pas partout.
    """
    settings.BOOTSTRAP_ADMIN_TOKEN = JETON
    settings.COMPTES_DEMO_AUTORISES = True

    reponse = api_client.post(URL_DEMO, HTTP_X_BOOTSTRAP_TOKEN=JETON)

    assert reponse.status_code in (200, 201)
    assert User.objects.filter(username="admin_demo").exists()
    assert User.objects.filter(username="vendeur_demo").exists()
    assert User.objects.filter(username="livreur_demo").exists()


def test_l_interrupteur_ouvert_n_annule_pas_le_jeton(api_client, settings):
    """Les deux conditions sont cumulatives, pas alternatives."""
    settings.BOOTSTRAP_ADMIN_TOKEN = JETON
    settings.COMPTES_DEMO_AUTORISES = True

    reponse = api_client.post(URL_DEMO, HTTP_X_BOOTSTRAP_TOKEN="mauvais-jeton")

    assert reponse.status_code == 404
    assert not User.objects.filter(username="admin_demo").exists()


def test_l_amorcage_du_vrai_administrateur_reste_possible(api_client, settings):
    """
    `bootstrap_admin` cree le PREMIER administrateur reel d'un serveur neuf,
    avec un mot de passe choisi par l'appelant. Ce n'est pas une simulation de
    connexion : D27 ne doit pas l'emporter avec le reste.
    """
    settings.BOOTSTRAP_ADMIN_TOKEN = JETON
    settings.COMPTES_DEMO_AUTORISES = False

    reponse = api_client.post(
        URL_ADMIN,
        {"username": "patron", "password": "UnMotDePasseChoisi-2026", "email": "p@belivay.com"},
        format="json",
        HTTP_X_BOOTSTRAP_TOKEN=JETON,
    )

    assert reponse.status_code in (200, 201)
    assert User.objects.filter(username="patron").exists()


# ── « Aucune photo de profil, aucune notification » pour un visiteur ────────
#
# Rien ne doit etre servi a un visiteur non connecte : pas de donnees vides
# qui ressembleraient a un compte, pas de compteur a zero fabrique. L'API
# refuse, et le front n'affiche donc rien.

@pytest.mark.parametrize("url", [
    "/api/auth/me/",
    "/api/auth/notifications/",
    "/api/auth/favorites/",
])
def test_le_visiteur_anonyme_n_obtient_aucune_donnee_de_compte(api_client, url):
    reponse = api_client.get(url)

    assert reponse.status_code in (401, 403)
    # Et surtout : aucune charge utile qui ressemblerait a un compte vide.
    corps = reponse.json() if reponse["Content-Type"].startswith("application/json") else {}
    for champ in ("avatar", "photo", "notifications", "favorites", "count"):
        assert champ not in corps
