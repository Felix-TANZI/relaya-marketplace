# backend/apps/extras/services.py
# Modules CL-15 (DP-54) : cotisations (FF-EX02), mises de côté (FF-EX03), ventes flash (FF-FLASH), rentrée (FF-EX01),
# panier famille (FF-EX05), reprise d'un téléphone (FF-EX04). Règles pures : regles.py et apps.wishlists.regles
# (objectif d'une cotisation, qui paie la livraison). Paiements, frais et création de commande : apps.wishlists.commandes
# (outils communs du groupe « échanges »).
#
# Fonctions exposées aux autres applications du kit :
#   offre_flash(product_id) → dict | None ; offre_flash_active(product_id) → bool ; vendre_flash(product_id, qte)
#   cotisation_article_info(code_liste, product_id), cotisation_pour_article(liste, product_id, prenom, relais),
#   cotisation_de(user, id) — pour apps.wishlists
#   confirmer_paiement(reference) — webhook Mobile Money (participation, versement)

import json
import secrets
from datetime import timedelta

from django.apps import apps as registre_apps
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status

from apps.client_core import parametres, pont
from apps.client_core.chiffrement import chiffrer, dechiffrer
from apps.client_core.erreurs import ErreurClient, conflit, interdit, introuvable, refus
from apps.client_core.masquage import masquer_numero, numero_local
from apps.client_core.temps import depuis_ms, maintenant_ms, ms
from apps.wishlists import commandes
from apps.wishlists import regles as rechanges

from . import regles
from .models import (
    ArticleFamille,
    ArticleRentree,
    Cotisation,
    DestinataireFamille,
    Ecole,
    ListePapier,
    ListeRentree,
    MiseDeCote,
    ModeleFamille,
    ModeleReprise,
    OffreFlash,
    PaiementFamille,
    PanierFamille,
    Participation,
    SaisonRentree,
    Troc,
    Versement,
)

# PARAMÈTRE À AJOUTER AU REGISTRE : COT-HAUSSE-MAX (hausse du prix livré prise par BelivaY quand l'objectif est
# atteint : 5 % au plus ; au-delà, l'organisateur choisit de compléter ou de rembourser)
COT_HAUSSE_MAX_POUR_CENT = 5
# PARAMÈTRE À AJOUTER AU REGISTRE : MDC-VERSEMENT-MIN (10 000 F au moins par versement)
MDC_VERSEMENT_MIN = 10_000
# PARAMÈTRE À AJOUTER AU REGISTRE : MDC-AVANT-RENTREE-J (dernier versement d'une liste de rentrée : 7 jours avant)
MDC_AVANT_RENTREE = 7
# PARAMÈTRE À AJOUTER AU REGISTRE : FAM-CLASSES-POIDS (S ≤ 5 kg, M ≤ 15 kg, L ≤ 30 kg ; au-delà le panier se partage)
FAM_CLASSES_KG = (5, 15, 30)
# PARAMÈTRE À AJOUTER AU REGISTRE : TRC-MIN-POUR-CENT (estimation minimale d'une reprise : 78 % du maximum)
TRC_MIN_POUR_CENT = 78


def _entier_id(x) -> int:
    try:
        return int(str(x).split("-")[-1])
    except ValueError:
        raise introuvable() from None


def _produit_actif(product_id):
    try:
        p = pont.produit(int(product_id))
    except (TypeError, ValueError):
        p = None
    if p is None or not p.actif:
        raise introuvable("Article introuvable.")
    return p


def _payer_mobile_ou_carte(*, moyen_texte: str, montant: int, reference: str, motif: str, carte: bool = False, jeton: str = ""):
    moyen = "carte" if carte else commandes.moyen_de(moyen_texte)
    r = commandes.payer(
        moyen=moyen, montant=montant, reference=reference, jeton=jeton or moyen_texte, numero=numero_local(moyen_texte), motif=motif
    )
    if r.statut == "refuse":
        raise ErreurClient(
            status.HTTP_402_PAYMENT_REQUIRED, "paiement_refuse", "Paiement refusé : rien n'a été débité.", {"motif": r.motif}
        )
    return moyen, r


def _moyen_affiche(moyen: str, texte: str) -> str:
    return (
        masquer_numero(texte)
        if moyen == "mobile"
        else (texte if texte and not texte.lower().startswith(("tok_", "carte_")) else "Carte")[:60]
    )


# ══ Cotisations (FF-EX02) ═════════════════════════════════════════════════════════════════════════════


def _reuni(c: Cotisation, avec_attente: bool = False) -> int:
    etats = [Participation.Paiement.PAYE] + ([Participation.Paiement.ATTENTE] if avec_attente else [])
    return c.participations.filter(etat_paiement__in=etats).aggregate(n=Sum("montant"))["n"] or 0


def _echoir(c: Cotisation) -> Cotisation:
    """Date dépassée sans objectif : chacun est remboursé sur son moyen, sans frais (frais de carte rendus)."""
    if c.etat == Cotisation.Etat.OUVERTE and c.jusqua < timezone.now():
        with transaction.atomic():
            c.etat, c.fin = Cotisation.Etat.ECHUE, c.jusqua
            c.save(update_fields=["etat", "fin"])
            _rembourser_participants(c)
    return c


def _rembourser_participants(c: Cotisation) -> None:
    for pa in c.participations.filter(etat_paiement=Participation.Paiement.PAYE):
        commandes.rembourser(
            moyen=pa.moyen,
            reference=pa.reference,
            montant=pa.montant + pa.frais,
            numero=dechiffrer(pa.numero_chiffre) if pa.numero_chiffre else "",
        )
        pa.etat_paiement = Participation.Paiement.REMBOURSE
        pa.save(update_fields=["etat_paiement"])


def cotisation_dict(c: Cotisation, public: bool = False) -> dict:
    parts = []
    for pa in c.participations.exclude(etat_paiement=Participation.Paiement.ATTENTE).order_by("id"):
        cache = public and pa.discret
        parts.append(
            {
                "id": str(pa.pk),
                "prenom": "" if cache else pa.prenom,
                "montant": pa.montant,
                "frais": pa.frais,
                "le": ms(pa.le),
                "discret": pa.discret,
                "moyen": "" if public else pa.moyen_affiche,
                "mot": "" if cache else pa.mot,
                "organisateur": pa.organisateur,
            }
        )
    return {
        "id": str(c.pk),
        "code": c.code,
        "nom": c.nom,
        "occasion": c.occasion,
        "p": str(c.product_id),
        "titre": c.titre,
        "dessin": pont.image(c.product_id),
        "prixLivre": c.prix_livre,
        "objectif": c.objectif,
        "beneficiaire": c.beneficiaire,
        "relais": c.relais_nom,
        "organisateur": c.organisateur_nom,
        "creeLe": ms(c.cree_le),
        "jusqua": ms(c.jusqua),
        "participations": parts,
        "etat": c.etat,
        "hausse": {"prix": c.hausse_prix, "ecart": c.hausse_ecart} if c.etat == Cotisation.Etat.HAUSSE else None,
        "ref": c.ref,
        "fin": ms(c.fin),
        "qui": c.qui,
        "frais": c.frais,
        "liste": {"code": c.liste_code, "p": str(c.liste_product_id)} if c.liste_code else None,
    }


