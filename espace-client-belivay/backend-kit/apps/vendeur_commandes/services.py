# backend/apps/vendeur_commandes/services.py
# Commandes du vendeur (VD-05, VD-06) : liste et détail (statut et état de l'argent dérivés des faits du client et de
# BelivaY), journal ; gestes de préparation (« C'est prêt », rupture = vendeur suivant, plus de temps, bon) ; remise au
# livreur (code à 6 chiffres, blocage, nouveau code, reçu) ; et ce que font l'application du livreur et le client
# (saisie du code, livreur absent, annulation avant le ramassage), pour les routes d'essai du coordinateur.
#
# Les formes rendues sont exactement les types du site : espace-vendeur/src/donnees/domaines/{commandes,preparation,
# remise}.ts. Règles : jamais de calcul recodé (argent : belivay_moteurs.argent_vendeur et versements ; heures
# d'ouverture : apps.vendeur_core.calendrier ; vendeur suivant : belivay_moteurs.catalogue.vendeur_suivant ;
# remboursement : belivay_moteurs.annulation et carte). Heure : apps.vendeur_core.horloge.maintenant().
# ANONYMAT (GEN-01) : rien du client (ni nom, ni numéro, ni relais, ni mode, ni total payé), ni des autres vendeurs.
# RÔLE (DP-55) : l'accès Préparation reçoit les mêmes commandes sans aucun montant (null) ; le reçu lui est refusé.
import re
import secrets
from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Q
from rest_framework import status

from apps.client_core import pont
from apps.client_core.chiffrement import chiffrer, dechiffrer
from apps.client_core.erreurs import ErreurClient, introuvable, refus
from apps.client_core.temps import YAOUNDE, depuis_ms, ms
from apps.vendeur_core import calendrier, echanges, horloge, parametres
from apps.vendeur_core import services as socle
from apps.vendeur_core.acces import refus_proprietaire
from apps.vendeur_core.faits import Faits
from apps.vendeur_core.faits import faits as lire_faits
from apps.vendeur_core.models import Boutique, CommandeVendeur, EntreeJournal, Membre, Offre

from .models import BasculeColis, CommandeCedee

H = timedelta(hours=1)

# ── Paramètres ─────────────────────────────────────────────────────────────────────────────────────────

# Plafonds de valeur d'un colis par niveau du livreur (VD06-R03), lus dans TRANSP-PLAFOND ; repli si le registre ne
# l'a pas. PARAMÈTRE À AJOUTER AU REGISTRE : TRANSP-PLAFOND (s'il manque)
PLAFONDS_DEFAUT = {"nouveau": 75000, "confirme": 250000}
# Inspection d'un retour à réception : RET-INSPECT-H (parametres.litiges().inspection_heures).
CARTES = ("carte", "apple", "google", "usd", "eur")  # libération « carte » (VD-LIB-CARTE, DP-23)
FRAIS_PAYES_PAR_LE_CLIENT = ("carte", "usd", "eur")  # PAY-CARTE-FRAIS : 2 % payés par le client (RCU-02)
RANG_NIVEAU = {"Nouveau": 0, "Confirme": 1, "Or": 2}
VERIFICATIONS = ("modele", "etat", "accessoires", "boite")

# Photos de remise du serveur d'essai (dessins du prototype) ; en production, celles du webhook handover.completed.
PHOTO_DECOUVERT = "31d53847e649"
PHOTO_SCELLE = "97f264a1205c"


def _nombre(texte: str) -> int:
    return int(re.sub(r"\D", "", texte))


def file_heures() -> int:
    """Une action « C'est prêt » faite hors connexion part avec son heure d'origine, au plus VD-FILE-HORS-LIGNE
    heures après (Q-93, OFF-04)."""
    return parametres.file_hors_ligne()


def plafonds() -> dict:
    v = parametres.valeur("TRANSP-PLAFOND", "")
    m = re.match(r"^([\d\s]+) F Nouveau · ([\d\s]+) F Confirm", v)
    return {"nouveau": _nombre(m.group(1)), "confirme": _nombre(m.group(2))} if m else dict(PLAFONDS_DEFAUT)


def essais_et_blocage() -> tuple[int, int]:
    """CODE-ESSAIS « 3 ⇒ blocage 24 h » (REM_ESSAIS_MAX, REM_BLOCAGE_H du paquet vendeur)."""
    from apps.client_core.parametres import paiement

    p = paiement()
    return p.code_essais, p.code_blocage_heures


def niveau_requis(valeur: int) -> str:
    p = plafonds()
    return "Or" if valeur > p["confirme"] else "Confirme" if valeur > p["nouveau"] else "Nouveau"


# ── Lecture ────────────────────────────────────────────────────────────────────────────────────────────


def ref_affichee(c: CommandeVendeur) -> str:
    """Référence montrée au vendeur : celle d'origine pour une commande cédée après une rupture."""
    try:
        return c.cedee.ref
    except CommandeCedee.DoesNotExist:
        return c.ref


def commandes_de(b: Boutique):
    return CommandeVendeur.objects.filter(boutique=b).select_related("livreur", "cedee")


def trouver(b: Boutique, ref: str, verrou: bool = False) -> CommandeVendeur | None:
    c = socle.commande(b, ref, verrou)
    if c is None:
        cd = CommandeCedee.objects.filter(commande__boutique=b, ref=str(ref).upper()).values_list("commande_id", flat=True).first()
        if cd is not None:
            qs = CommandeVendeur.objects.filter(pk=cd)
            c = (qs.select_for_update() if verrou else qs).select_related("livreur").first()
    return c


def preparer_lecture(b: Boutique) -> None:
    """Avant toute lecture : les sous-commandes payées entrent (socle), les annulations du client sont constatées."""
    socle.synchroniser(b)
    constater_annulations(b)


def statut(c: CommandeVendeur, f: Faits) -> str:
    if c.annulee_a is not None or f.perdu:
        return "annulee"
    if c.prete_a is None:
        return "payable_au_retrait" if c.payable_au_retrait else "a_preparer"
    if c.remise_a is None:
        return "prete"
    if f.gel in ("litige", "recours"):
        return "litige_gele"
    if f.gel == "retour":
        return "retour_gele"
    return "livree" if f.retrait else "chez_le_livreur"


FILTRE = {
    "a_preparer": "prep",
    "payable_au_retrait": "prep",
    "prete": "cours",
    "chez_le_livreur": "cours",
    "litige_gele": "pb",
    "retour_gele": "pb",
    "livree": "fin",
    "annulee": "fin",
}
DETAIL = {
    "a_preparer": "prep",
    "payable_au_retrait": "prep",
    "prete": "cours",
    "chez_le_livreur": "cours",
    "litige_gele": "litiges",
    "retour_gele": "retours",
    "livree": "terminees",
    "annulee": "annulees",
}


def liberation_jours(c: CommandeVendeur, b: Boutique) -> int:
    p = parametres.versements()
    if c.moyen in CARTES:
        return p.lib_carte_jours
    return p.lib_or_jours if b.palier in ("Or", "Platine") else p.lib_standard_jours


def versement_de(c: CommandeVendeur) -> str | None:
    """Référence BLV-VS-… du versement qui a payé cette commande (application argent), sinon None."""
    try:
        from apps.vendeur_argent.services import versement_de as lire
    except ImportError:
        return None
    return lire(c)


