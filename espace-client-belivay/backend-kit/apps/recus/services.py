# backend/apps/recus/services.py
# Boîte « Reçus » (DP-54) : lire (recus, recu), exécuter (offrir, participer, payer, accepter, refuser, retirer),
# remercier, envoyer. Règle commune des échanges (qui paie la livraison, « BelivaY ne perd jamais ») :
# apps.wishlists.regles ; paiements : apps.wishlists.commandes.payer et le portefeuille (apps.wallet) ; cagnottes et
# cotisations : apps.wishlists.services.participer_cagnotte et apps.extras.services.participer (une seule règle).
#
# Refus (site : ResultatRecu) : 409 traite, 410 expire, 422 offert, montant, garantie, solde, moyen, diaspora,
# numero, moi, vide (format CAP-04 ; le site les relit en { ok: false, raison }).

import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status

from apps.client_core import parametres, pont
from apps.client_core.chiffrement import chiffrer, empreinte
from apps.client_core.erreurs import ErreurClient, introuvable
from apps.client_core.masquage import chiffres, masquer_numero
from apps.client_core.temps import depuis_ms, maintenant_ms, ms
from apps.wishlists import commandes
from apps.wishlists import regles as rechanges

from .models import EnvoiRecu

# Groupes du site (source.ts GROUPE_ENVOI) : ce que le destinataire fait d'un envoi.
A_PAYER = ("panier", "lien-paiement", "demande-diaspora", "rentree")
A_ACCEPTER = ("colis", "lien-famille", "abonnement", "panier-famille", "code-retrait", "parrainage", "partage")
AVEC_LIGNES = ("liste", "panier", "lien-paiement", "rentree", "demande-diaspora")
# Délai pour payer un envoi « à payer » sans date limite donnée par l'envoyeur (site : 7 jours).
JOURS_POUR_PAYER = 7
ORDRE = {"a_traiter": 0, "accepte": 1, "fait": 2, "refuse": 3, "expire": 4}
STATUT_REFUS = {"traite": status.HTTP_409_CONFLICT, "expire": status.HTTP_410_GONE}
MESSAGES = {
    "traite": "Cet envoi a déjà été traité.",
    "expire": "Cet envoi a expiré.",
    "offert": "Cet article est déjà offert.",
    "montant": "Ce montant n'est pas possible.",
    "garantie": "La livraison ne peut pas être laissée au destinataire pour ce colis.",
    "solde": "Le solde du portefeuille ne suffit pas.",
    "moyen": "Ce moyen de paiement n'est pas possible ici.",
    "diaspora": "Seul un compte diaspora paie ce panier.",
    "numero": "Numéro ou e-mail invalide.",
    "moi": "Tu ne peux pas t'envoyer ceci à toi-même.",
    "vide": "Rien à envoyer.",
}


def refus_recu(raison: str, data=None) -> ErreurClient:
    return ErreurClient(STATUT_REFUS.get(raison, status.HTTP_422_UNPROCESSABLE_ENTITY), raison, MESSAGES[raison], data)


def _est_diaspora(user) -> bool:
    return bool(commandes.appeler("apps.diaspora.services", "est_diaspora", user, defaut=False))


def _pk(id_) -> int:
    try:
        return int(re.sub(r"^[A-Z]+-", "", str(id_)))
    except ValueError:
        return 0


# ── Lecture ────────────────────────────────────────────────────────────────────────────────────────────


def _a_jour(e: EnvoiRecu) -> EnvoiRecu:
    if e.etat == EnvoiRecu.Etat.A_TRAITER and e.jusqua and e.jusqua < timezone.now():
        e.etat = EnvoiRecu.Etat.EXPIRE
        e.save(update_fields=["etat"])
    return e


