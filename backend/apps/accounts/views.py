# backend/apps/accounts/views.py
# Vues pour la gestion des utilisateurs et de l'authentification.
# Inclut l'enregistrement, la récupération du profil utilisateur et un point de terminaison de santé.

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.utils import extend_schema
from django.contrib.auth.models import User

from .serializers import UserSerializer, RegisterSerializer


@extend_schema(tags=["Auth"], summary="Health check")
@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "service": "auth"})


@extend_schema(tags=["Auth"], summary="Register new user", request=RegisterSerializer, responses={201: UserSerializer})
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )


@extend_schema(tags=["Auth"], summary="Get current user profile")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)