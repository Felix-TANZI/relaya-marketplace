# backend/apps/publicite/espace.py
# Publicité vue par l'espace vendeur (DP-59, AJ-P) : rend les types de espace-vendeur/src/donnees/domaines/publicite.ts
# (TableauPub, Campagne, ProduitAnnoncable, MouvementPub, Estimation, Recharge) et les refus attendus par l'écran
# (200 { ok: false, raison }). Aucune règle ici : services.py et belivay_moteurs.publicite décident (éligibilité,
# second prix + 1 F, places de la semaine, enchère hebdomadaire, remise flash, commission majorée, Boost, solde).
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from apps.client_core.erreurs import ErreurClient
from apps.client_core.temps import YAOUNDE, depuis_ms, ms
from apps.vendeur_core import horloge
from apps.vendeur_core import services as socle
from apps.vendeur_core.models import Boutique, Offre

from . import services as sv
from .models import Campagne, Mouvement

T, S = Campagne.Type, Campagne.Statut
ACCUEIL = {"une": T.A_LA_UNE, "carrousel": T.CARROUSEL}
BOOST = {"boost_24h": "24h", "boost_7j": "7j"}
SPONSORISE = {"recherche": "recherche", "categories": "categorie"}
EMPLACEMENTS = [*SPONSORISE, *ACCUEIL, *BOOST, "flash"]
SELECTION_HEURE, SELECTION_JOUR, SELECTION_DUREE_H = 8, 5, 24  # PARAMÈTRE À AJOUTER AU REGISTRE : créneau de la sélection
SEMAINES_MAX = 4
_RAISON = {"offre hors ligne": "pas_en_vente", "stock épuisé": "rupture", "litige en cours": "litige"}


def _resultat(raison: str) -> dict:
    return {"ok": False, "raison": raison}


def raisons(o: Offre, litiges: int | None = None) -> list[str]:
    """Motifs du moteur (texte) → codes de l'écran (RaisonInelegible)."""
    return [_RAISON.get(m) or ("score" if m.startswith("Trust Score") else "pas_en_vente") for m in sv.motifs(o, litiges)]


def emplacement_de(c: Campagne) -> str:
    if c.type == T.CLIC:
        return "categories" if c.lieu == "categorie" else "recherche"
    if c.type == T.BOOST:
        return "boost_7j" if c.duree == "7j" else "boost_24h"
    return {T.A_LA_UNE: "une", T.CARROUSEL: "carrousel"}.get(c.type, "flash")


def _vue_offre(o: Offre) -> dict:
    from apps.vendeur_croissance.promotions import _offre_vue

    return _offre_vue(o)


def _lundi(t: datetime):
    return sv._semaine(sv._jour(t))


def selections_flash(t: datetime | None = None) -> list[int]:
    """Deux prochains créneaux de la sélection flash (le samedi, 08 h, pour 24 h), au moins 24 h après maintenant :
    BelivaY répond avant le créneau."""
    t = t or horloge.maintenant()
    j, out = sv._jour(t), []
    while len(out) < 2:
        j += timedelta(days=1)
        debut = datetime(j.year, j.month, j.day, SELECTION_HEURE, tzinfo=YAOUNDE)
        if j.weekday() == SELECTION_JOUR and debut - t >= timedelta(hours=24):
            out.append(ms(debut))
    return out


def regles(b: Boutique) -> dict:
    pp = sv.p()
    num = socle.numero_court(b) or {"operateur": b.numero_operateur, "masque": ""}
    return {
        "scoreMin": pp.trust_min,
        "clicPlancher": pp.clic_plancher,
        "budgetJourMin": pp.budget_min,
        "densiteMaxPourCent": float(pp.part_max_pour_cent),
        "annoncesMax": pp.max_par_fenetre,
        "fenetre": pp.fenetre,
        "uneSemaine": pp.a_la_une.tarif_semaine,
        "unePlaces": pp.a_la_une.places,
        "uneEnchereMin": pp.a_la_une.enchere_min,
        "carrouselSemaine": pp.carrousel.tarif_semaine,
        "carrouselPlaces": pp.carrousel.places,
        "carrouselEnchereMin": pp.carrousel.enchere_min,
        "flashMajorationPoints": float(pp.flash_points),
        "flashRemiseMin": float(pp.flash_remise_min_pour_cent),
        "boost24h": pp.boost_24h,
        "boost7j": pp.boost_7j,
        "boostPlafond": str(pp.boost_plafond).replace(".", ","),
        "rechargeMin": pp.recharge_min,
        "numero": {"operateur": num["operateur"], "masque": num["masque"]},
    }


