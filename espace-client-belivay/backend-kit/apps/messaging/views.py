# backend/apps/messaging/views.py
# Routes de la messagerie, de l'aide et du rappel (CL-13 ; CMS-01 à CMS-12 ; DP-12). Réponses : types de
# site/src/donnees/source.ts (conversations, conversation, envoyerMessage, marquerToutLu, poserQuestion, aide, faq,
# rappel, demanderRappel, annulerRappel).
#
# Filtrage au queryset : la conversation d'un autre client n'est jamais chargée (404).

from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.client_core import pont
from apps.client_core.erreurs import introuvable
from apps.client_core.pagination import page
from apps.client_core.temps import maintenant_ms
from apps.client_core.vues import VueClient, VuePublique

from . import services
from .models import Message

TAG = ["Espace client · Messagerie et aide"]


def _photo(request):
    """Photo d'un message : fichier multipart ou data: URL dans le JSON."""
    return request.FILES.get("photo") or request.data.get("photo") or None


class ConversationsVue(VueClient):
    @extend_schema(tags=TAG, summary="Mes conversations (support, dossiers, questions aux vendeurs)")
    def get(self, request):
        qs = services.conversations_visibles(request.user).prefetch_related(
            Prefetch("messages", queryset=Message.objects.order_by("cree_le", "pk"))
        )
        elements, suivant = page(request, qs, taille=20)
        # La page suit l'ordre du curseur (CAP-05) ; dans la page, la conversation la plus active d'abord.
        elements.sort(key=lambda c: c.maj_le, reverse=True)
        return Response(
            {
                "conversations": [services.conversation_json(c) for c in elements],
                "maintenant": maintenant_ms(),
                "commandesEnCours": services.commandes_en_cours(request.user),
                "next_cursor": suivant,
            }
        )


class ConversationVue(VueClient):
    @extend_schema(tags=TAG, summary="Une conversation (la marque lue)")
    def get(self, request, id):
        conv = services.conversation_du_client(request.user, id)
        if conv is None:
            raise introuvable()
        services.marquer_lue(conv)
        return Response({"conversation": services.conversation_json(conv), "maintenant": maintenant_ms()})


class MessageEntree(serializers.Serializer):
    texte = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class MessagesVue(VueClient):
    @extend_schema(
        tags=TAG, summary="Écrire dans une conversation (numéros, e-mails et liens masqués avant l'envoi)", request=MessageEntree
    )
    def post(self, request, id):
        entree = MessageEntree(data={"texte": request.data.get("texte", "")})
        entree.is_valid(raise_exception=True)
        conv = services.conversation_du_client(request.user, id)
        if conv is None:
            raise introuvable()
        masques = services.envoyer_message(conv, entree.validated_data.get("texte"), _photo(request))
        return Response({"masques": masques})


class ToutLuVue(VueClient):
    @extend_schema(tags=TAG, summary="Tout marquer lu", request=None, responses={204: None})
    def post(self, request):
        services.tout_marquer_lu(request.user)
        return Response(status=204)


class QuestionEntree(serializers.Serializer):
    produit = serializers.CharField(max_length=40)
    texte = serializers.CharField(max_length=2000)


class QuestionVue(VueClient):
    @extend_schema(tags=TAG, summary="Poser une question au vendeur d'un produit", request=QuestionEntree)
    def post(self, request):
        entree = QuestionEntree(data=request.data)
        entree.is_valid(raise_exception=True)
        produit = pont.produit(entree.validated_data["produit"])
        if produit is None or not produit.actif:
            raise introuvable("Ce produit n'existe plus.")
        conv = services.question_vendeur(request.user, produit)
        masques = services.envoyer_message(conv, entree.validated_data["texte"])
        return Response({"id": conv.cle, "masques": masques})


class AideVue(VueClient):
    @extend_schema(tags=TAG, summary="Aide : dossier en cours, conversations, heures du support, état des services")
    def get(self, request):
        return Response(services.donnees_aide(request.user))


class FaqVue(VuePublique):
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=TAG, summary="Questions fréquentes (?lang=fr&q=remboursement)")
    def get(self, request):
        return Response(services.faq(request.query_params.get("lang", "fr"), request.query_params.get("q", "")))


class RappelEntree(serializers.Serializer):
    sujet = serializers.CharField(max_length=120)
    commande = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    creneau = serializers.CharField(max_length=40)
    precision = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")


class RappelVue(VueClient):
    @extend_schema(tags=TAG, summary="Mon rappel par le support (null s'il n'y en a pas)")
    def get(self, request):
        r = services.rappel_en_cours(request.user)
        return Response(services.rappel_json(r) if r else None)

    @extend_schema(
        tags=TAG, summary="Demander à être rappelée (aujourd'hui si le créneau n'est pas passé, sinon demain)", request=RappelEntree
    )
    def post(self, request):
        donnees = dict(request.data.items()) if hasattr(request.data, "items") else {}
        if "sujet" not in donnees and "motif" in donnees:  # nom du contrat (openapi : {creneau, motif})
            donnees["sujet"] = donnees["motif"]
        entree = RappelEntree(data=donnees)
        entree.is_valid(raise_exception=True)
        v = entree.validated_data
        commande = (v.get("commande") or "").strip() or None
        if commande is not None:
            c = pont.commande(commande, request.user)
            if c is None:
                raise serializers.ValidationError({"commande": ["Commande introuvable."]})
            commande = c.ref
        r = services.demander_rappel(request.user, v["sujet"], v["creneau"], commande, v.get("precision", ""))
        return Response(services.rappel_json(r))

    @extend_schema(tags=TAG, summary="Annuler mon rappel", request=None, responses={204: None})
    def delete(self, request):
        services.annuler_rappel(request.user)
        return Response(status=204)
