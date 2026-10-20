# backend/apps/vendeur_argent/accueil.py
# Accueil du vendeur (VD-04 ; GEN-07, ACC-10 à ACC-25, VD04-R10 à R15 ; OFF-01 à OFF-05 ; DP-57 A-5, I-3) :
#   aujourdhui(b, m)   — ce qu'il y a à faire, la plus urgente d'abord : préparer (CommandeVendeur), litiges et retours
#                        (apps.vendeur_litiges.services.en_cours, sinon apps.aftersales) ; compteurs ; alerte avant un
#                        seuil (paliers.alerte_de_seuil / alerte_a_envoyer ; propriétaire seulement) ; stock bas
#                        (apps.vendeur_catalogue.services.stock_bas, sinon vendeur_core.Offre) ; actions en file.
#   calme(b, m)        — « Rien à faire » : chiffres (argent : propriétaire seulement), idée du jour (vendeur_croissance).
#   premier_jour(b, m) — premier jour : trois gestes, palier de lancement, offre de découverte.
#   suspension(b, ex)  — suspension en cours (vendeur_croissance) ; exemple marqué exemple: true sur demande.
#   file …             — gestes faits hors connexion, rejoués dans l'ordre ; une action de plus de 72 h expire.
# Aucun montant pour l'accès Préparation (DP-55) ; jamais le client (GEN-01).
import re
from datetime import timedelta

from django.db import transaction

from apps.client_core.erreurs import ErreurClient
from apps.client_core.temps import depuis_ms, ms
from apps.vendeur_core import calendrier, horloge, parametres
from apps.vendeur_core import services as socle
from apps.vendeur_core.models import Boutique, CommandeVendeur, Membre, Offre

from . import services
from .models import ActionEnFile, EtatAccueil

# Registre (vendeur_core.parametres) : âge maximal d'une action gardée hors connexion (VD-FILE-HORS-LIGNE, OFF-02,
# Q-93) ; réponse humaine à une contestation de suspension (VD-CONTESTATION-REPONSE, SUS-03) ; saisie assistée
# gratuite pour les premières boutiques de chaque zone exploitée (VD-SAISIE-ASSISTEE, DP-56, Q-40).
MOTIFS_REJEU = {
    "deja_prete": "Elle était déjà prête.",
    "annulee": "La commande a été annulée entre-temps.",
    "introuvable": "Commande introuvable.",
}


def etat(b: Boutique) -> EtatAccueil:
    return EtatAccueil.objects.get_or_create(boutique=b)[0]


# ── Aujourd'hui (GET /seller/today) ────────────────────────────────────────────────────────────────────


def _livreur(b: Boutique, c: CommandeVendeur) -> dict:
    lv = socle.livreur_json(c)
    if lv is not None:
        return {"nom": lv["nom"], "societe": lv["societe"], "creneau": lv["creneau"]}
    de, a = calendrier.passage_suivant(c.echeance or horloge.maintenant(), calendrier.calendrier(b))
    y = calendrier.YAOUNDE
    return {
        "nom": c.livreur.nom if c.livreur else "",
        "societe": b.societe_livraison,
        "creneau": [de.astimezone(y).strftime("%H:%M"), a.astimezone(y).strftime("%H:%M")],
    }


def a_preparer(b: Boutique) -> list[CommandeVendeur]:
    return list(
        CommandeVendeur.objects.filter(boutique=b, prete_a__isnull=True, annulee_a__isnull=True)
        .select_related("livreur")
        .order_by("echeance", "id")
    )


def _litiges_retours_kit(b: Boutique, proprio: bool) -> list[dict]:
    """Litiges à répondre et retours en route, lus dans apps.aftersales (vendeur_litiges absente)."""
    from apps.aftersales.models import Litige, Retour

    out = []
    cmds = {(c.order_id, c.n): c for c in CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True)}
    if not cmds:
        return out
    for lit in Litige.objects.filter(order_id__in={k[0] for k in cmds}, clos_le__isnull=True, retire_le__isnull=True):
        c = cmds.get((lit.order_id, lit.colis))
        if c is None:
            continue
        gele = c.garde if proprio else None
        r = Retour.objects.filter(litige=lit, clos_le__isnull=True).first()
        if r is not None:
            de, a = calendrier.passage_suivant(r.collecte_le or horloge.maintenant(), calendrier.calendrier(b))
            y = calendrier.YAOUNDE
            out.append(
                {
                    "type": "retour",
                    "ref": c.ref,
                    "article": socle.article_vendu((c.lignes or [{}])[0]),
                    "motif": lit.probleme,
                    "arrivee": {
                        "jour": de.astimezone(y).date().isoformat(),
                        "creneau": [de.astimezone(y).strftime("%H:%M"), a.astimezone(y).strftime("%H:%M")],
                    },
                    "gele": gele,
                    "inspectionH": _inspection_h(),
                }
            )
        elif not lit.reponse_vendeur and lit.decision_le is None:
            out.append(
                {
                    "type": "litige",
                    "ref": c.ref,
                    "echeance": ms(lit.echeance_vendeur),
                    "motif": lit.probleme,
                    "gele": gele,
                    "article": socle.article_vendu((c.lignes or [{}])[0]),
                }
            )
    return out


