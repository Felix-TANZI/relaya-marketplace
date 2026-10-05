# backend/apps/wishlists/services.py
# Listes d'envies (CL-14) et échanges entre clients (DP-54) : logique appelée par les vues.
#
# - Prix, titres et images : lus dans le catalogue à chaque lecture (pont), jamais figés, sauf les prix relevés au
#   partage (CLE-39) : un proche voit le prix d'alors à côté du prix du jour ; s'il a validé un prix plus bas que
#   celui du paiement, rien n'est débité (409 price_changed avec le nouveau prix).
# - Livraison d'un article seul : moteur de frais (belivay_moteurs.frais) ; qui la paie : règle commune (regles.py).
# - Lien court : LIEN-COURT-LONG caractères en base32 majuscule (CAP-11), valable LST-VALIDITE jours.
# - Carte depuis l'étranger (cadeau sans compte) : plafonds PAY-CARTE-MAX par paiement et DIA-PLAFOND-MOIS par mois
#   pour une même adresse e-mail ; contrôle de cohérence de la diaspora (apps.diaspora.regles) ; vérification
#   renforcée par un code envoyé à l'e-mail (apps.otp, objet « cadeau ») ; 3-D Secure par le prestataire.
#
# Fonctions exposées aux autres applications du kit :
#   enregistrer_colis(...)            → ColisEchange (cotisation atteinte, panier payé pour un proche…)
#   liste_par_code(code)              → ListeEnvies partagée et valable, ou None
#   confirmer_paiement(reference)     → paiement Mobile Money ou 3-D Secure confirmé (webhook de relaya)

import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status

from apps.client_core import parametres, pont
from apps.client_core.chiffrement import chiffrer, dechiffrer, empreinte
from apps.client_core.erreurs import ErreurClient, conflit, introuvable, refus
from apps.client_core.masquage import masquer_numero, numero_local
from apps.client_core.temps import YAOUNDE, depuis_ms, maintenant_ms, ms
from apps.diaspora import regles as rdiaspora

from . import commandes, regles
from .models import (
    ArticleListe,
    ColisEchange,
    EnvoiEchange,
    ListeEnvies,
    ListeSuivie,
    Merci,
    MiseEnStatut,
    ParticipationCagnotte,
    ProcheConnu,
    RechercheProche,
)

# PARAMÈTRE À AJOUTER AU REGISTRE : LST-COTISER-DES (un article de 15 000 F et plus s'offre à plusieurs)
COTISER_DES = 15_000
# Participation minimale à une cagnotte de liste ou à une cotisation (site : PARTICIPATION_MIN).
PARTICIPATION_MIN = 1_000
# PARAMÈTRE À AJOUTER AU REGISTRE : LST-RAPPEL-ECART (le propriétaire relance ses invités : 3 jours au moins entre deux)
RAPPEL_ECART_JOURS = 3
# PARAMÈTRE À AJOUTER AU REGISTRE : LST-RAPPELS-JOURS (rappels proposés à qui suit une liste : 1, 3 ou 7 jours avant)
RAPPELS_JOURS = (1, 3, 7)
# PARAMÈTRE À AJOUTER AU REGISTRE : ECH-RECHERCHES-JOUR (recherches d'un proche par numéro : 20 par jour, anti-annuaire)
RECHERCHES_PAR_JOUR = 20

ALPHABET_LIEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"  # base32 majuscule (CAP-11)
PAIEMENTS_VIVANTS = (ColisEchange.Paiement.ATTENTE, ColisEchange.Paiement.ACTION, ColisEchange.Paiement.PAYE)


# ── Outils ─────────────────────────────────────────────────────────────────────────────────────────────


def nouveau_code(existe) -> str:
    longueur = parametres.entier("LIEN-COURT-LONG")
    while True:
        code = "".join(secrets.choice(ALPHABET_LIEN) for _ in range(longueur))
        if not existe(code):
            return code


def debut_mois(moment=None):
    m = (moment or timezone.now()).astimezone(YAOUNDE)
    return m.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _id_produit(p) -> int:
    try:
        return int(p)
    except (TypeError, ValueError):
        raise introuvable("Article introuvable.") from None


def _modele_favori():
    from django.apps import apps

    cle = getattr(settings, "BELIVAY_MODELES", {}).get("favori")
    if not cle:
        return None
    try:
        return apps.get_model(cle)
    except (LookupError, ValueError):
        return None


# ── Listes du client ───────────────────────────────────────────────────────────────────────────────────


def favoris_de(user) -> ListeEnvies:
    return ListeEnvies.objects.get_or_create(client=user, favoris=True, defaults={"nom": "Mes favoris"})[0]


def liste_du_client(user, id_) -> ListeEnvies:
    """La liste `id_` du client (« favoris » : la liste par défaut) ; 404 sinon (filtrage au queryset)."""
    if str(id_) == "favoris":
        return favoris_de(user)
    try:
        return ListeEnvies.objects.get(client=user, pk=int(id_))
    except (ValueError, ListeEnvies.DoesNotExist):
        raise introuvable("Liste introuvable.") from None


def ids_articles(liste: ListeEnvies) -> list[int]:
    """Les produits d'une liste ; la liste par défaut est faite des favoris de relaya (accounts.UserFavorite)."""
    if liste.favoris:
        Fav = _modele_favori()
        if Fav is not None:
            return list(Fav.objects.filter(user=liste.client).order_by("id").values_list("product_id", flat=True))
    return list(liste.articles.values_list("product_id", flat=True))


def relais_de_liste(liste: ListeEnvies):
    if liste.relay_id:
        return pont.relais(liste.relay_id)
    if liste.destination == ListeEnvies.Destination.MOI:
        return commandes.relais_habituel(liste.client)
    return None


def partage_valable(liste: ListeEnvies) -> bool:
    return bool(liste.code and liste.partage_jusqua and liste.partage_jusqua > timezone.now())


def offerts(liste: ListeEnvies) -> dict[int, ColisEchange]:
    qs = ColisEchange.objects.filter(liste=liste, origine=ColisEchange.Origine.LISTE, etat_paiement__in=PAIEMENTS_VIVANTS).exclude(
        etat=ColisEchange.Etat.REFUSE
    )
    return {c.product_id: c for c in qs.order_by("id")}


