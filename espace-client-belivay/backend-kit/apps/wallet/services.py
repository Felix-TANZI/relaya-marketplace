# backend/apps/wallet/services.py
# Logique de l'argent du client : moyens Mobile Money, cartes, portefeuille. Les vues ne font que lire la requête
# et appeler ces fonctions ; les autres applications du kit les appellent aussi :
#
#   solde(user) -> int                                       solde du portefeuille (menu, compte, suppression CWL-11)
#   crediter_remboursement(user, montant, paye_par_carte, reference=, libelle=)
#       -> {"au_portefeuille": n, "vers_le_moyen_d_origine": m}   REMB-DESTINATION (DP-06, DP-17, CWL-05, CWL-06) :
#          FF-WALLET fermé ou payé par carte → tout vers le moyen d'origine (à verser par l'appelant) ; sinon au
#          portefeuille, l'excédent au-delà de WALLET-PLAFOND vers le moyen d'origine.
#   crediter_cagnotte_portefeuille(user, montant, reference, libelle) -> int    cagnotte de l'abonnement (sans frais)
#   payer_par_solde(user, montant, reference) -> {...}       paiement d'une commande par le solde (CWL-04, DP-48)
#   moyens(user) -> [{"operateur", "parDefaut"}]             résumé pour le compte
#   liste_moyens(user) -> [MoyenPaiement du site]            numéro du compte d'abord
#   carte_par_defaut(user) -> Moyen | None                    carte par défaut (attribut jeton) pour le paiement
#   resoudre_moyen(user, texte) -> Moyen                     « compte », « m12 », « c3 », ou le libellé affiché
#   confirmer_recharge(reference, reussi=True)               à appeler par le webhook de l'agrégateur (voir plus bas)
#   numero_change(user, ancien, nouveau)                     appelé par client_accounts (CIN-43, WALLET-NUMERO-ATTENTE)
#   confirmer_retrait(reference, reussi=True)                versement confirmé ou refusé par l'agrégateur
#
# Calculs : TOUJOURS belivay_moteurs.portefeuille (recharger, retirer, payer, crediter_remboursement), avec les
# paramètres du registre (parametres.portefeuille(), parametres.paiement()). Le Portefeuille du moteur est reconstruit
# à chaque opération depuis la base (_construire), sous verrou (select_for_update) pour les écritures.
#
# WEBHOOK (relaya-marketplace) : la recharge est créditée seulement quand l'agrégateur confirme (CWL-03). Chez relaya,
# apps/payments/webhooks/receiver.py, process() : quand aucune PaymentAttempt ne correspond (branche « IGNORED »),
# appeler d'abord
#     from apps.wallet.services import confirmer_recharge, confirmer_retrait
#     confirmer_recharge(event.external_reference or event.provider_reference, reussi=etat.status == SUCCESSFUL)
# (et confirmer_retrait pour un versement) ; ne marquer l'événement « ignoré » que si les deux rendent None.
# À BRANCHER (décision D9, avec MobileMoneyRelaya dans prestataires.py).

import logging
import secrets
from dataclasses import dataclass, replace
from datetime import timedelta

from django.apps import apps as django_apps
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from apps.client_core import parametres
from apps.client_core.chiffrement import chiffrer, dechiffrer, empreinte
from apps.client_core.erreurs import conflit, introuvable, refus
from apps.client_core.interrupteurs import ouvert
from apps.client_core.masquage import masquer_numero, numero_local, operateur
from apps.client_core.temps import YAOUNDE, ms
from belivay_moteurs import portefeuille as moteur
from belivay_moteurs.argent import ecrire

from . import compte
from .models import CarteEnregistree, EtatPortefeuille, Mouvement, MoyenPaiement, Recharge, Retrait
from .prestataires import carte, mobile_money

logger = logging.getLogger("apps.wallet")

