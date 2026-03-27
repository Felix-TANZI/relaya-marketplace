# backend/apps/accounts/views.py
# Vues pour la gestion des utilisateurs et de l'authentification.
# Inclut l'enregistrement, la récupération du profil utilisateur et un point de terminaison de santé.

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import (
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    AvatarUploadSerializer,
    FavoriteSerializer,
    NotificationSerializer,
)
from drf_spectacular.utils import extend_schema
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from .serializers import UserSerializer, RegisterSerializer
from .models import UserProfile, UserFavorite, UserNotification


def get_or_create_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


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
    get_or_create_profile(request.user)
    serializer = UserSerializer(request.user, context={'request': request})
    return Response(serializer.data)

@extend_schema(
    tags=["Auth"], 
    summary="Get user profile",
    responses={200: UserProfileSerializer}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):
    """Récupérer le profil de l'utilisateur connecté"""
    get_or_create_profile(request.user)
    serializer = UserProfileSerializer(request.user, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    tags=["Auth"], 
    summary="Update user profile",
    request=UserProfileUpdateSerializer,
    responses={200: UserProfileSerializer}
)
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Mettre à jour le profil de l'utilisateur connecté"""
    get_or_create_profile(request.user)
    serializer = UserProfileUpdateSerializer(
        request.user, 
        data=request.data, 
        partial=True,
        context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    
    # Retourner le profil complet mis à jour
    profile_serializer = UserProfileSerializer(request.user, context={'request': request})
    return Response(profile_serializer.data)


@extend_schema(
    tags=["Auth"],
    summary="Upload profile avatar",
    request=AvatarUploadSerializer,
    responses={200: UserProfileSerializer},
)
class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        profile = get_or_create_profile(request.user)
        serializer = AvatarUploadSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(request.user, context={'request': request}).data)

    def delete(self, request):
        profile = get_or_create_profile(request.user)
        if profile.avatar:
            profile.avatar.delete(save=False)
        profile.avatar = None
        profile.save(update_fields=['avatar', 'updated_at'])
        return Response(UserProfileSerializer(request.user, context={'request': request}).data)


@extend_schema(tags=["Client"], summary="List favorite products")
class FavoritesListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        return UserFavorite.objects.filter(user=self.request.user).select_related(
            'product',
            'product__category',
            'product__inventory',
        ).prefetch_related('product__media', 'product__images')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


@extend_schema(tags=["Client"], summary="Remove favorite product")
class FavoriteDestroyView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        return UserFavorite.objects.filter(user=self.request.user)


@extend_schema(tags=["Client"], summary="List notifications")
class NotificationsListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return UserNotification.objects.filter(user=self.request.user)


@extend_schema(tags=["Client"], summary="Mark one notification as read")
class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        notification = get_object_or_404(
            UserNotification,
            id=id,
            user=request.user,
        )
        notification.is_read = True
        notification.save(update_fields=['is_read', 'updated_at'])
        return Response(NotificationSerializer(notification).data)


@extend_schema(tags=["Client"], summary="Mark all notifications as read")
class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        UserNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "Notifications marked as read"})