def argent(c: CommandeVendeur, b: Boutique, f: Faits, t: datetime) -> dict:
    """État de l'argent (VD09-R04) par le moteur : libération après la fermeture du retour, au palier de la boutique
    (carte : 14 j), reprise après un litige gagné (Q-60), gel (LIB-02), versé (référence BLV-VS)."""
    from belivay_moteurs.argent_vendeur import EtatArgent, etat_de_l_argent
    from belivay_moteurs.versements import (
        Gain,
        MotifGel,
        date_de_liberation,
        fermeture_du_retour,
        liberation_apres_litige,
        vendredi_de_versement,
    )

    p = parametres.versements()
    lib = None
    if f.retrait is not None:
        lib = date_de_liberation(fermeture_du_retour(f.retrait, f.tout_en_ordre, p), b.palier, c.moyen in CARTES, p)
        if f.gel is None and f.fin_du_gel is not None:
            lib = liberation_apres_litige(lib, f.fin_du_gel)
    reference = versement_de(c)
    if f.perdu:
        etat = "repris"
    else:
        g = Gain(c.ref, c.garde, lib, verse=reference is not None, gel=MotifGel(f.gel) if f.gel else None)
        etat = {
            EtatArgent.EN_COURS: "en_cours",
            EtatArgent.SE_LIBERE: "se_libere",
            EtatArgent.GELE: "gele",
            EtatArgent.A_VERSER: "a_verser",
            EtatArgent.VERSE: "verse",
        }[etat_de_l_argent(g, t)]
    vendredi = vendredi_de_versement(lib, p).isoformat() if lib is not None and etat in ("se_libere", "a_verser", "verse") else None
    return {"etat": etat, "liberation": ms(lib), "vendredi": vendredi, "versement": reference}


def _hm(x: datetime) -> str:
    return x.astimezone(YAOUNDE).strftime("%H:%M")


def probleme(c: CommandeVendeur, f: Faits, st: str, cal: dict) -> dict | None:
    """Litige (échéance du vendeur, motif, répondu) ou retour (arrivée chez le vendeur, inspection RET-INSPECT-H)."""
    if st not in ("litige_gele", "retour_gele") or f.litige_id is None:
        return None
    from apps.aftersales.models import Litige, Retour

    lit = Litige.objects.get(pk=f.litige_id)
    if st == "litige_gele":
        return {
            "type": "litige",
            "echeance": ms(lit.echeance_vendeur),
            "motif": lit.probleme,
            "repondu": lit.reponse_vendeur not in ("", "silence"),
        }
    r = Retour.objects.filter(litige=lit).first()
    base = (r.recu_le or r.collecte_le or r.depose_le or r.deposer_avant) if r else lit.decision_le or lit.ouvert_le
    debut, fin = calendrier.passage_suivant(base, cal)
    return {
        "type": "retour",
        "motif": lit.probleme,
        "arrivee": {"jour": debut.astimezone(YAOUNDE).date().isoformat(), "creneau": [_hm(debut), _hm(fin)]},
        "inspectionHeures": parametres.litiges().inspection_heures,
    }


def annulation(c: CommandeVendeur, f: Faits) -> dict | None:
    if c.annulee_a is not None:
        return {"motif": c.motif_annulation or "belivay", "a": ms(c.annulee_a)}
    if f.perdu:
        return {"motif": "litige_perdu", "a": ms(f.fin_du_gel)}
    return None


def ligne_json(lg: dict, proprio: bool) -> dict:
    return {
        "article": socle.article_vendu(lg),
        "quantite": int(lg.get("quantite", 1)),
        "prixUnitaire": int(lg["prix"]) if proprio else None,
        "reference": lg.get("reference", ""),
        "aMettreDeCote": list(lg.get("aMettreDeCote") or []),
    }


def _slot(debut, fin) -> dict | None:
    return {"debut": ms(debut), "fin": ms(fin)} if debut is not None and fin is not None else None


def commande_json(c: CommandeVendeur, b: Boutique, proprio: bool, t: datetime, cal: dict, f: Faits | None = None) -> dict:
    f = f or lire_faits(c, t)
    st = statut(c, f)
    en_prep = st in ("a_preparer", "payable_au_retrait")
    actif = en_prep or st in ("prete", "chez_le_livreur")
    lv = socle.livreur_json(c) if actif else None
    pv = parametres.versements()
    return {
        "ref": ref_affichee(c),
        "statut": st,
        "payableAuRetrait": c.payable_au_retrait,
        "payeeA": ms(c.payee_a),
        "debut": ms(c.debut),
        "echeance": ms(c.echeance) if en_prep else None,
        "echeanceAbsolue": ms(c.echeance_absolue) if en_prep else None,
        "prolongee": c.prolongee,
        "calendrier": cal,
        "lignes": [ligne_json(lg, proprio) for lg in c.lignes],
        "colis": c.colis,
        "garde": c.garde if proprio and not c.remplacement_de else None,
        # Sous-commande de remplacement d'un retour (REFCL-R080, vendeur_core.services.creer_remplacement).
        "remplacementDe": c.remplacement_de or None,
        "liberationJours": liberation_jours(c, b),
        "argent": argent(c, b, f, t) if proprio and not c.remplacement_de else None,
        "livreur": lv,
        "ramassage": _slot(c.ramassage_debut, c.ramassage_fin) if st in ("a_preparer", "payable_au_retrait", "prete") else None,
        "preteA": ms(c.prete_a),
        "remiseA": ms(c.remise_a),
        "retireeA": ms(f.retrait),
        "confirmeeParLeClient": bool(
            f.retrait and f.tout_en_ordre and f.tout_en_ordre < f.retrait + timedelta(days=pv.fenetre_retour_jours)
        ),
        "annulation": annulation(c, f),
        "probleme": probleme(c, f, st, cal),
        "gele": c.garde if proprio and st in ("litige_gele", "retour_gele") else None,
        "moyenPaiement": c.moyen,
    }


def _cle_tri(filtre: str, x: dict):
    if filtre == "prep":
        return x["echeance"] or 0
    if filtre == "pb":
        return x["probleme"]["echeance"] if x["probleme"] and x["probleme"]["type"] == "litige" else float("inf")
    a = x["remiseA"] or x["preteA"] or (x["annulation"] or {}).get("a") or x["retireeA"] or x["payeeA"]
    return -a


def vue_commandes(b: Boutique, proprio: bool, filtre: str) -> dict:
    """VueCommandes : compteurs, détail et liste de la MÊME lecture (CMD-02) ; la somme du détail fait le total."""
    preparer_lecture(b)
    t = horloge.maintenant()
    cal = calendrier.calendrier(b)
    compteurs = dict.fromkeys(("prep", "cours", "fin", "pb"), 0)
    detail = dict.fromkeys(("prep", "cours", "litiges", "retours", "terminees", "annulees"), 0)
    items = []
    total = 0
    for c in commandes_de(b):
        f = lire_faits(c, t)
        st = statut(c, f)
        compteurs[FILTRE[st]] += 1
        detail[DETAIL[st]] += 1
        total += 1
        if FILTRE[st] == filtre:
            items.append(commande_json(c, b, proprio, t, cal, f))
    items.sort(key=lambda x: _cle_tri(filtre, x))
    return {"compteurs": compteurs, "detail": detail, "total": total, "items": items, "maintenant": ms(t)}


