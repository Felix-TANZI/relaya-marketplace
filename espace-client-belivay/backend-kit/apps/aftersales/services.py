# backend/apps/aftersales/services.py
# Logique de l'après-vente : litiges, retours, remplacements, avis sur une commande, votes sur les avis produit
# (CL-09, CL-11, CL-13 ; CAL-27 à CAL-31 ; DP-01, DP-10, DP-27, DP-28, DP-35).
#
# Calculs et transitions : TOUJOURS par les moteurs, avec le registre (apps.client_core.parametres) :
#   belivay_moteurs.litiges  remboursement_automatique, echeances, voie_de_retour, recours_possible,
#                            fin_reponse_arrangement, echeance_remplacement, rembourser_retour
#   belivay_moteurs.notes    fin_de_notation, note_basse
#   belivay_moteurs.catalogue vendeur_suivant (remplacement chez un autre vendeur, DP-01)
#   belivay_moteurs.etats    LITIGE, RETOUR, REMPLACEMENT, SOUS_COMMANDE (TransitionRefusee → 409 state_changed)
#
# Palier IFA : relaya-marketplace n'en a pas (CORRESPONDANCE-RELAYA.md, point 11.1 à arbitrer) ; tant qu'il manque,
# settings.BELIVAY_PALIER_IFA_PAR_DEFAUT (défaut « À instruire » : aucun remboursement automatique, CLT-24).
#
# Exposé aux autres applications :
#   litiges_en_cours(user) -> int
#   avis_a_donner(user) -> list[{ref, article, jusqua}]
#   jours_suspendus(order_id) -> set[date]        jours de litige qui suspendent la garde (CAL-21, CL-10)
#   dossier_en_cours(user) -> dict | None         aide (DonneesAide.dossier)
#   verser_photo_au_dossier(user, litige_id, nom) messaging : photo de la conversation du dossier (CL-11)
# Fonctions de la console (pas de route client) : reponse_du_vendeur, decider, avancer_retour, avancer_remplacement,
# proposer_autre_vendeur.

import logging
from datetime import date, timedelta

from django.apps import apps
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers, status

from apps.client_core import parametres, pont
from apps.client_core.erreurs import MESSAGES, ErreurClient, conflit, interdit, introuvable, refus
from apps.client_core.temps import YAOUNDE, aujourd_hui, ms
from apps.messaging import services as messagerie
from apps.messaging.photos import adresse, lire_photo
from apps.pickup.models import MontantsCommande, SousCommande
from belivay_moteurs import litiges as moteur
from belivay_moteurs import notes as moteur_notes
from belivay_moteurs.etats import LITIGE, REMPLACEMENT, RETOUR, SOUS_COMMANDE

from . import regles, signaux
from .models import AvisCommande, Litige, PreuveLitige, Remplacement, Retour, VoteAvis

logger = logging.getLogger("apps.aftersales")

# PARAMÈTRE À AJOUTER AU REGISTRE : RET-DEPOT-J (délai pour déposer un retour au relais après la décision)
DEPOT_RETOUR_JOURS = 7

E = Litige.Etat
EN_COURS = (E.OUVERT, E.ATTENTE_VENDEUR, E.EN_EXAMEN)


# ── Lectures ────────────────────────────────────────────────────────────────────────────────────────────


def numero_litige(valeur) -> int | None:
    s = str(valeur or "").strip().upper().removeprefix("LIT-")
    return int(s) if s.isdigit() else None


def litige_du_client(user, ident, verrou: bool = False) -> Litige:
    n = numero_litige(ident)
    qs = Litige.objects.filter(client=user, pk=n) if n else Litige.objects.none()
    if verrou:
        qs = qs.select_for_update()
    litige = qs.first()
    if litige is None:
        raise introuvable("Ce dossier n'existe pas.")
    return litige


def palier_ifa(user) -> moteur.PalierIFA:
    """Palier IFA du client ; relaya n'en a pas encore : valeur par défaut des réglages (point 11.1)."""
    valeur = getattr(settings, "BELIVAY_PALIER_IFA_PAR_DEFAUT", moteur.PalierIFA.A_INSTRUIRE.value)
    try:
        return moteur.PalierIFA(valeur)
    except ValueError:
        logger.error("BELIVAY_PALIER_IFA_PAR_DEFAUT illisible : %r ; « À instruire » retenu", valeur)
        return moteur.PalierIFA.A_INSTRUIRE


def montant_colis(sc: SousCommande) -> int:
    return sum(x.prix * x.qte for x in sc.lignes.all())


def _nom_relais(relay_id) -> str:
    r = pont.relais(relay_id) if relay_id else None
    return r.nom if r else ""


def _maintenant():
    return timezone.now()


# ── Le litige vu par le site (Litige, source.ts) ────────────────────────────────────────────────────────