NOMS = {"MTN": "MTN MoMo", "Orange": "Orange Money"}
OPERATEURS_ACCEPTES = ("MTN", "Orange")
REFUS = {
    moteur.Refus.MINIMUM: "minimum",
    moteur.Refus.PLAFOND: "plafond",
    moteur.Refus.SOLDE: "solde",
    moteur.Refus.ATTENTE_RECHARGE: "attente_recharge",
    moteur.Refus.ATTENTE_NUMERO: "attente_numero",
    moteur.Refus.PLAFOND_DU_JOUR: "plafond_jour",
}
HISTORIQUE_MAX = 100  # lignes d'historique rendues par GET /me/wallet (les plus récentes)


def _reference(prefixe: str) -> str:
    return f"{prefixe}-{secrets.token_hex(6).upper()}"


# ── Moyens Mobile Money ─────────────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Moyen:
    """Un moyen de paiement résolu (jamais renvoyé tel quel au site : il contient le numéro en clair)."""

    ident: str  # « compte », « m12 », « c3 »
    type: str  # « momo » | « carte »
    libelle: str  # « MTN MoMo · 6 77 ·· ·· 41 » | « Visa •••• 4242 »
    operateur: str = ""
    numero: str = ""
    numero_masque: str = ""
    jeton: str = ""


def _verifies(user):
    return MoyenPaiement.objects.filter(client=user, verifie_le__isnull=False)


def liste_moyens(user) -> list[dict]:
    """MoyenPaiement[] du site : le numéro du compte d'abord (il ne se retire pas), puis les autres vérifiés."""
    num = compte.numero_du_compte(user)
    op = operateur(num) if num else None
    autres = list(_verifies(user))
    defaut_autre = next((m for m in autres if m.par_defaut), None)
    lignes = []
    if op in OPERATEURS_ACCEPTES:
        lignes.append(
            {"id": "compte", "operateur": op, "numeroMasque": masquer_numero(num), "duCompte": True, "parDefaut": defaut_autre is None}
        )
    for m in autres:
        lignes.append(
            {"id": m.ident, "operateur": m.operateur, "numeroMasque": m.numero_masque, "duCompte": False, "parDefaut": m is defaut_autre}
        )
    if lignes and not any(x["parDefaut"] for x in lignes):
        lignes[0]["parDefaut"] = True
    return lignes


def moyens(user) -> list[dict]:
    """Résumé pour le compte (DonneesCompte) : opérateur et défaut de chaque moyen Mobile Money."""
    return [{"operateur": x["operateur"], "parDefaut": x["parDefaut"]} for x in liste_moyens(user)]


def _moyen_par_ident(user, ident: str) -> MoyenPaiement | None:
    ident = str(ident or "").strip()
    pk = ident[1:] if ident.startswith("m") else ident
    if not pk.isdigit():
        return None
    return MoyenPaiement.objects.filter(client=user, pk=int(pk)).first()


def moyen_momo(user, texte: str) -> Moyen:
    """Un numéro Mobile Money vérifié du client : « compte », « m12 » ou le libellé affiché ; 422 moyen_inconnu."""
    texte = str(texte or "").strip()
    num = compte.numero_du_compte(user)
    op = operateur(num) if num else None
    if num and op in OPERATEURS_ACCEPTES and (texte == "compte" or masquer_numero(num) in texte):
        return Moyen("compte", "momo", f"{NOMS[op]} · {masquer_numero(num)}", op, num, masquer_numero(num))
    m = _moyen_par_ident(user, texte)
    if m is None:
        m = next((x for x in _verifies(user) if x.numero_masque in texte), None)
    if m is None or m.verifie_le is None:
        raise refus("moyen_inconnu", "Ce moyen de paiement n'est pas sur ton compte.")
    return Moyen(m.ident, "momo", f"{NOMS[m.operateur]} · {m.numero_masque}", m.operateur, dechiffrer(m.numero_chiffre), m.numero_masque)


def resoudre_moyen(user, texte: str) -> Moyen:
    """Mobile Money ou carte enregistrée : « compte », « m12 », « c3 », « MTN MoMo · 6 77 ·· ·· 41 », « Visa •••• 4242 »."""
    texte = str(texte or "").strip()
    c = _carte_par_ident(user, texte)
    if c is None and "••••" in texte:
        c = next((x for x in CarteEnregistree.objects.filter(client=user) if texte.endswith(x.derniers) and x.marque in texte), None)
    if c is not None:
        return Moyen(c.ident, "carte", f"{c.marque} •••• {c.derniers}", jeton=dechiffrer(c.jeton_chiffre))
    return moyen_momo(user, texte)