def _cotisation(code: str | None, pid: int) -> dict | None:
    """La cotisation de l'article (apps.extras) : {code, reuni, objectif, etat, ref, fin} ou None."""
    if not code:
        return None
    return commandes.appeler("apps.extras.services", "cotisation_article_info", code, pid)


def _livraisons(pid: int, prix: int) -> tuple[int, int]:
    return commandes.livraison_seule("relais", [(pid, 1, prix)]), commandes.livraison_seule("domicile", [(pid, 1, prix)])


def article_dict(liste: ListeEnvies, pid: int, p, offert: ColisEchange | None, cot: dict | None) -> dict:
    relais_f, domicile_f = _livraisons(pid, p.prix)
    if offert is not None:
        o = {"par": offert.payeur_prenom, "le": ms(offert.cree_le), "ref": offert.ref, "qui": offert.qui}
    elif cot and cot.get("etat") == "atteinte":
        o = {"par": "Cotisation", "le": cot.get("fin"), "ref": cot.get("ref") or "", "qui": "payeur"}
    else:
        o = None
    return {
        "p": str(pid),
        "titre": p.titre,
        "dessin": pont.image(pid),
        "prix": p.prix,
        "livraison": relais_f,
        "livraisonDomicile": domicile_f,
        "prixPartage": (liste.prix_partage or {}).get(str(pid), p.prix) if liste.code else None,
        "offert": o,
        "cotisation": {"code": cot["code"], "reuni": cot["reuni"], "objectif": cot["objectif"]} if cot else None,
    }


def _articles(liste: ListeEnvies) -> list[dict]:
    ids = ids_articles(liste)
    produits = pont.produits(ids)
    deja = offerts(liste)
    return [article_dict(liste, pid, produits[pid], deja.get(pid), _cotisation(liste.code, pid)) for pid in ids if pid in produits]


def liste_dict(liste: ListeEnvies) -> dict:
    relais = relais_de_liste(liste)
    return {
        "id": "favoris" if liste.favoris else str(liste.pk),
        "nom": liste.nom,
        "favoris": liste.favoris,
        "mode": liste.mode,
        "remiseLe": ms(liste.remise_le),
        "surprise": liste.surprise,
        "destination": liste.destination,
        "relais": relais.nom if relais else None,
        "tiers": {"prenom": liste.tiers_prenom, "relais": relais.nom if relais else ""}
        if liste.destination == ListeEnvies.Destination.TIERS
        else None,
        "partage": (
            {"code": liste.code, "le": ms(liste.partage_le), "jusqua": ms(liste.partage_jusqua), "prix": liste.prix_partage or {}}
            if partage_valable(liste)
            else None
        ),
        "demarree": liste.demarree,
        "articles": _articles(liste),
        "domicile": liste.domicile,
        "statuts": [{"canal": s.canal, "le": ms(s.le)} for s in liste.statuts.order_by("-id")[:20]][::-1],
        "occasion": liste.occasion or None,
        "hotes": list(liste.hotes or []),
        "cagnotte": (
            {
                "titre": liste.cagnotte_titre,
                "objectif": liste.cagnotte_objectif,
                "participations": [
                    {"prenom": x.prenom, "montant": x.montant, "le": ms(x.le), "mot": x.mot, "discret": x.discret}
                    for x in _participations(liste)
                ],
            }
            if liste.cagnotte_objectif
            else None
        ),
    }


def _participations(liste: ListeEnvies):
    return liste.participations.filter(etat_paiement=ParticipationCagnotte.Paiement.PAYE)


def _reuni(liste: ListeEnvies) -> int:
    return sum(x.montant for x in _participations(liste))


def listes(user) -> dict:
    favoris_de(user)
    relais = commandes.relais_habituel(user)
    return {
        "listes": [liste_dict(x) for x in ListeEnvies.objects.filter(client=user)],
        "relais": relais.nom if relais else None,
        "maintenant": maintenant_ms(),
    }


def creer_liste(
    user, nom: str, mode: str, remise_le: int | None, surprise: bool, occasion: str | None = None, hotes=None, cagnotte: dict | None = None
) -> ListeEnvies:
    return ListeEnvies.objects.create(
        client=user,
        nom=nom.strip()[:120],
        mode=mode,
        remise_le=depuis_ms(remise_le),
        surprise=surprise,
        occasion=occasion or "",
        hotes=[str(h).strip()[:80] for h in (hotes or []) if str(h).strip()][:6],
        cagnotte_titre=(cagnotte or {}).get("titre", "").strip()[:80] if cagnotte else "",
        cagnotte_objectif=int(cagnotte["objectif"]) if cagnotte and cagnotte.get("objectif") else None,
    )


def ajouter_article(liste: ListeEnvies, product_id) -> None:
    pid = _id_produit(product_id)
    p = pont.produit(pid)
    if p is None or not p.actif:
        raise introuvable("Article introuvable.")
    Fav = _modele_favori() if liste.favoris else None
    if Fav is not None:
        Fav.objects.get_or_create(user=liste.client, product_id=pid)
    else:
        ArticleListe.objects.get_or_create(liste=liste, product_id=pid)
    # Liste déjà partagée : l'article arrive chez les proches au prix d'aujourd'hui (CLE-39).
    if liste.code and str(pid) not in (liste.prix_partage or {}):
        liste.prix_partage = {**(liste.prix_partage or {}), str(pid): p.prix}
        liste.save(update_fields=["prix_partage"])


def retirer_article(liste: ListeEnvies, product_id) -> dict:
    """Un article offert ne se retire jamais : {ok: false}."""
    pid = _id_produit(product_id)
    if pid in offerts(liste):
        return {"ok": False}
    Fav = _modele_favori() if liste.favoris else None
    if Fav is not None:
        Fav.objects.filter(user=liste.client, product_id=pid).delete()
    ArticleListe.objects.filter(liste=liste, product_id=pid).delete()
    return {"ok": True}