def litige_json(lit: Litige) -> dict:
    retour = Retour.objects.filter(litige=lit).first()
    rempl = Remplacement.objects.filter(litige=lit).first()
    maintenant = _maintenant()
    d = {
        "id": lit.ref,
        "ref": pont.ref_commande(lit.order_id),
        "colis": lit.colis,
        "produit": lit.produit,
        "dessin": pont.image(lit.product_id) if lit.product_id else "",
        "pb": lit.pb,
        "probleme": lit.probleme,
        "description": lit.description,
        "souhait": lit.souhait,
        "montant": lit.montant,
        "ouvertLe": ms(lit.ouvert_le),
        "echeance": ms(lit.echeance_vendeur),
        "etat": regles.etat_site(
            lit.etat,
            souhait=lit.souhait,
            reponse_vendeur=lit.reponse_vendeur,
            arrangement_en_attente=lit.arrangement_montant is not None and lit.arrangement_repondu_le is None,
            issue=lit.issue,
            retire=lit.retire_le is not None,
            retour_clos=None if retour is None else retour.etat == Retour.Etat.CLOS,
            remplacement=rempl.etat if rempl else None,
            recours=lit.recours_le is not None,
        ),
        "preuves": [{"titre": p.titre, "sous": p.sous, "photo": adresse(p.photo)} for p in lit.preuves.all()],
        "relais": _nom_relais(lit.relay_id),
        "origine": lit.origine,
    }
    if lit.arrangement_montant is not None:
        d["arrangement"] = {"montant": lit.arrangement_montant, "texte": lit.arrangement_texte}
    if lit.decision_le:
        d["decision"] = {"le": ms(lit.decision_le), "motif": lit.decision_motif}
        if lit.recours_le:
            d["decision"]["conteste"] = True
    if retour is not None:
        d["retour"] = _retour_json(retour)
    if rempl is not None:
        r = _remplacement_json(rempl, maintenant)
        if r is not None:
            d["remplacement"] = r
    return d


def _retour_json(r: Retour) -> dict:
    p = parametres.litiges()
    dates = {"depose": r.depose_le, "collecte": r.collecte_le, "inspection": r.recu_le, "clos": r.clos_le}
    etape = regles.ETAPES_RETOUR[r.etat]
    if etape == "depot":
        avant = r.deposer_avant
    elif etape == "clos":
        avant = r.clos_le
    else:  # le vendeur répond sous RET-INSPECT-H (depuis la réception, ou le dépôt tant qu'il n'est pas reçu)
        avant = moteur.fin_inspection(r.recu_le or r.depose_le, p)
    return {"etape": etape, "dates": {k: ms(v) for k, v in dates.items() if v}, "avant": ms(avant)}


def _remplacement_json(r: Remplacement, maintenant) -> dict | None:
    etape = regles.etape_remplacement(r.etat, maintenant > r.avant)
    if etape is None:
        return None
    dates = {"attente": r.debut, "expedie": r.expedie_le, "remis": r.remis_le}
    d = {"etape": etape, "dates": {k: ms(v) for k, v in dates.items() if v}, "avant": ms(r.avant)}
    if r.autre_vendor_id:
        d["autre"] = {"boutique": r.autre_boutique, "trust": r.autre_trust or 0, "ecart": r.ecart}
    return d


# ── Ouvrir un litige (POST /api/disputes) ───────────────────────────────────────────────────────────────


def _numero_colis(colis, order_id: int) -> int:
    """Le colis : son numéro (1, 2…) ou sa référence « 52018-2 » (décision D6)."""
    s = str(colis).strip()
    if "-" in s:
        commande, _, n = s.rpartition("-")
        if commande.upper().removeprefix("BLV-") != str(order_id):
            raise introuvable("Ce colis n'est pas dans cette commande.")
        s = n
    if not s.isdigit():
        raise serializers.ValidationError({"colis": ["Colis invalide."]})
    return int(s)


