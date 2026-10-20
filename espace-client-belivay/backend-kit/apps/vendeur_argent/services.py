# backend/apps/vendeur_argent/services.py
# L'argent du vendeur (VD-09 ; ARG-01, LIB-01, LIB-02, GEL-01 à GEL-03, GAI-01 à GAI-03, DOC-01, DOC-02 ; DP-55) et ses
# versements du vendredi (VER-02 à VER-05 ; Q-11 à Q-13, Q-19, Q-59, Q-65). AUCUN calcul recodé : tout passe par
# belivay_moteurs.versements et belivay_moteurs.argent_vendeur, avec vendeur_core.parametres.versements().
#
#   ventes(b)                  — une Vente par commande payée de la boutique : faits du client (vendeur_core.faits),
#                                fermeture du retour, libération (palier du Trust Score = Boutique.palier ; carte, Apple,
#                                Google, USD, EUR : délai carte), gel (litige, retour, recours), gardé FIGÉ au paiement
#                                (CommandeVendeur.garde), versement lié ; Gain du moteur (verse = crédité).
#   executer_versements(b)     — l'arrêté du jeudi 23 h 59 : pour chaque vendredi dont l'arrêté est passé, un Versement
#                                de montant_du (sans frais ni minimum, reprise déduite) ; « envoyé » après l'arrêté,
#                                « crédité » après l'heure limite du vendredi ; numéro en revue : rien ne part avant le
#                                vendredi qui suit la revue. Idempotent ; appelé au début de chaque lecture d'argent.
#   refuser_versement, crediter — l'opérateur (routes d'essai du coordinateur).
#   versement_de(c), a_verser(b) — pour les autres applications.
#
# « BelivaY ne perd jamais » (DP-55) : une somme gelée ne part pas ; une vente perdue avant son versement n'est jamais
# due ; perdue après, elle est reprise sur les versements suivants (Reprise).
# ANONYMAT (GEN-01) : aucune sortie ne porte le client (ni nom, ni numéro, ni relais, ni total payé).
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from django.db import transaction
from django.db.models import Max

from apps.client_core.temps import YAOUNDE, ms
from apps.vendeur_core import horloge, parametres
from apps.vendeur_core import services as socle
from apps.vendeur_core.faits import Faits, faits
from apps.vendeur_core.models import Boutique, CommandeVendeur, Offre

from .models import ChangementNumero, Reprise, Versement, VersementCommande

# Moyens au délai de libération « carte » (VD-LIB-CARTE, DP-23) : carte bancaire, Apple Pay, Google Pay, USD, EUR.
MOYENS_CARTE = {"carte", "apple", "google", "usd", "eur"}
# « Versement non reçu » (VER-03) : le support répond avant le lundi suivant à 12 h.
# PARAMÈTRE À AJOUTER AU REGISTRE : VD-VER-NON-RECU (« réponse le lundi suivant avant 12 h »)
NON_RECU_JOUR, NON_RECU_HEURE = 0, 12
# Payé d'avance, livraison gérée par BelivaY : rien d'impayé ni de transport à la charge du vendeur (ACC-12, REFVD-R80).
IMPAYES, TRANSPORT = 0, 0
# Grille du contrat (part gardée par catégorie) : prix de référence affichés (DOC-02, contrat vendeur).
# PARAMÈTRE À AJOUTER AU REGISTRE : VD-CONTRAT-PRIX (« 10 000 F · 50 000 F · 200 000 F »)
PRIX_CONTRAT = (10000, 50000, 200000)


def _pv():
    return parametres.versements()


def jour_y(t: datetime) -> date:
    return t.astimezone(YAOUNDE).date()


def mois_y(t: datetime) -> str:
    return jour_y(t).isoformat()[:7]


def _ms(x):
    return ms(x) if x is not None else None


# ── Les ventes et leur argent ──────────────────────────────────────────────────────────────────────────


@dataclass
class Vente:
    c: CommandeVendeur
    f: Faits
    fermeture: datetime | None
    liberation: datetime | None
    carte: bool
    lien: VersementCommande | None
    gain: object  # belivay_moteurs.versements.Gain (verse = crédité)
    etat: str  # EtatArgent du moteur : « En cours », « Se libère », « Gelé », « À verser », « Versé »

    @property
    def vendredi(self) -> date | None:
        if self.lien is not None:
            return self.lien.versement.vendredi
        from belivay_moteurs.argent_vendeur import date_de_versement

        return date_de_versement(self.gain, horloge.maintenant(), _pv())


ETATS_SITE = {"En cours": "en_cours", "Se libère": "se_libere", "Gelé": "gele", "À verser": "a_verser", "Versé": "verse"}


def _lien(c: CommandeVendeur) -> VersementCommande | None:
    try:
        return c.versement_lien
    except VersementCommande.DoesNotExist:
        return None


def _fin_du_gel(f: Faits) -> datetime | None:
    """Fin du gel d'un litige décidé : la fin du délai de recours (ou la réponse au recours), jamais avant la clôture
    (litiges.fin_du_gel, DP-56 Q-26)."""
    if f.litige_id is None or f.fin_du_gel is None:
        return f.fin_du_gel
    from apps.aftersales.models import Litige
    from belivay_moteurs.litiges import fin_du_gel

    lit = Litige.objects.filter(pk=f.litige_id).first()
    if lit is None or lit.decision_le is None:
        return f.fin_du_gel
    fin = fin_du_gel(lit.decision_le, lit.recours_le, lit.clos_le if lit.recours_le else None, parametres.litiges())
    return max(f.fin_du_gel, fin) if fin else f.fin_du_gel


