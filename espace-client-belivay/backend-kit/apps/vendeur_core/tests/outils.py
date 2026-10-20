# backend/apps/vendeur_core/tests/outils.py
# Fabriques de test des applications vendeur : une boutique (VendorProfile de relaya par le pont + Boutique du kit),
# ses membres (propriétaire, accès Préparation), une fiche et une offre publiée (Product de relaya), et une commande
# passée par un client par les VRAIES routes du kit client (panier, /api/checkout, paiement confirmé par le webhook).
import itertools
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone

from apps.client_core import pont
from apps.client_core.chiffrement import chiffrer, empreinte
from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_relais
from apps.vendeur_core import services
from apps.vendeur_core.models import Boutique, FicheCatalogue, Livreur, Membre, Offre

_n = itertools.count(1)

TOUJOURS_OUVERT = [{"jour": j, "ouvert": True, "de": "00:00", "a": "23:59"} for j in range(7)]
HORAIRES_DEMO = [{"jour": j, "ouvert": j < 6, "de": "08:00", "a": "14:00" if j == 5 else "18:00"} for j in range(7)]
PASSAGES_DEMO = [{"jours": [0, 1, 2, 3, 4], "de": "14:00", "a": "16:00"}, {"jours": [5], "de": "11:00", "a": "13:00"}]


def creer_boutique_vendeur(
    nom="Tonton PG", palier="Bronze", trust="62.7", horaires=None, passages=None, numero="677124217", plan="Free", **champs
) -> Boutique:
    i = next(_n)
    profil = creer_boutique(nom, zone="Mvog-Ada")
    u = profil.user
    u.first_name, u.last_name, u.email = "Franck", "Penga", f"vendeur{i}@exemple.cm"
    u.set_password("motdepasse1")
    u.save()
    b = Boutique.objects.create(
        vendor_id=profil.pk,
        proprietaire=u,
        nom=nom,
        identifiant=f"@Vendeur{i}",
        cree_le=date(2026, 8, 20),
        approuve_le=date(2026, 8, 20),
        signature_le=date(2026, 8, 20),
        zone="Z4",
        quartier="Mvog-Mbi / Mvog-Ada",
        repere="face à la pharmacie du carrefour",
        lat=Decimal("3.852"),
        lon=Decimal("11.517"),
        horaires=horaires if horaires is not None else TOUJOURS_OUVERT,
        passages=passages if passages is not None else [{"jours": list(range(7)), "de": "00:00", "a": "23:59"}],
        societe_livraison="Wink Express",
        palier=palier,
        trust_score=Decimal(trust),
        commandes_livrees=7,
        note=Decimal("4.0"),
        plan=plan,
        numero_operateur="MTN" if numero else "",
        numero_chiffre=chiffrer(numero) if numero else None,
        numero_empreinte=empreinte(numero) if numero else "",
        numero_verifie_le=date(2026, 5, 9) if numero else None,
        titulaire_versement="Franck Penga",
        **champs,
    )
    Membre.objects.create(
        boutique=b,
        user=u,
        prenom="Franck",
        nom="Penga",
        telephone="+237677124217",
        role="proprietaire",
        depuis=timezone.now(),
        confirme_le=timezone.now(),
    )
    Livreur.objects.get_or_create(nom="Serge M.", societe="Wink Express", defaults={"photo": "livreur", "niveau": "Confirme"})
    return b


def ajouter_preparation(b: Boutique, prenom="Aïcha", nom="N.") -> Membre:
    i = next(_n)
    u = User.objects.create_user(username=f"prep{i}", email=f"prep{i}@exemple.cm", password="motdepasse1", first_name=prenom)
    return Membre.objects.create(
        boutique=b,
        user=u,
        prenom=prenom,
        nom=nom,
        telephone=f"+23769941{i:04d}",
        role="preparation",
        depuis=timezone.now(),
        confirme_le=timezone.now(),
    )


def proprietaire(b: Boutique):
    return client_connecte(b.proprietaire)


def preparation(b: Boutique):
    m = b.membres.filter(role="preparation", actif=True).first() or ajouter_preparation(b)
    return client_connecte(m.user)


def creer_fiche(titre="ITEL AC52", categorie="Électronique", variantes=("noir", "bleu"), **champs) -> FicheCatalogue:
    return FicheCatalogue.objects.create(
        titre=titre,
        marque=champs.pop("marque", titre.split()[0]),
        categorie=categorie,
        rayon=champs.pop("rayon", "Téléphones & accessoires"),
        dessin=champs.pop("dessin", "itel"),
        variantes=list(variantes),
        mots=titre.lower(),
        prix_min=champs.pop("prix_min", 18000),
        prix_max=champs.pop("prix_max", 24000),
        **champs,
    )


def creer_offre(b: Boutique, fiche: FicheCatalogue | None = None, variante="noir", prix=20000, stock=5, publier=True, **champs) -> Offre:
    fiche = fiche or creer_fiche()
    o = Offre.objects.create(
        boutique=b,
        fiche=fiche,
        variante=variante,
        etat=Offre.Etat.EN_VENTE if publier else Offre.Etat.BROUILLON,
        prix=prix,
        stock=stock,
        reference=champs.pop("reference", "ITL-AC52-NR"),
        a_mettre_de_cote=champs.pop("a_mettre_de_cote", ["chargeur", "câble"]),
        **champs,
    )
    if publier:
        services.publier_produit(o)
    return o


def commande_client(offre: Offre, qte=1, comptoir=False, client=None, relais=None, payer=True) -> dict:
    """Un client commande l'offre par les routes du kit client (panier, /api/checkout) et paie (webhook) ; la commande
    entre chez le vendeur. Rend {client, api, ref (client), order_id}."""
    from apps.cart import services as panier_services
    from apps.cart.paiement import confirmer_paiement

    if client is None:
        from apps.client_accounts.services import enregistrer_numero

        client = creer_client()
        enregistrer_numero(client, f"69{next(_n):07d}")
    api = client_connecte(client)
    relais = relais or pont.modele("relais").objects.first() or creer_relais()
    panier = panier_services.panier_de(client)
    panier.relay_id = relais.pk
    panier.save()
    assert api.post("/api/cart/lines", {"produit": str(offre.product_id), "qte": qte}, format="json").status_code < 300
    corps = {"mode": "relais", "moyen": "mtn", "comptoir": comptoir, "numero": None, "livraison": 0, "frais": 0}
    r = api.post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY=f"essai-vendeur-{next(_n)}-a")
    if r.status_code == 409:
        corps["livraison"] = r.json()["error"]["data"]["livraison"]
        r = api.post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY=f"essai-vendeur-{next(_n)}-b")
    assert r.status_code == 200, r.content
    ref = r.json()["ref"]
    order_id = pont.id_commande(ref)
    if payer and not comptoir:
        confirmer_paiement(order_id)
    elif comptoir:
        from apps.pickup.models import MontantsCommande

        MontantsCommande.objects.filter(order_id=order_id).update(etat_paiement="payee", payee_le=timezone.now())
    services.synchroniser(offre.boutique)
    return {"client": client, "api": api, "ref": ref, "order_id": order_id}


def il_y_a(**kw):
    return timezone.now() - timedelta(**kw)