def ouvrir(user, ref: str, colis, pb: str, description: str, souhait: str, photos: list, origine: str | None = None) -> Litige:
    p = parametres.litiges()
    commande = pont.commande(ref, user)
    if commande is None:
        raise introuvable("Commande introuvable.")
    n = _numero_colis(colis, commande.id)
    # Photos lues et vérifiées avant toute écriture (400 photo_invalide).
    fichiers = [lire_photo(ph, prefixe="litige") for ph in photos]
    comptoir = origine == Litige.Origine.COMPTOIR
    maintenant = _maintenant()
    with transaction.atomic():
        sc = SousCommande.objects.select_for_update().filter(order_id=commande.id, n=n).first()
        if sc is None:
            raise introuvable("Ce colis n'existe pas.")
        existant = Litige.objects.filter(order_id=commande.id, colis=n, retire_le__isnull=True).first()
        if existant is not None:
            raise conflit("deja", "Un dossier est déjà ouvert pour ce colis.", {"id": existant.ref})

        # Recevabilité du côté du colis (machine SOUS_COMMANDE, voie de retour du moteur des litiges).
        if comptoir:
            ctx_colis = {"constat_au_comptoir": sc.etat == SousCommande.Etat.ARRIVEE_RELAIS}
        else:
            recevable = False
            if sc.etat == SousCommande.Etat.REMISE and sc.remise_le:
                montants = MontantsCommande.objects.filter(order_id=commande.id).first()
                tout_en_ordre = bool(montants and montants.tout_en_ordre_le)
                voie = moteur.voie_de_retour(regles.MOTIFS[pb], sc.remise_le, maintenant, tout_en_ordre, p)
                if voie is moteur.Voie.AUCUNE:  # après la fenêtre : seul le vice caché reste couvert (DP-27)
                    voie = moteur.voie_de_retour(moteur.Motif.VICE_CACHE, sc.remise_le, maintenant, tout_en_ordre, p)
                if voie is moteur.Voie.AUCUNE:
                    raise refus("fenetre_fermee", "Le délai pour signaler un problème sur ce colis est passé.", {"colis": sc.ref})
                recevable = True
            ctx_colis = {"litige_recevable": recevable}
        t_colis = SOUS_COMMANDE.appliquer(sc.etat, "dispute.opened", ctx_colis)

        montant = montant_colis(sc)
        palier = palier_ifa(user)
        auto = not comptoir and souhait == Litige.Souhait.REMBOURSE and moteur.remboursement_automatique(montant, palier, p)
        ctx = {"dossier_deja_ouvert": False, "sous_seuil_automatique": auto}
        premiere = sc.lignes.order_by("pk").first()
        ech = moteur.echeances(maintenant, p)
        lit = Litige(
            client=user,
            order_id=commande.id,
            colis=n,
            product_id=premiere.product_id if premiere else None,
            produit=premiere.titre if premiere else sc.boutique,
            relay_id=sc.relay_id or commande.relay_id,
            pb=pb,
            probleme=regles.LIBELLES_PROBLEME[pb],
            description=(description or "").strip(),
            souhait=souhait,
            origine=origine or Litige.Origine.APPLI,
            montant=montant,
            palier_ifa=palier.value,
            ouvert_le=maintenant,
            echeance_vendeur=ech.reponse_vendeur,
            decision_au_plus_tard=ech.decision_au_plus_tard,
            version_parametres=p.version,
        )
        if auto:
            lit.etat = LITIGE.appliquer("—", "dispute.auto_refunded", ctx).vers
            lit.origine = Litige.Origine.AUTO
            lit.decision_le = lit.clos_le = maintenant
            lit.decision_motif = f"Tout de suite, sans enquête : remboursement immédiat de {regles.francs(montant)}."
            lit.issue = Litige.Issue.REMBOURSE
            lit.rembourse = montant
        else:
            ouvert = LITIGE.appliquer("—", "dispute.opened", ctx)
            lit.etat = LITIGE.appliquer(ouvert.vers, "seller.notified", ctx).vers
            lit.etat_colis_avant = sc.etat
            sc.etat = t_colis.vers
            sc.save(update_fields=["etat"])
        try:
            with transaction.atomic():
                lit.save()
        except IntegrityError:
            raise conflit("deja", "Un dossier est déjà ouvert pour ce colis.") from None
        for i, f in enumerate(fichiers, start=1):
            _preuve(lit, f, f"Ta photo {i}", maintenant)
        if not auto:
            messagerie.ouvrir_conversation_dossier(
                user,
                f"Dossier {lit.ref} · {lit.produit}",
                lit.ref,
                entete={
                    "titre": lit.produit,
                    "sous": f"{pont.ref_commande(lit.order_id)} · colis {n}",
                    "dessin": pont.image(lit.product_id) if lit.product_id else "",
                    "bloque": montant,
                    "lien": {"texte": "Le dossier", "vers": f"/litige-suivi?id={lit.ref}"},
                },
                premier_message=f"scale||Dossier ouvert. Le vendeur a {p.vendeur_heures} h pour répondre.",
            )
            transaction.on_commit(lambda: signaux.litige_ouvert.send(sender=Litige, litige=lit))
        else:
            transaction.on_commit(lambda: signaux.litige_rembourse.send(sender=Litige, litige=lit, montant=montant, motif="automatique"))
    return lit


def _preuve(lit: Litige, fichier, titre: str, le, source=PreuveLitige.Source.CLIENT, nom: str | None = None) -> PreuveLitige:
    """Preuve horodatée par le serveur (jamais par l'appareil)."""
    preuve = PreuveLitige(litige=lit, titre=titre, sous=f"versée au dossier le {regles.date_fr(le)}", source=source, ajoutee_le=le)
    if nom:
        preuve.photo.name = nom  # fichier déjà enregistré (photo de la conversation du dossier)
    else:
        preuve.photo = fichier
    preuve.save()
    return preuve


