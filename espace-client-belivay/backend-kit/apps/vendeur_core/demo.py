# backend/apps/vendeur_core/demo.py
# DONNÉES DE DÉMONSTRATION (serveur d'essai, jamais en production) : la boutique du jeu d'essai du paquet vendeur
# (VD-02 p2, « V01 » ; espace-vendeur/src/demo/jeu-essai.ts) avec de VRAIES commandes de clients, passées dans les tables
# du kit client (orders, pickup, paiement confirmé) comme le ferait le site :
#   - « Tonton PG » (nom interne), titulaire Franck Penga, @Penga12, particulier ; zone Z4, Mvog-Mbi / Mvog-Ada ;
#     Bronze, Trust Score 62,7 ; plan Free, découverte depuis la première commande ; versements MTN ···· 4217 ;
#     équipe : Franck Penga (propriétaire), Aïcha N. (préparation) ;
#   - offres ITEL AC52 noir (en vente, stock 3, seuil 5), ITEL AC52 bleu (en vérification), iPhone 15 Pro Max 256 Go
#     (en vente, stock 2, seuil 1) ;
#   - les neuf commandes du jeu d'essai, numérotées BLV-260901 à BLV-260909 (REFS : « BLV-00001 » → « BLV-260901 ») :
#     dates du paquet (lundi 21 septembre 2026, 09 h 48) DÉCALÉES pour que « maintenant » tombe au même moment du
#     parcours (commandes à préparer de ce matin, libérations à venir…) ;
#   - les fiches du catalogue du site client et leurs offres (boutiques A à D) : concurrents, vendeur suivant.
# Les applications vendeur ajoutent leurs propres données par leur demo.charger(boutique) (litiges, retours,
# versements, score, plans, avis, messages…). Idempotent : relancé, rien n'est dupliqué.
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.client_core import pont
from apps.client_core.chiffrement import chiffrer, empreinte
from apps.client_core.temps import YAOUNDE

from . import horloge, services
from .models import Boutique, CommandeVendeur, FicheCatalogue, Livreur, Membre, Offre

MOT_DE_PASSE = "Essai-BelivaY-2026"  # même mot de passe d'essai que les comptes du client (relaya_essai.charger_demo)
EMAIL_PROPRIETAIRE = "franck.penga@belivay.test"
EMAIL_PREPARATION = "aicha.n@belivay.test"
REFERENCE = datetime(2026, 9, 21, 9, 48, tzinfo=YAOUNDE)  # l'instant du jeu d'essai
PREMIERE_COMMANDE = 260900
REFS = {f"BLV-0000{k}": f"BLV-{PREMIERE_COMMANDE + k}" for k in range(1, 10)}

HORAIRES = [{"jour": j, "ouvert": j < 6, "de": "08:00", "a": "14:00" if j == 5 else "18:00"} for j in range(7)]
PASSAGES = [{"jours": [0, 1, 2, 3, 4], "de": "14:00", "a": "16:00"}, {"jours": [5], "de": "11:00", "a": "13:00"}]

# Univers du site client → catégorie du barème (VD-BAREME-*).
CATEGORIES = {
    "Téléphones & tablettes": "Électronique",
    "Électronique": "Électronique",
    "Maison & cuisine": "Maison & Déco",
    "Mode femme": "Mode Femme",
    "Mode homme": "Mode Homme",
    "Chaussures": "Mode Femme",
    "Beauté & santé": "Beauté & Cosmétique",
    "Supermarché": "Supermarché",
    "Bébé & enfant": "Bébé & Enfant",
    "Sport & loisirs": "Sport & Loisirs",
}

