# backend/apps/subscriptions/services.py
# Abonnement, cagnotte, abonnement offert, parrainage (CL-14 ; FF-ABONNEMENT ; CAB-43, CAB-44 ; DP-41, DP-54).
# Règles : regles.py (portées de site/src/donnees/prime.ts), valeurs du registre (ABO-*, LIV-*, PAY-CARTE-*).
#
# Exposé aux autres applications du kit :
#   remise_livraison(user, frais_panier, mode="relais") -> int   remise de l'abonnement sur la livraison (0 sans abonnement
#                                                               actif) ; frais_panier : belivay_moteurs.frais.FraisPanier
#   abonnement_actif(user) -> bool                              période payée en cours (grâce comprise)
#   jours_garde_bonus(user) -> int                              ABO-GARDE-BONUS du palier actif (0 sinon)
#   cagnotte_en_attente(user) -> int                            cagnotte des commandes payées, pas encore créditée
#   crediter_cagnotte(order_id) -> int                          à appeler quand le vendeur est payé (libération)
#   confirmer_prelevement(reference, reussi)                    webhook de l'agrégateur (comme wallet.confirmer_recharge)
#   prelever_echeances()                                        tâche quotidienne : renouvellements arrivés à échéance
#   appliquer_cadeaux_en_attente(user, numero)                  à l'inscription ou à la vérification d'un numéro
#   enregistrer_filleul(code, filleul), filleul_a_retire(filleul)  parrainage (inscription, premier retrait)

import secrets
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status

from apps.client_core import parametres, pont
from apps.client_core.chiffrement import chiffrer, dechiffrer, empreinte
from apps.client_core.erreurs import ErreurClient, conflit, introuvable, refus
from apps.client_core.interrupteurs import ouvert
from apps.client_core.masquage import masquer_numero, numero_local, operateur
from apps.client_core.temps import YAOUNDE, depuis_ms, ms
from apps.pickup.models import MontantsCommande, SousCommande
from apps.wallet import compte
from apps.wallet import services as wallet
from apps.wallet.prestataires import carte, mobile_money

from . import regles
from .models import Abonnement, AbonnementOffert, CodeParrainage, CreditCagnotte, EssaiUtilise, Parrainage, Prelevement

# PARAMÈTRE À AJOUTER AU REGISTRE : ABO-DOM-QUOTA — remises à domicile offertes par mois (prime.ts : Prime 3, Duo 5,
# Business 6 ; Plus aucune).
DOMICILE_OFFERTS = {"plus": 0, "prime": 3, "duo": 5, "business": 6}
# PARAMÈTRE À AJOUTER AU REGISTRE : ABO-DOM-REDUCTION — réduction de la livraison à domicile au-delà des offertes
# (prime.ts : Plus −30 %, Prime, Duo, Business −50 %).
DOMICILE_ENSUITE = {"plus": Decimal("0.3"), "prime": Decimal("0.5"), "duo": Decimal("0.5"), "business": Decimal("0.5")}
# PARAMÈTRE À AJOUTER AU REGISTRE : ABO-BUSINESS-RELAIS — Business : livraison de base en relais à −50 % (prime.ts).
RELAIS_REDUCTION = {"plus": Decimal(1), "prime": Decimal(1), "duo": Decimal(1), "business": Decimal("0.5")}
# PARAMÈTRE À AJOUTER AU REGISTRE : ABO-PARRAIN-MOIS — mois offerts par proche (prime.ts : Plus 1, Prime 1, Duo 2,
# Business 3).
PARRAINAGE_MOIS = {"plus": 1, "prime": 1, "duo": 2, "business": 3}
# PARAMÈTRE À AJOUTER AU REGISTRE : ABO-COMPTES — comptes par abonnement (prime.ts : 1, 1, 2, 3).
COMPTES = {"plus": 1, "prime": 1, "duo": 2, "business": 3}
# PARAMÈTRE À AJOUTER AU REGISTRE : ABO-CAGNOTTE-PALIERS — paliers qui ont la cagnotte (prime.ts : pas Plus).
PALIERS_CAGNOTTE = ("prime", "duo", "business")
# PARAMÈTRE À AJOUTER AU REGISTRE : ABO-PASS7-JOURS — durée du Pass (le code ABO-PASS7 la porte dans son nom : 7).
PASS_JOURS = 7
NOMS = {"plus": "Plus", "prime": "Prime", "duo": "Prime Duo", "business": "Business"}


