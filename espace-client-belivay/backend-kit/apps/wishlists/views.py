# backend/apps/wishlists/views.py
# Listes d'envies (CL-14 ; FF-LISTE-ENVIES) et échanges entre clients (DP-54). Logique : services.py ; règle commune
# des échanges : regles.py. Réponses : types de site/src/donnees/source.ts (ListeEnvies, ListePublique, SuiviCadeau,
# DonneesEchanges, ColisEchange…). Liens publics (CAP-11) : sans compte, débit limité.

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.client_core.erreurs import introuvable
from apps.client_core.idempotence import idempotent
from apps.client_core.interrupteurs import module
from apps.client_core.vues import VueClient, VuePublique

from . import serializers as s
from . import services

TAG_LISTES = ["Espace client · listes d'envies"]
TAG_ECHANGES = ["Espace client · échanges entre clients"]
LISTES = module("FF-LISTE-ENVIES")


def _lire(serializer_cls, request):
    ser = serializer_cls(data=request.data)
    ser.is_valid(raise_exception=True)
    return ser.validated_data


def _vide():
    return Response(status=status.HTTP_204_NO_CONTENT)


class LimitePublique(AnonRateThrottle):
    """Liens publics (liste, suivi d'un cadeau) : lecture."""

    scope = "liste_publique"
    rate = "120/hour"


class LimiteCadeau(AnonRateThrottle):
    """Paiement et code d'un cadeau sans compte."""

    scope = "cadeau"
    rate = "20/hour"


class VueListes(VueClient):
    permission_classes = [IsAuthenticated, LISTES]


class VueListesPublique(VuePublique):
    permission_classes = [AllowAny, LISTES]
    throttle_classes = [LimitePublique]


# ── Mes listes ─────────────────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG_LISTES, summary="Mes listes (listes) · créer une liste (creerListe)")
class MesListes(VueListes):
    def get(self, request):
        return Response(services.listes(request.user))

    def post(self, request):
        d = _lire(s.CreerListe, request)
        liste = services.creer_liste(
            request.user, d["nom"], d["mode"], d.get("remiseLe"), d["surprise"], d.get("occasion"), d.get("hotes"), d.get("cagnotte")
        )
        return Response(services.liste_dict(liste), status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG_LISTES, summary="Régler une liste (reglerListe) : destination, tiers, surprise, domicile")
class MaListe(VueListes):
    def patch(self, request, id):
        d = _lire(s.ReglerListe, request)
        services.regler_liste(services.liste_du_client(request.user, id), {k: v for k, v in d.items()})
        return _vide()


@extend_schema(tags=TAG_LISTES, summary="Ajouter un article à une liste (ajouterArticleListe)")
class ArticlesListe(VueListes):
    def post(self, request, id):
        d = _lire(s.Produit, request)
        services.ajouter_article(services.liste_du_client(request.user, id), d["produit"])
        return _vide()


@extend_schema(tags=TAG_LISTES, summary="Retirer un article (retirerArticleListe) : refusé pour un article offert")
class ArticleListe(VueListes):
    def delete(self, request, id, produit):
        return Response(services.retirer_article(services.liste_du_client(request.user, id), produit))


@extend_schema(tags=TAG_LISTES, summary="Partager une liste (partagerListe) · arrêter le partage (arreterPartage)")
class PartageListe(VueListes):
    def post(self, request, id):
        return Response(services.liste_dict(services.partager(services.liste_du_client(request.user, id))))

    def delete(self, request, id):
        services.arreter_partage(services.liste_du_client(request.user, id))
        return _vide()


@extend_schema(tags=TAG_LISTES, summary="Démarrer une liste groupée (demarrerListe)")
class DemarrerListe(VueListes):
    def post(self, request, id):
        liste = services.liste_du_client(request.user, id)
        liste.demarree = True
        liste.save(update_fields=["demarree"])
        return _vide()


@extend_schema(tags=TAG_LISTES, summary="Mettre sa liste en statut (partagerStatutListe) : crée le lien au besoin")
class StatutListe(VueListes):
    def post(self, request, id):
        d = _lire(s.Canal, request)
        return Response(services.mettre_en_statut(services.liste_du_client(request.user, id), d["canal"]))


@extend_schema(tags=TAG_ECHANGES, summary="Rappeler à mes invités (rappelerInvites) : un rappel tous les 3 jours au plus")
class RappelerInvites(VueListes):
    def post(self, request, id):
        return Response(services.rappeler_invites(request.user, id))


