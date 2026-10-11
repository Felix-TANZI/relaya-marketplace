# backend/apps/vendeur_core/services.py
# Services communs de l'espace vendeur : formes de sortie partagées (article vu par le vendeur, numéro masqué, état de
# la boutique), montant gardé par le moteur de commission (jamais recalculé ailleurs), entrée d'une commande chez le
# vendeur (synchroniser : les sous-commandes payées de pickup deviennent des CommandeVendeur, montants figés), journal
# signé, offre publiée chez relaya (Product par le pont).
from datetime import timedelta

from django.apps import apps
from django.db import transaction

from apps.client_core import pont
from apps.client_core.chiffrement import dechiffrer
from apps.client_core.temps import ms

from . import calendrier, horloge, parametres
from .models import Boutique, CommandeVendeur, EntreeJournal, Livreur, Membre, Offre

SYSTEME = "Système BelivaY"


# ── Formes de sortie ───────────────────────────────────────────────────────────────────────────────────


def numero_court(b: Boutique) -> dict | None:
    """NumeroCourt du site : {operateur, masque « ···· 4217 »} ; None sans numéro de versement."""
    if not b.numero_operateur or not b.numero_chiffre:
        return None
    n = dechiffrer(b.numero_chiffre)
    return {"operateur": b.numero_operateur, "masque": f"···· {n[-4:]}"}


def numero_en_mots(b: Boutique) -> str:
    """« MTN ···· 4217 » ; « » sans numéro."""
    c = numero_court(b)
    return f"{c['operateur']} {c['masque']}" if c else ""


def etat_boutique(b: Boutique) -> str:
    """EtatBoutique du site : suspendue (sanction de niveau 3), en_pause, fermee_aujourdhui, ouverte."""
    t = horloge.maintenant()
    if b.suspendue_depuis is not None:
        return "suspendue"
    if b.pause_depuis and b.pause_jusqua and b.pause_depuis <= t < b.pause_jusqua:
        return "en_pause"
    if b.fermee_le == horloge.aujourd_hui():
        return "fermee_aujourdhui"
    return "ouverte"


def ferme_a(b: Boutique) -> str:
    """Heure de fermeture du jour (« 18:00 ») ; « » si fermé ce jour-là."""
    j = horloge.aujourd_hui()
    h = next((x for x in b.horaires or [] if x["jour"] == j.weekday()), None)
    return h["a"] if h and h.get("ouvert") else ""


def article_vendu(ligne: dict) -> dict:
    """ArticleVendu du site depuis une ligne de CommandeVendeur (fiche BelivaY + variante)."""
    return {
        "offreId": str(ligne.get("offreId") or ""),
        "titre": ligne.get("titre", ""),
        "variante": ligne.get("variante", ""),
        "etat": ligne.get("etat", "Neuf"),
        "dessin": ligne.get("dessin", ""),
        "categorie": ligne.get("categorie", ""),
    }


def article_offre(o: Offre) -> dict:
    f = o.fiche
    return {
        "offreId": str(o.pk),
        "titre": o.titre,
        "variante": o.variante,
        "etat": o.etat_article,
        "dessin": f.dessin if f else "",
        "categorie": f.categorie if f else "",
    }


def livreur_json(c: CommandeVendeur) -> dict | None:
    """Livreur du créneau (PRE-03) : nom, entreprise, créneau ; le vendeur voit le livreur, jamais le client."""
    lv = c.livreur
    if lv is None or c.ramassage_debut is None:
        return None
    de = c.ramassage_debut.astimezone(calendrier.YAOUNDE).strftime("%H:%M")
    a = c.ramassage_fin.astimezone(calendrier.YAOUNDE).strftime("%H:%M") if c.ramassage_fin else de
    return {"nom": lv.nom, "societe": lv.societe, "creneau": [de, a], "photo": lv.photo}


def signature(m: Membre | None) -> tuple[str, str]:
    return (m.signature, m.role) if m is not None else (SYSTEME, "systeme")