def detail(b: Boutique, proprio: bool, ref: str) -> dict:
    preparer_lecture(b)
    c = trouver(b, ref)
    if c is None:
        raise introuvable("Commande introuvable.")
    return commande_json(c, b, proprio, horloge.maintenant(), calendrier.calendrier(b))


def _valeur_journal(v: str):
    """Un changement de valeur : un instant (ms) est rendu en nombre (« un nombre est une heure »)."""
    return int(v) if v.isdigit() and len(v) >= 12 else v


def entree_json(e: EntreeJournal) -> dict:
    d = {"a": ms(e.a), "auteur": e.auteur, "role": e.role, "action": e.action}
    if e.detail:
        d["detail"] = e.detail
    if e.detail_a is not None:
        d["detailA"] = ms(e.detail_a)
    if e.avant:
        d["avant"] = _valeur_journal(e.avant)
    if e.apres:
        d["apres"] = _valeur_journal(e.apres)
    return d


def journal(b: Boutique, ref: str) -> list[dict]:
    c = trouver(b, ref)
    if c is None:
        raise introuvable("Commande introuvable.")
    return [entree_json(e) for e in c.journal.all()]


# ── Annulations ────────────────────────────────────────────────────────────────────────────────────────


def _rendre_stock(c: CommandeVendeur) -> None:
    for lg in c.lignes:
        o = Offre.objects.filter(pk=lg.get("offreId") or 0, boutique=c.boutique).first()
        if o is not None:
            o.stock += int(lg.get("quantite", 1))
            o.save(update_fields=["stock", "maj_le"])
            if o.product_id:
                socle.publier_produit(o)


def _annuler(
    c: CommandeVendeur, motif: str, action: str, membre: Membre | None = None, rendre_stock: bool = False, detail_: str = ""
) -> None:
    c.annulee_a, c.motif_annulation = horloge.maintenant(), motif
    c.save(update_fields=["annulee_a", "motif_annulation"])
    if rendre_stock:
        _rendre_stock(c)
    socle.journaliser(c, membre, action, detail=detail_)


MOTIF_PICKUP = {"toi": "client_avant_ramassage", "vendeur": "rupture", "belivay": "belivay"}


def constater_annulations(b: Boutique) -> int:
    """Colis annulé côté client (route d'annulation du kit) ou par BelivaY : la commande du vendeur suit, le stock
    réservé est rendu (VD06-R20)."""
    n = 0
    for c in CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True, remise_a__isnull=True):
        sc = socle.sous_commande(c)
        if sc is None or sc.etat != "annulee" or sc.vendor_id != b.vendor_id:
            continue
        motif = MOTIF_PICKUP.get(sc.annulee_par, "belivay")
        if motif == "client_avant_ramassage":
            _annuler(c, motif, "Annulée par le client avant le ramassage · stock rendu", rendre_stock=True)
        else:
            _annuler(c, motif, "Annulée par BelivaY", rendre_stock=True)
        socle.notifier(
            b,
            "preparer",
            "Commande annulée",
            f"{ref_affichee(c)} : annulée avant le ramassage. Le stock est rendu.",
            f"commande?ref={ref_affichee(c)}",
        )
        n += 1
    return n


def _notifier_client(c: CommandeVendeur, titre: str, texte: str) -> None:
    from apps.pickup.models import MontantsCommande

    m = MontantsCommande.objects.filter(order_id=c.order_id).select_related("client").first()
    if m is None:
        return
    try:
        from apps.notifications_client.services import notifier
    except ImportError:  # pragma: no cover - notifications du kit absentes
        return
    notifier(m.client, titre, texte, f"/commande?ref={m.ref}")


def _rembourser_colis(sc, motif: str) -> int:
    """Annulation du colis par le vendeur (rupture sans vendeur suivant, CAN-25) : remboursement intégral le jour même,
    par les moteurs du kit (annulation.annuler ; frais de service rendus en entier : carte.part_du_service, annulé par
    le vendeur, CET-24) ; destination du remboursement par le portefeuille du kit (REMB-DESTINATION).
    Même enchaînement que apps.pickup.services.annuler_colis, qui ne sait annuler qu'au nom du client."""
    from apps.client_core.parametres import livraison, paiement
    from apps.pickup.models import MontantsCommande, SousCommande
    from apps.pickup.services import _panier_moteur
    from belivay_moteurs.annulation import annuler
    from belivay_moteurs.carte import AnnulePar, part_du_service
    from belivay_moteurs.etats import SOUS_COMMANDE

    m = MontantsCommande.objects.select_for_update().get(order_id=sc.order_id)
    SOUS_COMMANDE.appliquer(sc.etat, "suborder.cancel")
    actives = list(SousCommande.objects.filter(order_id=m.order_id).exclude(etat=SousCommande.Etat.ANNULEE).prefetch_related("lignes"))
    r = annuler(
        _panier_moteur(m, actives),
        sc.boutique,
        livraison(),
        m.offert,
        collectee=False,
        encaisse=m.encaisse,
        deja_rembourse=m.rembourse,
        au_comptoir=m.comptoir,
    )
    rendu_service = 0
    if m.frais_service:
        part = part_du_service(m.frais_service, m.service_reparti, r.montant, len(actives) == 1, AnnulePar.VENDEUR, paiement())
        m.service_reparti += part.rendue + part.acquise
        rendu_service = part.rendue
    sc.etat, sc.annulee_le, sc.annulee_par, sc.motif_annulation, sc.rembourse = (
        "annulee",
        horloge.maintenant(),
        "vendeur",
        motif[:255],
        r.montant,
    )
    sc.save(update_fields=["etat", "annulee_le", "annulee_par", "motif_annulation", "rembourse"])
    m.rembourse += r.montant
    m.save(update_fields=["rembourse", "service_reparti"])
    total = r.montant + rendu_service
    if total:
        try:
            from apps.wallet.services import crediter_remboursement
        except ImportError:  # pragma: no cover - portefeuille du kit absent : remboursement par relaya (D9)
            return total
        crediter_remboursement(
            m.client,
            total,
            m.moyen in ("carte", "apple", "google"),
            reference=f"{m.ref}-{sc.n}-rupture",
            libelle=f"Remboursement · {m.ref} · rupture",
        )
    return total


# ── Préparation (VD-05) ───────────────────────────────────────────────────────────────────────────────