def ventes(b: Boutique, t: datetime | None = None) -> list[Vente]:
    """Les ventes de la boutique et l'état de leur argent (argent_vendeur.etat_de_l_argent) à l'instant t."""
    from belivay_moteurs.argent_vendeur import etat_de_l_argent
    from belivay_moteurs.versements import Gain, MotifGel, date_de_liberation, fermeture_du_retour, liberation_apres_litige

    t = t or horloge.maintenant()
    pv = _pv()
    out = []
    qs = (
        CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True, remplacement_de="")  # un remplacement n'est pas une vente
        .select_related("versement_lien__versement")
        .order_by("payee_a", "id")
    )
    for c in qs:
        lien = _lien(c)
        f = faits(c, t)
        if c.payable_au_retrait and f.retrait is None and lien is None:
            continue  # payable au retrait : rien n'est dû avant que le client paie au comptoir
        if f.perdu:
            if lien is None:
                continue  # perdue avant d'être versée : la somme n'est jamais due (DP-55)
            _reprise(b, c, f)
        carte = c.moyen in MOYENS_CARTE
        fermeture = fermeture_du_retour(f.retrait, f.tout_en_ordre, pv) if f.retrait else None
        lib = date_de_liberation(fermeture, b.palier, carte, pv) if fermeture else None
        fin = _fin_du_gel(f)
        if lib is not None and fin is not None and not f.perdu:
            lib = liberation_apres_litige(lib, fin)
        if lien is not None:
            lib = lien.liberation  # libération figée au versement
        gel = MotifGel(f.gel) if f.gel and lien is None else None
        gain = Gain(c.ref, c.garde, lib, verse=bool(lien and lien.versement.statut == Versement.Statut.CREDITE), gel=gel)
        out.append(Vente(c, f, fermeture, lib, carte, lien, gain, etat_de_l_argent(gain, t).value))
    return out


def _reprise(b: Boutique, c: CommandeVendeur, f: Faits) -> Reprise:
    """Vente déjà versée puis perdue (litige décidé contre le vendeur) : le gardé est repris (H7, Q-11)."""
    r = Reprise.objects.filter(commande=c).first()
    if r is None:
        r = Reprise.objects.create(
            boutique=b,
            commande=c,
            montant=max(0, c.garde),
            decidee_le=f.fin_du_gel or horloge.maintenant(),
            motif="Litige tranché après le versement",
        )
        socle.notifier(
            b, "versement", "Montant repris", f"{c.ref} : {c.garde} F déduits de vos prochains versements.", "argent/gains", argent=True
        )
    return r


def a_verser_gains(vs: list[Vente]) -> list:
    """Gains pas encore liés à un versement (le montant dû d'un vendredi ne compte qu'eux)."""
    return [v.gain for v in vs if v.lien is None]


def article(c: CommandeVendeur) -> dict:
    lg = (c.lignes or [{}])[0]
    return {"titre": lg.get("titre", ""), "variante": lg.get("variante", ""), "dessin": lg.get("dessin", "")}


def quantite(c: CommandeVendeur) -> int:
    return sum(int(lg.get("quantite", 1)) for lg in c.lignes or []) or 1


def mouvement(v: Vente, t: datetime) -> dict:
    from belivay_moteurs.versements import progression_pour_cent

    etat = ETATS_SITE[v.etat]
    vendredi = v.vendredi
    return {
        "ref": v.c.ref,
        "etat": etat,
        "garde": v.c.garde,
        "liberation": _ms(v.liberation),
        "vendredi": vendredi.isoformat() if vendredi else None,
        "progression": progression_pour_cent(v.fermeture, v.liberation, t) if etat == "se_libere" and v.fermeture else None,
        "article": article(v.c),
        "prix": v.c.prix,
        "payeeA": ms(v.c.payee_a),
    }


def reprises_du_mois(b: Boutique, mois: str | None = None) -> list[Reprise]:
    qs = list(Reprise.objects.filter(boutique=b).select_related("commande"))
    return [r for r in qs if mois is None or mois_y(r.decidee_le) == mois]


def ligne_reprise(r: Reprise) -> dict:
    return {
        "type": "reprise",
        "ref": r.commande.ref,
        "article": article(r.commande),
        "prix": 0,
        "garde": -r.montant,
        "liberation": ms(r.decidee_le),
        "motif": r.motif,
    }


# ── Numéro et revue ────────────────────────────────────────────────────────────────────────────────────


def revue_en_cours(b: Boutique) -> ChangementNumero | None:
    return (
        ChangementNumero.objects.filter(boutique=b, valide_le__isnull=False, applique_le__isnull=True, annule_le__isnull=True)
        .order_by("-valide_le")
        .first()
    )


def appliquer_revues(b: Boutique, t: datetime) -> None:
    """Fin de la revue humaine (VD-NUM-REVUE) : le nouveau numéro devient actuel ; un versement suspendu reprend seul
    au vendredi qui suit (versements.premier_versement_apres_correction, Q-13)."""
    from belivay_moteurs.etats import VERSEMENT
    from belivay_moteurs.versements import premier_versement_apres_correction

    for ch in ChangementNumero.objects.filter(
        boutique=b, valide_le__isnull=False, applique_le__isnull=True, annule_le__isnull=True, revue_jusqua__lte=t
    ):
        b.numero_operateur, b.numero_chiffre, b.numero_empreinte = ch.operateur, ch.numero_chiffre, ch.numero_empreinte
        b.numero_verifie_le = jour_y(ch.revue_jusqua)
        b.save(update_fields=["numero_operateur", "numero_chiffre", "numero_empreinte", "numero_verifie_le"])
        ch.applique_le = t
        ch.save(update_fields=["applique_le"])
        premier = premier_versement_apres_correction(ch.valide_le, True, _pv())
        for v in Versement.objects.filter(boutique=b, statut=Versement.Statut.SUSPENDU):
            v.statut = VERSEMENT.appliquer(v.statut, "number.corrected").vers
            v.vendredi, v.refus, v.essais, v.essais_faits, v.refus_motif = premier, 0, [], 0, ""
            v.save(update_fields=["statut", "vendredi", "refus", "essais", "essais_faits", "refus_motif"])
        socle.notifier(
            b,
            "versement",
            "Nouveau numéro de versement actif",
            f"Vos versements partent désormais vers {socle.numero_en_mots(b)}.",
            "versements/numero",
            argent=True,
        )


