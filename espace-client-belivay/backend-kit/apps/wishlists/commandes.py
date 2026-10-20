# backend/apps/wishlists/commandes.py
# Outils communs du groupe « échanges » (listes d'envies, diaspora, modules CL-15) : frais d'un panier par le moteur,
# relais habituel, paiement par le prestataire, création de la commande payée pour quelqu'un d'autre, suivi.
#
# CRÉATION DE COMMANDE (décision D8 de REPRISE-BACKEND.md) : un cadeau, une commande pour un proche, une cotisation
# atteinte… deviennent une commande de relaya au nom du DESTINATAIRE (il reçoit le code et retire). La commande relaya
# naît par apps.cart.commande.creer_commande (qui suit settings.BELIVAY_CREER_COMMANDE : chez relaya, leur création
# de commande et prepare_payment, séquestre compris) ; montants figés et sous-commandes par apps.pickup, comme
# POST /api/checkout. Sans application panier : Order et OrderItem écrits par le pont (projet d'essai seulement).
#
# Les applications du kit n'importent aucune application de relaya : tout passe par apps.client_core.pont.

import importlib
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.client_core import parametres, pont

MOYENS_CARTE = {"carte", "apple", "google"}


def appeler(module: str, fonction: str, *args, defaut=None, **kwargs):
    """Fonction d'une autre application du kit si elle est installée, sinon `defaut`."""
    try:
        f = getattr(importlib.import_module(module), fonction)
    except (ImportError, AttributeError):
        return defaut
    return f(*args, **kwargs)


# ── Produits, classes, frais ───────────────────────────────────────────────────────────────────────────


def classe_de(product_id: int) -> str:
    """Classe de colis (cart.FicheLogistique) ; sans application panier : BELIVAY_CLASSE_PAR_DEFAUT, sinon refus."""
    r = appeler("apps.cart.services", "classe_de", int(product_id))
    if r is not None:
        return r[0]
    defaut = getattr(settings, "BELIVAY_CLASSE_PAR_DEFAUT", None)
    if defaut:
        return defaut
    from belivay_moteurs.erreurs import PanierInvalide

    raise PanierInvalide(f"produit {product_id} : classe de colis inconnue (fiche logistique à créer)")


def panier_moteur(mode: str, lignes: list[tuple[int, int, int]]):
    """lignes : [(product_id, qte, prix)] → belivay_moteurs.frais.Panier (une sous-commande par boutique)."""
    from belivay_moteurs.frais import Article, Panier, SousCommande

    produits = pont.produits([pid for pid, _, _ in lignes])
    par_boutique: dict[str, list] = {}
    zones: dict[str, str] = {}
    for pid, qte, prix in lignes:
        p = produits.get(int(pid))
        nom = p.boutique.nom if p and p.boutique else f"Boutique du produit {pid}"
        zones[nom] = p.boutique.zone if p and p.boutique else ""
        par_boutique.setdefault(nom, []).append(Article(str(pid), int(prix), int(qte), classe_de(pid)))
    return Panier(mode, tuple(SousCommande(nom, zones[nom], tuple(arts)) for nom, arts in par_boutique.items()))


def frais(mode: str, lignes: list[tuple[int, int, int]]):
    """belivay_moteurs.frais.FraisPanier du panier (CAL-06)."""
    from belivay_moteurs.frais import calculer

    return calculer(panier_moteur(mode, lignes), parametres.livraison())


def livraison_seule(mode: str, lignes: list[tuple[int, int, int]]) -> int:
    f = frais(mode, lignes)
    return f.total - f.sous_total


def service_carte(montant: int) -> int:
    from belivay_moteurs.carte import frais_de_service

    return frais_de_service(montant, parametres.paiement())


def en_devise(francs: int, devise: str) -> tuple[Decimal | None, Decimal | None]:
    """(montant dans la devise, taux figé) : euro à parité fixe, dollar au taux du prestataire figé maintenant."""
    from belivay_moteurs.carte import PARITE_EURO
    from belivay_moteurs.carte import en_devise as conv

    if devise == "EUR":
        return conv(francs, "EUR"), PARITE_EURO
    if devise == "USD":
        from apps.wallet.prestataires import carte

        taux = carte().taux_usd()
        return conv(francs, "USD", taux), taux
    return None, None