def nouveau_code() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def cest_pret(b: Boutique, membre: Membre, ref: str, origine_ms: int | None = None) -> dict:
    """« C'est prêt » (PRE-01, seule confirmation) : heure d'origine d'une action gardée hors connexion (au plus
    OFFLINE_ACTION_TTL_H), passage du livreur, code de remise (chiffré), colis du client « prêt »."""
    t = horloge.maintenant()
    with transaction.atomic():
        c = trouver(b, ref, verrou=True)
        if c is None:
            return {"ok": False, "raison": "introuvable"}
        if c.annulee_a is not None:
            return {"ok": False, "raison": "annulee"}
        if c.prete_a is not None:
            return {"ok": False, "raison": "deja_prete"}
        a = t
        if origine_ms is not None:
            a = depuis_ms(origine_ms)
            if a < t - file_heures() * H:
                raise refus("action_expiree", "Cette action hors connexion a plus de 72 h : elle n'est plus envoyée.")
            a = min(max(a, c.payee_a), t)
        cal = calendrier.calendrier(b)
        debut, fin = calendrier.passage_suivant(a, cal)
        c.prete_a = a
        if debut != fin:
            c.ramassage_debut, c.ramassage_fin = debut, fin
        c.livreur = c.livreur or socle.livreur_par_defaut(b)
        c.code_chiffre = chiffrer(nouveau_code())
        c.essais_faux, c.bloque_jusqua, c.nouveau_code_demande = 0, None, False
        c.confirmee_a = c.confirmee_a or t
        c.save()
        socle.journaliser(c, membre, "« C’est prêt »", detail="Envoyé au retour du réseau" if origine_ms is not None else "", a=a)
        socle.avancer_colis(c, "suborder.ready")
    return {"ok": True, "preteA": ms(a)}


def _stock_a_zero(c: CommandeVendeur, membre: Membre) -> None:
    for lg in c.lignes:
        o = Offre.objects.filter(pk=lg.get("offreId") or 0, boutique=c.boutique).first()
        if o is None:
            continue
        avant = o.stock
        o.stock = 0
        o.save(update_fields=["stock", "maj_le"])
        if o.product_id:
            socle.publier_produit(o)
        socle.journaliser(c, membre, "Stock de l’{p} mis à jour", detail=f"{o.titre} {o.variante}".strip(), avant=str(avant), apres="0")


def _panier_sans(m, sc):
    """Le panier du client sans ce colis (moteur frais) : l'écart REMPL-ECART se compare dans le même panier."""
    from apps.pickup.models import SousCommande
    from belivay_moteurs.frais import Article, Panier
    from belivay_moteurs.frais import SousCommande as ColisMoteur

    autres = []
    for x in SousCommande.objects.filter(order_id=sc.order_id).exclude(pk=sc.pk).exclude(etat="annulee").prefetch_related("lignes"):
        articles = tuple(Article(str(lg.product_id), lg.prix, lg.qte, lg.classe) for lg in x.lignes.all())
        if articles:
            autres.append(ColisMoteur(x.boutique, x.zone, articles))
    return Panier(m.mode, tuple(autres)) if autres else None


def _classe(offre: Offre) -> str:
    from belivay_moteurs.erreurs import PanierInvalide

    try:
        from apps.cart.services import classe_de

        return classe_de(offre.product_id)[0]
    except (ImportError, PanierInvalide):
        return "HG" if offre.colis == "XXL" else offre.colis


RANG_CLASSE = ["S", "M", "L", "XL", "HG"]


def _candidats(c: CommandeVendeur, prix_paye: int) -> dict:
    """Boutiques qui ont TOUS les articles du colis (même fiche, même variante), en vente, en stock, au prix payé
    ou moins : {nom du moteur: (boutique, {offreId d'origine: Offre}, offre du moteur)}."""
    from belivay_moteurs.catalogue import Offre as OffreMoteur

    besoins = []
    for lg in c.lignes:
        o = Offre.objects.filter(pk=lg.get("offreId") or 0).first()
        if o is None or o.fiche_id is None:
            return {}
        besoins.append((lg["offreId"], o.fiche_id, o.variante, int(lg.get("quantite", 1))))
    par_boutique: dict[int, dict] = {}
    qs = Offre.objects.filter(
        fiche_id__in=[x[1] for x in besoins], etat=Offre.Etat.EN_VENTE, product_id__isnull=False, boutique__vendor_id__isnull=False
    )
    for o in qs.exclude(boutique=c.boutique).filter(boutique__suspendue_depuis__isnull=True).select_related("boutique"):
        par_boutique.setdefault(o.boutique_id, {"boutique": o.boutique, "offres": []})["offres"].append(o)
    sortie = {}
    for x in par_boutique.values():
        b2, choisies = x["boutique"], {}
        for offre_id, fiche_id, variante, qte in besoins:
            o = next((o for o in x["offres"] if o.fiche_id == fiche_id and o.variante == variante and o.stock >= qte and o.prix), None)
            if o is None:
                break
            choisies[offre_id] = (o, qte)
        else:
            prix = sum(o.prix * q for o, q in choisies.values())
            profil = pont.boutique(b2.vendor_id)
            if profil is None or prix > prix_paye:
                continue
            classe = max((_classe(o) for o, _ in choisies.values()), key=RANG_CLASSE.index)
            om = OffreMoteur(profil.nom, profil.zone, prix, classe, int(b2.trust_score), 1, socle.etat_boutique(b2) != "ouverte")
            sortie[profil.nom] = (b2, {k: o for k, (o, _) in choisies.items()}, om)
    return sortie


def _vendeur_suivant(c: CommandeVendeur, sc) -> tuple | None:
    """Vendeur suivant (DP-01, CCY-06) par le moteur : Trust Score ≥ REMPL-TRUST-MIN, coût livré au plus REMPL-ECART
    au-dessus, au plus RUPTURE-TENTATIVES bascules pour ce colis."""
    from apps.client_core.parametres import bascule, livraison
    from apps.pickup.models import MontantsCommande
    from belivay_moteurs.catalogue import Offre as OffreMoteur
    from belivay_moteurs.catalogue import OffreAttribuee, attribuer, vendeur_suivant

    m = MontantsCommande.objects.get(order_id=sc.order_id)
    prix = sum(lg.prix * lg.qte for lg in sc.lignes.all())
    panier = _panier_sans(m, sc)
    pl = livraison()
    offre_payee = OffreMoteur(sc.boutique, sc.zone, prix, sc.classe, int(c.boutique.trust_score), 1)
    payee = attribuer((offre_payee,), panier, 1, m.mode, pl) or OffreAttribuee(offre_payee, prix)
    suivi, _ = BasculeColis.objects.select_for_update().get_or_create(order_id=sc.order_id, n=sc.n)
    essayes = set(suivi.essayes) | {sc.boutique}
    candidats = _candidats(c, prix)
    r = vendeur_suivant(tuple(x[2] for x in candidats.values()), payee, frozenset(essayes), panier, 1, m.mode, pl, bascule())
    if r.offre is not None:
        essayes.add(r.offre.offre.vendeur)
    suivi.essayes, suivi.tentatives = sorted(essayes), r.tentative
    suivi.save()
    return candidats[r.offre.offre.vendeur] if r.offre is not None else None


