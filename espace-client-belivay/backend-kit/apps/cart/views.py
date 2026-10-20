# backend/apps/cart/views.py
# Panier, panier partagé et paiement (CL-07, CL-08, CL-12). Logique : services.py, paiement.py, partage.py.

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.client_core import pont
from apps.client_core.erreurs import conflit, introuvable, refus
from apps.client_core.idempotence import idempotent
from apps.client_core.vues import VueClient, VuePublique

from . import paiement, partage, services
from .models import LignePanier, PanierPartage
from .serializers import (
    AjoutSerializer,
    CommandeSerializer,
    ModeSerializer,
    ModifLigneSerializer,
    OffreSerializer,
    PaiementPartageSerializer,
    PartageSerializer,
    RelanceSerializer,
)

TAG = ["Espace client · panier et paiement"]
VIDE = Response(status=status.HTTP_204_NO_CONTENT)


def _lire(serializer_cls, request):
    s = serializer_cls(data=request.data)
    s.is_valid(raise_exception=True)
    return s.validated_data


def _ligne(request, id) -> LignePanier:
    try:
        pk = int(id)
    except ValueError:
        raise introuvable() from None
    return get_object_or_404(LignePanier, pk=pk, panier__client=request.user)


@extend_schema(tags=TAG, summary="Panier recalculé (panier, verifierPanier) · mode (choisirModePanier)")
class PanierVue(VueClient):
    def get(self, request):
        return Response(services.donnees_panier(request.user, services.panier_de(request.user)))

    def patch(self, request):
        d = _lire(ModeSerializer, request)
        p = services.panier_de(request.user)
        p.mode = d["mode"]
        p.save(update_fields=["mode"])
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=TAG, summary="Ajouter au panier (ajouterProduit, ajouterAuPanier, favoriAuPanier, remettreLigne, ajouterFlash)")
class LignesVue(VueClient):
    def post(self, request):
        d = _lire(AjoutSerializer, request)
        if d.get("ligne"):  # remettreLigne : annuler un retrait
            lg = _ligne(request, d["ligne"])
            lg.retiree_le = None
            if "position" in d:
                lg.position = d["position"]
            lg.save(update_fields=["retiree_le", "position"])
            return Response({"ok": True, "id": str(lg.pk)})
        if d.get("favori"):
            product_id = pont.favori_produit(d["favori"], request.user)
            if product_id is None:
                raise introuvable()
        else:
            product_id = d["produit"]
        if d.get("boutique"):  # une autre offre du même produit (« Autres vendeurs »)
            offre = next(
                (o for o in pont.autres_offres(product_id) if o.boutique and d["boutique"] in (o.boutique.nom, str(o.boutique.id))), None
            )
            if offre is not None:
                product_id = offre.id
        if d.get("flash"):
            actif = services.appeler("apps.extras.services", "offre_flash_active", product_id, defaut=False)
            if not actif:
                return Response({"ok": False})
        lg = services.ajouter(
            request.user, int(product_id), d.get("qte", 1), d.get("variante", ""), d.get("options"), flash=d.get("flash", False)
        )
        return Response({"ok": True, "id": str(lg.pk)})


@extend_schema(tags=TAG, summary="Quantité ou option (changerQuantite, changerOption) · retirer (retirerLigne)")
class LigneVue(VueClient):
    def patch(self, request, id):
        lg = _ligne(request, id)
        d = _lire(ModifLigneSerializer, request)
        if "qte" in d:
            p = pont.produit(lg.product_id)
            if p is not None and p.stock is not None and d["qte"] > p.stock:
                raise refus("stock", "Il n'en reste pas assez.", {"stock": p.stock})
            lg.qte = d["qte"]
        if "variante" in d:
            lg.variante = d["variante"]
        if d.get("nom"):
            lg.options = {**lg.options, d["nom"]: d.get("valeur", "")}
        lg.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, id):
        services.retirer(_ligne(request, id))
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=TAG, summary="Mettre en favori (mettreEnFavori) : la ligne quitte le panier")
class SauverLigne(VueClient):
    def post(self, request, id):
        lg = _ligne(request, id)
        pont.mettre_en_favori(request.user, lg.product_id)
        lg.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=TAG, summary="Changer d'offre (choisirVendeur) : refusé si le gain n'est plus positif (CAL-08)")