def litiges_retours(b: Boutique, proprio: bool) -> list[dict]:
    """vendeur_litiges.services.en_cours(b) -> {litiges: [{ref, echeance (datetime), motif, gele}], retours: [{ref,
    article, motif, arrivee, gele}]} ; absente : lecture directe d'apps.aftersales. `gele` masqué pour la Préparation."""
    try:
        from apps.vendeur_litiges.services import en_cours
    except ImportError:
        return _litiges_retours_kit(b, proprio)
    r = en_cours(b) or {}
    out = []
    for x in r.get("litiges", []):
        e = x.get("echeance")
        out.append(
            {
                "type": "litige",
                "ref": x["ref"],
                "echeance": ms(e) if hasattr(e, "tzinfo") else e,
                "motif": x.get("motif", ""),
                "gele": x.get("gele") if proprio else None,
                "article": x.get("article") or _article_de(b, x["ref"]),
            }
        )
    for x in r.get("retours", []):
        out.append(
            {
                "type": "retour",
                "ref": x["ref"],
                "article": x.get("article"),
                "motif": x.get("motif", ""),
                "arrivee": x.get("arrivee"),
                "gele": x.get("gele") if proprio else None,
                "inspectionH": _inspection_h(),
            }
        )
    return out


def _stock_bas_socle(b: Boutique) -> list[dict]:
    return [
        {"offreId": str(o.pk), "titre": o.titre, "dessin": o.fiche.dessin if o.fiche else "", "stock": o.stock, "seuil": o.seuil_alerte}
        for o in Offre.objects.select_related("fiche")
        .filter(boutique=b, etat=Offre.Etat.EN_VENTE, supprimee_le__isnull=True)
        .order_by("stock", "id")
        if o.stock <= o.seuil_alerte
    ]


def stock_bas(b: Boutique) -> list[dict]:
    """vendeur_catalogue.services.stock_bas(b) ; absente : lecture du socle (offres en vente au seuil ou dessous)."""
    try:
        from apps.vendeur_catalogue.services import stock_bas as du_catalogue
    except ImportError:
        return _stock_bas_socle(b)
    return list(du_catalogue(b) or [])


def _reference(b: Boutique) -> Offre | None:
    return services.offre_la_plus_vendue(b)


def alerte_score(b: Boutique) -> dict | None:
    """« Votre score approche de 65 » (ACC-25 ; DP-57 A-5) : montée ou descente à 3 points ou moins d'un seuil ;
    masquée une fois par seuil et par semaine (alerte_a_envoyer)."""
    from belivay_moteurs.paliers import ORDRE, Palier, alerte_a_envoyer, alerte_de_seuil

    pp = parametres.paliers()
    a = alerte_de_seuil(b.palier, b.trust_score, pp)
    if a is None:
        return None
    e = etat(b)
    masquee_le = e.alerte_masquee_le if e.alerte_seuil == a.seuil else None
    o = _reference(b)
    gain = 0
    if o is not None and o.fiche is not None:
        if a.sens == "montée":
            vise, base = a.palier_vise.value, b.palier
        else:
            vise, base = b.palier, ORDRE[max(0, ORDRE.index(Palier(b.palier)) - 1)].value
        gain = socle.garde_par_vente(b, o.fiche.categorie, o.prix, o.made_in_cameroon, palier=vise) - socle.garde_par_vente(
            b, o.fiche.categorie, o.prix, o.made_in_cameroon, palier=base
        )
    cond = pp.conditions.get(a.palier_vise.value)
    return {
        "sens": "montee" if a.sens == "montée" else "descente",
        "score": float(b.trust_score),
        "seuil": a.seuil,
        "points": a.points_affiches,
        "palier": a.palier_vise.value,
        "gainParVente": gain,
        "titreReference": o.titre if o else "",
        "livrees": b.commandes_livrees,
        "livreesCible": cond.commandes_livrees if cond else 0,
        "masquee": not alerte_a_envoyer(a, masquee_le, horloge.aujourd_hui(), pp),
    }