def _nom_court(user) -> str:
    return f"{user.first_name} {user.last_name[:1]}.".strip() if user.last_name else user.first_name


def _nouvelle_cotisation(
    *,
    organisateur,
    organisateur_nom: str,
    nom: str,
    occasion: str,
    product_id: int,
    beneficiaire: str,
    relais,
    jusqua,
    qui: str,
    beneficiaire_user=None,
    liste_code: str = "",
) -> Cotisation:
    from apps.wishlists.services import nouveau_code

    p = _produit_actif(product_id)
    frais = commandes.livraison_seule("relais", [(p.id, 1, p.prix)])
    if qui == rechanges.DESTINATAIRE and not rechanges.destinataire_peut_payer(articles=p.prix, frais=frais, g=parametres.garde()).ok:
        qui = rechanges.PAYEUR  # la garantie ne couvre pas : les participants paient la livraison (echanges.ts)
    duree_max = timezone.now() + timedelta(days=parametres.entier("COT-DUREE-MAX"))
    return Cotisation.objects.create(
        code=nouveau_code(lambda x: Cotisation.objects.filter(code=x).exists()),
        organisateur=organisateur,
        organisateur_nom=organisateur_nom,
        nom=nom.strip()[:160],
        occasion=occasion[:40],
        product_id=p.id,
        titre=p.titre,
        prix=p.prix,
        frais=frais,
        prix_livre=p.prix + frais,
        objectif=rechanges.objectif_cotisation(prix=p.prix, frais=frais, qui=qui, frais_pour_cent=parametres.nombres("COT-FRAIS")[0]),
        qui=qui,
        beneficiaire=beneficiaire.strip()[:80],
        beneficiaire_user=beneficiaire_user,
        relay_id=relais.id,
        relais_nom=relais.nom,
        jusqua=min(jusqua, duree_max),
        liste_code=liste_code,
        liste_product_id=p.id if liste_code else None,
    )


def creer_cotisation(user, d: dict) -> Cotisation:
    relais = commandes.relais_par_texte(d["relais"])
    if relais is None:
        raise refus("relais", "Relais introuvable.")
    jusqua = depuis_ms(d["jusqua"])
    if jusqua <= timezone.now():
        raise refus("date", "La date limite doit être dans le futur.")
    return _nouvelle_cotisation(
        organisateur=user,
        organisateur_nom=_nom_court(user),
        nom=d["nom"],
        occasion=d["occasion"],
        product_id=d["p"],
        beneficiaire=d["beneficiaire"],
        relais=relais,
        jusqua=jusqua,
        qui=d.get("qui") or rechanges.PAYEUR,
    )


def cotisations(user, request) -> dict:
    from apps.client_core.pagination import page

    qs = Cotisation.objects.filter(Q(organisateur=user) | Q(beneficiaire_user=user) | Q(participations__client=user)).distinct()
    elements, suivant = page(request, qs, taille=20)
    return {"liste": [cotisation_dict(_echoir(c)) for c in elements], "maintenant": maintenant_ms(), "next_cursor": suivant}


def cotisation_publique(code: str) -> dict | None:
    c = Cotisation.objects.filter(code=str(code)).first()
    return cotisation_dict(_echoir(c), public=True) if c else None


def cotisation_de(user, id_) -> Cotisation | None:
    try:
        return Cotisation.objects.filter(organisateur=user, pk=int(id_)).first()
    except ValueError:
        return None


def participer(code: str, p: dict, user=None) -> dict:
    """Participation libre dès COT-PART-MIN (ou ce qui manque), au plus ce qui manque ; Mobile Money sans frais ou
    carte (+ PAY-CARTE-FRAIS) ; objectif atteint : la commande part au prix figé."""
    with transaction.atomic():
        c = Cotisation.objects.select_for_update().filter(code=str(code)).first()
        if c is None:
            raise introuvable("Cotisation introuvable.")
        _echoir(c)
        if c.etat != Cotisation.Etat.OUVERTE:
            return {"ok": False, "raison": "fermee"}
        manque = c.objectif - _reuni(c, avec_attente=True)
        montant = int(p["montant"])
        if montant < min(parametres.entier("COT-PART-MIN"), manque) or montant > manque:
            return {"ok": False, "raison": "montant"}
        carte = bool(p.get("carte"))
        frais = commandes.service_carte(montant) if carte else 0
        pa = Participation.objects.create(
            cotisation=c,
            client=user if user is not None and user.is_authenticated else None,
            prenom=p["prenom"].strip()[:80],
            montant=montant,
            frais=frais,
            discret=bool(p.get("discret")),
            mot=(p.get("mot") or "").strip()[:200],
            organisateur=user is not None and user.is_authenticated and user.pk == c.organisateur_id,
            etat_paiement=Participation.Paiement.ATTENTE,
        )
    try:
        moyen, r = _payer_mobile_ou_carte(
            moyen_texte=p["moyen"],
            montant=montant + frais,
            reference=f"COT-{pa.pk}",
            motif=f"Cotisation {c.nom}",
            carte=carte,
            jeton=p.get("jeton") or "",
        )
    except ErreurClient:
        pa.delete()  # refusé : rien n'est débité, la place est rendue
        raise
    pa.moyen, pa.moyen_affiche = moyen, _moyen_affiche(moyen, p["moyen"])
    pa.numero_chiffre = chiffrer(numero_local(p["moyen"])) if moyen == "mobile" else None
    pa.reference = r.reference or f"COT-{pa.pk}"
    pa.save()
    if r.statut == "reussi":
        _participation_payee(pa)
    c.refresh_from_db()
    return {"ok": True, "cotisation": cotisation_dict(c)}


