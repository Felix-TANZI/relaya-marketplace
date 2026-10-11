# backend/apps/vendeur_croissance/services.py
# Logique de la croissance du vendeur (VD-10). Réponses au format des types du site vendeur :
#   trust   — espace-vendeur/src/donnees/domaines/trust.ts   (Score, StatutCompte, Decision, contestation) ;
#   paliers — espace-vendeur/src/donnees/domaines/paliers.ts (MonPalier) ;
#   plans   — espace-vendeur/src/donnees/domaines/plans.ts   (OffrePlan, EtatPlan, Simulation, DemandePaiement,
#             Visibilite, Services, Stats, Demande).
# Aucune règle n'est recodée : paliers (palier_atteint, alerte_de_seuil, palier_de_lancement, paliers_effectifs),
# sanctions (validation_humaine, fins, contrôle au ramassage, période probatoire), plans (prix, essai, grâce, TVA),
# commission (simuler_plans, garde par vente) : belivay_moteurs, avec les paramètres du registre
# (apps.vendeur_core.parametres). Le Trust Score lui-même vient du service Scores de relaya (Q-37) : ce module le lit.
#
# Fonctions offertes aux autres applications et au serveur d'essai :
#   suspension(boutique) -> dict | None           — type Suspension de l'accueil (VD-04), exemple: False.
#   idee_du_jour(boutique) -> dict | None         — {recherche, fois, jours} : la recherche sans résultat la plus
#                                                   fréquente de la zone (accueil « Rien à faire »).
#   factures(boutique) -> {abonnement, visibilite} — factures des plans payés (Documents, VD-09).
#   confirmer_paiement(demande_id, reussi) -> dict — webhook de l'agrégateur Mobile Money (CamPay, DP-03).
#   decider(...), lever_suspension(...), repondre_contestation(...), enregistrer_releve(...) — console BelivaY et
#                                                   service Scores (routes d'essai du coordinateur).
from dataclasses import replace
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Q

from apps.client_core.temps import YAOUNDE, ms
from apps.vendeur_core import horloge, parametres
from apps.vendeur_core import services as socle
from apps.vendeur_core.models import Boutique, CommandeVendeur, Membre, Offre

from .models import (
    Contestation,
    CritereScore,
    Decision,
    DemandePaiement,
    EtatAbonnement,
    EvenementScore,
    FreinReleve,
    MeriteVisibilite,
    ProjectionScore,
    RechercheZone,
    ReleveScore,
    UtilisationRecompense,
    VuesOffre,
)

# ── Valeurs de console (aucun code au registre vendeur ; mêmes valeurs que la démonstration du site) ─────────

CONTESTATION_MIN, CONTESTATION_MAX = 40, 1000  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-CON-TEXTE (40 à 1 000 caractères)
AVERTISSEMENT_JOURS = 7  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-SAN-AVERTISSEMENT (avertissement montré 7 jours)
INACTIVITE_JOURS = 30  # PARAMÈTRE À AJOUTER AU REGISTRE : SCO-INACTIVITE (score gelé après 30 jours sans commande, SCO-03)
HISTORIQUE_JOURS = 30
SUPPORT_HEURES = 2  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-SUPPORT-DELAI (première réponse en 2 h, DP-56 Q-47)
FLASH_REMISE_MAX = 90  # PARAMÈTRE À AJOUTER AU REGISTRE : FLASH-REMISE-MAX
DEPENDANCE_POUR_CENT = 60  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-STATS-DEPENDANCE
STATS_JOURS = 30
# Lus au registre (vendeur_core.parametres, DP-57) : réponse à une contestation (VD-CONTESTATION-REPONSE, CON-01) ;
# visibilité au mérite (VD-VISIBILITE : vitrine, jours de suite, Trust Score minimum, remise flash relue, P-3, VIS-02,
# OFR-05) ; visite de l'agent (VD-VISITE-AGENT, P-4) ; demande de la zone (VD-DEMANDE, VD10-R47) ; simulateur
# (VD-SIMULATEUR, VD10-R33, R36) ; prix des services (VD-SERVICES, VD-FICHE-DELAI, VD-SAISIE-ASSISTEE, DP-56 Q-40).

# Article de référence par défaut (boutique sans vente) : « par ITEL » du paquet.
REFERENCE_DEFAUT = {"titre": "ITEL AC52", "prix": 20000, "categorie": "Électronique", "mic": False}

NOMS_CRITERES = dict(CritereScore.Cle.choices)
ORDRE_CRITERES = list(CritereScore.Cle.values)

# Barème des événements (SCO-06) : la table du service Scores (V11), libellés traduits par l'écran ; les codes
# g1, g2, g3 restent dans le moteur de relaya (SCO-05).
BAREME = [
    ("Prête dans le délai", "succes"),
    ("Retard toléré", "leger"),
    ("Retard au-delà du délai", "moyen"),
    ("Non-préparation", "grave_sanction"),
    ("Rupture signalée avant l’échéance", "leger"),
    ("Délai demandé puis tenu", "leger"),
    ("Fermeture non annoncée au passage du livreur", "moyen"),
    ("Annulation par le client", "aucun"),
    ("Retour non conforme mineur", "leger"),
    ("Défectueux, faux ou vice caché confirmé", "grave"),
    ("Avis 4 ou 5 ★", "succes"),
    ("Avis 3 ★", "neutre"),
    ("Avis 1 ou 2 ★", "leger"),
    ("Document expiré", "documents_zero"),
]

NIVEAU_DU_TYPE = {"avertissement": 1, "visibilite_reduite": 2, "suspension": 3, "exclusion": 4, "descente": None}
SUFFIXE_DU_TYPE = {"avertissement": "A1", "visibilite_reduite": "V2", "suspension": "S3", "exclusion": "X4", "descente": "P"}
GRAVITE = ["exclusion", "suspension", "visibilite_reduite", "avertissement"]