def envoi_dict(e: EnvoiRecu) -> dict:
    """EnvoiRecu du site : jamais le numéro, l'e-mail ni l'adresse de l'autre."""
    return {
        "id": str(e.pk),
        "type": e.type,
        "de": e.de_prenom,
        "depuis": e.depuis or None,
        "pour": e.pour_prenom,
        "titre": e.titre,
        "occasion": e.occasion or None,
        "hotes": list(e.hotes or []),
        "date": ms(e.date),
        "lieu": e.lieu or None,
        "mot": e.mot or None,
        "le": ms(e.le),
        "jusqua": ms(e.jusqua),
        "lignes": list(e.lignes or []),
        "frais": e.frais,
        "qui": e.qui or None,
        "objectif": e.objectif,
        "reuni": e.reuni,
        "cagnotte": e.cagnotte,
        "code": e.code or None,
        "ref": e.ref or None,
        "detail": e.detail or None,
        "lien": e.lien,
        "dansLApplication": e.pour_id is not None,
        "etat": e.etat,
        "actions": list(e.actions or []),
        "merci": e.merci,
    }


def boite(user) -> dict:
    recus = sorted(
        (_a_jour(e) for e in EnvoiRecu.objects.filter(pour=user)), key=lambda e: (ORDRE[e.etat], -(e.le.timestamp() if e.le else 0))
    )
    envoyes = [_a_jour(e) for e in EnvoiRecu.objects.filter(de=user)]
    return {
        "recus": [envoi_dict(e) for e in recus],
        "envoyes": [envoi_dict(e) for e in envoyes],
        "aTraiter": sum(1 for e in recus if e.etat == EnvoiRecu.Etat.A_TRAITER),
        "maintenant": maintenant_ms(),
    }


def a_traiter(user) -> int:
    """Badge « Reçus » (session, menu)."""
    return (
        EnvoiRecu.objects.filter(pour=user, etat=EnvoiRecu.Etat.A_TRAITER)
        .filter(Q(jusqua__isnull=True) | Q(jusqua__gt=timezone.now()))
        .count()
    )


def _moyens(user) -> dict:
    diaspora = _est_diaspora(user)
    relais = commandes.relais_habituel(user)
    return {
        "diaspora": diaspora,
        "mobile": [] if diaspora else (commandes.appeler("apps.wallet.services", "liste_moyens", user) or []),
        "cartes": commandes.appeler("apps.wallet.services", "liste_cartes", user) or [],
        "portefeuille": 0 if diaspora else int(commandes.appeler("apps.wallet.services", "solde", user) or 0),
        "relais": relais.nom if relais else None,
        "prenom": user.first_name,
    }


def detail(user, id_) -> dict:
    e = EnvoiRecu.objects.filter(Q(pour=user) | Q(de=user), pk=_pk(id_)).first()
    if e is None:
        raise introuvable("Envoi introuvable.")
    e = _a_jour(e)
    return {
        "envoi": envoi_dict(e),
        "sens": "recu" if e.pour_id == user.pk else "envoye",
        "moyens": _moyens(user),
        "maintenant": maintenant_ms(),
    }


# ── Payer avec les moyens du compte ────────────────────────────────────────────────────────────────────


def _payer(user, moyen: str, montant: int, reference: str, motif: str) -> dict:
    """« wallet », « momo:<id> » (compte, m12), « momo:+<numéro> », « carte:<id> », « apple », « google ».
    Compte diaspora : la carte seulement. Carte : + PAY-CARTE-FRAIS. → {paye, libelle, moyen, redirection, reussi}."""
    diaspora = _est_diaspora(user)
    moyen = str(moyen or "")
    if moyen == "wallet":
        if diaspora:
            raise refus_recu("moyen")
        if int(commandes.appeler("apps.wallet.services", "solde", user) or 0) < montant:
            raise refus_recu("solde")
        commandes.appeler("apps.wallet.services", "payer_par_solde", user, montant, reference)
        return {"paye": montant, "libelle": "Portefeuille BelivaY", "moyen": "wallet", "redirection": None, "reussi": True}
    if moyen.startswith("momo:"):
        if diaspora:
            raise refus_recu("moyen")
        v = moyen[5:]
        numero = chiffres(v)
        if v.startswith("+") or (numero and len(numero) >= 9 and not v.startswith(("m", "c"))):
            numero = numero.removeprefix("237") if len(numero) == 12 else numero
            if not re.fullmatch(r"6\d{8}", numero):
                raise refus_recu("moyen")
            libelle = masquer_numero(numero)
        else:
            try:
                from apps.wallet.services import moyen_momo
            except ImportError:
                raise refus_recu("moyen") from None
            try:
                m = moyen_momo(user, v)
            except ErreurClient:
                raise refus_recu("moyen") from None
            numero, libelle = m.numero, m.libelle
        r = commandes.payer(moyen="mobile", montant=montant, reference=reference, numero=numero, motif=motif)
        return _apres(r, montant, libelle, "mobile")
    jeton, libelle, court = "", "", ""
    if moyen in ("apple", "google"):
        court, libelle = moyen, "Apple Pay" if moyen == "apple" else "Google Pay"
    elif moyen.startswith("carte:"):
        try:
            from apps.wallet.services import resoudre_moyen
        except ImportError:
            raise refus_recu("moyen") from None
        try:
            m = resoudre_moyen(user, moyen[6:])
        except ErreurClient:
            raise refus_recu("moyen") from None
        if m.type != "carte":
            raise refus_recu("moyen")
        court, libelle, jeton = "carte", m.libelle, m.jeton
    else:
        raise refus_recu("moyen")
    total = montant + commandes.service_carte(montant)
    r = commandes.payer(moyen=court, montant=total, reference=reference, jeton=jeton, motif=motif)
    return _apres(r, total, libelle, court)