def regler_liste(liste: ListeEnvies, r: dict) -> None:
    """Un cadeau déjà offert : seul le mode surprise change encore (le lieu de remise est figé)."""
    champs = []
    if "surprise" in r:
        liste.surprise = bool(r["surprise"])
        champs.append("surprise")
    if not offerts(liste):
        if "destination" in r:
            liste.destination = r["destination"]
            champs.append("destination")
            if r["destination"] == ListeEnvies.Destination.MOI:
                liste.relay_id, liste.tiers_prenom = None, ""
                champs += ["relay_id", "tiers_prenom"]
        if r.get("tiers"):
            relais = commandes.relais_par_texte(r["tiers"].get("relais"))
            if relais is None:
                raise refus("relais", "Relais introuvable.")
            liste.tiers_prenom = str(r["tiers"].get("prenom", "")).strip()[:80]
            liste.relay_id = relais.id
            champs += ["tiers_prenom", "relay_id"]
        if "domicile" in r:
            liste.domicile = bool(r["domicile"])
            champs.append("domicile")
    if champs:
        liste.save(update_fields=sorted(set(champs)))


def partager(liste: ListeEnvies) -> ListeEnvies:
    """Crée le lien au besoin ; les prix du jour sont relevés au partage (CLE-39)."""
    if partage_valable(liste):
        return liste
    maintenant = timezone.now()
    ids = ids_articles(liste)
    produits = pont.produits(ids)
    liste.code = nouveau_code(lambda c: ListeEnvies.objects.filter(code=c).exists())
    liste.partage_le = maintenant
    liste.partage_jusqua = maintenant + timedelta(days=parametres.entier("LST-VALIDITE"))
    liste.prix_partage = {str(pid): produits[pid].prix for pid in ids if pid in produits}
    liste.save(update_fields=["code", "partage_le", "partage_jusqua", "prix_partage"])
    return liste


def arreter_partage(liste: ListeEnvies) -> None:
    liste.partage_jusqua = timezone.now()
    liste.save(update_fields=["partage_jusqua"])


def mettre_en_statut(liste: ListeEnvies, canal: str) -> dict:
    partager(liste)
    MiseEnStatut.objects.create(liste=liste, canal=canal)
    return {"code": liste.code, "jusqua": ms(liste.partage_jusqua)}


# ── Liste publique et cadeaux ──────────────────────────────────────────────────────────────────────────


def liste_par_code(code: str) -> ListeEnvies | None:
    liste = ListeEnvies.objects.filter(code=str(code)).select_related("client").first()
    return liste if liste is not None and partage_valable(liste) else None


def prenom_destinataire(liste: ListeEnvies) -> str:
    if liste.destination == ListeEnvies.Destination.TIERS and liste.tiers_prenom:
        return liste.tiers_prenom
    return liste.client.first_name or ""


def domicile_possible(liste: ListeEnvies) -> bool:
    """Livraison chez le destinataire : acceptée par le propriétaire, liste au fil de l'eau, une adresse au compte."""
    return (
        liste.domicile
        and liste.mode == ListeEnvies.Mode.FIL
        and liste.destination == ListeEnvies.Destination.MOI
        and commandes.a_une_adresse(liste.client)
    )


def liste_publique(code: str) -> dict | None:
    liste = liste_par_code(code)
    if liste is None:
        return None
    relais = relais_de_liste(liste)
    return {
        "code": liste.code,
        "prenom": prenom_destinataire(liste),
        "nom": liste.nom,
        "quartier": relais.quartier if relais else commandes.VILLE,
        "relais": relais.nom if relais else None,
        "mode": liste.mode,
        "remiseLe": ms(liste.remise_le),
        "jusqua": ms(liste.partage_jusqua),
        "destination": liste.destination,
        "partageLe": ms(liste.partage_le),
        "articles": [{**a, "offert": a["offert"] is not None} for a in _articles(liste)],
        "domicile": {"ville": commandes.ville_domicile(liste.client)} if domicile_possible(liste) else None,
        "occasion": liste.occasion or None,
        "hotes": list(liste.hotes or []),
        "cagnotte": (
            {
                "titre": liste.cagnotte_titre,
                "objectif": liste.cagnotte_objectif,
                "reuni": _reuni(liste),
                "participants": _participations(liste).count(),
            }
            if liste.cagnotte_objectif
            else None
        ),
    }


def participer_cagnotte(code: str, p: dict) -> dict:
    """participerCagnotteListe : sans compte, dès PARTICIPATION_MIN, au plus ce qui manque ; paiement Mobile Money
    (ou carte : jeton du prestataire) ; l'argent est bloqué chez BelivaY puis versé aux hôtes."""
    liste = liste_par_code(code)
    if liste is None or not liste.cagnotte_objectif:
        return {"ok": False, "raison": "ferme"}
    with transaction.atomic():
        ListeEnvies.objects.select_for_update().filter(pk=liste.pk).first()  # une participation à la fois
        reuni = _reuni(liste)
        manque = max(0, liste.cagnotte_objectif - reuni)
        if not manque:
            return {"ok": False, "raison": "ferme"}
        montant = int(p["montant"])
        if not str(p["prenom"]).strip() or montant < min(PARTICIPATION_MIN, manque) or montant > manque:
            return {"ok": False, "raison": "montant"}
        jeton = str(p.get("jeton") or "")
        moyen = "carte" if jeton else commandes.moyen_de(p["moyen"])
        part = ParticipationCagnotte.objects.create(
            liste=liste,
            prenom=str(p["prenom"]).strip()[:80],
            montant=montant,
            mot=str(p.get("mot") or "").strip()[:200],
            discret=bool(p.get("discret")),
            moyen=moyen,
            moyen_affiche=_moyen_affiche(moyen, p["moyen"]),
        )
    service = commandes.service_carte(montant) if moyen in commandes.MOYENS_CARTE else 0
    r = commandes.payer(
        moyen=moyen,
        montant=montant + service,
        reference=f"CAG-{part.pk}",
        jeton=jeton or p["moyen"],
        numero=numero_local(p["moyen"]) if moyen == "mobile" else "",
        motif=f"Cagnotte · {liste.cagnotte_titre or liste.nom}",
    )
    if r.statut == "refuse":
        part.etat_paiement = ParticipationCagnotte.Paiement.REFUSE
        part.save(update_fields=["etat_paiement"])
        raise ErreurClient(
            status.HTTP_402_PAYMENT_REQUIRED, "paiement_refuse", "Paiement refusé : rien n'a été débité.", {"motif": r.motif}
        )
    part.reference_paiement = r.reference or f"CAG-{part.pk}"
    if r.statut == "reussi":
        part.etat_paiement = ParticipationCagnotte.Paiement.PAYE
    part.save(update_fields=["reference_paiement", "etat_paiement"])
    reponse = {"ok": True, "reuni": _reuni(liste) if r.statut == "reussi" else reuni + montant}
    if r.redirection:
        reponse["redirection"] = r.redirection
    return reponse