def journaliser(
    c: CommandeVendeur, membre: Membre | None, action: str, *, detail: str = "", detail_a=None, avant="", apres="", a=None
) -> EntreeJournal:
    auteur, role = signature(membre)
    return EntreeJournal.objects.create(
        commande=c,
        a=a or horloge.maintenant(),
        auteur=auteur,
        role=role,
        action=action,
        detail=detail,
        detail_a=detail_a,
        avant=str(avant),
        apres=str(apres),
    )


# ── Commission (moteur) ────────────────────────────────────────────────────────────────────────────────


def commandes_decouverte(b: Boutique) -> int:
    """Commandes comptées par l'offre de découverte (encaissées, moins les remboursées en totalité, Q-62)."""
    from belivay_moteurs.commission import compteur_decouverte

    encaissees = CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True).count()
    return compteur_decouverte(encaissees, 0)


def decouverte(b: Boutique, jour=None) -> dict:
    """{active, fin (AAAA-MM-JJ ou None), commandes, max} : offre de découverte (VD-10 PLN-07)."""
    from belivay_moteurs.commission import decouverte_active, fin_decouverte

    p = parametres.commission()
    jour = jour or horloge.aujourd_hui()
    n = commandes_decouverte(b)
    fin = fin_decouverte(b.premiere_commande_payee, p) if b.premiere_commande_payee else None
    return {
        "active": decouverte_active(b.premiere_commande_payee, jour, n, p),
        "fin": fin.isoformat() if fin else None,
        "commandes": n,
        "max": p.decouverte_commandes,
    }


def garde(lignes: list[dict], palier: str, decouverte_active: bool):
    """ResultatCommission du moteur (calculer_commission) pour des lignes {categorie, prix, quantite, madeInCameroon}."""
    from belivay_moteurs.commission import LigneVendue, calculer_commission, famille_de

    p = parametres.commission()
    vendues = [
        LigneVendue(famille_de(lg["categorie"], p), int(lg["prix"]), int(lg.get("quantite", 1)), bool(lg.get("madeInCameroon", False)))
        for lg in lignes
    ]
    return calculer_commission(vendues, palier, decouverte_active, p)


def garde_par_vente(
    b: Boutique, categorie: str, prix: int, made_in_cameroon: bool = False, palier: str | None = None, decouverte_active: bool | None = None
) -> int:
    """« Vous gardez X F par vente » d'un article, au palier et à l'offre du jour (PRX-08) ; palier et découverte
    peuvent être imposés (tableau des paliers, simulateur)."""
    act = decouverte(b)["active"] if decouverte_active is None else decouverte_active
    return garde([{"categorie": categorie, "prix": prix, "quantite": 1, "madeInCameroon": made_in_cameroon}], palier or b.palier, act).garde


# ── Entrée des commandes chez le vendeur ───────────────────────────────────────────────────────────────


def ref_de(order_id: int, n: int) -> str:
    return pont.ref_commande(order_id) if n == 1 else f"{pont.ref_commande(order_id)}-{n}"


def boutique_du_vendeur(vendor_id) -> Boutique | None:
    return Boutique.objects.filter(vendor_id=vendor_id).first() if vendor_id else None


def _moyen(m) -> tuple[str, bool]:
    """(moyen du site vendeur, payable au retrait) depuis pickup.MontantsCommande."""
    if m.comptoir:
        return "comptoir", True
    if m.devise == "EUR":
        return "eur", False
    if m.devise == "USD":
        return "usd", False
    return {
        "mtn": "momo",
        "orange": "momo",
        "autre": "momo",
        "wallet": "wallet",
        "carte": "carte",
        "apple": "apple",
        "google": "google",
    }.get(m.moyen, "momo"), False


def livreur_par_defaut(b: Boutique) -> Livreur | None:
    return (
        Livreur.objects.filter(actif=True, societe=b.societe_livraison).order_by("id").first()
        or Livreur.objects.filter(actif=True).order_by("id").first()
    )


