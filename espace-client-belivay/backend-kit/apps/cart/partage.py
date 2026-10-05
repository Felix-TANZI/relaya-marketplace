# backend/apps/cart/partage.py
# Panier partagé (CL-12, diaspora) : le client fige son panier dans un lien court ; un proche à l'étranger le paie
# par carte, sans compte. Carte seulement, frais de service (PAY-CARTE-FRAIS), PAY-CARTE-MAX par paiement, devise
# du payeur (euro à parité fixe, dollar au taux du prestataire figé : belivay_moteurs.carte) ; le code de retrait
# reste au client, le payeur reçoit la preuve de retrait ; un remboursement revient sur sa carte. Le payeur ne voit
# ni l'adresse, ni le numéro du client.

import secrets

from django.db import transaction
from django.utils import timezone
from rest_framework import status

from apps.client_core import parametres, pont
from apps.client_core.erreurs import ErreurClient, introuvable, refus
from apps.client_core.temps import ms

from . import services
from .commande import NouvelleCommande, creer_commande
from .models import PanierPartage

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"  # base32 majuscule (CAP-11)


def _token() -> str:
    longueur = parametres.entier("LIEN-COURT-LONG")
    while True:
        t = "".join(secrets.choice(ALPHABET) for _ in range(longueur))
        if not PanierPartage.objects.filter(token=t).exists():
            return t


def en_dict(pp: PanierPartage) -> dict:
    """PanierPartage (source.ts)."""
    relais = pont.relais(pp.relay_id) if pp.relay_id else None
    return {
        "id": pp.token,
        "prenom": pp.client.first_name or pp.client.username,
        "relais": relais.quartier if relais else "",  # le quartier seulement, jamais l'adresse
        "lignes": [{k: lg[k] for k in ("titre", "dessin", "qte", "prix", "boutique")} for lg in pp.lignes],
        "sousTotal": pp.sous_total,
        "livraison": pp.livraison,
        "frais": pp.frais,
        "total": pp.total,
        "creeLe": ms(pp.cree_le),
        "ref": pont.ref_commande(pp.order_id) if pp.order_id else None,
        "payeur": pp.payeur,
    }


def partager(user, lignes_ids: list[str] | None) -> PanierPartage:
    from belivay_moteurs.carte import frais_de_service
    from belivay_moteurs.frais import calculer

    panier = services.panier_de(user)
    lignes = services.lignes_actives(panier)
    if lignes_ids:
        lignes = lignes.filter(pk__in=[int(i) for i in lignes_ids])
    _, par_boutique, produits = services.vers_moteur(user, panier, lignes)
    figees = services.lignes_figees(par_boutique, produits)
    if not figees:
        raise refus("panier_vide", "Ton panier est vide.")
    for lg in figees:
        lg["dessin"] = pont.image(lg["product_id"])
    moteur = services.moteur_depuis_lignes("relais", figees)
    f = calculer(moteur, parametres.livraison())
    service = frais_de_service(f.total, parametres.paiement())
    relais = services.relais_du_panier(user, panier)
    return PanierPartage.objects.create(
        token=_token(),
        client=user,
        mode="relais",
        relay_id=relais.id if relais else None,
        lignes=figees,
        sous_total=f.sous_total,
        livraison=f.total - f.sous_total,
        frais=service,
        total=f.total + service,
        version_parametres=f.version_parametres,
    )


def payer(token: str, prenom: str, email: str, jeton_carte: str, devise: str) -> PanierPartage:
    from apps.pickup.models import MontantsCommande
    from apps.pickup.services import creer_sous_commandes
    from apps.wallet.prestataires import carte
    from belivay_moteurs.carte import Devise, en_devise, payer_par_carte

    with transaction.atomic():
        pp = PanierPartage.objects.select_for_update().filter(token=token.upper()).first()
        if pp is None:
            raise introuvable()
        if pp.order_id:
            raise ErreurClient(status.HTTP_409_CONFLICT, "deja_paye", "Ce panier a déjà été payé.")
        moteur = services.moteur_depuis_lignes(pp.mode, pp.lignes)
        pp_param = parametres.paiement()
        decoupage = payer_par_carte(
            moteur, parametres.livraison(), pp_param, Devise(devise), carte().taux_usd() if devise == "USD" else None
        )
        if len(decoupage.transactions) != 1 or decoupage.reste_au_panier:
            raise refus("over_cap", "Ce panier dépasse le plafond d'un paiement par carte.", {"plafond": pp_param.carte_max})
        taux = carte().taux_usd() if devise == "USD" else None
        montant_devise = en_devise(pp.total, Devise(devise), taux)
        r = carte().payer(
            montant_xaf=pp.total, devise=devise, montant_devise=montant_devise, jeton=jeton_carte, reference=f"PP-{pp.token}", email=email
        )
        if r.statut == "refuse":
            raise ErreurClient(
                status.HTTP_402_PAYMENT_REQUIRED, "card_declined", "La carte a été refusée. Rien n'a été débité.", {"motif": r.motif}
            )
        if r.statut == "action_requise":
            raise ErreurClient(
                status.HTTP_402_PAYMENT_REQUIRED,
                "authentication_required",
                "Confirme le paiement auprès de ta banque.",
                {"redirection": r.redirection},
            )
        payeur = {"prenom": prenom, "email": email, "carte": "Carte", "devise": devise, "le": ms(timezone.now())}
        order_id = creer_commande(
            NouvelleCommande(
                user=pp.client,
                mode=pp.mode,
                relay_id=pp.relay_id,
                adresse=None,
                telephone="",
                lignes=tuple((lg["product_id"], lg["titre"], lg["prix"], lg["qte"]) for lg in pp.lignes),
                sous_total=pp.sous_total,
                livraison=pp.livraison,
                total=pp.total,
            )
        )
        relais = pont.relais(pp.relay_id) if pp.relay_id else None
        m = MontantsCommande.objects.create(
            order_id=order_id,
            client=pp.client,
            mode=pp.mode,
            relay_id=pp.relay_id,
            lieu=relais.nom if relais else "",
            sous_total=pp.sous_total,
            ramassages=decoupage.transactions[0].frais.ramassages,
            remises=decoupage.transactions[0].frais.remises,
            supplements=decoupage.transactions[0].frais.supplements,
            offert=decoupage.transactions[0].frais.offert,
            total=pp.sous_total + pp.livraison,
            seuil=decoupage.transactions[0].frais.seuil,
            frais_service=pp.frais,
            version_parametres=pp.version_parametres,
            moyen="carte",
            avance=pp.total,
            devise=devise,
            montant_devise=montant_devise,
            taux_devise=taux,
            etat_paiement=MontantsCommande.EtatPaiement.PAYEE,
            payee_le=timezone.now(),
            payeur=payeur,
        )
        creer_sous_commandes(m, pp.lignes)
        pp.order_id, pp.payeur = order_id, payeur
        pp.save(update_fields=["order_id", "payeur"])
    return pp