def _ceder(c: CommandeVendeur, sc, suivant: tuple, membre: Membre) -> CommandeVendeur | None:
    """Le colis passe à l'autre boutique : sous-commande du client (vendeur, articles), commande de cette boutique
    annulée (motif « rupture »), nouvelle commande chez l'autre, délai qui repart de maintenant (heures d'ouverture)."""
    b2, offres, _ = suivant
    t = horloge.maintenant()
    ref0, n0 = ref_affichee(c), c.n
    k = CommandeCedee.objects.filter(commande__order_id=c.order_id).count() + 1
    c.n, c.ref = n0 + 1000 * k, f"{c.ref}~{k}"
    c.annulee_a, c.motif_annulation = t, "rupture"
    c.save(update_fields=["n", "ref", "annulee_a", "motif_annulation"])
    CommandeCedee.objects.create(commande=c, ref=ref0, n=n0, a=t)
    socle.journaliser(c, membre, "Annulée : rupture", detail="Confiée à un autre vendeur ; le client garde son prix")
    profil = pont.boutique(b2.vendor_id)
    sc.vendor_id, sc.boutique, sc.zone = b2.vendor_id, profil.nom, profil.zone
    sc.save(update_fields=["vendor_id", "boutique", "zone"])
    par_produit = {int(lg["productId"]): offres[lg["offreId"]] for lg in c.lignes if lg.get("productId") and lg.get("offreId") in offres}
    for lg in sc.lignes.all():
        o = par_produit.get(lg.product_id)
        if o is not None:
            lg.product_id = o.product_id
            lg.save(update_fields=["product_id"])
    socle.synchroniser(b2)
    nouvelle = CommandeVendeur.objects.filter(boutique=b2, order_id=sc.order_id, n=n0).first()
    if nouvelle is not None:
        cal = calendrier.calendrier(b2)
        debut = calendrier.ouverture_suivante(t, cal)
        delai = timedelta(hours=max([4] + [o.delai_preparation_h for o in offres.values()]))
        nouvelle.debut = debut
        nouvelle.echeance = calendrier.ajouter_ouvertes(debut, delai, cal)
        nouvelle.echeance_absolue = calendrier.ajouter_ouvertes(debut, max(24 * H, delai), cal)
        p = calendrier.passage_suivant(nouvelle.echeance, cal)
        nouvelle.ramassage_debut, nouvelle.ramassage_fin = (p[0], p[1]) if p[0] != p[1] else (None, None)
        nouvelle.save(update_fields=["debut", "echeance", "echeance_absolue", "ramassage_debut", "ramassage_fin"])
        socle.journaliser(
            nouvelle, None, "Entrée dans la file à préparer", detail="Système BelivaY · prête avant {h}", detail_a=nouvelle.echeance
        )
    return nouvelle


def signaler_rupture(b: Boutique, membre: Membre, ref: str, stock_a_zero: bool) -> dict:
    """Rupture (remplace l'annulation, DP-01, VD05-R12) : vendeur suivant, sinon annulation et remboursement intégral
    du colis ; stock de la variante à 0 si demandé ; journal et notification."""
    with transaction.atomic():
        c = trouver(b, ref, verrou=True)
        if c is None:
            return {"ok": False, "raison": "introuvable"}
        if c.annulee_a is not None or c.prete_a is not None:
            return {"ok": False, "raison": "deja_prete"}
        socle.journaliser(c, membre, "Rupture signalée", detail="Vendeur suivant ou remboursement du client")
        if stock_a_zero:
            _stock_a_zero(c, membre)
        c.ruptures += 1
        c.save(update_fields=["ruptures"])
        sc = socle.sous_commande(c)
        suivant = _vendeur_suivant(c, sc) if sc is not None and sc.vendor_id == b.vendor_id else None
        ref0 = ref_affichee(c)
        if suivant is not None:
            _ceder(c, sc, suivant, membre)
            _notifier_client(c, "Ta commande continue", f"{ref0} : une autre boutique prépare ton article, au même prix.")
        else:
            _annuler(c, "rupture", "Annulée : rupture", membre, detail_="Aucun vendeur suivant : client remboursé")
            if sc is not None and sc.etat != "annulee":
                _rembourser_colis(sc, "Rupture de stock chez le vendeur")
                _notifier_client(c, "Article en rupture", f"{ref0} : la boutique n'a plus l'article. Tu es remboursé aujourd'hui.")
    socle.notifier(b, "stock", "Rupture enregistrée", f"{ref0} : la commande quitte votre file.", f"commande?ref={ref0}")
    return {"ok": True}


def options_delai(b: Boutique, ref: str) -> dict:
    """OptionsDelai : + 1 h, + 2 h, demain à l'ouverture (heures d'ouverture), effet sur le ramassage (P-6)."""
    c = trouver(b, ref)
    if c is None:
        raise introuvable("Commande introuvable.")
    return _options(c, b)


def _options(c: CommandeVendeur, b: Boutique) -> dict:
    echeance = c.echeance or c.payee_a
    absolue = c.echeance_absolue or echeance
    prevu, options = calendrier.options_de_delai(echeance, absolue, calendrier.calendrier(b))
    return {
        "ref": ref_affichee(c),
        "echeance": ms(echeance),
        "absolue": ms(absolue),
        "prolongee": c.prolongee,
        "aPreparer": c.prete_a is None and c.annulee_a is None,
        "ramassage": _slot(*prevu),
        "options": [
            {
                "choix": o["choix"],
                "echeance": ms(o["echeance"]),
                "possible": o["possible"],
                "ramassage": _slot(*o["ramassage"]),
                "effet": o["effet"],
                "_e": o["echeance"],
                "_r": o["ramassage"],
            }
            for o in options
        ],
    }


def sans_internes(o: dict) -> dict:
    return {**o, "options": [{k: v for k, v in x.items() if not k.startswith("_")} for x in o["options"]]}


def demander_delai(b: Boutique, membre: Membre, ref: str, choix: str) -> dict:
    """Plus de temps : une fois, jamais au-delà de l'échéance absolue (DEL-01…03) ; le ramassage suit (P-6)."""
    with transaction.atomic():
        c = trouver(b, ref, verrou=True)
        if c is None:
            return {"ok": False, "raison": "introuvable"}
        o = _options(c, b)
        if not o["aPreparer"]:
            return {"ok": False, "raison": "deja_prete"}
        if c.prolongee:
            return {"ok": False, "raison": "deja_prolongee"}
        x = next(y for y in o["options"] if y["choix"] == choix)
        if not x["possible"]:
            return {"ok": False, "raison": "au_dela_de_24h"}
        avant = c.echeance
        c.echeance, c.prolongee = x["_e"], True
        if x["_r"][0] != x["_r"][1]:
            c.ramassage_debut, c.ramassage_fin = x["_r"]
        c.save(update_fields=["echeance", "prolongee", "ramassage_debut", "ramassage_fin"])
        socle.journaliser(
            c,
            membre,
            "Plus de temps demandé",
            detail="Ramassage au créneau suivant" if x["effet"] == "suivant" else "Client et livreur prévenus",
            avant=str(ms(avant)),
            apres=str(ms(c.echeance)),
        )
    _notifier_client(
        c, "Ton colis arrive un peu plus tard", f"{ref_affichee(c)} : la boutique a besoin d'un peu plus de temps pour le préparer."
    )
    return {"ok": True, "echeance": ms(c.echeance)}