def _historique_carte(email_empreinte: str) -> list[tuple[int, int]]:
    qs = ColisEchange.objects.filter(
        payeur_email_empreinte=email_empreinte, moyen__in=commandes.MOYENS_CARTE, etat_paiement=ColisEchange.Paiement.PAYE
    )
    return [(ms(c.cree_le), c.total) for c in qs]


def _controle_carte(*, carte: dict, email: str, montant: int, pays_prestataire: str | None = None):
    """(Controle, raison de refus ou None). Plafonds, puis cohérence, puis code e-mail si renforcé."""
    from django.db.models import Sum

    emp = empreinte(email)
    mois = (
        ColisEchange.objects.filter(
            payeur_email_empreinte=emp,
            moyen__in=commandes.MOYENS_CARTE,
            etat_paiement=ColisEchange.Paiement.PAYE,
            cree_le__gte=debut_mois(),
        ).aggregate(n=Sum("total"))["n"]
        or 0
    )
    if rdiaspora.depasse_plafonds(
        montant=montant, deja_ce_mois=mois, par_paiement=parametres.paiement().carte_max, par_mois=rdiaspora.PLAFOND_MOIS
    ):
        return None, "plafond"
    c = rdiaspora.controle_diaspora(
        pays_carte=pays_prestataire or carte.get("pays_carte") or carte.get("paysCarte") or "",
        pays_compte=carte.get("pays") or "",
        montant=montant,
        historique=_historique_carte(emp),
        maintenant=maintenant_ms(),
    )
    if c.decision == "refuse":
        return c, "coherence"
    return c, None


def offrir(code: str, product_id, o: dict) -> dict:
    """offrirArticleListe : sans compte, idempotent (la vue). Rend {ok: true, ref} ou un refus du site."""
    liste = liste_par_code(code)
    if liste is None:
        return {"ok": False, "raison": "ferme"}
    pid = _id_produit(product_id)
    if pid not in ids_articles(liste):
        return {"ok": False, "raison": "offert"}
    # Contrôles hors transaction : un code faux doit être compté même si la requête est refusée (OTP-ESSAIS).
    if pid in offerts(liste):
        return {"ok": False, "raison": "offert"}
    cot = _cotisation(liste.code, pid)
    if cot and cot.get("etat") in ("ouverte", "atteinte", "hausse"):
        return {"ok": False, "raison": "offert"}
    p = pont.produit(pid)
    if p is None or not p.actif:
        return {"ok": False, "raison": "ferme"}
    # CLE-39 : hausse depuis le prix validé → rien n'est débité, le nouveau prix est montré.
    if p.prix > int(o["prix_vu"]):
        raise conflit("price_changed", "Le prix a changé depuis que tu l'as vu.", {"prix": p.prix})
    livraison = o.get("livraison") or "relais"
    if livraison == "domicile" and not domicile_possible(liste):
        raise refus("domicile", "La livraison chez le destinataire n'est pas possible pour cette liste.")
    relais = relais_de_liste(liste)
    if livraison == "relais" and relais is None:
        return {"ok": False, "raison": "ferme"}
    frais_liv = commandes.livraison_seule(livraison, [(pid, 1, p.prix)])
    qui = o.get("qui") or regles.PAYEUR
    g = parametres.garde()
    if qui == regles.DESTINATAIRE and not regles.destinataire_peut_payer(articles=p.prix, frais=frais_liv, g=g).ok:
        return {"ok": False, "raison": "garantie"}
    rep = regles.repartition(articles=p.prix, frais=frais_liv, qui=qui, g=g)
    email = str(o["email"]).strip().lower()
    carte = o.get("carte") or None
    moyen = commandes.moyen_de(o["moyen"]) if not carte else "carte"
    service = commandes.service_carte(rep["payeurMaintenant"]) if moyen in commandes.MOYENS_CARTE else 0
    montant = rep["payeurMaintenant"] + service
    devise = o.get("devise") if moyen in commandes.MOYENS_CARTE and o.get("devise") in ("EUR", "USD") else "XAF"
    controle = None
    if moyen in commandes.MOYENS_CARTE:
        controle, raison = _controle_carte(carte=carte or {}, email=email, montant=montant)
        if raison == "plafond":
            raise refus("plafond", "Ce paiement dépasse le plafond des cartes de l'étranger.")
        if raison == "coherence":
            raise refus("coherence", "Paiement refusé : rien n'a été débité.", {"controle": controle.en_dict()})
        if controle.decision == "renforce":
            from apps.otp.services import verifier

            r = verifier(objet="cadeau", code=(carte or {}).get("code_email") or (carte or {}).get("codeEmail") or "", destination=email)
            if not r.get("ok"):
                raise refus(
                    "verification",
                    "Vérification renforcée : entre le code reçu par e-mail.",
                    {"controle": controle.en_dict(), **{k: v for k, v in r.items() if k != "ok"}},
                )

    with transaction.atomic():
        ListeEnvies.objects.select_for_update().filter(pk=liste.pk).first()  # un seul cadeau à la fois par liste
        if pid in offerts(liste):
            return {"ok": False, "raison": "offert"}
        colis = ColisEchange.objects.create(
            origine=ColisEchange.Origine.LISTE,
            payeur_prenom=str(o["prenom"]).strip()[:80],
            payeur_email_chiffre=chiffrer(email),
            payeur_email_empreinte=empreinte(email),
            destinataire=liste.client,
            destinataire_prenom=prenom_destinataire(liste),
            liste=liste,
            code_liste=liste.code,
            product_id=pid,
            titre="Cadeau surprise" if liste.surprise else p.titre,
            surprise=liste.surprise,
            articles=p.prix,
            frais=frais_liv,
            qui=qui,
            livraison=livraison,
            relay_id=relais.id if relais and livraison == "relais" else None,
            relais_nom=relais.nom if relais else "",
            moyen=moyen,
            moyen_affiche=_moyen_affiche(moyen, o["moyen"]),
            numero_chiffre=chiffrer(numero_local(o["moyen"])) if moyen == "mobile" else None,
            devise=devise,
            frais_service=service,
            total=montant,
            pays_carte=(carte or {}).get("pays_carte") or "",
            etat=ColisEchange.Etat.A_ACCEPTER if qui == regles.DESTINATAIRE else ColisEchange.Etat.ACCEPTE,
        )
    return _payer_colis(colis, jeton=str(o.get("jeton") or o["moyen"]), email=email, carte=carte, controle=controle)