def ajouter_preuve(user, ident, photo) -> PreuveLitige:
    fichier = lire_photo(photo, prefixe="litige")
    with transaction.atomic():
        lit = litige_du_client(user, ident, verrou=True)
        if lit.retire_le or lit.clos_le:
            raise conflit("state_changed", "Ce dossier est clos : il ne reçoit plus de preuve.")
        n = lit.preuves.filter(source__in=(PreuveLitige.Source.CLIENT, PreuveLitige.Source.CONVERSATION)).count() + 1
        return _preuve(lit, fichier, f"Ta photo {n}", _maintenant())


def verser_photo_au_dossier(user, litige_id: str, nom_fichier: str) -> PreuveLitige | None:
    """Une photo envoyée dans la conversation du dossier est versée au dossier (CL-11)."""
    n = numero_litige(litige_id)
    lit = Litige.objects.filter(client=user, pk=n).first() if n else None
    if lit is None or lit.retire_le:
        return None
    k = lit.preuves.filter(source__in=(PreuveLitige.Source.CLIENT, PreuveLitige.Source.CONVERSATION)).count() + 1
    return _preuve(lit, None, f"Ta photo {k}", _maintenant(), PreuveLitige.Source.CONVERSATION, nom=nom_fichier)


# ── Actions du client sur un dossier ────────────────────────────────────────────────────────────────────


def repondre_arrangement(user, ident, accepte: bool) -> None:
    p = parametres.litiges()
    maintenant = _maintenant()
    with transaction.atomic():
        lit = litige_du_client(user, ident, verrou=True)
        if lit.arrangement_montant is None or lit.arrangement_repondu_le is not None or lit.retire_le:
            raise conflit("state_changed", MESSAGES["state_changed"])
        if maintenant > moteur.fin_reponse_arrangement(lit.arrangement_propose_le, p):
            raise refus("fenetre_fermee", "Le délai pour répondre à cet arrangement est passé : le dossier est en examen.")
        lit.etat = LITIGE.appliquer(lit.etat, "arrangement.accepted" if accepte else "arrangement.refused").vers
        lit.arrangement_repondu_le = maintenant
        lit.arrangement_accepte = accepte
        if accepte:
            lit.decision_le = lit.clos_le = maintenant
            lit.decision_motif = f"Arrangement accepté : {regles.francs(lit.arrangement_montant)} remboursés, tu gardes l’article."
            lit.issue = Litige.Issue.REMBOURSE
            lit.rembourse += lit.arrangement_montant
            montant = lit.arrangement_montant
            transaction.on_commit(lambda: signaux.litige_rembourse.send(sender=Litige, litige=lit, montant=montant, motif="arrangement"))
        lit.save()


def contester(user, ident, motif: str) -> None:
    p = parametres.litiges()
    maintenant = _maintenant()
    with transaction.atomic():
        lit = litige_du_client(user, ident, verrou=True)
        possible = lit.decision_le is not None and moteur.recours_possible(lit.decision_le, maintenant, lit.recours_le is not None, p)
        lit.etat = LITIGE.appliquer(lit.etat, "appeal.filed", {"recours_possible": possible}).vers
        lit.recours_le = maintenant
        lit.recours_motif = (motif or "").strip()
        lit.clos_le = None  # l'argent reste bloqué, la suspension reprend
        lit.save()


def retirer(user, ident) -> None:
    """« Retirer mon dossier » : tant que BelivaY n'a pas décidé ; le colis retrouve son état d'avant le litige."""
    maintenant = _maintenant()
    with transaction.atomic():
        lit = litige_du_client(user, ident, verrou=True)
        if lit.retire_le or lit.etat not in EN_COURS:
            raise conflit("state_changed", MESSAGES["state_changed"])
        lit.retire_le = lit.clos_le = maintenant
        lit.save(update_fields=["retire_le", "clos_le"])
        # La machine SOUS_COMMANDE n'a pas d'événement « litige retiré » : retour à l'état gardé à l'ouverture.
        SousCommande.objects.filter(order_id=lit.order_id, n=lit.colis, etat=SousCommande.Etat.EN_LITIGE).update(
            etat=lit.etat_colis_avant or SousCommande.Etat.REMISE
        )
        messagerie.clore_conversation_dossier(user, lit.ref, "check||Dossier retiré à ta demande.")


def deposer_retour(user, ident) -> None:
    with transaction.atomic():
        lit = litige_du_client(user, ident, verrou=True)
        r = Retour.objects.select_for_update().filter(litige=lit).first()
        if r is None:
            raise introuvable("Aucun retour à déposer pour ce dossier.")
        r.etat = RETOUR.appliquer(r.etat, "return.deposited").vers
        r.depose_le = _maintenant()
        r.save(update_fields=["etat", "depose_le"])