class ChangerOffre(VueClient):
    def post(self, request, id):
        from apps.client_core import parametres
        from belivay_moteurs.frais import gain_conseil

        lg = _ligne(request, id)
        d = _lire(OffreSerializer, request)
        offre = next(
            (o for o in pont.autres_offres(lg.product_id) if o.boutique and d["boutique"] in (o.boutique.nom, str(o.boutique.id))), None
        )
        if offre is None:
            raise introuvable("Cette offre n'existe plus.")
        panier = services.panier_de(request.user)
        actuel, _, _ = services.vers_moteur(request.user, panier)
        avant = (lg.product_id, lg.vendor_id, lg.prix_vu)
        lg.product_id, lg.vendor_id, lg.prix_vu = offre.id, offre.boutique.id, offre.prix
        lg.save(update_fields=["product_id", "vendor_id", "prix_vu"])
        simule, _, _ = services.vers_moteur(request.user, panier)
        gain = gain_conseil(actuel, simule, parametres.livraison())
        if gain <= 0:
            lg.product_id, lg.vendor_id, lg.prix_vu = avant
            lg.save(update_fields=["product_id", "vendor_id", "prix_vu"])
            raise conflit("no_gain", "Ce changement ne fait plus gagner d'argent.", {"gain": gain})
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=TAG, summary="Accepter les changements de prix (accepterChangements)")
class Confirmer(VueClient):
    def post(self, request):
        services.accepter_changements(request.user, services.panier_de(request.user))
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=TAG, summary="Passer commande (passerCommande) : prix recontrôlés, 409 price_changed")
class Commander(VueClient):
    @idempotent()
    def post(self, request):
        return Response(paiement.passer_commande(request.user, _lire(CommandeSerializer, request)))


@extend_schema(tags=TAG, summary="Reçu d'une commande (commandePassee)")
class Recu(VueClient):
    def get(self, request, id):
        return Response(paiement.recu(id, request.user))


@extend_schema(tags=TAG, summary="Demandes Mobile Money pas encore validées (paiementsEnAttente)")
class EnAttente(VueClient):
    def get(self, request):
        return Response(paiement.en_attente(request.user))


@extend_schema(tags=TAG, summary="Nouvelle demande Mobile Money (relancerPaiement)")
class Relancer(VueClient):
    @idempotent()
    def post(self, request, id):
        return Response(paiement.relancer(id, request.user, _lire(RelanceSerializer, request).get("numero")))


@extend_schema(tags=TAG, summary="Abandonner la demande de paiement (annulerPaiement) : rien n'est débité")
class AnnulerPaiement(VueClient):
    def post(self, request, id):
        paiement.annuler(id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=TAG, summary="Payer au comptoir le montant dû (payerAuComptoir)")
class PayerComptoir(VueClient):
    @idempotent()
    def post(self, request, id):
        paiement.payer_au_comptoir(id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=TAG, summary="Partager le panier (partagerPanier) : lien payé par un proche")
class Partager(VueClient):
    def post(self, request, id):
        # {id} : « me » ou l'identifiant du panier du client ; un autre panier n'est jamais lu.
        if id not in ("me", str(services.panier_de(request.user).pk)):
            raise introuvable()
        pp = partage.partager(request.user, _lire(PartageSerializer, request).get("lignes"))
        return Response(partage.en_dict(pp))


class LiensPublics(AnonRateThrottle):
    scope = "anon"


@extend_schema(tags=TAG, summary="Panier partagé, vu du payeur (panierPartage) : sans adresse ni numéro")
class PanierPartageVue(VuePublique):
    throttle_classes = [LiensPublics]

    def get(self, request, token):
        pp = PanierPartage.objects.filter(token=token.upper()).first()
        if pp is None:
            raise introuvable()
        return Response(partage.en_dict(pp))


@extend_schema(tags=TAG, summary="Mes paniers partagés (paniersPartages)")
class MesPaniersPartages(VueClient):
    def get(self, request):
        return Response([partage.en_dict(pp) for pp in PanierPartage.objects.filter(client=request.user)[:50]])


@extend_schema(tags=TAG, summary="Payer un panier partagé par carte (payerPanierPartage) : 402 card_declined, 422 over_cap")
class PayerPanierPartage(VuePublique):
    throttle_classes = [LiensPublics]

    @idempotent()
    def post(self, request):
        d = _lire(PaiementPartageSerializer, request)
        return Response(partage.en_dict(partage.payer(d["token"], d["prenom"], d["email"], d["carte"], d["devise"])))
