# backend/apps/vendors/urls.py
# URL patterns pour l'espace vendeur

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    apply_vendor, 
    vendor_profile, 
    vendor_stats,
    VendorProductViewSet
)

router = DefaultRouter()
router.register(r'products', VendorProductViewSet, basename='vendor-products')

urlpatterns = [
    path('apply/', apply_vendor, name='vendor-apply'),
    path('profile/', vendor_profile, name='vendor-profile'),
    path('stats/', vendor_stats, name='vendor-stats'),
    path('', include(router.urls)),
]