def _moyen_affiche(moyen: str, texte: str) -> str:
    if moyen == "mobile":
        return masquer_numero(texte)
    t = (texte or "").strip()
    return (
        t[:60] if t and not t.lower().startswith(("tok_", "carte_")) else {"apple": "Apple Pay", "google": "Google Pay"}.get(moyen, "Carte")
    )


def _payer_colis(colis: ColisEchange, *, jeton: str, email: str = "", carte: dict | None = None, controle=None) -> dict:
    reference = f"ECH-{colis.pk}"
    numero = dechiffrer(colis.numero_chiffre) if colis.numero_chiffre else ""
    r = commandes.payer(
        moyen=colis.moyen,
        montant=colis.total,
        reference=reference,
        jeton=jeton,
        numero=numero,
        devise=colis.devise,
        email=email,
        motif="Cadeau BelivaY",
    )
    if r.statut == "refuse":
        colis.etat_paiement = ColisEchange.Paiement.REFUSE
        colis.save(update_fields=["etat_paiement"])
        raise ErreurClient(
            status.HTTP_402_PAYMENT_REQUIRED,
            "paiement_refuse",
            "Paiement refusé par la banque ou l'opérateur : rien n'a été débité.",
            {"motif": r.motif},
        )
    # Le pays d'émission donné par le prestataire fait foi : contrôle refait ; refus → remboursé aussitôt.
    if colis.moyen in commandes.MOYENS_CARTE and r.pays_carte and carte is not None and r.pays_carte != colis.pays_carte:
        c2, raison = _controle_carte(carte=carte, email=email, montant=colis.total, pays_prestataire=r.pays_carte)
        if raison or (c2 and c2.decision == "renforce" and (controle is None or controle.decision != "renforce")):
            commandes.rembourser(moyen=colis.moyen, reference=r.reference or reference, montant=colis.total)
            colis.etat_paiement = ColisEchange.Paiement.REFUSE
            colis.pays_carte = r.pays_carte
            colis.save(update_fields=["etat_paiement", "pays_carte"])
            raise refus(
                "verification" if not raison else "coherence",
                "Paiement annulé et remboursé : la carte ne correspond pas.",
                {"controle": c2.en_dict() if c2 else None},
            )
        colis.pays_carte = r.pays_carte
    if colis.moyen in commandes.MOYENS_CARTE and colis.devise in ("EUR", "USD"):
        colis.montant_devise = commandes.en_devise(colis.total, colis.devise)[0]
    payee = r.statut == "reussi"
    colis.reference_paiement = r.reference or reference
    colis.etat_paiement = (
        ColisEchange.Paiement.PAYE
        if payee
        else (ColisEchange.Paiement.ACTION if r.statut == "action_requise" else ColisEchange.Paiement.ATTENTE)
    )
    colis.paye_le = timezone.now() if payee else None
    colis.order_id = commandes.creer_commande(
        destinataire=colis.destinataire,
        lignes=[(colis.product_id, 1, colis.articles)],
        mode=colis.livraison,
        relay_id=colis.relay_id,
        payee=payee,
        livraison=colis.frais if colis.qui == regles.PAYEUR else 0,
        frais_service=colis.frais_service,
        moyen=colis.moyen,
        devise=colis.devise,
        montant_devise=colis.montant_devise,
        payeur={"prenom": colis.payeur_prenom, "moyen": colis.moyen_affiche, "devise": colis.devise},
    )
    colis.save()
    if payee:
        _annoncer_cadeau(colis)
    reponse = {"ok": True, "ref": colis.ref}
    if r.redirection:
        reponse["redirection"] = r.redirection  # 3-D Secure : la page de la banque
    return reponse


def _annoncer_cadeau(colis: ColisEchange) -> None:
    titre = "Un cadeau pour toi" if colis.surprise else f"{colis.payeur_prenom} t'offre un cadeau"
    texte = "Un proche t'a offert un article de ta liste." if colis.surprise else f"{colis.titre}, de ta liste."
    if colis.etat == ColisEchange.Etat.A_ACCEPTER:
        texte += " La livraison est à payer au retrait : accepte ou refuse le colis."
    commandes.notifier(colis.destinataire, titre, texte, "/listes")


def confirmer_paiement(reference: str) -> bool:
    """Webhook Mobile Money ou retour 3-D Secure : le cadeau (ou le panier pour un proche, ou une participation à
    la cagnotte d'une liste) est payé."""
    q = Q(reference_paiement=reference) | (Q(pk=_pk_ref(reference, "CAG-")) if str(reference).startswith("CAG-") else Q(pk__in=[]))
    part = ParticipationCagnotte.objects.filter(q).first()
    if part is not None:
        if part.etat_paiement == ParticipationCagnotte.Paiement.PAYE:
            return False
        part.etat_paiement = ParticipationCagnotte.Paiement.PAYE
        part.save(update_fields=["etat_paiement"])
        return True
    colis = (
        ColisEchange.objects.filter(Q(reference_paiement=reference) | Q(pk=_pk_ref(reference)))
        .exclude(etat_paiement=ColisEchange.Paiement.PAYE)
        .first()
    )
    if colis is None:
        return False
    colis.etat_paiement = ColisEchange.Paiement.PAYE
    colis.paye_le = timezone.now()
    colis.save(update_fields=["etat_paiement", "paye_le"])
    if colis.order_id:
        commandes.marquer_payee(colis.order_id)
    _annoncer_cadeau(colis)
    return True


def _pk_ref(reference: str, prefixe: str = "ECH-") -> int:
    try:
        return int(str(reference).removeprefix(prefixe))
    except ValueError:
        return 0


def envoyer_code_cadeau(code: str, email: str) -> dict:
    if liste_par_code(code) is None:
        raise introuvable("Liste introuvable.")
    from apps.otp.services import envoyer

    return envoyer(objet="cadeau", destination=email.strip().lower())


