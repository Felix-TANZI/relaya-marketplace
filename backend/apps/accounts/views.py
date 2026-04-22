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
import logging
import random
import string
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings as django_settings
from rest_framework_simplejwt.views import TokenObtainPairView as _BaseLoginView
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


logger = logging.getLogger(__name__)


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


@extend_schema(
    tags=["Auth"],
    summary="Change user password",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError

    user          = request.user
    old_password  = request.data.get("old_password", "")
    new_password  = request.data.get("new_password", "")
    new_password2 = request.data.get("new_password2", "")

    if not user.check_password(old_password):
        return Response({"old_password": ["Mot de passe actuel incorrect."]}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != new_password2:
        return Response({"new_password2": ["Les nouveaux mots de passe ne correspondent pas."]}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(new_password, user)
    except DjangoValidationError as e:
        return Response({"new_password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({"detail": "Mot de passe modifié avec succès."}, status=status.HTTP_200_OK)


# ── Helpers OTP ───────────────────────────────────────────────────────────────
 
def _generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))
 
 
def _create_and_send_otp(user, purpose: str) -> None:
    """Invalide les anciens codes, génère un nouveau et envoie l'email."""
    from .models import OTPCode
 
    OTPCode.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
    code = _generate_otp()
    OTPCode.objects.create(
        user=user, code=code, purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=10),
    )
 
    labels = {
        '2FA_LOGIN':   'Connexion sécurisée',
        '2FA_ENABLE':  'Activation de la double authentification',
        '2FA_DISABLE': 'Désactivation de la double authentification',
    }
    label = labels.get(purpose, 'Vérification')
    from_email = getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'BelivaY <noreply@belivay.com>')
 
    send_mail(
        subject=f'[BelivaY] Code de vérification — {label}',
        message=(
            f'Bonjour {user.first_name or user.username},\n\n'
            f'Votre code de vérification BelivaY :\n\n'
            f'        {code}\n\n'
            f'Ce code est valable 10 minutes.\n'
            f'Ne le partagez jamais avec personne.\n\n'
            f"Si vous n'êtes pas à l'origine de cette demande, "
            f'changez votre mot de passe immédiatement.\n\n'
            f'— L\'équipe BelivaY'
        ),
        from_email=from_email,
        recipient_list=[user.email],
        fail_silently=False,
    )
 
 
# ── Login enrichi (2FA) ───────────────────────────────────────────────────────
 
class TwoFactorTokenObtainPairView(_BaseLoginView):
    """
    Remplace TokenObtainPairView dans urls.py.
    Si la 2FA est activée → envoie OTP + retourne 2fa_required=True.
    Sinon → comportement normal simplejwt + crée la UserSession.
    """
 
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            raise
 
        user    = serializer.user
        profile = get_or_create_profile(user)
 
        # ── 2FA activée ────────────────────────────────────────────────────
        if profile.two_factor_enabled:
            try:
                _create_and_send_otp(user, '2FA_LOGIN')
            except Exception as exc:
                return Response(
                    {'detail': f'Erreur envoi code 2FA : {exc}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            return Response(
                {'2fa_required': True, 'user_id': user.id, 'email': user.email},
                status=status.HTTP_200_OK,
            )
 
        # ── 2FA désactivée — flux normal ───────────────────────────────────
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            _register_session_from_response(response, user, request)
        return response
 
 
def _register_session_from_response(response, user, request):
    """Crée la UserSession depuis la réponse de login."""
    try:
        from rest_framework_simplejwt.tokens import AccessToken as _AccessToken
        from .models import UserSession
        from .middleware import parse_user_agent, get_client_ip
        access = _AccessToken(response.data['access'])
        jti    = str(access['jti'])
        ua     = request.META.get('HTTP_USER_AGENT', '')
        device_name, browser, os_name = parse_user_agent(ua)
        UserSession.objects.update_or_create(
            jti=jti,
            defaults={
                'user': user, 'device_name': device_name,
                'browser': browser, 'os_name': os_name,
                'ip_address': get_client_ip(request) or None,
                'is_active': True,
            },
        )
    except Exception as exc:
        logger.debug('Session login registration skipped: %s', exc)
 
 
# ── Logout propre ─────────────────────────────────────────────────────────────
 
@extend_schema(tags=["Auth"], summary="Logout — blacklist refresh token")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Blackliste le refresh token et désactive la session courante."""
    from rest_framework_simplejwt.tokens import RefreshToken as _RT
    from rest_framework_simplejwt.exceptions import TokenError
    from .models import UserSession
 
    current_jti = str(getattr(request.auth, 'payload', {}).get('jti', ''))
    if current_jti:
        UserSession.objects.filter(jti=current_jti).update(is_active=False)
 
    refresh = request.data.get('refresh')
    if refresh:
        try:
            _RT(refresh).blacklist()
        except TokenError:
            pass
 
    return Response({'detail': 'Déconnexion réussie.'})
 
 
# ── Changement de mot de passe ────────────────────────────────────────────────
 
@extend_schema(tags=["Auth"], summary="Change password")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Modifie le mot de passe. Requiert l'ancien mot de passe."""
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError
 
    user          = request.user
    old_password  = request.data.get("old_password", "")
    new_password  = request.data.get("new_password", "")
    new_password2 = request.data.get("new_password2", "")
 
    if not user.check_password(old_password):
        return Response({"old_password": ["Mot de passe actuel incorrect."]}, status=status.HTTP_400_BAD_REQUEST)
 
    if new_password != new_password2:
        return Response({"new_password2": ["Les nouveaux mots de passe ne correspondent pas."]}, status=status.HTTP_400_BAD_REQUEST)
 
    try:
        validate_password(new_password, user)
    except DjangoValidationError as e:
        return Response({"new_password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
 
    user.set_password(new_password)
    user.save()
    return Response({"detail": "Mot de passe modifié avec succès."})
 
 
# ── Sessions ──────────────────────────────────────────────────────────────────
 
@extend_schema(tags=["Auth"], summary="List active sessions")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sessions(request):
    """Liste les sessions actives de l'utilisateur connecté."""
    from .models import UserSession
    sessions    = UserSession.objects.filter(user=request.user, is_active=True)
    current_jti = str(getattr(request.auth, 'payload', {}).get('jti', ''))
    data = [
        {
            'jti':           s.jti,
            'device_name':   s.device_name,
            'browser':       s.browser,
            'os_name':       s.os_name,
            'ip_address':    s.ip_address,
            'created_at':    s.created_at,
            'last_activity': s.last_activity,
            'is_current':    s.jti == current_jti,
        }
        for s in sessions
    ]
    return Response(data)
 
 
@extend_schema(tags=["Auth"], summary="Revoke one session")
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def revoke_session(request, jti):
    """Révoque une session (blacklist token + désactive)."""
    from .models import UserSession
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
 
    current_jti = str(getattr(request.auth, 'payload', {}).get('jti', ''))
    if jti == current_jti:
        return Response({'detail': 'Utilisez la déconnexion pour terminer la session courante.'}, status=400)
 
    try:
        session = UserSession.objects.get(jti=jti, user=request.user, is_active=True)
    except UserSession.DoesNotExist:
        return Response({'detail': 'Session introuvable.'}, status=404)
 
    try:
        outstanding = OutstandingToken.objects.filter(jti=jti).first()
        if outstanding:
            BlacklistedToken.objects.get_or_create(token=outstanding)
    except Exception as exc:
        logger.debug('Blacklist error: %s', exc)
 
    session.is_active = False
    session.save(update_fields=['is_active'])
    return Response({'detail': 'Session révoquée.'})
 
 
@extend_schema(tags=["Auth"], summary="Revoke all other sessions")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def revoke_all_sessions(request):
    """Révoque toutes les sessions sauf la courante."""
    from .models import UserSession
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
 
    current_jti = str(getattr(request.auth, 'payload', {}).get('jti', ''))
    sessions    = UserSession.objects.filter(user=request.user, is_active=True).exclude(jti=current_jti)
    count       = sessions.count()
 
    for s in sessions:
        try:
            outstanding = OutstandingToken.objects.filter(jti=s.jti).first()
            if outstanding:
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception as exc:
            logger.debug('Blacklist error %s: %s', s.jti, exc)
        s.is_active = False
        s.save(update_fields=['is_active'])
 
    return Response({'detail': f'{count} session(s) révoquée(s).'})
 
 
# ── Double authentification ───────────────────────────────────────────────────
 
@extend_schema(tags=["Auth"], summary="Get 2FA status")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_2fa_status(request):
    profile = get_or_create_profile(request.user)
    return Response({
        'two_factor_enabled': profile.two_factor_enabled,
        'two_factor_method':  profile.two_factor_method,
        'two_factor_phone':   profile.two_factor_phone,
        'email':              request.user.email,
    })
 
 
@extend_schema(tags=["Auth"], summary="Send 2FA OTP code")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_2fa_code(request):
    """Envoie un code OTP pour activer ou désactiver la 2FA."""
    purpose = request.data.get('purpose', '2FA_ENABLE')
    if purpose not in ('2FA_ENABLE', '2FA_DISABLE'):
        return Response({'detail': 'Purpose invalide.'}, status=400)
    try:
        _create_and_send_otp(request.user, purpose)
        return Response({'detail': f'Code envoyé à {request.user.email}.', 'email': request.user.email})
    except Exception as e:
        return Response({'detail': f'Erreur envoi email : {e}'}, status=500)
 
 
@extend_schema(tags=["Auth"], summary="Enable 2FA")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enable_2fa(request):
    """Vérifie le code OTP et active la 2FA."""
    from .models import OTPCode
    code   = request.data.get('code', '').strip()
    method = request.data.get('method', 'EMAIL')
    phone  = request.data.get('phone', '').strip()
 
    if not code:
        return Response({'detail': 'Code requis.'}, status=400)
 
    otp = OTPCode.objects.filter(user=request.user, purpose='2FA_ENABLE', is_used=False).order_by('-created_at').first()
    if not otp or not otp.is_valid:
        return Response({'detail': 'Code expiré ou invalide. Demandez un nouveau code.'}, status=400)
    if otp.code != code:
        return Response({'detail': 'Code incorrect.'}, status=400)
 
    otp.is_used = True
    otp.save(update_fields=['is_used'])
 
    profile = get_or_create_profile(request.user)
    profile.two_factor_enabled = True
    profile.two_factor_method  = method
    profile.two_factor_phone   = phone
    profile.save(update_fields=['two_factor_enabled', 'two_factor_method', 'two_factor_phone'])
    return Response({'detail': 'Double authentification activée avec succès.'})
 
 
@extend_schema(tags=["Auth"], summary="Disable 2FA")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    """Vérifie le mot de passe actuel et désactive la 2FA."""
    password = request.data.get('password', '')
    if not password:
        return Response({'detail': 'Mot de passe requis.'}, status=400)
    if not request.user.check_password(password):
        return Response({'detail': 'Mot de passe incorrect.'}, status=400)
 
    profile = get_or_create_profile(request.user)
    profile.two_factor_enabled = False
    profile.two_factor_method  = 'EMAIL'
    profile.two_factor_phone   = ''
    profile.save(update_fields=['two_factor_enabled', 'two_factor_method', 'two_factor_phone'])
    return Response({'detail': 'Double authentification désactivée.'})
 
 
@extend_schema(tags=["Auth"], summary="Verify 2FA login OTP")
@api_view(["POST"])
@permission_classes([AllowAny])
def verify_2fa_login(request):
    """Vérifie le code OTP de connexion et retourne les tokens JWT."""
    from .models import OTPCode, UserSession
    from .middleware import parse_user_agent, get_client_ip
    from rest_framework_simplejwt.tokens import RefreshToken as _RT
 
    user_id = request.data.get('user_id')
    code    = request.data.get('code', '').strip()
    if not user_id or not code:
        return Response({'detail': 'user_id et code requis.'}, status=400)
 
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'Utilisateur introuvable.'}, status=404)
 
    otp = OTPCode.objects.filter(user=user, purpose='2FA_LOGIN', is_used=False).order_by('-created_at').first()
    if not otp or not otp.is_valid:
        return Response({'detail': 'Code expiré. Reconnectez-vous.'}, status=400)
    if otp.code != code:
        return Response({'detail': 'Code incorrect.'}, status=400)
 
    otp.is_used = True
    otp.save(update_fields=['is_used'])
 
    refresh = _RT.for_user(user)
    access  = refresh.access_token
    jti     = str(access['jti'])
 
    ua = request.META.get('HTTP_USER_AGENT', '')
    device_name, browser, os_name = parse_user_agent(ua)
    UserSession.objects.update_or_create(
        jti=jti,
        defaults={
            'user': user, 'device_name': device_name,
            'browser': browser, 'os_name': os_name,
            'ip_address': get_client_ip(request) or None, 'is_active': True,
        },
    )
 
    return Response({'access': str(access), 'refresh': str(refresh)})