def _un_dixieme(x) -> float:
    return float(Decimal(x).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def _jour(t: datetime) -> date:
    return t.astimezone(YAOUNDE).date()


def _iso(j: date | None) -> str | None:
    return j.isoformat() if j else None


def apres_heures_ouvrees(depuis: datetime, heures: int) -> datetime:
    """Heures ouvrées du calendrier BelivaY (toutes les heures, dimanche non compté) : même calcul que l'échéance du
    remplacement (belivay_moteurs.litiges.echeance_remplacement), avec le délai demandé."""
    from belivay_moteurs.litiges import echeance_remplacement

    p = replace(parametres.litiges(), remplacement_heures_ouvrees=heures)
    return echeance_remplacement(depuis.astimezone(YAOUNDE), p)


# ═════════════════════════════════════ TRUST : score, statut, décisions ══════════════════════════════════


def _releves(b: Boutique) -> list[ReleveScore]:
    return list(ReleveScore.objects.filter(boutique=b).order_by("jour"))


def historique(b: Boutique, jour: date | None = None) -> list[dict]:
    """Un relevé par nuit, 30 derniers jours (le plus ancien d'abord) ; une nuit sans relevé garde le précédent."""
    jour = jour or horloge.aujourd_hui()
    releves = _releves(b)
    debut = jour - timedelta(days=HISTORIQUE_JOURS - 1)
    avant = [r for r in releves if r.jour < debut]
    v = avant[-1].score if avant else (releves[0].score if releves else b.trust_score)
    par_jour = {r.jour: r.score for r in releves}
    out = []
    for i in range(HISTORIQUE_JOURS):
        j = debut + timedelta(days=i)
        v = par_jour.get(j, v)
        out.append({"jour": j.isoformat(), "score": _un_dixieme(v)})
    return out


def _score_il_y_a_une_semaine(b: Boutique, jour: date) -> Decimal | None:
    r = ReleveScore.objects.filter(boutique=b, jour__lte=jour - timedelta(days=7)).order_by("-jour").first()
    return r.score if r else None


def criteres(b: Boutique) -> list[dict]:
    rangs = {c: i for i, c in enumerate(ORDRE_CRITERES)}
    out = []
    for c in sorted(CritereScore.objects.filter(boutique=b), key=lambda x: rangs[x.cle]):
        out.append(
            {
                "cle": c.cle,
                "nom": NOMS_CRITERES[c.cle],
                "poids": c.poids,
                "note": _un_dixieme(c.note),
                "points": _un_dixieme(c.note * c.poids / 100),
                "detail": c.detail,
            }
        )
    return out


def evenement_json(e: EvenementScore) -> dict:
    return {"a": ms(e.a), "libelle": e.libelle, "effet": e.effet, "critere": e.critere or None, "ref": e.ref or None}


def _inactif(b: Boutique, t: datetime) -> bool:
    """SCO-03 : aucune commande depuis 30 jours (ni depuis la signature) : le score est gelé."""
    derniere = CommandeVendeur.objects.filter(boutique=b).order_by("-payee_a").values_list("payee_a", flat=True).first()
    depuis = derniere or (datetime.combine(b.signature_le or b.cree_le, datetime.min.time(), YAOUNDE))
    return t - depuis > timedelta(days=INACTIVITE_JOURS)


def score(b: Boutique) -> dict:
    t = horloge.maintenant()
    statut = statut_compte(b)
    d = statut["enCours"]
    c = statut["controle"]
    return {
        "total": _un_dixieme(b.trust_score),
        "calculeA": ms(b.score_calcule_le or t),
        "criteres": criteres(b),
        "evenements": [evenement_json(e) for e in EvenementScore.objects.filter(boutique=b, a__lte=t)[:100]],
        "bareme": [{"evenement": e, "effet": f} for e, f in BAREME],
        "historique": historique(b),
        "gele": statut["etat"] == "suspendu" or _inactif(b, t),
        "sanction": {"niveau": d["niveau"], "depuis": d["effetA"], "motif": d["motif"]} if d and d["niveau"] else None,
        "controleAuRamassage": "100 %" if c["sur"] == 1 else f"1 sur {c['sur']}",
    }


def en_cours(d: Decision, t: datetime | None = None) -> bool:
    """Une décision produit-elle son effet maintenant ? Fins par le moteur des sanctions (L-1)."""
    from belivay_moteurs.sanctions import fin_suspension_au_plus_tard, fin_visibilite_reduite

    t = t or horloge.maintenant()
    if d.annulee_a is not None or d.effet_a > t and d.type != Decision.Type.DESCENTE:
        return False
    ps = parametres.sanctions()
    if d.type == Decision.Type.AVERTISSEMENT:
        return t < d.effet_a + timedelta(days=AVERTISSEMENT_JOURS)
    if d.type == Decision.Type.VISIBILITE_REDUITE:
        return t < fin_visibilite_reduite(d.effet_a, ps)
    if d.type == Decision.Type.SUSPENSION:
        return d.levee_a is None and t < fin_suspension_au_plus_tard(d.effet_a, ps)
    if d.type == Decision.Type.EXCLUSION:
        return True
    return t < d.effet_a  # descente proposée : pas encore effective


def decision_en_cours(b: Boutique) -> Decision | None:
    """La sanction en cours la plus grave ; à défaut, une descente de palier proposée."""
    t = horloge.maintenant()
    actives = [d for d in Decision.objects.filter(boutique=b, annulee_a__isnull=True).select_related("contestation") if en_cours(d, t)]
    for type_ in [*GRAVITE, "descente"]:
        for d in actives:
            if d.type == type_:
                return d
    return None


def _contestation(d: Decision) -> Contestation | None:
    try:
        return d.contestation
    except Contestation.DoesNotExist:
        return None


def decision_json(d: Decision) -> dict:
    c = _contestation(d)
    return {
        "id": d.ident,
        "type": d.type,
        "niveau": d.niveau,
        "palierVise": d.palier_vise or None,
        "decideeA": ms(d.decidee_a),
        "effetA": ms(d.effet_a),
        "motif": d.motif,
        "valideePar": d.validee_par or None,
        "contestation": None
        if c is None
        else {
            "envoyeeA": ms(c.envoyee_a),
            "texte": c.texte,
            "preuves": list(c.preuves),
            "reponseAvant": ms(c.reponse_avant),
            "reponse": {"a": ms(c.reponse_a), "issue": c.issue, "motif": c.motif_reponse} if c.reponse_a else None,
        },
    }


def _fin_suspension(d: Decision) -> datetime:
    from belivay_moteurs.sanctions import fin_suspension_au_plus_tard

    return d.levee_a or fin_suspension_au_plus_tard(d.effet_a, parametres.sanctions())


def _probation(b: Boutique, t: datetime) -> dict | None:
    """Période probatoire après une suspension (L-1, VD-PROBATOIRE) : finie après 20 commandes contrôlées."""
    from belivay_moteurs.sanctions import probation_finie

    ps = parametres.sanctions()
    d = Decision.objects.filter(boutique=b, type=Decision.Type.SUSPENSION, annulee_a__isnull=True).order_by("-effet_a").first()
    if d is None or en_cours(d, t):
        return None
    fin = _fin_suspension(d)
    if fin > t:  # pragma: no cover - couvert par en_cours
        return None
    controlees = CommandeVendeur.objects.filter(boutique=b, remise_a__gte=fin, remise_a__lte=t).count()
    if probation_finie(controlees, ps):
        return None
    return {"controlees": controlees, "total": ps.probatoire_commandes}


def controle(b: Boutique) -> dict:
    """ControleRamassage : part des commandes contrôlées au ramassage (CTRL-RAMASSAGE, VD-CTRL-RENFORCE, L-1), comptée
    sur les commandes déjà remises au livreur (CommandeVendeur.remise_a)."""
    from belivay_moteurs.sanctions import controle_renforce, frequence_de_controle

    ps = parametres.sanctions()
    t = horloge.maintenant()
    ramassees = CommandeVendeur.objects.filter(boutique=b, remise_a__isnull=False, remise_a__lte=t).count()
    score_ = Decimal(b.trust_score)
    renforce = controle_renforce(score_, _score_il_y_a_une_semaine(b, _jour(t)), ps)
    probatoire = _probation(b, t)
    part = frequence_de_controle(ramassees, score_, ps, en_probation=probatoire is not None, renforce=renforce)
    sur = part.denominator // part.numerator
    base = {
        "sur": sur,
        "premieres": ps.controle_premieres,
        "ramassees": ramassees,
        "renforceSous": ps.renforce_sous_score,
        "renforceBaisse": ps.renforce_baisse_points,
        "probatoire": probatoire,
    }
    if ramassees < ps.controle_premieres:
        return {**base, "raison": "premieres", "seuilReduction": None, "surApres": ps.controle_sous_seuil}
    if probatoire is not None:
        return {**base, "raison": "probatoire", "seuilReduction": None, "surApres": ps.controle_sous_seuil}
    if renforce:
        return {**base, "raison": "renforce", "seuilReduction": ps.renforce_sous_score, "surApres": ps.controle_sous_seuil}
    if sur == ps.controle_sous_seuil:
        return {**base, "raison": "sous_seuil", "seuilReduction": ps.controle_seuil_score, "surApres": ps.controle_ensuite}
    return {**base, "raison": "au_dessus", "seuilReduction": None, "surApres": None}


def statut_compte(b: Boutique) -> dict:
    from belivay_moteurs.sanctions import fin_suspension_au_plus_tard, fin_visibilite_reduite

    ps = parametres.sanctions()
    d = decision_en_cours(b)
    if d is None or d.type == Decision.Type.DESCENTE:
        etat = "aucune"
    else:
        etat = {"suspension": "suspendu", "exclusion": "exclu"}.get(d.type, d.type)
    fin = None
    if d is not None and d.type == Decision.Type.VISIBILITE_REDUITE:
        fin = ms(fin_visibilite_reduite(d.effet_a, ps))
    elif d is not None and d.type == Decision.Type.SUSPENSION:
        fin = ms(fin_suspension_au_plus_tard(d.effet_a, ps))
    return {
        "etat": etat,
        "enCours": decision_json(d) if d else None,
        "controle": controle(b),
        "alerteAvantSeuil": True,
        "regles": {
            "visibiliteJours": ps.visibilite_jours,
            "suspensionSous": ps.suspension_sous_score,
            "nonPreparations": ps.non_preparations,
            "nonPreparationsJours": ps.non_preparations_jours,
            "suspensionMaxJours": ps.suspension_max_jours,
            "probatoireCommandes": ps.probatoire_commandes,
        },
        "finEffet": fin,
    }


def decisions(b: Boutique) -> list[dict]:
    return [decision_json(d) for d in Decision.objects.filter(boutique=b).select_related("contestation")]


def decision(b: Boutique, ident: str) -> Decision | None:
    return Decision.objects.filter(boutique=b, ident=ident).select_related("contestation").first()


@transaction.atomic
def contester(b: Boutique, membre: Membre | None, ident: str, texte: str, preuves: list[str]) -> dict:
    """Une fois par décision ; 40 à 1 000 caractères ; réponse humaine sous 72 h ouvrées (CON-01, DP-15, Q-53)."""
    d = Decision.objects.select_for_update().filter(boutique=b, ident=ident).first()
    if d is None:
        return {"ok": False, "raison": "introuvable"}
    if Contestation.objects.filter(decision=d).exists():
        return {"ok": False, "raison": "deja_contestee"}
    texte = (texte or "").strip()
    if len(texte) < CONTESTATION_MIN:
        return {"ok": False, "raison": "trop_court"}
    if len(texte) > CONTESTATION_MAX:
        return {"ok": False, "raison": "trop_long"}
    t = horloge.maintenant()
    c = Contestation.objects.create(
        decision=d,
        membre=membre,
        envoyee_a=t,
        texte=texte,
        preuves=list(preuves or []),
        reponse_avant=apres_heures_ouvrees(t, parametres.contestation_reponse()),
    )
    return {"ok": True, "reponseAvant": ms(c.reponse_avant)}


# ── Console BelivaY et service Scores (routes d'essai) ─────────────────────────────────────────────────


def _ident(d: datetime, type_: str) -> str:
    base = f"DEC-{_jour(d):%Y-%m%d}-{SUFFIXE_DU_TYPE[type_]}"
    ident, i = base, 1
    while Decision.objects.filter(ident=ident).exists():
        i += 1
        ident = f"{base}-{i}"
    return ident


@transaction.atomic
def decider(
    b: Boutique,
    type_: str,
    motif: str,
    *,
    validee_par: str = "",
    palier_vise: str = "",
    effet_a: datetime | None = None,
    decidee_a: datetime | None = None,
) -> Decision:
    """Décision de la console (SAN-01) : seul l'avertissement est automatique ; les niveaux 2 à 4 et la descente
    de palier demandent une personne (validee_par) et un motif écrit. Suspension : boutique suspendue."""
    from belivay_moteurs.sanctions import Niveau, validation_humaine

    niveau = NIVEAU_DU_TYPE[type_]
    humaine = validation_humaine(Niveau(niveau)) if niveau else True
    if humaine and not validee_par:
        raise ValueError("décision à valider par une personne (SAN-01)")
    if not motif.strip():
        raise ValueError("motif écrit obligatoire")
    if type_ == Decision.Type.DESCENTE and not palier_vise:
        raise ValueError("descente : palier d'arrivée attendu")
    t = decidee_a or horloge.maintenant()
    d = Decision.objects.create(
        boutique=b,
        ident=_ident(t, type_),
        type=type_,
        niveau=niveau,
        palier_vise=palier_vise,
        decidee_a=t,
        effet_a=effet_a or t,
        motif=motif.strip(),
        validee_par=validee_par,
    )
    if type_ == Decision.Type.SUSPENSION:
        b.suspendue_depuis = d.effet_a
        b.save(update_fields=["suspendue_depuis"])
    socle.notifier(
        b,
        "palier" if type_ == Decision.Type.DESCENTE else "sanction",
        "Décision sur votre compte",
        d.motif,
        f"contester?d={d.ident}&depuis=notifications",
        urgent=type_ in ("suspension", "exclusion"),
    )
    return d


@transaction.atomic
def lever_suspension(b: Boutique) -> Decision | None:
    """Décision humaine : la suspension est levée ; la période probatoire commence (L-1)."""
    d = (
        Decision.objects.select_for_update()
        .filter(boutique=b, type=Decision.Type.SUSPENSION, annulee_a__isnull=True, levee_a__isnull=True)
        .first()
    )
    if d is not None:
        d.levee_a = horloge.maintenant()
        d.save(update_fields=["levee_a"])
    b.suspendue_depuis = None
    b.save(update_fields=["suspendue_depuis"])
    return d


@transaction.atomic
def repondre_contestation(ident: str, issue: str, motif: str) -> dict:
    """Réponse écrite d'une personne à une contestation : maintenue, ou annulée (la décision cesse son effet)."""
    if issue not in Contestation.Issue.values:
        raise ValueError("issue : maintenue | annulee")
    d = Decision.objects.select_for_update().select_related("boutique").get(ident=ident)
    c = Contestation.objects.get(decision=d)
    t = horloge.maintenant()
    c.reponse_a, c.issue, c.motif_reponse = t, issue, motif
    c.save(update_fields=["reponse_a", "issue", "motif_reponse"])
    if issue == Contestation.Issue.ANNULEE:
        d.annulee_a = t
        d.save(update_fields=["annulee_a"])
        if d.type == Decision.Type.SUSPENSION:
            d.boutique.suspendue_depuis = None
            d.boutique.save(update_fields=["suspendue_depuis"])
    socle.notifier(d.boutique, "sanction", "Réponse à votre contestation", motif, f"contester?d={d.ident}&depuis=notifications")
    return decision_json(d)


@transaction.atomic
def enregistrer_releve(
    b: Boutique,
    score_: Decimal | str | float,
    *,
    jour: date | None = None,
    calcule_le: datetime | None = None,
    criteres_: dict | None = None,
) -> ReleveScore:
    """Relevé de la nuit envoyé par le service Scores (Q-37) : score exact, conditions du jour, critères
    ({cle: (poids, note, detail)}). Le palier n'est pas changé ici (montée : 14 jours ; descente : validée)."""
    t = calcule_le or horloge.maintenant()
    jour = jour or _jour(t)
    b.trust_score = Decimal(str(score_))
    b.score_calcule_le = t
    b.save(update_fields=["trust_score", "score_calcule_le"])
    r, _ = ReleveScore.objects.update_or_create(
        boutique=b,
        jour=jour,
        defaults={"score": b.trust_score, "commandes_livrees": b.commandes_livrees, "note": b.note, "visite": b.visite, "audit": b.audit},
    )
    for cle, (poids, note, detail) in (criteres_ or {}).items():
        CritereScore.objects.update_or_create(boutique=b, cle=cle, defaults={"poids": poids, "note": Decimal(str(note)), "detail": detail})
    return r


def journaliser_evenement(
    b: Boutique, libelle: str, effet: str, *, critere: str = "", ref: str = "", a: datetime | None = None
) -> EvenementScore:
    return EvenementScore.objects.create(boutique=b, a=a or horloge.maintenant(), libelle=libelle, effet=effet, critere=critere, ref=ref)


# ── Suspension (accueil VD-04) ─────────────────────────────────────────────────────────────────────────


def suspension(b: Boutique) -> dict | None:
    """Type Suspension de l'accueil (SUS-01 à SUS-03) : la suspension en cours, ou None. exemple : False."""
    ps = parametres.sanctions()
    d = next(
        (
            x
            for x in Decision.objects.filter(boutique=b, type=Decision.Type.SUSPENSION, annulee_a__isnull=True).select_related(
                "contestation"
            )
            if en_cours(x)
        ),
        None,
    )
    if d is None and b.suspendue_depuis is None:
        return None
    socle.synchroniser(b)
    c = _contestation(d) if d else None
    return {
        "niveau": 3,
        "depuis": ms(d.effet_a if d else b.suspendue_depuis),
        "motif": d.motif if d else "",
        "decision": d.ident if d else "",
        "contestation": {"envoyeeLe": ms(c.envoyee_a)} if c else None,
        "reponseHeuresOuvrees": parametres.contestation_reponse(),
        "scoreGeleSous": ps.suspension_sous_score,
        "controleProbatoire": ps.probatoire_commandes,
        "preparerEnCours": CommandeVendeur.objects.filter(boutique=b, prete_a__isnull=True, annulee_a__isnull=True).count(),
        "exemple": False,
    }


# ═════════════════════════════════════════ PALIERS : GET /tiers ══════════════════════════════════════════


def article_reference(b: Boutique) -> dict:
    """L'offre la plus vendue de la boutique (commandes reçues, non annulées) ; sans vente : ITEL AC52, 20 000 F,
    Électronique (« par ITEL » du paquet)."""
    ventes: dict[str, int] = {}
    for lignes in CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True).values_list("lignes", flat=True):
        for lg in lignes or []:
            if lg.get("offreId"):
                ventes[lg["offreId"]] = ventes.get(lg["offreId"], 0) + int(lg.get("quantite", 1))
    for oid, _ in sorted(ventes.items(), key=lambda kv: (-kv[1], int(kv[0]))):
        o = Offre.objects.select_related("fiche").filter(boutique=b, pk=oid, prix__isnull=False).first()
        if o is not None and o.fiche_id:
            return {"titre": o.titre, "prix": o.prix, "categorie": o.fiche.categorie, "mic": o.made_in_cameroon, "offre": o}
    return {**REFERENCE_DEFAUT, "offre": None}