def suivi_cadeau(code: str, ref: str) -> dict | None:
    """Public, pour qui a offert : jamais l'adresse, le code de retrait ni le numéro du destinataire."""
    try:
        order_id = pont.id_commande(ref)
    except ValueError:
        return None
    colis = ColisEchange.objects.filter(code_liste=str(code), order_id=order_id).first()
    if colis is None:
        return None
    s = commandes.suivi(colis.order_id)
    merci = Merci.objects.filter(ref=colis.ref, auteur=colis.destinataire).first() if colis.destinataire else None
    relais = pont.relais(colis.relay_id) if colis.relay_id else None
    return {
        "ref": colis.ref,
        "pour": colis.destinataire_prenom,
        "livraison": colis.livraison,
        "lieu": (relais.quartier if relais else colis.relais_nom.removeprefix("Relais "))
        if colis.livraison == "relais"
        else (commandes.ville_domicile(colis.destinataire) or commandes.VILLE),
        "payeLe": ms(colis.paye_le or colis.cree_le),
        "montant": colis.total,
        "moyen": colis.moyen_affiche,
        "devise": colis.devise if colis.moyen in commandes.MOYENS_CARTE else "XAF",
        "prepareLe": ms(s["prepareLe"]),
        "arriveLe": ms(s["arriveLe"]),
        "remisLe": ms(s["remisLe"]),
        "rembourse": colis.rembourse if colis.rembourse is not None else s["rembourse"],
        "merci": {"de": merci.auteur.first_name, "texte": merci.texte, "le": ms(merci.le)} if merci else None,
        "maintenant": maintenant_ms(),
    }


def cotiser_article(code: str, product_id) -> dict:
    """La cotisation d'un article cher de la liste (créée au besoin, apps.extras)."""
    liste = liste_par_code(code)
    if liste is None:
        return {"ok": False, "raison": "ferme"}
    pid = _id_produit(product_id)
    if pid not in ids_articles(liste) or pid in offerts(liste):
        return {"ok": False, "raison": "offert"}
    p = pont.produit(pid)
    if p is None or not p.actif:
        return {"ok": False, "raison": "ferme"}
    if p.prix < COTISER_DES:
        return {"ok": False, "raison": "petit"}
    relais = relais_de_liste(liste)
    if relais is None:
        return {"ok": False, "raison": "ferme"}
    r = commandes.appeler("apps.extras.services", "cotisation_pour_article", liste, pid, prenom_destinataire(liste), relais)
    if r is None:
        raise ErreurClient(
            status.HTTP_501_NOT_IMPLEMENTED, "a_finir", "Les cotisations ne sont pas installées.", {"manque": "application apps.extras"}
        )
    return r


# ── Colis payés pour un autre ──────────────────────────────────────────────────────────────────────────


def enregistrer_colis(**champs) -> ColisEchange:
    """Pour les autres applications (cotisation atteinte, panier pour un proche) : un ColisEchange déjà payé."""
    champs.setdefault("etat_paiement", ColisEchange.Paiement.PAYE)
    champs.setdefault("paye_le", timezone.now())
    return ColisEchange.objects.create(**champs)


def colis_dict(c: ColisEchange, user) -> dict:
    s = commandes.suivi(c.order_id)
    recu = c.destinataire_id == getattr(user, "pk", None)
    d = {
        "id": str(c.pk),
        "ref": c.ref,
        "origine": c.origine,
        "sens": "recu" if recu else "envoye",
        "de": c.payeur_prenom,
        "pour": c.destinataire_prenom,
        "titre": c.titre,
        "dessin": "" if (c.surprise and recu) or not c.product_id else pont.image(c.product_id),
        "articles": c.articles,
        "frais": c.frais,
        "qui": c.qui,
        "relais": c.relais_nom,
        "etat": ColisEchange.Etat.RETIRE if s["remisLe"] and c.etat == ColisEchange.Etat.ACCEPTE else c.etat,
        "expedie": s["expedie"],
        "joursGarde": s["joursGarde"],
        "retenue": c.retenue,
        "rembourse": c.rembourse,
        "le": ms(c.cree_le),
    }
    if c.mot:
        d["mot"] = c.mot
    return d


def repondre_colis(user, id_, accepte: bool) -> dict:
    """Le destinataire accepte, ou refuse : sans frais avant l'expédition, sinon retenue (regles.refus_colis) ; le
    payeur est remboursé sur son moyen."""
    with transaction.atomic():
        c = ColisEchange.objects.select_for_update().filter(pk=_pk_ref(id_), destinataire=user).first()
        if c is None:
            raise introuvable("Colis introuvable.")
        if c.etat != ColisEchange.Etat.A_ACCEPTER:
            raise conflit("state_changed", "Ce colis a déjà une réponse.", {"etat": c.etat})
        if accepte:
            c.etat = ColisEchange.Etat.ACCEPTE
            c.save(update_fields=["etat"])
        else:
            s = commandes.suivi(c.order_id)
            r = regles.refus_colis(
                articles=c.articles, frais=c.frais, qui=c.qui, expedie=s["expedie"], jours_garde=s["joursGarde"], g=parametres.garde()
            )
            c.etat, c.retenue, c.rembourse = ColisEchange.Etat.REFUSE, r["retenue"], r["rembourse"]
            c.save(update_fields=["etat", "retenue", "rembourse"])
            commandes.rembourser(
                moyen=c.moyen,
                reference=c.reference_paiement or f"ECH-{c.pk}",
                montant=r["rembourse"],
                numero=dechiffrer(c.numero_chiffre) if c.numero_chiffre else "",
            )
            commandes.appeler("apps.pickup.services", "annuler_commande_echange", c.order_id, motif="refus du destinataire")
            commandes.notifier(c.payeur, "Colis refusé", f"{c.destinataire_prenom} a refusé le colis. Tu es remboursé.", "/listes")
    return colis_dict(c, user)


# ── Proches et échanges ────────────────────────────────────────────────────────────────────────────────


def _proches_lies(user) -> list:
    return commandes.appeler("apps.diaspora.services", "proches_lies", user, defaut=[]) or []


def _proche_dict(proche, numero_masque: str, lie: bool) -> dict:
    relais = commandes.relais_habituel(proche)
    liste = ListeEnvies.objects.filter(client=proche, code__isnull=False, partage_jusqua__gt=timezone.now()).order_by("-partage_le").first()
    info = None
    if liste is not None:
        ids = ids_articles(liste)
        info = {"code": liste.code, "nom": liste.nom, "remiseLe": ms(liste.remise_le), "offerts": len(offerts(liste)), "articles": len(ids)}
    return {
        "id": str(proche.pk),
        "prenom": proche.first_name or "",
        "numeroMasque": numero_masque,
        "quartier": relais.quartier if relais else None,
        "lie": lie,
        "anniversaire": None,
        "liste": info,
    }