def litige_pour_remplacement(user, ident) -> Litige:
    """POST /api/orders/{id}/replacement : {id} = la commande (« BLV-52018 ») ou le dossier (« LIT-12 »)."""
    if str(ident).strip().upper().startswith("LIT-"):
        return litige_du_client(user, ident)
    commande = pont.commande(ident, user)
    if commande is None:
        raise introuvable("Commande introuvable.")
    lit = (
        Litige.objects.filter(client=user, order_id=commande.id, remplacement__isnull=False, retire_le__isnull=True).order_by("-pk").first()
    )
    if lit is None:
        raise introuvable("Aucun remplacement en cours pour cette commande.")
    return lit


def choisir_remplacement(user, ident, autre_vendeur: bool) -> None:
    """Le vendeur n'a plus l'article : l'autre vendeur proposé (autre_vendeur), ou le remboursement."""
    maintenant = _maintenant()
    with transaction.atomic():
        lit = litige_pour_remplacement(user, ident)
        lit = Litige.objects.select_for_update().get(pk=lit.pk)
        r = Remplacement.objects.select_for_update().filter(litige=lit).first()
        if r is None:
            raise introuvable("Aucun remplacement en cours pour ce dossier.")
        if autre_vendeur:
            # Pas d'événement dans la machine : l'état reste « autre_vendeur » jusqu'à la collecte du nouvel article.
            if r.etat != Remplacement.Etat.AUTRE_VENDEUR:
                raise conflit("state_changed", MESSAGES["state_changed"], {"detail": f"remplacement : « {r.etat} »"})
            if r.autre_accepte_le is None:
                r.autre_accepte_le = maintenant
                r.save(update_fields=["autre_accepte_le"])
                transaction.on_commit(lambda: signaux.autre_vendeur_accepte.send(sender=Remplacement, remplacement=r))
            return
        r.etat = REMPLACEMENT.appliquer(r.etat, "customer.refund_chosen").vers
        r.save(update_fields=["etat"])
        lit.decision_le = lit.clos_le = maintenant
        lit.decision_motif = f"Le vendeur n’a plus l’article : {regles.francs(lit.montant)} remboursés à ta demande."
        lit.rembourse += lit.montant
        lit.save()
        montant = lit.montant
        transaction.on_commit(lambda: signaux.litige_rembourse.send(sender=Litige, litige=lit, montant=montant, motif="remplacement"))


# ── Console (sans route client) : réponse du vendeur, décision, retour, remplacement ────────────────────


def reponse_du_vendeur(lit: Litige, reponse: str, *, montant: int | None = None, texte: str = "") -> Litige:
    maintenant = _maintenant()
    with transaction.atomic():
        lit = Litige.objects.select_for_update().get(pk=lit.pk)
        if reponse == Litige.Reponse.ARRANGEMENT:
            if lit.etat != E.ATTENTE_VENDEUR or not montant or montant > lit.montant:
                raise conflit("state_changed", MESSAGES["state_changed"])
            if len(texte.strip()) < parametres.entier("LIT-ARRANG-MIN"):
                raise refus("arrangement_trop_court", "L'arrangement doit être expliqué.")
            lit.arrangement_montant, lit.arrangement_texte, lit.arrangement_propose_le = montant, texte.strip(), maintenant
        else:
            evenement = {"accepte": "seller.accepted", "conteste": "seller.contested", "silence": "seller.silent"}[reponse]
            lit.etat = LITIGE.appliquer(lit.etat, evenement, {"arrangement_ou_contestation_valide": bool(texte.strip())}).vers
            if reponse == Litige.Reponse.ACCEPTE:
                # « Signaler seulement » : rien à rendre ni à remplacer, le dossier se clôt.
                issue = lit.souhait if lit.souhait != Litige.Souhait.SIGNAL else Litige.Issue.AUCUNE
                _decision(lit, issue, texte or "Le vendeur accepte.", maintenant)
        lit.reponse_vendeur = reponse
        lit.save()
    return lit


def decider(lit: Litige, issue: str, motif: str) -> Litige:
    """Décision de BelivaY après examen, motif écrit obligatoire (validation humaine en console)."""
    maintenant = _maintenant()
    with transaction.atomic():
        lit = Litige.objects.select_for_update().get(pk=lit.pk)
        lit.etat = LITIGE.appliquer(lit.etat, "dispute.decided", {"motif_ecrit": bool((motif or "").strip())}).vers
        _decision(lit, issue, motif, maintenant)
        lit.save()
    return lit