def regles_en_vigueur() -> regles.ReglesPrime:
    """Les règles de l'abonnement lues dans le registre (aucune valeur métier dans le code, CCH-15)."""
    n = parametres.nombres
    liv = parametres.livraison()
    seuil_relais, seuil_dom = n("ABO-SEUIL-RELAIS")[0], n("ABO-SEUIL-DOM")[0]
    illimite = n("ABO-ILLIMITE")
    bonus = n("ABO-GARDE-BONUS")
    cagnotte = Decimal(n("ABO-CAGNOTTE")[0])
    paliers = {}
    for p in regles.PALIERS:
        mois, an = n(f"ABO-{p.upper()}")[:2]
        paliers[p] = regles.DefPalier(
            id=p,
            nom=NOMS[p],
            mois=mois,
            an=an,
            relais_des=seuil_relais,
            relais_offerts=n("ABO-QUOTA-PLUS")[0] if p == "plus" else None,
            relais_reduction=RELAIS_REDUCTION[p],
            domicile_offerts=DOMICILE_OFFERTS[p],
            domicile_des=0 if p == "plus" else seuil_dom,
            domicile_ensuite=DOMICILE_ENSUITE[p],
            cagnotte_pour_cent=cagnotte if p in PALIERS_CAGNOTTE else Decimal(0),
            garde_bonus=bonus[0] if p == "plus" else bonus[-1],
            comptes=COMPTES[p],
            parrainage=PARRAINAGE_MOIS[p],
            plafond=illimite[-1] if p == "business" else illimite[0],
        )
    prix_pass, commandes_pass = n("ABO-PASS7")[:2]
    return regles.ReglesPrime(
        paliers=paliers,
        pass_=regles.Pass(
            prix=prix_pass, jours=PASS_JOURS, relais_des=seuil_relais, commandes=commandes_pass, delai_jours=n("ABO-PASS7-DELAI")[0]
        ),
        essai=n("ABO-ESSAI")[0],
        grace_jours=n("ABO-GRACE")[0],
        cagnotte_jours=n("ABO-CAGNOTTE")[1],
        parrainages_par_mois=n("ABO-PARRAIN")[0],
        base_relais=liv.ramassage + liv.remise_relais[liv.classe_offerte],
        base_domicile=liv.ramassage + liv.remise_domicile,
        seuil_relais=liv.seuil_relais,
        seuil_domicile=liv.seuil_domicile,
        carte_frais_pour_cent=parametres.paiement().carte_frais_pour_cent,
    )


def _reference(prefixe: str) -> str:
    return f"{prefixe}-{secrets.token_hex(5).upper()}"


def _debut_mois(maintenant):
    d = maintenant.astimezone(YAOUNDE)
    return d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


# ── Abonnement courant ──────────────────────────────────────────────────────────────────────────────────────


def courant(user) -> Abonnement | None:
    return Abonnement.objects.filter(client=user).first()


def est_actif(r: regles.ReglesPrime, a: Abonnement | None, maintenant=None) -> bool:
    if a is None:
        return False
    return regles.actif(r, ms(a.fin), ms(a.echec_le), ms(maintenant or timezone.now()))


def abonnement_json(a: Abonnement) -> dict:
    return {
        "palier": a.palier,
        "formule": a.formule,
        "debut": ms(a.debut),
        "prochain": ms(a.prochain),
        "montant": a.montant,
        "moyen": a.moyen,
        "resilie": ms(a.resilie),
        "fin": ms(a.fin),
        "offertPar": a.offert_par or None,
        "echec": {"le": ms(a.echec_le), "moyen": a.echec_moyen, "montant": a.echec_montant, "tentatives": a.echec_tentatives}
        if a.echec_le
        else None,
        "messageCadeau": a.message_cadeau or None,
    }


def _payees(user):
    return MontantsCommande.objects.filter(client=user, etat_paiement=MontantsCommande.EtatPaiement.PAYEE)


def usage(user, maintenant=None) -> regles.Usage:
    """Commandes de ce mois (Yaoundé) : servies par l'abonnement (relais, domicile) et payées au total."""
    qs = _payees(user).filter(payee_le__gte=_debut_mois(maintenant or timezone.now()))
    return regles.Usage(
        relais=qs.filter(prime__gt=0, mode=MontantsCommande.Mode.RELAIS).count(),
        domicile=qs.filter(prime__gt=0, mode=MontantsCommande.Mode.DOMICILE).count(),
        total=qs.count(),
    )


def remise_livraison(user, frais_panier, mode: str = "relais") -> int:
    """Remise de l'abonnement sur la livraison d'un panier (0 sans abonnement actif ou si FF-ABONNEMENT est fermé)."""
    if not ouvert("FF-ABONNEMENT"):
        return 0
    a = courant(user)
    r = regles_en_vigueur()
    if not est_actif(r, a):
        return 0
    livraison = frais_panier.total - frais_panier.sous_total
    return regles.remise_prime(r, a.palier, True, mode, frais_panier.sous_total, livraison, usage(user))


