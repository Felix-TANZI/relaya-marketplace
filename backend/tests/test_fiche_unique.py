# backend/tests/test_fiche_unique.py
# Tache D5 — une seule fiche par produit dans la grille.
#
# Le point sensible est le PRIX RETENU : il doit etre celui que le client voit
# reellement (promotion comprise), pas le prix catalogue. Sans ca, une offre en
# flash deal a 100 000 F perdrait face a une offre affichee 150 699 F, et la
# grille montrerait la mauvaise offre.

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.catalog.models import (
    Category, MasterProduct, ModerationStatus, Product, PromotionCampaign,
)
from apps.catalog.offers import annotate_effective_price

pytestmark = pytest.mark.django_db

URL = "/api/catalog/products/"
GROUPE = {"group_by_master": "1"}


@pytest.fixture
def categorie():
    return Category.objects.create(name="Telephones", slug="telephones")


@pytest.fixture
def vendeur(django_user_model):
    return django_user_model.objects.create_user(
        username="vendeur_d5", email="vendeur.d5@example.com", password="Fiche-2026",
    )


@pytest.fixture
def fiche(categorie):
    return MasterProduct.objects.create(title="iPhone 15 Pro Max", category=categorie)


def _offre(categorie, vendeur, prix, master=None, titre="Offre", **extra):
    return Product.objects.create(
        title=titre,
        category=categorie,
        vendor=vendeur,
        master=master,
        price_xaf=prix,
        moderation_status=ModerationStatus.APPROVED,
        **extra,
    )


def _flash(produit, prix_promo, stock=5):
    maintenant = timezone.now()
    return PromotionCampaign.objects.create(
        product=produit,
        campaign_type=PromotionCampaign.CampaignType.FLASH,
        status=PromotionCampaign.Status.APPROVED,
        title="Flash",
        starts_at=maintenant - timedelta(hours=1),
        ends_at=maintenant + timedelta(hours=1),
        reference_price_xaf=produit.price_xaf,
        promo_price_xaf=prix_promo,
        stock_reserved=stock,
        stock_claimed=0,
    )


def _ids(reponse):
    return [p["id"] for p in reponse.data["results"]]


# ── Comportement actuel preserve ─────────────────────────────────────────────

def test_sans_le_parametre_les_deux_offres_sortent(api_client, categorie, vendeur, fiche):
    chere = _offre(categorie, vendeur, 350_000, fiche)
    pas_chere = _offre(categorie, vendeur, 150_699, fiche)

    reponse = api_client.get(URL)

    assert sorted(_ids(reponse)) == sorted([chere.id, pas_chere.id])


# ── Regroupement demande ─────────────────────────────────────────────────────

def test_une_seule_fiche_et_c_est_la_moins_chere(api_client, categorie, vendeur, fiche):
    _offre(categorie, vendeur, 350_000, fiche)
    pas_chere = _offre(categorie, vendeur, 150_699, fiche)

    reponse = api_client.get(URL, GROUPE)

    assert _ids(reponse) == [pas_chere.id]


def test_la_promotion_decide_de_l_offre_retenue(api_client, categorie, vendeur, fiche):
    # Le coeur de D5 : en prix catalogue, c'est `sans_promo` qui gagnerait.
    en_promo = _offre(categorie, vendeur, 350_000, fiche, titre="Avec flash")
    _flash(en_promo, 100_000)
    _offre(categorie, vendeur, 150_699, fiche, titre="Sans promo")

    reponse = api_client.get(URL, GROUPE)

    assert _ids(reponse) == [en_promo.id]


def test_une_promotion_expiree_ne_compte_pas(api_client, categorie, vendeur, fiche):
    perimee = _offre(categorie, vendeur, 350_000, fiche)
    campagne = _flash(perimee, 100_000)
    campagne.starts_at = timezone.now() - timedelta(days=3)
    campagne.ends_at = timezone.now() - timedelta(days=2)
    campagne.save(update_fields=["starts_at", "ends_at"])
    pas_chere = _offre(categorie, vendeur, 150_699, fiche)

    reponse = api_client.get(URL, GROUPE)

    assert _ids(reponse) == [pas_chere.id]


def test_un_flash_sans_stock_restant_ne_compte_pas(api_client, categorie, vendeur, fiche):
    epuise = _offre(categorie, vendeur, 350_000, fiche)
    campagne = _flash(epuise, 100_000, stock=5)
    campagne.stock_claimed = 5
    campagne.save(update_fields=["stock_claimed"])
    pas_chere = _offre(categorie, vendeur, 150_699, fiche)

    reponse = api_client.get(URL, GROUPE)

    assert _ids(reponse) == [pas_chere.id]


def test_un_produit_sans_fiche_est_conserve(api_client, categorie, vendeur, fiche):
    _offre(categorie, vendeur, 350_000, fiche)
    pas_chere = _offre(categorie, vendeur, 150_699, fiche)
    isole = _offre(categorie, vendeur, 9_000, None, titre="Sans master")

    reponse = api_client.get(URL, GROUPE)

    assert sorted(_ids(reponse)) == sorted([pas_chere.id, isole.id])


def test_le_comptage_reste_coherent(api_client, categorie, vendeur, fiche):
    _offre(categorie, vendeur, 350_000, fiche)
    _offre(categorie, vendeur, 150_699, fiche)

    reponse = api_client.get(URL, GROUPE)

    # Le regroupement se fait en SQL : le total annonce doit suivre.
    assert reponse.data["count"] == 1
    assert len(reponse.data["results"]) == 1


# ── Le prix SQL doit coller au prix affiche ──────────────────────────────────

def test_le_prix_sql_colle_au_prix_du_serializer(api_client, categorie, vendeur, fiche):
    """
    Garde-fou promis dans offers.py : `effective_price` (SQL) et
    `price_final` (serializer) sont deux ecritures de la meme regle. Si l'une
    evolue sans l'autre, la grille elirait une offre que le client voit a un
    autre prix.
    """
    avec_flash = _offre(categorie, vendeur, 350_000, fiche)
    _flash(avec_flash, 100_000)
    _offre(categorie, vendeur, 150_699, fiche)
    _offre(categorie, vendeur, 80_000, None, discount=25)

    par_id = {
        p["id"]: p["price_final"]
        for p in api_client.get(URL).data["results"]
    }
    calcule = annotate_effective_price(
        Product.objects.filter(moderation_status=ModerationStatus.APPROVED)
    )

    for produit in calcule:
        assert produit.effective_price == par_id[produit.id], (
            f"produit {produit.id} : SQL {produit.effective_price} "
            f"!= serializer {par_id[produit.id]}"
        )