def _decision(lit: Litige, issue: str, motif: str, maintenant) -> None:
    p = parametres.litiges()
    lit.issue, lit.decision_motif, lit.decision_le = issue, motif.strip(), maintenant
    sc = SousCommande.objects.select_for_update().filter(order_id=lit.order_id, n=lit.colis).first()
    if issue == Litige.Issue.REMBOURSE:
        # DP-10 : toujours un dépôt au relais ; le remboursement part à la clôture du retour.
        if sc is not None:
            sc.etat = SOUS_COMMANDE.appliquer(sc.etat, "return.accepted", {"decision_ou_accord": True}).vers
            sc.save(update_fields=["etat"])
        etat = RETOUR.appliquer("—", "return.accepted").vers
        Retour.objects.update_or_create(
            litige=lit, defaults={"etat": etat, "accepte_le": maintenant, "deposer_avant": maintenant + timedelta(days=DEPOT_RETOUR_JOURS)}
        )
    elif issue == Litige.Issue.REMPLACE:
        etat = REMPLACEMENT.appliquer("—", "replacement.decided").vers
        Remplacement.objects.update_or_create(
            litige=lit,
            defaults={
                "etat": etat,
                "debut": maintenant,
                "avant": moteur.echeance_remplacement(maintenant, p),
                "vendeurs_essayes": [sc.vendor_id] if sc and sc.vendor_id else [],
            },
        )
    else:
        lit.clos_le = maintenant
        if sc is not None and sc.etat == SousCommande.Etat.EN_LITIGE and lit.etat_colis_avant:
            sc.etat = lit.etat_colis_avant
            sc.save(update_fields=["etat"])


def avancer_retour(lit: Litige, evenement: str, en_tort: str = "vendeur") -> Retour:
    """Collecte, réception, inspection, clôture (relais, livreur, vendeur) ; à la clôture : remboursement du retour."""
    p = parametres.litiges()
    maintenant = _maintenant()
    champs = {"return.collected": "collecte_le", "return.received": "recu_le", "return.inspected": "inspecte_le"}
    with transaction.atomic():
        r = Retour.objects.select_for_update().get(litige=lit)
        r.etat = RETOUR.appliquer(r.etat, evenement).vers
        if evenement in champs:
            setattr(r, champs[evenement], maintenant)
        if r.etat == Retour.Etat.CLOS:
            calcul = moteur.rembourser_retour(lit.montant, moteur.PartieEnTort(en_tort), p)
            r.clos_le, r.en_tort, r.rembourse = maintenant, en_tort, calcul.montant
            Litige.objects.filter(pk=lit.pk).update(clos_le=maintenant, rembourse=lit.rembourse + calcul.montant)
            transaction.on_commit(lambda: signaux.litige_rembourse.send(sender=Litige, litige=lit, montant=calcul.montant, motif="retour"))
        r.save()
    return r


def avancer_remplacement(lit: Litige, evenement: str) -> Remplacement:
    maintenant = _maintenant()
    with transaction.atomic():
        r = Remplacement.objects.select_for_update().get(litige=lit)
        r.etat = REMPLACEMENT.appliquer(r.etat, evenement).vers
        if evenement == "replacement.collected":
            r.expedie_le = maintenant
        if r.etat == Remplacement.Etat.REMIS:
            r.remis_le = maintenant
            Litige.objects.filter(pk=lit.pk).update(clos_le=maintenant)
        r.save()
    return r


def proposer_autre_vendeur(lit: Litige, trust_scores: dict[int, int]) -> Remplacement | None:
    """Le vendeur n'a plus l'article : vendeur suivant (catalogue.vendeur_suivant, DP-01). `trust_scores` :
    vendor_id → Trust Score lu au service Scores de relaya (TrustScoreProfile). None : aucun autre vendeur conforme."""
    from belivay_moteurs.catalogue import Offre, OffreAttribuee, vendeur_suivant
    from belivay_moteurs.erreurs import PanierInvalide
    from belivay_moteurs.frais import Article, Classe, Mode, Panier, calculer
    from belivay_moteurs.frais import SousCommande as ScMoteur

    pl, pb = parametres.livraison(), parametres.bascule()
    with transaction.atomic():
        r = Remplacement.objects.select_for_update().get(litige=lit)
        sc = SousCommande.objects.filter(order_id=lit.order_id, n=lit.colis).first()
        ligne = sc.lignes.filter(product_id=lit.product_id).first() if sc else None
        if sc is None or ligne is None:
            return None
        montants = MontantsCommande.objects.filter(order_id=lit.order_id).first()
        mode = Mode(montants.mode if montants else "relais")
        classe = Classe(ligne.classe or "S")
        paye = str(sc.vendor_id)
        try:
            cout = calculer(Panier(mode, (ScMoteur(paye, sc.zone, (Article(paye, ligne.prix, ligne.qte, classe),)),)), pl).total
        except PanierInvalide:
            return None
        payee = OffreAttribuee(Offre(paye, sc.zone, ligne.prix, classe, 100, 0), cout)
        offres = tuple(
            Offre(str(o.boutique.id), o.boutique.zone, o.prix, classe, trust_scores.get(o.boutique.id, 0), o.stock or 0)
            for o in pont.autres_offres(lit.product_id)
            if o.boutique is not None
        )
        produits = {str(o.boutique.id): o for o in pont.autres_offres(lit.product_id) if o.boutique is not None}
        essayes = frozenset(str(v) for v in r.vendeurs_essayes) | {paye}
        bascule = vendeur_suivant(offres, payee, essayes, None, ligne.qte, mode, pl, pb)
        if bascule.offre is None:
            return None
        r.etat = REMPLACEMENT.appliquer(r.etat, "seller.out_of_stock", {"autre_vendeur_conforme": True}).vers
        choisi = produits[bascule.offre.offre.vendeur]
        r.autre_vendor_id, r.autre_product_id = choisi.boutique.id, choisi.id
        r.autre_boutique, r.autre_trust, r.ecart = choisi.boutique.nom, bascule.offre.offre.trust_score, bascule.ecart_paye_par_belivay
        r.vendeurs_essayes = sorted({*r.vendeurs_essayes, choisi.boutique.id})
        r.save()
    return r