def _participation_payee(pa: Participation) -> None:
    with transaction.atomic():
        pa.etat_paiement = Participation.Paiement.PAYE
        pa.save(update_fields=["etat_paiement"])
        c = Cotisation.objects.select_for_update().get(pk=pa.cotisation_id)
        if c.etat == Cotisation.Etat.OUVERTE and _reuni(c) >= c.objectif:
            p = pont.produit(c.product_id)
            actuel = (p.prix if p else c.prix) + commandes.livraison_seule("relais", [(c.product_id, 1, p.prix if p else c.prix)])
            if actuel * 100 > c.prix_livre * (100 + COT_HAUSSE_MAX_POUR_CENT):
                c.etat, c.hausse_prix, c.hausse_ecart = Cotisation.Etat.HAUSSE, actuel, actuel - c.prix_livre
                c.save(update_fields=["etat", "hausse_prix", "hausse_ecart"])
                commandes.notifier(
                    c.organisateur, "Objectif atteint, mais le prix a monté", "Choisis : compléter ou rembourser.", "/cotisations"
                )
            else:
                _commander_cotisation(c)


def _commander_cotisation(c: Cotisation) -> None:
    """La commande part vers le relais du bénéficiaire, au prix du jour (BelivaY prend l'écart jusqu'à
    COT-HAUSSE-MAX ; au-delà, l'organisateur a complété)."""
    p = pont.produit(c.product_id)
    prix = p.prix if p else c.prix
    destinataire = c.beneficiaire_user or c.organisateur
    order_id = commandes.creer_commande(
        destinataire=destinataire,
        lignes=[(c.product_id, 1, prix)],
        mode="relais",
        relay_id=c.relay_id,
        payee=True,
        livraison=c.frais if c.qui == rechanges.PAYEUR else 0,
        moyen="mobile",
        payeur={"prenom": c.organisateur_nom, "cotisation": c.code},
    )
    c.etat, c.order_id, c.fin = Cotisation.Etat.ATTEINTE, order_id, timezone.now()
    c.save(update_fields=["etat", "order_id", "fin"])
    commandes.appeler(
        "apps.wishlists.services",
        "enregistrer_colis",
        origine="cotisation",
        payeur=c.organisateur,
        payeur_prenom=c.organisateur_nom,
        destinataire=c.beneficiaire_user,
        destinataire_prenom=c.beneficiaire,
        code_liste=c.liste_code,
        product_id=c.product_id,
        titre=c.titre,
        articles=prix,
        frais=c.frais,
        qui=c.qui,
        relay_id=c.relay_id,
        relais_nom=c.relais_nom,
        total=c.objectif,
        order_id=order_id,
        etat="a_accepter" if c.qui == rechanges.DESTINATAIRE and c.beneficiaire_user else "accepte",
    )


def decider_hausse(user, id_, choix: str, moyen: str | None) -> dict:
    with transaction.atomic():
        c = Cotisation.objects.select_for_update().filter(organisateur=user, pk=_entier_id(id_)).first()
        if c is None:
            raise introuvable()
        if c.etat != Cotisation.Etat.HAUSSE:
            raise conflit("state_changed", "Aucune décision n'est attendue.")
        if choix == "completer":
            if not moyen:
                raise refus("moyen", "Choisis comment payer l'écart.")
            _payer_mobile_ou_carte(
                moyen_texte=moyen, montant=c.hausse_ecart, reference=f"COTH-{c.pk}", motif="Écart de prix d'une cotisation"
            )
            _commander_cotisation(c)
        else:
            c.etat, c.fin = Cotisation.Etat.REMBOURSEE, timezone.now()
            c.save(update_fields=["etat", "fin"])
            _rembourser_participants(c)
    return cotisation_dict(c)


def cotisation_article_info(code_liste: str, product_id: int) -> dict | None:
    c = (
        Cotisation.objects.filter(liste_code=str(code_liste), liste_product_id=int(product_id))
        .exclude(etat__in=(Cotisation.Etat.ECHUE, Cotisation.Etat.REMBOURSEE))
        .order_by("-id")
        .first()
    )
    if c is None:
        return None
    _echoir(c)
    return {"code": c.code, "reuni": _reuni(c), "objectif": c.objectif, "etat": c.etat, "ref": c.ref, "fin": ms(c.fin)}


def cotisation_pour_article(liste, product_id: int, prenom: str, relais) -> dict:
    """La cotisation d'un article cher d'une liste (créée au besoin) : date limite = la remise, entre 3 et
    COT-DUREE-MAX jours."""
    deja = Cotisation.objects.filter(liste_code=liste.code, liste_product_id=product_id, etat=Cotisation.Etat.OUVERTE).first()
    if deja is not None and deja.jusqua > timezone.now():
        return {"ok": True, "code": deja.code}
    maintenant = timezone.now()
    fin = max(
        maintenant + timedelta(days=3),
        min(liste.remise_le or maintenant + timedelta(days=30), maintenant + timedelta(days=parametres.entier("COT-DUREE-MAX"))),
    )
    nom = liste.nom.lower()
    occasion = "Anniversaire" if "anniv" in nom else "Naissance" if "naiss" in nom else "Mariage" if "mariage" in nom else "Autre"
    p = _produit_actif(product_id)
    c = _nouvelle_cotisation(
        organisateur=None,
        organisateur_nom=prenom,
        nom=f"{p.titre} pour {prenom}",
        occasion=occasion,
        product_id=product_id,
        beneficiaire=prenom,
        relais=relais,
        jusqua=fin,
        qui=rechanges.PAYEUR,
        beneficiaire_user=liste.client,
        liste_code=liste.code,
    )
    return {"ok": True, "code": c.code}


# ══ Mises de côté (FF-EX03) ═══════════════════════════════════════════════════════════════════════════


def regles_cote() -> regles.ReglesCote:
    forfait = parametres.nombres("MDC-FORFAIT")
    return regles.ReglesCote(
        minimum=parametres.entier("MDC-PRIX-MIN"),
        acompte_pour_cent=parametres.entier("MDC-ACOMPTE"),
        versement_min=MDC_VERSEMENT_MIN,
        jours_max=parametres.entier("MDC-DUREE"),
        grace=parametres.entier("MDC-GRACE"),
        forfait_pour_cent=forfait[0],
        forfait_max=forfait[1],
        avant_rentree=MDC_AVANT_RENTREE,
    )


def _payes(m: MiseDeCote) -> int:
    return sum(v.du for v in m.versements.all() if v.paye_le)