def ajouter_moyen(user, numero: str) -> dict:
    """Contrôle puis envoi du code (objet « moyen ») → {ok: true, envoi: EnvoiCode} ; 409 deja ; MTN ou Orange seulement (CCO-14)."""
    from apps.otp.services import envoyer

    local = numero_local(numero)
    op = operateur(local)
    if op is None:
        raise refus("numero_invalide", "Ce numéro n'est pas un numéro mobile camerounais.")
    if op not in OPERATEURS_ACCEPTES:
        raise refus("operateur_non_accepte", "Seuls MTN MoMo et Orange Money sont acceptés.", {"operateur": op})
    if local == compte.numero_du_compte(user) or _verifies(user).filter(numero_empreinte=empreinte(local)).exists():
        raise conflit("deja", "Ce numéro est déjà dans tes moyens de paiement.")
    MoyenPaiement.objects.update_or_create(
        client=user,
        numero_empreinte=empreinte(local),
        defaults={"operateur": op, "numero_chiffre": chiffrer(local), "numero_masque": masquer_numero(local), "verifie_le": None},
    )
    # Le code part avec la réponse (un seul envoi) : le site affiche l'EnvoiCode rendu (destination masquée, validité,
    # délai avant « Renvoyer le code ») et n'appelle pas POST /api/auth/otp/send après.
    envoi = envoyer(objet="moyen", destination=local, utilisateur=user)
    return {"ok": True, "envoi": envoi}


def confirmer_moyen(user, ident_ou_numero: str, code: str) -> dict:
    """ResultatCode du site. Le site désigne le moyen par le numéro saisi (confirmerMoyen(numero, code)) ; « m12 » accepté."""
    from apps.otp.services import verifier

    m = None
    local = numero_local(ident_ou_numero)
    if len(local) == 9:
        m = MoyenPaiement.objects.filter(client=user, numero_empreinte=empreinte(local)).first()
    if m is None:
        m = _moyen_par_ident(user, ident_ou_numero)
    if m is None:
        raise introuvable()
    if m.verifie_le is not None:
        return {"ok": True, "client": compte.client(user)}
    r = verifier(objet="moyen", code=code, destination=dechiffrer(m.numero_chiffre), utilisateur=user)
    if not r.get("ok"):
        return r
    m.verifie_le = timezone.now()
    m.par_defaut = not liste_moyens(user)  # premier moyen du compte (aucun numéro de compte MTN ou Orange)
    m.save(update_fields=["verifie_le", "par_defaut"])
    return {"ok": True, "client": compte.client(user)}


def moyen_par_defaut(user, ident: str) -> None:
    with transaction.atomic():
        if ident == "compte":
            if not compte.numero_du_compte(user):
                raise introuvable()
            _verifies(user).update(par_defaut=False)
            return
        m = _moyen_par_ident(user, ident)
        if m is None or m.verifie_le is None:
            raise introuvable()
        _verifies(user).exclude(pk=m.pk).update(par_defaut=False)
        m.par_defaut = True
        m.save(update_fields=["par_defaut"])


def retirer_moyen(user, ident: str) -> None:
    """Le numéro du compte ne se retire pas (il se change) ; retiré, le défaut revient au numéro du compte."""
    if ident == "compte":
        raise conflit("numero_du_compte", "Le numéro du compte ne se retire pas : il se change dans Sécurité.")
    m = _moyen_par_ident(user, ident)
    if m is None:
        raise introuvable()
    m.delete()


def numero_change(user, ancien: str | None, nouveau: str) -> None:
    """Appelé par client_accounts après un changement du numéro du compte (CIN-39 à CIN-43) : les retraits attendent
    WALLET-NUMERO-ATTENTE ; l'ancien numéro reste un moyen de paiement vérifié (CIN-43) ; le nouveau quitte la liste
    des autres numéros (il est désormais celui du compte)."""
    maintenant = timezone.now()
    etat = _etat(user)
    etat.numero_change_le = maintenant
    etat.save(update_fields=["numero_change_le", "modifie_le"])
    MoyenPaiement.objects.filter(client=user, numero_empreinte=empreinte(numero_local(nouveau))).delete()
    local = numero_local(ancien or "")
    op = operateur(local) if local else None
    if op in OPERATEURS_ACCEPTES and local != numero_local(nouveau):
        MoyenPaiement.objects.update_or_create(
            client=user,
            numero_empreinte=empreinte(local),
            defaults={"operateur": op, "numero_chiffre": chiffrer(local), "numero_masque": masquer_numero(local), "verifie_le": maintenant},
        )


