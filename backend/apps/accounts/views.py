from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema


@extend_schema(
    tags=["Auth"],
    summary="Health check - Auth",
    description="Endpoint de test pour vérifier le groupage Swagger (Auth).",
)
@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "service": "auth"})