def _annuler_cote(m: MiseDeCote, le=None) -> None:
    """Versements rendus moins le forfait (au vendeur qui a gardé l'article)."""
    a = regles.annulation_cote(_payes(m), m.prix_livre, regles_cote())
    m.etat, m.annulee_le, m.rembourse, m.forfait = MiseDeCote.Etat.ANNULEE, le or timezone.now(), a["rembourse"], a["forfait"]
    m.save(update_fields=["etat", "annulee_le", "rembourse", "forfait"])
    commandes.rembourser(
        moyen=commandes.moyen_de(m.moyen),
        reference=f"MDC-{m.pk}",
        montant=a["rembourse"],
        numero=dechiffrer(m.numero_chiffre) if m.numero_chiffre else "",
    )


def _verifier_grace(m: MiseDeCote) -> MiseDeCote:
    if m.etat == MiseDeCote.Etat.EN_COURS:
        grace = timedelta(days=regles_cote().grace)
        retard = next((v for v in m.versements.all() if not v.paye_le and v.le + grace < timezone.now()), None)
        if retard is not None:
            _annuler_cote(m, le=retard.le + grace)
    return m


def mise_dict(m: MiseDeCote) -> dict:
    return {
        "id": str(m.pk),
        "p": str(m.product_id) if m.product_id else "",
        "titre": m.titre,
        "dessin": pont.image(m.product_id) if m.product_id else "",
        "prix": m.prix,
        "livraison": m.livraison,
        "prixLivre": m.prix_livre,
        "rythme": m.rythme,
        "versements": [{"n": v.n, "du": v.du, "le": ms(v.le), "payeLe": ms(v.paye_le)} for v in m.versements.all()],
        "creeLe": ms(m.cree_le),
        "moyen": m.moyen,
        "etat": m.etat,
        "ref": f"BLV-{m.order_id}" if m.order_id else None,
        "annulee": {"le": ms(m.annulee_le), "rembourse": m.rembourse, "forfait": m.forfait} if m.etat == MiseDeCote.Etat.ANNULEE else None,
        "liste": m.liste,
    }


def mises_de_cote(user, request) -> dict:
    from apps.client_core.pagination import page

    elements, suivant = page(request, MiseDeCote.objects.filter(client=user).prefetch_related("versements"), taille=20)
    return {"liste": [mise_dict(_verifier_grace(m)) for m in elements], "maintenant": maintenant_ms(), "next_cursor": suivant}


def _ouvrir_mise(user, *, product_id, titre, prix, livraison, rythme, moyen, plan, liste=None) -> MiseDeCote:
    relais = commandes.relais_habituel(user)
    with transaction.atomic():
        m = MiseDeCote.objects.create(
            client=user,
            product_id=product_id,
            titre=titre,
            prix=prix,
            livraison=livraison,
            prix_livre=prix + livraison,
            rythme=rythme,
            moyen=masquer_numero(moyen) if commandes.moyen_de(moyen) == "mobile" else moyen[:60],
            numero_chiffre=chiffrer(numero_local(moyen)) if commandes.moyen_de(moyen) == "mobile" else None,
            relay_id=relais.id if relais else None,
            liste=liste,
        )
        for i, v in enumerate(plan, start=1):
            Versement.objects.create(mise=m, n=i, du=v["du"], le=depuis_ms(v["le"]))
    _payer_versement(m, m.versements.get(n=1), moyen)
    return m


def creer_mise_de_cote(user, product_id, rythme: str, moyen: str) -> MiseDeCote:
    p = _produit_actif(product_id)
    livraison = commandes.livraison_seule("relais", [(p.id, 1, p.prix)])
    r = regles_cote()
    if p.prix + livraison < r.minimum:
        raise refus("prix_min", "Cet article est trop petit pour une mise de côté.", {"minimum": r.minimum})
    plan = regles.plan_cote(p.prix + livraison, rythme, maintenant_ms(), r)
    return _ouvrir_mise(user, product_id=p.id, titre=p.titre, prix=p.prix, livraison=livraison, rythme=rythme, moyen=moyen, plan=plan)


def creer_mise_de_cote_liste(user, liste_id, exclus: list, equivalents: list, rythme: str, moyen: str) -> MiseDeCote:
    lr, lignes = _lignes_rentree(liste_id, exclus, equivalents)
    f = commandes.frais("relais", lignes)
    saison = lr.saison
    plan = regles.plan_cote_rentree(f.total, rythme, maintenant_ms(), ms(saison.rentree_le), regles_cote())
    if plan is None:
        raise refus("trop_tard", "Trop près de la rentrée (ou liste trop petite) : paie en une fois.")
    info = {
        "id": str(lr.pk),
        "classe": lr.classe,
        "ecole": lr.ecole.nom,
        "exclus": list(exclus),
        "equivalents": list(equivalents),
        "articles": len(lignes),
        "rentreeLe": ms(saison.rentree_le),
    }
    return _ouvrir_mise(
        user,
        product_id=None,
        titre=f"Liste {lr.classe} · {lr.ecole.nom}",
        prix=f.sous_total,
        livraison=f.total - f.sous_total,
        rythme=rythme,
        moyen=moyen,
        plan=plan,
        liste=info,
    )


def _payer_versement(m: MiseDeCote, v: Versement, moyen: str) -> None:
    _, r = _payer_mobile_ou_carte(moyen_texte=moyen, montant=v.du, reference=f"MDC-{m.pk}-{v.n}", motif="Mise de côté BelivaY")
    v.reference = r.reference or f"MDC-{m.pk}-{v.n}"
    v.save(update_fields=["reference"])
    if r.statut == "reussi":
        _versement_paye(v)


def _versement_paye(v: Versement) -> None:
    v.paye_le = timezone.now()
    v.save(update_fields=["paye_le"])
    m = v.mise
    if all(x.paye_le for x in m.versements.all()) and m.etat == MiseDeCote.Etat.EN_COURS:
        if m.liste:
            _, lignes = _lignes_rentree(m.liste["id"], m.liste["exclus"], m.liste["equivalents"])
        else:
            lignes = [(m.product_id, 1, m.prix)]
        m.order_id = commandes.creer_commande(
            destinataire=m.client, lignes=lignes, mode="relais", relay_id=m.relay_id, payee=True, livraison=m.livraison, moyen="mobile"
        )
        m.etat = MiseDeCote.Etat.PAYEE
        m.save(update_fields=["order_id", "etat"])


