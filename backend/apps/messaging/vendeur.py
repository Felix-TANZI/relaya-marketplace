# backend/apps/messaging/vendeur.py
# Questions des clients, vues et répondues par le vendeur (feuille de route D6, option A ; D20 : espace vendeur).
#
#   GET  /api/vendors/conversations      les conversations « vendeur » de la boutique, la plus récente d'abord
#   GET  /api/vendors/conversations/<id> le fil d'une question
#   POST /api/vendors/conversations/<id> répondre {texte}
#
# Anonymat (GEN-01) : le vendeur ne voit jamais le nom ni le numéro du client, seulement le produit et le fil ; sa
# réponse est nettoyée comme celle du client (CMS-04 : numéros, e-mails et liens masqués avant l'enregistrement).
# Distinct des questions publiques des fiches (catalog.ProductQuestion, /api/vendors/questions) : ici, le fil privé.

from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.client_core.masquage import nettoyer_message
from apps.client_core.temps import ms

from .models import Conversation, Message
from .services import message_json

TAG = ["Espace vendeur · Questions des clients"]
QUI_VENDEUR = "Le vendeur"


def _boutique(request):
    from apps.vendors.models import VendorProfile

    return VendorProfile.objects.filter(user=request.user).first()


def _questions(boutique):
    return Conversation.objects.filter(type=Conversation.Type.VENDEUR, vendor_id=boutique.pk, messages__isnull=False).distinct()


def _resume(c: Conversation) -> dict:
    messages = list(c.messages.all())
    dernier = messages[-1] if messages else None
    reponse = max((m.cree_le for m in messages if m.de == Message.De.EUX), default=None)
    attente = sum(1 for m in messages if m.de == Message.De.MOI and (reponse is None or m.cree_le > reponse))
    return {
        "id": c.pk,
        "produit": (c.entete or {}).get("titre") or c.titre,
        "product_id": c.product_id,
        "dernier": message_json(dernier) if dernier else None,
        "sansReponse": attente,
        "maj": ms(c.maj_le),
    }


class QuestionsVue(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=TAG, summary="Questions des clients sur les produits de la boutique")
    def get(self, request):
        boutique = _boutique(request)
        if boutique is None:
            return Response({"detail": "Profil vendeur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response([_resume(c) for c in _questions(boutique).order_by("-maj_le")])


class QuestionVue(APIView):
    permission_classes = [IsAuthenticated]

    def _conversation(self, request, id):
        boutique = _boutique(request)
        if boutique is None:
            return None
        return _questions(boutique).filter(pk=id).first()

    @extend_schema(tags=TAG, summary="Le fil d'une question (sans l'identité du client)")
    def get(self, request, id):
        c = self._conversation(request, id)
        if c is None:
            return Response({"detail": "Question introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response({**_resume(c), "messages": [message_json(m) for m in c.messages.all()]})

    @extend_schema(tags=TAG, summary="Répondre au client")
    def post(self, request, id):
        c = self._conversation(request, id)
        if c is None:
            return Response({"detail": "Question introuvable."}, status=status.HTTP_404_NOT_FOUND)
        texte = str(request.data.get("texte") or "").strip()
        if not texte:
            return Response({"texte": "Écris une réponse."}, status=status.HTTP_400_BAD_REQUEST)
        propre, masques = nettoyer_message(texte)
        maintenant = timezone.now()
        with transaction.atomic():
            Message.objects.create(conversation=c, de=Message.De.EUX, qui=QUI_VENDEUR, texte=propre, masques=masques,
                                   cree_le=maintenant)
            Conversation.objects.filter(pk=c.pk).update(maj_le=maintenant)
        _prevenir_le_client(c)
        return Response({"ok": True, "masques": masques}, status=status.HTTP_201_CREATED)


def _prevenir_le_client(c: Conversation) -> None:
    try:
        from apps.notifications_client.services import notifier

        notifier(c.client, "Le vendeur t'a répondu", f"Réponse sur {(c.entete or {}).get('titre') or c.titre}.",
                 lien=f"/messages/{c.cle}", type="suivi")
    except Exception:  # la notification ne bloque jamais la réponse
        pass
