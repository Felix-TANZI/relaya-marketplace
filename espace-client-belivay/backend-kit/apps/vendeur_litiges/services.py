# backend/apps/vendeur_litiges/services.py
# Litiges et retours de la boutique (VD-07). Les dossiers sont ceux que le CLIENT ouvre (apps.aftersales) ; ce module
# les lit pour la boutique et y ajoute ce que le vendeur fait : preuves, brouillon, réponse du propriétaire, recours,
# réception et inspection du retour, choix remplacer / rembourser, remplacement prêt.
#
# Lien commande ↔ dossier : aftersales.Litige.order_id + colis = vendeur_core.CommandeVendeur.order_id + n.
# Calculs et transitions : TOUJOURS par les moteurs (belivay_moteurs.litiges : echeances, recours_possible,
# fin_du_gel, fin_inspection, echeance_remplacement, voie_de_retour ; versements : libération ; machines LITIGE,
# RETOUR, REMPLACEMENT, SOUS_COMMANDE), avec le registre (apps.vendeur_core.parametres). Heure : vendeur_core.horloge.
#
# Voies : un dossier est un LITIGE pour la boutique (48 h pour répondre, médiation, décision, recours) ; il devient un
# RETOUR quand BelivaY accepte le retour d'un motif recevable (accepter_retour : « POST /returns : retour accepté après
# décision ») : la boutique ne répond pas, elle reçoit l'article, l'inspecte (la réponse du vendeur, c'est le
# verdict), puis choisit remplacer ou rembourser (défaut confirmé) ; non conforme : médiation (L-4).
#
# Exposé aux autres applications :
#   en_cours(boutique) -> {"litiges": [{ref, echeance, motif, gele}], "retours": [{ref, article, motif, arrivee, gele}]}
# Fonctions de la console et des routes d'essai (livreur, relais, médiation BelivaY) :
#   accepter_retour(ref, categorie=None) -> dict        BelivaY accepte le retour (motif recevable, RET-01, RET-02)
#   decider(ref, issue, motif, grave=False) -> dict      décision humaine motivée : « gagne » (le vendeur) | « perdu »
#   avancer_retour(ref, evenement) -> dict               return.deposited (relais), return.collected (livreur),
#                                                        return.received (remise au vendeur), inspection.expired
#   avancer_remplacement(ref, evenement) -> dict         replacement.collected (livreur), parcel.handed (relais),
#                                                        replacement.late
#   traiter_retards() -> int                             tâche planifiée : inspection et remplacement en retard
import logging
from datetime import timedelta

from django.db import transaction

from apps.aftersales import services as apres_vente
from apps.aftersales.models import Litige, PreuveLitige, Remplacement, Retour
from apps.client_core import pont
from apps.client_core.erreurs import conflit, introuvable, refus
from apps.client_core.temps import YAOUNDE, ms
from apps.messaging.photos import adresse, lire_photo
from apps.pickup.models import MontantsCommande, SousCommande
from apps.vendeur_core import calendrier, horloge, parametres
from apps.vendeur_core import services as socle
from apps.vendeur_core.models import Boutique, CommandeVendeur, Membre, Offre
from belivay_moteurs import litiges as moteur
from belivay_moteurs import versements as moteur_versements
from belivay_moteurs.etats import LITIGE, REMPLACEMENT, RETOUR, SOUS_COMMANDE

from .models import BrouillonReponse, Dossier, EvenementDossier, PieceVendeur

logger = logging.getLogger("apps.vendeur_litiges")

MEDIATION = "Médiation BelivaY"
# PARAMÈTRE À AJOUTER AU REGISTRE : INSPECTION_PHOTOS_MIN (paquet vendeur, VD-07 INP-01 : « 2 photos »)
INSPECTION_PHOTOS_MIN = 2

E = Litige.Etat
I = Litige.Issue  # noqa: E741
CAT = Dossier.Categorie

# Motif du client (aftersales.Litige.pb) → ce que lit le vendeur (DP-56 Q-29 : les motifs du client font foi).
MOTIFS_VENDEUR = {
    "jamais": "Colis jamais reçu",
    "abime": "Colis abîmé",
    "pas-commande": "Ce n’est pas le bon produit",
    "manque": "Il manque quelque chose",
    "autre": "Autre problème",
}
# Table de correspondance des motifs (Q-29) : cinq motifs du client → quatre catégories vendeur (RET-01).
CATEGORIES = {
    "jamais": CAT.NON_CONFORME,
    "abime": CAT.ABIME,
    "pas-commande": CAT.NON_CONFORME,
    "manque": CAT.NON_CONFORME,
    "autre": CAT.DEFAUT_CACHE,
}
MOTS_CATEGORIE = {c.value: c.label for c in CAT}
MOTIF_MOTEUR = {
    CAT.NON_CONFORME: moteur.Motif.NON_CONFORME,
    CAT.ABIME: moteur.Motif.ABIME,
    CAT.CONTREFACON: moteur.Motif.CONTREFACON,
    CAT.DEFAUT_CACHE: moteur.Motif.DEFAUT_CACHE,
}
ATTENTES = {"rembourse": "remboursement", "remplace": "remplacement", "signal": "signal"}
VIDE = {"scelle": False, "serie": False}


def _p():
    return parametres.litiges()


def regles() -> dict:
    """ReglesLitiges du site : délais et seuils lus au registre (aucun n'est écrit dans un écran)."""
    p = _p()
    return {
        "reponseH": p.vendeur_heures,
        "decisionH": p.decision_heures,
        "recoursH": p.recours_heures,
        "arrangementMin": parametres.nombres("LIT-ARRANG-MIN")[0],
        "arrangementReponseJ": p.arrangement_jours,
        "brouillonH": parametres.nombres("LIT-BROUILLON-H")[0],
        "seuilStandard": p.auto_standard,
        "seuilEleve": p.auto_eleve,
        "trajet": p.trajet_retour,
        "remplacementH": p.remplacement_heures_ouvrees,
        "viceJ": p.vice_cache_jours,
        "defautH": p.defaut_cache_heures,
        "fenetreJ": p.fenetre_retour_jours,
        "inspectionH": p.inspection_heures,
    }


# ── Dossiers de la boutique ─────────────────────────────────────────────────────────────────────────────


def _dossier(lit: Litige, c: CommandeVendeur) -> Dossier:
    d = Dossier.objects.filter(litige=lit).first()
    if d is None:
        d, _ = Dossier.objects.get_or_create(
            litige=lit,
            defaults={
                "boutique": c.boutique,
                "commande": c,
                "categorie": CATEGORIES.get(lit.pb, CAT.NON_CONFORME),
                "cree_le": lit.ouvert_le,
            },
        )
    return d