def _ramassage(c: CommandeVendeur, cal: dict) -> dict:
    """Créneau de passage du livreur chez le vendeur : celui de la commande, sinon le passage qui suit l'échéance."""
    if c.ramassage_debut and c.ramassage_fin:
        de, a = c.ramassage_debut, c.ramassage_fin
    else:
        de, a = calendrier.passage_suivant(c.echeance or c.debut, cal)
    return {"debut": ms(de), "fin": ms(a)}


def _article_de(b: Boutique, ref: str) -> dict:
    c = CommandeVendeur.objects.filter(boutique=b, ref=ref).first()
    return socle.article_vendu((c.lignes or [{}])[0]) if c else socle.article_vendu({})


def _inspection_h() -> int:
    return parametres.litiges().inspection_heures


def aujourdhui(b: Boutique, proprio: bool) -> dict:
    socle.synchroniser(b)
    cal = calendrier.calendrier(b)
    preparer = [
        {
            "type": "preparer",
            "ref": c.ref,
            "echeance": ms(c.echeance or c.debut),
            "payeeA": ms(c.payee_a),
            "payableAuRetrait": c.payable_au_retrait,
            "article": socle.article_vendu((c.lignes or [{}])[0]),
            "quantite": services.quantite(c),
            "colis": c.colis,
            "garde": c.garde if proprio else None,
            "livreur": _livreur(b, c),
            "ramassage": _ramassage(c, cal),
            "calendrier": cal,
        }
        for c in a_preparer(b)
    ]
    autres = litiges_retours(b, proprio)
    litiges = sorted((x for x in autres if x["type"] == "litige"), key=lambda x: x.get("echeance") or 0)
    retours = [x for x in autres if x["type"] == "retour"]
    return {
        "maintenant": horloge.maintenant_ms(),
        "aFaire": [*preparer, *litiges, *retours],  # préparer d'abord, puis litiges, puis retours ; chacun par échéance
        "compteurs": {
            "preparer": len(preparer),
            "litiges": len(litiges),
            "retours": len(retours),
            "total": len(preparer) + len(litiges) + len(retours),
        },
        "alerteScore": alerte_score(b) if proprio else None,
        "stockBas": stock_bas(b),
        "enAttenteEnvoi": sum(1 for a in actions(b) if a["etat"] == "en_attente"),
    }


def masquer_alerte(b: Boutique) -> None:
    from belivay_moteurs.paliers import alerte_de_seuil

    a = alerte_de_seuil(b.palier, b.trust_score, parametres.paliers())
    e = etat(b)
    e.alerte_masquee_le, e.alerte_seuil = horloge.aujourd_hui(), (a.seuil if a else None)
    e.save(update_fields=["alerte_masquee_le", "alerte_seuil"])


# ── Rien à faire (GET /seller/calm) ────────────────────────────────────────────────────────────────────


def _idee(b: Boutique) -> dict | None:
    try:
        from apps.vendeur_croissance.services import idee_du_jour
    except ImportError:
        return None
    return idee_du_jour(b)