def entrer(sc, b: Boutique) -> CommandeVendeur | None:
    """Une sous-commande payée (ou validée au comptoir) entre chez le vendeur : lignes de SA boutique seulement, montant
    gardé figé par le moteur au palier et à l'offre du jour (D5), échéance de préparation en heures d'ouverture."""
    from apps.pickup.models import MontantsCommande

    m = MontantsCommande.objects.filter(order_id=sc.order_id).first()
    if m is None or (m.etat_paiement != MontantsCommande.EtatPaiement.PAYEE and not m.comptoir):
        return None
    moyen, au_retrait = _moyen(m)
    lignes = []
    for lg in sc.lignes.all():
        o = Offre.objects.select_related("fiche").filter(boutique=b, product_id=lg.product_id).first()
        f = o.fiche if o else None
        lignes.append(
            {
                "offreId": str(o.pk) if o else "",
                "productId": lg.product_id,
                "titre": f.titre if f else lg.titre,
                "variante": o.variante if o else "",
                "etat": o.etat_article if o else "Neuf",
                "dessin": f.dessin if f else "",
                "categorie": f.categorie if f else "Électronique",
                "prix": lg.prix,
                "quantite": lg.qte,
                "reference": o.reference if o else "",
                "aMettreDeCote": list(o.a_mettre_de_cote) if o else [],
                "madeInCameroon": bool(o and o.made_in_cameroon),
            }
        )
    if not lignes:
        return None
    payee = m.payee_le or m.cree_le
    if b.premiere_commande_payee is None:
        b.premiere_commande_payee = payee.astimezone(calendrier.YAOUNDE).date()
        b.save(update_fields=["premiere_commande_payee"])
    dec = decouverte(b, payee.astimezone(calendrier.YAOUNDE).date())["active"]
    r = garde(lignes, b.palier, dec)
    if apps.is_installed("apps.publicite"):  # DP-59 : vente attribuée à un clic, commission flash majorée
        from apps.publicite.services import a_l_entree

        r = a_l_entree(b, m.client_id, lignes, dec, payee, r)
    cal = calendrier.calendrier(b)
    debut = calendrier.ouverture_suivante(payee, cal)
    # Échéances (E4, DEL-01) : début + 4 h d'ouverture ; absolue : début + 24 h d'ouverture (DP-56 Q-38).
    delai_h = max([4] + [o.delai_preparation_h for o in Offre.objects.filter(pk__in=[lg["offreId"] for lg in lignes if lg["offreId"]])])
    echeance = calendrier.ajouter_ouvertes(debut, timedelta(hours=delai_h), cal)
    absolue = calendrier.ajouter_ouvertes(debut, timedelta(hours=max(24, delai_h)), cal)
    passage = calendrier.passage_suivant(echeance, cal)
    c = CommandeVendeur.objects.create(
        boutique=b,
        order_id=sc.order_id,
        n=sc.n,
        ref=ref_de(sc.order_id, sc.n),
        payee_a=payee,
        payable_au_retrait=au_retrait,
        moyen=moyen,
        colis="XXL" if sc.classe == "HG" else sc.classe,
        lignes=lignes,
        prix=r.prix_articles,
        garde=r.garde,
        commission=r.commission,
        tva=r.tva,
        palier=b.palier,
        decouverte=dec,
        version_parametres=r.version_parametres,
        debut=debut,
        echeance=echeance,
        echeance_absolue=absolue,
        livreur=livreur_par_defaut(b),
        ramassage_debut=passage[0] if passage[0] != passage[1] else None,
        ramassage_fin=passage[1] if passage[0] != passage[1] else None,
        verifications=[{"cle": k, "fait": False, "par": None} for k in ("modele", "etat", "accessoires", "boite")],
    )
    notifier(
        b,
        "preparer",
        "Nouvelle commande à préparer",
        f"{c.ref} · {lignes[0]['titre']} : prête avant l'échéance.",
        f"commande?ref={c.ref}",
        urgent=True,
    )
    journaliser(c, None, "Commande reçue", detail=("Validée · payée au retrait" if au_retrait else "Encaissée par BelivaY"), a=payee)
    _decrementer_stock(b, lignes)
    from .echanges import emettre

    emettre(
        b,
        "entrant",
        "client",
        "commande_payee",
        "order.paid",
        {
            "ref": c.ref,
            "lignes": [{"offreId": lg["offreId"], "quantite": lg.get("quantite", 1)} for lg in lignes],
            "echeance": ms_ou_none(c.echeance),
            "payableAuRetrait": au_retrait,
        },
        "commandes.voir",
    )
    return c