def abonnement_actif(user) -> bool:
    """Un abonnement en cours (période payée, grâce comprise) : compte (suppression), menu."""
    return est_actif(regles_en_vigueur(), courant(user))


def jours_garde_bonus(user) -> int:
    a = courant(user)
    r = regles_en_vigueur()
    if not est_actif(r, a) or a.palier == "pass":
        return 0
    return r.palier(a.palier).garde_bonus


# ── Paiement d'un abonnement ────────────────────────────────────────────────────────────────────────────────


def _demander(a: Abonnement, montant: int, moyen: wallet.Moyen) -> Prelevement:
    """Demande l'argent (Mobile Money : validation sur le téléphone ; carte : tout de suite). Refus immédiat : 422."""
    pr = Prelevement.objects.create(abonnement=a, montant=montant, moyen=moyen.libelle, reference=_reference("ABO"))
    if moyen.type == "carte":
        res = carte().payer(
            montant_xaf=montant, devise="XAF", montant_devise=None, jeton=moyen.jeton, reference=pr.reference, email=a.client.email
        )
    else:
        res = mobile_money().demander(
            montant_xaf=montant, numero=moyen.numero, reference=pr.reference, motif=f"Abonnement BelivaY {a.palier}"
        )
    if res.statut == "refuse":
        raise refus("paiement_refuse", "Le paiement a été refusé. Réessaie ou choisis un autre moyen.", {"motif": res.motif})
    if res.statut == "action_requise":
        raise refus("action_requise", "Ta banque demande une confirmation (3-D Secure).", {"redirection": res.redirection})
    if res.statut == "reussi":
        pr.etat = Prelevement.Etat.REUSSI
        pr.save(update_fields=["etat"])
    return pr


def confirmer_prelevement(reference: str, reussi: bool = True, motif: str = "") -> Prelevement | None:
    """Webhook : réussi → rien à changer ; refusé → prélèvement refusé (grâce ABO-GRACE, CAB-43). None : pas à nous."""
    with transaction.atomic():
        pr = Prelevement.objects.select_for_update().select_related("abonnement").filter(reference=reference).first()
        if pr is None or pr.etat != Prelevement.Etat.ATTENTE:
            return pr
        pr.etat = Prelevement.Etat.REUSSI if reussi else Prelevement.Etat.REFUSE
        pr.motif = motif
        pr.save(update_fields=["etat", "motif"])
        if not reussi:
            a = pr.abonnement
            a.echec_le = a.echec_le or timezone.now()
            a.echec_moyen, a.echec_montant = pr.moyen, pr.montant
            a.echec_tentatives += 1
            a.prochain = None
            a.save(update_fields=["echec_le", "echec_moyen", "echec_montant", "echec_tentatives", "prochain"])
    return pr


def prelever_echeances(maintenant=None) -> int:
    """Tâche quotidienne (planificateur de relaya) : renouvelle les abonnements arrivés à échéance ; rend le nombre."""
    maintenant = maintenant or timezone.now()
    r = regles_en_vigueur()
    n = 0
    for a in Abonnement.objects.filter(prochain__lte=maintenant, resilie__isnull=True, echec_le__isnull=True).select_related("client"):
        if courant(a.client) != a:
            continue
        echeance = a.prochain
        try:
            with transaction.atomic():
                moyen = wallet.resoudre_moyen(a.client, a.moyen_ref or a.moyen)
                a.prochain = echeance + timedelta(days=regles.periode_jours(r, a.formule))
                a.save(update_fields=["prochain"])
                _demander(a, a.montant, moyen)
        except ErreurClient as e:
            Abonnement.objects.filter(pk=a.pk).update(
                echec_le=echeance, echec_moyen=a.moyen, echec_montant=a.montant, echec_tentatives=1, prochain=None
            )
            if e.code not in ("paiement_refuse", "moyen_inconnu", "action_requise"):
                raise
        n += 1
    return n


def _numero_essai(user) -> str:
    num = compte.numero_du_compte(user)
    return empreinte(num) if num else ""