# ── Cartes (CAP-24 : jamais le numéro) ──────────────────────────────────────────────────────────────────────


def _carte_json(c: CarteEnregistree) -> dict:
    return {
        "id": c.ident,
        "marque": c.marque,
        "derniers": c.derniers,
        "expire": c.expire,
        "titulaire": c.titulaire,
        "parDefaut": c.par_defaut,
    }


def _carte_par_ident(user, ident: str) -> CarteEnregistree | None:
    ident = str(ident or "").strip()
    if not (ident.startswith("c") and ident[1:].isdigit()):
        return None
    return CarteEnregistree.objects.filter(client=user, pk=int(ident[1:])).first()


def liste_cartes(user) -> list[dict]:
    return [_carte_json(c) for c in CarteEnregistree.objects.filter(client=user)]


def ajouter_carte(user, jeton: str, titulaire: str = "") -> dict:
    """Le prestataire échange le jeton du champ sécurisé contre une carte enregistrée ; 409 deja."""
    titulaire = (titulaire or "").strip() or f"{user.first_name} {user.last_name}".strip()
    e = carte().enregistrer(jeton, titulaire)
    if e.marque not in CarteEnregistree.Marque.values:
        raise refus("marque_refusee", "Visa ou Mastercard seulement.")
    with transaction.atomic():
        if CarteEnregistree.objects.filter(client=user, marque=e.marque, derniers=e.derniers, expire=e.expire).exists():
            raise conflit("deja", "Cette carte est déjà enregistrée.")
        premiere = not CarteEnregistree.objects.filter(client=user).exists()
        try:
            c = CarteEnregistree.objects.create(
                client=user,
                jeton_chiffre=chiffrer(e.jeton),
                marque=e.marque,
                derniers=e.derniers,
                expire=e.expire,
                titulaire=titulaire,
                pays=e.pays or "",
                par_defaut=premiere,
            )
        except IntegrityError:
            raise conflit("deja", "Cette carte est déjà enregistrée.") from None
    return {"ok": True, "carte": _carte_json(c)}


def retirer_carte(user, ident: str) -> None:
    with transaction.atomic():
        c = _carte_par_ident(user, ident)
        if c is None:
            raise introuvable()
        etait_defaut = c.par_defaut
        c.delete()
        if etait_defaut:
            suivante = CarteEnregistree.objects.filter(client=user).first()
            if suivante is not None:
                suivante.par_defaut = True
                suivante.save(update_fields=["par_defaut"])


def carte_par_defaut(user) -> Moyen | None:
    """La carte par défaut du client (paiement d'une commande) : Moyen avec `jeton` (prestataire), ou None."""
    c = CarteEnregistree.objects.filter(client=user).order_by("-par_defaut", "cree_le", "pk").first()
    if c is None:
        return None
    return Moyen(c.ident, "carte", f"{c.marque} •••• {c.derniers}", jeton=dechiffrer(c.jeton_chiffre))


def definir_carte_par_defaut(user, ident: str) -> None:
    with transaction.atomic():
        c = _carte_par_ident(user, ident)
        if c is None:
            raise introuvable()
        CarteEnregistree.objects.filter(client=user).exclude(pk=c.pk).update(par_defaut=False)
        c.par_defaut = True
        c.save(update_fields=["par_defaut"])


# ── Portefeuille : reconstruction du moteur depuis la base ──────────────────────────────────────────────────


def _etat(user, verrou: bool = False) -> EtatPortefeuille:
    EtatPortefeuille.objects.get_or_create(client=user)
    qs = EtatPortefeuille.objects.select_for_update() if verrou else EtatPortefeuille.objects
    return qs.get(client=user)