# ── Versements du vendredi ─────────────────────────────────────────────────────────────────────────────


def _jeudi(vendredi: date, pv) -> date:
    return vendredi - timedelta(days=(pv.jour_versement - pv.jour_arrete) % 7)


def prochain_numero() -> int:
    return (Versement.objects.aggregate(m=Max("numero"))["m"] or 0) + 1


def executer_versements(boutique: Boutique | None = None) -> list[Versement]:
    """Arrêté du jeudi 23 h 59 et versement du vendredi (idempotent) ; rend les versements créés."""
    if boutique is not None:
        boutiques = [boutique]
    else:
        ids = set(CommandeVendeur.objects.values_list("boutique_id", flat=True)) | set(
            Versement.objects.values_list("boutique_id", flat=True)
        )
        boutiques = list(Boutique.objects.filter(pk__in=ids))
    crees = []
    for b in boutiques:
        crees += _executer(b, horloge.maintenant())
    return crees


def _executer(b: Boutique, t: datetime) -> list[Versement]:
    from belivay_moteurs.etats import VERSEMENT
    from belivay_moteurs.versements import (
        appliquer_reprise,
        arrete,
        heure_limite,
        montant_du,
        reference_de_versement,
        vendredi_de_versement,
    )

    pv = _pv()
    with transaction.atomic():
        b = Boutique.objects.select_for_update().get(pk=b.pk)
        appliquer_revues(b, t)
        # 1. Versements déjà arrêtés : envoyés, crédités, essais après un refus.
        for v in Versement.objects.select_for_update().filter(boutique=b, statut__in=["prevu", "envoye", "refuse"]):
            if v.statut == "prevu" and t >= arrete(_jeudi(v.vendredi, pv), pv):
                v.statut = VERSEMENT.appliquer("prevu", "payout.friday", {"revue_du_numero": False}).vers
                v.envoye_le = t
                v.operateur, v.numero_masque = b.numero_operateur, socle.numero_en_mots(b)
            if v.statut == "refuse" and v.essais_faits < len(v.essais) and ms(t) >= v.essais[v.essais_faits]:
                v.statut = VERSEMENT.appliquer("refuse", "payout.retry", {"essais_epuises": False}).vers
                v.essais_faits += 1
                v.envoye_le = t
                _crediter(v, t)  # l'essai est passé sans nouveau refus de l'opérateur
            if v.statut == "envoye" and v.refus == 0 and t >= heure_limite(v.vendredi, pv):
                _crediter(v, heure_limite(v.vendredi, pv))
            v.save()
        # 2. Nouveaux versements : suspendus (refus) ou numéro en revue ⇒ rien ne part ; sans numéro, rien non plus.
        if (
            Versement.objects.filter(boutique=b, statut="suspendu").exists()
            or revue_en_cours(b) is not None
            or socle.numero_court(b) is None
        ):
            return []
        vs = ventes(b, t)
        libres = [v for v in vs if v.lien is None and v.gain.gel is None and v.liberation is not None]
        dernier = vendredi_de_versement(t, pv) - timedelta(days=7)  # vendredi dont l'arrêté est le plus récent passé
        vendredis = sorted({vendredi_de_versement(v.liberation, pv) for v in libres})
        # Après une revue de numéro, rien ne part avant le vendredi qui la suit (jamais vers l'ancien numéro, Q-19).
        plancher = max(
            (
                vendredi_de_versement(ch.revue_jusqua, pv)
                for ch in ChangementNumero.objects.filter(boutique=b, applique_le__isnull=False, annule_le__isnull=True)
            ),
            default=None,
        )
        crees = []
        if plancher is not None:
            vendredis = sorted({max(x, plancher) for x in vendredis})
        for vendredi in (x for x in vendredis if x <= dernier):
            couvertes = [v for v in libres if vendredi_de_versement(v.liberation, pv) <= vendredi]
            if not couvertes:
                continue
            du = montant_du(vendredi, [v.gain for v in couvertes], pv)
            reprises = [r for r in Reprise.objects.filter(boutique=b).order_by("decidee_le") if r.reste > 0]
            net = appliquer_reprise(du, sum(r.reste for r in reprises), jour_y(reprises[0].decidee_le) if reprises else None, vendredi, pv)
            existant = Versement.objects.filter(boutique=b, vendredi=vendredi, statut="prevu").first()
            if existant is not None:  # versement repris après suspension : le dû du même vendredi s'y ajoute
                existant.montant += net.verse
                existant.repris += net.repris
                existant.save(update_fields=["montant", "repris"])
                v = existant
            else:
                n = prochain_numero()
                fin_arrete = arrete(_jeudi(vendredi, pv), pv)
                statut = VERSEMENT.appliquer("—", "payout.closing").vers
                statut = VERSEMENT.appliquer(statut, "payout.friday", {"revue_du_numero": False}).vers
                v = Versement(
                    boutique=b,
                    numero=n,
                    reference=reference_de_versement(n),
                    vendredi=vendredi,
                    montant=net.verse,
                    repris=net.repris,
                    operateur=b.numero_operateur,
                    numero_masque=socle.numero_en_mots(b),
                    statut=statut,
                    arrete_le=fin_arrete,
                    envoye_le=fin_arrete,
                )
                if t >= heure_limite(vendredi, pv):
                    _crediter(v, heure_limite(vendredi, pv))
                v.save()
                crees.append(v)
            reste = net.repris
            for r in reprises:
                pris = min(reste, r.reste)
                if pris:
                    r.deduit += pris
                    r.save(update_fields=["deduit"])
                    reste -= pris
            for x in couvertes:
                VersementCommande.objects.create(versement=v, commande=x.c, garde=x.c.garde, liberation=x.liberation)
            libres = [x for x in libres if x not in couvertes]
            socle.notifier(
                b,
                "versement",
                f"Versement {v.reference}",
                f"{v.montant} F vers {v.numero_masque}, vendredi avant 12 h, sans frais.",
                "versements",
                argent=True,
            )
        return crees


