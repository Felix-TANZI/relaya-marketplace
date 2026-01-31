# backend/apps/accounts/urls.py
# URL patterns for user management and authentication.

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import health, RegisterView, me

urlpatterns = [
    path("health/", health, name="auth-health"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", me, name="auth-me"),
]