def _decrementer_stock(b: Boutique, lignes: list[dict]) -> None:
    for lg in lignes:
        if lg["offreId"]:
            o = Offre.objects.filter(pk=lg["offreId"], boutique=b).first()
            if o is not None:
                o.stock = max(0, o.stock - int(lg["quantite"]))
                o.save(update_fields=["stock", "maj_le"])


def synchroniser(b: Boutique) -> int:
    """Fait entrer les sous-commandes payées de la boutique pas encore vues (lecture des commandes, de l'accueil…).
    En production, le même appel part du signal de paiement confirmé (cart.paiement.confirmer_paiement) ; ici, la
    lecture suffit et rend le parcours sûr (idempotent)."""
    if not b.vendor_id:
        return 0
    from apps.pickup.models import SousCommande

    connues = set(CommandeVendeur.objects.filter(boutique=b).values_list("order_id", "n"))
    n = 0
    for sc in SousCommande.objects.filter(vendor_id=b.vendor_id).prefetch_related("lignes").order_by("id"):
        if (sc.order_id, sc.n) in connues:
            continue
        with transaction.atomic():
            if entrer(sc, b) is not None:
                n += 1
    return n


def commande(b: Boutique, ref: str, verrou: bool = False) -> CommandeVendeur | None:
    qs = CommandeVendeur.objects.filter(boutique=b, ref=str(ref).upper())
    if verrou:
        qs = qs.select_for_update()
    return qs.select_related("livreur").first()


def sous_commande(c: CommandeVendeur):
    from apps.pickup.models import SousCommande

    return SousCommande.objects.filter(order_id=c.order_id, n=c.n).first()


def avancer_colis(c: CommandeVendeur, evenement: str) -> None:
    """Fait avancer le colis du client jusqu'à `evenement` (machine SOUS_COMMANDE, pickup.evenements) en passant par les
    étapes d'avant : seller.confirmed, suborder.ready, parcel.collected. Un colis déjà plus loin n'est pas reculé."""
    from apps.pickup.evenements import avancer

    etapes = ("seller.confirmed", "suborder.ready", "parcel.collected")
    rang = {"payee": 0, "confirmee": 1, "prete": 2, "collectee": 3}
    sc = sous_commande(c)
    if sc is None:
        return
    for i, e in enumerate(etapes[: etapes.index(evenement) + 1], start=1):
        if rang.get(sc.etat, 9) < i:
            avancer(c.order_id, e, n=c.n)
            sc.refresh_from_db()


# ── Instants ───────────────────────────────────────────────────────────────────────────────────────────


def ms_ou_none(x):
    return ms(x) if x is not None else None


# ── Offre publiée chez relaya (Product, Inventory, classe de colis) ────────────────────────────────────


def prix_paye(o: Offre) -> int:
    """Prix payé par le client : le prix remisé pendant une vente flash en cours (Promotions, F9), sinon le prix."""
    from django.apps import apps

    if apps.is_installed("apps.vendeur_croissance"):
        from apps.vendeur_croissance.promotions import en_cours

        v = en_cours(o)
        if v is not None:
            return v.prix_promo
    return int(o.prix or 0)