# ── Calculs partagés par l'estimation et la vue ───────────────────────────────────────────────────────


def cout_clic(b: Boutique, enchere: int, sauf: int | None = None) -> int | None:
    """Coût du clic au second prix face aux campagnes au clic actives des autres boutiques ; None : hors des places."""
    pub, pp = sv._m(), sv.p()
    autres = Campagne.objects.filter(type=T.CLIC, statut=S.ACTIVE).exclude(boutique=b).exclude(pk=sauf)
    demandes = [pub.Enchere("nous", enchere, 0), *(pub.Enchere(str(c.pk), c.enchere, c.pk) for c in sv._eligibles(autres))]
    return next((g.cout for g in pub.encheres_au_clic(demandes, pp.max_par_fenetre, pp) if g.campagne == "nous"), None)


def _flash(b: Boutique, o: Offre, prix_flash: int) -> dict:
    """Remise affichée, commission majorée et « Vous gardez » d'une vente au prix flash ; refus du moteur."""
    from apps.vendeur_catalogue.services import categorie_de
    from apps.vendeur_core import parametres as pv
    from belivay_moteurs.commission import LigneVendue, famille_de
    from belivay_moteurs.erreurs import AnnonceRefusee, OffreRefusee

    pub, pc = sv._m(), pv.commission()
    avant = socle.garde(
        [{"categorie": categorie_de(o), "prix": o.prix, "quantite": 1, "madeInCameroon": o.made_in_cameroon}],
        b.palier,
        socle.decouverte(b)["active"],
    )
    r = {
        "prixPromo": prix_flash,
        "remiseAffichee": 0,
        "commissionNormale": 0,
        "majoration": 0,
        "commission": 0,
        "gardeAvant": avant.garde,
        "gardeFlash": 0,
    }
    try:
        r["remiseAffichee"] = pub.verifier_remise_flash(o.prix, prix_flash, sv.p())
    except AnnonceRefusee:
        return {**r, "refus": "remise_min"}
    try:
        lv = LigneVendue(famille_de(categorie_de(o), pc), prix_flash, 1, o.made_in_cameroon)
        f = pub.commission_vente_flash([lv], b.palier, socle.decouverte(b)["active"], pc, sv.p())
    except OffreRefusee:
        return {**r, "refus": "garde_negatif"}
    return {
        **r,
        "commissionNormale": f.commission_normale,
        "majoration": f.commission - f.commission_normale,
        "commission": f.commission,
        "gardeFlash": f.garde,
        "refus": None,
    }


