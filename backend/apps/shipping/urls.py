from django.urls import path
from .views import ShipmentCreateView, ShipmentEventCreateView, ShipmentTrackView

urlpatterns = [
    path("create/", ShipmentCreateView.as_view(), name="shipping-create"),
    path("events/", ShipmentEventCreateView.as_view(), name="shipping-events"),
    path("track/", ShipmentTrackView.as_view(), name="shipping-track"),
]
