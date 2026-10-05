# backend/apps/cart/paiement.py
# Passer commande et payer (CL-08) : POST /api/checkout, reçu, relance, abandon, paiement au comptoir.
#
# Au clic sur « Payer » le serveur recalcule TOUT (CAL-11) :
#   1. numéro vérifié (machine COMMANDE : garde numero_verifie) ;
#   2. changements de prix depuis l'affichage : hausse, article retiré ou pris → 409 price_changed (rien n'est créé) ;
#   3. frais (frais.calculer) ; montant affiché par le site comparé au montant serveur (frais.verifier_au_paiement) :
#      hausse → 409 price_changed ; baisse → appliquée ;
#   4. carte / Apple Pay / Google Pay : frais de service (carte.frais_de_service), plafond par transaction
#      (carte.payer_par_carte : un panier qui ne tient pas en une transaction → 422 over_cap ; le découpage en
#      plusieurs commandes CET-16 est à finir, décision D12) ;
#   5. comptoir : éligibilité (comptoir.eligibilite), partage avance / dû au retrait (comptoir.partage) ;
#   6. commande relaya créée (commande.creer_commande, décision D8), montants figés (pickup.MontantsCommande avec la
#      version des paramètres), sous-commandes par boutique ; lignes du panier réservées (rendues si le paiement
#      échoue, expire ou est abandonné : machine COMMANDE, retour au panier) ;
#   7. demande Mobile Money (prestataire ; chez relaya : payments/application/collect.initiate_collect) ou paiement
#      carte (3-D Secure possible).

from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status

from apps.client_core import parametres, pont
from apps.client_core.erreurs import ErreurClient, conflit, introuvable, refus
from apps.client_core.masquage import masquer_numero, numero_local
from apps.client_core.temps import maintenant_ms, ms
from apps.pickup.models import MontantsCommande, SousCommande

from . import services
from .commande import NouvelleCommande, creer_commande, marquer_payee
from .models import LignePanier

MOYENS_CARTE = ("carte", "apple", "google")
MOYENS_MOMO = ("mtn", "orange", "autre")


def _duree_demande_min() -> int:
    """Validité d'une demande Mobile Money : PAY-TVAL (« valeur de l'agrégateur », jeu d'essai 24 min)."""
    return parametres.entier("PAY-TVAL")


def passer_commande(user, d: dict) -> dict:
    from belivay_moteurs.carte import frais_de_service, payer_par_carte
    from belivay_moteurs.comptoir import partage
    from belivay_moteurs.frais import DecisionPaiement, verifier_au_paiement

    panier = services.panier_de(user)
    if panier.mode != d["mode"]:
        panier.mode = d["mode"]
        panier.save(update_fields=["mode"])
    moyen, comptoir = d["moyen"], bool(d.get("comptoir"))

    numero_compte = services.appeler("apps.client_accounts.services", "numero_verifie", user, defaut="")
    if services.appeler("apps.client_accounts.services", "profil", user) is not None and not numero_compte:
        raise ErreurClient(status.HTTP_403_FORBIDDEN, "numero_non_verifie", "Vérifie ton numéro avant ta première commande.")

    chg = [c for c in services.changements(panier) if c["type"] != "baisse"]
    if chg:
        raise conflit("price_changed", "Des prix ont changé dans ton panier.", {"changements": chg})

    moteur, f = services.frais(user, panier)
    if moteur is None:
        raise refus("panier_vide", "Ton panier est vide.")
    prime = int(services.appeler("apps.subscriptions.services", "remise_livraison", user, f, mode=panier.mode, defaut=0) or 0)
    livraison_serveur = f.total - f.sous_total - prime
    decision, delta = verifier_au_paiement(f.sous_total + int(d["livraison"]), f.sous_total + livraison_serveur)
    if decision is DecisionPaiement.BLOQUER_HAUSSE:
        raise conflit("price_changed", "Les frais de livraison ont changé.", {"livraison": livraison_serveur, "ecart": delta})

    pp = parametres.paiement()
    service = 0
    if moyen in MOYENS_CARTE:
        if comptoir:
            raise refus("comptoir_carte", "Une commande payée au comptoir ne se paie pas par carte.")
        service = frais_de_service(f.total - prime, pp)
        if service > int(d.get("frais") or 0):
            raise conflit("price_changed", "Les frais de service ont changé.", {"frais": service})
        decoupage = payer_par_carte(moteur, parametres.livraison(), pp)
        if len(decoupage.transactions) > 1 or decoupage.reste_au_panier:
            raise refus(
                "over_cap",
                "Ce panier dépasse le plafond d'un paiement par carte.",
                {"plafond": pp.carte_max, "transactions": len(decoupage.transactions)},
            )

    avance, du = f.total - prime + service, 0
    if comptoir:
        e = services.eligibilite_comptoir(user, moteur, f)
        if not e["propose"]:
            raise refus("comptoir_refuse", e["ligne"] or "Paiement au comptoir non proposé.", e)
        pa = partage(f)
        avance, du = max(pa.maintenant - prime, 0), pa.au_retrait

    numero = numero_local(d.get("numero") or numero_compte or "")
    relais = services.relais_du_panier(user, panier) if panier.mode == "relais" else None
    adresse = services.adresse_du_panier(user, panier) if panier.mode == "domicile" else None
    if panier.mode == "relais" and relais is None:
        raise refus("relais_absent", "Choisis ton relais de retrait.")
    _, par_boutique, produits = services.vers_moteur(user, panier)
    lignes = [lg for lgs in par_boutique.values() for lg in lgs]

    with transaction.atomic():
        order_id = creer_commande(
            NouvelleCommande(
                user=user,
                mode=panier.mode,
                relay_id=relais.id if relais else None,
                adresse=adresse,
                telephone=numero,
                lignes=tuple((lg.product_id, produits[lg.product_id].titre, produits[lg.product_id].prix, lg.qte) for lg in lignes),
                sous_total=f.sous_total,
                livraison=livraison_serveur,
                total=f.total - prime + service,
            )
        )
        m = MontantsCommande.objects.create(
            order_id=order_id,
            client=user,
            mode=panier.mode,
            relay_id=relais.id if relais else None,
            adresse_id=getattr(adresse, "pk", None),
            lieu=relais.nom if relais else (getattr(adresse, "libelle", None) or getattr(adresse, "nom", "") or ""),
            sous_total=f.sous_total,
            ramassages=f.ramassages,
            remises=f.remises,
            supplements=f.supplements,
            offert=f.offert,
            total=f.total,
            seuil=f.seuil,
            frais_service=service,
            prime=prime,
            version_parametres=f.version_parametres,
            moyen=moyen,
            numero_masque=masquer_numero(numero) if numero and moyen not in MOYENS_CARTE else "",
            comptoir=comptoir,
            avance=avance,
            du_au_retrait=du,
            expire_le=timezone.now() + timedelta(minutes=_duree_demande_min()),
        )
        from apps.pickup.services import creer_sous_commandes

        creer_sous_commandes(m, services.lignes_figees(par_boutique, produits))
        LignePanier.objects.filter(pk__in=[lg.pk for lg in lignes]).update(reservee_pour=order_id)

    _demander_paiement(m, numero, tentative=1)
    m.refresh_from_db()
    return commande_passee(m)