def article_cher(b: Boutique, ref: dict) -> dict | None:
    """L'offre en vente la plus chère de la boutique (exemple « iPhone »), si elle coûte plus que la référence."""
    o = (
        Offre.objects.select_related("fiche")
        .filter(boutique=b, etat=Offre.Etat.EN_VENTE, fiche__isnull=False, prix__gt=ref["prix"])
        .order_by("-prix")
        .first()
    )
    if o is None:
        return None
    return {"titre": o.titre, "prix": o.prix, "categorie": o.fiche.categorie, "mic": o.made_in_cameroon}


def _garde(b: Boutique, a: dict, palier: str) -> int:
    return socle.garde_par_vente(b, a["categorie"], a["prix"], a["mic"], palier=palier)


def _vir(x) -> str:
    return f"{Decimal(x):.1f}".replace(".", ",")


def _litiges_en_cours(b: Boutique) -> int:
    from apps.aftersales.models import Litige

    orders = CommandeVendeur.objects.filter(boutique=b).values_list("order_id", flat=True)
    return Litige.objects.filter(order_id__in=list(orders), clos_le__isnull=True, retire_le__isnull=True).count()


def produits_actifs(b: Boutique) -> int:
    return Offre.objects.filter(boutique=b, etat=Offre.Etat.EN_VENTE, stock__gt=0).count()