def dossiers(b: Boutique, voie: str | None = None) -> list[Dossier]:
    """Dossiers des colis de la boutique (litiges retirés par le client et remboursements immédiats exclus : I-1)."""
    socle.synchroniser(b)
    commandes = {(c.order_id, c.n): c for c in CommandeVendeur.objects.filter(boutique=b)}
    if not commandes:
        return []
    rendu = []
    qs = Litige.objects.filter(order_id__in={k[0] for k in commandes}, retire_le__isnull=True).exclude(etat=E.REMBOURSE_AUTO)
    for lit in qs.order_by("ouvert_le", "pk"):
        c = commandes.get((lit.order_id, lit.colis))
        if c is None:
            continue
        d = _dossier(lit, c)
        if voie is None or d.voie == voie:
            rendu.append(d)
    return rendu


def dossier(b: Boutique, ref: str, voie: str, verrou: bool = False) -> Dossier | None:
    c = socle.commande(b, ref)
    if c is None:
        return None
    lit = (
        Litige.objects.filter(order_id=c.order_id, colis=c.n, retire_le__isnull=True).exclude(etat=E.REMBOURSE_AUTO).order_by("-pk").first()
    )
    if lit is None:
        return None
    d = _dossier(lit, c)
    if d.voie != voie:
        return None
    if verrou:
        d = Dossier.objects.select_for_update().select_related("litige", "commande").get(pk=d.pk)
    return d


def _dossier_par_ref(ref: str) -> Dossier:
    """Console et routes d'essai : le dossier d'une commande vendeur (« BLV-260905 »), quelle que soit la boutique."""
    c = CommandeVendeur.objects.select_related("boutique").filter(ref=str(ref).upper()).first()
    if c is None:
        raise introuvable("Commande inconnue.")
    lit = Litige.objects.filter(order_id=c.order_id, colis=c.n, retire_le__isnull=True).order_by("-pk").first()
    if lit is None:
        raise introuvable("Aucun dossier sur cette commande.")
    return _dossier(lit, c)


def _noter(d: Dossier, code: str, auteur: str = "", detail: str = "", a=None) -> None:
    EvenementDossier.objects.create(dossier=d, a=a or horloge.maintenant(), code=code, auteur=auteur, detail=detail)


def _photo(f) -> str:
    """Adresse d'une photo ; un nom sans dossier est une illustration nommée (démonstration : counter, box…)."""
    nom = getattr(f, "name", "") or ""
    return nom if nom and "/" not in nom else (adresse(f) or "")


def _instant(x):
    """Instant d'une photo de remise (ms, ISO ou datetime) → ms."""
    from datetime import datetime

    if isinstance(x, (int, float)):
        return int(x)
    if isinstance(x, str):
        try:
            return ms(datetime.fromisoformat(x))
        except ValueError:
            return None
    return ms(x) if x else None


def _piece(pv: PieceVendeur, retirable: bool) -> dict:
    return {"id": pv.ident, "photo": _photo(pv.photo), "quoi": "vendeur", "a": ms(pv.a), "ajouteePar": pv.par, "retirable": retirable}


def _article(c: CommandeVendeur) -> dict:
    return socle.article_vendu(c.lignes[0] if c.lignes else {})


def _sc(lit: Litige) -> SousCommande | None:
    return SousCommande.objects.filter(order_id=lit.order_id, n=lit.colis).first()


def livraison_du_colis(lit: Litige) -> int:
    """Part de livraison du colis remboursée si le vendeur est en tort : F(commande) − F(commande sans ce colis), Off
    du paiement conservé (CAL-24, CAL-10). Même calcul que l'annulation d'un colis (apps.pickup.services.annuler_colis,
    vendeur_commandes._rembourser_colis) : moteur belivay_moteurs.annulation.annuler (part « livraison »), panier
    recomposé par apps.pickup.services._panier_moteur avec les colis non annulés de la commande."""
    from apps.client_core.parametres import livraison
    from apps.pickup.services import _panier_moteur
    from belivay_moteurs.annulation import annuler

    sc = _sc(lit)
    m = MontantsCommande.objects.filter(order_id=lit.order_id).first()
    if sc is None or m is None:
        return 0
    colis = [
        x
        for x in SousCommande.objects.filter(order_id=m.order_id).prefetch_related("lignes").order_by("n")
        if x.pk == sc.pk or x.etat != SousCommande.Etat.ANNULEE
    ]
    panier = _panier_moteur(m, colis)
    if panier is None or not any(x.boutique == sc.boutique for x in panier.sous_commandes):
        return 0
    return annuler(panier, sc.boutique, livraison(), m.offert, collectee=False).livraison


# ── Le litige vu par la boutique (Litige, src/donnees/domaines/litiges.ts) ──────────────────────────────


def _decision(d: Dossier, lit: Litige, proprio: bool) -> dict | None:
    if lit.decision_le is None or d.posture == "accepte":
        return None
    gagne = lit.issue == I.REFUSE
    a, motif = lit.decision_le, lit.decision_motif
    if d.recours_decide_a:  # décision sur le recours du vendeur (une autre personne)
        gagne, a, motif = d.recours_issue == "gagne", d.recours_decide_a, d.recours_motif
    liberation = versement = vers = None
    if gagne and proprio:
        c = d.commande
        p = _p()
        pv = parametres.versements()
        sc = _sc(lit)
        m = MontantsCommande.objects.filter(order_id=lit.order_id).first()
        retrait = (sc.remise_le if sc else None) or lit.ouvert_le
        fermeture = moteur_versements.fermeture_du_retour(retrait, m.tout_en_ordre_le if m else None, pv)
        prevue = moteur_versements.date_de_liberation(fermeture, c.palier, c.moyen == "carte", pv)
        fin = moteur.fin_du_gel(lit.decision_le, lit.recours_le, None, p)
        if fin is not None:
            lib = moteur_versements.liberation_apres_litige(prevue, fin)
            liberation, versement = ms(lib), moteur_versements.vendredi_de_versement(lib, pv).isoformat()
        vers = socle.numero_en_mots(d.boutique) or None
    return {
        "a": ms(a),
        "issue": "gagne" if gagne else "perdu",
        "motif": motif,
        "par": MEDIATION,
        "effetScore": "aucun" if gagne else ("g3" if d.faute_grave else "g1"),
        "liberation": liberation,
        "versement": versement,
        "versementVers": vers,
    }