# ── Lieux ──────────────────────────────────────────────────────────────────────────────────────────────


def relais_habituel(user):
    """pont.Relais du relais habituel du client (client_accounts), ou None."""
    if user is None:
        return None
    return appeler("apps.client_accounts.services", "relais_habituel", user)


def a_une_adresse(user) -> bool:
    return appeler("apps.client_accounts.services", "adresse_principale", user) is not None


# PARAMÈTRE À AJOUTER AU REGISTRE : VILLE-SERVIE (les adresses du kit n'ont qu'un quartier ; une seule ville servie)
VILLE = "Yaoundé"


def ville_domicile(user) -> str | None:
    """La ville seulement, jamais l'adresse (DP-54)."""
    a = appeler("apps.client_accounts.services", "adresse_principale", user)
    return (getattr(a, "ville", None) or VILLE) if a is not None else None


def client_par_numero(numero: str):
    """Le compte dont le numéro VÉRIFIÉ est celui-ci (client_accounts.ProfilClient, empreinte HMAC), ou None."""
    from apps.client_core.chiffrement import empreinte
    from apps.client_core.masquage import numero_local

    try:
        from apps.client_accounts.models import ProfilClient
    except (ImportError, RuntimeError):
        return None
    p = (
        ProfilClient.objects.filter(numero_empreinte=empreinte(numero_local(numero)), numero_verifie_le__isnull=False)
        .select_related("user")
        .first()
    )
    return p.user if p is not None and p.user.is_active else None


def notifier(user, titre: str, texte: str, lien: str = "") -> bool:
    """Notification dans l'application du client (centre + push), par apps.notifications_client.services.notifier
    si elle existe ; sinon rien (journalisé). Jamais de code ni de montant sensible (CAP-19)."""
    if user is None:
        return False
    r = appeler("apps.notifications_client.services", "notifier", user, titre=titre, texte=texte, lien=lien, defaut=False)
    return bool(r) or r is None


def relais_par_texte(texte) -> object | None:
    """Le site désigne un relais par son identifiant ou son nom (« Relais Mvog-Ada »)."""
    if texte in (None, ""):
        return None
    return pont.relais_par_nom(str(texte))


def quartier(relais) -> str | None:
    return relais.quartier if relais is not None else None


# ── Paiement ───────────────────────────────────────────────────────────────────────────────────────────


def payer(
    *, moyen: str, montant: int, reference: str, jeton: str = "", numero: str = "", devise: str = "XAF", email: str = "", motif: str = ""
):
    """ResultatPaiement du prestataire : carte (Apple Pay, Google Pay : le jeton de la carte du téléphone) ou Mobile
    Money (demande sur le téléphone, confirmée plus tard par le webhook de relaya)."""
    from apps.wallet.prestataires import carte, mobile_money

    if moyen in MOYENS_CARTE:
        montant_devise, _ = en_devise(montant, devise) if devise in ("EUR", "USD") else (None, None)
        return carte().payer(
            montant_xaf=montant, devise=devise, montant_devise=montant_devise, jeton=jeton, reference=reference, email=email
        )
    return mobile_money().demander(montant_xaf=montant, numero=numero, reference=reference, motif=motif)


def rembourser(*, moyen: str, reference: str, montant: int, numero: str = ""):
    from apps.wallet.prestataires import carte, mobile_money

    if montant <= 0:
        return None
    if moyen in MOYENS_CARTE:
        return carte().rembourser(reference=reference, montant_xaf=montant)
    return mobile_money().verser(montant_xaf=montant, numero=numero, reference=reference)


def moyen_de(texte: str) -> str:
    """Le moyen d'après le texte du site (« carte », « apple », « google », « Visa •••• 4242 », un numéro…)."""
    t = (texte or "").strip().lower()
    if t in MOYENS_CARTE:
        return t
    if t.startswith(("carte", "visa", "mastercard", "tok_", "carte_")):
        return "carte"
    if "apple" in t:
        return "apple"
    if "google" in t:
        return "google"
    return "mobile"