def proches(user) -> list[dict]:
    lies = {u.pk: u for u in _proches_lies(user)}
    vus = {}
    for pc in ProcheConnu.objects.filter(client=user).select_related("proche"):
        vus[pc.proche_id] = _proche_dict(pc.proche, pc.numero_masque, pc.proche_id in lies)
    for pk, u in lies.items():
        if pk not in vus:
            vus[pk] = _proche_dict(u, "", True)
    return list(vus.values())


def chercher_proche(user, numero: str) -> dict:
    """Prénom et quartier du relais d'un compte BelivaY trouvé par son numéro ; jamais le numéro complet ni
    l'adresse. RECHERCHES_PAR_JOUR recherches par 24 h au plus (anti-annuaire)."""
    n = numero_local(numero)
    if not n or len(n) != 9 or not n.startswith("6"):
        return {"ok": False, "raison": "numero"}
    if RechercheProche.objects.filter(client=user, le__gte=timezone.now() - timedelta(days=1)).count() >= RECHERCHES_PAR_JOUR:
        raise ErreurClient(status.HTTP_429_TOO_MANY_REQUESTS, "throttled", "Trop de recherches aujourd'hui. Réessaie demain.")
    RechercheProche.objects.create(client=user)
    trouve = commandes.client_par_numero(n)
    if trouve is not None and trouve.pk == user.pk:
        return {"ok": False, "raison": "moi"}
    if trouve is None:
        return {"ok": False, "raison": "inconnu"}
    pc, _ = ProcheConnu.objects.get_or_create(client=user, proche=trouve, defaults={"numero_masque": masquer_numero(n)})
    return {"ok": True, "proche": _proche_dict(trouve, pc.numero_masque, trouve.pk in {u.pk for u in _proches_lies(user)})}


def _objet_existe(user, type_: str, id_: str) -> bool:
    if type_ == "liste":
        try:
            liste_du_client(user, id_)
        except ErreurClient:
            return False
        return True
    return bool(commandes.appeler("apps.extras.services", "cotisation_de", user, id_))


def envoyer_aux_proches(user, type_: str, id_: str, ids: list[str]) -> dict:
    """Une notification dans l'application de chaque proche, une fois par objet."""
    if not _objet_existe(user, type_, id_):
        raise introuvable()
    connus = {
        str(u.pk): u for u in [pc.proche for pc in ProcheConnu.objects.filter(client=user).select_related("proche")] + _proches_lies(user)
    }
    n = 0
    for pid in dict.fromkeys(str(x) for x in ids):
        proche = connus.get(pid)
        if proche is None:
            continue
        _, cree = EnvoiEchange.objects.get_or_create(client=user, objet=type_, objet_id=str(id_), proche=proche)
        if cree:
            n += 1
            quoi = "sa liste d'envies" if type_ == "liste" else "une cotisation"
            commandes.notifier(proche, f"{user.first_name} t'envoie {quoi}", "Ouvre-la dans BelivaY.", "/listes")
    return {"envoyes": n}


def rappeler_invites(user, id_) -> dict:
    liste = liste_du_client(user, id_)
    donneurs = set(
        ColisEchange.objects.filter(liste=liste, payeur__isnull=False, etat_paiement__in=PAIEMENTS_VIVANTS).values_list(
            "payeur_id", flat=True
        )
    )
    invites = [
        e
        for e in EnvoiEchange.objects.filter(client=user, objet="liste", objet_id=str(liste.pk)).select_related("proche")
        if e.proche_id not in donneurs
    ]
    if not invites:
        return {"ok": False, "raison": "personne"}
    dernier = max((ms(e.rappele_le) or 0 for e in invites), default=0)
    ok, prochain = regles.rappel_possible(dernier, maintenant_ms(), RAPPEL_ECART_JOURS * 86_400_000)
    if not ok:
        raise ErreurClient(
            status.HTTP_429_TOO_MANY_REQUESTS, "too_early", "Un rappel est déjà parti : réessaie plus tard.", {"prochain": prochain}
        )
    maintenant = timezone.now()
    for e in invites:
        e.rappele_le = maintenant
        e.save(update_fields=["rappele_le"])
        commandes.notifier(
            e.proche, f"La liste de {user.first_name}", f"{user.first_name} te rappelle sa liste « {liste.nom} ».", "/listes"
        )
    return {"ok": True, "n": len(invites)}


def suivre_liste(user, code: str, suivre: bool, rappel: int | None) -> None:
    liste = ListeEnvies.objects.filter(code=str(code)).first()
    if liste is None:
        raise introuvable("Liste introuvable.")
    if not suivre:
        ListeSuivie.objects.filter(client=user, liste=liste).delete()
        return
    if rappel is not None and rappel not in RAPPELS_JOURS:
        raise refus("rappel", "Rappel non proposé.", {"permis": list(RAPPELS_JOURS)})
    ListeSuivie.objects.update_or_create(client=user, liste=liste, defaults={"rappel": rappel})


def remercier(user, ref: str, texte: str) -> None:
    """Merci à qui a offert (e-mail pour un invité sans compte) ; « tous » pour une cotisation."""
    try:
        order_id = pont.id_commande(ref)
    except ValueError:
        raise introuvable() from None
    colis = ColisEchange.objects.filter(order_id=order_id, destinataire=user).first()
    if colis is None:
        raise introuvable("Cadeau introuvable.")
    pour = "tous" if colis.origine == ColisEchange.Origine.COTISATION else colis.payeur_prenom
    Merci.objects.update_or_create(auteur=user, ref=colis.ref, defaults={"pour": pour, "texte": texte.strip()[:500]})
    if colis.payeur is not None:
        commandes.notifier(colis.payeur, f"Merci de {user.first_name}", texte.strip()[:120], "/listes")
    elif colis.payeur_email_chiffre:
        send_mail(f"Merci de {user.first_name}", texte.strip(), None, [dechiffrer(colis.payeur_email_chiffre)])
    if colis.origine == ColisEchange.Origine.COTISATION:
        commandes.appeler("apps.extras.services", "remercier_participants", colis.order_id, user, texte)


