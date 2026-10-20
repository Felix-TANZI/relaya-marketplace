# backend/apps/client_core/tests/outils.py
# Fabriques de test partagées par les applications du kit. Elles créent les objets de relaya-marketplace par le
# pont (settings.BELIVAY_MODELES), avec leurs vrais noms de champs : les mêmes tests tournent dans le projet
# d'essai (bouchons) et dans relaya-marketplace (vrais modèles ; ajouter alors les champs obligatoires manquants).

import itertools

from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.client_core.pont import modele

_n = itertools.count(1)


def client_connecte(user) -> APIClient:
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return c


def creer_client(prenom="Carine", email=None, **extra) -> User:
    i = next(_n)
    return User.objects.create_user(
        username=email or f"client{i}@exemple.cm",
        email=email or f"client{i}@exemple.cm",
        password="motdepasse1",
        first_name=prenom,
        **extra,
    )


def creer_zone(nom="Bastos"):
    Zone = modele("vendeur")._meta.get_field("zone").related_model
    return Zone.objects.get_or_create(name=nom, defaults={"city": "Yaoundé"})[0]


def creer_boutique(nom=None, zone="Bastos", palier="BRONZE"):
    i = next(_n)
    user = User.objects.create_user(username=f"vendeur{i}", password="x")
    return modele("vendeur").objects.create(
        user=user, business_name=nom or f"Boutique {i}", zone=creer_zone(zone), certification_tier=palier
    )


def _requis(model, valeurs: dict) -> dict:
    """Complète les ForeignKey obligatoires que le bouchon n'a pas mais que relaya exige (ex. Product.category) :
    le premier objet existant, sinon un objet minimal. Permet de lancer les mêmes tests chez relaya."""
    from django.db import models as m

    for f in model._meta.concrete_fields:
        if isinstance(f, m.ForeignKey) and not f.null and not f.has_default() and f.name not in valeurs and f.attname not in valeurs:
            parent = f.related_model.objects.first()
            if parent is None:
                champs = {}
                for g in f.related_model._meta.concrete_fields:
                    if isinstance(g, (m.CharField, m.SlugField)) and not g.blank and not g.has_default() and not g.primary_key:
                        champs[g.name] = f"essai-{next(_n)}"
                parent = f.related_model.objects.create(**_requis(f.related_model, champs))
            valeurs[f.name] = parent
    return valeurs


def creer_produit(boutique, titre=None, prix=10_000, stock=10, master=None, actif=True):
    i = next(_n)
    p = modele("produit").objects.create(
        title=titre or f"Produit {i}",
        slug=f"produit-{i}",
        price_xaf=prix,
        vendor=boutique.user,
        is_active=actif,
        **_requis(modele("produit"), {"master": master} if master else {}),
    )
    if stock is not None:
        modele("stock").objects.create(product=p, quantity=stock)
    return p


def creer_relais(nom="Relais Mvog-Ada", quartier="Mvog-Ada", lat="3.866700", lon="11.516700"):
    i = next(_n)
    user = User.objects.create_user(username=f"relais{i}", password="x")
    return modele("relais").objects.create(
        user=user,
        name=nom,
        manager_name="Mme Ngono",
        city="Yaoundé",
        zones=[quartier],
        address=quartier,
        opening_hours="8 h – 19 h",
        latitude=lat,
        longitude=lon,
    )


def creer_commande(user, lignes, relais=None, mode="PICKUP", payee=True, livraison=900):
    """lignes : [(produit, qte)]. Commande relaya minimale (le kit ne crée pas lui-même les commandes : décision D8)."""
    sous_total = sum(p.price_xaf * q for p, q in lignes)
    o = modele("commande").objects.create(
        user=user,
        customer_phone="677123441",
        delivery_method=mode,
        relay_point=relais,
        payment_status="PAID" if payee else "PENDING",
        subtotal_xaf=sous_total,
        delivery_fee_xaf=livraison,
        total_xaf=sous_total + livraison,
    )
    for p, q in lignes:
        modele("ligne_commande").objects.create(
            order=o, product=p, title_snapshot=p.title, price_xaf_snapshot=p.price_xaf, qty=q, line_total_xaf=p.price_xaf * q
        )
    return o
