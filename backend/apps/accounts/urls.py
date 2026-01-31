# backend/apps/accounts/urls.py
# URL patterns for user management and authentication.

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import health, RegisterView, me, profile, update_profile

urlpatterns = [
    path("health/", health, name="auth-health"),
    path("register/", RegisterView.as_view(), name="auth-register"), # User registration
    path("login/", TokenObtainPairView.as_view(), name="auth-login"), # JWT token obtain
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"), # JWT token refresh
    path("me/", me, name="auth-me"), # Current user info
    path("profile/", profile, name="auth-profile"), # User profile retrieval
    path("profile/update/", update_profile, name="auth-profile-update"), # User profile update
]