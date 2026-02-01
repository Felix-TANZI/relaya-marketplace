# backend/apps/vendors/urls.py
# URL patterns pour l'espace vendeur

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    apply_vendor, 
    vendor_profile, 
    vendor_stats,
    VendorProductViewSet,
    upload_product_image,  
    delete_product_image,
    set_primary_image,
)

router = DefaultRouter()
router.register(r'products', VendorProductViewSet, basename='vendor-products')

urlpatterns = [
    path('apply/', apply_vendor, name='vendor-apply'),
    path('profile/', vendor_profile, name='vendor-profile'),
    path('stats/', vendor_stats, name='vendor-stats'),
    path('products/<int:product_id>/images/', upload_product_image, name='upload-product-image'),
    path('products/<int:product_id>/images/<int:image_id>/', delete_product_image, name='delete-product-image'),
    path('products/<int:product_id>/images/<int:image_id>/set-primary/', set_primary_image, name='set-primary-image'),
    path('', include(router.urls)),
]