def _demander_paiement(m: MontantsCommande, numero: str, tentative: int) -> None:
    """Demande au prestataire ; un montant nul (comptoir avec livraison offerte, DP-48) est validé sans demande."""
    from apps.wallet.prestataires import carte, mobile_money

    reference = f"{m.ref}-{tentative}"
    if m.avance == 0:
        confirmer_paiement(m.order_id)
        return
    if m.moyen in MOYENS_CARTE:
        jeton = getattr(services.appeler("apps.wallet.services", "carte_par_defaut", m.client), "jeton", None)
        if not jeton:
            echouer_paiement(m.order_id, "carte")
            raise refus("carte_absente", "Ajoute une carte avant de payer par carte.")
        r = carte().payer(montant_xaf=m.avance, devise="XAF", montant_devise=None, jeton=jeton, reference=reference)
        if r.statut == "reussi":
            confirmer_paiement(m.order_id)
        elif r.statut == "refuse":
            echouer_paiement(m.order_id, "carte")
            raise ErreurClient(
                status.HTTP_402_PAYMENT_REQUIRED, "card_declined", "La carte a été refusée. Rien n'a été débité.", {"motif": r.motif}
            )
        return
    mobile_money().demander(montant_xaf=m.avance, numero=numero, reference=reference, motif=f"Commande {m.ref}")


def confirmer_paiement(order_id: int) -> None:
    """Paiement validé (webhook de l'agrégateur, ou carte réussie) : machine COMMANDE en_attente_paiement → payee."""
    from belivay_moteurs.etats import COMMANDE

    with transaction.atomic():
        m = MontantsCommande.objects.select_for_update().get(order_id=order_id)
        if m.etat_paiement == MontantsCommande.EtatPaiement.PAYEE:
            return
        if not m.comptoir:  # comptoir : la commande est « validée », payée au retrait (counter.paid, pickup)
            COMMANDE.appliquer("en_attente_paiement", "payment.succeeded", {"montant_egal_serveur": True, "cle_tentative_en_cours": True})
        m.etat_paiement = MontantsCommande.EtatPaiement.PAYEE
        m.payee_le = timezone.now()
        m.cause_echec = ""
        m.save(update_fields=["etat_paiement", "payee_le", "cause_echec"])
        LignePanier.objects.filter(reservee_pour=order_id).delete()
        marquer_payee(order_id)


def echouer_paiement(order_id: int, cause: str) -> None:
    """Échec, expiration ou abandon : rien n'est débité, les articles reviennent au panier (machine COMMANDE)."""
    with transaction.atomic():
        m = MontantsCommande.objects.select_for_update().get(order_id=order_id)
        if m.etat_paiement == MontantsCommande.EtatPaiement.PAYEE:
            raise conflit("state_changed", "Ce paiement est déjà validé.")
        m.etat_paiement = MontantsCommande.EtatPaiement.ECHEC
        m.cause_echec = cause
        m.save(update_fields=["etat_paiement", "cause_echec"])
        LignePanier.objects.filter(reservee_pour=order_id).update(reservee_pour=None)
        SousCommande.objects.filter(order_id=order_id).update(
            etat=SousCommande.Etat.ANNULEE, annulee_le=timezone.now(), annulee_par="belivay", motif_annulation="paiement non abouti"
        )


