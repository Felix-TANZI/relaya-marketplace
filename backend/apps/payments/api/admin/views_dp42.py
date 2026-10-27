# backend/apps/payments/api/admin/views_dp42.py
# DP-42 : la liste du vendredi (total et détail) validée en bloc, et les valideurs de secours.

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.settlements import dp42
from apps.payments.settlements.models import ValideurSecours

from .permissions import CanApproveMoney, IsFinanceStaff

TAG = ["Payments · Admin · DP-42"]


def _refus(exc):
    return Response({"code": "dp42", "detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


def _secours(s: ValideurSecours) -> dict:
    return {"id": s.pk, "user": s.user.get_username(), "role": s.role, "debut": s.debut, "fin": s.fin,
            "motif": s.motif, "accorde_par": s.accorde_par.get_username(), "accorde_le": s.accorde_le,
            "revoque_le": s.revoque_le, "revoque_par": s.revoque_par.get_username() if s.revoque_par else None,
            "actif": s.actif()}


@extend_schema(tags=TAG, summary="Liste du vendredi : total, détail et étape de validation")
class ListeDuVendrediView(APIView):
    permission_classes = [IsFinanceStaff]

    def get(self, request):
        etat = dp42.liste_du_vendredi(request.query_params.get("liste", ""))
        etat["mes_roles"] = sorted(dp42.roles_de(request.user))
        return Response(etat)


@extend_schema(tags=TAG, summary="Valider en bloc la liste du vendredi (comptable puis porteur)")
class ValiderListeView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request, liste):
        try:
            etat = dp42.valider_liste(liste, par=request.user, comment=str(request.data.get("comment") or ""),
                                      attendu_total_xaf=request.data.get("total_xaf"))
        except dp42.Dp42Error as exc:
            return _refus(exc)
        return Response(etat)


@extend_schema(tags=TAG, summary="Valideurs de secours (accès limité dans le temps, tracé)")
class SecoursView(APIView):
    permission_classes = [IsFinanceStaff]

    def get(self, request):
        return Response({"secours": [_secours(s) for s in ValideurSecours.objects.select_related(
            "user", "accorde_par", "revoque_par")[:100]]})

    def post(self, request):
        user = get_object_or_404(User, username=str(request.data.get("username") or ""))
        fin = parse_datetime(str(request.data.get("fin") or ""))
        if fin is None:
            return _refus("Date de fin de l'accès de secours manquante ou invalide.")
        try:
            s = dp42.accorder_secours(user=user, role=str(request.data.get("role") or ""), fin=fin,
                                      motif=str(request.data.get("motif") or ""), par=request.user)
        except dp42.Dp42Error as exc:
            return _refus(exc)
        return Response(_secours(s), status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG, summary="Retirer un accès de secours")
class RevoquerSecoursView(APIView):
    permission_classes = [IsFinanceStaff]

    def post(self, request, pk):
        s = get_object_or_404(ValideurSecours, pk=pk)
        if not (request.user.groups.filter(name=dp42.GROUPES[dp42.DIRECTION]).exists() or request.user.is_superuser
                or request.user.pk == s.user_id):
            return _refus("DP-42 : seul le porteur (ou la personne elle-même) retire un accès de secours.")
        return Response(_secours(dp42.revoquer_secours(s, par=request.user)))