# ── Commande vue pour un litige (GET /api/orders/{id}?for=dispute) ──────────────────────────────────────


def commande_litige(user, ref) -> dict | None:
    commande = pont.commande(ref, user)
    if commande is None:
        return None
    p = parametres.litiges()
    maintenant = _maintenant()
    jour = aujourd_hui()
    montants = MontantsCommande.objects.filter(order_id=commande.id).first()
    colis, retraits = [], []
    for sc in SousCommande.objects.filter(order_id=commande.id).exclude(etat=SousCommande.Etat.ANNULEE).prefetch_related("lignes"):
        lignes = sorted(sc.lignes.all(), key=lambda x: x.pk)
        titres = [x.titre for x in lignes]
        retrait = regles.retire_le(sc.remise_le, jour) if sc.remise_le else ""
        colis.append(
            {
                "n": sc.n,
                "produit": titres[0] if titres else sc.boutique,
                "dessin": pont.image(lignes[0].product_id) if lignes else "",
                "detail": regles.detail_colis(titres, retrait),
                "montant": sum(x.prix * x.qte for x in lignes),
            }
        )
        if sc.remise_le:
            retraits.append(sc.remise_le)
    fenetre, fin_cachee = "ouverte", ""
    if retraits:
        dernier = max(retraits)
        tout_en_ordre = bool(montants and montants.tout_en_ordre_le)
        if moteur.voie_de_retour(moteur.Motif.ABIME, dernier, maintenant, tout_en_ordre, p) is moteur.Voie.AUCUNE:
            fenetre = "cachee"
            fin_cachee = regles.jour_fr(dernier + timedelta(days=p.vice_cache_jours))
    return {
        "ref": commande.ref,
        "colis": colis,
        "fenetre": fenetre,
        "finCachee": fin_cachee,
        "payePar": regles.paye_par(montants.moyen, montants.numero_masque) if montants else "",
    }


# ── Avis sur une commande (CL-13 ; AVIS-FENETRE, AVIS-BAS) ──────────────────────────────────────────────


def _colis_et_retrait(order_id: int):
    scs = list(SousCommande.objects.filter(order_id=order_id).exclude(etat=SousCommande.Etat.ANNULEE).prefetch_related("lignes"))
    retraits = [sc.remise_le for sc in scs if sc.remise_le]
    return scs, (max(retraits) if retraits else None)


def donnees_avis(user, ref) -> dict | None:
    commande = pont.commande(ref, user)
    if commande is None:
        return None
    pa = parametres.avis()
    scs, retrait = _colis_et_retrait(commande.id)
    montants = MontantsCommande.objects.filter(order_id=commande.id).first()
    relais = pont.relais(commande.relay_id or (scs[0].relay_id if scs else None))
    lignes = [sorted(sc.lignes.all(), key=lambda x: x.pk) for sc in scs]
    toutes = [x for ls in lignes for x in ls] or [pont.LigneCommande(x.product_id, x.titre, x.prix, x.qte) for x in commande.lignes]
    premiere = toutes[0] if toutes else None
    titre = premiere.titre if premiere else commande.ref
    if len(toutes) > 1:
        titre += f" +{len(toutes) - 1}"
    plusieurs = len(scs) > 1
    avis = AvisCommande.objects.filter(client=user, order_id=commande.id).first()
    return {
        "commande": {
            "ref": commande.ref,
            "titre": titre,
            "produit": str(premiere.product_id) if premiere else "",
            "dessin": pont.image(premiere.product_id) if premiere else "",
            "retireeLe": ms(retrait),
            "payeeLe": ms((montants.payee_le if montants else None) or commande.creee_le),
            "relais": relais.nom if relais else "",
            "gerant": relais.gerant if relais else "",
            "colis": [
                {"produit": ls[0].titre, "dessin": pont.image(ls[0].product_id)} if plusieurs and ls else {"produit": None} for ls in lignes
            ],
            "avis": None
            if avis is None
            else {"notes": avis.notes, "commentaire": avis.commentaire, "photo": adresse(avis.photo), "envoyeLe": ms(avis.envoye_le)},
        },
        "fenetreJours": pa.fenetre_jours,
        "maintenant": ms(_maintenant()),
        "prenom": user.first_name,
    }