def vue_litige(d: Dossier, proprio: bool, t=None) -> dict:
    t = t or horloge.maintenant()
    p = _p()
    lit, c = d.litige, d.commande
    decision = _decision(d, lit, proprio)
    reponse = None
    if d.posture:
        reponse = {
            "posture": d.posture,
            "arrangement": d.arrangement or None,
            "texte": d.reponse_texte,
            "envoyeeA": ms(d.reponse_a),
            "par": d.reponse_par,
        }
    issue = "accepte" if d.posture == "accepte" else (decision["issue"] if decision else "attente")
    jusqua = lit.decision_le + timedelta(hours=p.recours_heures) if lit.decision_le and decision else None
    if issue == "accepte":
        etat = "clos"
    elif decision:
        recours_en_attente = (d.recours_a and not d.recours_decide_a) or (lit.recours_le is not None and lit.etat == E.EN_EXAMEN)
        etat = "en_mediation" if recours_en_attente or (not d.recours_decide_a and t <= jusqua) else "clos"
    elif reponse or t > lit.echeance_vendeur or lit.etat != E.ATTENTE_VENDEUR:
        etat = "en_mediation"
    else:
        etat = "a_repondre"

    preuves_kit = list(lit.preuves.all())
    photos_client = [
        {
            "id": f"C{x.pk}",
            "photo": _photo(x.photo),
            "quoi": "comptoir" if x.source == PreuveLitige.Source.RELAIS else "client",
            "a": ms(x.ajoutee_le),
            "ajouteePar": None,
            "retirable": False,
        }
        for x in preuves_kit
        if x.source != PreuveLitige.Source.LIVREUR
    ]
    versees = []
    for i, ph in enumerate(c.photos_remise or [], start=1):
        ph = ph if isinstance(ph, dict) else {"image": str(ph)}
        versees.append(
            {
                "id": f"R{i}",
                "photo": ph.get("image") or ph.get("photo") or "",
                "quoi": "scelle" if ph.get("type") == "scelle" else "ramassage",
                "a": _instant(ph.get("a")) or ms(c.remise_a or lit.ouvert_le),
                "ajouteePar": None,
                "retirable": False,
            }
        )
    versees += [
        {"id": f"C{x.pk}", "photo": _photo(x.photo), "quoi": "ramassage", "a": ms(x.ajoutee_le), "ajouteePar": None, "retirable": False}
        for x in preuves_kit
        if x.source == PreuveLitige.Source.LIVREUR
    ]
    ajoutees = [_piece(x, retirable=reponse is None) for x in d.pieces.filter(usage=PieceVendeur.Usage.PREUVE, retiree_a__isnull=True)]

    journal = [
        {"a": ms(lit.ouvert_le), "code": "ouvert", "auteur": None, "detail": MOTIFS_VENDEUR.get(lit.pb, lit.probleme)},
        {"a": ms(lit.ouvert_le), "code": "photos_client", "auteur": None, "detail": str(len(photos_client))},
        {"a": ms(lit.ouvert_le), "code": "preuves_versees", "auteur": None, "detail": str(len(versees))},
    ]
    journal += [{"a": ms(e.a), "code": e.code, "auteur": e.auteur or None, "detail": e.detail or None} for e in d.evenements.all()]
    if not reponse and t > lit.echeance_vendeur:
        journal.append({"a": ms(lit.echeance_vendeur), "code": "echeance", "auteur": None, "detail": None})
    if decision and lit.decision_le:
        journal.append(
            {"a": ms(lit.decision_le), "code": "decision", "auteur": MEDIATION, "detail": "gagne" if lit.issue == I.REFUSE else "perdu"}
        )
    journal.sort(key=lambda x: x["a"])

    brouillon = None
    b = BrouillonReponse.objects.filter(dossier=d).first()
    if b is not None and reponse is None and t - b.garde_a < timedelta(hours=parametres.nombres("LIT-BROUILLON-H")[0]):
        brouillon = {"posture": b.posture, "arrangement": b.arrangement, "texte": b.texte, "gardeA": ms(b.garde_a)}

    ech = lit.echeance_vendeur
    return {
        "ref": c.ref,
        "etat": etat,
        "issue": issue,
        "origine": "comptoir" if lit.origine == Litige.Origine.COMPTOIR else "application",
        "ouvertA": ms(lit.ouvert_le),
        "echeance": ms(ech),
        "decisionAvant": ms(lit.decision_au_plus_tard),
        "motif": MOTIFS_VENDEUR.get(lit.pb, lit.probleme),
        "ceQueDitLeClient": lit.description,
        "attente": ATTENTES.get(lit.souhait, "remboursement"),
        "article": _article(c),
        "photosClient": photos_client,
        "preuves": versees + ajoutees,
        "gele": c.garde if proprio and issue != "accepte" else None,
        "trajetRetour": p.trajet_retour if proprio else None,
        "livraisonRetour": livraison_du_colis(lit) if proprio else None,
        "reponse": reponse,
        "decision": decision,
        "recours": {
            "jusqua": ms(jusqua) if jusqua else None,
            "possible": bool(
                decision
                and decision["issue"] == "perdu"
                and proprio
                and not d.recours_a
                and moteur.recours_possible(lit.decision_le, t, False, p)
            ),
            "deposeA": ms(d.recours_a) if d.recours_a else None,
            "texte": d.recours_texte or None,
        },
        "brouillon": brouillon,
        "journal": journal,
    }


def litiges(b: Boutique, proprio: bool, etat: str | None = None) -> list[dict]:
    t = horloge.maintenant()
    vues = [vue_litige(d, proprio, t) for d in dossiers(b, Dossier.Voie.LITIGE)]
    return sorted([v for v in vues if not etat or v["etat"] == etat], key=lambda v: v["echeance"])


def compteurs_litiges(b: Boutique, proprio: bool) -> dict:
    vues = litiges(b, True)
    n = {k: sum(1 for v in vues if v["etat"] == k) for k in ("a_repondre", "en_mediation", "clos")}
    n["gele"] = sum(v["gele"] or 0 for v in vues if v["etat"] != "clos") if proprio else None
    return n


# ── Gestes de la boutique sur un litige ─────────────────────────────────────────────────────────────────


def ajouter_preuve(b: Boutique, membre: Membre, ref: str, photo) -> dict:
    """Propriétaire ou accès Préparation (Q-17) ; photo prise dans l'application, horodatée par le serveur."""
    fichier = lire_photo(photo, prefixe="litige-vendeur")
    with transaction.atomic():
        d = dossier(b, ref, Dossier.Voie.LITIGE, verrou=True)
        if d is None:
            return {"ok": False, "raison": "introuvable"}
        if vue_litige(d, True)["etat"] == "clos":
            return {"ok": False, "raison": "clos"}
        t = horloge.maintenant()
        pv = PieceVendeur(dossier=d, usage=PieceVendeur.Usage.PREUVE, a=t, par=membre.signature)
        pv.photo = fichier
        pv.save()
        _noter(d, "preuve_ajoutee", membre.signature, a=t)
        socle.journaliser(d.commande, membre, "Preuve ajoutée au litige", a=t)
        return {"ok": True, "piece": _piece(pv, retirable=not d.posture)}


