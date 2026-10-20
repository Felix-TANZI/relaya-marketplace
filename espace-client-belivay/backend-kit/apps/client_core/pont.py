# backend/apps/client_core/pont.py
# Pont vers les modèles existants de relaya-marketplace (produits, boutiques, relais, commandes).
#
# PRINCIPE (le même que payments/bridge/actors.py, principe P1) : les applications du kit n'importent AUCUNE
# application métier de relaya. Elles gardent des identifiants entiers (product_id, vendor_id, relay_id,
# order_id) et lisent ces objets ici seulement, par settings.BELIVAY_MODELES. Conséquences :
#   - le kit s'installe sans toucher aux modèles existants, ses migrations ne dépendent que de auth ;
#   - quand l'intégration sera stabilisée, ces entiers pourront devenir des ForeignKey (REPRISE, décision D2).
#
# Champs lus (commit 9546ffe) :
#   catalog.Product        title, price_xaf, is_active, vendor (User) → vendor.vendor_profile ; inventory.quantity
#   vendors.VendorProfile  business_name, city, zone (shipping.Zone.name), certification_tier, locations (lat/long)
#   accounts.RelayPointProfile  name, manager_name, city, zones, address, opening_hours, latitude, longitude, is_active
#   orders.Order           user, delivery_method, relay_point, subtotal_xaf, delivery_fee_xaf, total_xaf, payment_status,
#                          created_at, authorized_pickup_name/phone ; items (OrderItem : product, title_snapshot,
#                          price_xaf_snapshot, qty)
# Attention : Product.price_xaf est le prix sans la remise (`discount`) ; CORRESPONDANCE-RELAYA.md § 6 (frais.py).

from dataclasses import dataclass
from decimal import Decimal

from django.apps import apps
from django.conf import settings

DEFAUT = {
    "produit": "catalog.Product",
    "stock": "catalog.Inventory",
    "vendeur": "vendors.VendorProfile",
    "relais": "accounts.RelayPointProfile",
    "commande": "orders.Order",
    "ligne_commande": "orders.OrderItem",
    "favori": "accounts.UserFavorite",
}


def modele(cle: str):
    return apps.get_model(getattr(settings, "BELIVAY_MODELES", DEFAUT).get(cle, DEFAUT[cle]))


@dataclass(frozen=True)
class Boutique:
    id: int
    nom: str
    zone: str  # zone de ramassage (frais.SousCommande.zone)
    palier: str  # certification_tier
    position: tuple[Decimal, Decimal] | None  # emplacement principal ; jamais renvoyé au client (CMC-49)


@dataclass(frozen=True)
class Produit:
    id: int
    titre: str
    prix: int  # francs entiers
    actif: bool
    stock: int | None  # None : pas d'inventaire tenu
    boutique: Boutique | None


@dataclass(frozen=True)
class Relais:
    id: int
    nom: str
    gerant: str
    quartier: str
    ville: str
    horaires: str  # texte libre chez relaya (horaires structurés à créer, CORRESPONDANCE § 4)
    position: tuple[Decimal, Decimal] | None
    actif: bool


@dataclass(frozen=True)
class LigneCommande:
    product_id: int
    titre: str
    prix: int
    qte: int


@dataclass(frozen=True)
class Commande:
    id: int
    ref: str  # « BLV-52018 » (le site : refCommande, idCommande)
    user_id: int | None
    mode: str  # relais | domicile
    relay_id: int | None
    sous_total: int
    livraison: int
    total: int
    payee: bool
    creee_le: object  # datetime
    lignes: tuple[LigneCommande, ...]


def favori_produit(favorite_id, user) -> int | None:
    """Produit d'un favori de relaya (accounts.UserFavorite) appartenant à `user`."""
    f = modele("favori").objects.filter(pk=favorite_id, user=user).first()
    return f.product_id if f is not None else None


def mettre_en_favori(user, product_id) -> None:
    modele("favori").objects.get_or_create(user=user, product_id=int(product_id))


def deleguer_retrait(order_id: int, prenom: str, numero: str) -> None:
    """Qui retire à la place du client : champs existants de relaya (authorized_pickup_name / _phone)."""
    modele("commande").objects.filter(pk=order_id).update(authorized_pickup_name=prenom or "", authorized_pickup_phone=numero or "")


def ref_commande(order_id: int) -> str:
    return f"BLV-{order_id}"


def id_commande(ref: str | int) -> int:
    """« BLV-52018 » ou « 52018 » → 52018 ; ValueError sinon."""
    n = int(str(ref).upper().removeprefix("BLV-"))
    if n <= 0:
        raise ValueError(ref)
    return n


def _boutique(profil) -> Boutique | None:
    if profil is None:
        return None
    pos = None
    lieux = getattr(profil, "locations", None)
    if lieux is not None:
        lieu = lieux.filter(is_active=True).order_by("-is_main", "id").first()
        if lieu is not None and lieu.latitude is not None and lieu.longitude is not None:
            pos = (Decimal(str(lieu.latitude)), Decimal(str(lieu.longitude)))
    zone = getattr(profil, "zone", None)
    return Boutique(
        id=profil.pk,
        nom=profil.business_name,
        zone=zone.name if zone is not None else (profil.city or ""),
        palier=getattr(profil, "certification_tier", "") or "",
        position=pos,
    )