def _jours_tenus(b: Boutique, palier: str) -> int:
    """Nuits de suite (jusqu'à la dernière) où le palier visé est atteint (moteur : palier_atteint)."""
    from belivay_moteurs.paliers import ORDRE, EtatDuJour, Palier, palier_atteint

    p = parametres.paliers()
    rang = ORDRE.index(Palier(palier))
    n = 0
    for r in reversed(_releves(b)):
        e = EtatDuJour(r.jour, Decimal(r.score), r.commandes_livrees, Decimal(r.note), r.visite, r.audit)
        if ORDRE.index(palier_atteint(e, p)) < rang:
            break
        n += 1
    return n


def mon_palier(b: Boutique, proprio: bool) -> dict:
    from belivay_moteurs.delais import ajouter_mois
    from belivay_moteurs.paliers import ORDRE, Palier, alerte_de_seuil, palier_de_lancement

    p = parametres.paliers()
    pv = parametres.versements()
    t = horloge.maintenant()
    jour = _jour(t)
    actuel = b.palier
    rang = ORDRE.index(Palier(actuel))
    suivant = ORDRE[rang + 1].value if rang + 1 < len(ORDRE) else None
    score_ = Decimal(b.trust_score)
    arrondi = int(score_.quantize(Decimal(1), rounding=ROUND_HALF_UP))
    c = p.conditions[suivant] if suivant else None

    conditions = []
    if c:
        tenu = score_ >= c.trust_score
        conditions.append(
            {
                "cle": "score",
                "libelle": f"Trust Score {c.trust_score} au moins",
                "valeur": str(arrondi),
                "tenue": tenu,
                "manque": None if tenu else f"+ {max(1, c.trust_score - arrondi)}",
            }
        )
        if c.commandes_livrees:
            tenu = b.commandes_livrees >= c.commandes_livrees
            conditions.append(
                {
                    "cle": "livrees",
                    "libelle": f"{c.commandes_livrees} commandes livrées",
                    "valeur": str(b.commandes_livrees),
                    "tenue": tenu,
                    "manque": None if tenu else f"+ {c.commandes_livrees - b.commandes_livrees}",
                }
            )
        if c.note > 0:
            conditions.append(
                {
                    "cle": "note",
                    "libelle": f"Note moyenne {_vir(c.note)} au moins",
                    "valeur": _vir(b.note),
                    "tenue": b.note >= c.note,
                    "manque": None,
                }
            )
        if c.visite:
            conditions.append(
                {
                    "cle": "visite",
                    "libelle": "Visite de la boutique par l’agent de zone",
                    "valeur": "faite" if b.visite else "à prévoir",
                    "tenue": b.visite,
                    "manque": None,
                }
            )
        if c.audit:
            conditions.append(
                {
                    "cle": "audit",
                    "libelle": "Audit chaque trimestre",
                    "valeur": "à jour" if b.audit else "à prévoir",
                    "tenue": b.audit,
                    "manque": None,
                }
            )
    livrees_manquantes = max(0, c.commandes_livrees - b.commandes_livrees) if c else 0
    tout_tenu = bool(conditions) and all(x["tenue"] for x in conditions)
    litiges = _litiges_en_cours(b)
    proj = ProjectionScore.objects.filter(boutique=b).first()

    seuil_actuel = None if actuel == "Bronze" else p.conditions[actuel].trust_score
    a = alerte_de_seuil(Palier(actuel), score_, p)
    alerte = {"sens": "montee" if a.sens == "montée" else "descente", "seuil": a.seuil, "points": a.points_affiches} if a else None

    d = decision_en_cours(b)
    descente = None
    if d is not None and d.type == Decision.Type.DESCENTE:
        ct = _contestation(d)
        descente = {
            "decisionId": d.ident,
            "vers": d.palier_vise,
            "motif": d.motif,
            "effetA": ms(d.effet_a),
            "contestee": ct is not None,
            "reponseAvant": ms(ct.reponse_avant) if ct else None,
        }

    ref = article_reference(b)
    cher = article_cher(b, ref)
    garde_actuel = _garde(b, ref, actuel)

    def liberation(pal: str) -> int:
        return pv.lib_or_jours if pal in ("Or", "Platine") else pv.lib_standard_jours

    libelles = {"Bronze": "Pièce d’identité et selfie validés"}
    for nom in ("Argent", "Or", "Platine"):
        k = p.conditions[nom]
        morceaux = [
            f"Trust Score {k.trust_score}",
            f"{k.commandes_livrees} commandes livrées" if k.commandes_livrees else "",
            f"note {_vir(k.note)}" if k.note > 0 else "",
            "visite de la boutique" if k.visite else "",
            "audit chaque trimestre" if k.audit else "",
        ]
        libelles[nom] = ", ".join(m for m in morceaux if m)
    pts = next((x for x in conditions if x["cle"] == "score" and not x["tenue"]), None)
    parts = [f"{pts['manque'][2:]} points" if pts else "", f"{livrees_manquantes} commandes livrées" if livrees_manquantes else ""]
    parts = [x for x in parts if x]
    manque_suivant = f"Il vous manque {' et '.join(parts)}" if parts else None

    lignes = []
    for i, pal in enumerate(x.value for x in ORDRE):
        g = _garde(b, ref, pal)
        lignes.append(
            {
                "palier": pal,
                "conditions": libelles[pal],
                "garde": g if proprio else None,
                "gardeExemple": (_garde(b, cher, pal) if cher else None) if proprio else None,
                "gainSurActuel": (g - garde_actuel if i > rang else 0) if proprio else None,
                "liberationJours": liberation(pal),
                "responsableDeCompte": pal == "Platine",
                "vous": pal == actuel,
                "manque": manque_suivant if pal == suivant else None,
            }
        )

    a_faire = max(livrees_manquantes, proj.commandes) if proj else livrees_manquantes
    projection = None
    if c and proj:
        projection = {
            "commandes": a_faire,
            "scoreApres": _un_dixieme(proj.score_apres),
            "litigesEnCours": litiges,
            "siGagnes": _un_dixieme(proj.si_gagnes) if litiges and proj.si_gagnes is not None else None,
            "siPerdus": _un_dixieme(proj.si_perdus) if litiges and proj.si_perdus is not None else None,
        }
    montee = None
    if tout_tenu:
        reste = max(0, p.montee_jours - _jours_tenus(b, suivant))
        montee = {"date": (jour + timedelta(days=reste)).isoformat()}
    dec = socle.decouverte(b, jour)
    signature = b.signature_le or b.cree_le
    lancement = palier_de_lancement(signature, jour, produits_actifs(b), p)
    return {
        "palier": actuel,
        "score": _un_dixieme(score_),
        "calculeA": ms(b.score_calcule_le or t),
        "suivant": suivant,
        "seuilSuivant": c.trust_score if c else None,
        "seuilActuel": seuil_actuel,
        "conditions": conditions,
        "commandesAFaire": a_faire if c else None,
        "projection": projection,
        "montee": montee,
        "descente": descente,
        "alerte": alerte,
        "reference": {
            "titre": ref["titre"],
            "prix": ref["prix"],
            "actuel": garde_actuel,
            "suivant": _garde(b, ref, suivant) if suivant else None,
        }
        if proprio
        else None,
        "exemple": {"titre": cher["titre"], "prix": cher["prix"], "gain": _garde(b, cher, suivant) - _garde(b, cher, actuel)}
        if proprio and suivant and cher
        else None,
        "liberationJours": {"actuel": liberation(actuel), "suivant": liberation(suivant) if suivant else None},
        "supportHeures": SUPPORT_HEURES,
        "decouverte": {"commandes": dec["commandes"], "max": dec["max"], "fin": dec["fin"]} if dec["active"] and dec["fin"] else None,
        "lancement": {
            "palier": lancement.value,
            "jusqua": ajouter_mois(signature, p.lancement_mois).isoformat(),
            "produitsActifs": produits_actifs(b),
        }
        if lancement
        else None,
        "montee14": p.montee_jours,
        "descente14": p.descente_jours,
        "remplacementMin": int(parametres.valeur("REMPL-TRUST-MIN")),
        "paliers": lignes,
    }