# Commandes du jeu d'essai : (k, offre, payée (jeu d'essai), au comptoir, retrait, fermeture du retour, étape).
COMMANDES = [
    (1, "itel-noir", (2026, 8, 28, 10, 12), False, (2026, 8, 31, 15), (2026, 9, 7, 9), "versee"),
    (2, "itel-noir", (2026, 9, 4, 11, 30), False, (2026, 9, 7, 16), (2026, 9, 8, 12), "versee"),
    (3, "itel-noir", (2026, 9, 12, 9, 40), False, (2026, 9, 15, 11), (2026, 9, 16, 11), "a_verser"),
    (4, "itel-noir", (2026, 9, 14, 8, 20), False, (2026, 9, 17, 10), None, "retour"),
    (5, "iphone", (2026, 9, 15, 13, 2), False, (2026, 9, 19, 17), None, "litige"),
    (6, "iphone", (2026, 9, 16, 18, 45), False, (2026, 9, 20, 12), None, "litige"),
    (7, "itel-noir", (2026, 9, 14, 15, 5), False, (2026, 9, 17, 9), (2026, 9, 18, 18), "se_libere"),
    (8, "itel-noir", (2026, 9, 21, 8, 42), False, None, None, "a_preparer"),
    (9, "itel-noir", (2026, 9, 21, 9, 5), True, None, None, "a_preparer"),
]


def decalage() -> timedelta:
    """Décalage qui amène l'instant du jeu d'essai à maintenant (fixé au premier chargement, gardé dans la boutique)."""
    b = Boutique.objects.filter(identifiant="@Penga12").first()
    if b is not None and b.cree_le:
        # La boutique est créée le 20 août du jeu d'essai, décalé : le même décalage sert d'un chargement à l'autre.
        return datetime.combine(b.cree_le, datetime.min.time(), YAOUNDE) - datetime(2026, 8, 20, tzinfo=YAOUNDE)
    return timedelta(days=(horloge.maintenant() - REFERENCE).days)


def _t(d: timedelta, *a) -> datetime:
    return datetime(*a, tzinfo=YAOUNDE) + d


def _utilisateur(email: str, prenom: str, nom: str):
    User = get_user_model()
    u, _ = User.objects.get_or_create(username=email, defaults={"email": email, "first_name": prenom, "last_name": nom})
    u.email, u.first_name, u.last_name = email, prenom, nom
    u.set_password(MOT_DE_PASSE)
    u.save()
    return u


def _boutique(d: timedelta) -> Boutique:
    proprio = _utilisateur(EMAIL_PROPRIETAIRE, "Franck", "Penga")
    Vendeur = pont.modele("vendeur")
    Zone = Vendeur._meta.get_field("zone").related_model
    zone, _ = Zone.objects.get_or_create(name="Mvog-Ada", defaults={"city": "Yaoundé"})
    profil, _ = Vendeur.objects.update_or_create(
        user=proprio, defaults={"business_name": "Tonton PG", "zone": zone, "certification_tier": "BRONZE"}
    )
    jour = lambda *a: _t(d, *a).date()  # noqa: E731
    b, _ = Boutique.objects.update_or_create(
        identifiant="@Penga12",
        defaults={
            "vendor_id": profil.pk,
            "proprietaire": proprio,
            "nom": "Tonton PG",
            "statut": "particulier",
            "categorie": "Électronique",
            "cree_le": jour(2026, 8, 20),
            "approuve_le": jour(2026, 8, 20),
            "signature_le": jour(2026, 8, 20),
            "contrat_version": "2026-10",
            "premiere_commande_payee": jour(2026, 8, 27),
            "zone": "Z4",
            "quartier": "Mvog-Mbi / Mvog-Ada",
            "repere": "face à la pharmacie du carrefour",
            "lat": Decimal("3.852"),
            "lon": Decimal("11.517"),
            "point_pose_le": jour(2026, 8, 20),
            "point_verifie_le": jour(2026, 8, 21),
            "horaires": HORAIRES,
            "passages": PASSAGES,
            "societe_livraison": "Wink Express",
            "palier": "Bronze",
            "trust_score": Decimal("62.7"),
            "score_calcule_le": _t(d, 2026, 9, 21, 3),
            "commandes_livrees": 7,
            "note": Decimal("4.0"),
            "plan": "Free",
            "numero_operateur": "MTN",
            "numero_chiffre": chiffrer("677124217"),
            "numero_empreinte": empreinte("677124217"),
            "numero_verifie_le": date(2026, 5, 9),
            "titulaire_versement": "Franck Penga",
            "vitrine_description": "Téléphones et accessoires neufs, garantie boutique.",
        },
    )
    aicha = _utilisateur(EMAIL_PREPARATION, "Aïcha", "N.")
    for user, prenom, nom, tel, role, depuis in (
        (proprio, "Franck", "Penga", "+237 6 77 12 42 17", "proprietaire", _t(d, 2026, 8, 20, 10)),
        (aicha, "Aïcha", "N.", "+237 6 99 41 08 90", "preparation", _t(d, 2026, 9, 2, 9)),
    ):
        Membre.objects.update_or_create(
            boutique=b,
            user=user,
            defaults={"prenom": prenom, "nom": nom, "telephone": tel, "role": role, "depuis": depuis, "confirme_le": depuis, "actif": True},
        )
    Livreur.objects.get_or_create(nom="Serge M.", societe="Wink Express", defaults={"photo": "livreur", "niveau": "Confirme"})
    return b


