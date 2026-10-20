# backend/apps/diaspora/views.py
# Diaspora et proches (DP-54). Logique : services.py ; règles pures : regles.py. Réponses : types de
# site/src/donnees/source.ts (LienFamille, DemandeProche, CommandePourProche, ResultatInscription, Session).

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from apps.client_core.idempotence import idempotent
from apps.client_core.vues import VueClient, VuePublique

from . import services

TAG = ["Espace client · diaspora et proches"]


def _lire(serializer_cls, request):
    s = serializer_cls(data=request.data)
    s.is_valid(raise_exception=True)
    return s.validated_data


def _vide():
    return Response(status=status.HTTP_204_NO_CONTENT)


class LimiteInscription(AnonRateThrottle):
    scope = "diaspora_inscription"
    rate = "10/hour"


class LimiteCodes(UserRateThrottle):
    """Codes famille et invitations (4 caractères) : on ne les devine pas en essayant."""

    scope = "diaspora_codes"
    rate = "10/hour"


# ── Corps des requêtes ─────────────────────────────────────────────────────────────────────────────────


class Inscription(serializers.Serializer):
    prenom = serializers.CharField(max_length=150)
    nom = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    motDePasse = serializers.CharField(max_length=128)
    naissance = serializers.CharField(max_length=10)
    pays = serializers.CharField(max_length=60)
    ville = serializers.CharField(max_length=80)
    indicatif = serializers.CharField(max_length=6)
    numero = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=12)
    codeEmail = serializers.CharField(max_length=12)


class Social(serializers.Serializer):
    fournisseur = serializers.ChoiceField(choices=("google", "apple", "numero"))
    jeton = serializers.CharField(max_length=4096, required=False, allow_blank=True, default="")
    convertir = serializers.BooleanField(default=False)
    prenom = serializers.CharField(max_length=150)
    nom = serializers.CharField(max_length=150, allow_blank=True)
    email = serializers.CharField(max_length=254, required=False, allow_blank=True, default="")
    naissance = serializers.CharField(max_length=10)
    pays = serializers.CharField(max_length=60)
    ville = serializers.CharField(max_length=80)
    indicatif = serializers.CharField(max_length=6)
    numero = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=12)


class Recherche(serializers.Serializer):
    provider = serializers.ChoiceField(choices=("google", "apple"))
    credential = serializers.CharField(max_length=4096, required=False, allow_blank=True, default="")
    identity_token = serializers.CharField(max_length=4096, required=False, allow_blank=True, default="")


class ProcheActif(serializers.Serializer):
    lien = serializers.CharField(max_length=40)


class Code(serializers.Serializer):
    code = serializers.CharField(max_length=12)


class Invite(serializers.Serializer):
    prenom = serializers.CharField(max_length=80)
    numero = serializers.CharField(max_length=30)


class Reponse(serializers.Serializer):
    accepte = serializers.BooleanField()
    relais = serializers.CharField(max_length=160, required=False, allow_blank=True, allow_null=True)


class Relais(serializers.Serializer):
    relais = serializers.CharField(max_length=160)


class Livraison(serializers.Serializer):
    relais = serializers.CharField(max_length=160)
    domicile = serializers.BooleanField()
    prefere = serializers.ChoiceField(choices=("relais", "domicile"))


class Demande(serializers.Serializer):
    mot = serializers.CharField(max_length=120, allow_blank=True, default="")
    livraison = serializers.ChoiceField(choices=("relais", "domicile"))
    lignes = serializers.ListField(child=serializers.CharField(max_length=40), required=False, allow_null=True)


class Mot(serializers.Serializer):
    mot = serializers.CharField(max_length=120, allow_blank=True, default="")


class Commande(serializers.Serializer):
    carte = serializers.CharField(max_length=200, help_text="jeton du prestataire (carte, Apple Pay, Google Pay)")
    devise = serializers.ChoiceField(choices=("EUR", "USD"))
    mot = serializers.CharField(max_length=200, allow_blank=True, default="")
    titulaire = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    bin = serializers.CharField(max_length=8, required=False, allow_blank=True, default="")
    paysCarte = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    codeSms = serializers.CharField(max_length=12, required=False, allow_blank=True, default="")
    livraison = serializers.ChoiceField(choices=("relais", "domicile"), default="relais")
    moyen = serializers.ChoiceField(choices=("carte", "apple", "google"), default="carte")
    demande = serializers.CharField(max_length=40, required=False, allow_blank=True, allow_null=True)
    supplementPar = serializers.ChoiceField(choices=("payeur", "destinataire"), required=False, allow_null=True)


# ── Vues ───────────────────────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Inscription diaspora (inscrireDiaspora) : deux codes ; 422 code, codeEmail, age, pays, numero")
class Inscrire(VuePublique):
    throttle_classes = [LimiteInscription]

    def post(self, request):
        return Response(services.inscrire(_lire(Inscription, request), request))


