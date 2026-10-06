# backend/apps/notifications_client/views.py
# Réglages des notifications et abonnements push (CL-10 ; CAP-17).
#
#   GET  /api/me/notification-settings   notifications → ReglagesNotifications
#   PUT  /api/me/notification-settings   reglerNotification {cle, actif} → ChoixNotifications (422 category_locked
#        pour Commande, Retrait, Incident, Paiement) | reglerCanal {canal} (WhatsApp : FF-WHATSAPP-CANAL ouvert et
#        consentement donné, sinon 422) | reglerCalme {calme} | alerteFlash {flash} (FF-FLASH) ; rend toujours les choix.
#   POST /api/me/consents                {canal} → 204 : consentement horodaté (WhatsApp)
#   POST /api/devices                    {type, abonnement} → {ok} ; DELETE /api/devices/{id} → {ok}
#        id : identifiant de l'appareil ou sha256 de l'adresse Web Push.

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response

from apps.client_core.erreurs import ErreurClient, refus
from apps.client_core.interrupteurs import ouvert
from apps.client_core.vues import VueClient

from . import regles, services
from .serializers import AppareilSerializer, ConsentementSerializer, ReglageSerializer

TAG = ["Espace client · Notifications"]


class Reglages(VueClient):
    @extend_schema(tags=TAG, summary="Réglages des notifications : numéro, canal, choix, heures calmes")
    def get(self, request):
        return Response(services.donnees_reglages(request.user))

    @extend_schema(tags=TAG, summary="Régler une catégorie, le canal de repli, les heures calmes ou l'alerte flash")
    def put(self, request):
        ser = ReglageSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        r = services.reglages(request.user)
        if "cle" in d:
            cle = d["cle"].strip().lower()
            if cle in regles.VERROUILLEES:
                raise refus("category_locked", "Les alertes de commande, de retrait, d'incident et de paiement restent toujours actives.")
            if cle not in regles.AU_CHOIX:
                raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Catégorie inconnue.")
            setattr(r, cle, d["actif"])
        elif "canal" in d:
            if d["canal"] == "whatsapp":
                if not ouvert("FF-WHATSAPP-CANAL"):
                    raise refus("canal_indisponible", "WhatsApp n'est pas encore proposé.")
                if not services.consentement_whatsapp(request.user):
                    raise refus("consentement_requis", "Donne d'abord ton accord pour recevoir les alertes par WhatsApp.")
            r.canal = d["canal"]
        elif "calme" in d:
            r.calme_actif, r.calme_debut, r.calme_fin = d["calme"]["actif"], d["calme"]["debut"], d["calme"]["fin"]
        else:
            if d["flash"] and not ouvert("FF-FLASH"):
                raise refus("module_ferme", "Les ventes flash ne sont pas ouvertes.")
            r.flash = d["flash"]
        r.save()
        return Response(services.choix(r))


class Consentements(VueClient):
    @extend_schema(tags=TAG, summary="Donner son accord pour un canal (horodaté)")
    def post(self, request):
        ser = ConsentementSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        services.consentir(request.user, ser.validated_data["canal"], request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class Appareils(VueClient):
    @extend_schema(tags=TAG, summary="Enregistrer l'abonnement push de cet appareil")
    def post(self, request):
        ser = AppareilSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        services.enregistrer_appareil(request.user, ser.validated_data["type"], ser.validated_data["abonnement"])
        return Response({"ok": True})


class AppareilDetail(VueClient):
    @extend_schema(tags=TAG, summary="Retirer l'abonnement push d'un appareil")
    def delete(self, request, id):
        return Response({"ok": services.revoquer_appareil(request.user, id)})