def _fiches_et_concurrents() -> dict:
    """Fiches du catalogue du site client et offres de leurs boutiques (A à D), liées aux produits existants."""
    import json
    from pathlib import Path

    chemin = Path(__file__).resolve().parents[2] / "_essai" / "relaya_essai" / "donnees" / "catalogue.json"
    fiches = {}
    fiches["itel"], _ = FicheCatalogue.objects.update_or_create(
        titre="ITEL AC52",
        defaults={
            "marque": "itel",
            "categorie": "Électronique",
            "rayon": "Téléphones & accessoires",
            "dessin": "itel",
            "variantes": ["noir", "bleu", "or"],
            "codes_barres": ["6941167600528"],
            "mots": "itel ac52 telephone portable",
            "prix_min": 18000,
            "prix_max": 24000,
            "description": "Écran lumineux, grande autonomie, double SIM compatible MTN et Orange.",
        },
    )
    fiches["iphone"], _ = FicheCatalogue.objects.update_or_create(
        titre="iPhone 15 Pro Max",
        defaults={
            "marque": "Apple",
            "categorie": "Électronique",
            "rayon": "Téléphones & accessoires",
            "dessin": "flagship",
            "variantes": ["256 Go", "512 Go"],
            "codes_barres": ["0194253401234"],
            "mots": "iphone 15 pro max apple",
            "prix_min": 330000,
            "prix_max": 380000,
        },
    )
    if not chemin.exists():  # pragma: no cover - copie du kit sans le projet d'essai
        return fiches
    Produit = pont.modele("produit")
    for p in json.loads(chemin.read_text(encoding="utf-8"))["produits"]:
        produit = Produit.objects.filter(slug=p["cle"]).select_related("vendor").first()
        if produit is None or produit.vendor is None:
            continue
        titre, _, variante = p["titre"].partition(" · ")
        cle = "itel" if p["cle"] == "itelac52" else None
        fiche = (
            fiches["itel"]
            if cle
            else FicheCatalogue.objects.update_or_create(
                titre=titre,
                defaults={
                    "categorie": CATEGORIES.get(p["universTitre"], "Électronique"),
                    "rayon": p["universTitre"],
                    "dessin": p["cle"],
                    "variantes": [variante] if variante else [],
                    "mots": titre.lower(),
                    "prix_min": round(p["prix"] * 0.9),
                    "prix_max": round(p["prix"] * 1.15),
                    "description": p["description"],
                    "marque": titre.split()[0],
                },
            )[0]
        )
        profil = getattr(produit.vendor, "vendor_profile", None)
        if profil is None:
            continue
        concurrent, _ = Boutique.objects.get_or_create(
            vendor_id=profil.pk,
            defaults={
                "proprietaire": produit.vendor,
                "nom": profil.business_name,
                "identifiant": f"@{profil.business_name.replace(' ', '')}",
                "cree_le": date(2026, 6, 1),
                "approuve_le": date(2026, 6, 1),
                "zone": "Z4",
                "horaires": HORAIRES,
                "passages": PASSAGES,
                "palier": {"Or": "Or", "Argent": "Argent"}.get(p["palier"], "Bronze"),
                "trust_score": Decimal("78.0"),
                "societe_livraison": "Wink Express",
            },
        )
        Membre.objects.get_or_create(
            boutique=concurrent,
            user=produit.vendor,
            defaults={"prenom": profil.business_name, "nom": "", "telephone": "", "role": "proprietaire", "depuis": timezone.now()},
        )
        Offre.objects.update_or_create(
            boutique=concurrent,
            product_id=produit.pk,
            defaults={
                "fiche": fiche,
                "variante": variante or (fiche.variantes[0] if fiche.variantes else ""),
                "etat": Offre.Etat.EN_VENTE,
                "prix": p["prix"],
                "stock": p["stock"],
                "colis": p["classe"] if p["classe"] in ("S", "M", "L", "XL") else "XXL",
                "reference": p["cle"].upper()[:12],
            },
        )
    return fiches


