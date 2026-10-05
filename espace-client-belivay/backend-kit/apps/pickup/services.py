# backend/apps/pickup/services.py
# Après le paiement : sous-commandes, code de retrait, garde, annulation d'une boutique, changement de lieu,
# délégation, « racheter », et la commande telle que le site l'affiche (CommandeClient).
#
# Tous les montants viennent des moteurs : annulation.annuler (CAL-24), annulation.changer_de_relais (CAL-25,
# DP-37, DP-42), garde.etat / garde.renvoi (CAL-19 à CAL-22, DP-08, DP-24), comptoir (CAL-13, CAL-18), carte
# (part des frais de service, CET-24), litiges (fermeture du retour, CAL-29). Les transitions passent par la machine
# belivay_moteurs.etats.SOUS_COMMANDE : un refus devient 409 state_changed.

import secrets
from datetime import date, time, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.client_core import parametres, pont
from apps.client_core.chiffrement import chiffrer, dechiffrer, empreinte
from apps.client_core.erreurs import conflit, introuvable, refus
from apps.client_core.masquage import numero_local
from apps.client_core.temps import aujourd_hui, ms

from .models import ChangementLieu, GroupeRemise, HorairesRelais, LigneSousCommande, MontantsCommande, SousCommande

RANG_CLASSE = ["S", "M", "L", "XL", "HG"]


def _appeler(module, fonction, *args, defaut=None, **kw):
    import importlib

    try:
        f = getattr(importlib.import_module(module), fonction)
    except (ImportError, AttributeError):
        return defaut
    return f(*args, **kw)


# ── Création (au paiement) ──────────────────────────────────────────────────────────────────────────────


def creer_sous_commandes(m: MontantsCommande, lignes: list[dict]) -> list[SousCommande]:
    """Une sous-commande par boutique (CCY-15), classe = la plus grande classe de ses articles (DP-46) ; un groupe
    de remise (un code) pour une commande au relais."""
    par: dict[str, list[dict]] = {}
    for lg in lignes:
        par.setdefault(lg["boutique"], []).append(lg)
    groupe = None
    if m.mode == MontantsCommande.Mode.RELAIS:
        groupe = nouveau_groupe(
            m.order_id, m.relay_id, valeur=m.sous_total, montant_paye=m.encaisse, gros=any(lg.get("gros") for lg in lignes)
        )
    creees = []
    for n, (boutique, lgs) in enumerate(par.items(), start=1):
        sc = SousCommande.objects.create(
            order_id=m.order_id,
            n=n,
            vendor_id=lgs[0].get("vendor_id"),
            boutique=boutique,
            zone=lgs[0].get("zone", ""),
            classe=max((lg["classe"] for lg in lgs), key=RANG_CLASSE.index),
            sous_total=sum(lg["prix"] * lg["qte"] for lg in lgs),
            relay_id=m.relay_id,
            groupe=groupe,
            gros=any(lg.get("gros") for lg in lgs),
        )
        LigneSousCommande.objects.bulk_create(
            [
                LigneSousCommande(
                    sous_commande=sc,
                    product_id=lg["product_id"],
                    titre=lg["titre"][:200],
                    prix=lg["prix"],
                    qte=lg["qte"],
                    classe=lg["classe"],
                )
                for lg in lgs
            ]
        )
        creees.append(sc)
    return creees


def _code() -> str:
    return f"{secrets.randbelow(10**6):06d}"  # CODE-LONG : 6 chiffres (+ QR signé, à générer par l'application)


def nouveau_groupe(order_id, relay_id, valeur: int, montant_paye: int, gros: bool) -> GroupeRemise:
    c = _code()
    return GroupeRemise.objects.create(
        order_id=order_id,
        relay_id=relay_id,
        code_chiffre=chiffrer(c),
        code_empreinte=empreinte(f"{order_id}:{c}"),
        valeur=valeur,
        montant_paye=montant_paye,
        gros=gros,
    )


def code_de(groupe: GroupeRemise) -> str:
    return dechiffrer(groupe.code_chiffre)


