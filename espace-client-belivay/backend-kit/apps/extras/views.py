# backend/apps/extras/views.py
# Modules CL-15 (DP-54) : cotisations, mises de côté, ventes flash, rentrée, panier famille, reprise, WhatsApp.
# Logique : services.py ; règles pures : regles.py. Chaque module derrière son interrupteur (404 s'il est fermé).

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.client_core.erreurs import introuvable, refus
from apps.client_core.idempotence import idempotent
from apps.client_core.interrupteurs import module
from apps.client_core.vues import VueClient, VuePublique, a_finir

from . import services

TAG = ["Espace client · modules CL-15"]


def _lire(serializer_cls, request):
    s = serializer_cls(data=request.data)
    s.is_valid(raise_exception=True)
    return s.validated_data


def _vide():
    return Response(status=status.HTTP_204_NO_CONTENT)


def _client(module_code):
    return type(f"Vue_{module_code.replace('-', '_')}", (VueClient,), {"permission_classes": [IsAuthenticated, module(module_code)]})


def _public(module_code):
    return type(f"VuePublique_{module_code.replace('-', '_')}", (VuePublique,), {"permission_classes": [AllowAny, module(module_code)]})


class LimiteParticipation(AnonRateThrottle):
    scope = "cotisation"
    rate = "30/hour"


Cotisations, CotisationsPubliques = _client("FF-EX02"), _public("FF-EX02")
Cotes = _client("FF-EX03")
Flash = _public("FF-FLASH")
Rentree, RentreePublique = _client("FF-EX01"), _public("FF-EX01")
Famille = _client("FF-EX05")
Reprise = _client("FF-EX04")


# ── Corps des requêtes ─────────────────────────────────────────────────────────────────────────────────


class CreerCotisation(serializers.Serializer):
    nom = serializers.CharField(max_length=160)
    occasion = serializers.CharField(max_length=40, allow_blank=True)
    p = serializers.CharField(max_length=40)
    beneficiaire = serializers.CharField(max_length=80)
    relais = serializers.CharField(max_length=160)
    jusqua = serializers.IntegerField()
    qui = serializers.ChoiceField(choices=("payeur", "destinataire"), required=False)


class Participer(serializers.Serializer):
    prenom = serializers.CharField(max_length=80)
    montant = serializers.IntegerField(min_value=1)
    discret = serializers.BooleanField(default=False)
    mot = serializers.CharField(max_length=200, allow_blank=True, default="")
    moyen = serializers.CharField(max_length=120)
    jeton = serializers.CharField(max_length=200, required=False, allow_blank=True)
    carte = serializers.BooleanField(default=False)


class Hausse(serializers.Serializer):
    choix = serializers.ChoiceField(choices=("completer", "rembourser"))
    moyen = serializers.CharField(max_length=120, required=False, allow_blank=True, allow_null=True)


class CreerCote(serializers.Serializer):
    produit = serializers.CharField(max_length=40, required=False)
    liste = serializers.CharField(max_length=40, required=False)
    exclus = serializers.ListField(child=serializers.CharField(max_length=40), required=False, default=list)
    equivalents = serializers.ListField(child=serializers.CharField(max_length=40), required=False, default=list)
    rythme = serializers.ChoiceField(choices=("2sem", "mois"))
    moyen = serializers.CharField(max_length=120)


class Moyen(serializers.Serializer):
    moyen = serializers.CharField(max_length=120)


class CommandeRentree(serializers.Serializer):
    exclus = serializers.ListField(child=serializers.CharField(max_length=40), default=list)
    equivalents = serializers.ListField(child=serializers.CharField(max_length=40), default=list)
    moyen = serializers.CharField(max_length=120)


class LigneFamille(serializers.Serializer):
    id = serializers.CharField(max_length=40)
    qte = serializers.IntegerField(min_value=0, max_value=99)


class DestinataireFamille(serializers.Serializer):
    prenom = serializers.CharField(max_length=80)
    relais = serializers.CharField(max_length=160)


class PanierFamille(serializers.Serializer):
    nom = serializers.CharField(max_length=80, required=False)
    destinataire = DestinataireFamille(required=False, allow_null=True)
    articles = LigneFamille(many=True, required=False)
    mensuel = serializers.BooleanField(required=False)
    jour = serializers.IntegerField(required=False)
    suspendu = serializers.BooleanField(required=False)
    email = serializers.CharField(max_length=254, required=False, allow_blank=True)