def _offres(b: Boutique, fiches: dict, d: timedelta) -> dict:
    def offre(cle, fiche, variante, etat, prix, stock, seuil, retrait, reference, cote, verification=None):
        o, _ = Offre.objects.update_or_create(
            boutique=b,
            fiche=fiche,
            variante=variante,
            defaults={
                "etat": etat,
                "prix": prix,
                "stock": stock,
                "seuil_alerte": seuil,
                "paiement_au_retrait": retrait,
                "reference": reference,
                "a_mettre_de_cote": cote,
                "etat_article": "Neuf",
                "colis": "S",
                "envoyee_a": _t(d, 2026, 8, 20, 11),
                "verification_avant": verification,
                "verifiee_a": None if verification else _t(d, 2026, 8, 21, 10),
                "delai_preparation_h": 4,
            },
        )
        if etat == Offre.Etat.EN_VENTE or o.product_id:
            services.publier_produit(o)
        return o

    return {
        "itel-noir": offre(
            "itel-noir",
            fiches["itel"],
            "noir",
            Offre.Etat.EN_VENTE,
            20000,
            3,
            5,
            True,
            "ITL-AC52-NR",
            ["chargeur", "câble", "boîte d'origine"],
        ),
        "itel-bleu": offre(
            "itel-bleu",
            fiches["itel"],
            "bleu",
            Offre.Etat.EN_VERIFICATION,
            20000,
            5,
            5,
            True,
            "ITL-AC52-BL",
            ["chargeur", "câble"],
            _t(d, 2026, 9, 22, 16, 10),
        ),
        "iphone": offre(
            "iphone",
            fiches["iphone"],
            "256 Go",
            Offre.Etat.EN_VENTE,
            350000,
            2,
            1,
            False,
            "APL-15PM-256",
            ["câble USB-C", "boîte d'origine"],
        ),
    }