def regenerer_codes(user) -> list[str]:
    """Changement de numéro (CAP-15, CIN-40) : un nouveau code pour chaque groupe pas encore retiré."""
    commandes = MontantsCommande.objects.filter(client=user).values_list("order_id", flat=True)
    refs = []
    for g in GroupeRemise.objects.filter(order_id__in=commandes, retire_le__isnull=True, renvoye_le__isnull=True):
        c = _code()
        g.code_chiffre, g.code_empreinte, g.essais_faux, g.bloque_jusqua = chiffrer(c), empreinte(f"{g.order_id}:{c}"), 0, None
        g.save(update_fields=["code_chiffre", "code_empreinte", "essais_faux", "bloque_jusqua"])
        refs.append(pont.ref_commande(g.order_id))
    return refs


def essayer_code(groupe: GroupeRemise, code: str) -> dict:
    """Saisie du code au comptoir (pour l'application du relais) : trois codes faux ⇒ blocage 24 h (CAL-18, DP-26)."""
    from belivay_moteurs.comptoir import code_faux

    if groupe.bloque_jusqua and groupe.bloque_jusqua > timezone.now():
        return {"ok": False, "bloque": True}
    if empreinte(f"{groupe.order_id}:{code}") == groupe.code_empreinte:
        return {"ok": True}
    e = code_faux(groupe.essais_faux, parametres.paiement())
    groupe.essais_faux += 1
    if e.bloque:
        groupe.bloque_jusqua = timezone.now() + timedelta(hours=e.blocage_heures)
    groupe.save(update_fields=["essais_faux", "bloque_jusqua"])
    return {"ok": False, "bloque": e.bloque, "essaisRestants": e.essais_restants}


# ── Garde (CL-10) ───────────────────────────────────────────────────────────────────────────────────────


def horaires(relay_id):
    """Horaires structurés du relais (moteur garde.HorairesRelais) ; à défaut BELIVAY_HORAIRES_PAR_DEFAUT (D13)."""
    from belivay_moteurs.garde import HorairesRelais as H

    h = HorairesRelais.objects.filter(relay_id=relay_id).first() if relay_id else None
    if h is not None:
        return H(h.ouverture, h.fermeture, frozenset(h.jours_fermes), frozenset(date.fromisoformat(x) for x in h.fermetures))
    o, f, fermes = getattr(settings, "BELIVAY_HORAIRES_PAR_DEFAUT", ("08:00", "19:00", []))
    return H(time.fromisoformat(o), time.fromisoformat(f), frozenset(fermes))


def groupe_en_garde(g: GroupeRemise):
    from belivay_moteurs.garde import GroupeEnGarde, j0_de

    suspendus = {date.fromisoformat(x) for x in g.jours_suspendus}
    suspendus |= set(_appeler("apps.aftersales.services", "jours_suspendus", g.order_id, defaut=set()) or set())
    return GroupeEnGarde(
        reference=pont.ref_commande(g.order_id),
        j0=j0_de(g.accuse_fort_le) if g.accuse_fort_le else None,
        valeur=g.valeur,
        montant_paye=g.montant_paye,
        gros=g.gros,
        horaires=horaires(g.relay_id),
        jours_suspendus=frozenset(suspendus),
        rappels_non_delivres=frozenset(date.fromisoformat(x) for x in g.rappels_non_delivres),
    )


def etat_garde(g: GroupeRemise, jour: date | None = None):
    from belivay_moteurs.garde import etat

    return etat(groupe_en_garde(g), jour or aujourd_hui(), parametres.garde())


def garde_due(order_id: int) -> int:
    return sum(
        etat_garde(g).du for g in GroupeRemise.objects.filter(order_id=order_id, retire_le__isnull=True, accuse_fort_le__isnull=False)
    )


# ── La commande vue du client ───────────────────────────────────────────────────────────────────────────


def montants(order_ref, user) -> MontantsCommande:
    try:
        oid = pont.id_commande(order_ref)
    except ValueError:
        raise introuvable() from None
    m = MontantsCommande.objects.filter(order_id=oid, client=user).first()
    if m is None:
        raise introuvable()
    return m