def _apres(r, paye: int, libelle: str, moyen: str) -> dict:
    if r.statut == "refuse":
        raise ErreurClient(
            status.HTTP_402_PAYMENT_REQUIRED, "paiement_refuse", "Paiement refusé : rien n'a été débité.", {"motif": r.motif}
        )
    return {"paye": paye, "libelle": libelle, "moyen": moyen, "redirection": r.redirection, "reussi": r.statut == "reussi"}


# ── Exécuter un envoi reçu ─────────────────────────────────────────────────────────────────────────────


def _action(user, quoi: str, montant: int = 0, ref: str | None = None, p: str | None = None, mot: str | None = None) -> dict:
    return {
        "le": maintenant_ms(),
        "par": user.first_name,
        "quoi": quoi,
        "montant": montant,
        "ref": ref,
        "p": p,
        "mot": (mot or "").strip() or None,
    }


def _fin(e: EnvoiRecu, maj: dict, action: dict, paye: int = 0, redirection: str | None = None) -> dict:
    for k, v in maj.items():
        setattr(e, k, v)
    e.actions = [*(e.actions or []), action]
    e.save()
    quoi = {"offert": "a offert", "paye": "a payé", "participe": "a participé à", "accepte": "a accepté", "refuse": "a refusé"}
    if action["quoi"] in quoi:
        commandes.notifier(e.de, "Reçus", f"{action['par']} {quoi[action['quoi']]} « {e.titre} ».", "/recus")
    r = {"ok": True, "envoi": envoi_dict(e), "ref": action["ref"], "paye": paye}
    if redirection:
        r["redirection"] = redirection
    return r


def _commande_pour(e: EnvoiRecu, lignes: list[dict], livraison: int, paiement: dict) -> str | None:
    """La commande payée par le destinataire de l'envoi, livrée à l'envoyeur, à son relais (jamais une adresse)."""
    relais = commandes.relais_par_texte(e.lieu) or commandes.relais_habituel(e.de)
    catalogue = [(int(x["p"]), int(x.get("qte") or 1), int(x["prix"])) for x in lignes if str(x.get("p") or "").isdigit()]
    if not catalogue:
        return None
    order_id = commandes.creer_commande(
        destinataire=e.de,
        lignes=catalogue,
        mode="relais",
        relay_id=relais.id if relais else None,
        payee=paiement["reussi"],
        livraison=livraison,
        moyen=paiement["moyen"],
        payeur={"prenom": e.pour_prenom, "moyen": paiement["libelle"], "devise": "XAF"},
    )
    return pont.ref_commande(order_id) if order_id else None