@extend_schema(tags=TAG, summary="Identité Google ou Apple (identiteFournisseur) : prénom, nom, e-mail vérifié, compte existant")
class IdentiteFournisseur(VuePublique):
    throttle_classes = [LimiteInscription]

    def post(self, request):
        d = _lire(Recherche, request)
        return Response(services.identite_fournisseur(d["provider"], d["credential"] or d["identity_token"]))


@extend_schema(
    tags=TAG, summary="Inscription diaspora par Google, Apple ou le numéro (inscrireDiaspora) : 422 jeton, code, age, pays, numero"
)
class InscrireSocial(VuePublique):
    throttle_classes = [LimiteInscription]

    def post(self, request):
        return Response(services.inscrire_social(_lire(Social, request), request))


@extend_schema(tags=TAG, summary="Proche actif « Pour qui ? » (choisirProche) : 403 hors compte diaspora, 404 lien non actif")
class ProcheActifVue(VueClient):
    def put(self, request):
        return Response(services.choisir_proche(request.user, _lire(ProcheActif, request)["lien"]))


@extend_schema(tags=TAG, summary="Mes liens famille (liensFamille) · relier par code famille (lierParCode)")
class Liens(VueClient):
    def get_throttles(self):
        return [LimiteCodes()] if self.request.method == "POST" else []

    def get(self, request):
        return Response(services.liens_famille(request.user))

    def post(self, request):
        return Response(services.lier_par_code(request.user, _lire(Code, request)["code"]))


@extend_schema(tags=TAG, summary="Créer mon code famille (creerCodeFamille), côté Cameroun")
class CodeFamille(VueClient):
    def post(self, request):
        return Response(services.creer_code_famille(request.user))


@extend_schema(tags=TAG, summary="Inviter un proche par son numéro (inviterProche)")
class Inviter(VueClient):
    def post(self, request):
        d = _lire(Invite, request)
        return Response(services.inviter_proche(request.user, d["prenom"], d["numero"]))


@extend_schema(tags=TAG, summary="Lien d'invitation partageable (lienInvitation)")
class LienInvitation(VueClient):
    def post(self, request):
        return Response(services.lien_invitation(request.user))


@extend_schema(tags=TAG, summary="Accepter une invitation (accepterInvitation) : 404 code, 409 deja, 422 max, 403 type")
class AccepterInvitation(VueClient):
    throttle_classes = [LimiteCodes]

    def post(self, request, code):
        return Response(services.accepter_invitation(request.user, code, _lire(Relais, request)["relais"]))


@extend_schema(tags=TAG, summary="Répondre à une invitation (repondreLien), côté Cameroun")
class RepondreLien(VueClient):
    def post(self, request, id):
        d = _lire(Reponse, request)
        services.repondre_lien(request.user, id, d["accepte"], d.get("relais"))
        return _vide()


@extend_schema(tags=TAG, summary="Régler ma livraison pour ce proche (reglerLivraisonLien), côté Cameroun")
class LivraisonLien(VueClient):
    def patch(self, request, id):
        d = _lire(Livraison, request)
        services.regler_livraison(request.user, id, d["relais"], d["domicile"], d["prefere"])
        return _vide()


@extend_schema(tags=TAG, summary="Retirer un lien (retirerLien)")
class Lien(VueClient):
    def delete(self, request, id):
        services.retirer_lien(request.user, id)
        return _vide()


@extend_schema(tags=TAG, summary="Paniers entre proches reliés (demandesProches)")
class Demandes(VueClient):
    def get(self, request):
        return Response(services.demandes(request.user, request))


@extend_schema(
    tags=TAG, summary="Envoyer mon panier à mon proche diaspora (envoyerPanierAuProche) : 409 deja ; 422 vide, plafond, domicile"
)
class EnvoyerDemande(VueClient):
    def post(self, request, id):
        d = _lire(Demande, request)
        return Response(services.envoyer_panier_au_proche(request.user, id, d["mot"], d["livraison"], d.get("lignes")))


@extend_schema(tags=TAG, summary="Refuser un panier reçu, avec un mot (refuserDemande), côté diaspora")
class RefuserDemande(VueClient):
    def post(self, request, id):
        services.refuser_demande(request.user, id, _lire(Mot, request)["mot"])
        return _vide()


@extend_schema(tags=TAG, summary="Annuler un panier envoyé (annulerDemande), côté Cameroun")
class AnnulerDemande(VueClient):
    def delete(self, request, id):
        services.annuler_demande(request.user, id)
        return _vide()


@extend_schema(tags=TAG, summary="Commander pour un proche (commanderPour) : 422 domicile, demande, garantie")
class CommanderPour(VueClient):
    @idempotent()
    def post(self, request, id):
        return Response(services.commander_pour(request.user, id, _lire(Commande, request)))