def retirer_preuve(b: Boutique, membre: Membre, ref: str, ident: str) -> dict:
    with transaction.atomic():
        d = dossier(b, ref, Dossier.Voie.LITIGE, verrou=True)
        if d is None:
            return {"ok": False, "raison": "introuvable"}
        if d.posture:
            return {"ok": False, "raison": "deja_repondu"}
        n = str(ident).upper().removeprefix("P")
        pv = d.pieces.filter(pk=int(n), usage=PieceVendeur.Usage.PREUVE, retiree_a__isnull=True).first() if n.isdigit() else None
        if pv is None:
            return {"ok": False, "raison": "introuvable"}
        pv.retiree_a = horloge.maintenant()
        pv.save(update_fields=["retiree_a"])
        _noter(d, "preuve_retiree", membre.signature, a=pv.retiree_a)
        return {"ok": True}


def garder_brouillon(b: Boutique, ref: str, brouillon: dict | None) -> None:
    d = dossier(b, ref, Dossier.Voie.LITIGE)
    if d is None:
        raise introuvable("Ce litige n'existe pas.")
    if brouillon is None:
        BrouillonReponse.objects.filter(dossier=d).delete()
        return
    BrouillonReponse.objects.update_or_create(
        dossier=d,
        defaults={
            "posture": brouillon["posture"],
            "arrangement": brouillon["arrangement"],
            "texte": brouillon.get("texte", ""),
            "garde_a": horloge.maintenant(),
        },
    )


def repondre(b: Boutique, membre: Membre, ref: str, posture: str, texte: str, arrangement: str | None) -> dict:
    """Réponse du propriétaire, une seule fois (REP-02), avant LIT-VENDEUR-H. « J'accepte » clôt (VD07-R13) ;
    conteste et arrangement passent en médiation (machine LITIGE : seller.contested). Branche
    apps.aftersales.services.reponse_du_vendeur."""
    texte = (texte or "").strip()
    with transaction.atomic():
        d = dossier(b, ref, Dossier.Voie.LITIGE, verrou=True)
        if d is None:
            return {"ok": False, "raison": "introuvable"}
        if membre.role != Membre.Role.PROPRIETAIRE:
            return {"ok": False, "raison": "reserve_proprietaire"}
        lit = d.litige
        t = horloge.maintenant()
        if d.posture or lit.reponse_vendeur or lit.etat != E.ATTENTE_VENDEUR:
            return {"ok": False, "raison": "deja_repondu"}
        if t > lit.echeance_vendeur:
            return {"ok": False, "raison": "delai_depasse"}
        if posture == "conteste" and not texte:
            return {"ok": False, "raison": "constat_vide"}
        if posture == "arrangement" and len(texte) < parametres.nombres("LIT-ARRANG-MIN")[0]:
            return {"ok": False, "raison": "trop_court"}
        if posture == "accepte":
            apres_vente.reponse_du_vendeur(lit, Litige.Reponse.ACCEPTE, texte="Le vendeur accepte.")
        else:
            # L'arrangement du vendeur n'a pas de montant (type du site) : il part en médiation avec son texte, comme
            # une contestation motivée (garde « arrangement_ou_contestation_valide » de la machine LITIGE).
            apres_vente.reponse_du_vendeur(lit, Litige.Reponse.CONTESTE, texte=texte)
            if posture == "arrangement":
                Litige.objects.filter(pk=lit.pk).update(arrangement_texte=texte)
        d.posture = posture
        d.arrangement = (arrangement or "remplacement") if posture == "arrangement" else ""
        d.reponse_texte = "" if posture == "accepte" else texte
        d.reponse_a, d.reponse_par = t, membre.signature
        d.save()
        BrouillonReponse.objects.filter(dossier=d).delete()
        _noter(d, "reponse", membre.signature, posture, a=t)
        if posture == "accepte":
            _noter(d, "clos", "", "accepte", a=t)
        socle.journaliser(
            d.commande, membre, "Litige accepté : le client est remboursé" if posture == "accepte" else "Réponse au litige envoyée", a=t
        )
    return {"ok": True, "issue": "accepte" if posture == "accepte" else "attente"}


def contester(b: Boutique, membre: Membre, ref: str, texte: str) -> dict:
    """Recours du vendeur sur un litige perdu : une fois, sous LIT-RECOURS-H (DP-56 Q-26), examiné par une autre
    personne ; l'argent reste gelé jusqu'à la réponse."""
    texte = (texte or "").strip()
    with transaction.atomic():
        d = dossier(b, ref, Dossier.Voie.LITIGE, verrou=True)
        if d is None:
            return {"ok": False, "raison": "non_contestable"}
        if membre.role != Membre.Role.PROPRIETAIRE:
            return {"ok": False, "raison": "reserve_proprietaire"}
        if d.recours_a:
            return {"ok": False, "raison": "deja_contestee"}
        v = vue_litige(d, True)
        if not v["decision"] or v["decision"]["issue"] != "perdu":
            return {"ok": False, "raison": "non_contestable"}
        t = horloge.maintenant()
        if not moteur.recours_possible(d.litige.decision_le, t, False, _p()):
            return {"ok": False, "raison": "delai_depasse"}
        if len(texte) < parametres.nombres("LIT-ARRANG-MIN")[0]:
            return {"ok": False, "raison": "trop_court"}
        d.recours_a, d.recours_texte, d.recours_par = t, texte, membre.signature
        d.save(update_fields=["recours_a", "recours_texte", "recours_par"])
        _noter(d, "recours", membre.signature, a=t)
        socle.journaliser(d.commande, membre, "Décision du litige contestée (recours)", a=t)
    return {"ok": True}


# ── Le retour vu par la boutique (Retour, src/donnees/domaines/retours.ts) ──────────────────────────────


def _arrivee(d: Dossier, r: Retour) -> tuple | None:
    """Passage du livreur qui ramène le retour : le prochain créneau de la boutique après la collecte (ou le dépôt)."""
    base = r.collecte_le or r.depose_le
    if base is None:
        return None
    de, a = calendrier.passage_suivant(base, calendrier.calendrier(d.boutique))
    if de == a:
        return None
    return de, a


def _photos_inspection(d: Dossier, retirable: bool) -> list[dict]:
    return [_piece(x, retirable) for x in d.pieces.filter(usage=PieceVendeur.Usage.INSPECTION, retiree_a__isnull=True)]