def _crediter(v: Versement, t: datetime) -> None:
    from belivay_moteurs.etats import VERSEMENT

    v.statut = VERSEMENT.appliquer(v.statut, "operator.credited").vers
    v.credite_le = t


def _versement(reference: str) -> Versement:
    from apps.client_core.erreurs import introuvable

    v = Versement.objects.select_for_update().filter(reference=str(reference).upper()).first()
    if v is None:
        raise introuvable("Versement introuvable.")
    return v


def refuser_versement(reference: str, motif: str) -> dict:
    """Refus de l'opérateur (essai) : plein | tiers | prefixe. Un versement envoyé passe à « refusé » avec ses essais
    à + 24, 48, 72 h (versements.essais_apres_refus) ; un versement déjà refusé : l'essai suivant échoue aussi ; après
    le dernier, versements suspendus (versements.suspendu), le support prend la main ; l'argent reste au vendeur."""
    from belivay_moteurs.etats import VERSEMENT
    from belivay_moteurs.versements import essais_apres_refus, suspendu

    if motif not in Versement.Motif.values:
        from apps.client_core.erreurs import refus

        raise refus("motif", "Motif de refus inconnu (plein, tiers, prefixe).")
    pv = _pv()
    t = horloge.maintenant()
    with transaction.atomic():
        v = _versement(reference)
        if v.statut == "envoye":
            v.statut = VERSEMENT.appliquer("envoye", "operator.refused").vers
            v.refus, v.refuse_le, v.refus_motif = 1, t, motif
            v.essais = [ms(x) for x in essais_apres_refus(t, pv)]
            v.essais_faits = 0
        else:
            v.refus += 1
            v.essais_faits += 1
            v.refus_motif = motif
            epuises = suspendu(v.refus, pv)
            v.statut = VERSEMENT.appliquer(v.statut, "payout.retry", {"essais_epuises": epuises}).vers
            if not epuises:
                v.statut = VERSEMENT.appliquer(v.statut, "operator.refused").vers
        v.save()
    texte = (
        "Versements suspendus : le support vous appelle."
        if v.statut == "suspendu"
        else "L'opérateur a refusé le versement : nouvel essai dans 24 h."
    )
    socle.notifier(v.boutique, "versement", f"Versement {v.reference} refusé", texte, "versements", urgent=True, argent=True)
    return versement_json(v)


def crediter(reference: str) -> dict:
    """L'opérateur confirme le crédit (essai) ; un versement refusé est crédité à son essai suivant."""
    from belivay_moteurs.etats import VERSEMENT

    t = horloge.maintenant()
    with transaction.atomic():
        v = _versement(reference)
        if v.statut == "refuse":
            v.statut = VERSEMENT.appliquer("refuse", "payout.retry", {"essais_epuises": False}).vers
            v.essais_faits += 1
        if v.statut == "prevu":
            v.statut = VERSEMENT.appliquer("prevu", "payout.friday", {"revue_du_numero": False}).vers
        _crediter(v, t)
        v.save()
    return versement_json(v)


def versement_de(commande: CommandeVendeur) -> str | None:
    """Référence BLV-VS-nnnn si la commande est versée (créditée), sinon None."""
    lien = (
        VersementCommande.objects.filter(commande=commande, versement__statut=Versement.Statut.CREDITE).select_related("versement").first()
    )
    return lien.versement.reference if lien else None


def a_verser(boutique: Boutique) -> int:
    """Montant « À verser » de la boutique (argent_vendeur.resume)."""
    from belivay_moteurs.argent_vendeur import resume

    return resume([v.gain for v in ventes(boutique)], horloge.maintenant()).a_verser


# ── Formes de sortie des versements ────────────────────────────────────────────────────────────────────


def commandes_couvertes(v: Versement) -> list[dict]:
    return [{"ref": x.commande.ref, "liberation": ms(x.liberation), "garde": x.garde} for x in v.commandes.select_related("commande")]


def incident(v: Versement) -> dict | None:
    from belivay_moteurs.versements import suspendu

    if not v.refus:
        return None
    return {
        "motif": v.refus_motif or "plein",
        "operateur": v.operateur or "MTN",
        "refuseA": ms(v.refuse_le),
        "essais": list(v.essais),
        "essaisFaits": v.essais_faits,
        "suspendu": v.statut == "suspendu" or suspendu(v.refus, _pv()),
    }


def versement_json(v: Versement) -> dict:
    return {
        "reference": v.reference,
        "vendredi": v.vendredi.isoformat(),
        "montant": v.montant,
        "numero": v.numero_masque,
        "statut": v.statut,
        "essais": list(v.essais),
        "commandes": commandes_couvertes(v),
        "signale": v.signale_le is not None,
    }


def numero_qui_recoit(b: Boutique) -> tuple[str, str]:
    """(opérateur, « MTN ···· 4217 ») du numéro qui recevra le prochain versement : le nouveau pendant la revue."""
    rv = revue_en_cours(b)
    if rv is not None:
        return rv.operateur, f"{rv.operateur} {rv.masque}"
    return b.numero_operateur, socle.numero_en_mots(b)