def _construire(user, verrou: bool = False):
    """(moteur.Portefeuille, EtatPortefeuille, {instant: Recharge}) ; les instants sont rendus uniques (+1 µs) pour
    retrouver chaque ligne après le calcul du moteur."""
    etat = _etat(user, verrou)
    qs = Recharge.objects.filter(client=user, etat=Recharge.Etat.CONFIRMEE, restant__gt=0).order_by("confirmee_le", "pk")
    if verrou:
        qs = qs.select_for_update()
    par_le: dict = {}
    recharges = []
    dernier = None
    for r in qs:
        le = r.confirmee_le
        if dernier is not None and le <= dernier:
            le = dernier + timedelta(microseconds=1)
        dernier = le
        par_le[le] = r
        recharges.append(moteur.Recharge(le, r.restant, r.a_servi))
    depuis = timezone.now() - timedelta(days=62)  # mois civil en cours et jour en cours : assez large
    retraits = tuple(
        moteur.RetraitFait(x.le, x.montant, x.part_rechargee)
        for x in Retrait.objects.filter(client=user, le__gte=depuis).exclude(etat=Retrait.Etat.ECHEC)
    )
    pf = moteur.Portefeuille(tuple(recharges), etat.rembourse, retraits, compte.numero_change_le(user))
    return pf, etat, par_le


def _appliquer(etat: EtatPortefeuille, par_le: dict, nouveau: moteur.Portefeuille) -> list[dict]:
    """Écrit l'état rendu par le moteur ; rend ce qui a été pris à chaque recharge."""
    restes = {r.le: r for r in nouveau.recharges}
    prises = []
    for le, ligne in par_le.items():
        n = restes.get(le)
        reste = n.restant if n is not None else 0
        a_servi = n.a_servi if n is not None else ligne.a_servi
        if reste != ligne.restant or a_servi != ligne.a_servi:
            if ligne.restant > reste:
                prises.append({"recharge": ligne.pk, "prise": ligne.restant - reste})
            ligne.restant, ligne.a_servi = reste, a_servi
            ligne.save(update_fields=["restant", "a_servi"])
    etat.rembourse = nouveau.rembourse
    etat.save(update_fields=["rembourse", "modifie_le"])
    return prises


def solde(user) -> int:
    rembourse = EtatPortefeuille.objects.filter(client=user).values_list("rembourse", flat=True).first() or 0
    recharges = Recharge.objects.filter(client=user, etat=Recharge.Etat.CONFIRMEE).aggregate(s=Sum("restant"))["s"] or 0
    return rembourse + recharges


def _cagnotte_en_attente(user) -> int:
    if not django_apps.is_installed("apps.subscriptions"):
        return 0
    from apps.subscriptions.services import cagnotte_en_attente

    return cagnotte_en_attente(user)


def _mois(d):
    d = d.astimezone(YAOUNDE)
    return (d.year, d.month)


def _jour(d):
    return d.astimezone(YAOUNDE).date()


def _nombre(x):
    """Decimal du registre → nombre JSON (1 → 1, 1,5 → 1.5)."""
    return int(x) if x == int(x) else float(x)


def donnees_portefeuille(user) -> dict:
    """DonneesPortefeuille du site."""
    p = parametres.portefeuille()
    maintenant = timezone.now()
    pf, _, par_le = _construire(user)
    attente = timedelta(hours=p.recharge_attente_heures)
    en_attente = [le + attente for le, r in par_le.items() if not r.a_servi and maintenant < le + attente]
    retraits = [r for r in pf.retraits]
    historique = [
        {"id": f"h{m.pk}", "type": m.type, "libelle": m.libelle, "le": ms(m.le), "montant": m.montant}
        for m in Mouvement.objects.filter(client=user)[:HISTORIQUE_MAX]
    ]
    return {
        "solde": pf.solde,
        "cagnotteEnAttente": _cagnotte_en_attente(user),
        "retirable": moteur.retirable(pf, maintenant, p),
        "disponibleLe": ms(min(en_attente)) if en_attente else None,
        "historique": historique,
        "moyens": liste_moyens(user),
        "regles": {
            "plafond": p.plafond,
            "rechargeMin": p.recharge_min,
            "retraitMin": p.retrait_min,
            "retraitJour": p.retrait_jour,
            "versementHeures": p.retrait_heures,
        },
        "rembourse": min(pf.rembourse, pf.solde),
        "retraitsGratuits": max(
            p.retraits_gratuits_par_mois - sum(1 for r in retraits if r.part_rechargee > 0 and _mois(r.le) == _mois(maintenant)), 0
        ),
        "retireAujourdhui": sum(r.montant for r in retraits if _jour(r.le) == _jour(maintenant)),
        "frais": {
            "gratuitsParMois": p.retraits_gratuits_par_mois,
            "pourCent": _nombre(p.retrait_frais_pour_cent),
            "minimum": p.retrait_frais_min,
            "attenteRechargeH": p.recharge_attente_heures,
            "attenteNumeroH": p.numero_attente_heures,
        },
    }


