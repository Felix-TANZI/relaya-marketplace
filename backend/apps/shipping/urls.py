from django.urls import path
from .views import (
    CourierDisputeListView,
    CourierDashboardView,
    CourierNetworkView,
    CourierSettingsView,
    CourierSOSAlertView,
    CourierShipmentMessageListCreateView,
    CourierShipmentScanView,
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
    path("dashboard/", CourierDashboardView.as_view(), name="shipping-dashboard"),
    path("network/", CourierNetworkView.as_view(), name="shipping-network"),
    path("settings/", CourierSettingsView.as_view(), name="shipping-settings"),
    path("sos/", CourierSOSAlertView.as_view(), name="shipping-sos"),
    path("disputes/", CourierDisputeListView.as_view(), name="shipping-disputes"),
    path("scan/", CourierShipmentScanView.as_view(), name="shipping-scan"),
    path("my-shipments/", CourierMyShipmentsView.as_view(), name="shipping-my-shipments"),
    path("my-shipments/<int:id>/", CourierShipmentDetailView.as_view(), name="shipping-my-shipments-detail"),
    path("my-shipments/<int:id>/messages/", CourierShipmentMessageListCreateView.as_view(), name="shipping-my-shipments-messages"),
    path("my-shipments/<int:id>/action/", CourierShipmentActionView.as_view(), name="shipping-my-shipments-action"),
]