def payer_versement(user, id_, moyen: str) -> MiseDeCote:
    m = MiseDeCote.objects.filter(client=user, pk=_entier_id(id_)).first()
    if m is None:
        raise introuvable()
    _verifier_grace(m)
    if m.etat != MiseDeCote.Etat.EN_COURS:
        raise conflit("state_changed", "Cette mise de côté n'attend plus de versement.", {"etat": m.etat})
    v = m.versements.filter(paye_le__isnull=True).order_by("n").first()
    _payer_versement(m, v, moyen)
    m.moyen = masquer_numero(moyen) if commandes.moyen_de(moyen) == "mobile" else moyen[:60]
    m.save(update_fields=["moyen"])
    m.refresh_from_db()
    return m


def annuler_mise_de_cote(user, id_) -> MiseDeCote:
    m = MiseDeCote.objects.filter(client=user, pk=_entier_id(id_)).first()
    if m is None:
        raise introuvable()
    _verifier_grace(m)
    if m.etat != MiseDeCote.Etat.EN_COURS:
        raise conflit("state_changed", "Cette mise de côté n'est plus en cours.", {"etat": m.etat})
    _annuler_cote(m)
    return m


def confirmer_paiement(reference: str) -> bool:
    """Webhook Mobile Money : une participation (COT-…) ou un versement (MDC-…-n) est payé."""
    pa = Participation.objects.filter(reference=reference, etat_paiement=Participation.Paiement.ATTENTE).first()
    if pa is not None:
        _participation_payee(pa)
        return True
    v = Versement.objects.filter(reference=reference, paye_le__isnull=True).select_related("mise").first()
    if v is not None:
        _versement_paye(v)
        return True
    return False


# ══ Ventes flash (FF-FLASH) ═══════════════════════════════════════════════════════════════════════════


def _modele_promotion():
    try:
        return registre_apps.get_model(getattr(settings, "BELIVAY_MODELES", {}).get("promotion", "catalog.PromotionCampaign"))
    except (LookupError, ValueError):
        return None


def _offres_brutes() -> list[dict]:
    """Offres flash : les PromotionCampaign FLASH approuvées de relaya si le pont les lit, sinon OffreFlash du kit."""
    maintenant = timezone.now()
    fenetre = Q(fin__gt=maintenant - timedelta(hours=24), debut__lt=maintenant + timedelta(hours=48))
    Promo = _modele_promotion()
    if Promo is not None:
        qs = Promo.objects.filter(
            campaign_type="FLASH",
            status="APPROVED",
            ends_at__gt=maintenant - timedelta(hours=24),
            starts_at__lt=maintenant + timedelta(hours=48),
        )
        return [
            {
                "p": x.product_id,
                "prix": x.promo_price_xaf,
                "avant": x.reference_price_xaf,
                "debut": x.starts_at,
                "fin": x.ends_at,
                "stock": max(0, x.stock_reserved - x.stock_claimed),
                "id": f"promo-{x.pk}",
            }
            for x in qs
        ]
    return [
        {
            "p": x.product_id,
            "prix": x.prix,
            "avant": x.avant,
            "debut": x.debut,
            "fin": x.fin,
            "stock": max(0, x.stock - x.vendus),
            "id": f"kit-{x.pk}",
        }
        for x in OffreFlash.objects.filter(fenetre)
    ]


def _valable(o: dict) -> bool:
    """FLASH-REMISE-MIN au moins, FLASH-DUREE-MAX au plus (prix barré = prix vraiment pratiqué avant)."""
    remise_ok = o["avant"] > 0 and (o["avant"] - o["prix"]) * 100 >= parametres.entier("FLASH-REMISE-MIN") * o["avant"]
    duree_ok = o["fin"] - o["debut"] <= timedelta(hours=parametres.entier("FLASH-DUREE-MAX"))
    return remise_ok and duree_ok


def offres_flash() -> list[dict]:
    sortie = []
    offres = [o for o in _offres_brutes() if _valable(o)]
    produits = pont.produits([o["p"] for o in offres])
    for o in offres:
        p = produits.get(o["p"])
        if p is None or not p.actif:
            continue
        sortie.append(
            {
                "p": str(o["p"]),
                "titre": p.titre,
                "dessin": pont.image(o["p"]),
                "univers": "",
                "prix": o["prix"],
                "avant": o["avant"],
                "debut": ms(o["debut"]),
                "fin": ms(o["fin"]),
                "stock": o["stock"],
                "livraison": commandes.livraison_seule("relais", [(o["p"], 1, o["prix"])]),
            }
        )
    return sorted(sortie, key=lambda x: x["fin"])


def offre_flash(product_id) -> dict | None:
    """L'offre qui court maintenant pour ce produit, avec du stock ; None sinon."""
    t = maintenant_ms()
    return next((o for o in offres_flash() if o["p"] == str(product_id) and o["debut"] <= t < o["fin"] and o["stock"] > 0), None)


def offre_flash_active(product_id) -> bool:
    return offre_flash(product_id) is not None


def vendre_flash(product_id, qte: int = 1) -> bool:
    """Réserve qte unités du stock de l'offre (kit : OffreFlash ; relaya : stock_claimed de la campagne)."""
    maintenant = timezone.now()
    Promo = _modele_promotion()
    from django.db.models import F

    if Promo is not None:
        n = Promo.objects.filter(
            product_id=int(product_id),
            campaign_type="FLASH",
            status="APPROVED",
            starts_at__lte=maintenant,
            ends_at__gt=maintenant,
            stock_reserved__gte=F("stock_claimed") + qte,
        ).update(stock_claimed=F("stock_claimed") + qte)
    else:
        n = OffreFlash.objects.filter(
            product_id=int(product_id), debut__lte=maintenant, fin__gt=maintenant, stock__gte=F("vendus") + qte
        ).update(vendus=F("vendus") + qte)
    return n > 0


def ventes_flash(user) -> dict:
    connecte = user is not None and user.is_authenticated
    alerte = False
    if connecte:
        try:
            from apps.notifications_client.models import ReglagesNotifications

            alerte = ReglagesNotifications.objects.filter(user=user, flash=True).exists()
        except (ImportError, RuntimeError):
            alerte = False
    relais = commandes.relais_habituel(user) if connecte else None
    return {"offres": offres_flash(), "alerte": alerte, "relais": relais.nom if relais else None, "maintenant": maintenant_ms()}


# ══ Rentrée (FF-EX01) ═════════════════════════════════════════════════════════════════════════════════