def publier_produit(o: Offre) -> int:
    """Crée ou met à jour le Product de relaya qui porte l'offre (titre de la fiche, prix, stock, vendeur, fiche maître)
    et sa classe de colis (cart.FicheLogistique, décision D3) ; rend product_id. En production : par le circuit de
    modération de relaya (catalog), avec les mêmes champs."""
    from django.utils.text import slugify

    Produit, Stock = pont.modele("produit"), pont.modele("stock")
    titre = f"{o.titre} · {o.variante}" if o.variante else o.titre
    champs = {
        "title": titre[:200],
        "price_xaf": prix_paye(o),
        "is_active": o.etat == Offre.Etat.EN_VENTE,
        "vendor": o.boutique.proprietaire,
    }
    if o.fiche_id and o.fiche.master_id and any(f.name == "master" for f in Produit._meta.get_fields()):
        champs["master_id"] = o.fiche.master_id
    if o.product_id:
        Produit.objects.filter(pk=o.product_id).update(**champs)
        p = Produit.objects.get(pk=o.product_id)
    else:
        p = Produit.objects.create(slug=f"v{o.boutique_id}-{o.pk}-{slugify(titre)[:150]}", **champs)
        o.product_id = p.pk
        o.save(update_fields=["product_id"])
    Stock.objects.update_or_create(product=p, defaults={"quantity": o.stock})
    try:
        from apps.cart.models import FicheLogistique

        FicheLogistique.objects.update_or_create(product_id=p.pk, defaults={"classe": "HG" if o.colis == "XXL" else o.colis})
    except ImportError:  # pragma: no cover - panier du kit absent
        pass
    return p.pk


# ── Notifications du vendeur ───────────────────────────────────────────────────────────────────────────


def notifier(b: Boutique, type: str, titre: str, texte: str, lien: str = "", *, urgent: bool = False, argent: bool = False):  # noqa: A002
    """Une notification dans le centre du vendeur (NotificationVendeur). Push et SMS : par le prestataire du kit
    (apps.notifications_client) quand le vendeur aura ses appareils ; ici, le centre suffit."""
    from .models import NotificationVendeur

    return NotificationVendeur.objects.create(
        boutique=b, type=type, titre=titre, texte=texte, lien=lien, urgent=urgent, argent=argent, a=horloge.maintenant()
    )


# ── Remplacement d'un retour ───────────────────────────────────────────────────────────────────────────


def creer_remplacement(c: CommandeVendeur, offre: Offre, avant, membre: Membre | None = None) -> CommandeVendeur:
    """Sous-commande de remplacement d'un retour (REFCL-R080) : même parcours que toute commande (bon, « C'est prêt »,
    remise au livreur), sans argent (le vendeur a déjà été payé de la vente d'origine : garde 0, rien à verser) ;
    échéance = expédier avant (RET-REMPL-DELAI). Référence « <origine>-R »."""
    ref = f"{c.ref}-R"
    deja = CommandeVendeur.objects.filter(ref=ref).first()
    if deja is not None:
        return deja
    t = horloge.maintenant()
    lignes = [{**lg, "offreId": str(offre.pk), "productId": offre.product_id, "variante": offre.variante} for lg in c.lignes[:1]]
    cal = calendrier.calendrier(c.boutique)
    passage = calendrier.passage_suivant(min(avant, calendrier.ajouter_ouvertes(t, timedelta(hours=4), cal)), cal)
    r = CommandeVendeur.objects.create(
        boutique=c.boutique,
        order_id=c.order_id,
        n=c.n + 500,
        ref=ref,
        payee_a=t,
        payable_au_retrait=False,
        moyen=c.moyen,
        colis=c.colis,
        lignes=lignes,
        prix=0,
        garde=0,
        commission=0,
        tva=0,
        palier=c.palier,
        decouverte=False,
        version_parametres=c.version_parametres,
        debut=t,
        echeance=avant,
        echeance_absolue=avant,
        livreur=c.livreur,
        ramassage_debut=passage[0] if passage[0] != passage[1] else None,
        ramassage_fin=passage[1] if passage[0] != passage[1] else None,
        verifications=[{"cle": k, "fait": False, "par": None} for k in ("modele", "etat", "accessoires", "boite")],
        remplacement_de=c.ref,
    )
    journaliser(r, membre, "Remplacement à préparer", detail=f"Remplace l'article retourné de {c.ref}")
    notifier(
        c.boutique,
        "retour",
        "Remplacement à préparer",
        f"{ref} · {lignes[0].get('titre', '')} : à expédier avant l'échéance.",
        f"commande?ref={ref}",
        urgent=True,
    )
    return r