def prochain_calcule(b: Boutique, vs: list[Vente], t: datetime) -> dict:
    """Vendredi du prochain versement et ce qu'il emporte (demo prochainVendredi) : sans minimum (Q-12) ; numéro en
    revue : le vendredi qui suit la revue (VD09-R32) ; reprise déduite (appliquer_reprise)."""
    from belivay_moteurs.versements import appliquer_reprise, heure_limite, montant_du, vendredi_de_versement

    pv = _pv()
    rv = revue_en_cours(b)
    vendredi = vendredi_de_versement(t, pv)
    if rv is not None:
        vendredi = max(vendredi, vendredi_de_versement(rv.revue_jusqua, pv))
    du = montant_du(vendredi, a_verser_gains(vs), pv)
    reprises = [r for r in Reprise.objects.filter(boutique=b).order_by("decidee_le") if r.reste > 0]
    net = appliquer_reprise(du, sum(r.reste for r in reprises), jour_y(reprises[0].decidee_le) if reprises else None, vendredi, pv)
    couvertes = sorted(
        (v for v in vs if v.lien is None and v.etat in ("À verser", "Se libère") and vendredi_de_versement(v.liberation, pv) <= vendredi),
        key=lambda v: v.liberation,
    )
    deja = sum(v.c.garde for v in couvertes if v.etat == "À verser")
    a_venir = [v for v in couvertes if v.etat == "Se libère"]
    passe_a = {"montant": deja + a_venir[0].c.garde, "ref": a_venir[0].c.ref, "a": ms(a_venir[0].liberation)} if a_venir else None
    return {
        "vendredi": vendredi,
        "heureLimite": heure_limite(vendredi, pv),
        "montant": net.verse,
        "deja": deja,
        "couvertes": couvertes,
        "passeA": passe_a,
        "revue": rv,
    }


def versement_actif(b: Boutique) -> Versement | None:
    return Versement.objects.filter(boutique=b, statut__in=["prevu", "envoye", "refuse", "suspendu"]).order_by("vendredi").first()


def prochain(b: Boutique) -> dict | None:
    """Prochain (VER-02) : le versement arrêté en cours s'il y en a un, sinon celui du vendredi qui vient."""
    from belivay_moteurs.etats import VERSEMENT
    from belivay_moteurs.versements import heure_limite, reference_de_versement

    t = horloge.maintenant()
    titulaire = b.titulaire_versement or f"{b.proprietaire.first_name} {b.proprietaire.last_name}".strip()
    actif = versement_actif(b)
    if actif is not None:
        return {
            "reference": actif.reference,
            "statut": actif.statut,
            "vendredi": actif.vendredi.isoformat(),
            "heureLimite": ms(heure_limite(actif.vendredi, _pv())),
            "aVerser": actif.montant,
            "montant": actif.montant,
            "passeA": None,
            "commandes": commandes_couvertes(actif),
            "numero": actif.numero_masque,
            "operateur": actif.operateur or b.numero_operateur,
            "titulaire": titulaire,
            "incident": incident(actif),
            "enRevueJusqua": None,
            "reporteAu": None,
        }
    vs = ventes(b, t)
    p = prochain_calcule(b, vs, t)
    if not p["montant"] and not p["couvertes"]:
        return None
    rv = p["revue"]
    statut = VERSEMENT.appliquer("—", "payout.closing").vers
    if rv is not None:
        statut = VERSEMENT.appliquer(statut, "payout.friday", {"revue_du_numero": True}).vers
    operateur, numero = numero_qui_recoit(b)
    return {
        "reference": reference_de_versement(prochain_numero()),
        "statut": statut,
        "vendredi": p["vendredi"].isoformat(),
        "heureLimite": ms(p["heureLimite"]),
        "aVerser": p["deja"],
        "montant": p["montant"],
        "passeA": p["passeA"],
        "commandes": [{"ref": v.c.ref, "liberation": ms(v.liberation), "garde": v.c.garde} for v in p["couvertes"]],
        "numero": numero,
        "operateur": operateur,
        "titulaire": titulaire,
        "incident": None,
        "enRevueJusqua": ms(rv.revue_jusqua) if rv else None,
        "reporteAu": p["vendredi"].isoformat() if rv else None,
    }


def historique(b: Boutique, periode: str) -> dict:
    from belivay_moteurs.delais import ajouter_mois

    qs = Versement.objects.filter(boutique=b).exclude(statut__in=["prevu", "reporte"])
    if periode != "tout":
        qs = qs.filter(vendredi__gte=ajouter_mois(horloge.aujourd_hui(), -int(periode)))
    vs = [versement_json(v) for v in qs.order_by("-vendredi", "-numero")]
    return {
        "periode": periode,
        "versements": vs,
        "total": sum(v["montant"] for v in vs),
        "nombre": len(vs),
        "depuis": (b.signature_le or b.cree_le).isoformat(),
    }


def lundi_midi(t: datetime) -> datetime:
    j = jour_y(t)
    d = (NON_RECU_JOUR - j.weekday()) % 7 or 7
    return datetime.combine(j + timedelta(days=d), datetime.min.time().replace(hour=NON_RECU_HEURE), YAOUNDE)


def signaler_non_recu(b: Boutique, reference: str) -> dict:
    v = Versement.objects.filter(boutique=b, reference=str(reference).upper()).exclude(statut__in=["prevu", "reporte"]).first()
    if v is None:
        return {"ok": False, "raison": "inconnu"}
    if v.signale_le is not None:
        return {"ok": False, "raison": "deja"}
    t = horloge.maintenant()
    v.signale_le = t
    v.save(update_fields=["signale_le"])
    avant = lundi_midi(t)
    socle.notifier(
        b,
        "versement",
        "Versement non reçu : signalement reçu",
        f"{v.reference} : le support vous répond avant lundi 12 h.",
        f"messages?fil=support&sujet={v.reference}",
        argent=True,
    )
    return {"ok": True, "reponseAvant": ms(avant)}


# ── Mon argent (GET /money/*) ──────────────────────────────────────────────────────────────────────────