def _article_rentree_dict(a: ArticleRentree, produits: dict) -> dict:
    p = produits.get(a.product_id)
    eq = produits.get(a.equivalent_product_id) if a.equivalent_product_id else None
    b = p.boutique if p else None
    return {
        "id": str(a.pk),
        "titre": a.titre,
        "groupe": a.groupe,
        "qte": a.qte,
        "prixUnitaire": p.prix if p else 0,
        "boutique": b.nom if b else "",
        "zone": b.zone if b else "",
        "consigne": a.consigne or None,
        "exigee": a.exigee,
        "equivalent": {"titre": eq.titre, "prixUnitaire": eq.prix} if eq and not a.exigee else None,
        "dessin": pont.image(a.product_id),
    }


def liste_rentree_dict(lr: ListeRentree) -> dict:
    articles = list(lr.articles.all())
    produits = pont.produits([a.product_id for a in articles] + [a.equivalent_product_id for a in articles if a.equivalent_product_id])
    return {
        "id": str(lr.pk),
        "ecole": str(lr.ecole_id),
        "classe": lr.classe,
        "section": lr.section,
        "statut": lr.statut,
        "publieeLe": ms(lr.publiee_le),
        "historique": lr.historique or [],
        "articles": [_article_rentree_dict(a, produits) for a in articles],
    }


def rentree(user) -> dict:
    saison = SaisonRentree.objects.order_by("-saison").first()
    connecte = user is not None and user.is_authenticated
    q = Q(statut=ListeRentree.Statut.PUBLIEE)
    if connecte:
        q |= Q(ecole__gestionnaires=user)
    listes = ListeRentree.objects.filter(q, saison=saison).select_related("ecole").distinct() if saison else ListeRentree.objects.none()
    relais = commandes.relais_habituel(user) if connecte else None
    return {
        "saison": saison.saison if saison else "",
        "ouverte": bool(saison and saison.ouverte),
        "ecoles": [
            {"id": str(e.pk), "nom": e.nom, "quartier": e.quartier, "verifiee": e.verifiee, "depuis": ms(e.depuis)}
            for e in Ecole.objects.filter(verifiee=True)
        ],
        "listes": [liste_rentree_dict(x) for x in listes],
        "enCours": None,
        "papier": _papier(user) if connecte else [],
        "rentreeLe": ms(saison.rentree_le) if saison else None,
        "relais": relais.nom if relais else None,
        "maintenant": maintenant_ms(),
    }


def _papier(user) -> list[dict]:
    from apps.messaging.photos import adresse

    return [
        {"classe": x.classe, "le": ms(x.le), "photo": adresse(x.photo) or "", "pretLe": ms(x.pret_le)}
        for x in ListePapier.objects.filter(client=user)[:20]
    ]


def envoyer_liste_papier(user, classe: str, photo) -> None:
    """envoyerListePapier : photo validée (JPEG, PNG, WebP ; apps.messaging.photos), saisie annoncée sous
    BELIVAY_RENTREE_PAPIER_HEURES (prototype : 24 h ; à porter au registre des paramètres)."""
    from apps.messaging.photos import lire_photo

    fichier = lire_photo(photo, prefixe="liste")
    heures = int(getattr(settings, "BELIVAY_RENTREE_PAPIER_HEURES", 24))
    ListePapier.objects.create(client=user, classe=classe.strip()[:40], photo=fichier, pret_le=timezone.now() + timedelta(hours=heures))


def _lignes_rentree(liste_id, exclus, equivalents) -> tuple[ListeRentree, list[tuple[int, int, int]]]:
    """La liste choisie, recalculée depuis zéro : articles décochés retirés, équivalents permis pris."""
    lr = ListeRentree.objects.filter(pk=_entier_id(liste_id), statut=ListeRentree.Statut.PUBLIEE).select_related("ecole", "saison").first()
    if lr is None:
        raise introuvable("Liste introuvable.")
    exclus, equivalents = {str(x) for x in exclus}, {str(x) for x in equivalents}
    lignes = []
    for a in lr.articles.all():
        if str(a.pk) in exclus:
            continue
        pid = a.equivalent_product_id if str(a.pk) in equivalents and a.equivalent_product_id and not a.exigee else a.product_id
        p = pont.produit(pid)
        if p is not None and p.actif:
            lignes.append((pid, a.qte, p.prix))
    if not lignes:
        raise refus("vide", "Aucun article retenu.")
    return lr, lignes


def commander_rentree(user, liste_id, exclus, equivalents, moyen: str) -> str:
    _, lignes = _lignes_rentree(liste_id, exclus, equivalents)
    relais = commandes.relais_habituel(user)
    if relais is None:
        raise refus("relais_absent", "Choisis ton relais de retrait.")
    f = commandes.frais("relais", lignes)
    reference = f"RNT-{user.pk}-{secrets.token_hex(4)}"
    _, r = _payer_mobile_ou_carte(moyen_texte=moyen, montant=f.total, reference=reference, motif="Liste de rentrée")
    order_id = commandes.creer_commande(
        destinataire=user,
        lignes=lignes,
        mode="relais",
        relay_id=relais.id,
        payee=r.statut == "reussi",
        livraison=f.total - f.sous_total,
        moyen="mobile",
    )
    return pont.ref_commande(order_id)


def publier_liste(user, liste_id) -> None:
    lr = ListeRentree.objects.filter(pk=_entier_id(liste_id)).select_related("ecole").first()
    if lr is None:
        raise introuvable()
    if not lr.ecole.gestionnaires.filter(pk=user.pk).exists():
        raise interdit("forbidden", "Seule l'école vérifiée publie sa liste.")
    if not lr.ecole.verifiee:
        raise interdit("ecole_non_verifiee", "L'école doit être vérifiée avant de publier.")
    maintenant = timezone.now()
    lr.statut, lr.publiee_le = ListeRentree.Statut.PUBLIEE, maintenant
    lr.historique = [*(lr.historique or []), {"le": ms(maintenant), "texte": f"Liste publiée · {lr.articles.count()} articles"}]
    lr.save(update_fields=["statut", "publiee_le", "historique"])


# ══ Panier famille (FF-EX05) ══════════════════════════════════════════════════════════════════════════


def _articles_famille() -> dict[int, tuple[ArticleFamille, object]]:
    arts = list(ArticleFamille.objects.filter(actif=True))
    produits = pont.produits([a.product_id for a in arts])
    return {a.product_id: (a, produits[a.product_id]) for a in arts if a.product_id in produits and produits[a.product_id].actif}