def souscrire(user, palier: str, formule: str, moyen_texte: str) -> dict:
    r = regles_en_vigueur()
    if (palier == "pass") != (formule == "pass") or palier not in [*regles.PALIERS, "pass"] or formule not in ("mois", "an", "pass"):
        raise ErreurClient(
            status.HTTP_400_BAD_REQUEST, "invalid", "Palier ou formule invalide.", {"fields": {"palier": [palier], "formule": [formule]}}
        )
    maintenant = timezone.now()
    moyen = wallet.resoudre_moyen(user, moyen_texte)
    essai = False
    if regles.essai_applicable(palier, formule) and not EssaiUtilise.objects.filter(client=user).exists():
        num = _numero_essai(user)
        if num and EssaiUtilise.objects.filter(numero_empreinte=num).exclude(client=user).exists():
            raise conflit("trial_used", "L'essai de Prime a déjà servi pour ce numéro.")
        essai = True
    if palier == "pass":
        dernier = Abonnement.objects.filter(client=user, palier="pass").first()
        if dernier is not None and dernier.debut > maintenant - timedelta(days=r.pass_.delai_jours):
            prochain = dernier.debut + timedelta(days=r.pass_.delai_jours)
            raise refus("pass_trop_tot", "Un seul Pass 7 jours par période.", {"possibleLe": ms(prochain)})
    with transaction.atomic():
        ancien = courant(user)
        if ancien is not None and est_actif(r, ancien, maintenant):
            ancien.fin, ancien.prochain = maintenant, None
            ancien.save(update_fields=["fin", "prochain"])
        jours = regles.periode_jours(r, formule)
        a = Abonnement.objects.create(
            client=user,
            palier=palier,
            formule=formule,
            debut=maintenant,
            prochain=None if palier == "pass" else maintenant + timedelta(days=jours),
            fin=maintenant + timedelta(days=jours) if palier == "pass" else None,
            montant=regles.prix(r, palier, formule),
            moyen=moyen.libelle,
            moyen_ref=moyen.ident,
            essai=essai,
        )
        if essai:
            EssaiUtilise.objects.create(client=user, numero_empreinte=_numero_essai(user))
        _demander(a, regles.prix(r, palier, formule, essai_possible=essai), moyen)
    return abonnement_json(a)


def payer(user, moyen_texte: str) -> dict:
    """Après un prélèvement refusé : pendant la grâce, la période part du renouvellement refusé ; après, du jour du
    paiement ; le moyen payé sert aux prochains prélèvements."""
    r = regles_en_vigueur()
    moyen = wallet.resoudre_moyen(user, moyen_texte)
    maintenant = timezone.now()
    with transaction.atomic():
        a = Abonnement.objects.select_for_update().filter(client=user).first()
        if a is None:
            raise introuvable("Aucun abonnement.")
        if not a.echec_le:
            return abonnement_json(a)
        montant = regles.prix(r, a.palier, a.formule) if a.palier != "pass" else a.montant
        depart = depuis_ms(regles.depart_apres_echec(r, ms(a.echec_le), ms(maintenant)))
        a.moyen, a.moyen_ref, a.montant = moyen.libelle, moyen.ident, montant
        a.prochain = depart + timedelta(days=regles.periode_jours(r, a.formule))
        a.resilie = a.fin = a.echec_le = None
        a.echec_moyen, a.echec_montant, a.echec_tentatives = "", 0, 0
        a.save()
        _demander(a, montant, moyen)
    return abonnement_json(a)


def changer_moyen(user, moyen_texte: str) -> None:
    moyen = wallet.resoudre_moyen(user, moyen_texte)
    a = courant(user)
    if a is None:
        raise introuvable("Aucun abonnement.")
    a.moyen, a.moyen_ref = moyen.libelle, moyen.ident
    a.save(update_fields=["moyen", "moyen_ref"])


def resilier(user) -> None:
    """Résiliation en un tap : l'abonnement court jusqu'à la fin de la période payée (ou de la grâce)."""
    r = regles_en_vigueur()
    with transaction.atomic():
        a = Abonnement.objects.select_for_update().filter(client=user).first()
        if a is None or a.resilie:
            return
        a.resilie = timezone.now()
        a.fin = depuis_ms(regles.fin_grace(r, ms(a.echec_le))) if a.echec_le else (a.prochain or a.fin)
        a.prochain, a.echec_le = None, None
        a.save(update_fields=["resilie", "fin", "prochain", "echec_le"])


def reprendre(user) -> None:
    with transaction.atomic():
        a = Abonnement.objects.select_for_update().filter(client=user).first()
        if a is None or not a.resilie:
            return
        if a.fin is not None and a.fin < timezone.now():
            raise conflit("state_changed", "Cet abonnement est terminé : souscris de nouveau.")
        a.prochain, a.resilie, a.fin = a.fin, None, None
        a.save(update_fields=["prochain", "resilie", "fin"])