def calme(b: Boutique, proprio: bool) -> dict:
    from belivay_moteurs.paliers import ORDRE, Palier

    t = horloge.maintenant()
    jour = horloge.aujourd_hui()
    debut = jour.replace(day=1)
    vs = services.ventes(b, t)
    liberees = [v for v in vs if services.libere(v)]
    par_offre: dict[str, int] = {}
    for v in liberees:
        oid = (v.c.lignes or [{}])[0].get("offreId") or ""
        par_offre[oid] = par_offre.get(oid, 0) + services.quantite(v.c)
    meilleur = max(par_offre.items(), key=lambda x: x[1]) if par_offre else None
    meilleure_offre = Offre.objects.select_related("fiche").filter(pk=meilleur[0], boutique=b).first() if meilleur and meilleur[0] else None
    argent = None
    if proprio:
        ce_jour = sorted((v for v in vs if v.etat == "Se libère" and services.jour_y(v.liberation) == jour), key=lambda v: v.liberation)
        p = services.prochain_calcule(b, vs, t)
        du_mois = [v for v in liberees if v.liberation and services.jour_y(v.liberation) >= debut]
        rang = ORDRE.index(Palier(b.palier))
        suivant = ORDRE[rang + 1] if rang + 1 < len(ORDRE) else None
        pp = parametres.paliers()
        cond = pp.conditions.get(suivant.value) if suivant else None
        ref = meilleure_offre or _reference(b)
        progres = None
        if cond and ref is not None and ref.fiche is not None:
            g = lambda pal: socle.garde_par_vente(b, ref.fiche.categorie, ref.prix, ref.made_in_cameroon, palier=pal)  # noqa: E731
            progres = {
                "palier": suivant.value,
                "gainParVente": g(suivant.value) - g(b.palier),
                "titre": ref.titre,
                "points": max(0, cond.trust_score - round(b.trust_score)),
                "commandes": max(0, cond.commandes_livrees - b.commandes_livrees),
            }
        argent = {
            "gagne": sum(v.c.garde for v in liberees) - sum(r.montant for r in services.reprises_du_mois(b)),
            "liberationDuJour": {"garde": ce_jour[0].c.garde, "ref": ce_jour[0].c.ref, "a": ms(ce_jour[0].liberation)} if ce_jour else None,
            "prochainVersement": {
                "vendredi": p["vendredi"].isoformat(),
                "montant": p["montant"],
                "deja": p["deja"],
                "ceSoir": max(0, p["montant"] - p["deja"]),
                "numero": services.numero_qui_recoit(b)[1],
            }
            if p["montant"] > 0
            else None,
            "mois": {
                "debut": debut.isoformat(),
                "garde": sum(v.c.garde for v in du_mois),
                "ventes": sum(v.c.prix for v in du_mois),
                "impayes": services.IMPAYES,
                "transport": services.TRANSPORT,
            }
            if du_mois
            else None,
            "progres": progres,
        }
    commandes_du_mois = sum(1 for c in CommandeVendeur.objects.filter(boutique=b) if services.jour_y(c.payee_a) >= debut)
    return {
        "argent": argent,
        "commandesDuMois": commandes_du_mois,
        "idee": _idee(b),
        "meilleurProduit": {"offreId": str(meilleure_offre.pk), "titre": meilleure_offre.titre, "ventes": meilleur[1]}
        if meilleure_offre
        else None,
    }


# ── Premier jour (GET /seller/onboarding) ──────────────────────────────────────────────────────────────


def premier_jour(b: Boutique, proprio: bool) -> dict:
    from belivay_moteurs.delais import ajouter_mois
    from belivay_moteurs.paliers import palier_de_lancement

    jour = horloge.aujourd_hui()
    signature = b.signature_le or b.cree_le
    actifs = Offre.objects.filter(boutique=b, etat=Offre.Etat.EN_VENTE, stock__gt=0).count()
    gestes = [
        {"cle": "produits", "fait": actifs >= 1},
        {"cle": "horaires", "fait": any(h.get("ouvert") for h in b.horaires or [])},
        {"cle": "numero", "fait": b.numero_verifie_le is not None},
    ]
    pp = parametres.paliers()
    pc = parametres.commission()
    lancement = palier_de_lancement(signature, jour, actifs, pp)
    dec = socle.decouverte(b)
    ref = _reference(b)
    gain = None
    if proprio and ref is not None and ref.fiche is not None:
        gain = socle.garde_par_vente(
            b, ref.fiche.categorie, ref.prix, ref.made_in_cameroon, decouverte_active=True
        ) - socle.garde_par_vente(b, ref.fiche.categorie, ref.prix, ref.made_in_cameroon, decouverte_active=False)
    gratuites = parametres.saisie_assistee().premieres_boutiques
    rang_zone = Boutique.objects.filter(zone=b.zone, pk__lt=b.pk).count() if b.zone else gratuites
    return {
        "termine": CommandeVendeur.objects.filter(boutique=b).exists() or all(g["fait"] for g in gestes),
        "jour": (jour - signature).days + 1,
        "gestes": gestes,
        "produitsEnLigne": actifs,
        "numero": socle.numero_en_mots(b) or None if proprio else None,
        "lancement": {
            "palier": lancement.value,
            "actifs": actifs,
            "seuils": dict(pp.lancement_produits),
            "fin": ajouter_mois(signature, pp.lancement_mois).isoformat(),
        }
        if lancement
        else None,
        "decouverte": {
            "gainParVente": gain,
            "reference": ref.titre if ref else "",
            "prixReference": ref.prix if proprio and ref else None,
            "mois": pc.decouverte_mois,
            "commandes": pc.decouverte_commandes,
            "fin": dec["fin"],
            "restantes": max(0, dec["max"] - dec["commandes"]),
            "active": dec["active"],
        },
        "saisieAssisteeGratuite": rang_zone < gratuites,
    }