# ── Création de la commande ────────────────────────────────────────────────────────────────────────────


def _lignes_figees(lignes: list[tuple[int, int, int]], produits: dict) -> list[dict]:
    """Lignes au format de apps.pickup.services.creer_sous_commandes (boutique, zone, classe, prix, qte…)."""
    sortie = []
    for pid, q, prix in lignes:
        p = produits.get(int(pid))
        b = p.boutique if p else None
        sortie.append(
            {
                "product_id": int(pid),
                "titre": (p.titre if p else str(pid))[:200],
                "prix": prix,
                "qte": q,
                "classe": classe_de(pid),
                "gros": False,
                "boutique": b.nom if b else f"Boutique du produit {pid}",
                "zone": b.zone if b else "",
                "vendor_id": b.id if b else None,
            }
        )
    return sortie


@transaction.atomic
def creer_commande(
    *,
    destinataire,
    lignes: list[tuple[int, int, int]],
    mode: str,
    relay_id: int | None,
    payee: bool,
    livraison: int,
    frais_service: int = 0,
    moyen: str = "",
    devise: str = "XAF",
    montant_devise=None,
    payeur: dict | None = None,
) -> int:
    """Crée la commande au nom du destinataire ; rend son order_id. lignes : [(product_id, qte, prix)].

    Commande relaya : apps.cart.commande.creer_commande (qui suit settings.BELIVAY_CREER_COMMANDE, décision D8) ;
    montants figés et sous-commandes : apps.pickup (MontantsCommande, services.creer_sous_commandes)."""
    produits = pont.produits([pid for pid, _, _ in lignes])
    sous_total = sum(q * prix for _, q, prix in lignes)
    relais = relay_id if mode != "domicile" else None
    try:
        from apps.cart.commande import NouvelleCommande
        from apps.cart.commande import creer_commande as creer_relaya
    except ImportError:
        NouvelleCommande = None
    if NouvelleCommande is not None:
        adresse = appeler("apps.client_accounts.services", "adresse_principale", destinataire) if mode == "domicile" else None
        order_id = creer_relaya(
            NouvelleCommande(
                user=destinataire,
                mode=mode,
                relay_id=relais,
                adresse=adresse,
                telephone="",
                lignes=tuple((pid, (produits[int(pid)].titre if int(pid) in produits else str(pid)), prix, q) for pid, q, prix in lignes),
                sous_total=sous_total,
                livraison=livraison,
                total=sous_total + livraison + frais_service,
            )
        )
    else:
        commande = pont.modele("commande").objects.create(
            user=destinataire,
            customer_phone="",
            delivery_method="DELIVERY" if mode == "domicile" else "PICKUP",
            relay_point_id=relais,
            subtotal_xaf=sous_total,
            delivery_fee_xaf=livraison,
            total_xaf=sous_total + livraison,
        )
        Ligne = pont.modele("ligne_commande")
        for pid, q, prix in lignes:
            p = produits.get(int(pid))
            Ligne.objects.create(
                order=commande,
                product_id=int(pid),
                title_snapshot=(p.titre if p else str(pid))[:200],
                price_xaf_snapshot=prix,
                qty=q,
                line_total_xaf=prix * q,
            )
        order_id = commande.pk
    pont.modele("commande").objects.filter(pk=order_id).update(payment_status="PAID" if payee else "PENDING")

    try:
        from apps.pickup.models import MontantsCommande
    except (ImportError, RuntimeError):
        return order_id
    f = frais(mode, lignes)
    m = MontantsCommande.objects.create(
        order_id=order_id,
        client=destinataire,
        mode=mode,
        relay_id=relais,
        lieu=(pont.relais(relais).nom if relais and pont.relais(relais) else ""),
        sous_total=f.sous_total,
        ramassages=f.ramassages,
        remises=f.remises,
        supplements=f.supplements,
        offert=f.offert,
        total=f.total,
        seuil=f.seuil,
        frais_service=frais_service,
        version_parametres=f.version_parametres,
        moyen=(moyen or "carte")[:10],
        avance=sous_total + livraison + frais_service,
        du_au_retrait=max(0, f.total - sous_total - livraison),
        devise=devise,
        montant_devise=montant_devise,
        etat_paiement=MontantsCommande.EtatPaiement.PAYEE if payee else MontantsCommande.EtatPaiement.ATTENTE,
        payee_le=timezone.now() if payee else None,
        payeur=payeur,
    )
    figees = _lignes_figees(lignes, produits)
    r = appeler("apps.pickup.services", "creer_sous_commandes", m, figees)
    if r is None:
        _sous_commandes_minimales(m, figees)
    return order_id


