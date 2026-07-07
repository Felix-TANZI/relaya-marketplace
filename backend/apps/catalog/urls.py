# backend/apps/catalog/urls.py

from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import (
    ActivePromotionCampaignListView,
    AdminPromotionCampaignDecisionView,
    AdminPromotionCampaignListView,
    ProductViewSet,
    CategoryViewSet,
    MasterProductViewSet
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'master-products', MasterProductViewSet, basename='master-product')

urlpatterns = [
    path('promotions/active/', ActivePromotionCampaignListView.as_view(), name='active-promotions'),
    path('promotions/admin/', AdminPromotionCampaignListView.as_view(), name='admin-promotions'),
    path('promotions/admin/<int:pk>/decision/', AdminPromotionCampaignDecisionView.as_view(), name='admin-promotion-decision'),
    path('conditions/', views.list_active_conditions, name='conditions'),
    path('', include(router.urls)),
]