def _montants(order_ref, user) -> MontantsCommande:
    try:
        oid = pont.id_commande(order_ref)
    except ValueError:
        raise introuvable() from None
    m = MontantsCommande.objects.filter(order_id=oid, client=user).first()
    if m is None:
        raise introuvable()
    return m


def commande_passee(m: MontantsCommande) -> dict:
    """CommandePassee (source.ts)."""
    lignes = []
    for sc in SousCommande.objects.filter(order_id=m.order_id).prefetch_related("lignes"):
        for lg in sc.lignes.all():
            lignes.append({"titre": lg.titre, "dessin": pont.image(lg.product_id), "qte": lg.qte, "prix": lg.prix, "boutique": sc.boutique})
    livraison = m.total - m.sous_total - m.prime
    d = {
        "ref": m.ref,
        "le": ms(m.cree_le),
        "mode": m.mode,
        "lieu": m.lieu,
        "moyen": m.moyen,
        "numero": m.numero_masque or None,
        "comptoir": m.comptoir,
        "articles": sum(x["qte"] for x in lignes),
        "colis": SousCommande.objects.filter(order_id=m.order_id).count(),
        "sousTotal": m.sous_total,
        "livraison": livraison,
        "frais": m.frais_service,
        "montant": m.avance,
        "dueAuRetrait": m.du_au_retrait,
        "etat": m.etat_paiement,
        "expire": ms(m.expire_le) or 0,
        "lu": maintenant_ms(),
        "lignes": lignes,
    }
    if m.cause_echec in ("expire", "solde", "carte"):
        d["cause"] = m.cause_echec
    if m.prime:
        d["prime"] = m.prime
    if m.payeur:
        d["payeur"] = m.payeur
    return d


def recu(order_ref, user) -> dict:
    return commande_passee(_montants(order_ref, user))


def en_attente(user) -> list[dict]:
    """Demandes Mobile Money pas encore validées (paiementsEnAttente)."""
    qs = MontantsCommande.objects.filter(client=user, etat_paiement=MontantsCommande.EtatPaiement.ATTENTE, expire_le__gt=timezone.now())
    return [commande_passee(m) for m in qs.order_by("-cree_le")]


def relancer(order_ref, user, numero: str | None) -> dict:
    """Nouvelle demande Mobile Money : l'ancienne est remplacée (état « replaced » de la tentative, anomalie A7 de
    relaya), le délai repart."""
    m = _montants(order_ref, user)
    if m.etat_paiement == MontantsCommande.EtatPaiement.PAYEE:
        raise conflit("state_changed", "Cette commande est déjà payée.")
    if m.moyen in MOYENS_CARTE:
        raise refus("moyen", "Une commande payée par carte ne se relance pas par Mobile Money.")
    num = numero_local(numero or "") or numero_local(
        services.appeler("apps.client_accounts.services", "numero_verifie", user, defaut="") or ""
    )
    if m.etat_paiement == MontantsCommande.EtatPaiement.ECHEC:
        # Les articles sont déjà revenus au panier : le client repasse commande (nouvelle clé d'idempotence).
        raise conflit("state_changed", "Cette demande a pris fin ; tes articles sont dans ton panier.")
    m.expire_le = timezone.now() + timedelta(minutes=_duree_demande_min())
    m.numero_masque = masquer_numero(num) if num else m.numero_masque
    m.cause_echec = ""
    m.save(update_fields=["etat_paiement", "expire_le", "numero_masque", "cause_echec"])
    _demander_paiement(m, num, tentative=maintenant_ms())  # référence nouvelle à chaque relance
    m.refresh_from_db()
    return commande_passee(m)


def annuler(order_ref, user) -> None:
    m = _montants(order_ref, user)
    echouer_paiement(m.order_id, "")


def payer_au_comptoir(order_ref, user) -> None:
    """Montant dû au retrait = reste de la commande + garde due (comptoir.montant_du_au_retrait, CAL-13)."""
    from apps.pickup.services import garde_due
    from belivay_moteurs.comptoir import montant_du_au_retrait

    m = _montants(order_ref, user)
    if not m.comptoir:
        raise refus("pas_au_comptoir", "Cette commande n'est pas à payer au retrait.")
    du = montant_du_au_retrait(m.du_au_retrait, garde_due(m.order_id))
    if du == 0:
        raise conflit("state_changed", "Il ne reste rien à payer.")
    from apps.wallet.prestataires import mobile_money

    num = numero_local(services.appeler("apps.client_accounts.services", "numero_verifie", user, defaut="") or "")
    mobile_money().demander(montant_xaf=du, numero=num, reference=f"{m.ref}-comptoir", motif=f"Retrait {m.ref}")