def colis_en_dict(sc: SousCommande) -> dict:
    """ColisCommande (source.ts)."""
    lignes = list(sc.lignes.all())
    premier = lignes[0] if lignes else None
    d = {
        "n": sc.n,
        "p": str(premier.product_id) if premier else "",
        "produit": ", ".join(lg.titre for lg in lignes),
        "dessin": pont.image(premier.product_id) if premier else "",
        "prix": sc.sous_total,
        "qte": sum(lg.qte for lg in lignes),
        "boutique": sc.boutique,
        "etagere": sc.etagere or None,
        "arrive": sc.arrivee_le is not None,
        "gros": sc.gros,
        "statut": sc.statut_colis,
    }
    if sc.etat == SousCommande.Etat.ANNULEE:
        d["annule"] = {"le": ms(sc.annulee_le), "rembourse": sc.rembourse, "par": sc.annulee_par or "belivay", "motif": sc.motif_annulation}
    return d


def _panier_moteur(m: MontantsCommande, sous_commandes):
    from belivay_moteurs.frais import Article, Panier
    from belivay_moteurs.frais import SousCommande as SC

    sc_moteur = []
    for sc in sous_commandes:
        articles = tuple(Article(str(lg.product_id), lg.prix, lg.qte, lg.classe) for lg in sc.lignes.all())
        if articles:
            sc_moteur.append(SC(sc.boutique, sc.zone, articles))
    return Panier(m.mode, tuple(sc_moteur)) if sc_moteur else None


def _frais_detail(panier, offert: int) -> dict:
    from belivay_moteurs.annulation import frais_de_livraison
    from belivay_moteurs.frais import calculer

    if panier is None:
        return {"total": 0, "ramassages": 0, "remises": 0, "offert": 0}
    f = calculer(panier, parametres.livraison())
    return {
        "total": frais_de_livraison(panier, parametres.livraison(), offert),
        "ramassages": f.ramassages,
        "remises": f.remises,
        "offert": offert,
    }


def _paye_par(m: MontantsCommande) -> str:
    if m.payeur:
        return f"Carte de {m.payeur.get('prenom', '')}".strip()
    return {
        "mtn": "MTN MoMo",
        "orange": "Orange Money",
        "carte": "Carte",
        "apple": "Apple Pay",
        "google": "Google Pay",
        "wallet": "Portefeuille",
    }.get(m.moyen, m.moyen) + (f" · {m.numero_masque}" if m.numero_masque else "")


def apercu_annulation(order_ref, user, n: int) -> dict:
    """ApercuAnnulation (CL-12) : ce que rend l'annulation d'une boutique, frais recalculés sans elle (Off conservé)."""
    from belivay_moteurs.annulation import annuler

    m = montants(order_ref, user)
    actives = list(SousCommande.objects.filter(order_id=m.order_id).exclude(etat=SousCommande.Etat.ANNULEE).prefetch_related("lignes"))
    sc = next((x for x in actives if x.n == n), None)
    if sc is None:
        raise introuvable()
    commande = _panier_moteur(m, actives)
    r = annuler(
        commande,
        sc.boutique,
        parametres.livraison(),
        m.offert,
        collectee=sc.collectee,
        encaisse=m.encaisse,
        deja_rembourse=m.rembourse,
        au_comptoir=m.comptoir,
    )
    reste = [x for x in actives if x.n != n]
    return {
        "colis": colis_en_dict(sc),
        "article": r.prix,
        "fraisAvant": _frais_detail(commande, m.offert),
        "fraisApres": _frais_detail(r.reste, m.offert),
        "rembourse": r.montant,
        "payePar": _paye_par(m),
        "reste": [colis_en_dict(x) for x in reste],
    }


def sous_commande(ref: str, user) -> SousCommande:
    """« 52018-2 » → la sous-commande, seulement si la commande est au client (décision D6)."""
    try:
        order, n = str(ref).upper().removeprefix("BLV-").split("-")
        order_id, n = int(order), int(n)
    except ValueError:
        raise introuvable() from None
    if not MontantsCommande.objects.filter(order_id=order_id, client=user).exists():
        raise introuvable()
    sc = SousCommande.objects.filter(order_id=order_id, n=n).first()
    if sc is None:
        raise introuvable()
    return sc