def executer(user, id_, a: dict) -> dict:
    with transaction.atomic():
        e = EnvoiRecu.objects.select_for_update().filter(pour=user, pk=_pk(id_)).first()
        if e is None:
            raise refus_recu("traite")
        e = _a_jour(e)
        if e.etat == EnvoiRecu.Etat.EXPIRE:
            raise refus_recu("expire")
        action = a["action"]
        g = parametres.garde()
        diaspora = _est_diaspora(user)
        ref_paiement = f"RCU-{e.pk}-{len(e.actions or [])}"

        if action == "offrir":
            if e.type != "liste" or e.etat != EnvoiRecu.Etat.A_TRAITER:
                raise refus_recu("traite")
            ligne = next((x for x in e.lignes or [] if str(x.get("p")) == str(a.get("p"))), None)
            if ligne is None or ligne.get("offertPar"):
                raise refus_recu("offert")
            prix, frais = int(ligne["prix"]), int(ligne.get("livraison") or 0)
            qui = a.get("qui") or rechanges.PAYEUR
            if (
                qui == rechanges.DESTINATAIRE
                and not rechanges.destinataire_peut_payer(articles=prix, frais=frais, g=g, payeur_diaspora=diaspora).ok
            ):
                raise refus_recu("garantie")
            rep = rechanges.repartition(articles=prix, frais=frais, qui=qui, g=g)
            p = _payer(user, a["moyen"], rep["payeurMaintenant"], ref_paiement, f"Cadeau pour {e.de_prenom}")
            ref = _commande_pour(e, [{**ligne, "qte": 1}], frais if qui == rechanges.PAYEUR else 0, p)
            lignes = [{**x, "offertPar": user.first_name} if x is ligne else x for x in e.lignes]
            # Les autres envois de la même liste voient l'article offert.
            if e.code:
                for autre in EnvoiRecu.objects.select_for_update().filter(type="liste", code=e.code).exclude(pk=e.pk):
                    autre.lignes = [
                        {**x, "offertPar": user.first_name} if str(x.get("p")) == str(ligne.get("p")) else x for x in autre.lignes or []
                    ]
                    autre.save(update_fields=["lignes"])
            return _fin(
                e,
                {"etat": EnvoiRecu.Etat.FAIT, "lignes": lignes},
                _action(user, "offert", p["paye"], ref, ligne.get("p"), a.get("mot")),
                p["paye"],
                p["redirection"],
            )

        if action == "participer":
            return _participer(user, e, a)

        if action == "payer":
            if e.type not in A_PAYER or e.etat != EnvoiRecu.Etat.A_TRAITER:
                raise refus_recu("traite")
            if e.type == "demande-diaspora" and not diaspora:
                raise refus_recu("diaspora")
            articles = sum(int(x["prix"]) * int(x.get("qte") or 1) for x in e.lignes or [])
            qui = rechanges.PAYEUR
            voulu = e.qui or a.get("qui") or rechanges.PAYEUR
            if not diaspora and voulu == rechanges.DESTINATAIRE:
                if not rechanges.destinataire_peut_payer(articles=articles, frais=e.frais, g=g).ok:
                    raise refus_recu("garantie")
                qui = rechanges.DESTINATAIRE
            rep = rechanges.repartition(articles=articles, frais=e.frais, qui=qui, g=g)
            p = _payer(user, a["moyen"], rep["payeurMaintenant"], ref_paiement, f"Payé pour {e.de_prenom}")
            ref = _commande_pour(e, e.lignes or [], e.frais if qui == rechanges.PAYEUR else 0, p)
            return _fin(
                e,
                {"etat": EnvoiRecu.Etat.FAIT, "ref": ref or ""},
                _action(user, "paye", p["paye"], ref, None, a.get("mot")),
                p["paye"],
                p["redirection"],
            )

        if action == "accepter":
            if e.type not in A_ACCEPTER or e.etat != EnvoiRecu.Etat.A_TRAITER:
                raise refus_recu("traite")
            if e.type == "lien-famille" and e.code:
                relais = a.get("relais") or (commandes.relais_habituel(user).nom if commandes.relais_habituel(user) else "")
                commandes.appeler("apps.diaspora.services", "accepter_invitation", user, e.code, relais)
            fait = e.type in ("partage", "parrainage", "lien-famille", "abonnement")
            return _fin(
                e,
                {"etat": EnvoiRecu.Etat.FAIT if fait else EnvoiRecu.Etat.ACCEPTE},
                _action(user, "vu" if e.type == "partage" else "accepte", 0, e.ref or None),
            )

        if action == "refuser":
            if not (e.etat == EnvoiRecu.Etat.A_TRAITER or (e.type == "code-retrait" and e.etat == EnvoiRecu.Etat.ACCEPTE)):
                raise refus_recu("traite")
            rendu = 0
            if e.type == "colis":
                articles = sum(int(x["prix"]) * int(x.get("qte") or 1) for x in e.lignes or [])
                rendu = rechanges.refus_colis(
                    articles=articles, frais=e.frais, qui=e.qui or rechanges.PAYEUR, expedie=False, jours_garde=0, g=g
                )["rembourse"]
            return _fin(e, {"etat": EnvoiRecu.Etat.REFUSE}, _action(user, "refuse", rendu, None, None, a.get("mot")))

        if action == "retirer":
            if e.type != "code-retrait" or e.etat != EnvoiRecu.Etat.ACCEPTE:
                raise refus_recu("traite")
            return _fin(e, {"etat": EnvoiRecu.Etat.FAIT}, _action(user, "retire", 0, e.ref or None))

    raise refus_recu("traite")