def offre_la_plus_vendue(b: Boutique) -> Offre | None:
    compte: dict[str, int] = {}
    for c in CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True):
        for lg in c.lignes or []:
            if lg.get("offreId"):
                compte[lg["offreId"]] = compte.get(lg["offreId"], 0) + int(lg.get("quantite", 1))
    for oid, _n in sorted(compte.items(), key=lambda x: -x[1]):
        o = Offre.objects.select_related("fiche").filter(pk=oid, boutique=b).first()
        if o is not None and o.prix:
            return o
    return Offre.objects.select_related("fiche").filter(boutique=b, etat=Offre.Etat.EN_VENTE, prix__isnull=False).order_by("id").first()


def exemple_garde(b: Boutique) -> dict | None:
    """« Sur une vente de 20 000 F, vous gardez 17 840 F » : l'offre la plus vendue, aux conditions du jour."""
    o = offre_la_plus_vendue(b)
    if o is None or o.fiche is None:
        return None
    return {"prix": o.prix, "garde": socle.garde_par_vente(b, o.fiche.categorie, o.prix, o.made_in_cameroon)}


def libere(v: Vente) -> bool:
    return v.etat in ("Versé", "À verser")


def resume(b: Boutique) -> dict:
    from belivay_moteurs.argent_vendeur import resume as resume_moteur

    t = horloge.maintenant()
    vs = ventes(b, t)
    r = resume_moteur([v.gain for v in vs], t)  # une seule source (ARG-01)
    mois = mois_y(t)
    reprises = reprises_du_mois(b)
    duMois = [v for v in vs if libere(v) and v.liberation and mois_y(v.liberation) == mois]
    se_lib = sorted((v for v in vs if v.etat == "Se libère"), key=lambda v: v.liberation)
    en_c = sorted((v for v in vs if v.etat == "En cours"), key=lambda v: v.c.payee_a)
    geles = [v for v in vs if v.etat == "Gelé"]
    p = prochain_calcule(b, vs, t)
    actif = versement_actif(b)
    if actif is not None and actif.statut in ("envoye", "refuse", "prevu"):
        prochain_v = {
            "vendredi": actif.vendredi.isoformat(),
            "montant": actif.montant,
            "numero": actif.numero_masque,
            "heureLimite": ms(_heure_limite(actif.vendredi)),
        }
    elif p["montant"] or r.a_verser:
        prochain_v = {
            "vendredi": p["vendredi"].isoformat(),
            "montant": p["montant"],
            "numero": numero_qui_recoit(b)[1],
            "heureLimite": ms(p["heureLimite"]),
        }
    else:
        prochain_v = None
    court = socle.numero_court(b) or {"operateur": b.numero_operateur, "masque": ""}
    return {
        "aVerser": r.a_verser,
        "seLibere": r.se_libere,
        "enCours": r.en_cours,
        "gele": r.gele,
        "enCirculation": r.en_circulation,
        "verifications": {"montant": r.verifications.amount, "nombre": r.verifications.count},
        "prochainVersement": prochain_v,
        "passeA": p["passeA"],
        "lignes": {
            "seLibere": {"ref": se_lib[0].c.ref, "a": ms(se_lib[0].liberation), "autres": len(se_lib) - 1} if se_lib else None,
            "enCours": {"ref": en_c[0].c.ref, "autres": len(en_c) - 1} if en_c else None,
            "gele": {
                "litiges": sum(1 for v in geles if v.gain.gel.value in ("litige", "recours")),
                "retours": sum(1 for v in geles if v.gain.gel.value == "retour"),
                "verifications": r.verifications.count,
            },
        },
        "gagneDepuisInscription": sum(v.c.garde for v in vs if libere(v)) - sum(x.montant for x in reprises),
        "gardeDuMois": sum(v.c.garde for v in duMois) - sum(x.montant for x in reprises if mois_y(x.decidee_le) == mois),
        "ventesDuMois": sum(v.c.prix for v in duMois),
        "exemple": exemple_garde(b),
        "numero": {**court, "enRevue": revue_en_cours(b) is not None},
        "calculeA": ms(t),
        "mouvements": [mouvement(v, t) for v in vs],
    }


def _heure_limite(vendredi: date) -> datetime:
    from belivay_moteurs.versements import heure_limite

    return heure_limite(vendredi, _pv())


def se_libere(b: Boutique) -> dict:
    t = horloge.maintenant()
    pv = _pv()
    vs = ventes(b, t)
    court = socle.numero_court(b) or {"operateur": b.numero_operateur, "masque": ""}
    return {
        "palier": b.palier,
        "delais": {"standard": pv.lib_standard_jours, "or": pv.lib_or_jours, "carte": pv.lib_carte_jours},
        "fenetreRetourJours": pv.fenetre_retour_jours,
        "numero": court,
        "cartes": [
            {
                "ref": v.c.ref,
                "article": article(v.c),
                "fermeture": ms(v.fermeture),
                "liberation": ms(v.liberation),
                "vendredi": v.vendredi.isoformat(),
                "garde": v.c.garde,
                "carte": v.carte,
            }
            for v in sorted((x for x in vs if x.etat == "Se libère"), key=lambda x: x.liberation)
        ],
        "enCours": [
            {"ref": v.c.ref, "article": article(v.c), "garde": v.c.garde, "payeeA": ms(v.c.payee_a)}
            for v in sorted((x for x in vs if x.etat == "En cours"), key=lambda x: x.c.payee_a)
        ],
    }