class Suspendre(serializers.Serializer):
    suspendu = serializers.BooleanField()


class Destinataire(serializers.Serializer):
    prenom = serializers.CharField(max_length=80)
    numero = serializers.CharField(max_length=30)
    relais = serializers.CharField(max_length=160)


class PayerFamille(serializers.Serializer):
    carte = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    mensuel = serializers.BooleanField()
    jour = serializers.IntegerField(min_value=1, max_value=28)


class CreerTroc(serializers.Serializer):
    produit = serializers.CharField(max_length=40)
    modele = serializers.CharField(max_length=40)
    declare = serializers.JSONField()


class Reponse(serializers.Serializer):
    accepte = serializers.BooleanField()


class Texte(serializers.Serializer):
    texte = serializers.CharField(max_length=500)


# ── Cotisations (FF-EX02) ──────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Mes cotisations (cotisations) · créer (creerCotisation)")
class MesCotisations(Cotisations):
    def get(self, request):
        return Response(services.cotisations(request.user, request))

    def post(self, request):
        c = services.creer_cotisation(request.user, _lire(CreerCotisation, request))
        return Response(services.cotisation_dict(c), status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG, summary="Décider après une hausse de prix (deciderHausse)")
class DeciderHausse(Cotisations):
    def post(self, request, id):
        d = _lire(Hausse, request)
        return Response(services.decider_hausse(request.user, id, d["choix"], d.get("moyen")))


@extend_schema(tags=TAG, summary="Cotisation publique (cotisationPublique) : noms discrets masqués")
class CotisationPublique(CotisationsPubliques):
    def get(self, request, code):
        d = services.cotisation_publique(code)
        if d is None:
            raise introuvable("Cotisation introuvable.")
        return Response(d)


@extend_schema(tags=TAG, summary="Participer à une cotisation (participer), sans compte")
class Participer_(CotisationsPubliques):
    throttle_classes = [LimiteParticipation]

    @idempotent()
    def post(self, request, code):
        return Response(services.participer(code, _lire(Participer, request), request.user))


# ── Mises de côté (FF-EX03) ────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Mes mises de côté (misesDeCote) · créer, acompte payé (creerMiseDeCote, creerMiseDeCoteListe)")
class MesCotes(Cotes):
    def get(self, request):
        return Response(services.mises_de_cote(request.user, request))

    @idempotent()
    def post(self, request):
        d = _lire(CreerCote, request)
        if d.get("liste"):
            m = services.creer_mise_de_cote_liste(request.user, d["liste"], d["exclus"], d["equivalents"], d["rythme"], d["moyen"])
        elif d.get("produit"):
            m = services.creer_mise_de_cote(request.user, d["produit"], d["rythme"], d["moyen"])
        else:
            raise refus("invalid", "Choisis un article ou une liste de rentrée.")
        return Response(services.mise_dict(m), status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG, summary="Payer le prochain versement (payerVersement)")
class Versement(Cotes):
    @idempotent()
    def post(self, request, id):
        return Response(services.mise_dict(services.payer_versement(request.user, id, _lire(Moyen, request)["moyen"])))


@extend_schema(tags=TAG, summary="Annuler une mise de côté (annulerMiseDeCote) : versements rendus moins le forfait")
class AnnulerCote(Cotes):
    def post(self, request, id):
        return Response(services.mise_dict(services.annuler_mise_de_cote(request.user, id)))


# ── Ventes flash (FF-FLASH) ────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Ventes flash (ventesFlash)")
class VentesFlash(Flash):
    def get(self, request):
        return Response(services.ventes_flash(request.user))


# ── Rentrée (FF-EX01) ──────────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Listes de rentrée (rentree)")
class ListesRentree(RentreePublique):
    def get(self, request):
        return Response(services.rentree(request.user))


@extend_schema(tags=TAG, summary="Commander une liste de rentrée (commanderRentree) → référence de commande")
class CommanderRentree(Rentree):
    @idempotent()
    def post(self, request, id):
        d = _lire(CommandeRentree, request)
        return Response(services.commander_rentree(request.user, id, d["exclus"], d["equivalents"], d["moyen"]))


