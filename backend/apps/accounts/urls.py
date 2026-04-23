# backend/apps/accounts/urls.py

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    health,
    RegisterView,
    me,
    profile,
    update_profile,
    AvatarUploadView,
    FavoritesListCreateView,
    FavoriteDestroyView,
    NotificationsListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    # Nouveaux
    TwoFactorTokenObtainPairView,
    logout_view,
    change_password,
    list_sessions,
    revoke_session,
    revoke_all_sessions,
    get_2fa_status,
    send_2fa_code,
    enable_2fa,
    disable_2fa,
    verify_2fa_login,
)

urlpatterns = [
    # ── Santé ─────────────────────────────────────────────────────────────────
    path("health/", health, name="auth-health"),

    # ── Authentification ──────────────────────────────────────────────────────
    path("register/",       RegisterView.as_view(),                name="auth-register"),
    path("login/",          TwoFactorTokenObtainPairView.as_view(), name="auth-login"),   # 2FA aware
    path("logout/",         logout_view,                           name="auth-logout"),
    path("refresh/",        TokenRefreshView.as_view(),            name="auth-refresh"),

    # ── Profil ────────────────────────────────────────────────────────────────
    path("me/",                  me,                                name="auth-me"),
    path("profile/",             profile,                           name="auth-profile"),
    path("profile/update/",      update_profile,                    name="auth-profile-update"),
    path("change-password/",     change_password,                   name="auth-change-password"),
    path("profile/avatar/",      AvatarUploadView.as_view(),        name="auth-profile-avatar"),

    # ── Sessions / Appareils ──────────────────────────────────────────────────
    path("sessions/",                   list_sessions,      name="auth-sessions-list"),
    path("sessions/<str:jti>/revoke/",  revoke_session,     name="auth-session-revoke"),
    path("sessions/revoke-all/",        revoke_all_sessions,name="auth-sessions-revoke-all"),

    # ── Double authentification (2FA) ─────────────────────────────────────────
    path("2fa/status/",       get_2fa_status,   name="auth-2fa-status"),
    path("2fa/send-code/",    send_2fa_code,    name="auth-2fa-send-code"),
    path("2fa/enable/",       enable_2fa,       name="auth-2fa-enable"),
    path("2fa/disable/",      disable_2fa,      name="auth-2fa-disable"),
    path("2fa/verify-login/", verify_2fa_login, name="auth-2fa-verify-login"),

    # ── Client (favoris, notifications) ──────────────────────────────────────
    path("favorites/",                FavoritesListCreateView.as_view(), name="client-favorites"),
    path("favorites/<int:pk>/",       FavoriteDestroyView.as_view(),     name="client-favorite-delete"),
    path("notifications/",            NotificationsListView.as_view(),   name="client-notifications"),
    path("notifications/<int:id>/read/",   NotificationMarkReadView.as_view(),    name="client-notification-read"),
    path("notifications/read-all/",        NotificationMarkAllReadView.as_view(), name="client-notifications-read-all"),
]