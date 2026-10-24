# backend/apps/publicite/services.py
# Revenus publicitaires (DP-59). Tous les calculs par belivay_moteurs.publicite (éligibilité, enchères, emplacements,
# vente flash, Boost, solde, facture) avec les paramètres VD-PUB-* du registre ; la densité (placer_annonces) est
# appliquée par le site, qui connaît l'ordre des résultats, avec les règles rendues par placements().
#
# Vendeur (propriétaire) : aperçu, recharge du solde (Mobile Money confirmée par le webhook : confirmer_recharge),
# campagnes au clic, emplacements de la semaine (tarif fixe ou enchère, attribuée par attribuer_semaine), Boost,
# proposition à la sélection flash (acceptée par la console : selectionner_flash), arrêt avec remboursement des
# heures non diffusées, statistiques et facture du mois.
# Client : annonces à mêler aux résultats (placements), emplacements de l'accueil (accueil), clic (cliquer) ; vente
# attribuée au dernier clic du client dans les 7 jours et commission flash majorée (a_l_entree, appelée par
# vendeur_core.services.entrer).
import hashlib
import math
import random
import re
from datetime import date, datetime, timedelta

from django.apps import apps
from django.core import signing
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import F, Sum

from apps.client_core.erreurs import introuvable, refus
from apps.client_core.parametres import registre
from apps.client_core.temps import YAOUNDE, ms
from apps.vendeur_core import horloge
from apps.vendeur_core import parametres as parametres_vendeur
from apps.vendeur_core.models import Boutique, Offre

from .models import Campagne, Clic, Mouvement, Signalement, SoldePublicitaire

T = Campagne.Type
S = Campagne.Statut
SEL = "publicite.clic"
VENTE_JOURS = 7  # PARAMÈTRE À AJOUTER AU REGISTRE : fenêtre d'attribution d'une vente à un clic
PLACES_CLIC = 4  # annonces candidates rendues au site (il en montre 2 sur 10 au plus : VD-PUB-DENSITE)
# Emplacements où le site compte une impression (une par client, par campagne, par emplacement et par visite).
EMPLACEMENTS_VUS = ("recherche", "categorie", "accueil", "une", "carrousel", "flash", "boost")
ENCART_ACCUEIL = 2  # PARAMÈTRE À AJOUTER AU REGISTRE : produits de l'encart ordinateur (2, 4 ou 6 ; défaut 2)
VISITE_S = 12 * 3600  # PARAMÈTRE À AJOUTER AU REGISTRE : durée de vie d'une visite pour le compte des impressions


def p():
    from belivay_moteurs.registre import lire_publicite

    return lire_publicite(registre())


def _m():
    from belivay_moteurs import publicite

    return publicite


def _refus(exc) -> Exception:
    return refus("annonce_refusee", str(exc))