def gele(b: Boutique) -> dict:
    """Gelé (GEL-01 à GEL-03) : une carte par commande, triées par échéance ; remboursement automatique lu au registre
    (LIT-AUTO-STD, LIT-AUTO-ELEVE : BelivaY paie, le vendeur est payé)."""
    from apps.aftersales.models import Litige, Retour
    from belivay_moteurs.litiges import fin_du_gel, fin_inspection

    t = horloge.maintenant()
    pl = parametres.litiges()
    cartes = []
    for v in ventes(b, t):
        if v.etat != "Gelé":
            continue
        motif_gel = v.gain.gel.value
        lit = Litige.objects.filter(pk=v.f.litige_id).first() if v.f.litige_id else None
        carte = {
            "type": "litige",
            "ref": v.c.ref,
            "garde": v.c.garde,
            "article": article(v.c),
            "motif": lit.probleme if lit else "",
            "echeance": None,
            "arrivee": None,
        }
        if motif_gel == "retour" and lit is not None:
            r = Retour.objects.filter(litige=lit).first()
            carte["type"] = "retour"
            if r is not None and r.recu_le:
                carte["arrivee"] = ms(r.recu_le)
                carte["echeance"] = ms(fin_inspection(r.recu_le, pl))
        elif motif_gel == "recours" and lit is not None and lit.decision_le:
            fin = fin_du_gel(lit.decision_le, lit.recours_le, None, pl)
            carte["echeance"] = _ms(fin)
        elif motif_gel == "vérification anti-fraude":
            carte.update(type="verification", motif="Vérification en cours")
        elif lit is not None:
            carte["echeance"] = ms(lit.echeance_vendeur if not lit.reponse_vendeur else lit.decision_au_plus_tard)
        cartes.append(carte)
    cartes.sort(key=lambda c: c["echeance"] if c["echeance"] is not None else float("inf"))
    return {
        "total": sum(c["garde"] for c in cartes),
        "cartes": cartes,
        "delais": {
            "litigeHeures": pl.vendeur_heures,
            "inspectionHeures": pl.inspection_heures,
            "verificationHeures": _pv().gel_motif_heures,
        },
        "remboursementAuto": {"standard": parametres.nombres("LIT-AUTO-STD")[0], "tresFiable": parametres.nombres("LIT-AUTO-ELEVE")[0]},
    }


def mois_depuis_signature(b: Boutique) -> list[str]:
    from belivay_moteurs.delais import ajouter_mois

    debut = (b.signature_le or b.cree_le).replace(day=1)
    fin = horloge.aujourd_hui().isoformat()[:7]
    out, j = [], debut
    while j.isoformat()[:7] <= fin:
        out.append(j.isoformat()[:7])
        j = ajouter_mois(j, 1)
    return out


def lignes_du_mois(b: Boutique, vs: list[Vente], mois: str) -> list[dict]:
    lignes = [
        {
            "type": "vente",
            "ref": v.c.ref,
            "article": article(v.c),
            "prix": v.c.prix,
            "garde": v.c.garde,
            "liberation": ms(v.liberation),
            "motif": None,
        }
        for v in vs
        if libere(v) and v.liberation and mois_y(v.liberation) == mois
    ]
    lignes += [ligne_reprise(r) for r in reprises_du_mois(b, mois)]
    return sorted(lignes, key=lambda x: -x["liberation"])


MOIS = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def gains(b: Boutique, mois: str) -> dict:
    t = horloge.maintenant()
    vs = ventes(b, t)
    par_ref = {v.c.ref: v for v in vs}
    lignes = lignes_du_mois(b, vs, mois)
    par_produit: dict[str, dict] = {}
    par_jour: dict[str, int] = {}
    for lg in (x for x in lignes if x["type"] == "vente"):
        p = par_produit.setdefault(
            lg["article"]["titre"], {"titre": lg["article"]["titre"], "dessin": lg["article"]["dessin"], "quantite": 0, "garde": 0}
        )
        p["quantite"] += quantite(par_ref[lg["ref"]].c)
        p["garde"] += lg["garde"]
        j = jour_y(par_ref[lg["ref"]].liberation).isoformat()
        par_jour[j] = par_jour.get(j, 0) + lg["garde"]
    meilleur = max(par_jour.items(), key=lambda x: x[1]) if len(par_jour) > 1 else None
    reprises = sum(r.montant for r in reprises_du_mois(b))
    gagne = sum(v.c.garde for v in vs if libere(v)) - reprises
    ce_soir = [v for v in vs if v.etat == "Se libère" and jour_y(v.liberation) == jour_y(t)]
    a_verser = sum(v.c.garde for v in vs if v.etat == "À verser")
    p = prochain_calcule(b, vs, t)
    return {
        "mois": mois,
        "total": sum(x["garde"] for x in lignes),
        "ventes": sum(x["prix"] for x in lignes),
        "parProduit": sorted(par_produit.values(), key=lambda x: -x["garde"]),
        "lignes": lignes,
        "meilleurJour": {"jour": meilleur[0], "garde": meilleur[1]} if meilleur else None,
        "historique": [
            {"mois": m, "garde": sum(x["garde"] for x in lm), "ventes": sum(1 for x in lm if x["type"] == "vente")}
            for m, lm in ((m, lignes_du_mois(b, vs, m)) for m in mois_depuis_signature(b))
        ],
        "gagne": gagne,
        "ceSoir": {
            "montant": gagne + sum(v.c.garde for v in ce_soir),
            "refs": [v.c.ref for v in ce_soir],
            "a": ms(max(v.liberation for v in ce_soir)),
        }
        if ce_soir
        else None,
        "dejaVerses": sum(v.c.garde for v in vs if v.etat == "Versé"),
        "aVerser": {"vendredi": p["vendredi"].isoformat(), "montant": a_verser} if a_verser else None,
        "impayes": IMPAYES,
        "transport": TRANSPORT,
    }


# ── Documents (DOC-01, DOC-02) ─────────────────────────────────────────────────────────────────────────


def _premier_du_mois_suivant(mois: str) -> str:
    from belivay_moteurs.delais import ajouter_mois

    return ajouter_mois(date.fromisoformat(mois + "-01"), 1).isoformat()