def _commande(
    b: Boutique, o: Offre, k: int, payee: datetime, comptoir: bool, retrait: datetime | None, fermeture: datetime | None, client
) -> CommandeVendeur:
    """Une commande du client, écrite comme la ferait le paiement du kit (Order, MontantsCommande, sous-commande,
    groupe de remise), puis entrée chez le vendeur (montant gardé figé par le moteur)."""
    from apps.cart.services import classe_de
    from apps.pickup.models import GroupeRemise, MontantsCommande, SousCommande
    from apps.pickup.services import creer_sous_commandes

    order_id = PREMIERE_COMMANDE + k
    deja = CommandeVendeur.objects.filter(order_id=order_id, n=1).first()
    if deja is not None:
        return deja
    Order, Item = pont.modele("commande"), pont.modele("ligne_commande")
    relais = pont.modele("relais").objects.filter(name="Relais Mvog-Ada").first() or pont.modele("relais").objects.first()
    ram, rem = 500, 400
    total = o.prix + ram + rem
    Order.objects.filter(pk=order_id).delete()
    commande = Order.objects.create(
        pk=order_id,
        user=client,
        customer_phone="",
        delivery_method="PICKUP",
        relay_point=relais,
        payment_status="PAID",
        subtotal_xaf=o.prix,
        delivery_fee_xaf=ram + rem,
        total_xaf=total,
    )
    Order.objects.filter(pk=order_id).update(created_at=payee)
    Item.objects.create(
        order=commande,
        product_id=o.product_id,
        title_snapshot=f"{o.titre} · {o.variante}",
        price_xaf_snapshot=o.prix,
        qty=1,
        line_total_xaf=o.prix,
    )
    MontantsCommande.objects.filter(order_id=order_id).delete()
    m = MontantsCommande.objects.create(
        order_id=order_id,
        client=client,
        mode="relais",
        relay_id=relais.pk if relais else None,
        lieu=relais.name if relais else "",
        sous_total=o.prix,
        ramassages=ram,
        remises=rem,
        total=total,
        version_parametres=services.parametres.version(),
        moyen="mtn",
        comptoir=comptoir,
        avance=ram + rem if comptoir else total,
        du_au_retrait=o.prix if comptoir else 0,
        etat_paiement="payee",
        payee_le=payee,
        tout_en_ordre_le=fermeture if fermeture and retrait and fermeture < retrait + timedelta(days=7) else None,
    )
    SousCommande.objects.filter(order_id=order_id).delete()
    GroupeRemise.objects.filter(order_id=order_id).delete()
    classe, gros = classe_de(o.product_id)
    creer_sous_commandes(
        m,
        [
            {
                "boutique": b.nom,
                "zone": "Mvog-Ada",
                "vendor_id": b.vendor_id,
                "product_id": o.product_id,
                "titre": f"{o.titre} · {o.variante}",
                "prix": o.prix,
                "qte": 1,
                "classe": classe or "S",
                "gros": gros,
            }
        ],
    )
    c = services.entrer(SousCommande.objects.get(order_id=order_id, n=1), b)
    if retrait is not None:
        prete, remise = payee + timedelta(hours=2), payee + timedelta(hours=5)
        CommandeVendeur.objects.filter(pk=c.pk).update(prete_a=prete, remise_a=remise, confirmee_a=prete)
        SousCommande.objects.filter(order_id=order_id).update(
            etat="remise", collectee_le=remise, arrivee_le=remise + timedelta(hours=20), remise_le=retrait
        )
        GroupeRemise.objects.filter(order_id=order_id).update(accuse_fort_le=remise + timedelta(hours=20), retire_le=retrait)
        services.journaliser(c, None, "Prête", a=prete)
        services.journaliser(c, None, "Remise au livreur", detail="Serge M. · Wink Express", a=remise)
        services.journaliser(c, None, "Retirée par le client", a=retrait)
        c.refresh_from_db()
    return c


@transaction.atomic
def charger() -> Boutique:
    d = decalage()
    b = _boutique(d)
    fiches = _fiches_et_concurrents()
    offres = _offres(b, fiches, d)
    User = get_user_model()
    client = User.objects.filter(email="carine@gmail.com").first() or _utilisateur("client.demo@belivay.test", "Client", "Démo")
    for k, cle, payee, comptoir, retrait, fermeture, _etape in COMMANDES:
        _commande(
            b,
            offres[cle],
            k,
            _t(d, *payee),
            comptoir,
            _t(d, *retrait) if retrait else None,
            _t(d, *fermeture) if fermeture else None,
            client,
        )
    # Stocks du jeu d'essai (après les commandes, qui ont décompté le stock).
    for cle, stock in (("itel-noir", 3), ("itel-bleu", 5), ("iphone", 2)):
        Offre.objects.filter(pk=offres[cle].pk).update(stock=stock)
        if offres[cle].product_id:
            pont.modele("stock").objects.filter(product_id=offres[cle].product_id).update(quantity=stock)
    return b


def commande(ref_jeu_essai: str) -> CommandeVendeur | None:
    """La commande de démo qui joue « BLV-00005 » du jeu d'essai."""
    return CommandeVendeur.objects.filter(ref=REFS.get(ref_jeu_essai, ref_jeu_essai)).first()