def echanges(user, request) -> dict:
    from apps.client_core.pagination import page

    qs = ColisEchange.objects.filter(Q(payeur=user) | Q(destinataire=user)).exclude(etat_paiement=ColisEchange.Paiement.REFUSE)
    colis, suivant = page(request, qs, taille=20)
    suivies = [
        {
            "code": s.liste.code,
            "prenom": prenom_destinataire(s.liste),
            "nom": s.liste.nom,
            "remiseLe": ms(s.liste.remise_le),
            "rappel": s.rappel,
            "depuis": ms(s.depuis),
        }
        for s in ListeSuivie.objects.filter(client=user).select_related("liste", "liste__client")
    ]
    envois = [
        {
            "objet": e.objet,
            "id": e.objet_id,
            "proche": str(e.proche_id),
            "prenom": e.proche.first_name,
            "le": ms(e.le),
            "rappeleLe": ms(e.rappele_le),
        }
        for e in EnvoiEchange.objects.filter(client=user).select_related("proche")
    ]
    mes_refs = [c.ref for c in ColisEchange.objects.filter(Q(payeur=user) | Q(destinataire=user)).exclude(order_id__isnull=True)]
    mercis = [
        {"ref": m.ref, "de": m.auteur.first_name, "pour": m.pour, "texte": m.texte, "le": ms(m.le)}
        for m in Merci.objects.filter(Q(auteur=user) | Q(ref__in=mes_refs)).select_related("auteur")
    ]
    return {
        "proches": proches(user),
        "suivies": suivies,
        "envois": envois,
        "mercis": mercis,
        "colis": [colis_dict(c, user) for c in colis],
        "maintenant": maintenant_ms(),
        "next_cursor": suivant,
    }


# ── Le panier payé pour un proche (Cameroun) ───────────────────────────────────────────────────────────


def envoyer_panier_a(user, c: dict) -> dict:
    """envoyerPanierA : le panier du client payé pour un proche, au relais du proche ; qui paie la livraison
    (destinatairePeutPayer refait ici) ; Mobile Money. Idempotent (la vue)."""
    try:
        from apps.cart import services as panier_srv
    except ImportError:
        raise ErreurClient(
            status.HTTP_501_NOT_IMPLEMENTED, "a_finir", "Le panier serveur n'est pas installé.", {"manque": "application apps.cart"}
        ) from None
    panier = panier_srv.panier_de(user)
    lignes_db = list(panier_srv.lignes_actives(panier))
    produits = pont.produits([lg.product_id for lg in lignes_db])
    lignes = [
        (lg.product_id, lg.qte, produits[lg.product_id].prix)
        for lg in lignes_db
        if lg.product_id in produits and produits[lg.product_id].actif
    ]
    if not lignes:
        return {"ok": False, "raison": "vide"}
    relais = commandes.relais_par_texte(c["relais"])
    if relais is None or not relais.actif:
        return {"ok": False, "raison": "relais"}
    f = commandes.frais("relais", lignes)
    sous_total, frais_liv = f.sous_total, f.total - f.sous_total
    qui = c.get("qui_paie_livraison") or c.get("qui") or regles.PAYEUR
    g = parametres.garde()
    if qui == regles.DESTINATAIRE and not regles.destinataire_peut_payer(articles=sous_total, frais=frais_liv, g=g).ok:
        return {"ok": False, "raison": "garantie"}
    rep = regles.repartition(articles=sous_total, frais=frais_liv, qui=qui, g=g)
    proche = None
    if c.get("proche"):
        connus = {str(pc.proche_id): pc.proche for pc in ProcheConnu.objects.filter(client=user).select_related("proche")}
        connus.update({str(u.pk): u for u in _proches_lies(user)})
        proche = connus.get(str(c["proche"]))
    premier = produits[lignes[0][0]]
    with transaction.atomic():
        colis = ColisEchange.objects.create(
            origine=ColisEchange.Origine.PANIER,
            payeur=user,
            payeur_prenom=user.first_name or "",
            destinataire=proche,
            destinataire_prenom=str(c["prenom"]).strip()[:80],
            product_id=premier.id,
            titre=premier.titre if len(lignes) == 1 else f"{premier.titre} +{len(lignes) - 1}",
            articles=sous_total,
            frais=frais_liv,
            qui=qui,
            relay_id=relais.id,
            relais_nom=relais.nom,
            mot=str(c.get("mot") or "").strip()[:200],
            moyen="mobile",
            moyen_affiche=masquer_numero(c["moyen"]),
            numero_chiffre=chiffrer(numero_local(c["moyen"])),
            total=rep["payeurMaintenant"],
            etat=ColisEchange.Etat.A_ACCEPTER if qui == regles.DESTINATAIRE and proche is not None else ColisEchange.Etat.ACCEPTE,
        )
        r = commandes.payer(
            moyen="mobile", montant=colis.total, reference=f"ECH-{colis.pk}", numero=numero_local(c["moyen"]), motif="Panier pour un proche"
        )
        if r.statut == "refuse":
            raise ErreurClient(
                status.HTTP_402_PAYMENT_REQUIRED,
                "paiement_refuse",
                "Paiement refusé par l'opérateur : rien n'a été débité.",
                {"motif": r.motif},
            )
        payee = r.statut == "reussi"
        colis.reference_paiement = r.reference or f"ECH-{colis.pk}"
        colis.etat_paiement = ColisEchange.Paiement.PAYE if payee else ColisEchange.Paiement.ATTENTE
        colis.order_id = commandes.creer_commande(
            destinataire=proche or user,
            lignes=lignes,
            mode="relais",
            relay_id=relais.id,
            payee=payee,
            livraison=frais_liv if qui == regles.PAYEUR else 0,
            moyen="mobile",
            payeur={
                "prenom": user.first_name,
                "pour": colis.destinataire_prenom,
                "qui": qui,
                "fraisRemise": rep["destinataireALaRemise"],
                "garantie": rep["garantie"],
            },
        )
        colis.save()
        for lg in lignes_db:
            lg.delete()
    if proche is not None:
        commandes.notifier(proche, f"{user.first_name} t'envoie un colis", "Un colis payé pour toi arrive à ton relais.", "/listes")
    return {"ok": True, "ref": colis.ref}