def prix_flash(prix: int, remise: int) -> int:
    return max(1, prix * (100 - max(0, min(99, remise))) // 100)


# ── Vues ──────────────────────────────────────────────────────────────────────────────────────────────


def produits(b: Boutique) -> list[dict]:
    litiges = sv.litiges_en_cours(b)
    out = []
    for o in b.offres.select_related("fiche", "boutique").exclude(etat=Offre.Etat.BROUILLON).filter(supprimee_le__isnull=True):
        f = o.fiche
        out.append(
            {
                **_vue_offre(o),
                "rayon": (f.rayon if f else "") or "",
                "prix": o.prix or 0,
                "stock": o.stock,
                "trustScore": float(b.trust_score),
                "litiges": litiges,
                "note": 0,
                "raisons": raisons(o, litiges),
            }
        )
    return out


def _etat(c: Campagne, t: datetime, rs: list[str]) -> str:
    if c.statut == S.REFUSEE:
        return "refusee"
    if c.statut == S.TERMINEE or (c.fin and c.fin <= t):
        return "terminee"
    if c.statut == S.EN_ATTENTE:
        return "candidature"
    if c.debut and c.debut > t:
        return "programmee"
    return "en_pause" if c.statut == S.PAUSE or rs else "en_cours"


def campagne_vue(c: Campagne, t: datetime | None = None, litiges: int | None = None) -> dict:
    t = t or horloge.maintenant()
    o, b = c.offre, c.boutique
    rs = raisons(o, litiges)
    e = _etat(c, t, rs)
    st = sv.stats(c)
    repetes = c.clics.aggregate(s=Sum("repetitions"))["s"] or 0
    forfait = c.prix if c.type in (T.A_LA_UNE, T.CARROUSEL, T.BOOST) and c.prix else None
    prevues = faites = None
    if forfait and c.debut and c.fin:
        prevues, faites = sv._heures(c, min(t, c.fin))  # arrêtée : fin = l'arrêt (services.arreter)
    fl = _flash(b, o, c.prix_flash) if c.type == T.FLASH and c.prix_flash else None
    clic = c.type == T.CLIC
    return {
        "id": str(c.pk),
        "emplacement": emplacement_de(c),
        **_vue_offre(o),
        "prix": o.prix or 0,
        "etat": e,
        "debut": ms(c.debut or c.cree_le),
        "fin": ms(c.fin),
        "enchere": c.enchere,
        "mode": c.mode or None,
        "budgetJour": c.budget_quotidien,
        "depenseJour": sv._depense_du_jour(c, sv._jour(t)) if clic and e not in ("terminee", "refusee") else None,
        "coutClic": cout_clic(b, c.enchere, c.pk) if clic and c.enchere else None,
        "semaines": 1 if c.type in (T.A_LA_UNE, T.CARROUSEL) else None,
        "forfait": forfait,
        "heuresPrevues": prevues,
        "heuresDiffusees": faites,
        "remisePourCent": fl["remiseAffichee"] if fl else None,
        "prixPromo": c.prix_flash,
        "gardeFlash": fl["gardeFlash"] if fl else None,
        "gardeAvant": fl["gardeAvant"] if fl else None,
        "stats": {
            "impressions": st["impressions"],
            "clics": st["clics"] + repetes,
            "clicsNonFactures": st["clics"] + repetes - st["clicsFactures"],
            "ventes": st["ventes"],
            "depense": st["depense"],
            "rembourse": c.rembourse,
        },
        "motif": c.motif or (rs[0] if e == "en_pause" and c.statut != S.PAUSE else None),
    }


def campagnes(b: Boutique) -> list[dict]:
    t, litiges = horloge.maintenant(), sv.litiges_en_cours(b)
    return [campagne_vue(c, t, litiges) for c in b.campagnes_pub.select_related("offre__fiche", "offre__boutique", "boutique")]


def _depenses_depuis(b: Boutique, depuis: datetime) -> int:
    q = b.mouvements_pub.filter(a__gte=depuis, statut=Mouvement.Statut.CONFIRME).exclude(type=Mouvement.Type.RECHARGE)
    return -(q.aggregate(s=Sum("montant"))["s"] or 0)


def tableau(b: Boutique) -> dict:
    t = horloge.maintenant()
    j = sv._jour(t)
    cs = campagnes(b)
    semaine = [c for c in cs if (c["fin"] is None or c["fin"] >= ms(t - timedelta(days=7))) and c["debut"] <= ms(t)]
    st = {k: sum(c["stats"][k] for c in semaine) for k in ("impressions", "clics", "clicsNonFactures", "ventes", "depense", "rembourse")}
    from belivay_moteurs.argent import francs

    return {
        "solde": sv.compte(b).solde,
        "depensesJour": _depenses_depuis(b, datetime(j.year, j.month, j.day, tzinfo=YAOUNDE)),
        "depensesSemaine": _depenses_depuis(b, t - timedelta(days=7)),
        "semaine": st,
        "coutParVente": francs(Decimal(st["depense"]) / st["ventes"]) if st["ventes"] else None,
        "actives": sum(c["etat"] in ("en_cours", "programmee", "candidature") for c in cs),
        "selectionsFlash": selections_flash(t),
        "regles": regles(b),
    }


def mouvements(b: Boutique) -> list[dict]:
    """Solde prépayé : recharges confirmées, dépenses, heures rendues ; référence de la facture du mois."""
    out = []
    for mv in b.mouvements_pub.filter(statut=Mouvement.Statut.CONFIRME):
        a = mv.a.astimezone(YAOUNDE)
        type_ = mv.type if mv.type in (Mouvement.Type.RECHARGE, Mouvement.Type.REMBOURSEMENT) else "depense"
        fac = None if type_ == "recharge" else f"BLV-PUB-{a:%Y%m}-{b.pk}"
        out.append({"id": str(mv.pk), "le": ms(mv.a), "type": type_, "montant": mv.montant, "libelle": mv.libelle, "facture": fac})
    return out


def recharge_vue(mv: Mouvement) -> dict:
    return {"id": str(mv.pk), "montant": mv.montant, "envoyeeA": ms(mv.a), "statut": mv.statut}


def recharge(b: Boutique, id_) -> Mouvement | None:
    return b.mouvements_pub.filter(type=Mouvement.Type.RECHARGE, pk=id_).first() if str(id_).isdigit() else None


def annuler_recharge(b: Boutique, id_) -> None:
    """Demande abandonnée par le vendeur (rien n'a été crédité) ; une confirmée ne change pas."""
    b.mouvements_pub.filter(type=Mouvement.Type.RECHARGE, pk=id_ if str(id_).isdigit() else 0, statut=Mouvement.Statut.EN_ATTENTE).update(
        statut=Mouvement.Statut.REFUSE
    )


# ── Estimation et création (même calcul) ──────────────────────────────────────────────────────────────


def _deja(o: Offre, d: dict, debut: datetime | None) -> bool:
    em = d["emplacement"]
    q = Campagne.objects.filter(offre=o, statut__in=[S.ACTIVE, S.PAUSE, S.EN_ATTENTE]).exclude(fin__lte=horloge.maintenant())
    if em in SPONSORISE:
        return q.filter(type=T.CLIC, lieu__in=["", SPONSORISE[em]]).exists()
    if em in BOOST:
        return q.filter(type=T.BOOST).exists()
    if em == "flash":
        return q.filter(type=T.FLASH, debut=debut).exists()
    return q.filter(type=ACCUEIL[em], semaine=_lundi(debut)).exists()


def _semaines(d: dict, t: datetime) -> list[datetime]:
    """Instants de début de chaque semaine réservée (tarif fixe : semaine du début demandé puis les suivantes)."""
    debut = max(t, depuis_ms(d.get("debut")) or t)
    lundi = sv._debut_semaine(_lundi(debut))
    return [max(debut, lundi + timedelta(days=7 * i)) for i in range(d.get("semaines") or 1)]


def estimer(b: Boutique, d: dict) -> dict:
    from belivay_moteurs.erreurs import AnnonceRefusee

    pub, pp = sv._m(), sv.p()
    t = horloge.maintenant()
    solde = sv.compte(b).solde
    base = {
        "refus": None, "aPayer": 0, "plafondJour": None, "clicsJourMax": None, "impressionsEstimees": [0, 0],
        "clicsEstimes": [0, 0], "solde": solde, "coutClic": None, "placesRestantes": None, "enchereMax": None,
        "apercu": [], "flash": None,
    }  # fmt: skip
    em = d["emplacement"]
    oid = str(d.get("offreId") or "")
    o = Offre.objects.select_related("boutique", "fiche").filter(boutique=b, pk=oid).first() if oid.isdigit() else None
    if o is None:
        return {**base, "refus": "pas_en_vente"}
    rs = raisons(o)

    def qualite(r: dict, debut: datetime | None = None) -> dict:
        if r["refus"]:
            return r
        if rs:
            return {**r, "refus": rs[0]}
        return {**r, "refus": "deja_active"} if _deja(o, d, debut) else r

    if em in SPONSORISE:
        enchere, budget = d.get("enchere") or 0, d.get("budgetJour") or 0
        cout = cout_clic(b, enchere) if enchere > 0 else None
        r = {**base, "coutClic": cout, "plafondJour": budget, "clicsJourMax": budget // cout if cout else 0}
        try:
            pub.verifier_enchere_clic(enchere, budget, pp)
        except AnnonceRefusee:
            return {**r, "refus": "sous_plancher" if enchere < pp.clic_plancher else "budget_min"}
        r = qualite(r)
        return r if r["refus"] or solde >= (cout or enchere) else {**r, "refus": "solde_insuffisant"}
    if em == "flash":
        debut = depuis_ms(d.get("debut"))
        if debut is None or ms(debut) not in selections_flash(t):
            return {**base, "refus": "etat"}
        f = _flash(b, o, prix_flash(o.prix, d.get("remisePourCent") or 0))
        refus = f.pop("refus")
        r = {**base, "flash": f}
        return {**r, "refus": refus} if refus else qualite(r, debut)
    if em in BOOST:
        a_payer = pub.prix_boost(pub.DureeBoost(BOOST[em]), pp)
        r = qualite({**base, "aPayer": a_payer})
        return r if r["refus"] or solde >= a_payer else {**r, "refus": "solde_insuffisant"}
    regle = pub.regle_emplacement(ACCUEIL[em], pp)
    if d.get("mode") == "enchere":
        # Enchère hebdomadaire : semaine suivante seulement ; rien n'est pris maintenant (le solde doit la couvrir).
        lundi = _lundi(t) + timedelta(days=7)
        enchere = d.get("enchere") or 0
        r = qualite(
            {**base, "enchereMax": enchere, "placesRestantes": max(0, sv.places_restantes(ACCUEIL[em], lundi))}, sv._debut_semaine(lundi)
        )
        if enchere < regle.enchere_min:
            return {**r, "refus": "enchere_min"}
        if r["refus"] or not r["placesRestantes"]:
            return r if r["refus"] else {**r, "refus": "complet"}
        return r if solde >= enchere else {**r, "refus": "solde_insuffisant"}
    n = d.get("semaines") or 1
    if not 1 <= n <= SEMAINES_MAX:
        return {**base, "refus": "semaines"}
    debuts = _semaines(d, t)
    a_payer = sum(
        pub.remboursement_non_diffuse(regle.tarif_semaine, 168, max(0, int((x - sv._debut_semaine(_lundi(x))).total_seconds() // 3600)))
        for x in debuts
    )
    restantes = min(sv.places_restantes(ACCUEIL[em], _lundi(x)) for x in debuts)
    r = qualite({**base, "aPayer": a_payer, "placesRestantes": max(0, restantes)}, debuts[0])
    if r["refus"]:
        return r
    if restantes <= 0:
        return {**r, "refus": "complet"}
    return r if solde >= a_payer else {**r, "refus": "solde_insuffisant"}


_CODES = {"solde_insuffisant": "solde_insuffisant", "complet": "complet", "deja": "deja_active", "not_found": "pas_en_vente"}


def creer(b: Boutique, d: dict) -> dict:
    """Confirmation : refus de l'estimation, sinon la campagne par services.py (forfait débité, enchère ou candidature
    en attente)."""
    est = estimer(b, d)
    if est["refus"]:
        return _resultat(est["refus"])
    em, oid = d["emplacement"], d["offreId"]
    o = Offre.objects.select_related("fiche").get(boutique=b, pk=oid)
    try:
        with transaction.atomic():
            if em in SPONSORISE:
                c = sv.creer_clic(b, oid, d["enchere"], d["budgetJour"], SPONSORISE[em])
            elif em in BOOST:
                c = sv.booster(b, oid, BOOST[em])
            elif em == "flash":
                debut = depuis_ms(d["debut"])
                c = sv.proposer_flash(
                    b, oid, prix_flash(o.prix, d["remisePourCent"]), debut, debut + timedelta(hours=SELECTION_DUREE_H), o.stock
                )
            elif d.get("mode") == "enchere":
                lundi = _lundi(horloge.maintenant()) + timedelta(days=7)
                c = sv.reserver_emplacement(b, ACCUEIL[em], oid, "enchere", lundi, d["enchere"], o.titre)
            else:
                semaines = _semaines(d, horloge.maintenant())
                c = [sv.reserver_emplacement(b, ACCUEIL[em], oid, "fixe", sv._jour(x), None, o.titre) for x in semaines][0]
    except ErreurClient as exc:
        return _resultat(_CODES.get(exc.code, "etat"))
    return {"ok": True, "campagne": campagne_vue(sv.campagne(b, c["id"]))}


def reprendre(b: Boutique, id_) -> dict:
    c = sv.campagne(b, id_)
    if c.type != T.CLIC or c.statut != S.PAUSE:
        return _resultat("etat")
    rs = raisons(c.offre)
    if rs:
        return _resultat(rs[0])
    if sv.compte(b).solde < (cout_clic(b, c.enchere, c.pk) or c.enchere):
        return _resultat("solde_insuffisant")
    sv.mettre_en_pause(b, id_, False)
    return {"ok": True}


def changer_enchere(b: Boutique, id_, enchere: int, budget: int) -> dict:
    from belivay_moteurs.erreurs import AnnonceRefusee

    c = sv.campagne(b, id_)
    if c.type != T.CLIC or c.statut not in (S.ACTIVE, S.PAUSE):
        return _resultat("etat")
    pp = sv.p()
    try:
        sv._m().verifier_enchere_clic(enchere, budget, pp)
    except AnnonceRefusee:
        return _resultat("sous_plancher" if enchere < pp.clic_plancher else "budget_min")
    c.enchere, c.budget_quotidien = enchere, budget
    c.save(update_fields=["enchere", "budget_quotidien"])
    return {"ok": True}
