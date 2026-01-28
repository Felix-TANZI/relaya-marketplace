from django.urls import path
from .views import OrderCreateView, OrderDetailView

urlpatterns = [
    path("", OrderCreateView.as_view(), name="order-create"),
    path("<int:id>/", OrderDetailView.as_view(), name="order-detail"),
]