# ── Recharge (CWL-02, CWL-03) ───────────────────────────────────────────────────────────────────────────────


def recharger(user, montant: int, ident: str) -> dict:
    """ResultatPortefeuille. La demande part vers le téléphone ; le crédit arrive à la confirmation de l'agrégateur
    (confirmer_recharge). Les demandes encore ouvertes (PAY-TVAL) comptent déjà sous le plafond."""
    p = parametres.portefeuille()
    m = moyen_momo(user, ident)
    maintenant = timezone.now()
    with transaction.atomic():
        pf, _, _ = _construire(user, verrou=True)
        ouvertes = (
            Recharge.objects.filter(
                client=user, etat=Recharge.Etat.ATTENTE, demandee_le__gte=maintenant - timedelta(minutes=parametres.entier("PAY-TVAL"))
            ).aggregate(s=Sum("montant"))["s"]
            or 0
        )
        r = moteur.recharger(replace(pf, rembourse=pf.rembourse + ouvertes), montant, maintenant, p)
        if not r.accepte:
            possible = p.recharge_min if r.refus is moteur.Refus.MINIMUM else r.encore_possible
            return {"ok": False, "refus": REFUS[r.refus], "possible": possible}
        rch = Recharge.objects.create(
            client=user,
            montant=montant,
            reference=_reference("RCH"),
            operateur=m.operateur,
            numero_chiffre=chiffrer(m.numero),
            numero_masque=m.numero_masque,
            demandee_le=maintenant,
        )
    res = mobile_money().demander(montant_xaf=montant, numero=m.numero, reference=rch.reference, motif="Recharge du portefeuille BelivaY")
    if res.statut == "refuse":
        Recharge.objects.filter(pk=rch.pk).update(etat=Recharge.Etat.ECHEC)
        raise refus("paiement_refuse", "L'opérateur a refusé la demande. Réessaie ou choisis un autre numéro.", {"motif": res.motif})
    if res.statut == "reussi":  # agrégateur qui confirme tout de suite
        confirmer_recharge(rch.reference)
    return {"ok": True, "solde": solde(user), "montant": montant, "frais": 0}


def confirmer_recharge(reference: str, reussi: bool = True) -> Recharge | None:
    """Appelé par le webhook (CWL-03). Idempotent. None : la référence n'est pas une recharge du portefeuille.
    Si les règles refusent au moment du crédit (plafond atteint entre-temps), l'argent est rendu au numéro."""
    p = parametres.portefeuille()
    rendre = None
    with transaction.atomic():
        rch = Recharge.objects.select_for_update().filter(reference=reference).first()
        if rch is None or rch.etat != Recharge.Etat.ATTENTE:
            return rch
        if not reussi:
            rch.etat = Recharge.Etat.ECHEC
            rch.save(update_fields=["etat"])
            return rch
        maintenant = timezone.now()
        pf, _, _ = _construire(rch.client, verrou=True)
        r = moteur.recharger(pf, rch.montant, maintenant, p)
        if r.accepte:
            rch.etat, rch.restant, rch.confirmee_le = Recharge.Etat.CONFIRMEE, rch.montant, maintenant
            rch.save(update_fields=["etat", "restant", "confirmee_le"])
            Mouvement.objects.create(
                client=rch.client,
                type=Mouvement.Type.RECHARGE,
                montant=rch.montant,
                libelle=f"Recharge {NOMS[rch.operateur]}",
                reference=rch.reference,
                le=maintenant,
            )
        else:
            rch.etat = Recharge.Etat.RENDUE
            rch.save(update_fields=["etat"])
            rendre = rch
    if rendre is not None:
        logger.warning("Recharge %s encaissée mais refusée (%s) : rendue au numéro", reference, r.refus)
        mobile_money().verser(montant_xaf=rendre.montant, numero=dechiffrer(rendre.numero_chiffre), reference=f"{reference}-R")
    return rch