def bon_json(c: CommandeVendeur, b: Boutique, proprio: bool) -> dict:
    """BonPreparation (BON-01, BON-02) : quatre cases, aucune donnée du client, jamais le code de remise."""
    a_preparer = c.prete_a is None and c.annulee_a is None
    lv = c.livreur
    faits_ = {v.get("cle"): v for v in c.verifications or []}
    return {
        "ref": ref_affichee(c),
        "colis": c.colis,
        "payeeA": ms(c.payee_a),
        "payableAuRetrait": c.payable_au_retrait,
        "echeance": ms(c.echeance) if a_preparer else None,
        "lignes": [
            {
                "titre": lg.get("titre", ""),
                "variante": lg.get("variante", ""),
                "etat": lg.get("etat", "Neuf"),
                "dessin": lg.get("dessin", ""),
                "reference": lg.get("reference", ""),
                "quantite": int(lg.get("quantite", 1)),
                "aMettreDeCote": list(lg.get("aMettreDeCote") or []),
            }
            for lg in c.lignes
        ],
        "aVerifier": [{"cle": k, "fait": bool(faits_.get(k, {}).get("fait")), "par": faits_.get(k, {}).get("par")} for k in VERIFICATIONS],
        "ramassage": (
            {"debut": ms(c.ramassage_debut), "fin": ms(c.ramassage_fin), "livreur": lv.nom, "photo": lv.photo}
            if lv is not None
            and c.ramassage_debut is not None
            and c.ramassage_fin is not None
            and c.annulee_a is None
            and c.remise_a is None
            else None
        ),
        "garde": c.garde if proprio else None,
        "liberationJours": liberation_jours(c, b),
        "aPreparer": a_preparer,
    }


def bon(b: Boutique, proprio: bool, ref: str) -> dict:
    c = trouver(b, ref)
    if c is None:
        raise introuvable("Commande introuvable.")
    return bon_json(c, b, proprio)


def ouvrir_bon(b: Boutique, membre: Membre, ref: str) -> None:
    """« Bon de préparation ouvert » au journal, une fois par membre et par jour (heure de Yaoundé)."""
    c = trouver(b, ref)
    if c is None:
        raise introuvable("Commande introuvable.")
    j = horloge.aujourd_hui()
    debut = datetime(j.year, j.month, j.day, tzinfo=YAOUNDE)
    deja = c.journal.filter(
        action="Bon de préparation ouvert", auteur=membre.signature, a__gte=debut, a__lt=debut + timedelta(days=1)
    ).exists()
    if not deja:
        socle.journaliser(c, membre, "Bon de préparation ouvert")


def _cocher(c: CommandeVendeur, membre: Membre, i: int, fait: bool) -> None:
    v = {x.get("cle"): x for x in c.verifications or []}
    cle = VERIFICATIONS[i]
    v[cle] = {"cle": cle, "fait": fait, "par": membre.signature if fait else None}
    c.verifications = [v.get(k, {"cle": k, "fait": False, "par": None}) for k in VERIFICATIONS]
    c.save(update_fields=["verifications"])


def cocher(b: Boutique, membre: Membre, proprio: bool, ref: str, i: int, fait: bool) -> dict:
    with transaction.atomic():
        c = trouver(b, ref, verrou=True)
        if c is None:
            raise introuvable("Commande introuvable.")
        if 0 <= i < len(VERIFICATIONS):
            _cocher(c, membre, i, fait)
    return bon_json(c, b, proprio)