# ── Abonnement offert ───────────────────────────────────────────────────────────────────────────────────────


def _utilisateur_par_numero(local: str):
    """Le compte dont ce numéro est le numéro vérifié : client_accounts.services.utilisateur_par_numero s'il existe,
    sinon son modèle ProfilClient (numero_empreinte, numero_verifie_le) ; None si personne."""
    try:
        from apps.client_accounts import services as comptes
    except ImportError:
        return None
    f = getattr(comptes, "utilisateur_par_numero", None)
    if callable(f):
        return f(local)
    from django.apps import apps as registre

    try:
        Profil = registre.get_model("client_accounts", "ProfilClient")
    except LookupError:
        return None
    p = Profil.objects.filter(numero_empreinte=empreinte(local), numero_verifie_le__isnull=False).select_related("user").first()
    return p.user if p is not None else None


def _appliquer_cadeau(cadeau: AbonnementOffert, beneficiaire) -> Abonnement:
    """Le cadeau commence à la fin de l'abonnement en cours (ou tout de suite) ; aucun prélèvement ensuite."""
    r = regles_en_vigueur()
    maintenant = timezone.now()
    actuel = courant(beneficiaire)
    debut = maintenant
    if est_actif(r, actuel, maintenant):
        debut = actuel.fin or actuel.prochain or maintenant
        actuel.fin, actuel.prochain = debut, None
        actuel.save(update_fields=["fin", "prochain"])
    a = Abonnement.objects.create(
        client=beneficiaire,
        palier=cadeau.palier,
        formule="an" if cadeau.mois == 12 else "mois",
        debut=min(maintenant, debut),
        prochain=None,
        montant=0,
        moyen=cadeau.carte,
        fin=debut + timedelta(days=regles.jours_cadeau(cadeau.mois)),
        offert_par=cadeau.offrant.first_name or "Un proche",
        message_cadeau=cadeau.message,
    )
    cadeau.beneficiaire, cadeau.abonnement = beneficiaire, a
    cadeau.save(update_fields=["beneficiaire", "abonnement"])
    return a


def offrir(user, numero: str, prenom: str, palier: str, mois: int, message: str, carte_texte: str) -> dict:
    """offrirAbonnement : payé par carte en une fois, frais de service carte (PAY-CARTE-FRAIS), plafond PAY-CARTE-MAX."""
    local = numero_local(numero)
    if operateur(local) is None:
        return {"ok": False, "raison": "inconnu"}
    r = regles_en_vigueur()
    d = r.palier(palier)
    if palier not in ("plus", "prime", "duo") or d is None or mois not in regles.DUREES_CADEAU:
        raise ErreurClient(
            status.HTTP_400_BAD_REQUEST, "invalid", "Palier ou durée invalide.", {"fields": {"palier": [palier], "mois": [mois]}}
        )
    montant = regles.prix_cadeau(d, mois)
    frais = regles.frais_carte(r, montant)
    if montant + frais > parametres.paiement().carte_max:
        raise refus("plafond_carte", "Au-delà du plafond d'un paiement par carte.", {"plafond": parametres.paiement().carte_max})
    # La carte : une carte enregistrée (« c3 », « Visa •••• 4242 ») ou le jeton du champ sécurisé du prestataire.
    try:
        m = wallet.resoudre_moyen(user, carte_texte)
        if m.type != "carte":
            raise refus("carte_inconnue", "Choisis une carte.")
        jeton, libelle = m.jeton, m.libelle
    except ErreurClient:
        if "••••" in carte_texte or not carte_texte.strip():
            raise refus("carte_inconnue", "Cette carte n'est pas enregistrée : saisis-la dans le champ sécurisé.") from None
        jeton, libelle = carte_texte.strip(), "Carte"
    ref = _reference("CAD")
    res = carte().payer(montant_xaf=montant + frais, devise="XAF", montant_devise=None, jeton=jeton, reference=ref, email=user.email)
    if res.statut == "refuse":
        raise refus("carte_refusee", "La carte a été refusée.", {"motif": res.motif})
    champs = {
        "offrant": user,
        "numero_chiffre": chiffrer(local),
        "numero_empreinte": empreinte(local),
        "numero_masque": masquer_numero(local),
        "prenom": prenom.strip()[:80],
        "palier": palier,
        "mois": mois,
        "message": (message or "").strip()[:300],
        "montant": montant,
        "frais_service": frais,
        "carte": libelle,
        "ref": ref,
        "paiement_ref": res.reference or ref,
    }
    if res.statut == "action_requise":
        # 3-D Secure : le cadeau attend la banque ; confirmer_cadeau() (webhook du prestataire) l'appliquera.
        AbonnementOffert.objects.create(**champs, paiement=AbonnementOffert.Paiement.ACTION)
        raise refus("action_requise", "Ta banque demande une confirmation (3-D Secure).", {"redirection": res.redirection, "ref": ref})
    with transaction.atomic():
        cadeau = AbonnementOffert.objects.create(**champs)
        beneficiaire = user if local == compte.numero_du_compte(user) else _utilisateur_par_numero(local)
        a = _appliquer_cadeau(cadeau, beneficiaire) if beneficiaire is not None else None
    pour_ce_compte = beneficiaire is not None and beneficiaire.pk == user.pk
    return {
        "ok": True,
        "pourCeCompte": pour_ce_compte,
        "ref": ref,
        "le": ms(cadeau.le),
        "du": ms(a.fin - timedelta(days=regles.jours_cadeau(mois))) if pour_ce_compte else None,
        "au": ms(a.fin) if pour_ce_compte else None,
    }