def panier_famille_dict(p: PanierFamille) -> dict:
    hist = []
    for h in p.historique.all():
        s = commandes.suivi(h.order_id)
        hist.append({"le": ms(h.le), "montant": h.montant, "ref": pont.ref_commande(h.order_id), "retireLe": ms(s["remisLe"])})
    return {
        "id": str(p.pk),
        "nom": p.nom,
        "destinataire": {"prenom": p.destinataire_prenom, "relais": p.destinataire_relais} if p.destinataire_prenom else None,
        "articles": p.articles or [],
        "mensuel": p.mensuel,
        "jour": p.jour,
        "suspendu": p.suspendu,
        "carte": p.carte or None,
        "email": p.email,
        "historique": hist,
    }


def famille(user) -> dict:
    arts = _articles_famille()
    return {
        "articles": [
            {"id": str(pid), "titre": pr.titre, "prix": pr.prix, "poids": a.poids_g / 1000, "dessin": pont.image(pid)}
            for pid, (a, pr) in arts.items()
        ],
        "modeles": [{"id": str(m.pk), "nom": m.nom, "articles": m.articles} for m in ModeleFamille.objects.all()],
        "destinataires": [
            {"prenom": d.prenom, "numero": d.numero_masque, "relais": d.relais_nom, "lieLe": ms(d.lie_le)}
            for d in DestinataireFamille.objects.filter(client=user)
        ],
        "paniers": [panier_famille_dict(p) for p in PanierFamille.objects.filter(client=user).prefetch_related("historique")],
        "maintenant": maintenant_ms(),
    }


def _valider_articles(lignes) -> list[dict]:
    arts = _articles_famille()
    sortie = []
    for x in lignes or []:
        try:
            pid, qte = int(x["id"]), int(x["qte"])
        except (KeyError, TypeError, ValueError):
            raise refus("article", "Article invalide.") from None
        if pid not in arts:
            raise refus("article", "Cet article n'est pas proposé dans le panier famille.", {"id": str(pid)})
        if qte > 0:
            sortie.append({"id": str(pid), "qte": qte})
    return sortie


def enregistrer_panier_famille(user, d: dict, id_=None) -> PanierFamille:
    if id_ is not None:
        p = PanierFamille.objects.filter(client=user, pk=_entier_id(id_)).first()
        if p is None:
            raise introuvable()
    else:
        p = PanierFamille(client=user)
    if "nom" in d:
        p.nom = (d["nom"] or "Panier famille")[:80]
    if "destinataire" in d:
        dest = d["destinataire"]
        p.destinataire_prenom = (dest or {}).get("prenom", "")[:80] if dest else ""
        p.destinataire_relais = (dest or {}).get("relais", "")[:160] if dest else ""
    if "articles" in d:
        p.articles = _valider_articles(d["articles"])
    if "mensuel" in d:
        p.mensuel = bool(d["mensuel"])
    if "jour" in d:
        if not 1 <= int(d["jour"]) <= 28:
            raise refus("jour", "Jour du mois entre 1 et 28.")
        p.jour = int(d["jour"])
    if "suspendu" in d:
        p.suspendu = bool(d["suspendu"])
    if "email" in d:
        p.email = (d["email"] or "")[:254]
    p.save()
    return p


def lier_destinataire(user, prenom: str, numero: str, relais_texte: str) -> None:
    n = numero_local(numero)
    if len(n) != 9 or not n.startswith("6"):
        raise refus("numero", "Numéro camerounais invalide.")
    relais = commandes.relais_par_texte(relais_texte)
    if relais is None:
        raise refus("relais", "Relais introuvable.")
    DestinataireFamille.objects.update_or_create(
        client=user,
        prenom=prenom.strip()[:80],
        defaults={"numero_chiffre": chiffrer(n), "numero_masque": masquer_numero(n), "relay_id": relais.id, "relais_nom": relais.nom},
    )


def calcul_famille(articles: list[dict]):
    """(lignes, poids en g, classe, FraisPanier) : le colis prend la classe de son poids (FAM-CLASSES-POIDS)."""
    from belivay_moteurs.frais import Article, Panier, SousCommande, calculer

    arts = _articles_famille()
    lignes, poids, par_boutique, zones = [], 0, {}, {}
    for x in articles:
        a, pr = arts[int(x["id"])]
        lignes.append((pr.id, int(x["qte"]), pr.prix))
        poids += a.poids_g * int(x["qte"])
        nom = pr.boutique.nom if pr.boutique else f"Boutique {pr.id}"
        zones[nom] = pr.boutique.zone if pr.boutique else ""
        par_boutique.setdefault(nom, []).append((pr, int(x["qte"]), a.poids_g))
    if not lignes:
        raise refus("vide", "Le panier famille est vide.")
    classe = regles.classe_famille(poids, FAM_CLASSES_KG)
    if classe is None:
        raise refus(
            "trop_lourd",
            "Ce panier est trop lourd pour un seul colis : partage-le en deux.",
            {"poids": poids / 1000, "max": FAM_CLASSES_KG[-1]},
        )
    sc = []
    for nom, arts_b in par_boutique.items():
        c = regles.classe_famille(sum(pg * q for _, q, pg in arts_b), FAM_CLASSES_KG)
        sc.append(SousCommande(nom, zones[nom], tuple(Article(str(pr.id), pr.prix, q, c) for pr, q, _ in arts_b)))
    return lignes, poids, classe, calculer(Panier("relais", tuple(sc)), parametres.livraison())


def payer_panier_famille(user, id_, d: dict) -> PanierFamille:
    p = PanierFamille.objects.filter(client=user, pk=_entier_id(id_)).first()
    if p is None:
        raise introuvable()
    dest = DestinataireFamille.objects.filter(client=user, prenom=p.destinataire_prenom).first()
    if dest is None or not dest.relay_id:
        raise refus("destinataire", "Choisis le proche qui retire le panier.")
    poids_max = parametres.entier("FAM-POIDS-MAX") * 1000
    arts = _articles_famille()
    if any(arts[int(x["id"])][0].poids_g > poids_max for x in p.articles if int(x["id"]) in arts):
        raise refus("poids", "Un article dépasse le poids permis.")
    lignes, _, _, f = calcul_famille(p.articles)
    service = commandes.service_carte(f.total)
    montant = f.total + service
    if montant > parametres.entier("FAM-MAX-TX"):
        raise refus("plafond", "Ce panier dépasse le plafond d'un paiement par carte.", {"plafond": parametres.entier("FAM-MAX-TX")})
    reference = f"FAM-{p.pk}-{secrets.token_hex(4)}"
    from apps.wallet.prestataires import carte

    r = carte().payer(
        montant_xaf=montant,
        devise="EUR",
        montant_devise=commandes.en_devise(montant, "EUR")[0],
        jeton=d["carte"],
        reference=reference,
        email=d["email"],
    )
    if r.statut == "refuse":
        raise ErreurClient(
            status.HTTP_402_PAYMENT_REQUIRED, "paiement_refuse", "Paiement refusé par la banque : rien n'a été débité.", {"motif": r.motif}
        )
    with transaction.atomic():
        order_id = commandes.creer_commande(
            destinataire=user,
            lignes=lignes,
            mode="relais",
            relay_id=dest.relay_id,
            payee=r.statut == "reussi",
            livraison=f.total - f.sous_total,
            frais_service=service,
            moyen="carte",
            devise="EUR",
            payeur={"prenom": user.first_name, "pour": dest.prenom},
        )
        PaiementFamille.objects.create(panier=p, montant=montant, order_id=order_id, reference=r.reference or reference)
        p.carte = d["carte"] if not str(d["carte"]).lower().startswith(("tok_", "carte_")) else "Carte"
        p.jeton_carte = str(d["carte"])
        p.email, p.mensuel, p.jour, p.suspendu = d["email"], bool(d["mensuel"]), int(d["jour"]), False
        p.save()
    return p


