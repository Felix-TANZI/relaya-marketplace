# backend/apps/catalog/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ActivePromotionCampaignListView, ProductViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    path('promotions/active/', ActivePromotionCampaignListView.as_view(), name='active-promotions'),
    path('', include(router.urls)),
]