# ═══════════════════════════════════════════════ PLANS ═════════════════════════════════════════════════

PLANS = ("Free", "Boost", "Pro")
INCLUS = {
    "Free": [
        "Vendre sur BelivaY, versement chaque vendredi sans frais",
        "Vos chiffres des 30 derniers jours",
        "Les 3 premières recherches sans résultat de votre zone",
    ],
    "Boost": [
        "Vous gardez un peu plus sur chaque vente, jusqu’au prix du plan",
        "Vos chiffres sur 3 et 12 mois",
        "Toutes les recherches sans résultat de votre zone",
        "Alerte quand un produit est cherché sans résultat dans votre zone",
    ],
    "Pro": [
        "Vous gardez encore plus sur chaque vente, jusqu’au prix du plan",
        "Tout ce que contient Boost",
        "Chiffres par offre et par quartier, prix conseillé",
        "Badge Pro dans votre espace",
    ],
}


def abonnement(b: Boutique) -> EtatAbonnement:
    ab, _ = EtatAbonnement.objects.get_or_create(boutique=b)
    return ab


def _fin_periode(b: Boutique, ab: EtatAbonnement) -> date | None:
    from belivay_moteurs.delais import ajouter_mois
    from belivay_moteurs.plans import fin_essai

    if b.plan == "Free" or not ab.depuis:
        return None
    if ab.facturation == EtatAbonnement.Facturation.ESSAI:
        return fin_essai(ab.depuis, parametres.commission())
    return ajouter_mois(ab.depuis, 12 if ab.facturation == EtatAbonnement.Facturation.ANNUELLE else 1)


def _retour_free(b: Boutique, ab: EtatAbonnement) -> None:
    b.plan = "Free"
    b.save(update_fields=["plan"])
    ab.facturation, ab.depuis, ab.arret, ab.echec_le = "", None, False, None
    ab.save()


def appliquer_echeances(b: Boutique) -> EtatAbonnement:
    """Échéances du plan, par le moteur (plans.py) : essai fini sans premier paiement confirmé (PLN-05), grâce finie
    après un paiement échoué (PLN-02), arrêt demandé et période finie : retour à Free sans rien perdre."""
    from belivay_moteurs.plans import plan_apres_echec, plan_apres_essai

    ab = abonnement(b)
    if b.plan == "Free":
        return ab
    pc = parametres.commission()
    jour = horloge.aujourd_hui()
    fin = _fin_periode(b, ab)
    if ab.facturation == EtatAbonnement.Facturation.ESSAI and ab.depuis:
        if plan_apres_essai(b.plan, ab.depuis, jour, ab.premier_paiement_confirme, pc).value == "Free":
            _retour_free(b, ab)
            return ab
    if ab.echec_le and plan_apres_echec(b.plan, ab.echec_le, jour, False, pc).value == "Free":
        _retour_free(b, ab)
        return ab
    if ab.arret and fin and jour >= fin:
        _retour_free(b, ab)
    return ab


def _prix(plan: str, facturation: str) -> int:
    from belivay_moteurs.plans import prix_annuel, prix_mensuel

    pc = parametres.commission()
    return prix_annuel(plan, pc) if facturation == "annuelle" else prix_mensuel(plan, pc)


def offres_plans(b: Boutique) -> list[dict]:
    from belivay_moteurs.plans import prix_annuel, prix_mensuel

    pc = parametres.commission()
    ab = appliquer_echeances(b)
    return [
        {
            "plan": plan,
            "prixMensuel": prix_mensuel(plan, pc),
            "prixAnnuel": None if plan == "Free" else prix_annuel(plan, pc),
            "remisePourCent": 0 if plan == "Free" else int(pc.plans[plan].remise_pour_cent),
            "actuel": b.plan == plan,
            "inclus": INCLUS[plan],
            "essaiPossible": plan != "Free" and plan not in ab.essais,
        }
        for plan in PLANS
    ]


def gain_decouverte(b: Boutique) -> dict:
    ref = article_reference(b)
    avec = socle.garde_par_vente(b, ref["categorie"], ref["prix"], ref["mic"], decouverte_active=True)
    sans = socle.garde_par_vente(b, ref["categorie"], ref["prix"], ref["mic"], decouverte_active=False)
    return {"titre": ref["titre"], "prix": ref["prix"], "gain": avec - sans}