# ── Suspension (GET /account/status) ───────────────────────────────────────────────────────────────────


def suspension(b: Boutique, exemple: bool) -> dict | None:
    """Suspension en cours (vendeur_croissance.services.suspension) ; sans elle : celle de la boutique (sanction de
    niveau 3, Boutique.suspendue_depuis). exemple=1 sur une boutique non suspendue : un exemple marqué exemple: true,
    valeurs lues au registre (VD-SAN-SUSPENSION, VD-PROBATOIRE)."""
    ps = parametres.sanctions()
    en_cours = len(a_preparer(b))
    s = None
    try:
        from apps.vendeur_croissance.services import suspension as de_croissance
    except ImportError:
        de_croissance = None
    if de_croissance is not None:
        s = de_croissance(b)
    elif b.suspendue_depuis is not None:
        s = {
            "niveau": 3,
            "depuis": ms(b.suspendue_depuis),
            "motif": "",
            "decision": "",
            "contestation": None,
            "reponseHeuresOuvrees": parametres.contestation_reponse(),
            "scoreGeleSous": ps.suspension_sous_score,
            "controleProbatoire": ps.probatoire_commandes,
            "preparerEnCours": en_cours,
            "exemple": False,
        }
    if s is not None or not exemple or b.suspendue_depuis is not None:
        return s
    return {
        "niveau": 3,
        "depuis": ms(horloge.maintenant() - timedelta(days=3)),
        "motif": f"{ps.non_preparations} commandes non préparées en {ps.non_preparations_jours} jours, sans rupture signalée.",
        "decision": "",
        "contestation": None,
        "reponseHeuresOuvrees": parametres.contestation_reponse(),
        "scoreGeleSous": ps.suspension_sous_score,
        "controleProbatoire": ps.probatoire_commandes,
        "preparerEnCours": en_cours,
        "exemple": True,
    }


# ── File hors connexion ────────────────────────────────────────────────────────────────────────────────


def _expiree(a: ActionEnFile, t) -> bool:
    return a.etat == ActionEnFile.Etat.EN_ATTENTE and t - a.origine > timedelta(hours=parametres.file_hors_ligne())


def action_json(a: ActionEnFile, t=None) -> dict:
    t = t or horloge.maintenant()
    return {
        "id": str(a.pk),
        "type": a.type,
        "objet": a.objet,
        "detail": a.detail,
        "origine": ms(a.origine),
        "lieu": a.lieu or None,
        "auteur": a.auteur,
        "etat": "expiree" if _expiree(a, t) else a.etat,
        "motif": a.motif or None,
    }


def actions(b: Boutique) -> list[dict]:
    t = horloge.maintenant()
    return [action_json(a, t) for a in ActionEnFile.objects.filter(boutique=b)]


def file(b: Boutique) -> dict:
    e = etat(b)
    return {
        "actions": actions(b),
        "heures": parametres.file_hors_ligne(),
        "horsLigneDepuis": ms(e.hors_ligne_depuis) if e.hors_ligne_depuis else None,
        "dernierEnvoi": e.dernier_envoi,
    }


def lieu(b: Boutique) -> str:
    return (b.quartier.split(" / ")[-1] if b.quartier else "") or b.zone


def mettre_en_file(b: Boutique, m: Membre, type_: str, objet: str, detail: dict | None, origine_ms: int | None, lieu_: str | None) -> dict:
    t = horloge.maintenant()
    origine = depuis_ms(origine_ms) if origine_ms else t
    origine = min(origine, t)  # jamais dans le futur
    a = ActionEnFile.objects.create(
        boutique=b, membre=m, auteur=m.prenom, type=type_, objet=objet[:200], detail=detail, origine=origine, lieu=(lieu_ or lieu(b))[:120]
    )
    return action_json(a, t)