def confirmer_cadeau(reference: str, reussi: bool = True) -> AbonnementOffert | None:
    """Webhook du prestataire carte au retour de 3-D Secure : le cadeau en attente est appliqué (au bénéficiaire s'il a
    un compte, sinon à son inscription) ; refusé, il n'est jamais appliqué. None : la référence n'est pas un cadeau."""
    with transaction.atomic():
        cadeau = AbonnementOffert.objects.select_for_update().filter(paiement_ref=reference).first()
        if cadeau is None or cadeau.paiement != AbonnementOffert.Paiement.ACTION:
            return cadeau
        cadeau.paiement = AbonnementOffert.Paiement.PAYE if reussi else AbonnementOffert.Paiement.REFUSE
        cadeau.save(update_fields=["paiement"])
        if reussi:
            local = dechiffrer(cadeau.numero_chiffre)
            offrant = cadeau.offrant
            beneficiaire = offrant if local == compte.numero_du_compte(offrant) else _utilisateur_par_numero(local)
            if beneficiaire is not None:
                _appliquer_cadeau(cadeau, beneficiaire)
    return cadeau


def appliquer_cadeaux_en_attente(user, numero: str) -> int:
    """Cadeaux offerts à ce numéro avant qu'il ait un compte (et payés) : appliqués maintenant ; rend leur nombre."""
    n = 0
    for cadeau in AbonnementOffert.objects.filter(
        beneficiaire__isnull=True, numero_empreinte=empreinte(numero_local(numero)), paiement=AbonnementOffert.Paiement.PAYE
    ).order_by("pk"):
        _appliquer_cadeau(cadeau, user)
        n += 1
    return n


# ── Cagnotte (ABO-CAGNOTTE) ─────────────────────────────────────────────────────────────────────────────────


def _palier_au_paiement(r, mc: MontantsCommande) -> str | None:
    """Palier de l'abonnement actif au paiement de la commande, s'il a la cagnotte."""
    le = mc.payee_le or mc.cree_le
    a = Abonnement.objects.filter(client_id=mc.client_id, debut__lte=le).first()
    if a is None or a.palier == "pass" or not regles.actif(r, ms(a.fin), ms(a.echec_le), ms(le)):
        return None
    return a.palier if r.palier(a.palier).cagnotte_pour_cent > 0 else None


def _base(mc: MontantsCommande, colis: list[SousCommande] | None = None) -> int:
    """Sous-total produits des colis non annulés (jamais la livraison)."""
    if colis is None:
        colis = list(SousCommande.objects.filter(order_id=mc.order_id))
    if not colis:
        return mc.sous_total
    return sum(sc.sous_total for sc in colis if sc.etat not in (SousCommande.Etat.ANNULEE, SousCommande.Etat.RENVOYEE_VENDEUR))


def _attente(user, r) -> list[dict]:
    """Commandes payées sous un palier à cagnotte, ni créditées ni entièrement annulées."""
    depuis = timezone.now() - timedelta(days=r.cagnotte_jours + 60)
    creditees = CreditCagnotte.objects.filter(client=user).values_list("order_id", flat=True)
    commandes = list(_payees(user).filter(payee_le__gte=depuis).exclude(order_id__in=creditees).order_by("-pk"))
    colis: dict[int, list[SousCommande]] = {}
    for sc in SousCommande.objects.filter(order_id__in=[mc.order_id for mc in commandes]).prefetch_related("lignes"):
        colis.setdefault(sc.order_id, []).append(sc)
    lignes = []
    for mc in commandes:
        palier = _palier_au_paiement(r, mc)
        if palier is None:
            continue
        base = _base(mc, colis.get(mc.order_id, []))
        montant = regles.montant_cagnotte(r, palier, base)
        if montant <= 0:
            continue
        premiere = next((li for sc in colis.get(mc.order_id, []) for li in sc.lignes.all()), None)
        lignes.append(
            {
                "ref": mc.ref,
                "produit": premiere.titre if premiere else "",
                "dessin": pont.image(premiere.product_id) if premiere else "",
                "base": base,
                "montant": montant,
            }
        )
    return lignes


