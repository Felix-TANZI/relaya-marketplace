# backend/apps/orders/remboursement_auto_admin.py
# Suivi des remboursements automatiques dans l'administration — feuille de route D32 ; spec v2.1, R71.

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from apps.common.droits import Partie
from rest_framework.response import Response
from rest_framework.views import APIView

from . import remboursement_auto as rmb
from .models import RemboursementAuto, RetraitDroitRemboursementAuto

TAGS = ["Orders · Remboursement automatique"]


def _ligne(r: RemboursementAuto) -> dict:
    return {"id": r.pk, "commande": r.order_id, "litige": r.dispute_id, "client": r.client.username,
            "vendeur": r.vendor.username if r.vendor else None, "article": r.order_item.title_snapshot,
            "statut": r.statut, "raison": rmb.RAISONS.get(r.raison, r.raison), "total_xaf": r.total_xaf,
            "versement": r.payout_reference, "le": r.created_at}


def _retrait(d: RetraitDroitRemboursementAuto) -> dict:
    return {"id": d.pk, "client": d.client.username, "motif": d.motif, "propose_par": d.propose_par.username,
            "valide_par": d.valide_par.username if d.valide_par else None, "valide_le": d.valide_le}


@extend_schema(tags=TAGS, summary="Suivi : cas journalisés, plafond du mois, vendeurs concernés, droits retirés")
class SuiviRemboursementAutoView(APIView):
    permission_classes = [Partie("litiges")]  # sécurité main 2 : droits par partie

    def get(self, request):
        cas = RemboursementAuto.objects.select_related("client", "vendor", "order_item")[:200]
        return Response({**rmb.suivi(), "cas": [_ligne(r) for r in cas],
                         "retraits": [_retrait(d) for d in RetraitDroitRemboursementAuto.objects.select_related(
                             "client", "propose_par", "valide_par")]})


@extend_schema(tags=TAGS, summary="Proposer de retirer le droit à un client pris en abus")
class ProposerRetraitView(APIView):
    permission_classes = [Partie("litiges")]  # sécurité main 2 : droits par partie

    def post(self, request):
        client = get_object_or_404(User, username=request.data.get("client"))
        motif = (request.data.get("motif") or "").strip()
        if not motif:
            return Response({"motif": "Le motif est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        d, cree = RetraitDroitRemboursementAuto.objects.get_or_create(
            client=client, defaults={"motif": motif[:255], "propose_par": request.user})
        return Response(_retrait(d), status=status.HTTP_201_CREATED if cree else status.HTTP_200_OK)


@extend_schema(tags=TAGS, summary="Valider le retrait (un autre membre de l'équipe que celui qui l'a proposé)")
class ValiderRetraitView(APIView):
    permission_classes = [Partie("litiges")]  # sécurité main 2 : droits par partie

    def post(self, request, pk):
        d = get_object_or_404(RetraitDroitRemboursementAuto, pk=pk)
        if d.propose_par_id == request.user.pk:
            return Response({"detail": "La validation revient à une autre personne que celle qui propose."},
                            status=status.HTTP_403_FORBIDDEN)
        if d.valide_le is None:
            d.valide_par, d.valide_le = request.user, timezone.now()
            d.save(update_fields=["valide_par", "valide_le"])
        return Response(_retrait(d))