def envoyer_avis(user, ref, notes: list, commentaire: str, photo) -> dict:
    pa = parametres.avis()
    commande = pont.commande(ref, user)
    scs, retrait = _colis_et_retrait(commande.id) if commande else ([], None)
    if commande is None or retrait is None:
        raise interdit("non_eligible", "Seuls ceux qui ont payé et retiré la commande la notent.", {"raison": "non_retiree"})
    if _maintenant() > moteur_notes.fin_de_notation(retrait, pa):
        raise ErreurClient(status.HTTP_410_GONE, "fenetre_fermee", "Le délai pour noter cette commande est passé.", {"raison": "ferme"})
    if len(notes) != len(scs) + 1:
        raise serializers.ValidationError({"notes": [f"Une note par colis puis le relais : {len(scs) + 1} notes."]})
    try:
        basse = any(moteur_notes.note_basse(n, pa) for n in notes)
    except ValueError:
        raise serializers.ValidationError({"notes": ["Une note est un entier de 1 à 5 étoiles."]}) from None
    fichier = lire_photo(photo, prefixe="avis") if photo else None
    avis, cree = AvisCommande.objects.get_or_create(client=user, order_id=commande.id, defaults={"notes": notes})
    avis.notes, avis.commentaire, avis.note_basse = notes, (commentaire or "").strip(), basse
    avis.photo = fichier if fichier is not None else ""
    if not cree:
        avis.envoye_le = _maintenant()
    avis.save()
    return {"ok": True}


def voter(user, review_id, action: str) -> None:
    """Un vote par client et par avis : « utile » se coche et se décoche, « signaler » est définitif."""
    try:
        n = int(review_id)
    except (TypeError, ValueError):
        raise introuvable("Cet avis n'existe pas.") from None
    try:
        avis_produit = apps.get_model("catalog", "ProductReview")
    except LookupError:  # projet d'essai : pas d'avis produit ; l'identifiant est gardé tel quel
        avis_produit = None
    if avis_produit is not None and not avis_produit.objects.filter(pk=n).exists():
        raise introuvable("Cet avis n'existe pas.")
    with transaction.atomic():
        vote, _ = VoteAvis.objects.select_for_update().get_or_create(client=user, review_id=n)
        if action == "utile":
            vote.utile = not vote.utile
        elif vote.signale_le is None:
            vote.signale_le = _maintenant()
        vote.save()


# ── Exposé aux autres applications ──────────────────────────────────────────────────────────────────────


def litiges_en_cours(user) -> int:
    return Litige.objects.filter(client=user, retire_le__isnull=True, clos_le__isnull=True).exclude(etat=E.REMBOURSE_AUTO).count()


def avis_a_donner(user) -> list[dict]:
    """Commandes retirées encore dans AVIS-FENETRE et pas encore notées."""
    pa = parametres.avis()
    maintenant = _maintenant()
    ids = list(pont.modele("commande").objects.filter(user=user).values_list("pk", flat=True))
    notees = set(AvisCommande.objects.filter(client=user).values_list("order_id", flat=True))
    rendu = []
    for order_id in sorted(set(ids) - notees, reverse=True):
        scs, retrait = _colis_et_retrait(order_id)
        if retrait is None:
            continue
        fin = moteur_notes.fin_de_notation(retrait, pa)
        if maintenant > fin:
            continue
        premiere = next((x for sc in scs for x in sorted(sc.lignes.all(), key=lambda y: y.pk)), None)
        rendu.append({"ref": pont.ref_commande(order_id), "article": premiere.titre if premiere else "", "jusqua": ms(fin)})
    return rendu


def jours_suspendus(order_id: int) -> set[date]:
    """Jours (Yaoundé) pendant lesquels un litige de la commande était ouvert : jamais facturés en garde (CAL-21)."""
    jours: set[date] = set()
    aujourdhui = aujourd_hui()
    for lit in Litige.objects.filter(order_id=order_id).exclude(etat=E.REMBOURSE_AUTO):
        d = lit.ouvert_le.astimezone(YAOUNDE).date()
        fin = lit.clos_le.astimezone(YAOUNDE).date() if lit.clos_le else aujourdhui
        while d <= fin:
            jours.add(d)
            d += timedelta(days=1)
    return jours


def dossier_en_cours(user) -> dict | None:
    lit = (
        Litige.objects.filter(client=user, retire_le__isnull=True, clos_le__isnull=True)
        .exclude(etat=E.REMBOURSE_AUTO)
        .order_by("-ouvert_le")
        .first()
    )
    if lit is None:
        return None
    if lit.etat in (E.OUVERT, E.ATTENTE_VENDEUR):
        sous = f"Réponse du vendeur avant {regles.date_fr(lit.echeance_vendeur)}"
    elif lit.etat == E.EN_EXAMEN:
        sous = f"Décision au plus tard {regles.date_fr(lit.decision_au_plus_tard)}"
    else:
        sous = "Décision rendue : suis le retour ou le remplacement"
    return {"id": lit.ref, "libelle": f"Ton dossier {lit.ref} · {lit.produit}", "sous": sous}
