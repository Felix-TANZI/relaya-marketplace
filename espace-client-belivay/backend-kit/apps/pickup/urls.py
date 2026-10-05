# backend/apps/pickup/urls.py
from django.urls import path

from . import views

urlpatterns = [
    path("orders/<str:id>/manage", views.Gerer.as_view(), name="client-order-manage"),
    path("suborders/<str:id>/cancel", views.AnnulerColis.as_view(), name="client-suborder-cancel"),
    path("orders/<str:id>/relais", views.ChangerRelais.as_view(), name="client-order-relais"),
    path("orders/<str:id>/address", views.ChangerAdresse.as_view(), name="client-order-address"),
    path("parcels/<str:id>/transfer", views.Transferer.as_view(), name="client-parcel-transfer"),
    path("orders/<str:id>/delegation", views.Deleguer.as_view(), name="client-order-delegation"),
    path("orders/<str:id>/rebuy", views.Racheter.as_view(), name="client-order-rebuy"),
]