def cagnotte_en_attente(user) -> int:
    if not ouvert("FF-ABONNEMENT"):
        return 0
    return sum(x["montant"] for x in _attente(user, regles_en_vigueur()))


def crediter_cagnotte(order_id: int) -> int:
    """Quand le vendeur est payé : ABO-CAGNOTTE % du sous-total des colis gardés, une fois par commande. Versé au
    portefeuille si FF-WALLET est ouvert (sous le plafond), sinon disponible pour verserCagnotte. Rend le montant."""
    mc = MontantsCommande.objects.filter(order_id=order_id).select_related("client").first()
    if mc is None:
        return 0
    deja = CreditCagnotte.objects.filter(order_id=order_id).first()
    if deja is not None:
        return deja.montant
    r = regles_en_vigueur()
    palier = _palier_au_paiement(r, mc)
    if palier is None:
        return 0
    base = _base(mc)
    montant = regles.montant_cagnotte(r, palier, base)
    if montant <= 0:
        return 0
    with transaction.atomic():
        cg = CreditCagnotte.objects.create(
            client=mc.client,
            order_id=order_id,
            palier=palier,
            base=base,
            montant=montant,
            reste=montant,
            expire_le=timezone.now() + timedelta(days=r.cagnotte_jours),
        )
        if ouvert("FF-WALLET"):
            taux = r.palier(palier).cagnotte_pour_cent
            verse = wallet.crediter_cagnotte_portefeuille(
                mc.client, montant, f"CAG-{mc.ref}", f"Cagnotte {taux.normalize():f} % · {mc.ref}"
            )
            _marquer_verse(cg, verse)
    return montant


def _marquer_verse(cg: CreditCagnotte, verse: int) -> None:
    cg.reste -= verse
    if cg.reste == 0:
        cg.etat, cg.versee_le = CreditCagnotte.Etat.VERSEE, timezone.now()
    cg.save(update_fields=["reste", "etat", "versee_le"])


def verser_cagnotte(user) -> int:
    """verserCagnotte : la cagnotte disponible (non expirée) va au portefeuille, ou par Mobile Money au numéro par
    défaut si FF-WALLET est fermé. Rend le montant versé (0 : rien à verser)."""
    maintenant = timezone.now()
    CreditCagnotte.objects.filter(client=user, etat=CreditCagnotte.Etat.DISPONIBLE, expire_le__lt=maintenant).update(
        etat=CreditCagnotte.Etat.EXPIREE
    )
    with transaction.atomic():
        lignes = list(CreditCagnotte.objects.select_for_update().filter(client=user, etat=CreditCagnotte.Etat.DISPONIBLE, reste__gt=0))
        total = sum(x.reste for x in lignes)
        if not total:
            return 0
        if ouvert("FF-WALLET"):
            verse = 0
            for cg in lignes:
                v = wallet.crediter_cagnotte_portefeuille(user, cg.reste, f"CAG-BLV-{cg.order_id}", f"Cagnotte · BLV-{cg.order_id}")
                _marquer_verse(cg, v)
                verse += v
            return verse
        defaut = next((x for x in wallet.liste_moyens(user) if x["parDefaut"]), None)
        if defaut is None:
            raise refus("aucun_numero", "Ajoute un numéro Mobile Money pour recevoir ta cagnotte.")
        m = wallet.moyen_momo(user, defaut["id"])
        res = mobile_money().verser(montant_xaf=total, numero=m.numero, reference=_reference("CAGV"))
        if res.statut == "refuse":
            raise refus("versement_refuse", "L'opérateur a refusé le versement. Réessaie plus tard.", {"motif": res.motif})
        for cg in lignes:
            _marquer_verse(cg, cg.reste)
    return total


# ── Parrainage (ABO-PARRAIN) ────────────────────────────────────────────────────────────────────────────────


def code_parrainage(user) -> str:
    obj = CodeParrainage.objects.filter(client=user).first()
    while obj is None:
        code = secrets.token_hex(3).upper()
        if not CodeParrainage.objects.filter(code=code).exists():
            obj = CodeParrainage.objects.create(client=user, code=code)
    return obj.code