# ── Retrait (CWL-07, CWL-08, DP-48) ─────────────────────────────────────────────────────────────────────────


def _possible_retrait(r: moteur.Retrait, pf: moteur.Portefeuille, maintenant, p) -> int:
    if r.refus is moteur.Refus.MINIMUM:
        return p.retrait_min
    if r.refus is moteur.Refus.SOLDE:
        return pf.solde
    if r.refus is moteur.Refus.ATTENTE_NUMERO:
        return 0
    if r.refus is moteur.Refus.ATTENTE_RECHARGE:
        return r.retirable
    du_jour = sum(x.montant for x in pf.retraits if _jour(x.le) == _jour(maintenant))
    return max(p.retrait_jour - du_jour, 0)


def frais_retrait(user, montant: int) -> int:
    """Frais du retrait de `montant` maintenant (simulation du moteur, rien n'est écrit) ; 0 s'il serait refusé."""
    if montant <= 0:
        return 0
    pf, _, _ = _construire(user)
    r = moteur.retirer(pf, montant, timezone.now(), parametres.portefeuille(), parametres.paiement())
    return r.frais if r.accepte else 0


def retirer(user, montant: int, ident: str) -> dict:
    """ResultatPortefeuille. Débit tout de suite ; versé par l'agrégateur, frais retenus sur le montant versé."""
    p, pp = parametres.portefeuille(), parametres.paiement()
    m = moyen_momo(user, ident)
    maintenant = timezone.now()
    with transaction.atomic():
        pf, etat, par_le = _construire(user, verrou=True)
        r = moteur.retirer(pf, montant, maintenant, p, pp)
        if not r.accepte:
            return {"ok": False, "refus": REFUS[r.refus], "possible": _possible_retrait(r, pf, maintenant, p)}
        part_remboursee = pf.rembourse - r.portefeuille.rembourse
        prises = _appliquer(etat, par_le, r.portefeuille)
        ret = Retrait.objects.create(
            client=user,
            montant=montant,
            part_rechargee=montant - part_remboursee,
            part_remboursee=part_remboursee,
            frais=r.frais,
            prises=prises,
            reference=_reference("RET"),
            operateur=m.operateur,
            numero_chiffre=chiffrer(m.numero),
            numero_masque=m.numero_masque,
            le=maintenant,
            verse_au_plus_tard=r.verse_au_plus_tard,
        )
        libelle = f"Retrait vers {NOMS[m.operateur]}" + (f" · frais {ecrire(r.frais)}" if r.frais else "")
        Mouvement.objects.create(
            client=user, type=Mouvement.Type.RETRAIT, montant=-montant, libelle=libelle, reference=ret.reference, le=maintenant
        )
    res = mobile_money().verser(montant_xaf=montant - r.frais, numero=m.numero, reference=ret.reference)
    if res.statut == "reussi":
        confirmer_retrait(ret.reference, True)
    elif res.statut == "refuse":
        confirmer_retrait(ret.reference, False)
        raise refus(
            "versement_refuse", "L'opérateur a refusé le versement : l'argent est resté dans ton portefeuille.", {"motif": res.motif}
        )
    return {"ok": True, "solde": solde(user), "montant": montant, "frais": r.frais}