@extend_schema(tags=TAG, summary="Publier une liste (publierListe) : école vérifiée")
class ListePapierVue(Rentree):
    def post(self, request):
        classe = str(request.data.get("classe") or "").strip()
        photo = request.FILES.get("photo") or request.data.get("photo")
        if not classe or not photo:
            raise refus("invalid", "Choisis la classe et prends la liste en photo.")
        services.envoyer_liste_papier(request.user, classe, photo)
        return _vide()


class PublierRentree(Rentree):
    def post(self, request, id):
        services.publier_liste(request.user, id)
        return _vide()


# ── Panier famille (FF-EX05) ───────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Panier famille (famille) · enregistrer (enregistrerPanierFamille)")
class MesPaniersFamille(Famille):
    def get(self, request):
        return Response(services.famille(request.user))

    def post(self, request):
        _lire(PanierFamille, request)
        p = services.enregistrer_panier_famille(request.user, request.data)
        return Response(services.panier_famille_dict(p), status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG, summary="Enregistrer (enregistrerPanierFamille) · suspendre (suspendrePanierFamille)")
class PanierFamille_(Famille):
    def put(self, request, id):
        _lire(PanierFamille, request)
        return Response(services.panier_famille_dict(services.enregistrer_panier_famille(request.user, request.data, id)))

    def patch(self, request, id):
        services.enregistrer_panier_famille(request.user, {"suspendu": _lire(Suspendre, request)["suspendu"]}, id)
        return _vide()


@extend_schema(tags=TAG, summary="Lier le proche qui retire (lierDestinataire)")
class DestinataireVue(Famille):
    def post(self, request):
        d = _lire(Destinataire, request)
        services.lier_destinataire(request.user, d["prenom"], d["numero"], d["relais"])
        return _vide()


@extend_schema(tags=TAG, summary="Payer un panier famille par carte (payerPanierFamille)")
class PayerFamille_(Famille):
    @idempotent()
    def post(self, request, id):
        p = services.payer_panier_famille(request.user, id, _lire(PayerFamille, request))
        return Response(services.panier_famille_dict(p))


# ── Reprise (FF-EX04) ──────────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Mes reprises (trocs) · créer (creerTroc)")
class MesTrocs(Reprise):
    def get(self, request):
        return Response(services.trocs(request.user, request))

    def post(self, request):
        d = _lire(CreerTroc, request)
        return Response(
            services.troc_dict(services.creer_troc(request.user, d["produit"], d["modele"], d["declare"])), status=status.HTTP_201_CREATED
        )


@extend_schema(tags=TAG, summary="Annuler une reprise avant le dépôt (annulerTroc)")
class TrocVue(Reprise):
    def delete(self, request, id):
        services.annuler_troc(request.user, id)
        return _vide()


@extend_schema(tags=TAG, summary="Répondre à une contre-offre (repondreTroc)")
class RepondreTroc(Reprise):
    def post(self, request, id):
        return Response(services.troc_dict(services.repondre_troc(request.user, id, _lire(Reponse, request)["accepte"])))


@extend_schema(tags=TAG, summary="Contester un constat (contesterTroc)")
class ContesterTroc(Reprise):
    def post(self, request, id):
        return Response(services.troc_dict(services.contester_troc(request.user, id, _lire(Texte, request)["texte"])))


@extend_schema(tags=TAG, summary="Payer le neuf moins la reprise (payerTroc)")
class PayerTroc(Reprise):
    @idempotent()
    def post(self, request, id):
        return Response(services.troc_dict(services.payer_troc(request.user, id, _lire(Moyen, request)["moyen"])))


# ── WhatsApp (FF-EX06) ─────────────────────────────────────────────────────────────────────────────────

MANQUE_WHATSAPP = (
    "Assistant de commande WhatsApp : relaya n'a qu'un webhook entrant (module whatsapp_assistant) ; il manque "
    "l'envoi par l'API WhatsApp Business (WAP-API : « non au lancement »), l'écoute et la suppression des vocaux "
    "(WAP-VOCAL-CONSERV à fixer), la conversation stockée par client et la passation à un conseiller (console)."
)
whatsapp = a_finir("whatsapp", manque=MANQUE_WHATSAPP)
whatsapp_messages = a_finir("repondreWhatsapp", manque=MANQUE_WHATSAPP)