def _pret(b: Boutique, m: Membre, ref: str, a: ActionEnFile) -> str | None:
    """« C'est prêt » rejoué : vendeur_commandes.services.cest_pret(b, membre, ref, origine_ms) s'il est là (code de
    remise, passage du livreur) ; sinon sur le socle (prete_a à l'heure d'origine, colis avancé, journal signé)."""
    try:
        from apps.vendeur_commandes.services import cest_pret
    except ImportError:
        cest_pret = None
    if cest_pret is not None:
        try:
            r = cest_pret(b, m, ref, origine_ms=ms(a.origine))
        except ErreurClient as e:
            return e.code
        return None if r.get("ok") else r.get("raison", "refusee")
    return _pret_socle(b, m, ref, a)


def _pret_socle(b: Boutique, m: Membre, ref: str, a: ActionEnFile) -> str | None:
    with transaction.atomic():
        c = socle.commande(b, ref, verrou=True)
        if c is None:
            return "introuvable"
        if c.annulee_a is not None:
            return "annulee"
        if c.prete_a is not None:
            return "deja_prete"
        c.prete_a = a.origine
        c.save(update_fields=["prete_a"])
        socle.avancer_colis(c, "suborder.ready")
        socle.journaliser(c, m, "« C'est prêt »", detail="Envoyé au retour du réseau", a=a.origine)
    return None


def _rejouer(b: Boutique, m: Membre, a: ActionEnFile) -> str | None:
    """Rend None si l'action est appliquée, sinon la raison du refus."""
    d = a.detail or {}
    if a.type == "pret":
        return _pret(b, m, a.objet, a)
    if a.type == "stock":
        o = Offre.objects.filter(pk=d.get("offreId") or 0, boutique=b).first() if str(d.get("offreId", "")).isdigit() else None
        if o is None or d.get("stock") is None:
            return "introuvable"
        o.stock = max(0, int(d["stock"]))
        o.save(update_fields=["stock", "maj_le"])
        if o.product_id:
            socle.publier_produit(o)
        return None
    if a.type == "masquer":
        if str(d.get("offreId", "")).isdigit():  # masquer un produit : l'offre passe en pause
            o = Offre.objects.filter(pk=d["offreId"], boutique=b).first()
            if o is None:
                return "introuvable"
            o.etat = Offre.Etat.EN_PAUSE
            o.save(update_fields=["etat", "maj_le"])
            if o.product_id:
                socle.publier_produit(o)
            return None
        masquer_alerte(b)  # sinon : l'alerte avant un seuil (comme la démonstration)
        return None
    if a.type in ("fermer", "rouvrir"):
        jour = services.jour_y(a.origine)
        if a.type == "fermer":
            if jour == horloge.aujourd_hui():
                b.fermee_le = jour
        elif b.fermee_le == horloge.aujourd_hui():
            b.fermee_le = None
        b.save(update_fields=["fermee_le"])
        return None
    return None  # photo : envoyée par sa propre route, avec son heure et son lieu d'origine


def envoyer_file(b: Boutique, m: Membre) -> dict:
    t = horloge.maintenant()
    bilan = {"a": ms(t), "envoyees": 0, "expirees": 0, "refusees": 0}
    for a in ActionEnFile.objects.filter(boutique=b).order_by("origine", "id"):
        if _expiree(a, t) or a.etat == ActionEnFile.Etat.EXPIREE:
            if a.etat != ActionEnFile.Etat.EXPIREE:
                a.etat = ActionEnFile.Etat.EXPIREE
                a.save(update_fields=["etat"])
            bilan["expirees"] += 1
            continue
        if a.etat == ActionEnFile.Etat.REFUSEE:
            continue
        raison = _rejouer(b, m, a)
        if raison:
            a.etat, a.motif = ActionEnFile.Etat.REFUSEE, MOTIFS_REJEU.get(raison, raison)
            a.save(update_fields=["etat", "motif"])
            bilan["refusees"] += 1
            socle.notifier(b, "message", "Action hors connexion refusée", f"{a.objet} : {a.motif}", "horsligne")
        else:
            a.delete()
            bilan["envoyees"] += 1
    e = etat(b)
    e.dernier_envoi, e.hors_ligne_depuis = bilan, None
    e.save(update_fields=["dernier_envoi", "hors_ligne_depuis"])
    return bilan


def retirer(b: Boutique, ident: str) -> bool:
    if not re.fullmatch(r"\d+", str(ident)):
        return False
    return ActionEnFile.objects.filter(boutique=b, pk=int(ident)).delete()[0] > 0


def noter_reseau(b: Boutique, depuis: int | None) -> None:
    e = etat(b)
    e.hors_ligne_depuis = depuis_ms(depuis) if depuis else None
    e.save(update_fields=["hors_ligne_depuis"])