def confirmer_retrait(reference: str, reussi: bool = True) -> Retrait | None:
    """Versement confirmé, ou refusé : l'argent revient exactement d'où il a été pris (recharges, part remboursée)."""
    with transaction.atomic():
        ret = Retrait.objects.select_for_update().filter(reference=reference).first()
        if ret is None or ret.etat != Retrait.Etat.EN_COURS:
            return ret
        if reussi:
            ret.etat, ret.verse_le = Retrait.Etat.VERSE, timezone.now()
            ret.save(update_fields=["etat", "verse_le"])
            return ret
        etat = _etat(ret.client, verrou=True)
        for x in ret.prises:
            rch = Recharge.objects.select_for_update().get(pk=x["recharge"])
            rch.restant += int(x["prise"])
            rch.save(update_fields=["restant"])
        etat.rembourse += ret.part_remboursee
        etat.save(update_fields=["rembourse", "modifie_le"])
        ret.etat = Retrait.Etat.ECHEC
        ret.save(update_fields=["etat"])
        Mouvement.objects.create(
            client=ret.client,
            type=Mouvement.Type.RETRAIT,
            montant=ret.montant,
            libelle="Retrait non versé : rendu au portefeuille",
            reference=f"{reference}-R",
        )
    return ret


# ── Crédits et paiements venus des autres applications ──────────────────────────────────────────────────────


def _crediter(user, montant: int, type_: str, reference: str, libelle: str, paye_par_carte: bool, toujours_ouvert: bool) -> dict:
    if reference:
        deja = Mouvement.objects.filter(client=user, type=type_, reference=reference).first()
        if deja is not None:
            return {"au_portefeuille": deja.montant, "vers_le_moyen_d_origine": montant - deja.montant}
    p = parametres.portefeuille()
    with transaction.atomic():
        pf, etat, _ = _construire(user, verrou=True)
        c = moteur.crediter_remboursement(pf, montant, toujours_ouvert or ouvert("FF-WALLET"), paye_par_carte, p)
        if c.au_portefeuille:
            etat.rembourse = c.portefeuille.rembourse
            etat.save(update_fields=["rembourse", "modifie_le"])
            Mouvement.objects.create(client=user, type=type_, montant=c.au_portefeuille, libelle=libelle, reference=reference)
    return {"au_portefeuille": c.au_portefeuille, "vers_le_moyen_d_origine": c.vers_le_moyen_d_origine}


def crediter_remboursement(user, montant: int, paye_par_carte: bool, reference: str = "", libelle: str = "") -> dict:
    """REMB-DESTINATION : ce qui va au portefeuille y est crédité ici ; le reste (FF-WALLET fermé, carte, au-delà du
    plafond) est rendu à l'appelant, qui le verse vers le moyen d'origine (REMB-MOMO-H). Idempotent par référence."""
    return _crediter(
        user,
        montant,
        Mouvement.Type.REMBOURSEMENT,
        reference,
        libelle or f"Remboursement · {reference}".rstrip(" ·"),
        paye_par_carte,
        False,
    )


def crediter_cagnotte_portefeuille(user, montant: int, reference: str, libelle: str) -> int:
    """Cagnotte de l'abonnement versée au portefeuille (comme un remboursement : retirée sans frais), sous le plafond."""
    return _crediter(user, montant, Mouvement.Type.CAGNOTTE, reference, libelle, False, False)["au_portefeuille"]


def payer_par_solde(user, montant: int, reference: str) -> dict:
    """Paiement d'une commande (CWL-04) : le solde paie ce qu'il peut, le reste en Mobile Money ; biométrie dès CODE-BIO.
    → {"par_le_solde", "complement_mobile_money", "biometrie"}."""
    with transaction.atomic():
        pf, etat, par_le = _construire(user, verrou=True)
        r = moteur.payer(pf, montant, parametres.paiement())
        if r.par_le_solde:
            _appliquer(etat, par_le, r.portefeuille)
            Mouvement.objects.create(
                client=user, type=Mouvement.Type.PAIEMENT, montant=-r.par_le_solde, libelle=f"Paiement · {reference}", reference=reference
            )
    return {"par_le_solde": r.par_le_solde, "complement_mobile_money": r.complement_mobile_money, "biometrie": r.biometrie}


def nombre_factures(user) -> int:
    """Compteur « Factures » du compte : commandes retirées (une facture chacune)."""
    from .factures import retirees

    return retirees(user).count()