# ══ Reprise d'un téléphone (FF-EX04) ══════════════════════════════════════════════════════════════════


def troc_dict(t: Troc) -> dict:
    return {
        "id": str(t.pk),
        "p": str(t.product_id),
        "titre": t.titre,
        "prixLivre": t.prix_livre,
        "modele": t.modele.code,
        "modeleNom": t.modele.nom,
        "declare": t.declare,
        "estimation": {"min": t.estimation_min, "max": t.estimation_max},
        "codeDepot": t.code_depot,
        "relais": t.relais_nom,
        "dates": {
            "cree": ms(t.cree_le),
            "depose": ms(t.depose_le),
            "collecte": ms(t.collecte_le),
            "recu": ms(t.recu_le),
            "inspecte": ms(t.inspecte_le),
        },
        "valeur": t.valeur,
        "contreOffre": t.contre_offre,
        "motif": t.motif,
        "contestation": t.contestation,
        "etat": t.etat,
        "ref": f"BLV-{t.order_id}" if t.order_id else None,
    }


def trocs(user, request) -> dict:
    from apps.client_core.pagination import page

    elements, suivant = page(request, Troc.objects.filter(client=user).select_related("modele"), taille=20)
    relais = commandes.relais_habituel(user)
    return {
        "liste": [troc_dict(t) for t in elements],
        "relais": relais.nom if relais else None,
        "maintenant": maintenant_ms(),
        "next_cursor": suivant,
    }


def creer_troc(user, product_id, modele: str, declare) -> Troc:
    if isinstance(declare, str):
        try:
            declare = json.loads(declare)
        except ValueError:
            raise refus("declare", "État déclaré illisible.") from None
    m = ModeleReprise.objects.filter(code=modele, actif=True).first()
    est = regles.estimer(m.cote if m else None, declare or {}, TRC_MIN_POUR_CENT)
    if m is None or est is None:
        raise refus("non_eligible", "Ce téléphone ne peut pas être repris (modèle, compte ou code de verrouillage).")
    p = _produit_actif(product_id)
    relais = commandes.relais_habituel(user)
    if relais is None:
        raise refus("relais_absent", "Choisis ton relais de dépôt.")
    livraison = commandes.livraison_seule("relais", [(p.id, 1, p.prix)])
    return Troc.objects.create(
        client=user,
        product_id=p.id,
        titre=p.titre,
        prix=p.prix,
        prix_livre=p.prix + livraison,
        modele=m,
        declare=declare,
        estimation_min=est["min"],
        estimation_max=est["max"],
        code_depot=f"{secrets.randbelow(900_000) + 100_000}",
        relay_id=relais.id,
        relais_nom=relais.nom,
    )


def _troc(user, id_) -> Troc:
    t = Troc.objects.filter(client=user, pk=_entier_id(id_)).select_related("modele").first()
    if t is None:
        raise introuvable()
    return t


def repondre_troc(user, id_, accepte: bool) -> Troc:
    """Contre-offre acceptée → valeur confirmée ; sinon le téléphone est rendu au relais, gratuitement."""
    t = _troc(user, id_)
    if t.etat not in (Troc.Etat.CONTRE, Troc.Etat.REFUSE):
        raise conflit("state_changed", "Aucune réponse n'est attendue.", {"etat": t.etat})
    if accepte and t.etat == Troc.Etat.CONTRE and t.contre_offre:
        t.etat, t.valeur = Troc.Etat.CONFIRME, int(t.contre_offre["valeur"])
    else:
        t.etat = Troc.Etat.RENDU
    t.contestation = None
    t.save(update_fields=["etat", "valeur", "contestation"])
    return t


def contester_troc(user, id_, texte: str) -> Troc:
    t = _troc(user, id_)
    if t.etat not in (Troc.Etat.CONTRE, Troc.Etat.REFUSE):
        raise conflit("state_changed", "Il n'y a rien à contester.", {"etat": t.etat})
    le = timezone.now()
    t.contestation = {
        "le": ms(le),
        "texte": texte.strip()[:500],
        "reponseAvant": ms(le + timedelta(hours=parametres.entier("TRC-INSPECT-H"))),
    }
    t.save(update_fields=["contestation"])
    return t


def payer_troc(user, id_, moyen: str) -> Troc:
    t = _troc(user, id_)
    if t.etat != Troc.Etat.CONFIRME or t.valeur is None:
        raise conflit("state_changed", "La valeur de reprise n'est pas encore confirmée.", {"etat": t.etat})
    montant = max(0, t.prix_livre - t.valeur)
    _, r = _payer_mobile_ou_carte(moyen_texte=moyen, montant=montant, reference=f"TRC-{t.pk}", motif="Neuf avec reprise")
    t.order_id = commandes.creer_commande(
        destinataire=user,
        lignes=[(t.product_id, 1, t.prix)],
        mode="relais",
        relay_id=t.relay_id,
        payee=r.statut == "reussi",
        livraison=t.prix_livre - t.prix,
        moyen="mobile",
    )
    t.etat = Troc.Etat.PAYE
    t.save(update_fields=["order_id", "etat"])
    return t


def annuler_troc(user, id_) -> None:
    t = _troc(user, id_)
    if t.etat != Troc.Etat.DEPOT:
        raise conflit("state_changed", "Le téléphone est déjà déposé.", {"etat": t.etat})
    t.etat = Troc.Etat.ANNULE
    t.save(update_fields=["etat"])