def _net(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", s.upper())


def verifier_reference(b: Boutique, membre: Membre, proprio: bool, ref: str, lu: str) -> dict:
    """Référence scannée ou tapée (SKU de la boîte) : la bonne coche « Bon modèle et bonne couleur »."""
    with transaction.atomic():
        c = trouver(b, ref, verrou=True)
        if c is None:
            return {"ok": False, "raison": "introuvable"}
        attendues = [lg.get("reference", "") for lg in c.lignes if lg.get("reference")]
        bonne = next((r for r in attendues if _net(r) == _net(lu)), None)
        if bonne is None:
            return {"ok": False, "raison": "autre_reference", "detail": attendues[0] if attendues else ""}
        _cocher(c, membre, 0, True)
        socle.journaliser(c, membre, "Référence vérifiée", detail=bonne)
    return {"ok": True, "bon": bon_json(c, b, proprio)}


# ── Remise au livreur (VD-06) ─────────────────────────────────────────────────────────────────────────


def etape(c: CommandeVendeur) -> str:
    if c.annulee_a is not None:
        return "annulee"
    if c.prete_a is None:
        return "a_preparer"
    return "prete" if c.remise_a is None else "remise"


def _bloque(c: CommandeVendeur, t: datetime) -> bool:
    return etape(c) == "prete" and c.bloque_jusqua is not None and c.bloque_jusqua > t


def remise_json(c: CommandeVendeur, b: Boutique, proprio: bool, t: datetime, cal: dict) -> dict:
    """Remise (SANS le code) : livreur du créneau, essais, blocage, livreur absent, plafond de valeur, suite."""
    e = etape(c)
    bloque = _bloque(c, t)
    requis = niveau_requis(c.prix)
    lv = c.livreur
    manque, livreur = None, None
    if e in ("a_preparer", "prete") and lv is not None:
        debut, fin = c.ramassage_debut, c.ramassage_fin
        if debut is None:
            debut, fin = calendrier.passage_suivant(c.prete_a or c.echeance or t, cal)
        if bloque:
            debut, fin = calendrier.passage_suivant(c.bloque_jusqua, cal)
        elif e == "prete" and fin <= t:
            manque = {"debut": ms(debut), "fin": ms(fin)}  # créneau passé sans remise : livreur absent (E9)
            debut, fin = calendrier.passage_suivant(t, cal)
        elif e == "prete" and c.creneau_manque:
            manque = c.creneau_manque
        if debut != fin:
            livreur = {
                "nom": lv.nom,
                "societe": lv.societe,
                "creneau": [_hm(debut), _hm(fin)],
                "photo": lv.photo,
                "debut": ms(debut),
                "fin": ms(fin),
                "niveau": lv.niveau,
            }
    elif e == "remise" and lv is not None:
        livreur = {
            "nom": lv.nom,
            "societe": lv.societe,
            "creneau": [_hm(c.remise_a), _hm(c.remise_a)],
            "photo": lv.photo,
            "debut": ms(c.remise_a),
            "fin": ms(c.remise_a),
            "niveau": lv.niveau,
        }
    if e == "annulee":
        erreur = "annulee" if c.motif_annulation == "client_avant_ramassage" else None
    elif bloque:
        erreur = "bloque"
    elif e == "prete" and manque:
        erreur = "absent"
    elif e == "a_preparer" and c.echeance is not None and t > c.echeance:
        erreur = "depasse"
    elif e in ("a_preparer", "prete") and lv is not None and RANG_NIVEAU.get(lv.niveau, 0) < RANG_NIVEAU[requis]:
        erreur = "plafond"
    else:
        erreur = None
    essais, heures = essais_et_blocage()
    lg0 = c.lignes[0] if c.lignes else {}
    lit = parametres.litiges()
    autres = []
    if e == "prete" and lv is not None:
        autres = [
            ref_affichee(x)
            for x in commandes_de(b)
            .filter(prete_a__isnull=False, remise_a__isnull=True, annulee_a__isnull=True, livreur=lv)
            .exclude(pk=c.pk)
        ]
    return {
        "ref": ref_affichee(c),
        "article": socle.article_vendu(lg0),
        "quantite": sum(int(lg.get("quantite", 1)) for lg in c.lignes),
        "colis": c.colis,
        "payableAuRetrait": c.payable_au_retrait,
        "etape": e,
        "echeance": ms(c.echeance) if e == "a_preparer" else None,
        "preteA": ms(c.prete_a),
        "livreur": livreur,
        "essaisFaux": 0 if (c.bloque_jusqua is not None and not bloque) else c.essais_faux,
        "essaisMax": essais,
        "blocageHeures": heures,
        "bloqueJusqua": ms(c.bloque_jusqua) if bloque else None,
        "nouveauCodeDemande": bloque and c.nouveau_code_demande,
        "remiseA": ms(c.remise_a),
        "photos": list(c.photos_remise or []),
        "erreur": erreur,
        "creneauManque": manque if e == "prete" else None,
        "valeurColis": c.prix if proprio else None,
        "niveauRequis": requis,
        "plafonds": plafonds(),
        "fileHeures": file_heures(),
        "garde": c.garde if proprio else None,
        "suite": (
            {
                "palier": b.palier,
                "liberationJours": liberation_jours(c, b),
                "confirmationJours": lit.fenetre_retour_jours,
                "numero": socle.numero_en_mots(b),
            }
            if proprio
            else None
        ),
        "autresPourCeLivreur": autres,
    }


def remise(b: Boutique, proprio: bool, ref: str) -> dict:
    preparer_lecture(b)
    c = trouver(b, ref)
    if c is None:
        raise introuvable("Commande introuvable.")
    return remise_json(c, b, proprio, horloge.maintenant(), calendrier.calendrier(b))


def remises(b: Boutique, proprio: bool, a_remettre: bool) -> list[dict]:
    preparer_lecture(b)
    t, cal = horloge.maintenant(), calendrier.calendrier(b)
    qs = commandes_de(b).order_by("-payee_a", "-id")
    if a_remettre:
        qs = qs.filter(prete_a__isnull=False, remise_a__isnull=True, annulee_a__isnull=True)
    return [remise_json(c, b, proprio, t, cal) for c in qs]


def ramassages(b: Boutique, proprio: bool, de: datetime | None, a: datetime | None) -> list[dict]:
    """Calendrier des passages du livreur (AJ-B Ramassages) : remises dont le créneau, l'échéance ou la remise tombe
    dans la période (sans relire toutes les remises)."""
    preparer_lecture(b)
    t, cal = horloge.maintenant(), calendrier.calendrier(b)
    qs = commandes_de(b).filter(annulee_a__isnull=True)
    if de is not None and a is not None:
        qs = qs.filter(
            Q(ramassage_debut__gte=de, ramassage_debut__lt=a)
            | Q(remise_a__gte=de, remise_a__lt=a)
            | Q(remise_a__isnull=True, echeance__gte=de, echeance__lt=a)
        )
    return [remise_json(c, b, proprio, t, cal) for c in qs.order_by("ramassage_debut", "echeance", "id")]


RAISONS_NON_PRET = ("en_cours", "rupture", "boutique_fermee")


def colis_non_pret(b: Boutique, membre: Membre, ref: str, raison: str) -> dict:
    """Colis pas prêt au passage du livreur (INTERFACES.md, P-6) : le ramassage passe au créneau suivant ; le livreur
    est prévenu. L'échéance de préparation ne bouge pas (une rupture se signale par « Rupture »)."""
    if raison not in RAISONS_NON_PRET:
        raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "raison : en_cours, rupture ou boutique_fermee.")
    with transaction.atomic():
        c = trouver(b, ref, verrou=True)
        if c is None:
            raise introuvable("Commande introuvable.")
        if c.remise_a is not None or c.annulee_a is not None:
            return {"ok": False, "raison": "etat"}
        cal = calendrier.calendrier(b)
        t = horloge.maintenant()
        depuis = max(c.ramassage_fin or t, t)
        debut, fin = calendrier.passage_suivant(depuis, cal)
        prochain = debut != fin
        if prochain:
            c.ramassage_debut, c.ramassage_fin = debut, fin
            c.save(update_fields=["ramassage_debut", "ramassage_fin"])
        texte = {"en_cours": "en cours de préparation", "rupture": "article manquant", "boutique_fermee": "boutique fermée"}[raison]
        socle.journaliser(c, membre, f"Colis pas prêt au passage du livreur ({texte}) : ramassage au créneau suivant")
        echanges.emettre(
            b,
            "sortant",
            "livreur",
            "colis_non_pret",
            "pickup.not_ready",
            {"ref": ref_affichee(c), "raison": raison, "prochainCreneau": prochain},
            "commandes.remettre",
        )
    return {"ok": True, "remise": remise_json(c, b, membre.proprietaire, horloge.maintenant(), cal), "prochainCreneau": prochain}


def afficher_code(b: Boutique, membre: Membre, ref: str) -> dict:
    """Le code au toucher seulement (REM-01), journalisé (handover_code.viewed : auteur, heure)."""
    t = horloge.maintenant()
    with transaction.atomic():
        c = trouver(b, ref, verrou=True)
        if c is None:
            return {"ok": False, "raison": "introuvable"}
        e = etape(c)
        if e == "a_preparer":
            return {"ok": False, "raison": "pas_prete"}
        if e == "annulee":
            return {"ok": False, "raison": "annulee"}
        if e == "remise":
            return {"ok": False, "raison": "remise"}
        if _bloque(c, t):
            return {"ok": False, "raison": "bloquee"}
        if not c.code_chiffre:
            c.code_chiffre = chiffrer(nouveau_code())
        c.code_vu = [*(c.code_vu or []), {"a": ms(t), "par": membre.signature}]
        c.save(update_fields=["code_chiffre", "code_vu"])
        socle.journaliser(c, membre, "Code de remise affiché")
    return {"ok": True, "code": dechiffrer(c.code_chiffre)}


def renouveler_code(b: Boutique, membre: Membre, ref: str) -> dict:
    """Après un blocage : un nouveau code, qui annule l'ancien ; il marche dès le déblocage (DP-56, Q-20)."""
    t = horloge.maintenant()
    with transaction.atomic():
        c = trouver(b, ref, verrou=True)
        if c is None:
            return {"ok": False, "raison": "introuvable"}
        if not _bloque(c, t):
            return {"ok": False, "raison": "pas_bloquee"}
        c.code_chiffre, c.nouveau_code_demande = chiffrer(nouveau_code()), True
        c.save(update_fields=["code_chiffre", "nouveau_code_demande"])
        socle.journaliser(c, membre, "Nouveau code de remise demandé (l’ancien est annulé)")
    return {"ok": True, "marcheA": ms(c.bloque_jusqua)}


def recu_json(c: CommandeVendeur, b: Boutique, t: datetime) -> dict:
    f = lire_faits(c, t)
    a = argent(c, b, f, t)
    return {
        "ref": ref_affichee(c),
        "encaisseA": ms(f.retrait if c.payable_au_retrait else c.payee_a),
        "article": socle.article_vendu(c.lignes[0] if c.lignes else {}),
        "quantite": sum(int(lg.get("quantite", 1)) for lg in c.lignes),
        "colis": c.colis,
        "prix": c.prix,
        "garde": c.garde,
        "moyen": c.moyen,
        "fraisPayesParLeClient": c.moyen in FRAIS_PAYES_PAR_LE_CLIENT,
        "argent": {"etat": a["etat"], "liberation": a["liberation"], "vendredi": a["vendredi"]},
    }