def _sous_commandes_minimales(m, figees: list[dict]) -> None:
    from apps.pickup.models import LigneSousCommande, SousCommande

    par: dict[str, list[dict]] = {}
    for lg in figees:
        par.setdefault(lg["boutique"], []).append(lg)
    rang = ["S", "M", "L", "XL", "HG"]
    for n, (boutique, lgs) in enumerate(par.items(), start=1):
        sc = SousCommande.objects.create(
            order_id=m.order_id,
            n=n,
            vendor_id=lgs[0]["vendor_id"],
            boutique=boutique,
            zone=lgs[0]["zone"],
            classe=max((lg["classe"] for lg in lgs), key=rang.index),
            sous_total=sum(lg["prix"] * lg["qte"] for lg in lgs),
            relay_id=m.relay_id,
        )
        for lg in lgs:
            LigneSousCommande.objects.create(
                sous_commande=sc, product_id=lg["product_id"], titre=lg["titre"], prix=lg["prix"], qte=lg["qte"], classe=lg["classe"]
            )


def marquer_payee(order_id: int) -> None:
    """Paiement confirmé plus tard (webhook Mobile Money, retour 3-D Secure)."""
    pont.modele("commande").objects.filter(pk=order_id).update(payment_status="PAID")
    try:
        from apps.pickup.models import MontantsCommande
    except (ImportError, RuntimeError):
        return
    MontantsCommande.objects.filter(order_id=order_id).update(etat_paiement=MontantsCommande.EtatPaiement.PAYEE, payee_le=timezone.now())


def suivi(order_id: int | None) -> dict:
    """État d'une commande pour le suivi d'un échange : {prepareLe, arriveLe, remisLe, expedie, rembourse} (dates
    datetime ou None), lu dans les sous-commandes du kit (apps.pickup) ; sans elles, rien n'est connu."""
    vide = {"prepareLe": None, "arriveLe": None, "remisLe": None, "expedie": False, "rembourse": None, "annulee": False, "joursGarde": 0}
    if not order_id:
        return vide
    try:
        from apps.pickup.models import SousCommande
    except (ImportError, RuntimeError):
        return vide
    colis = list(SousCommande.objects.filter(order_id=order_id))
    if not colis:
        return vide
    E = SousCommande.Etat
    prepare = [c.cree_le for c in colis if c.etat not in (E.PAYEE, E.ANNULEE)]
    arrive = [c.arrivee_le for c in colis if c.arrivee_le]
    remis = [c.remise_le for c in colis if c.remise_le]
    rembourse = sum(c.rembourse for c in colis)
    # Jours de garde (J1 = jour d'arrivée) : du premier colis arrivé et pas encore remis, au jour civil de Yaoundé.
    from apps.client_core.temps import YAOUNDE, aujourd_hui

    jours = 0
    attente = [c.arrivee_le for c in colis if c.arrivee_le and not c.remise_le]
    if attente:
        jours = (aujourd_hui() - min(attente).astimezone(YAOUNDE).date()).days + 1
    return {
        "prepareLe": max(prepare) if prepare and len(prepare) == len(colis) else None,
        "arriveLe": max(arrive) if arrive and len(arrive) == len(colis) else None,
        "remisLe": max(remis) if remis and len(remis) == len(colis) else None,
        "expedie": any(c.collectee for c in colis),
        "rembourse": rembourse or None,
        "annulee": all(c.etat == E.ANNULEE for c in colis),
        "joursGarde": jours,
    }
