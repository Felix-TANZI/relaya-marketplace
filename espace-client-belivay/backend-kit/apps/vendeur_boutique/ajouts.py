# backend/apps/vendeur_boutique/ajouts.py
# Pages ajoutées (DP-58) servies par vendeur_boutique : Questions des clients (AJ-A) et Apprendre (AJ-B).
# Types : espace-vendeur/src/pages/AJ-A/donnees/types.ts (DomaineQuestions) ; démonstration : …/AJ-A/donnees/demo.ts et
# …/AJ-B/donnees-ajb.ts (comportement de référence).
#   - Questions : client anonyme, boutique jamais nommée (GEN-01, VD11-R10) ; coordonnées refusées, même filtre que la
#     messagerie (VD11-R59) ; réponse publique réservée au propriétaire (Q-17) ; signalement relu sous 48 h
#     (VD-MODERATION). poser_question(offre, texte) : pour le kit client (fiche produit).
#   - Apprendre : étapes cochées, PAR MEMBRE (ProfilMembre.apprendre, « fiche:étape »).
from datetime import timedelta

from apps.client_core.temps import ms
from apps.vendeur_core import echanges, horloge
from apps.vendeur_core.models import Boutique, Membre, Offre

from . import services as s
from .models import ModeleReponseQuestion, QuestionProduit

OBJECTIF_H = 24  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-QUESTION-OBJECTIF (répondre en moins de 24 h, proposé)
REPONSE_MIN, REPONSE_MAX = 10, 600
MODELES_MAX = 10  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-MODELES-MAX (proposé)
TITRE_MIN, TITRE_MAX = 2, 40
RELECTURE_SIGNALEMENT_H = 48  # VD-MODERATION
MOTIFS = ("coordonnees", "insulte", "hors_sujet", "concurrence", "autre")
MODELES_BELIVAY = [
    {
        "id": "mb-boite",
        "titre": "Contenu de la boîte",
        "texte": "Bonjour, l’article est neuf, dans sa boîte d’origine, avec les accessoires indiqués sur la fiche. Le livreur le contrôle devant moi avant de le sceller.",
        "propre": False,
    },
    {
        "id": "mb-dispo",
        "titre": "Disponibilité",
        "texte": "Bonjour, il est disponible : le stock affiché sur la fiche est le stock réel. Vous pouvez commander dès maintenant.",
        "propre": False,
    },
    {
        "id": "mb-livraison",
        "titre": "Livraison",
        "texte": "Bonjour, la date de livraison et le relais vous sont donnés au moment de payer. Je prépare la commande le jour même.",
        "propre": False,
    },
    {
        "id": "mb-retour",
        "titre": "Retour",
        "texte": "Bonjour, vous avez 7 jours après le retrait pour le retourner, article non utilisé, avec sa boîte et ses accessoires.",
        "propre": False,
    },
]


def _offre_vue(o: Offre) -> dict:
    photo = o.photos_reelles.order_by("rang", "id").first() if hasattr(o, "photos_reelles") else None
    from apps.vendeur_catalogue.services import photo_json

    dessin = photo_json(photo)["image"] if photo is not None else ((o.fiche.dessin if o.fiche_id else "") or "itel")
    return {"offreId": str(o.pk), "titre": o.titre, "variante": o.variante, "dessin": dessin}


def question_json(q: QuestionProduit) -> dict:
    etat = "signalee" if q.signalement else "repondue" if q.reponse else "a_repondre"
    return {
        "id": str(q.pk),
        **_offre_vue(q.offre),
        "texte": s.propre_pour_vendeur(q.texte),
        "poseeA": ms(q.posee_a),
        "etat": etat,
        "reponse": {"texte": q.reponse, "a": ms(q.reponse_a), "auteur": q.reponse_par} if q.reponse else None,
        "signalement": {
            "motif": q.signalement,
            "a": ms(q.signalee_a),
            "relueAvant": ms(q.signalee_a + timedelta(hours=RELECTURE_SIGNALEMENT_H)),
        }
        if q.signalement
        else None,
        "utile": q.utile,
    }


def _questions(b: Boutique):
    return QuestionProduit.objects.filter(offre__boutique=b).select_related("offre", "offre__fiche")


def liste(b: Boutique) -> dict:
    qs = [question_json(q) for q in _questions(b)]
    ordre = {"a_repondre": 0, "repondue": 1, "signalee": 2}
    # Sans réponse d'abord, la plus ancienne en tête ; puis le plus récent.
    qs.sort(key=lambda q: (ordre[q["etat"]], q["poseeA"] if q["etat"] == "a_repondre" else -q["poseeA"]))
    t = horloge.maintenant_ms()
    repondues = [q for q in qs if q["reponse"] and q["reponse"]["a"] > t - 30 * 86_400_000]
    compte = {e: sum(1 for q in qs if q["etat"] == e) for e in ordre}
    return {
        "questions": qs,
        "compteurs": {**compte, "toutes": len(qs)},
        "delaiMoyenMs": round(sum(q["reponse"]["a"] - q["poseeA"] for q in repondues) / len(repondues)) if repondues else None,
        "objectifH": OBJECTIF_H,
        "plusAncienne": next((q["poseeA"] for q in qs if q["etat"] == "a_repondre"), None),
    }