def recu(b: Boutique, proprio: bool, ref: str) -> dict:
    """Reçu vendeur (RCU-01…04), propriétaire seulement ; 404 pour une commande inconnue ou annulée."""
    if not proprio:
        raise refus_proprietaire()
    preparer_lecture(b)
    c = trouver(b, ref)
    if c is None or c.annulee_a is not None:
        raise introuvable("Pas de reçu pour cette commande.")
    return recu_json(c, b, horloge.maintenant())


def recus(b: Boutique, proprio: bool) -> list[dict]:
    if not proprio:
        raise refus_proprietaire()
    preparer_lecture(b)
    t = horloge.maintenant()
    out = []
    for c in commandes_de(b).filter(annulee_a__isnull=True):
        r = recu_json(c, b, t)
        if r["encaisseA"] is not None:
            a = r["article"]
            out.append(
                {
                    "ref": r["ref"],
                    "encaisseA": r["encaisseA"],
                    "titre": f"{a['titre']} · {a['variante']}" if a["variante"] else a["titre"],
                    "dessin": a["dessin"],
                    "prix": r["prix"],
                    "garde": r["garde"],
                }
            )
    return sorted(out, key=lambda x: -x["encaisseA"])


# ── Ce que font l'application du livreur et le client (routes d'essai du coordinateur) ─────────────────


def _commande_globale(ref: str, verrou: bool = True) -> CommandeVendeur | None:
    qs = CommandeVendeur.objects.filter(ref=str(ref).upper())
    return (qs.select_for_update() if verrou else qs).select_related("boutique", "livreur").first()


def saisie_livreur(ref: str, code: str, photos: list[dict] | None = None) -> dict:
    """L'application du livreur envoie le code saisi : trois codes faux ⇒ remise bloquée 24 h (CODE-ESSAIS) ; au bon
    code (handover.completed) : remise, deux photos versées au dossier, colis du client « collecté », journal."""
    t = horloge.maintenant()
    essais, heures = essais_et_blocage()
    with transaction.atomic():
        c = _commande_globale(ref)
        if c is None or etape(c) != "prete":
            return {"ok": False, "essaisRestants": 0, "bloqueJusqua": None}
        if _bloque(c, t):
            return {"ok": False, "essaisRestants": 0, "bloqueJusqua": ms(c.bloque_jusqua)}
        if c.bloque_jusqua is not None:  # déblocage passé : les essais repartent de zéro
            c.bloque_jusqua, c.essais_faux, c.nouveau_code_demande = None, 0, False
        b = c.boutique
        if not c.code_chiffre or str(code).strip() != dechiffrer(c.code_chiffre):
            c.essais_faux += 1
            if c.essais_faux >= essais:
                c.bloque_jusqua = t + timedelta(hours=heures)
            c.save(update_fields=["essais_faux", "bloque_jusqua", "nouveau_code_demande"])
            socle.journaliser(c, None, f"Code faux saisi par le livreur ({c.essais_faux}/{essais})")
            echanges.emettre(
                b,
                "entrant",
                "livreur",
                "code_saisi",
                "handover.code_entered",
                {"ref": ref_affichee(c), "bon": False, "essaisRestants": max(0, essais - c.essais_faux)},
                "commandes.remettre",
            )
            if c.bloque_jusqua is not None:
                socle.notifier(
                    b,
                    "preparer",
                    "Remise bloquée 24 h",
                    f"{ref_affichee(c)} : trois codes faux. Demandez un nouveau code.",
                    f"remise?ref={ref_affichee(c)}",
                    urgent=True,
                )
            return {"ok": False, "essaisRestants": max(0, essais - c.essais_faux), "bloqueJusqua": ms(c.bloque_jusqua)}
        lieu = (b.quartier.split(" / ")[-1] if b.quartier else b.zone) or ""
        c.remise_a = t
        c.photos_remise = photos or [
            {"type": "decouvert", "image": PHOTO_DECOUVERT, "a": ms(t - timedelta(minutes=1)), "lieu": lieu},
            {"type": "scelle", "image": PHOTO_SCELLE, "a": ms(t), "lieu": lieu},
        ]
        c.save(update_fields=["remise_a", "photos_remise", "essais_faux", "bloque_jusqua", "nouveau_code_demande"])
        lv = c.livreur
        qui = lv.nom if lv else "le livreur"
        socle.journaliser(
            c,
            None,
            f"Remis à {qui} (code saisi par le livreur) · responsabilité passée à {lv.societe if lv else 'la société de livraison'}",
        )
        socle.avancer_colis(c, "parcel.collected")
        echanges.emettre(
            b,
            "entrant",
            "livreur",
            "remise_faite",
            "handover.done",
            {"ref": ref_affichee(c), "photos": len(c.photos_remise), "scelle": True},
            "commandes.voir",
        )
    socle.notifier(b, "preparer", "Colis remis au livreur", f"{ref_affichee(c)} : remis à {qui}.", f"remise?ref={ref_affichee(c)}")
    return {"ok": True, "essaisRestants": essais, "bloqueJusqua": None}


def livreur_absent(ref: str) -> None:
    """Le livreur a manqué son créneau (E9) : le délai est suspendu jusqu'au créneau suivant (DP-57, P-7)."""
    with transaction.atomic():
        c = _commande_globale(ref)
        if c is None or etape(c) != "prete":
            return
        cal = calendrier.calendrier(c.boutique)
        debut, fin = (c.ramassage_debut, c.ramassage_fin) if c.ramassage_debut else calendrier.passage_suivant(c.prete_a, cal)
        c.creneau_manque = {"debut": ms(debut), "fin": ms(fin)}
        suivant = calendrier.passage_suivant(max(fin, horloge.maintenant()), cal)
        if suivant[0] != suivant[1]:
            c.ramassage_debut, c.ramassage_fin = suivant
        c.save(update_fields=["creneau_manque", "ramassage_debut", "ramassage_fin"])
        qui = c.livreur.nom if c.livreur else "Le livreur"
        socle.journaliser(c, None, f"{qui} n’est pas passé : délai suspendu jusqu’au créneau suivant")
        echanges.emettre(
            c.boutique,
            "entrant",
            "livreur",
            "absent",
            "pickup.missed",
            {
                "ref": ref_affichee(c),
                "prochainCreneau": {"debut": ms(c.ramassage_debut), "fin": ms(c.ramassage_fin)} if c.ramassage_debut else None,
            },
            "commandes.remettre",
        )
    socle.notifier(
        c.boutique,
        "preparer",
        "Livreur absent",
        f"{ref_affichee(c)} : le livreur passera au créneau suivant.",
        f"remise?ref={ref_affichee(c)}",
    )


def annulation_client(ref: str) -> None:
    """Le client annule son colis avant le ramassage (route d'annulation du kit client) : remboursement par
    pickup.services.annuler_colis ; la commande du vendeur est annulée et le stock réservé rendu (VD06-R20)."""
    from apps.pickup.models import MontantsCommande
    from apps.pickup.services import annuler_colis

    c = _commande_globale(ref, verrou=False)
    if c is None or etape(c) not in ("a_preparer", "prete"):
        return
    m = MontantsCommande.objects.get(order_id=c.order_id)
    annuler_colis(f"{c.order_id}-{c.n}", m.client, "Annulée avant le ramassage")
    constater_annulations(c.boutique)