def etat_plan(b: Boutique) -> dict:
    from belivay_moteurs.commission import fin_decouverte
    from belivay_moteurs.plans import fin_de_grace, fin_essai, rappel_essai, tva_du_plan

    pc = parametres.commission()
    ab = appliquer_echeances(b)
    b.refresh_from_db(fields=["plan"])
    jour = horloge.aujourd_hui()
    essai = b.plan != "Free" and ab.facturation == EtatAbonnement.Facturation.ESSAI and ab.depuis
    fin = _fin_periode(b, ab)
    prochain = None
    if fin and not ab.arret:
        prix = _prix(b.plan, "mensuelle" if essai else ab.facturation)
        prochain = {"jour": fin.isoformat(), "montant": prix + tva_du_plan(prix, pc)}
    dec = socle.decouverte(b, jour)
    fin_dec = date.fromisoformat(dec["fin"]) if dec["fin"] else fin_decouverte(jour, pc)
    return {
        "plan": b.plan,
        "facturation": None if b.plan == "Free" else (ab.facturation or None),
        "depuis": _iso(ab.depuis) if b.plan != "Free" else None,
        "finEssai": _iso(fin_essai(ab.depuis, pc)) if essai else None,
        "rappelLe": _iso(rappel_essai(ab.depuis, pc)) if essai else None,
        "finPeriode": _iso(fin),
        "prochainPaiement": prochain,
        "paiementEchoue": {"le": ab.echec_le.isoformat(), "graceJusqua": fin_de_grace(ab.echec_le, pc).isoformat()}
        if ab.echec_le and b.plan != "Free"
        else None,
        "arretDemande": ab.arret,
        "numero": socle.numero_court(b) or {"operateur": "", "masque": ""},
        "decouverte": {
            "commandes": dec["commandes"],
            "max": dec["max"],
            "fin": fin_dec.isoformat(),
            "active": dec["active"],
            "gain": gain_decouverte(b),
        },
        "surMesureDes": parametres.simulateur().sur_mesure_des,
    }


# ── Simulateur ─────────────────────────────────────────────────────────────────────────────────────────


def ventes_du_mois(b: Boutique) -> int:
    """Ventes encaissées du mois civil (commandes reçues, non annulées, hors paiement au retrait).
    ÉCART : Mes gains (vendeur_argent) compte les ventes LIBÉRÉES du mois (Q-83) ; à lire chez lui une fois écrit."""
    j = horloge.aujourd_hui()
    debut = datetime(j.year, j.month, 1, tzinfo=YAOUNDE)
    qs = CommandeVendeur.objects.filter(
        boutique=b, payee_a__gte=debut, payee_a__lte=horloge.maintenant(), annulee_a__isnull=True, payable_au_retrait=False
    )
    return sum(qs.values_list("prix", flat=True))


def _simuler(b: Boutique, ref: dict, unites: int, facturation: str):
    from belivay_moteurs.commission import simuler_plans

    vente = socle.garde(
        [{"categorie": ref["categorie"], "prix": ref["prix"], "quantite": 1, "madeInCameroon": ref["mic"]}],
        b.palier,
        socle.decouverte(b)["active"],
    )
    return simuler_plans([vente] * unites, parametres.commission(), facturation)