def filtrer(texte: str) -> dict:
    propre, filtre = s.filtrer(texte or "")
    return {"propre": s.propre_pour_vendeur(propre), "filtre": filtre}


def _question(b: Boutique, ident) -> QuestionProduit | None:
    return _questions(b).filter(pk=int(ident)).first() if str(ident).isdigit() else None


def repondre(b: Boutique, membre: Membre, ident, texte: str) -> dict:
    if not membre.proprietaire:
        return s.non("reserve")  # réponse publique : propriétaire seulement (Q-17)
    q = _question(b, ident)
    if q is None or q.reponse or q.signalement:
        return s.non("deja")
    t = (texte or "").strip()
    if len(t) < REPONSE_MIN:
        return s.non("court")
    if len(t) > REPONSE_MAX:
        return s.non("long")
    if s.filtrer(t)[1]:
        return s.non("coordonnees")
    q.reponse, q.reponse_a, q.reponse_par = t, horloge.maintenant(), membre.signature
    q.save(update_fields=["reponse", "reponse_a", "reponse_par"])
    echanges.emettre(
        b, "sortant", "client", "reponse_question", "question.answered", {"questionId": str(q.pk), "texte": t}, "messages.repondre"
    )
    return s.ok(question=question_json(q))


def signaler(b: Boutique, ident, motif: str) -> dict:
    if motif not in MOTIFS:
        return s.non("motif")
    q = _question(b, ident)
    if q is None or q.signalement:
        return s.non("deja")
    q.signalement, q.signalee_a = motif, horloge.maintenant()
    q.save(update_fields=["signalement", "signalee_a"])
    return s.ok(question=question_json(q))


def modeles(b: Boutique) -> list[dict]:
    propres = [{"id": f"mp-{m.pk}", "titre": m.titre, "texte": m.texte, "propre": True} for m in b.modeles_reponse.all()]
    return [*propres, *MODELES_BELIVAY]


def enregistrer_modele(b: Boutique, membre: Membre, titre: str, texte: str) -> dict:
    if not membre.proprietaire:
        return s.non("reserve")
    ti, tx = (titre or "").strip(), (texte or "").strip()
    if not TITRE_MIN <= len(ti) <= TITRE_MAX:
        return s.non("titre")
    if not REPONSE_MIN <= len(tx) <= REPONSE_MAX:
        return s.non("court")
    if s.filtrer(tx)[1]:
        return s.non("coordonnees")
    if b.modeles_reponse.count() >= MODELES_MAX:
        return s.non("max")
    m = ModeleReponseQuestion.objects.create(boutique=b, titre=ti, texte=tx)
    return s.ok(modele={"id": f"mp-{m.pk}", "titre": m.titre, "texte": m.texte, "propre": True})


def supprimer_modele(b: Boutique, membre: Membre, ident: str) -> None:
    if membre.proprietaire and str(ident).startswith("mp-") and ident[3:].isdigit():
        b.modeles_reponse.filter(pk=int(ident[3:])).delete()


def poser_question(o: Offre, texte: str) -> QuestionProduit:
    """Pour le kit client (fiche produit) : la question arrive déjà filtrée, sans le client (GEN-01)."""
    propre, _ = s.filtrer(texte or "")
    q = QuestionProduit.objects.create(offre=o, texte=propre[:REPONSE_MAX], posee_a=horloge.maintenant())
    echanges.emettre(
        o.boutique,
        "entrant",
        "client",
        "question",
        "question.asked",
        {"questionId": str(q.pk), "offreId": str(o.pk), "texte": s.propre_pour_vendeur(q.texte)},
        "messages.repondre",
    )
    return q


# ── Apprendre (AJ-B) ───────────────────────────────────────────────────────────────────────────────────


def progression(membre: Membre) -> list[str]:
    return list(s.profil_de(membre).apprendre or [])


def cocher(membre: Membre, fiche: str, etape, fait: bool) -> list[str] | None:
    if not str(fiche).isidentifier() or isinstance(etape, bool) or not isinstance(etape, int) or not 0 <= etape < 50:
        return None
    p = s.profil_de(membre)
    cle = f"{fiche}:{etape}"
    faites = [c for c in (p.apprendre or []) if c != cle] + ([cle] if fait else [])
    p.apprendre = faites
    p.save(update_fields=["apprendre"])
    return faites


