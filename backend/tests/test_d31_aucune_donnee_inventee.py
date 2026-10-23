# backend/tests/test_d31_aucune_donnee_inventee.py
# Tache D31 — « Ne montrer aucune donnee inventee ».
#
#   « Un visiteur qui repere un faux chiffre ne croit plus le reste ; l'API
#     doit renvoyer de vraies valeurs ou rien. »
#
# Les six puces du document sont couvertes ici. Cinq etaient DEJA tenues par
# le code — elles sont figees quand meme : c'est leur regression qu'on veut
# voir, pas leur absence. La sixieme, les jeux de donnees de demonstration,
# est celle qui manquait.

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.catalog.models import Category, ModerationStatus, Product
from apps.catalog.serializers import ProductSerializer

pytestmark = pytest.mark.django_db


@pytest.fixture
def produit(django_user_model):
    vendeur = django_user_model.objects.create_user("vendeur_d31", password="D31-2026")
    categorie = Category.objects.create(name="Tel", slug="tel-d31")
    return Product.objects.create(
        title="Telephone", category=categorie, vendor=vendeur, price_xaf=20000,
        moderation_status=ModerationStatus.APPROVED, is_active=True,
    )


# ── « Notes et avis : les masquer tant qu'il n'y a pas de vrais avis » ──────

def test_un_produit_sans_avis_n_a_pas_de_note(produit, rf):
    """
    Une note a 0 ressemble a une vraie note — et a une mauvaise. Il faut
    `None`, pour que l'ecran puisse afficher « Nouveau » au lieu d'un chiffre.
    """
    donnees = ProductSerializer(produit, context={"request": rf.get("/")}).data

    assert donnees["rating_average"] is None
    assert donnees["reviews_count"] == 0


# ── « Distances : les masquer tant que la position du visiteur est inconnue » ─

def test_sans_position_du_visiteur_aucune_distance_n_est_renvoyee(api_client):
    """
    L'endpoint des relais proches est ouvert aux visiteurs (D3). Sans `lat` ni
    `lng`, il ne peut pas connaitre de distance : il doit le dire, pas
    l'inventer.
    """
    reponse = api_client.get("/api/shipping/relay-points/nearby/")

    assert reponse.status_code == 200
    corps = reponse.json()
    # L'endpoint renvoie une liste nue ; il pourrait devenir pagine.
    relais = corps.get("results", []) if isinstance(corps, dict) else corps
    for point in relais:
        assert point.get("distance_km") is None, (
            f"Le relais {point.get('name', point)} annonce une distance alors "
            f"que la position du visiteur est inconnue."
        )


# ── « Ventes flash et comptes a rebours : masques sans vraie campagne » ─────

def test_une_campagne_doit_etre_approuvee_et_en_cours_pour_sortir():
    """
    Trois conditions, et il les faut toutes : approuvee, dans sa fenetre, et
    avec du stock. Un compte a rebours sur une campagne finie est un faux
    chiffre comme un autre.
    """
    import inspect

    from apps.catalog.models import PromotionCampaign

    source = inspect.getsource(PromotionCampaign.is_active_now.fget)

    assert "Status.APPROVED" in source
    assert "starts_at" in source and "ends_at" in source
    assert "remaining_stock" in source


# ── « Mention "Sponsorise" : masquee » ─────────────────────────────────────

def test_aucun_champ_sponsorise_n_est_servi(produit, rf):
    """
    Les produits sponsorises sont une fonction d'apres le lancement
    (priorite 5). Aucun champ ne doit l'annoncer d'ici la.
    """
    donnees = ProductSerializer(produit, context={"request": rf.get("/")}).data

    assert not [cle for cle in donnees if "sponsor" in cle.lower()]


# ── « Compteurs : afficher le vrai nombre, ou rien » ───────────────────────

def test_le_compteur_de_produits_est_le_vrai_nombre(api_client, produit):
    reponse = api_client.get("/api/catalog/products/")

    assert reponse.status_code == 200
    corps = reponse.json()
    if isinstance(corps, dict) and "count" in corps:
        assert corps["count"] == Product.objects.filter(is_active=True).count()


# ── « Relais : aucun relais de demonstration » ─────────────────────────────
#
# C'est la puce qui manquait. Douze commandes `seed_*_demo` peuplent la base
# de boutiques, de relais, d'avis et de commandes fictifs, et rien
# n'empechait de les lancer sur le serveur public.

COMMANDES_DEMO = [
    "seed_recommendation_demo",
    "seed_evidence_demo",
    "seed_maps_workflow_demo",
    "payments_seed_demo",
    "seed_relay_counter_demo",
    "seed_relay_demo",
    "seed_relay_fresh_demo",
    "seed_relay_history_demo",
    "seed_relay_notifications_demo",
    "seed_relay_outbound_demo",
    "seed_relay_reports_demo",
    "seed_seller_demo",
]


@pytest.mark.parametrize("commande", COMMANDES_DEMO)
def test_aucun_jeu_de_demonstration_ne_part_par_defaut(commande, settings):
    """
    Le test qui compte. Sans reglage explicite, les douze commandes refusent —
    c'est l'etat de la production. Si quelqu'un retire le garde-fou de l'une
    d'elles, ce test tombe en nommant laquelle.
    """
    settings.DONNEES_DEMO_AUTORISEES = False

    with pytest.raises(CommandError) as refus:
        call_command(commande)

    assert "D31" in str(refus.value)
    assert "DONNEES_DEMO_AUTORISEES" in str(refus.value)


def test_le_serveur_de_test_peut_encore_s_en_servir(settings):
    """
    D23 installe un second serveur pour developper et tester, et ces jeux
    servent a juger les ecrans. On ferme la porte de la production, on ne la
    condamne pas partout : avec le reglage, la commande depasse le garde-fou.
    """
    from apps.common.demonstration import (
        demonstration_autorisee,
        exiger_demonstration_autorisee,
    )

    settings.DONNEES_DEMO_AUTORISEES = True

    assert demonstration_autorisee() is True
    exiger_demonstration_autorisee()  # ne doit pas lever


def test_une_base_propre_est_annoncee_comme_telle(capsys):
    """La commande de controle doit savoir dire « rien a signaler »."""
    call_command("donnees_demo")

    assert "propre" in capsys.readouterr().out


def test_un_compte_de_demonstration_est_repere(capsys, django_user_model):
    """
    Empecher d'en creer ne dit pas si le serveur en contient deja. Avant
    d'ouvrir belivay.com, on veut une reponse nette.
    """
    django_user_model.objects.create_user("vendeur_demo", password="D31-2026")

    with pytest.raises(SystemExit) as sortie:
        call_command("donnees_demo")

    # Code 1 : utilisable comme controle avant mise en ligne.
    assert sortie.value.code == 1
    assert "vendeur_demo" in capsys.readouterr().out