def _semaine(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _jour(t: datetime) -> date:
    return t.astimezone(YAOUNDE).date()


def _debut_semaine(lundi: date) -> datetime:
    return datetime(lundi.year, lundi.month, lundi.day, tzinfo=YAOUNDE)


# ── Solde ─────────────────────────────────────────────────────────────────────────────────────────────


def compte(b: Boutique) -> SoldePublicitaire:
    return SoldePublicitaire.objects.get_or_create(boutique=b)[0]


def _debiter(b: Boutique, montant: int, type_: str, libelle: str, campagne: Campagne | None = None) -> None:
    """Débit du solde (jamais au-delà : rien n'est pris sur les versements) et son mouvement."""
    from belivay_moteurs.erreurs import AnnonceRefusee

    s = SoldePublicitaire.objects.select_for_update().get(pk=compte(b).pk)
    try:
        s.solde = _m().debiter(s.solde, montant)
    except AnnonceRefusee as exc:
        raise refus("solde_insuffisant", str(exc), {"solde": s.solde, "manque": montant - s.solde}) from exc
    s.save(update_fields=["solde"])
    Mouvement.objects.create(boutique=b, campagne=campagne, type=type_, montant=-montant, libelle=libelle, a=horloge.maintenant())


def _crediter(b: Boutique, montant: int, libelle: str, campagne: Campagne) -> None:
    SoldePublicitaire.objects.filter(pk=compte(b).pk).update(solde=F("solde") + montant)
    Mouvement.objects.create(
        boutique=b, campagne=campagne, type=Mouvement.Type.REMBOURSEMENT, montant=montant, libelle=libelle, a=horloge.maintenant()
    )


def recharger(b: Boutique, montant: int) -> dict:
    """Demande Mobile Money envoyée au numéro du vendeur ; le solde n'est crédité qu'à la confirmation."""
    from belivay_moteurs.erreurs import AnnonceRefusee

    try:
        _m().recharger(0, montant, p())
    except AnnonceRefusee as exc:
        raise _refus(exc) from exc
    mv = Mouvement.objects.create(
        boutique=b,
        type=Mouvement.Type.RECHARGE,
        statut=Mouvement.Statut.EN_ATTENTE,
        montant=montant,
        libelle="Recharge Mobile Money",
        a=horloge.maintenant(),
    )
    return mouvement_json(mv)


@transaction.atomic
def confirmer_recharge(mouvement_id: int, reussi: bool) -> dict:
    """Webhook de l'agrégateur : confirmée, le solde est crédité ; rejouée : rien ne change."""
    mv = Mouvement.objects.select_for_update().select_related("boutique").get(pk=mouvement_id, type=Mouvement.Type.RECHARGE)
    if mv.statut == Mouvement.Statut.EN_ATTENTE:
        mv.statut = Mouvement.Statut.CONFIRME if reussi else Mouvement.Statut.REFUSE
        mv.save(update_fields=["statut"])
        if reussi:
            s = SoldePublicitaire.objects.select_for_update().get(pk=compte(mv.boutique).pk)
            s.solde = _m().recharger(s.solde, mv.montant, p())
            s.save(update_fields=["solde"])
    return mouvement_json(mv)


def mouvement_json(mv: Mouvement) -> dict:
    return {"id": str(mv.pk), "type": mv.type, "statut": mv.statut, "montant": mv.montant, "libelle": mv.libelle, "a": ms(mv.a)}


# ── Éligibilité ───────────────────────────────────────────────────────────────────────────────────────


def litiges_en_cours(b: Boutique) -> int:
    if not apps.is_installed("apps.vendeur_litiges"):  # pragma: no cover - installée dans le kit
        return 0
    from apps.vendeur_litiges.models import Dossier

    return Dossier.objects.filter(boutique=b, voie=Dossier.Voie.LITIGE, litige__issue="").count()


def motifs(o: Offre, litiges: int | None = None) -> tuple[str, ...]:
    """Seuil de qualité du moteur (stock, Trust Score, litige) ; une offre hors ligne n'est jamais annoncée."""
    n = litiges_en_cours(o.boutique) if litiges is None else litiges
    m = _m().motifs_ineligibilite(o.stock, o.boutique.trust_score, n, p())
    if o.etat != Offre.Etat.EN_VENTE or not o.product_id:
        m = ("offre hors ligne", *m)
    return m


def _offre(b: Boutique, offre_id) -> Offre:
    o = Offre.objects.select_related("boutique", "fiche").filter(boutique=b, pk=offre_id).first() if str(offre_id).isdigit() else None
    if o is None:
        raise introuvable("Offre introuvable.")
    m = motifs(o)
    if m:
        raise refus("annonce_refusee", "Cette offre ne peut pas être annoncée : " + ", ".join(m) + ".", {"motifs": list(m)})
    return o


def _titre(o: Offre) -> str:
    return o.fiche.titre if o.fiche else o.titre_demande


# ── Campagnes du vendeur ──────────────────────────────────────────────────────────────────────────────


def creer_clic(b: Boutique, offre_id, enchere: int, budget: int, lieu: str = "") -> dict:
    from belivay_moteurs.erreurs import AnnonceRefusee

    o = _offre(b, offre_id)
    try:
        _m().verifier_enchere_clic(enchere, budget, p())
    except AnnonceRefusee as exc:
        raise _refus(exc) from exc
    t = horloge.maintenant()
    c = Campagne.objects.create(boutique=b, offre=o, type=T.CLIC, enchere=enchere, budget_quotidien=budget, lieu=lieu, cree_le=t, debut=t)
    return campagne_json(c)


def campagne(b: Boutique, id_) -> Campagne:
    c = Campagne.objects.select_related("offre__fiche", "boutique").filter(boutique=b, pk=id_).first() if str(id_).isdigit() else None
    if c is None:
        raise introuvable("Campagne introuvable.")
    return c


def mettre_en_pause(b: Boutique, id_, pause: bool) -> dict:
    c = campagne(b, id_)
    if c.type != T.CLIC or c.statut not in (S.ACTIVE, S.PAUSE):
        raise refus("state_changed", "Seule une campagne au clic en cours se met en pause.")
    c.statut = S.PAUSE if pause else S.ACTIVE
    c.save(update_fields=["statut"])
    return campagne_json(c)


def _semaine_qs(emplacement: str, lundi: date):
    return Campagne.objects.filter(type=emplacement, semaine=lundi)


def places_restantes(emplacement: str, lundi: date) -> int:
    regle = _m().regle_emplacement(emplacement, p())
    return regle.places - _semaine_qs(emplacement, lundi).filter(statut=S.ACTIVE).count()  # une place arrêtée se revend


@transaction.atomic
def reserver_emplacement(
    b: Boutique, emplacement: str, offre_id, mode: str, semaine: date, enchere: int | None, titre="", sous_titre=""
) -> dict:
    """Tarif fixe : débité tout de suite, au prorata des heures qui restent dans la semaine (le vendeur ne paie que les
    heures diffusées) ; enchère : semaine à venir seulement, attribuée par attribuer_semaine (perdants : rien)."""
    pub = _m()
    o = _offre(b, offre_id)
    lundi = _semaine(semaine)
    t = horloge.maintenant()
    debut, fin = _debut_semaine(lundi), _debut_semaine(lundi + timedelta(days=7))
    if fin <= t:
        raise refus("semaine_passee", "Cette semaine est terminée.")
    regle = pub.regle_emplacement(emplacement, p())
    if emplacement == T.CARROUSEL and not titre.strip():
        raise refus("invalid", "Donne un titre à la diapo du carrousel.")
    c = Campagne(
        boutique=b,
        offre=o,
        type=emplacement,
        mode=mode,
        semaine=lundi,
        debut=debut,
        fin=fin,
        cree_le=t,
        titre=titre.strip(),
        sous_titre=sous_titre.strip(),
    )
    if mode == pub.Mode.ENCHERE.value:
        if debut <= t:
            raise refus("semaine_commencee", "L’enchère se fait avant le début de la semaine.")
        if enchere is None or enchere < regle.enchere_min:
            raise refus("annonce_refusee", f"Enchère de {regle.enchere_min} F la semaine au moins.", {"min": regle.enchere_min})
        solde = compte(b).solde
        if enchere > solde:
            raise refus(
                "solde_insuffisant", "Ton solde publicitaire doit couvrir ton enchère.", {"solde": solde, "manque": enchere - solde}
            )
        c.enchere, c.statut = enchere, S.EN_ATTENTE
        c.save()
        return campagne_json(c)
    if places_restantes(emplacement, lundi) <= 0:
        raise refus("complet", "Plus de place cette semaine.")
    ecoulees = max(0, math.floor((t - debut).total_seconds() / 3600))
    c.prix = pub.remboursement_non_diffuse(regle.tarif_semaine, 168, ecoulees)
    c.debut = debut + timedelta(hours=ecoulees)  # diffusée (et due) à partir de l'heure en cours
    c.statut = S.ACTIVE
    c.save()
    _debiter(b, c.prix, Mouvement.Type.EMPLACEMENT, f"{c.get_type_display()} · semaine du {lundi:%d/%m}", c)
    return campagne_json(c)


@transaction.atomic
def attribuer_semaine(emplacement: str, semaine: date) -> list[dict]:
    """Tâche du dimanche (ou console) : enchères de la semaine à venir sur les places qui restent ; chaque gagnant
    paie le second prix + 1 F (moteur). Un gagnant dont le solde ne couvre plus le prix est refusé et l'enchère est
    rejouée sans lui sur les places qui restent. Les perdants ne paient rien."""
    pub = _m()
    lundi = _semaine(semaine)
    attente = list(
        _semaine_qs(emplacement, lundi).filter(statut=S.EN_ATTENTE).select_related("boutique", "offre__boutique", "offre__fiche")
    )
    for c in attente:
        if motifs(c.offre):
            c.statut, c.motif = S.REFUSEE, "offre non éligible"
    while True:
        pool = [c for c in attente if c.statut == S.EN_ATTENTE]
        demandes = [pub.Enchere(str(c.pk), c.enchere, c.pk) for c in pool]
        gagnants = pub.attribuer_emplacements(emplacement, pub.Mode.ENCHERE, demandes, p(), places_restantes(emplacement, lundi))
        par_id = {str(c.pk): c for c in pool}
        # Le prix de chacun dépend des autres : on vérifie d'abord que tous peuvent payer, puis on débite.
        dus: dict[int, int] = {}
        insolvable = None
        for g in gagnants:
            c = par_id[g.campagne]
            dus[c.boutique_id] = dus.get(c.boutique_id, 0) + g.cout
            if dus[c.boutique_id] > compte(c.boutique).solde:
                insolvable = c
                break
        if insolvable is None:
            break
        insolvable.statut, insolvable.motif = S.REFUSEE, "solde insuffisant à l’attribution"
    for g in gagnants:
        c = par_id[g.campagne]
        _debiter(c.boutique, g.cout, Mouvement.Type.EMPLACEMENT, f"{c.get_type_display()} · semaine du {lundi:%d/%m} (enchère)", c)
        c.statut, c.prix = S.ACTIVE, g.cout
    for c in attente:
        if c.statut == S.EN_ATTENTE:
            c.statut, c.motif = S.REFUSEE, "enchère dépassée"
        c.save()
    return [campagne_json(c) for c in attente]


@transaction.atomic
def booster(b: Boutique, offre_id, duree: str) -> dict:
    pub = _m()
    o = _offre(b, offre_id)
    try:
        d = pub.DureeBoost(duree)
    except ValueError:
        raise refus("invalid", "Durée du Boost : 24h ou 7j.") from None
    t = horloge.maintenant()
    if Campagne.objects.filter(offre=o, type=T.BOOST, statut=S.ACTIVE, fin__gt=t).exists():
        raise refus("deja", "Ce produit est déjà en Boost.")
    c = Campagne.objects.create(
        boutique=b,
        offre=o,
        type=T.BOOST,
        duree=d.value,
        debut=t,
        fin=t + timedelta(hours=pub.HEURES_BOOST[d]),
        prix=pub.prix_boost(d, p()),
        cree_le=t,
    )
    _debiter(b, c.prix, Mouvement.Type.BOOST, f"Boost {d.value} · {_titre(o)}", c)
    return campagne_json(c)


def duree_flash_max() -> int:
    m = re.fullmatch(r"(\d+) h", parametres_vendeur.valeur("FLASH-DUREE-MAX", "48 h").strip())
    return int(m.group(1)) if m else 48


def proposer_flash(b: Boutique, offre_id, prix_flash: int, debut: datetime, fin: datetime, stock: int) -> dict:
    """Proposition à la sélection flash de BelivaY : remise minimale, durée maximale, stock disponible ; acceptée ou
    refusée par la console (selectionner_flash). Rémunérée par la commission majorée pendant la vente."""
    from belivay_moteurs.erreurs import AnnonceRefusee

    o = _offre(b, offre_id)
    try:
        remise = _m().verifier_remise_flash(o.prix, prix_flash, p())
    except AnnonceRefusee as exc:
        raise _refus(exc) from exc
    h = duree_flash_max()
    if not (horloge.maintenant() <= debut < fin) or fin - debut > timedelta(hours=h):
        raise refus("invalid", f"Une vente flash commence plus tard et dure {h} h au plus.")
    if not 0 < stock <= o.stock:
        raise refus("invalid", "Stock de la vente flash : entre 1 et ton stock.", {"max": o.stock})
    c = Campagne.objects.create(
        boutique=b,
        offre=o,
        type=T.FLASH,
        statut=S.EN_ATTENTE,
        prix_flash=prix_flash,
        stock_flash=stock,
        debut=debut,
        fin=fin,
        cree_le=horloge.maintenant(),
    )
    return {**campagne_json(c), "remisePourCent": remise}


@transaction.atomic
def selectionner_flash(campagne_id: int, accord: bool, motif: str = "") -> dict:
    """Console : la vente entre dans la sélection (offre de extras, visible dans Ventes flash et sur l'accueil) et dans
    les ventes flash du vendeur (Promotions, une seule notion, origine « selection ») : pendant la fenêtre, le prix payé
    par le client est le prix flash (vendeur_croissance.promotions.appliquer)."""
    from apps.extras.models import OffreFlash
    from apps.vendeur_croissance import promotions
    from apps.vendeur_croissance.models import VenteFlash

    c = Campagne.objects.select_for_update().select_related("offre__boutique", "offre__fiche").get(pk=campagne_id, type=T.FLASH)
    if c.statut != S.EN_ATTENTE:
        return campagne_json(c)
    if not accord:
        c.statut, c.motif = S.REFUSEE, motif or "non retenue dans la sélection"
    else:
        of = OffreFlash.objects.create(
            product_id=c.offre.product_id, prix=c.prix_flash, avant=c.offre.prix, debut=c.debut, fin=c.fin, stock=c.stock_flash
        )
        o = c.offre
        v = VenteFlash.objects.create(
            boutique=o.boutique,
            offre=o,
            origine=VenteFlash.Origine.SELECTION,
            type="pourcent",
            valeur=_m().verifier_remise_flash(o.prix, c.prix_flash, p()),
            prix_reference=o.prix,
            prix_promo=c.prix_flash,
            debut=c.debut,
            fin=c.fin,
            cree_le=horloge.maintenant(),
        )
        c.statut, c.offre_flash_id, c.vente_flash_id = S.ACTIVE, of.pk, v.pk
        promotions.appliquer(o)
    c.save()
    return campagne_json(c)


def _heures(c: Campagne, t: datetime) -> tuple[int, int]:
    """(heures prévues, heures commencées) : une heure commencée est due."""
    prevues = round((c.fin - c.debut).total_seconds() / 3600)
    faites = min(prevues, max(0, math.ceil((t - c.debut).total_seconds() / 3600)))
    return prevues, faites


def rembourser_heures(c: Campagne, heures_non_diffusees: int) -> int:
    """Heures non diffusées (arrêt, panne ; offre devenue inéligible : console) rendues au solde par le moteur,
    jamais plus que le forfait payé."""
    prevues = round((c.fin - c.debut).total_seconds() / 3600)
    du = _m().remboursement_non_diffuse(c.prix, prevues, prevues - heures_non_diffusees)
    montant = min(du, c.prix - c.rembourse)
    if montant > 0:
        Campagne.objects.filter(pk=c.pk).update(rembourse=F("rembourse") + montant)
        _crediter(c.boutique, montant, f"Heures non diffusées · {c.get_type_display()}", c)
    return max(montant, 0)


@transaction.atomic
def arreter(b: Boutique, id_) -> dict:
    """Arrêt par le vendeur : heures non diffusées d'un Boost ou d'un emplacement rendues au solde ; enchère en
    attente retirée ; vente flash sélectionnée arrêtée maintenant."""
    c = campagne(b, id_)
    t = horloge.maintenant()
    if c.statut in (S.TERMINEE, S.REFUSEE):
        raise refus("state_changed", "Cette campagne est déjà terminée.")
    if c.type in (T.BOOST, T.A_LA_UNE, T.CARROUSEL) and c.statut == S.ACTIVE:
        prevues, faites = _heures(c, t)
        rembourser_heures(c, prevues - faites)
        c.refresh_from_db()
    if c.offre_flash_id:
        from apps.extras.models import OffreFlash

        OffreFlash.objects.filter(pk=c.offre_flash_id, fin__gt=t).update(fin=t)
    if c.vente_flash_id:
        from apps.vendeur_croissance import promotions
        from apps.vendeur_croissance.models import VenteFlash

        VenteFlash.objects.filter(pk=c.vente_flash_id, arretee_le__isnull=True, fin__gt=t).update(arretee_le=t)
        promotions.appliquer(c.offre)
    c.statut, c.motif = S.TERMINEE, "arrêtée par le vendeur"
    if c.fin is None or c.fin > t:
        c.fin = t
    c.save()
    return campagne_json(c)


def flash_arretee_en_promotions(vente_flash_id: int, t: datetime) -> None:
    """Vente flash sur sélection arrêtée dans Promotions : l'offre flash du client finit maintenant et la campagne est
    terminée (même effet qu'un arrêt dans la Publicité)."""
    from apps.extras.models import OffreFlash

    for c in Campagne.objects.filter(vente_flash_id=vente_flash_id).exclude(statut__in=[S.TERMINEE, S.REFUSEE]):
        if c.offre_flash_id:
            OffreFlash.objects.filter(pk=c.offre_flash_id, fin__gt=t).update(fin=t)
        c.statut, c.motif = S.TERMINEE, "arrêtée dans Promotions"
        if c.fin is None or c.fin > t:
            c.fin = t
        c.save()


# ── Lecture vendeur ───────────────────────────────────────────────────────────────────────────────────


def stats(c: Campagne) -> dict:
    clics = c.clics.count()
    depense_clics = c.clics.aggregate(s=Sum("cout"))["s"] or 0
    return {
        "impressions": c.impressions,
        "clics": clics,
        "clicsFactures": c.clics.filter(cout__gt=0).count(),
        "ventes": c.clics.filter(vente=True).count(),
        "depense": depense_clics + c.prix - c.rembourse,
        "tauxClicPourCent": round(clics * 100 / c.impressions, 1) if c.impressions else 0,
    }


def campagne_json(c: Campagne) -> dict:
    return {
        "id": str(c.pk),
        "type": c.type,
        "statut": c.statut,
        "offre": str(c.offre_id),
        "titre": _titre(c.offre),
        "enchere": c.enchere,
        "budgetQuotidien": c.budget_quotidien,
        "mode": c.mode or None,
        "debut": ms(c.debut),
        "fin": ms(c.fin),
        "prix": c.prix,
        "rembourse": c.rembourse,
        "duree": c.duree or None,
        "prixFlash": c.prix_flash,
        "titreDiapo": c.titre or None,
        "motif": c.motif or None,
        "stats": stats(c),
    }


def apercu(b: Boutique) -> dict:
    pp = p()
    litiges = litiges_en_cours(b)
    recharges = b.mouvements_pub.filter(type=Mouvement.Type.RECHARGE, statut=Mouvement.Statut.EN_ATTENTE)
    return {
        "solde": compte(b).solde,
        "rechargesEnAttente": [mouvement_json(m) for m in recharges],
        "campagnes": [campagne_json(c) for c in b.campagnes_pub.select_related("offre__fiche")],
        "offres": [
            {"id": str(o.pk), "titre": _titre(o), "prix": o.prix, "stock": o.stock, "motifs": list(motifs(o, litiges))}
            for o in b.offres.select_related("fiche", "boutique").filter(etat=Offre.Etat.EN_VENTE)
        ],
        "tarifs": {
            "clicPlancher": pp.clic_plancher,
            "budgetMin": pp.budget_min,
            "rechargeMin": pp.recharge_min,
            "aLaUne": {"places": pp.a_la_une.places, "tarifSemaine": pp.a_la_une.tarif_semaine, "enchereMin": pp.a_la_une.enchere_min},
            "carrousel": {
                "places": pp.carrousel.places,
                "tarifSemaine": pp.carrousel.tarif_semaine,
                "enchereMin": pp.carrousel.enchere_min,
            },
            "boost24h": pp.boost_24h,
            "boost7j": pp.boost_7j,
            "flashMajorationPoints": float(pp.flash_points),
            "flashRemiseMinPourCent": float(pp.flash_remise_min_pour_cent),
            "flashDureeMaxH": duree_flash_max(),
        },
    }


def emplacements(emplacement: str, semaine: date) -> dict:
    regle = _m().regle_emplacement(emplacement, p())
    lundi = _semaine(semaine)
    return {
        "emplacement": emplacement,
        "semaine": lundi.isoformat(),
        "places": regle.places,
        "restantes": places_restantes(emplacement, lundi),
        "tarifSemaine": regle.tarif_semaine,
        "enchereMin": regle.enchere_min,
        "encheres": _semaine_qs(emplacement, lundi).filter(statut=S.EN_ATTENTE).count(),
    }


def facture(b: Boutique, mois: str) -> dict:
    """Facture publicitaire du mois : clics par campagne, emplacements et Boost, heures rendues (moteur)."""
    from belivay_moteurs.publicite import LigneFacture, facture_publicitaire

    m_ = re.fullmatch(r"(\d{4})-(\d{2})", mois or "")
    if not m_ or not 1 <= int(m_.group(2)) <= 12:
        raise refus("invalid", "Mois attendu : AAAA-MM.")
    an, m = int(m_.group(1)), int(m_.group(2))
    debut = datetime(an, m, 1, tzinfo=YAOUNDE)
    fin = datetime(an + (m == 12), m % 12 + 1, 1, tzinfo=YAOUNDE)
    mvts = b.mouvements_pub.filter(a__gte=debut, a__lt=fin, statut=Mouvement.Statut.CONFIRME).exclude(type=Mouvement.Type.RECHARGE)
    groupes: dict[tuple, list[int]] = {}
    for mv in mvts.select_related("campagne__offre__fiche").order_by("a", "id"):
        cle = (f"Clics · {_titre(mv.campagne.offre)}", mv.campagne_id) if mv.type == Mouvement.Type.CLIC else (mv.libelle, mv.pk)
        g = groupes.setdefault(cle, [0, 0])
        g[0] += 1
        g[1] -= mv.montant
    lignes = [LigneFacture(f"{lib} ({n})" if lib.startswith("Clics") else lib, 1, total) for (lib, _), (n, total) in groupes.items()]
    f = facture_publicitaire(lignes, parametres_vendeur.commission().tva_pour_cent)
    return {
        "reference": f"BLV-PUB-{an}{m:02d}-{b.pk}",
        "mois": f"{an}-{m:02d}",
        "lignes": [{"libelle": lg.libelle, "montant": lg.montant} for lg in f.lignes],
        "horsTaxe": f.hors_taxe,
        "tva": f.tva,
        "total": f.total,
    }


# ── Client : annonces à afficher, clic ────────────────────────────────────────────────────────────────


def _eligibles(qs):
    litiges: dict[int, int] = {}
    for c in qs.select_related("offre__boutique", "offre__fiche", "boutique"):
        if c.boutique_id not in litiges:
            litiges[c.boutique_id] = litiges_en_cours(c.boutique)
        if not motifs(c.offre, litiges[c.boutique_id]):
            yield c


def _correspond(c: Campagne, q: str | None, cat: str | None) -> bool:
    f = c.offre.fiche
    texte = " ".join(x for x in (f.titre, f.mots, f.marque, f.rayon, f.categorie) if x).lower() if f else c.offre.titre_demande.lower()
    if q and not all(m in texte for m in q.lower().split()):
        return False
    return not cat or cat.lower() in texte


def _depense_du_jour(c: Campagne, jour: date) -> int:
    return c.clics.filter(jour=jour).aggregate(s=Sum("cout"))["s"] or 0


def _annonce(c: Campagne, cout: int | None = None) -> dict:
    jeton = signing.dumps({"c": c.pk, "k": cout}, salt=SEL, compress=True)
    f = c.offre.fiche
    return {"id": jeton, "p": str(c.offre.product_id), "campagne": str(c.pk), "fiche": str(f.pk) if f else f"o{c.offre_id}"}


def placements(ou: str, q: str | None, cat: str | None) -> dict:
    """Annonces au clic de la recherche ou d'une catégorie, rangées par l'enchère (coût = second prix + 1 F, signé dans
    le jeton), diffusables dans le budget du jour et le solde ; le site les mêle aux résultats (VD-PUB-DENSITE) ;
    produits en Boost."""
    pub, pp = _m(), p()
    t = horloge.maintenant()
    jour = _jour(t)
    lieux = ["", "recherche" if ou == "recherche" else "categorie"]
    cands = [c for c in _eligibles(Campagne.objects.filter(type=T.CLIC, statut=S.ACTIVE, lieu__in=lieux)) if _correspond(c, q, cat)]
    gagnants = pub.encheres_au_clic([pub.Enchere(str(c.pk), c.enchere, c.pk) for c in cands], len(cands), pp)
    par_id = {str(c.pk): c for c in cands}
    annonces = []
    for g in gagnants:
        c = par_id[g.campagne]
        if len(annonces) < PLACES_CLIC and pub.diffusable(g.cout, _depense_du_jour(c, jour), c.budget_quotidien, compte(c.boutique).solde):
            annonces.append(_annonce(c, g.cout))
    # Impressions : comptées quand le site montre l'annonce (POST /api/sponsored/impressions), pas ici.
    en_boost = _eligibles(Campagne.objects.filter(type=T.BOOST, statut=S.ACTIVE, debut__lte=t, fin__gt=t))
    boosts = {str(c.offre.product_id): _annonce(c)["id"] for c in en_boost}
    return {
        "annonces": annonces,
        "boosts": sorted(boosts),
        "jetonsBoost": dict(sorted(boosts.items())),
        "regles": {
            "partMaxPourCent": float(pp.part_max_pour_cent),
            "maxParFenetre": pp.max_par_fenetre,
            "fenetre": pp.fenetre,
            "boostMultiplicateur": float(pp.boost_plafond),
        },
    }


def rotation(campagnes: list[Campagne], tirage: random.Random | None = None) -> list[Campagne]:
    """Ordre d'affichage des emplacements de la semaine, tiré à chaque visite et pondéré par le montant payé (tirage
    d'Efraimidis-Spirakis : clé = u^(1/poids)) : qui a payé deux fois plus passe devant deux fois plus souvent, sans
    jamais en évincer un autre (chaque place vendue est montrée)."""
    r = tirage or random.Random()
    return sorted(campagnes, key=lambda c: r.random() ** (1 / max(1, c.prix - c.rembourse)), reverse=True)


def accueil() -> dict:
    """Emplacements achetés de la semaine (À la une, carrousel), en rotation pondérée par le montant payé, et offres
    de la sélection flash en cours ; une campagne en pause, arrêtée, finie ou dont le produit n'est plus éligible
    n'y est plus. Vides : le site garde son contenu."""
    t = horloge.maintenant()
    actives = Campagne.objects.filter(statut=S.ACTIVE, debut__lte=t, fin__gt=t)
    une = rotation(list(_eligibles(actives.filter(type=T.A_LA_UNE))))
    caro = rotation(list(_eligibles(actives.filter(type=T.CARROUSEL))))
    selection = {str(c.offre.product_id): _annonce(c)["id"] for c in _eligibles(actives.filter(type=T.FLASH))}
    flash = []
    if selection:
        from apps.extras.services import offres_flash

        flash = [
            {**o, "selection": True, "annonce": selection[o["p"]]} for o in offres_flash() if o["p"] in selection and o["stock"] > 0
        ]
    return {
        "aLaUne": [_annonce(c) for c in une],
        "carrousel": [{**_annonce(c), "titre": c.titre, "sousTitre": c.sous_titre} for c in caro],
        "flash": flash,
        "encart": ENCART_ACCUEIL if ENCART_ACCUEIL in (2, 4, 6) else 2,
    }


def _cle_client(request) -> tuple[str, object]:
    u = request.user if request.user.is_authenticated else None
    if u is not None:
        return f"u:{u.pk}", u
    brut = f"{request.META.get('REMOTE_ADDR', '')}|{request.META.get('HTTP_USER_AGENT', '')}"
    return "v:" + hashlib.sha256(brut.encode()).hexdigest()[:40], None


# Limites de débit des routes publiques (par client : utilisateur, sinon empreinte anonyme) : (nombre, fenêtre en s).
# PARAMÈTRES À AJOUTER AU REGISTRE.
LIMITES = {"clic": (60, 60), "vu": (300, 60), "signal": (10, 3600)}


def limiter(request, quoi: str) -> None:
    """Anti-fraude : au-delà de la limite, 429 trop_de_requetes (rien n'est compté ni facturé)."""
    from apps.client_core.erreurs import ErreurClient

    n, fenetre = LIMITES[quoi]
    cle = "pub:debit:" + hashlib.sha256(f"{quoi}|{_cle_client(request)[0]}".encode()).hexdigest()[:40]
    cache.add(cle, 0, fenetre)
    try:
        compte = cache.incr(cle)
    except ValueError:  # pragma: no cover - entrée expirée entre add et incr
        cache.set(cle, 1, fenetre)
        compte = 1
    if compte > n:
        raise ErreurClient(429, "trop_de_requetes", "Trop de requêtes, réessaie plus tard.", {"retry_after": fenetre})


def _lire_jeton(jeton: str) -> dict:
    try:
        return signing.loads(jeton, salt=SEL, max_age=86_400)
    except signing.BadSignature:
        raise refus("invalid", "Annonce inconnue.") from None


def voir(request, jeton: str, emplacement: str, visite: str) -> bool:
    """Une impression : l'annonce a été montrée à l'écran (au moins à moitié visible). Comptée une fois par client,
    par campagne, par emplacement et par visite ; une campagne qui n'est plus active n'est pas comptée. Rend True si
    elle a été comptée."""
    d = _lire_jeton(jeton)
    cle, _ = _cle_client(request)
    if not Campagne.objects.filter(pk=d.get("c"), statut=S.ACTIVE).exists():
        return False
    empreinte = hashlib.sha256(f"{d.get('c')}|{cle}|{emplacement}|{visite}".encode()).hexdigest()[:40]
    if not cache.add(f"pub:vu:{empreinte}", 1, VISITE_S):
        return False
    return Campagne.objects.filter(pk=d.get("c")).update(impressions=F("impressions") + 1) == 1


def signaler(request, jeton: str, motif: str) -> None:
    """« Signaler cette annonce » : un signalement par client et par campagne, relu par la console."""
    d = _lire_jeton(jeton)
    c = Campagne.objects.filter(pk=d.get("c")).first()
    if c is None:
        raise introuvable("Annonce introuvable.")
    cle, _ = _cle_client(request)
    Signalement.objects.get_or_create(campagne=c, client=cle, defaults={"motif": motif, "a": horloge.maintenant()})


@transaction.atomic
def cliquer(request, jeton: str) -> None:
    """Un clic : facturé une fois par client, par annonce et par jour, au coût signé à l'affichage, dans le budget du
    jour et le solde ; les suivants sont comptés à part, jamais facturés. Un emplacement (forfait) ne facture pas le
    clic, il le compte."""
    d = _lire_jeton(jeton)
    c = Campagne.objects.select_for_update().select_related("boutique", "offre__fiche").filter(pk=d.get("c")).first()
    if c is None:
        raise introuvable("Annonce introuvable.")
    t = horloge.maintenant()
    jour = _jour(t)
    cle, user = _cle_client(request)
    deja = Clic.objects.filter(campagne=c, client=cle, jour=jour)
    if deja.exists():
        deja.update(repetitions=F("repetitions") + 1)
        return
    cout = 0
    if c.type == T.CLIC and c.statut == S.ACTIVE and d.get("k"):
        cout = _m().clic_facture(int(d["k"]), False, _depense_du_jour(c, jour), c.budget_quotidien, compte(c.boutique).solde)
    try:
        with transaction.atomic():
            Clic.objects.create(campagne=c, client=cle, user=user, jour=jour, a=t, cout=cout)
    except IntegrityError:  # pragma: no cover - deux clics simultanés : le premier compte
        return
    if cout:
        _debiter(c.boutique, cout, Mouvement.Type.CLIC, f"Clic · {_titre(c.offre)}", c)


# ── Entrée d'une commande chez le vendeur (vendeur_core.services.entrer) ─────────────────────────────


def a_l_entree(b: Boutique, client_id, lignes: list[dict], decouverte: bool, payee: datetime, r):
    """Vente attribuée au dernier clic du client sur ce produit dans les 7 jours ; commission majorée (moteur) sur la
    part vendue au prix de la sélection flash. Rend le résultat de commission à figer (r, ou celui de la vente flash)."""
    produits = {lg["productId"] for lg in lignes}
    if client_id:
        for pid in produits:
            clic = (
                Clic.objects.filter(
                    user_id=client_id,
                    campagne__offre__product_id=pid,
                    a__gte=payee - timedelta(days=VENTE_JOURS),
                    a__lte=payee,
                    vente=False,
                )
                .order_by("-a")
                .first()
            )
            if clic:
                Clic.objects.filter(pk=clic.pk).update(vente=True)
    flash = {
        c.offre.product_id: c.prix_flash
        for c in Campagne.objects.filter(
            boutique=b,
            type=T.FLASH,
            statut__in=[S.ACTIVE, S.TERMINEE],
            offre_flash_id__isnull=False,
            debut__lte=payee,
            fin__gt=payee,
            offre__product_id__in=produits,
        ).select_related("offre")
    }
    base = sum(int(lg["prix"]) * int(lg.get("quantite", 1)) for lg in lignes if flash.get(lg["productId"]) == int(lg["prix"]))
    if not base:
        return r
    from belivay_moteurs.commission import LigneVendue, famille_de

    pc = parametres_vendeur.commission()
    vendues = [
        LigneVendue(famille_de(lg["categorie"], pc), int(lg["prix"]), int(lg.get("quantite", 1)), bool(lg.get("madeInCameroon", False)))
        for lg in lignes
    ]
    return _m().commission_vente_flash(vendues, b.palier, decouverte, pc, p(), base_flash=base)