def _suite(d: Dossier, r: Retour, inspecter_avant, t) -> dict:
    p = _p()
    if r.recu_le is None:
        return {"type": "en_route"}
    if not d.verdict:
        if r.etat == Retour.Etat.CLOS or (inspecter_avant and t > inspecter_avant):
            return {"type": "rembourse", "le": ms(r.clos_le if r.etat == Retour.Etat.CLOS and r.clos_le else inspecter_avant), "auto": True}
        return {"type": "a_inspecter"}
    if d.verdict == "non_conforme":
        return {"type": "mediation", "decisionAvant": ms(d.inspecte_a + timedelta(hours=p.decision_heures))}
    if not d.choix:
        return {"type": "a_choisir"}
    if d.choix == "rembourser":
        return {"type": "rembourse", "le": ms(d.choix_a), "auto": False}
    if not d.pret_a and t > d.expedier_avant:
        return {"type": "rembourse", "le": ms(d.expedier_avant), "auto": True}
    return {"type": "remplacement", "expedierAvant": ms(d.expedier_avant), "pretA": ms(d.pret_a) if d.pret_a else None}


def vue_retour(d: Dossier, proprio: bool, t=None) -> dict:
    t = t or horloge.maintenant()
    p = _p()
    lit, c = d.litige, d.commande
    r = Retour.objects.get(litige=lit)
    arrivee = _arrivee(d, r)
    if r.recu_le:
        inspecter_avant = moteur.fin_inspection(r.recu_le, p)
    else:
        inspecter_avant = moteur.fin_inspection(arrivee[1], p) if arrivee else None
    suite = _suite(d, r, inspecter_avant, t)
    decide = d.verdict == "non_conforme" and lit.etat == E.DECIDE
    if suite["type"] == "en_route":
        etat = "en_route"
    elif suite["type"] == "rembourse" or (suite["type"] == "remplacement" and suite["pretA"]) or decide:
        etat = "clos"
    else:
        etat = "a_decider"
    sc = _sc(lit)
    retire = (sc.remise_le if sc else None) or lit.ouvert_le
    heures = int((lit.ouvert_le - retire).total_seconds() // 3600)
    journal = [
        {"a": ms(retire), "code": "retire", "auteur": None, "detail": None},
        {"a": ms(lit.ouvert_le), "code": "signale", "auteur": None, "detail": MOTS_CATEGORIE[d.categorie]},
    ]
    for code, quand in (("depose", r.depose_le), ("recu", r.recu_le)):
        if quand:
            journal.append({"a": ms(quand), "code": code, "auteur": None, "detail": None})
    journal += [{"a": ms(e.a), "code": e.code, "auteur": e.auteur or None, "detail": e.detail or None} for e in d.evenements.all()]
    if suite["type"] == "rembourse" and suite["auto"]:
        journal.append({"a": suite["le"], "code": "rembourse_auto", "auteur": None, "detail": None})
    journal.sort(key=lambda x: x["a"])
    inspection = None
    if d.verdict:
        inspection = {
            "verdict": d.verdict,
            "controles": {**VIDE, **(d.controles or {})},
            "photos": _photos_inspection(d, False),
            "a": ms(d.inspecte_a),
            "par": d.inspecte_par,
        }
    ligne = c.lignes[0] if c.lignes else {}
    offre = Offre.objects.select_related("fiche").filter(pk=ligne.get("offreId") or 0, boutique=d.boutique).first()
    return {
        "ref": c.ref,
        "etat": etat,
        "suite": suite,
        "categorie": d.categorie,
        "motif": MOTS_CATEGORIE[d.categorie],
        "phraseClient": lit.description,
        "article": _article(c),
        "volumineux": c.colis in ("XL", "XXL"),
        "gele": c.garde if proprio and etat != "clos" else None,
        "arrivee": {
            "jour": arrivee[0].astimezone(YAOUNDE).date().isoformat(),
            "creneau": [arrivee[0].astimezone(YAOUNDE).strftime("%H:%M"), arrivee[1].astimezone(YAOUNDE).strftime("%H:%M")],
        }
        if arrivee
        else None,
        "recuA": ms(r.recu_le) if r.recu_le else None,
        "inspecterAvant": ms(inspecter_avant) if inspecter_avant else None,
        "retireA": ms(retire),
        "signaleA": ms(lit.ouvert_le),
        "signalement": {
            "heures": heures,
            "limiteH": p.defaut_cache_heures,
            "recevable": d.categorie != CAT.DEFAUT_CACHE or heures <= p.defaut_cache_heures,
        },
        "inspection": inspection,
        "brouillon": None
        if d.verdict
        else {"controles": {**VIDE, **(d.controles or {})}, "photos": _photos_inspection(d, True), "verdict": d.verdict_brouillon or None},
        "couts": {"trajet": p.trajet_retour, "garde": c.garde, "livraisonRetour": livraison_du_colis(lit)} if proprio else None,
        "remplacement": {
            "offreId": str(offre.pk) if offre else str(ligne.get("offreId") or ""),
            "titre": ligne.get("titre", ""),
            "variante": ligne.get("variante", ""),
            "dessin": ligne.get("dessin", ""),
            "stock": offre.stock if offre else 0,
        },
        "journal": journal,
    }


def retours(b: Boutique, proprio: bool, etat: str | None = None) -> list[dict]:
    t = horloge.maintenant()
    vues = [vue_retour(d, proprio, t) for d in dossiers(b, Dossier.Voie.RETOUR) if Retour.objects.filter(litige=d.litige).exists()]
    return [v for v in vues if not etat or v["etat"] == etat]


def compteurs_retours(b: Boutique) -> dict:
    n = {"a_decider": 0, "en_route": 0, "clos": 0}
    for v in retours(b, False):
        n[v["etat"]] += 1
    return n


def _dater(r: Retour, champ: str, t) -> None:
    """aftersales date ses transitions à l'heure réelle ; la boutique lit l'heure de l'espace vendeur (horloge)."""
    Retour.objects.filter(pk=r.pk).update(**{champ: t})
    setattr(r, champ, t)


def _avancer_kit(lit: Litige, evenement: str, t, en_tort: str = "vendeur") -> Retour:
    r = apres_vente.avancer_retour(lit, evenement, en_tort)
    champ = {"return.collected": "collecte_le", "return.received": "recu_le", "return.inspected": "inspecte_le"}.get(evenement)
    if champ:
        _dater(r, champ, t)
    if r.etat == Retour.Etat.CLOS:
        _dater(r, "clos_le", t)
    return r


# ── Gestes de la boutique sur un retour ─────────────────────────────────────────────────────────────────


def recevoir(b: Boutique, membre: Membre, ref: str) -> dict:
    """Le livreur a remis le retour : l'heure réelle de la remise lance RET-INSPECT-H (Q-72). Retour du kit → « recu »."""
    with transaction.atomic():
        d = dossier(b, ref, Dossier.Voie.RETOUR, verrou=True)
        r = Retour.objects.select_for_update().filter(litige=d.litige).first() if d else None
        if r is None:
            return {"ok": False, "raison": "introuvable"}
        if r.recu_le is not None:
            return {"ok": False, "raison": "deja_recu"}
        t = horloge.maintenant()
        if r.etat == Retour.Etat.DEPOSE:  # le livreur a sauté le scan de collecte : la remise la vaut
            _avancer_kit(d.litige, "return.collected", t)
        if Retour.objects.get(pk=r.pk).etat != Retour.Etat.COLLECTE:
            return {"ok": False, "raison": "introuvable"}  # pas encore déposé au relais : rien n'est en route
        _avancer_kit(d.litige, "return.received", t)
        socle.journaliser(d.commande, membre, "Retour reçu à la boutique", a=t)
    return {"ok": True, "inspecterAvant": ms(moteur.fin_inspection(t, _p()))}


def ajouter_photo(b: Boutique, membre: Membre, ref: str, photo) -> dict:
    fichier = lire_photo(photo, prefixe="inspection")
    with transaction.atomic():
        d = dossier(b, ref, Dossier.Voie.RETOUR, verrou=True)
        if d is None:
            return {"ok": False, "raison": "introuvable"}
        if d.verdict:
            return {"ok": False, "raison": "deja_inspecte"}
        t = horloge.maintenant()
        pv = PieceVendeur(dossier=d, usage=PieceVendeur.Usage.INSPECTION, a=t, par=membre.signature)
        pv.photo = fichier
        pv.save()
        _noter(d, "photo", membre.signature, a=t)
        return {"ok": True, "piece": _piece(pv, retirable=True)}


def retirer_photo(b: Boutique, ref: str, ident: str) -> None:
    d = dossier(b, ref, Dossier.Voie.RETOUR)
    if d is None or d.verdict:
        return
    n = str(ident).upper().removeprefix("P")
    if n.isdigit():
        d.pieces.filter(pk=int(n), usage=PieceVendeur.Usage.INSPECTION, retiree_a__isnull=True).update(retiree_a=horloge.maintenant())


def garder_brouillon_inspection(b: Boutique, ref: str, controles: dict, verdict: str | None) -> None:
    d = dossier(b, ref, Dossier.Voie.RETOUR)
    if d is None:
        raise introuvable("Ce retour n'existe pas.")
    if d.verdict:
        return
    d.controles = {"scelle": bool(controles.get("scelle")), "serie": bool(controles.get("serie"))}
    d.verdict_brouillon = verdict or ""
    d.save(update_fields=["controles", "verdict_brouillon"])


def inspecter(b: Boutique, membre: Membre, ref: str, verdict: str, controles: dict) -> dict:
    """Constater, photographier (INP-01 : 2 photos au moins), décider, sous RET-INSPECT-H après la remise
    (moteurs litiges.fin_inspection). Conforme : défaut confirmé → à choisir ; non conforme : médiation (L-4)."""
    with transaction.atomic():
        d = dossier(b, ref, Dossier.Voie.RETOUR, verrou=True)
        if d is None:
            return {"ok": False, "raison": "introuvable"}
        if d.verdict:
            return {"ok": False, "raison": "deja_inspecte"}
        r = Retour.objects.select_for_update().get(litige=d.litige)
        if r.recu_le is None:
            return {"ok": False, "raison": "pas_recu"}
        t = horloge.maintenant()
        if r.etat != Retour.Etat.RECU or t > moteur.fin_inspection(r.recu_le, _p()):
            return {"ok": False, "raison": "delai_depasse"}
        if verdict not in ("conforme", "non_conforme"):
            return {"ok": False, "raison": "verdict"}
        if not (controles or {}).get("scelle") or not (controles or {}).get("serie"):
            return {"ok": False, "raison": "controles"}
        if d.pieces.filter(usage=PieceVendeur.Usage.INSPECTION, retiree_a__isnull=True).count() < INSPECTION_PHOTOS_MIN:
            return {"ok": False, "raison": "photos"}
        _avancer_kit(d.litige, "return.inspected", t)
        d.verdict, d.controles, d.inspecte_a, d.inspecte_par = verdict, {"scelle": True, "serie": True}, t, membre.signature
        d.save()
        _noter(d, "inspecte", membre.signature, verdict, a=t)
        if verdict == "non_conforme":
            # La réponse du vendeur, c'est le verdict : contesté, preuves en médiation (machine LITIGE).
            if d.litige.etat == E.ATTENTE_VENDEUR:
                apres_vente.reponse_du_vendeur(d.litige, Litige.Reponse.CONTESTE, texte="Inspection du retour : non conforme au motif.")
            _noter(d, "mediation", a=t)
        socle.journaliser(
            d.commande,
            membre,
            "Retour inspecté : " + ("conforme au motif" if verdict == "conforme" else "non conforme, preuves en médiation"),
            a=t,
        )
    return {"ok": True}


def _accorder(lit: Litige, issue: str, motif: str, t) -> None:
    """Défaut confirmé : le vendeur accepte (machine LITIGE seller.accepted), l'issue suit son choix. Fait ici et non
    par aftersales.reponse_du_vendeur, qui recréerait le retour déjà en cours."""
    lit = Litige.objects.select_for_update().get(pk=lit.pk)
    lit.etat = LITIGE.appliquer(lit.etat, "seller.accepted").vers
    lit.reponse_vendeur, lit.issue, lit.decision_le, lit.decision_motif = Litige.Reponse.ACCEPTE, issue, t, motif
    lit.save()


def proposer(b: Boutique, membre: Membre, ref: str, choix: str) -> dict:
    """Défaut confirmé : remplacer (une unité du stock de l'offre réservée ; expédier avant echeance_remplacement)
    ou rembourser (retour clos, vendeur en tort : moteur rembourser_retour). Propriétaire seulement (argent)."""
    with transaction.atomic():
        d = dossier(b, ref, Dossier.Voie.RETOUR, verrou=True)
        if d is None:
            return {"ok": False, "raison": "introuvable"}
        if membre.role != Membre.Role.PROPRIETAIRE:
            return {"ok": False, "raison": "reserve_proprietaire"}
        t = horloge.maintenant()
        v = vue_retour(d, True, t)
        if v["suite"]["type"] != "a_choisir":
            return {"ok": False, "raison": "deja_choisi" if d.verdict == "conforme" else "pas_conforme"}
        lit = d.litige
        if choix == "remplacer":
            o = Offre.objects.select_for_update().filter(pk=v["remplacement"]["offreId"] or 0, boutique=b).first()
            if o is None or o.stock < 1:
                return {"ok": False, "raison": "stock"}
            o.stock -= 1
            o.save(update_fields=["stock", "maj_le"])
            if o.product_id:
                pont.modele("stock").objects.filter(product_id=o.product_id).update(quantity=o.stock)
            avant = moteur.echeance_remplacement(t.astimezone(YAOUNDE), _p())
            _accorder(lit, I.REMPLACE, "Défaut confirmé à l’inspection : un article neuf remplace l’article défectueux.", t)
            Remplacement.objects.update_or_create(
                litige=lit,
                defaults={
                    "etat": REMPLACEMENT.appliquer("—", "replacement.decided").vers,
                    "debut": t,
                    "avant": avant,
                    "vendeurs_essayes": [b.vendor_id] if b.vendor_id else [],
                },
            )
            # Le retour se clôt sans remboursement : l'article défectueux reste à la boutique (RMP-02).
            r = Retour.objects.select_for_update().get(litige=lit)
            r.etat = RETOUR.appliquer(r.etat, "return.closed").vers
            r.clos_le, r.en_tort, r.rembourse = t, "vendeur", 0
            r.save()
            d.expedier_avant = avant
            # La sous-commande de remplacement suit le parcours de toute commande (bon, « C'est prêt », remise).
            socle.creer_remplacement(d.commande, o, avant, membre)
        else:
            _accorder(lit, I.REMBOURSE, "Défaut confirmé à l’inspection : le client est remboursé.", t)
            _avancer_kit(lit, "return.closed", t, en_tort="vendeur")
        d.choix, d.choix_a = choix, t
        d.save()
        _noter(d, "remplacement" if choix == "remplacer" else "rembourse", membre.signature, a=t)
        socle.journaliser(
            d.commande,
            membre,
            "Remplacement proposé au client" if choix == "remplacer" else "Client remboursé : l’article défectueux reste à la boutique",
            a=t,
        )
    return {"ok": True, "expedierAvant": ms(d.expedier_avant)} if choix == "remplacer" else {"ok": True}


def remplacement_pret(b: Boutique, membre: Membre, ref: str) -> dict:
    """Le remplacement est prêt : le livreur le ramasse au créneau habituel (replacement.collected à sa collecte)."""
    with transaction.atomic():
        d = dossier(b, ref, Dossier.Voie.RETOUR, verrou=True)
        if d is None or d.choix != "remplacer":
            return {"ok": False, "raison": "introuvable"}
        if d.pret_a is None:
            d.pret_a = horloge.maintenant()
            d.save(update_fields=["pret_a"])
            _noter(d, "pret", membre.signature, a=d.pret_a)
            socle.journaliser(d.commande, membre, "Remplacement prêt pour le livreur", a=d.pret_a)
    return {"ok": True}


# ── Exposé aux autres applications ──────────────────────────────────────────────────────────────────────


def en_cours(boutique: Boutique) -> dict:
    """Accueil (« à faire ») : litiges à répondre et retours pas encore clos. `gele` en francs (à masquer par
    l'appelant pour l'accès Préparation) ; `echeance` en datetime ; `arrivee` : {jour, creneau} ou None."""
    t = horloge.maintenant()
    rendu = {"litiges": [], "retours": []}
    for d in dossiers(boutique):
        if d.voie == Dossier.Voie.LITIGE:
            v = vue_litige(d, True, t)
            if v["etat"] == "a_repondre":
                rendu["litiges"].append({"ref": v["ref"], "echeance": d.litige.echeance_vendeur, "motif": v["motif"], "gele": v["gele"]})
        elif Retour.objects.filter(litige=d.litige).exists():
            v = vue_retour(d, True, t)
            if v["etat"] != "clos":
                rendu["retours"].append(
                    {"ref": v["ref"], "article": v["article"], "motif": v["motif"], "arrivee": v["arrivee"], "gele": v["gele"]}
                )
    rendu["litiges"].sort(key=lambda x: x["echeance"])
    return rendu


# ── Console de BelivaY et routes d'essai (relais, livreur, médiation) ───────────────────────────────────


def accepter_retour(ref: str, categorie: str | None = None) -> dict:
    """BelivaY accepte le retour d'un motif recevable (RET-01 ; fenêtre RET-FENETRE, défaut caché sous RET-DEFAUT-H :
    moteurs litiges.voie_de_retour = « retour ») : le dossier quitte les litiges de la boutique pour ses retours ;
    le client dépose l'article au relais (DP-10). `categorie` : catégorie vendeur si elle diffère de la table Q-29."""
    d = _dossier_par_ref(ref)
    t = horloge.maintenant()
    with transaction.atomic():
        lit = Litige.objects.select_for_update().get(pk=d.litige_id)
        if d.voie == Dossier.Voie.RETOUR or lit.etat != E.ATTENTE_VENDEUR or d.posture or Retour.objects.filter(litige=lit).exists():
            raise conflit("state_changed", "Ce dossier n'attend plus de décision sur le retour.")
        cat = categorie or d.categorie
        if cat not in CAT.values:
            raise refus("categorie_inconnue", "Catégorie de retour inconnue.")
        sc = _sc(lit)
        m = MontantsCommande.objects.filter(order_id=lit.order_id).first()
        retrait = sc.remise_le if sc and sc.remise_le else None
        voie = (
            moteur.voie_de_retour(MOTIF_MOTEUR[cat], retrait, lit.ouvert_le, bool(m and m.tout_en_ordre_le), _p())
            if retrait
            else moteur.Voie.AUCUNE
        )
        if voie is not moteur.Voie.RETOUR:
            raise refus("non_recevable", f"Ce motif n'ouvre pas un retour (voie : {voie.value}).")
        if sc is not None:
            sc.etat = SOUS_COMMANDE.appliquer(sc.etat, "return.accepted", {"decision_ou_accord": True}).vers
            sc.save(update_fields=["etat"])
        Retour.objects.create(
            litige=lit,
            etat=RETOUR.appliquer("—", "return.accepted").vers,
            accepte_le=t,
            deposer_avant=t + timedelta(days=apres_vente.DEPOT_RETOUR_JOURS),
        )
        d.voie, d.categorie = Dossier.Voie.RETOUR, cat
        d.save(update_fields=["voie", "categorie"])
        socle.notifier(
            d.boutique,
            "retour",
            "Un retour arrive",
            f"{d.commande.ref} · {MOTS_CATEGORIE[cat]} : le client dépose l’article au relais.",
            f"retours?ref={d.commande.ref}",
        )
    return vue_retour(d, True)


def decider(ref: str, issue: str, motif: str, grave: bool = False) -> dict:
    """Décision humaine de la médiation BelivaY (console), motif écrit obligatoire (REFPROD-R27). `issue` : « gagne »
    (le vendeur gagne) ou « perdu ». Litige sans réponse après l'échéance : seller.silent puis décision (DP-35, jamais
    automatique). Retour non conforme (L-4) : gagné → l'article repart chez le client, le vendeur est payé (L-3) ;
    perdu → retour clos, client remboursé (vendeur en tort). Recours du vendeur en attente : réponse au recours."""
    if issue not in ("gagne", "perdu"):
        raise refus("issue_inconnue", "Issue : « gagne » ou « perdu ».")
    if not (motif or "").strip():
        raise refus("motif_obligatoire", "Le motif écrit est obligatoire.")
    motif = motif.strip()
    d = _dossier_par_ref(ref)
    t = horloge.maintenant()
    with transaction.atomic():
        d = Dossier.objects.select_for_update().get(pk=d.pk)
        lit = Litige.objects.get(pk=d.litige_id)
        if d.recours_a and not d.recours_decide_a:
            d.recours_issue, d.recours_motif, d.recours_decide_a = issue, motif, t
            d.save(update_fields=["recours_issue", "recours_motif", "recours_decide_a"])
            _noter(d, "decision", MEDIATION, issue, a=t)
        elif d.voie == Dossier.Voie.RETOUR:
            if d.verdict != "non_conforme" or lit.etat != E.EN_EXAMEN:
                raise conflit("state_changed", "Ce retour n'attend pas de décision de la médiation.")
            lit.etat = LITIGE.appliquer(lit.etat, "dispute.decided", {"motif_ecrit": True}).vers
            lit.issue, lit.decision_motif, lit.decision_le = (I.REFUSE if issue == "gagne" else I.REMBOURSE), motif, t
            lit.save()
            if issue == "gagne":  # L-3 : rien n'est remboursé ; le trajet est payé par le client à son retrait
                r = Retour.objects.select_for_update().get(litige=lit)
                r.etat = RETOUR.appliquer(r.etat, "return.closed").vers
                r.clos_le, r.en_tort, r.rembourse = t, "client", 0
                r.save()
                Litige.objects.filter(pk=lit.pk).update(clos_le=t)
            else:
                _avancer_kit(lit, "return.closed", t, en_tort="vendeur")
        else:
            if lit.etat == E.ATTENTE_VENDEUR:
                if t <= lit.echeance_vendeur:
                    raise conflit("trop_tot", "Le vendeur a encore le temps de répondre.")
                apres_vente.reponse_du_vendeur(lit, "silence")
            souhait = {"rembourse": I.REMBOURSE, "remplace": I.REMPLACE}.get(lit.souhait, I.AUCUNE)
            lit = apres_vente.decider(lit, I.REFUSE if issue == "gagne" else souhait, motif)
            Litige.objects.filter(pk=lit.pk).update(decision_le=t, **({"clos_le": t} if lit.clos_le else {}))
        d.faute_grave = bool(grave) and issue == "perdu"
        d.save(update_fields=["faute_grave"])
        lien = f"litige_envoye?ref={d.commande.ref}" if d.voie == Dossier.Voie.LITIGE else f"inspection?ref={d.commande.ref}"
        socle.notifier(
            d.boutique,
            "litige",
            "Décision de la médiation",
            f"{d.commande.ref} : {'décision en votre faveur' if issue == 'gagne' else 'décision en faveur du client'}.",
            lien,
            urgent=True,
        )
    d.refresh_from_db()
    return vue_litige(d, True) if d.voie == Dossier.Voie.LITIGE else vue_retour(d, True)


def avancer_retour(ref: str, evenement: str) -> dict:
    """Ce que font le relais et le livreur sur le retour (machine RETOUR) : « return.deposited » (dépôt scanné au
    relais), « return.collected » (collecte du livreur), « return.received » (remise au vendeur, comme POST receive),
    « inspection.expired » (tâche planifiée : remboursement automatique, VD07-R25)."""
    d = _dossier_par_ref(ref)
    if d.voie != Dossier.Voie.RETOUR:
        raise conflit("state_changed", "Ce dossier n'est pas un retour.")
    t = horloge.maintenant()
    with transaction.atomic():
        r = Retour.objects.select_for_update().get(litige=d.litige)
        if evenement == "return.deposited":
            r.etat = RETOUR.appliquer(r.etat, evenement).vers
            r.depose_le = t
            r.save(update_fields=["etat", "depose_le"])
        elif evenement in ("return.collected", "return.received", "inspection.expired"):
            _avancer_kit(d.litige, evenement, t, en_tort="vendeur")
            if evenement == "inspection.expired":
                _noter(d, "rembourse_auto", a=t)
        else:
            raise refus("evenement_inconnu", f"Événement inconnu : {evenement}.")
    return vue_retour(d, True)


def avancer_remplacement(ref: str, evenement: str) -> dict:
    """Le nouvel article : « replacement.collected » (le livreur le ramasse), « parcel.handed » (remis au client),
    « replacement.late » (pas expédié à l'échéance : remboursement automatique, VD07-R31). Machine REMPLACEMENT."""
    d = _dossier_par_ref(ref)
    lit = d.litige
    if not Remplacement.objects.filter(litige=lit).exists():
        raise introuvable("Aucun remplacement sur ce dossier.")
    rempl = apres_vente.avancer_remplacement(lit, evenement)
    if evenement == "replacement.late":
        _noter(d, "rembourse_auto")
    elif evenement == "replacement.collected" and d.pret_a is None:
        Dossier.objects.filter(pk=d.pk).update(pret_a=horloge.maintenant())
    return {"ref": d.commande.ref, "etat": rempl.etat}


def traiter_retards() -> int:
    """Tâche planifiée (H5, H6) : inspection non faite à l'échéance ⇒ remboursement automatique ; remplacement non
    expédié à l'échéance ⇒ remboursement automatique. Rend le nombre de dossiers traités."""
    t = horloge.maintenant()
    p = _p()
    n = 0
    for d in Dossier.objects.filter(voie=Dossier.Voie.RETOUR).select_related("litige", "commande"):
        r = Retour.objects.filter(litige=d.litige).first()
        if r and r.etat == Retour.Etat.RECU and not d.verdict and t > moteur.fin_inspection(r.recu_le, p):
            avancer_retour(d.commande.ref, "inspection.expired")
            n += 1
        rempl = Remplacement.objects.filter(litige=d.litige, etat=Remplacement.Etat.ATTENTE).first()
        if rempl and d.pret_a is None and t > rempl.avant:
            avancer_remplacement(d.commande.ref, "replacement.late")
            n += 1
    return n