def simulation(b: Boutique, ventes: int | None = None, facturation: str = "mensuelle") -> dict:
    ref = article_reference(b)
    pas = ref["prix"]
    vdm = ventes_du_mois(b)
    plafond = parametres.simulateur().maximum
    v = min(plafond, max(0, round((vdm if ventes is None else ventes) / pas) * pas))
    s = _simuler(b, ref, v // pas, facturation)

    def gardes(sim) -> dict:
        return {k.value: g for k, g in sim.gardes.items()}

    seuils = {}
    for plan in ("Boost", "Pro"):
        seuils[plan] = None
        for n in range(1, plafond // pas + 1):
            g = _simuler(b, ref, n, facturation).gardes
            if g[plan] >= g[next(k for k in g if k.value == "Free")]:
                seuils[plan] = n * pas
                break
    points = sorted({x for x in (round(vdm / pas) * pas, seuils["Boost"], seuils["Pro"]) if x is not None and x <= plafond})
    reperes = []
    for x in points:
        r = _simuler(b, ref, x // pas, facturation)
        reperes.append({"ventes": x, "gardes": gardes(r), "meilleur": r.meilleur.value})
    g = gardes(s)
    return {
        "facturation": facturation,
        "ventes": v,
        "unites": v // pas,
        "base": {"categorie": ref["categorie"], "palier": b.palier, "titre": ref["titre"], "prix": ref["prix"]},
        "gardes": g,
        "meilleur": s.meilleur.value,
        "rembourse": {p: g[p] >= g["Free"] and v > 0 for p in ("Boost", "Pro")},
        "seuils": seuils,
        "reperes": reperes,
        "ventesDuMois": vdm,
        "pas": pas,
        "max": plafond,
    }


# ── Essai, souscription, paiements ────────────────────────────────────────────────────────────────────


def paiement_json(d: DemandePaiement) -> dict:
    return {"id": str(d.pk), "montant": d.montant, "objet": d.objet, "envoyeeA": ms(d.envoyee_a), "statut": d.statut}


@transaction.atomic
def essayer(b: Boutique, plan: str) -> dict:
    """Essai d'un mois offert (A-2) : le plan s'active tout de suite, 0 F aujourd'hui ; un essai par plan."""
    from belivay_moteurs.plans import fin_essai, rappel_essai

    b = Boutique.objects.select_for_update().get(pk=b.pk)
    ab = appliquer_echeances(b)
    if b.plan == plan:
        return {"ok": False, "raison": "deja_actif"}
    if plan in ab.essais:
        return {"ok": False, "raison": "deja_essaye"}
    jour = horloge.aujourd_hui()
    pc = parametres.commission()
    b.plan = plan
    b.save(update_fields=["plan"])
    ab.essais = [*ab.essais, plan]
    ab.facturation, ab.depuis, ab.arret, ab.echec_le, ab.premier_paiement_confirme = (
        EtatAbonnement.Facturation.ESSAI,
        jour,
        False,
        None,
        False,
    )
    ab.save()
    return {"ok": True, "finEssai": fin_essai(jour, pc).isoformat(), "rappelLe": rappel_essai(jour, pc).isoformat()}


def _demande(b: Boutique, membre: Membre | None, montant: int, objet: str, **quoi) -> DemandePaiement:
    """Demande de paiement Mobile Money envoyée sur le numéro de versement (PLN-04). En production : l'agrégateur
    (CamPay, DP-03) reçoit la demande ; sa confirmation arrive par le webhook (confirmer_paiement)."""
    return DemandePaiement.objects.create(boutique=b, membre=membre, montant=montant, objet=objet, envoyee_a=horloge.maintenant(), **quoi)


@transaction.atomic
def souscrire(b: Boutique, membre: Membre | None, plan: str, facturation: str) -> dict:
    from belivay_moteurs.plans import tva_du_plan

    ab = appliquer_echeances(b)
    if b.plan == plan and ab.facturation == facturation:
        return {"ok": False, "raison": "deja_actif"}
    prix = _prix(plan, facturation)
    d = _demande(
        b,
        membre,
        prix + tva_du_plan(prix, parametres.commission()),
        f"{plan} · {'un an' if facturation == 'annuelle' else 'un mois'}",
        quoi=DemandePaiement.Quoi.PLAN,
        plan=plan,
        facturation=facturation,
    )
    return {"ok": True, "demande": paiement_json(d)}


def paiement(b: Boutique, ident: str) -> DemandePaiement | None:
    return DemandePaiement.objects.filter(boutique=b, pk=int(ident)).first() if str(ident).isdigit() else None


@transaction.atomic
def annuler_paiement(b: Boutique, ident: str) -> None:
    d = paiement(b, ident)
    if d is not None and d.statut == DemandePaiement.Statut.EN_ATTENTE:
        d.statut, d.refusee_a = DemandePaiement.Statut.REFUSE, horloge.maintenant()
        d.save(update_fields=["statut", "refusee_a"])


@transaction.atomic
def confirmer_paiement(demande_id: int, reussi: bool) -> dict:
    """Webhook de l'agrégateur Mobile Money (payment.confirmed / payment.failed). Confirmée, la demande active ce
    qu'elle paie : plan (Boutique.plan, facturation, période) ou service (visite de l'agent sous 72 h ouvrées).
    Refusée : rien n'est activé ; le renouvellement d'un plan payé ouvre la grâce de 7 jours (PLN-02). Rejouée :
    rien ne change (idempotent)."""
    d = DemandePaiement.objects.select_for_update().select_related("boutique").get(pk=demande_id)
    if d.statut != DemandePaiement.Statut.EN_ATTENTE:
        return paiement_json(d)
    t = horloge.maintenant()
    b = Boutique.objects.select_for_update().get(pk=d.boutique_id)
    ab = abonnement(b)
    if not reussi:
        d.statut, d.refusee_a = DemandePaiement.Statut.REFUSE, t
        d.save(update_fields=["statut", "refusee_a"])
        if d.quoi == DemandePaiement.Quoi.PLAN and b.plan == d.plan and ab.facturation in ("mensuelle", "annuelle"):
            ab.echec_le = _jour(t)
            ab.save(update_fields=["echec_le"])
            socle.notifier(
                b, "versement", "Paiement du plan refusé", f"{d.objet} : nouvel essai possible pendant 7 jours.", "plans", argent=True
            )
        return paiement_json(d)
    d.statut, d.confirmee_a = DemandePaiement.Statut.CONFIRME, t
    if d.quoi == DemandePaiement.Quoi.PLAN:
        b.plan = d.plan
        b.save(update_fields=["plan"])
        ab.facturation, ab.depuis, ab.arret, ab.echec_le, ab.premier_paiement_confirme = d.facturation, _jour(t), False, None, True
        if d.plan not in ab.essais:
            ab.essais = [*ab.essais, d.plan]  # un plan payé ne s'essaie plus
        ab.save()
    elif d.service == "agent_photos":
        d.visite_avant = apres_heures_ouvrees(t, parametres.visite_agent())
    d.save()
    socle.notifier(b, "versement", "Paiement confirmé", d.objet, "plans", argent=True)
    return paiement_json(d)


@transaction.atomic
def arreter(b: Boutique, arret: bool) -> dict:
    ab = appliquer_echeances(b)
    if b.plan != "Free":
        ab.arret = bool(arret)
        ab.save(update_fields=["arret"])
    return etat_plan(b)


# ── Visibilité au mérite (DP-14, Q-32, P-3 : aucune visibilité payante) ──────────────────────────────────


def _flash_registre() -> dict:
    import re

    ouvert = parametres.valeur("FF-FLASH", "fermé").startswith("ouvert")
    remise = int(re.match(r"(\d+)", parametres.valeur("FLASH-REMISE-MIN")).group(1))
    duree = int(re.match(r"(\d+)", parametres.valeur("FLASH-DUREE-MAX")).group(1))
    return {"ouvert": ouvert, "remiseMin": remise, "relueAuDela": parametres.visibilite().flash_relue_au_dela, "dureeMaxHeures": duree}


def visibilite(b: Boutique) -> dict:
    t = horloge.maintenant()
    j = horloge.aujourd_hui()
    debut_mois = datetime(j.year, j.month, 1, tzinfo=YAOUNDE)
    m = MeriteVisibilite.objects.select_related("offre__fiche").filter(boutique=b).first()
    offre = (
        m.offre
        if m
        else (article_reference(b)["offre"] or Offre.objects.filter(boutique=b, etat=Offre.Etat.EN_VENTE).order_by("prix", "pk").first())
    )
    stock = offre.stock if offre else 0
    flash = _flash_registre()
    vis = parametres.visibilite()

    def recompense(rid: str, type_: str, titre: str, jours: int | None) -> dict:
        u = UtilisationRecompense.objects.filter(boutique=b, recompense=rid, utilisee_a__gte=debut_mois).first()
        return {
            "id": rid,
            "type": type_,
            "titre": titre,
            "offreId": str(offre.pk),
            "offreTitre": offre.titre,
            "jours": jours,
            "disponible": u is None,
            "enCoursJusqua": ms(u.jusqua) if u and u.jusqua and u.jusqua > t else None,
            "venteFlash": {"remisePourCent": u.flash_remise, "etat": u.flash_etat} if u and u.flash_etat else None,
        }

    recompenses = []
    if m is not None:
        recompenses.append(recompense("REC-VITRINE", "vitrine", "Vitrine de quartier", vis.vitrine_jours))
        if flash["ouvert"]:
            recompenses.append(recompense("REC-FLASH", "flash", "Vente flash", None))
    bloque = "score_trop_bas" if b.trust_score < vis.score_min else "rupture" if stock <= 0 else None
    return {
        "merite": {
            "gagne": m is not None,
            "raison": m.raison if m else "",
            "offreTitre": offre.titre if offre else REFERENCE_DEFAUT["titre"],
            "joursDeSuite": m.jours_de_suite if m else 0,
            "joursRequis": vis.merite_jours,
        },
        "recompenses": recompenses,
        "bloque": bloque,
        "scoreMin": vis.score_min,
        "stockOffre": stock,
        "flash": flash,
    }


@transaction.atomic
def utiliser_recompense(b: Boutique, rid: str) -> dict:
    v = visibilite(b)
    r = next((x for x in v["recompenses"] if x["id"] == rid), None)
    if r is None or not r["disponible"]:
        return {"ok": False, "raison": "deja_utilisee"}
    if v["bloque"]:
        return {"ok": False, "raison": v["bloque"]}
    t = horloge.maintenant()
    jusqua = t + timedelta(days=r["jours"] or 0)
    UtilisationRecompense.objects.create(boutique=b, recompense=rid, utilisee_a=t, jusqua=jusqua)
    return {"ok": True, "jusqua": ms(jusqua)}


@transaction.atomic
def programmer_vente_flash(b: Boutique, rid: str, remise) -> dict:
    v = visibilite(b)
    r = next((x for x in v["recompenses"] if x["id"] == rid and x["type"] == "flash"), None)
    if not v["flash"]["ouvert"] or r is None:
        return {"ok": False, "raison": "ferme"}
    if not r["disponible"]:
        return {"ok": False, "raison": "deja_utilisee"}
    if v["bloque"]:
        return {"ok": False, "raison": v["bloque"]}
    if isinstance(remise, bool) or not isinstance(remise, int) or remise < v["flash"]["remiseMin"]:
        return {"ok": False, "raison": "remise_trop_basse"}
    if remise > FLASH_REMISE_MAX:
        return {"ok": False, "raison": "remise_trop_haute"}
    etat = "en_verification" if remise > v["flash"]["relueAuDela"] else "programmee"
    UtilisationRecompense.objects.create(boutique=b, recompense=rid, utilisee_a=horloge.maintenant(), flash_remise=remise, flash_etat=etat)
    # Une seule notion (DP-58) : la vente offerte entre dans la liste des Promotions (origine « merite »), mêmes règles.
    from .promotions import creer_au_merite

    o = Offre.objects.filter(boutique=b, pk=int(r["offreId"])).first()
    if o is not None:
        creer_au_merite(b, o, remise)
    return {"ok": True, "etat": etat}


# ── Services ──────────────────────────────────────────────────────────────────────────────────────────

SERVICES_IDS = ("agent_photos", "fiche_prioritaire", "saisie_assistee")


def services_proposes() -> list[dict]:
    """Les services qui lèvent les freins, prix lus au registre : VD-SERVICES (photos par un agent), VD-FICHE-DELAI
    (fiche prioritaire), VD-SAISIE-ASSISTEE (session suivante) ; DP-56 Q-40."""
    sv, fd, sa = parametres.services(), parametres.fiche_delai(), parametres.saisie_assistee()
    lot = f"les {sv.photos_agent_lot} produits"
    return [
        {"id": "agent_photos", "titre": "Photos par un agent BelivaY", "prix": sv.photos_agent_prix, "unite": lot, "route": None},
        {"id": "fiche_prioritaire", "titre": "Fiche prioritaire", "prix": fd.prioritaire_prix, "unite": "la fiche", "route": "fiche"},
        {"id": "saisie_assistee", "titre": "Saisie assistée", "prix": sa.prix_session, "unite": "la session", "route": "saisie_assistee"},
    ]


def saisie_gratuite(b: Boutique) -> bool:
    """Saisie assistée offerte aux premières boutiques de la zone (VD-SAISIE-ASSISTEE, DP-56, Q-40)."""
    n = parametres.saisie_assistee().premieres_boutiques
    premieres = Boutique.objects.filter(zone=b.zone).order_by("cree_le", "pk").values_list("pk", flat=True)[:n]
    return b.pk in list(premieres)


def _frein_photo(b: Boutique) -> FreinReleve | None:
    if DemandePaiement.objects.filter(boutique=b, service="agent_photos", statut=DemandePaiement.Statut.CONFIRME).exists():
        return None
    return FreinReleve.objects.filter(boutique=b, type=FreinReleve.Type.PHOTO, actif=True).first()


def services_de(b: Boutique) -> dict:
    t = horloge.maintenant()
    photo = _frein_photo(b)
    liste = []
    for s in services_proposes():
        confirme = DemandePaiement.objects.filter(boutique=b, service=s["id"], statut=DemandePaiement.Statut.CONFIRME).first()
        attente = DemandePaiement.objects.filter(boutique=b, service=s["id"], statut=DemandePaiement.Statut.EN_ATTENTE).first()
        demande = None
        if confirme is not None:
            if confirme.visite_faite_le:
                statut = "confirme"
            elif confirme.visite_avant and confirme.visite_avant < t:
                statut = "rembourse"
            else:
                statut = "visite_prevue" if confirme.visite_avant else "confirme"
            demande = {
                "id": str(confirme.pk),
                "statut": statut,
                "visiteAvant": ms(confirme.visite_avant) if confirme.visite_avant else None,
            }
        elif attente is not None:
            demande = {"id": str(attente.pk), "statut": "en_attente", "visiteAvant": None}
        liste.append(
            {
                **s,
                "gratuit": s["id"] == "saisie_assistee" and saisie_gratuite(b),
                "frein": photo.titre if s["id"] == "agent_photos" and photo else None,
                "demande": demande,
            }
        )
    liste.sort(key=lambda x: x["frein"] is None)
    return {
        "zone": b.zone,
        "numero": socle.numero_court(b) or {"operateur": "", "masque": ""},
        "delaiVisiteHeures": parametres.visite_agent(),
        "liste": liste,
    }


@transaction.atomic
def demander_service(b: Boutique, membre: Membre | None, service: str) -> dict:
    s = next(x for x in services_proposes() if x["id"] == service)
    if service == "saisie_assistee" and saisie_gratuite(b):
        return {"ok": False, "raison": "gratuit_ailleurs"}
    if DemandePaiement.objects.filter(boutique=b, service=service).exclude(statut=DemandePaiement.Statut.REFUSE).exists():
        return {"ok": False, "raison": "deja_demande"}
    d = _demande(b, membre, s["prix"], s["titre"], quoi=DemandePaiement.Quoi.SERVICE, service=service)
    return {"ok": True, "demande": paiement_json(d)}


# ── Chiffres et demande de la zone ────────────────────────────────────────────────────────────────────


def stats(b: Boutique) -> dict:
    """Chiffres des 30 derniers jours, lus dans les commandes reçues par la boutique (CommandeVendeur)."""
    from apps.aftersales.models import Retour
    from belivay_moteurs.argent import pour_cent_affiche

    socle.synchroniser(b)
    t = horloge.maintenant()
    debut = t - timedelta(days=STATS_JOURS)
    dans = list(CommandeVendeur.objects.filter(boutique=b, payee_a__gte=debut, payee_a__lte=t, annulee_a__isnull=True))
    encaissees = [c for c in dans if not c.payable_au_retrait]
    ventes = sum(c.prix for c in encaissees)
    livrees = [c for c in dans if c.remise_a]
    retours = Retour.objects.filter(litige__order_id__in=[c.order_id for c in livrees]).values("litige__order_id").distinct().count()
    vues = sum(VuesOffre.objects.filter(offre__boutique=b, jour__gt=_jour(debut), jour__lte=_jour(t)).values_list("vues", flat=True))
    par_jour = [{"jour": j, "ventes": sum(c.prix for c in encaissees if _jour(c.payee_a).weekday() == j)} for j in range(7)]
    par_offre: dict[str, dict] = {}
    for c in encaissees:
        for lg in c.lignes or []:
            k = lg.get("offreId") or lg.get("titre", "")
            x = par_offre.setdefault(k, {"offreId": str(k), "titre": lg.get("titre", ""), "ventes": 0, "jours": set()})
            x["ventes"] += int(lg["prix"]) * int(lg.get("quantite", 1))
            x["jours"].add(_jour(c.payee_a).weekday())
    produits = sorted(par_offre.values(), key=lambda x: -x["ventes"])
    total = sum(x["ventes"] for x in produits)
    par_produit = [
        {
            "offreId": x["offreId"],
            "titre": x["titre"],
            "ventes": x["ventes"],
            "partPourCent": pour_cent_affiche(x["ventes"], total) if total else 0,
        }
        for x in produits
    ]
    premier = par_produit[0] if par_produit else None
    return {
        "jours": STATS_JOURS,
        "ventes": ventes,
        "commandes": len(dans),
        "encaissees": len(encaissees),
        "panierMoyen": round(ventes / len(encaissees)) if encaissees else 0,
        "retoursPourCent": pour_cent_affiche(retours, len(livrees)) if livrees else 0,
        "vues": vues,
        "conversionPourCent": round(len(encaissees) / vues * 100, 1) if vues else 0,
        "parJour": par_jour,
        "parProduit": par_produit,
        "meilleursJours": sorted(produits[0]["jours"]) if produits else [],
        "dependance": {"titre": premier["titre"], "partPourCent": premier["partPourCent"]}
        if premier and len(par_produit) > 1 and premier["partPourCent"] > DEPENDANCE_POUR_CENT
        else None,
        "historiqueVerrouille": b.plan == "Free",
    }


def demande(b: Boutique, proprio: bool) -> dict:
    free = b.plan == "Free"
    visibles = parametres.demande().visibles_free
    recherches = RechercheZone.objects.filter(zone=b.zone)
    freins = []
    photo = _frein_photo(b)
    for f in [photo, *FreinReleve.objects.filter(boutique=b, actif=True).exclude(type=FreinReleve.Type.PHOTO).order_by("id")]:
        if f is not None:
            freins.append(
                {
                    "type": f.type,
                    "titre": f.titre,
                    "texte": f.texte if proprio else (f.texte_preparation or f.texte),
                    "solution": f.solution,
                    "route": f.route,
                }
            )
    return {
        "zone": b.zone,
        "recherches": [{"mots": r.mots, "fois": r.fois, "verrouillee": free and i >= visibles} for i, r in enumerate(recherches)],
        "visiblesSansBoost": visibles,
        "freins": freins,
    }


# ═══════════════════════════════════════ Pour les autres applications ═══════════════════════════════════


def idee_du_jour(b: Boutique) -> dict | None:
    """{recherche, fois, jours} : la recherche sans résultat la plus fréquente de la zone (accueil, ACC-12)."""
    r = RechercheZone.objects.filter(zone=b.zone, fois__gt=0).first()
    return {"recherche": r.mots, "fois": r.fois, "jours": r.periode_jours} if r else None


def factures(b: Boutique) -> dict:
    """Factures de la croissance pour Documents (VD-09) : abonnement (plans payés, confirmés) ; visibilité : aucune
    (DP-14 : aucune visibilité payante). Le plus récent d'abord."""
    payes = DemandePaiement.objects.filter(
        Q(boutique=b) & Q(quoi=DemandePaiement.Quoi.PLAN) & Q(statut=DemandePaiement.Statut.CONFIRME)
    ).order_by("-confirmee_a")
    return {
        "abonnement": [
            {"periode": _jour(d.confirmee_a).strftime("%Y-%m"), "emisLe": _jour(d.confirmee_a).isoformat(), "libelle": d.objet}
            for d in payes
        ],
        "visibilite": [],
    }