def _factures_croissance(b: Boutique) -> dict:
    """Factures d'abonnement et de visibilité : application vendeur_croissance (absente : listes vides)."""
    try:
        from apps.vendeur_croissance.services import factures
    except ImportError:
        return {"abonnement": [], "visibilite": []}
    f = factures(b) or {}
    return {"abonnement": list(f.get("abonnement", [])), "visibilite": list(f.get("visibilite", []))}


def documents(b: Boutique) -> dict:
    mois = mois_depuis_signature(b)
    courant = mois[-1] if mois else horloge.aujourd_hui().isoformat()[:7]
    cmds = list(CommandeVendeur.objects.filter(boutique=b).order_by("payee_a").values_list("ref", flat=True))
    return {
        "releves": [
            {"periode": p, "statut": "open", "emisLe": None, "formats": ["csv"]}
            if p == courant
            else {"periode": p, "statut": "issued", "emisLe": _premier_du_mois_suivant(p), "formats": ["pdf", "csv"]}
            for p in reversed(mois)
        ],
        "recus": {"nombre": len(cmds), "refs": cmds},
        "factures": {
            "commission": [
                {"periode": p, "statut": "pending", "emisLe": None, "disponibleLe": _premier_du_mois_suivant(p)}
                if p == courant
                else {"periode": p, "statut": "issued", "emisLe": _premier_du_mois_suivant(p), "disponibleLe": None}
                for p in reversed(mois)
            ],
            **_factures_croissance(b),
        },
        "entreprise": {"rccm": bool(b.rccm), "niu": bool(b.niu)},
        "contrat": {"signeLe": (b.signature_le or b.cree_le).isoformat()},
    }


def _jour_ms(t: int) -> str:
    return datetime.fromtimestamp(t / 1000, YAOUNDE).date().isoformat()


def _titulaire(b: Boutique) -> str:
    return b.titulaire_versement or f"{b.proprietaire.first_name} {b.proprietaire.last_name}".strip()


def contenu(b: Boutique, type_: str, periode: str | None) -> dict:
    """ContenuDocument (même contenu en PDF et en CSV, DOC-02). Le mot « commission » n'apparaît que dans la facture."""
    from belivay_moteurs.argent import pour_cent_affiche

    titulaire = _titulaire(b)
    if type_ in ("releve", "facture"):
        vs = ventes(b)
        lignes = lignes_du_mois(b, vs, periode)
        if type_ == "releve":
            return {
                "titre": "Relevé des ventes",
                "sousTitre": f"{b.nom} · {titulaire} · {periode}",
                "colonnes": ["Commande", "Libérée le", "Produit", "Prix de vente", "Vous gardez"],
                "lignes": [
                    [
                        x["ref"],
                        _jour_ms(x["liberation"]),
                        f"Reprise · {x['motif'] or ''}"
                        if x["type"] == "reprise"
                        else f"{x['article']['titre']} · {x['article']['variante']}",
                        x["prix"],
                        x["garde"],
                    ]
                    for x in lignes
                ],
                "totaux": ["Total", "", "", sum(x["prix"] for x in lignes), sum(x["garde"] for x in lignes)],
                "mentions": ["Versements sans frais, chaque vendredi avant 12 h.", "Aucune donnée du client."],
            }
        par_ref = {v.c.ref: v.c for v in vs}
        ventes_m = [(x, par_ref[x["ref"]]) for x in lignes if x["type"] == "vente"]
        complet = bool(b.rccm and b.niu)
        return {
            "titre": "Facture des commissions",
            "sousTitre": f"{b.nom} · {titulaire} · {periode}",
            "colonnes": ["Commande", "Libérée le", "Prix de vente", "Commission HT", "TVA", "Total TTC"],
            "lignes": [[x["ref"], _jour_ms(x["liberation"]), c.prix, c.commission, c.tva, c.commission + c.tva] for x, c in ventes_m],
            "totaux": [
                "Total",
                "",
                sum(c.prix for _, c in ventes_m),
                sum(c.commission for _, c in ventes_m),
                sum(c.tva for _, c in ventes_m),
                sum(c.commission + c.tva for _, c in ventes_m),
            ],
            "mentions": [
                "Émise le 1er du mois suivant. Prélevée à la libération de chaque vente, jamais avant.",
                "Dénomination, forme, capital, siège, RCCM, NIU et TVA portés sur la facture."
                if complet
                else "Facture simplifiée : déclarez votre RCCM et votre NIU pour une facture complète.",
            ],
        }
    if type_ == "contrat":
        familles = parametres.commission().familles
        return {
            "titre": "Contrat vendeur · part que vous gardez",
            "sousTitre": f"{titulaire} · signé électroniquement le {(b.signature_le or b.cree_le).isoformat()} · palier {b.palier}",
            "colonnes": ["Catégorie", *[f"{p:,} F".replace(",", " ") for p in PRIX_CONTRAT]],
            "lignes": [
                [cat, *[f"{pour_cent_affiche(socle.garde_par_vente(b, cat, p, decouverte_active=False), p)} %" for p in PRIX_CONTRAT]]
                for cat in familles
            ],
            "totaux": None,
            "mentions": [
                "Part gardée sur une vente, TVA comprise, hors offre de découverte.",
                "Versements chaque vendredi avant 12 h, sans frais ni minimum.",
            ],
        }
    h = historique(b, periode)
    return {
        "titre": "Historique des versements",
        "sousTitre": f"{titulaire} · {'depuis la signature' if periode == 'tout' else periode + ' mois'}",
        "colonnes": ["Vendredi", "Référence", "Commandes", "Montant"],
        "lignes": [[v["vendredi"], v["reference"], " ".join(c["ref"] for c in v["commandes"]), v["montant"]] for v in h["versements"]],
        "totaux": ["Total", "", "", h["total"]],
        "mentions": ["0 F de frais."],
    }
