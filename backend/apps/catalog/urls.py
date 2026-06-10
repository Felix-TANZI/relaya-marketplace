# backend/apps/catalog/urls.py

from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CategoryViewSet, MasterProductViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'master-products', MasterProductViewSet, basename='master-product')

urlpatterns = [
    path('conditions/', views.list_active_conditions, name='conditions'),
    path('', include(router.urls)),
]