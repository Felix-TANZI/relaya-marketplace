from django.urls import path
from .views import (
    CourierMyShipmentsView,
    CourierShipmentActionView,
    CourierShipmentDetailView,
    ShipmentCreateView,
    ShipmentEventCreateView,
    ShipmentTrackView,
)

urlpatterns = [
    path("create/", ShipmentCreateView.as_view(), name="shipping-create"),
    path("events/", ShipmentEventCreateView.as_view(), name="shipping-events"),
    path("track/", ShipmentTrackView.as_view(), name="shipping-track"),
    path("my-shipments/", CourierMyShipmentsView.as_view(), name="shipping-my-shipments"),
    path("my-shipments/<int:id>/", CourierShipmentDetailView.as_view(), name="shipping-my-shipments-detail"),
    path("my-shipments/<int:id>/action/", CourierShipmentActionView.as_view(), name="shipping-my-shipments-action"),
]