def annuler_colis(ref: str, user, motif: str) -> int:
    """Annule une boutique (CAL-24) ; rend le montant remboursé (et la part des frais de service, CET-24)."""
    from belivay_moteurs.annulation import annuler
    from belivay_moteurs.carte import AnnulePar, part_du_service
    from belivay_moteurs.etats import SOUS_COMMANDE

    with transaction.atomic():
        sc = sous_commande(ref, user)
        m = MontantsCommande.objects.select_for_update().get(order_id=sc.order_id)
        if m.etat_paiement != MontantsCommande.EtatPaiement.PAYEE and not m.comptoir:
            raise conflit("state_changed", "Cette commande n'est pas encore payée : abandonne plutôt le paiement.")
        SOUS_COMMANDE.appliquer(sc.etat, "suborder.cancel")  # collectée ou plus loin : 409 state_changed (CAN-09)
        actives = list(SousCommande.objects.filter(order_id=m.order_id).exclude(etat=SousCommande.Etat.ANNULEE).prefetch_related("lignes"))
        r = annuler(
            _panier_moteur(m, actives),
            sc.boutique,
            parametres.livraison(),
            m.offert,
            collectee=False,
            encaisse=m.encaisse,
            deja_rembourse=m.rembourse,
            au_comptoir=m.comptoir,
        )
        rendu_service = 0
        if m.frais_service:
            derniere = len(actives) == 1
            part = part_du_service(m.frais_service, m.service_reparti, r.montant, derniere, AnnulePar.CLIENT, parametres.paiement())
            m.service_reparti += part.rendue + part.acquise
            rendu_service = part.rendue
        sc.etat, sc.annulee_le, sc.annulee_par, sc.motif_annulation, sc.rembourse = (
            SousCommande.Etat.ANNULEE,
            timezone.now(),
            "toi",
            motif[:255],
            r.montant,
        )
        sc.save(update_fields=["etat", "annulee_le", "annulee_par", "motif_annulation", "rembourse"])
        m.rembourse += r.montant
        m.save(update_fields=["rembourse", "service_reparti"])
    total = r.montant + rendu_service
    if total:
        # Destination : moyen d'origine, ou portefeuille s'il est ouvert (REMB-DESTINATION). Chez relaya, le
        # remboursement passe par payments/settlements (Refund), à brancher (décision D9).
        _appeler("apps.wallet.services", "crediter_remboursement", user, total, m.moyen in ("carte", "apple", "google"))
    return total