def recommencer(membre: Membre, fiche: str) -> list[str]:
    p = s.profil_de(membre)
    p.apprendre = [c for c in (p.apprendre or []) if not c.startswith(f"{fiche}:")]
    p.save(update_fields=["apprendre"])
    return p.apprendre


# ── Rechercher partout (AJ-B) et activité de la boutique ──────────────────────────────────────────────────

RESULTATS_MAX = 30


def rechercher(b: Boutique, membre: Membre, q: str) -> dict:
    """Commandes (référence, article), produits, litiges et retours, versements (propriétaire) : jamais une donnée du
    client (rien du client n'est cherché) ; une référence exacte passe en tête ; chaque famille selon les droits."""
    from apps.vendeur_catalogue.services import mots, normaliser
    from apps.vendeur_core.droits import droits_de
    from apps.vendeur_core.models import CommandeVendeur

    droits = set(droits_de(membre))
    m = mots(q)
    net = normaliser(q).replace(" ", "")
    out: list[dict] = []

    def trouve(texte: str) -> bool:
        return bool(m) and all(x in normaliser(texte) for x in m)

    if "commandes.voir" in droits:
        for c in CommandeVendeur.objects.filter(boutique=b).order_by("-payee_a")[:500]:
            articles = " ".join(f"{lg.get('titre', '')} {lg.get('variante', '')}" for lg in c.lignes or [])
            exact = normaliser(c.ref).replace(" ", "") == net
            if exact or trouve(f"{c.ref} {articles}"):
                titre = (c.lignes or [{}])[0].get("titre", "")
                out.append(
                    {
                        "cle": f"c-{c.ref}",
                        "vers": f"commande?ref={c.ref}",
                        "icone": "package",
                        "titre": c.ref,
                        "sous": titre,
                        "exact": exact,
                    }
                )
    if "produits.voir" in droits:
        for o in Offre.objects.filter(boutique=b, supprimee_le__isnull=True).select_related("fiche"):
            if trouve(f"{o.titre} {o.variante} {o.fiche.marque if o.fiche_id else ''}"):
                out.append(
                    {"cle": f"o-{o.pk}", "vers": f"offre_detail?id={o.pk}", "icone": "box", "titre": o.titre, "sous": o.variante or o.etat}
                )
    if "litiges.voir" in droits or "retours.inspecter" in droits:
        from apps.vendeur_litiges.models import Dossier

        for d in Dossier.objects.filter(boutique=b).select_related("commande"):
            ref = d.commande.ref
            if normaliser(ref).replace(" ", "") == net or trouve(f"{ref} {d.voie} {d.get_categorie_display()}"):
                route = f"litige?ref={ref}" if d.voie == Dossier.Voie.LITIGE else f"retour?ref={ref}"
                out.append(
                    {
                        "cle": f"d-{d.pk}",
                        "vers": route,
                        "icone": "scale",
                        "titre": f"{'Litige' if d.voie == 'litige' else 'Retour'} · {ref}",
                        "sous": d.get_categorie_display(),
                    }
                )
    if membre.proprietaire:
        from apps.vendeur_argent.models import Versement

        for v in Versement.objects.filter(boutique=b).order_by("-vendredi")[:200]:
            exact = normaliser(v.reference).replace(" ", "") == net
            if exact or trouve(f"{v.reference} {v.vendredi.isoformat()}"):
                out.append(
                    {
                        "cle": f"v-{v.reference}",
                        "vers": "versements",
                        "icone": "wallet",
                        "titre": v.reference,
                        "sous": v.vendredi.isoformat(),
                        "exact": exact,
                    }
                )
    out.sort(key=lambda r: not r.get("exact"))
    return {"q": q, "resultats": out[:RESULTATS_MAX]}


def activite(b: Boutique, limite: int = 200) -> list[dict]:
    """Journal signé de toutes les commandes et des gestes sur le stock (JRN-01, JRN-02, EQU-03), le plus récent
    d'abord ; lecture seule."""
    from apps.vendeur_catalogue.models import MouvementStock
    from apps.vendeur_commandes.services import entree_json
    from apps.vendeur_core.models import EntreeJournal

    lignes = [
        {**entree_json(e), "ref": e.commande.ref}
        for e in EntreeJournal.objects.filter(commande__boutique=b).select_related("commande").order_by("-a", "-id")[:limite]
    ]
    for mv in MouvementStock.objects.filter(offre__boutique=b).select_related("membre", "offre", "offre__fiche")[:limite]:
        lignes.append(
            {
                "a": ms(mv.a),
                "auteur": mv.auteur,
                "role": mv.membre.role if mv.membre else "systeme",
                "action": f"Stock : {mv.offre.titre} {mv.avant} → {mv.apres}",
                "ref": None,
            }
        )
    lignes.sort(key=lambda x: -x["a"])
    return lignes[:limite]