def boutique(vendor_id: int) -> Boutique | None:
    profil = modele("vendeur").objects.filter(pk=vendor_id).select_related("zone").first()
    return _boutique(profil)


def _produit(p) -> Produit:
    stock = None
    try:
        stock = p.inventory.quantity
    except Exception:  # pas d'inventaire (RelatedObjectDoesNotExist)
        stock = None
    profil = None
    if getattr(p, "vendor", None) is not None:
        profil = getattr(p.vendor, "vendor_profile", None)
    return Produit(id=p.pk, titre=p.title, prix=int(p.price_xaf), actif=bool(p.is_active), stock=stock, boutique=_boutique(profil))


def produit(product_id) -> Produit | None:
    try:
        pk = int(product_id)
    except (TypeError, ValueError):
        return None
    p = modele("produit").objects.filter(pk=pk).select_related("vendor").first()
    return _produit(p) if p is not None else None


def produits(ids) -> dict[int, Produit]:
    ids = [int(i) for i in ids]
    return {p.pk: _produit(p) for p in modele("produit").objects.filter(pk__in=ids).select_related("vendor")}


def autres_offres(product_id) -> list[Produit]:
    """Les autres offres actives du même produit maître (Product.master, relaya) : « Autres vendeurs »."""
    p = modele("produit").objects.filter(pk=int(product_id)).first()
    master_id = getattr(p, "master_id", None) if p is not None else None
    if not master_id:
        return []
    qs = modele("produit").objects.filter(master_id=master_id, is_active=True).exclude(pk=p.pk).select_related("vendor")
    return [_produit(x) for x in qs]


def image(product_id) -> str:
    """Adresse de l'image principale d'un produit ; « » si aucune (relaya : ProductImage, ProductMedia).

    Côté site, les photos des produits, boutiques et relais servies par relaya (ProductSerializer `images[]`/`media[]` :
    image_url | url, is_primary, alt_text, srcset ; relais : photo_url | image_url) deviennent le champ `images`
    (produit) ou `image` (favori, relais…) au format {url, srcset?, alt?} (site/src/api/adaptateurs.ts,
    photosProduit / versRelais) ; le dessin du prototype reste en repli. Les routes du kit qui rendent un `dessin`
    (panier, listes, flash) peuvent ajouter `image: {"url": pont.image(id)}` quand cette adresse n'est pas vide."""
    p = modele("produit").objects.filter(pk=int(product_id)).first()
    for rel in ("images", "media"):
        try:
            lot = getattr(p, rel).all()
            premier = sorted(lot, key=lambda x: not getattr(x, "is_primary", False))[0] if lot else None
            fichier = getattr(premier, "image", None) or getattr(premier, "file", None)
            if fichier:
                return fichier.url
        except Exception:
            continue
    return ""


def _relais(r) -> Relais:
    pos = None
    if r.latitude is not None and r.longitude is not None:
        pos = (Decimal(str(r.latitude)), Decimal(str(r.longitude)))
    zones = r.zones or []
    quartier = zones[0] if zones and isinstance(zones[0], str) else (r.address or r.city or "")
    return Relais(
        id=r.pk,
        nom=r.name,
        gerant=r.manager_name or "",
        quartier=quartier,
        ville=r.city or "",
        horaires=r.opening_hours or "",
        position=pos,
        actif=bool(r.is_active),
    )


def relais(relay_id) -> Relais | None:
    try:
        pk = int(relay_id)
    except (TypeError, ValueError):
        return None
    r = modele("relais").objects.filter(pk=pk).first()
    return _relais(r) if r is not None else None


def relais_par_nom(nom: str) -> Relais | None:
    """Le site désigne parfois un relais par son nom (choisirRelais(nom)) : identifiant ou nom exact."""
    r = relais(nom)
    if r is not None:
        return r
    obj = modele("relais").objects.filter(name__iexact=str(nom).strip()).first()
    return _relais(obj) if obj is not None else None


def relais_actifs() -> list[Relais]:
    return [_relais(r) for r in modele("relais").objects.filter(is_active=True).order_by("name")]


def commande(order_id, user=None) -> Commande | None:
    """La commande `order_id` ; avec `user`, seulement si elle est à lui (filtrage au queryset)."""
    try:
        pk = id_commande(order_id)
    except ValueError:
        return None
    qs = modele("commande").objects.filter(pk=pk)
    if user is not None:
        qs = qs.filter(user=user)
    o = qs.prefetch_related("items").first()
    if o is None:
        return None
    return Commande(
        id=o.pk,
        ref=ref_commande(o.pk),
        user_id=o.user_id,
        mode="domicile" if o.delivery_method == "DELIVERY" else "relais",
        relay_id=o.relay_point_id,
        sous_total=int(o.subtotal_xaf),
        livraison=int(o.delivery_fee_xaf),
        total=int(o.total_xaf),
        payee=o.payment_status == "PAID",
        creee_le=o.created_at,
        lignes=tuple(LigneCommande(i.product_id, i.title_snapshot, int(i.price_xaf_snapshot), int(i.qty)) for i in o.items.all()),
    )