def changer_lieu(user, *, order_ref=None, colis_ref=None, lieu: str, frais_annonces: int, vers_adresse: bool = False) -> dict:
    """Relais ou adresse changés, ou transfert d'un colis arrivé (CAL-25, CRL-07 à CRL-10, DP-37, DP-42)."""
    from belivay_moteurs.annulation import ColisDeCommande, EtatColis, changer_de_relais
    from belivay_moteurs.frais import Article
    from belivay_moteurs.frais import SousCommande as SC

    if colis_ref:
        une = sous_commande(colis_ref, user)
        m = MontantsCommande.objects.get(order_id=une.order_id)
        concernees = [une]
    else:
        m = montants(order_ref, user)
        concernees = list(SousCommande.objects.filter(order_id=m.order_id))
    concernees = [
        sc for sc in concernees if sc.etat not in (SousCommande.Etat.ANNULEE, SousCommande.Etat.REMISE, SousCommande.Etat.RENVOYEE_VENDEUR)
    ]
    if not concernees:
        raise conflit("state_changed", "Plus rien à changer pour cette commande.")

    if vers_adresse:
        if any(sc.collectee for sc in concernees):
            raise conflit("collected", "Un colis est déjà parti : l'adresse ne peut plus changer.")
        adresse = _appeler("apps.client_accounts.services", "adresse_par_libelle", user, lieu)
        if adresse is None:
            raise introuvable("Adresse introuvable.")
        m.adresse_id, m.lieu = adresse.pk, getattr(adresse, "libelle", None) or getattr(adresse, "nom", m.lieu)
        m.save(update_fields=["adresse_id", "lieu"])
        ChangementLieu.objects.create(order_id=m.order_id, type=ChangementLieu.Type.ADRESSE, vers_adresse_id=adresse.pk)
        return {"montantDu": 0}

    relais = pont.relais_par_nom(lieu)
    if relais is None or not relais.actif:
        raise introuvable("Relais introuvable.")
    etats = {
        SousCommande.Etat.COLLECTEE: EtatColis.EN_TOURNEE,
        SousCommande.Etat.ARRIVEE_RELAIS: EtatColis.ARRIVE,
    }
    colis = tuple(
        ColisDeCommande(
            SC(sc.boutique, sc.zone, tuple(Article(str(lg.product_id), lg.prix, lg.qte, lg.classe) for lg in sc.lignes.all())),
            etats.get(sc.etat, EtatColis.NON_COLLECTE),
        )
        for sc in concernees
    )
    r = changer_de_relais(colis, parametres.paiement(), garde_due(m.order_id))
    if r.montant_du > int(frais_annonces or 0):
        raise conflit(
            "price_changed",
            "Le prix du changement a changé.",
            {"montantDu": r.montant_du, "transfert": r.transfert, "gardeDue": r.garde_due},
        )
    a_deplacer = set(r.changent_gratuitement) | set(r.transferes)
    with transaction.atomic():
        for sc in concernees:
            if sc.boutique in a_deplacer:
                sc.relay_id = relais.id
                sc.save(update_fields=["relay_id"])
        if not colis_ref:
            m.relay_id, m.lieu = relais.id, relais.nom
            m.save(update_fields=["relay_id", "lieu"])
        ChangementLieu.objects.create(
            order_id=m.order_id,
            type=ChangementLieu.Type.TRANSFERT if colis_ref else ChangementLieu.Type.RELAIS,
            vers_relay_id=relais.id,
            transfert=r.transfert,
            garde_due=r.garde_due,
            montant_du=r.montant_du,
            deux_codes=r.deux_codes,
            trace=list(r.trace),
        )
    if r.montant_du:
        from apps.wallet.prestataires import mobile_money

        numero = numero_local(_appeler("apps.client_accounts.services", "numero_verifie", user, defaut="") or "")
        mobile_money().demander(
            montant_xaf=r.montant_du,
            numero=numero,
            reference=f"{m.ref}-lieu-{timezone.now().timestamp():.0f}",
            motif=f"Changement de relais {m.ref}",
        )
    return {"montantDu": r.montant_du, "deuxCodes": r.deux_codes}


def deleguer(order_ref, user, prenom: str, numero: str | None) -> None:
    """Quelqu'un retire à la place du client (CL-09) ; numéro None : délégation retirée."""
    m = montants(order_ref, user)
    if numero is not None:
        n = numero_local(numero)
        if len(n) != 9 or not n.startswith("6"):
            raise refus("numero", "Un numéro mobile du Cameroun a 9 chiffres et commence par 6.")
        pont.deleguer_retrait(m.order_id, (prenom or "").strip()[:120], n)
    else:
        pont.deleguer_retrait(m.order_id, "", "")


def racheter(order_ref, user) -> int:
    """Remet au panier les articles encore en vente d'une commande ; rend le nombre d'articles remis."""
    from apps.cart import services as panier
    from apps.client_core.erreurs import ErreurClient

    c = pont.commande(order_ref, user)
    if c is None:
        raise introuvable()
    n = 0
    for lg in c.lignes:
        try:
            panier.ajouter(user, lg.product_id, lg.qte)
            n += lg.qte
        except ErreurClient:
            continue
    return n