# ── Liens publics et cadeaux ───────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG_LISTES, summary="Liste publique (listePublique) : jamais l'adresse")
class ListePublique(VueListesPublique):
    def get(self, request, code):
        d = services.liste_publique(code)
        if d is None:
            raise introuvable("Ce lien n'est plus valable.")
        return Response(d)


@extend_schema(
    tags=TAG_LISTES, summary="Offrir un article (offrirArticleListe) : 409 price_changed ; 422 plafond, domicile, coherence, verification"
)
class Offrir(VueListesPublique):
    throttle_classes = [LimiteCadeau]

    @idempotent()
    def post(self, request, code):
        d = _lire(s.Offrir, request)
        return Response(services.offrir(code, d["produit"], d))


@extend_schema(tags=TAG_LISTES, summary="Code de vérification renforcée d'un cadeau par carte (envoyerCodeCadeau)")
class CodeCadeau(VueListesPublique):
    throttle_classes = [LimiteCadeau]

    def post(self, request, code):
        d = _lire(s.Email, request)
        return Response(services.envoyer_code_cadeau(code, d["email"]))


@extend_schema(tags=TAG_LISTES, summary="Suivi d'un cadeau pour qui l'a offert (suiviCadeau) : jamais l'adresse, le code ni le numéro")
class SuiviCadeau(VueListesPublique):
    def get(self, request, code, ref):
        d = services.suivi_cadeau(code, ref)
        if d is None:
            raise introuvable("Cadeau introuvable.")
        return Response(d)


@extend_schema(
    tags=TAG_LISTES, summary="Participer à la cagnotte d'une liste (participerCagnotteListe) : sans compte ; refus ferme, montant"
)
class CagnotteListe(VueListesPublique):
    throttle_classes = [LimiteCadeau]

    @idempotent()
    def post(self, request, code):
        return Response(services.participer_cagnotte(code, _lire(s.ParticiperCagnotte, request)))


@extend_schema(tags=TAG_ECHANGES, summary="Cotiser à plusieurs pour un article cher (cotiserArticleListe)")
class CotiserArticle(VueListesPublique):
    throttle_classes = [LimiteCadeau]

    def post(self, request, code, produit):
        return Response(services.cotiser_article(code, produit))


# ── Échanges entre clients ─────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG_ECHANGES, summary="Échanges (echanges) : proches, listes suivies, envois, mercis, colis")
class Echanges(VueClient):
    def get(self, request):
        return Response(services.echanges(request.user, request))


@extend_schema(tags=TAG_ECHANGES, summary="Chercher un proche par son numéro (chercherProche) : 20 par jour")
class ChercherProche(VueClient):
    def post(self, request):
        d = _lire(s.Numero, request)
        return Response(services.chercher_proche(request.user, d["numero"]))


@extend_schema(tags=TAG_ECHANGES, summary="Envoyer une liste ou une cotisation dans l'application de proches (envoyerAuxProches)")
class EnvoyerAuxProches(VueClient):
    def post(self, request):
        d = _lire(s.EnvoyerAuxProches, request)
        return Response(services.envoyer_aux_proches(request.user, d["type"], d["id"], d["proches"]))


@extend_schema(tags=TAG_ECHANGES, summary="Suivre la liste d'un proche (suivreListe)")
class SuivreListe(VueClient):
    def put(self, request, code):
        d = _lire(s.Suivre, request)
        services.suivre_liste(request.user, code, d["suivre"], d.get("rappel"))
        return _vide()


@extend_schema(tags=TAG_ECHANGES, summary="Remercier qui a offert (remercier)")
class Remercier(VueClient):
    def post(self, request):
        d = _lire(s.Merci, request)
        services.remercier(request.user, d["ref"], d["texte"])
        return _vide()


@extend_schema(tags=TAG_ECHANGES, summary="Accepter ou refuser un colis payé pour moi (repondreColis)")
class RepondreColis(VueClient):
    def post(self, request, id):
        d = _lire(s.Reponse, request)
        return Response(services.repondre_colis(request.user, id, d["accepte"]))


@extend_schema(tags=TAG_ECHANGES, summary="Payer son panier pour un proche (envoyerPanierA)")
class EnvoyerPanierA(VueClient):
    @idempotent()
    def post(self, request):
        d = _lire(s.EnvoyerPanier, request)
        return Response(services.envoyer_panier_a(request.user, d))