def _participer(user, e: EnvoiRecu, a: dict) -> dict:
    """Cagnotte d'une liste, cagnotte, cotisation : la règle de la page publique (dès PARTICIPATION_MIN, au plus ce
    qui manque), payée avec un moyen du compte (Mobile Money ou carte enregistrée ; pas le portefeuille)."""
    montant = int(a.get("montant") or 0)
    fonds = (
        e.cagnotte
        if e.type == "liste"
        else ({"objectif": e.objectif or 0, "reuni": e.reuni} if e.type in ("cagnotte", "cotisation") else None)
    )
    if not fonds or not e.code:
        raise refus_recu("traite")
    moyen = str(a.get("moyen") or "")
    jeton, texte = "", ""
    if moyen.startswith("carte:"):
        from apps.wallet.services import resoudre_moyen

        try:
            m = resoudre_moyen(user, moyen[6:])
        except ErreurClient:
            raise refus_recu("moyen") from None
        jeton, texte = m.jeton, m.libelle
    elif moyen.startswith("momo:") and not _est_diaspora(user):
        v = moyen[5:]
        if v.startswith("+") or v.isdigit():
            texte = chiffres(v)
        else:
            from apps.wallet.services import moyen_momo

            try:
                texte = moyen_momo(user, v).numero
            except ErreurClient:
                raise refus_recu("moyen") from None
    else:
        raise refus_recu("moyen")
    corps = {
        "prenom": user.first_name,
        "montant": montant,
        "moyen": texte,
        "jeton": jeton,
        "mot": a.get("mot") or "",
        "discret": bool(a.get("discret")),
    }
    if e.type == "cotisation":
        r = commandes.appeler("apps.extras.services", "participer", e.code, {**corps, "carte": bool(jeton)}, user)
    else:
        r = commandes.appeler("apps.wishlists.services", "participer_cagnotte", e.code, corps)
    if not r or not r.get("ok"):
        raise refus_recu("montant" if (r or {}).get("raison") == "montant" else "traite")
    reuni = int(r["reuni"]) if "reuni" in r else (e.reuni + montant)
    maj = {"etat": EnvoiRecu.Etat.FAIT}
    if e.type == "liste" and e.cagnotte:
        maj["cagnotte"] = {**e.cagnotte, "reuni": reuni}
    else:
        maj["reuni"] = reuni
    return _fin(e, maj, _action(user, "participe", montant, None, None, a.get("mot")), montant, r.get("redirection"))


# ── Remercier, envoyer ─────────────────────────────────────────────────────────────────────────────────