def vue_commande_client(order_id: int, user) -> dict | None:
    """CommandeClient (source.ts) : à servir par relaya (OrderDetailSerializer, champ « espace_client ») ou par une
    route GET /api/me/orders/{id} (décision D14). Garde, code, comptoir et fenêtre de retour par les moteurs."""
    from belivay_moteurs.comptoir import biometrie_requise
    from belivay_moteurs.litiges import fermeture_du_retour

    m = MontantsCommande.objects.filter(order_id=order_id, client=user).first()
    if m is None:
        return None
    scs = list(SousCommande.objects.filter(order_id=order_id).prefetch_related("lignes"))
    actives = [sc for sc in scs if sc.etat != SousCommande.Etat.ANNULEE]
    groupe = GroupeRemise.objects.filter(order_id=order_id, retire_le__isnull=True).first()
    arrivees = [sc.arrivee_le for sc in actives if sc.arrivee_le]
    remises = [sc.remise_le for sc in actives if sc.remise_le]
    tous_arrives = bool(actives) and all(sc.arrivee_le for sc in actives)
    garde = None
    if groupe is not None and groupe.accuse_fort_le:
        e = etat_garde(groupe)
        garde = {"du": e.du, "demain": e.du_demain, "jour": e.rang or 0}
    if not actives:
        etat = "annulee"
    elif m.etat_paiement != MontantsCommande.EtatPaiement.PAYEE and not m.comptoir:
        etat = "paiement"
    elif any(sc.etat == SousCommande.Etat.EN_LITIGE for sc in actives):
        etat = "litige"
    elif remises and len(remises) == len(actives):
        etat = "retiree"
    elif tous_arrives:
        etat = "comptoir" if m.comptoir else "retirable"
    elif any(sc.collectee for sc in actives):
        etat = "route"
    else:
        etat = "preparation"
    retrait = max(remises) if remises and len(remises) == len(actives) else None
    retour = None
    if retrait:
        fin = fermeture_du_retour(retrait.date(), m.tout_en_ordre_le.date() if m.tout_en_ordre_le else None, parametres.litiges())
        retour = ms(fin)
    annulees = [sc for sc in scs if sc.etat == SousCommande.Etat.ANNULEE]
    return {
        "ref": m.ref,
        "etat": etat,
        "payeeLe": ms(m.payee_le or m.cree_le),
        "mode": m.mode,
        "lieu": m.lieu,
        "colis": [colis_en_dict(sc) for sc in scs],
        "total": m.total + m.frais_service - m.prime,
        "livraison": m.total - m.sous_total - m.prime,
        # Le code ne s'affiche qu'au toucher (CAP-18) : l'écran le demande au moment de l'afficher.
        "code": code_de(groupe) if groupe is not None and tous_arrives else None,
        "codeBio": biometrie_requise(m.total, parametres.paiement()),
        "arriveeLe": ms(max(arrivees)) if arrivees else None,
        "pretLe": ms(max(arrivees)) if tous_arrives else None,
        "garde": garde,
        "comptoir": {"livraisonPayee": m.avance, "du": m.du_au_retrait + (garde["du"] if garde else 0)} if m.comptoir else None,
        "litige": None,
        "retireeLe": ms(retrait),
        "retourJusqua": retour,
        "annulee": {"le": ms(max(sc.annulee_le for sc in annulees)), "rembourse": sum(sc.rembourse for sc in annulees)}
        if annulees and not actives
        else None,
        "delegue": None,
        "etapes": [
            {"titre": "Payée", "le": ms(m.payee_le)},
            {"titre": "Au relais" if m.mode == "relais" else "Livrée", "le": ms(max(arrivees)) if tous_arrives else None},
            {"titre": "Retirée", "le": ms(retrait)},
        ],
        **({"payeur": m.payeur} if m.payeur else {}),
    }


def annuler_commande_echange(order_id: int, motif: str = "") -> int:
    """Colis payé pour un proche et refusé par lui (échanges entre clients) : les sous-commandes pas encore collectées
    sont annulées par BelivaY ; le remboursement du payeur est fait par l'application appelante (wishlists), avec la
    retenue de la règle « BelivaY ne perd jamais ». Rend le nombre de sous-commandes annulées. Un colis déjà parti
    suit le renvoi au vendeur (garde.renvoi)."""
    from belivay_moteurs.erreurs import ErreurMoteur
    from belivay_moteurs.etats import SOUS_COMMANDE

    n = 0
    for sc in SousCommande.objects.filter(order_id=order_id).exclude(etat=SousCommande.Etat.ANNULEE):
        try:
            SOUS_COMMANDE.appliquer(sc.etat, "suborder.cancel")
        except ErreurMoteur:
            continue
        sc.etat, sc.annulee_le, sc.annulee_par, sc.motif_annulation = SousCommande.Etat.ANNULEE, timezone.now(), "belivay", motif[:255]
        sc.save(update_fields=["etat", "annulee_le", "annulee_par", "motif_annulation"])
        n += 1
    return n