def enregistrer_filleul(code: str, filleul) -> Parrainage | None:
    """À l'inscription par un lien de parrainage ; jamais soi-même, une seule fois par filleul."""
    cp = CodeParrainage.objects.filter(code=str(code).strip().upper()).first()
    if cp is None or cp.client_id == filleul.pk or Parrainage.objects.filter(filleul=filleul).exists():
        return None
    return Parrainage.objects.create(parrain=cp.client, filleul=filleul)


def filleul_a_retire(filleul) -> bool:
    """Première commande payée et retirée du filleul : 1 mois offert au parrain (selon son palier), ABO-PARRAIN par
    mois au plus ; le mois repousse le prochain prélèvement (ou la fin d'un abonnement offert)."""
    r = regles_en_vigueur()
    maintenant = timezone.now()
    with transaction.atomic():
        p = Parrainage.objects.select_for_update().filter(filleul=filleul, retiree_le__isnull=True).first()
        if p is None:
            return False
        p.retiree_le = maintenant
        deja = Parrainage.objects.filter(parrain=p.parrain, recompense_le__gte=_debut_mois(maintenant)).count()
        a = courant(p.parrain)
        if deja < r.parrainages_par_mois and est_actif(r, a, maintenant) and a.palier != "pass":
            mois = r.palier(a.palier).parrainage
            p.recompense_le, p.mois_offerts = maintenant, mois
            jours = timedelta(days=30 * mois)
            if a.prochain:
                a.prochain += jours
            elif a.fin:
                a.fin += jours
            a.save(update_fields=["prochain", "fin"])
        p.save(update_fields=["retiree_le", "recompense_le", "mois_offerts"])
    return p.recompense_le is not None


def _parrainage(user, maintenant) -> dict:
    filleuls = list(Parrainage.objects.filter(parrain=user).select_related("filleul").order_by("-inscrit_le"))
    debut = _debut_mois(maintenant)
    hote = getattr(settings, "BELIVAY_LIEN_PARRAINAGE", "belivay.com/p/")
    return {
        "lien": f"{hote}{code_parrainage(user)}",
        "filleuls": [
            {"prenom": f.filleul.first_name, "le": ms(f.inscrit_le), "etat": "retiree" if f.retiree_le else "inscrit"} for f in filleuls
        ],
        "recompensesMois": sum(1 for f in filleuls if f.recompense_le and f.recompense_le >= debut),
        "moisGagnes": sum(f.mois_offerts for f in filleuls),
    }


def _business(user) -> str:
    """État de la demande Business (route demanderBusiness, autre application) : accroche, « aucune » par défaut."""
    for module in ("apps.client_accounts.services", "apps.extras.services"):
        try:
            mod = __import__(module, fromlist=["etat_demande_business"])
        except ImportError:
            continue
        f = getattr(mod, "etat_demande_business", None)
        if callable(f):
            return f(user)
    return "aucune"


# ── DonneesPrime ────────────────────────────────────────────────────────────────────────────────────────────


def prime(user) -> dict:
    r = regles_en_vigueur()
    maintenant = timezone.now()
    a = courant(user)
    depuis = _payees(user).filter(payee_le__gte=a.debut, prime__gt=0) if a else MontantsCommande.objects.none()
    relais = depuis.filter(mode=MontantsCommande.Mode.RELAIS)
    domicile = depuis.filter(mode=MontantsCommande.Mode.DOMICILE)
    u = usage(user, maintenant)
    cagnottes = CreditCagnotte.objects.filter(client=user)
    return {
        "abonnement": abonnement_json(a) if a else None,
        "actif": est_actif(r, a, maintenant),
        "essaiUtilise": EssaiUtilise.objects.filter(client=user).exists(),
        "usage": {"relais": u.relais, "domicile": u.domicile, "total": u.total},
        "economies": {
            "relais": relais.aggregate(s=Sum("prime"))["s"] or 0,
            "domicile": domicile.aggregate(s=Sum("prime"))["s"] or 0,
            "nbRelais": relais.count(),
            "nbDomicile": domicile.count(),
        },
        "cagnotte": {
            "disponible": cagnottes.filter(etat=CreditCagnotte.Etat.DISPONIBLE, expire_le__gte=maintenant).aggregate(s=Sum("reste"))["s"]
            or 0,
            "versee": sum(x.montant - x.reste for x in cagnottes),
            "attente": _attente(user, r),
        },
        "parrainage": _parrainage(user, maintenant),
        "business": _business(user),
        "maintenant": ms(maintenant),
    }