def remercier(user, id_, texte: str) -> dict:
    e = EnvoiRecu.objects.filter(Q(pour=user) | Q(de=user), pk=_pk(id_)).first()
    mot = (texte or "").strip()
    if e is None or not mot:
        return {"ok": False}
    if e.pour_id == user.pk:
        permis = (
            e.type in ("colis", "abonnement", "panier-famille", "lien-famille", "parrainage", "partage", "code-retrait")
            and e.etat != "a_traiter"
        )
    else:
        permis = any(x.get("montant", 0) > 0 or x.get("quoi") == "accepte" for x in e.actions or [])
    if not permis:
        return {"ok": False}
    e.merci = {"de": user.first_name, "texte": mot[:280], "le": maintenant_ms()}
    e.save(update_fields=["merci"])
    autre = e.de if e.pour_id == user.pk else e.pour
    commandes.notifier(autre, "Un merci", f"{user.first_name} te remercie.", "/recus")
    return {"ok": True}


def _lien(type_: str, code: str, pk: int) -> str:
    if code and type_ in ("liste", "cagnotte"):
        return f"/l/{code}"
    if code and type_ == "cotisation":
        return f"/c/{code}"
    return f"/recus/{pk}"


def envoyer(user, n: dict) -> dict:
    """envoyerRecu : au numéro vérifié ou à l'e-mail d'un compte (dans sa boîte « Reçus ») ; sans compte, seul le lien
    public existe. Anti-annuaire : la réponse ne dit pas si le numéro a un compte avant l'envoi. Les prix des lignes
    du catalogue sont relus ici (jamais ceux du navigateur)."""
    brut = str(n["a"]).strip()
    email = brut.lower() if "@" in brut else None
    numero = None if email else chiffres(brut)
    if numero and numero.startswith("237") and len(numero) == 12:
        numero = numero[3:]
    if email:
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[a-z]{2,}", email, re.I):
            raise refus_recu("numero")
    elif not numero or not 8 <= len(numero) <= 15:
        raise refus_recu("numero")
    lignes = list(n.get("lignes") or [])
    if n["type"] in AVEC_LIGNES and not lignes:
        raise refus_recu("vide")
    User = get_user_model()
    compte = User.objects.filter(email__iexact=email, is_active=True).first() if email else commandes.client_par_numero(numero)
    if compte is not None and compte.pk == user.pk:
        raise refus_recu("moi")
    produits = pont.produits([int(x["p"]) for x in lignes if str(x.get("p") or "").isdigit()])
    lignes = [
        {**x, "prix": produits[int(x["p"])].prix, "titre": produits[int(x["p"])].titre}
        if str(x.get("p") or "").isdigit() and int(x["p"]) in produits
        else x
        for x in lignes
    ]
    jusqua = (
        depuis_ms(n.get("jusqua"))
        if n.get("jusqua")
        else (timezone.now() + timedelta(days=JOURS_POUR_PAYER) if n["type"] in A_PAYER else None)
    )
    relais = commandes.relais_habituel(user)
    pays = commandes.appeler("apps.diaspora.services", "compte", user)
    cible = email or numero
    e = EnvoiRecu.objects.create(
        type=n["type"],
        de=user,
        de_prenom=user.first_name,
        depuis=getattr(pays, "pays", "") or "",
        pour=compte,
        pour_prenom=((compte.first_name if compte else "") or str(n["prenom"]).strip())[:80],
        a_chiffre=chiffrer(cible),
        a_empreinte=empreinte(cible),
        titre=str(n["titre"]).strip()[:200],
        occasion=n.get("occasion") or "",
        hotes=list(n.get("hotes") or [])[:6],
        date=depuis_ms(n.get("date")) if n.get("date") else None,
        lieu=n.get("lieu") or (relais.nom if relais else ""),
        mot=str(n.get("mot") or "").strip()[:280],
        jusqua=jusqua,
        lignes=lignes,
        frais=int(n.get("frais") or 0),
        qui=n.get("qui") or "",
        objectif=n.get("objectif"),
        cagnotte=n.get("cagnotte"),
        code=n.get("code") or "",
        ref=n.get("ref") or "",
        detail=n.get("detail") or "",
    )
    e.lien = n.get("lien") or _lien(e.type, e.code, e.pk)
    e.save(update_fields=["lien"])
    if compte is not None:
        commandes.notifier(compte, "Reçus", f"{user.first_name} t'a envoyé « {e.titre} ».", f"/recus/{e.pk}")
    return {"ok": True, "envoi": envoi_dict(e)}
