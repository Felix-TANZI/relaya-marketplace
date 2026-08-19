# backend/apps/payments/api/webhooks/urls.py
# Routes publiques des webhooks.
#
# A inclure dans relaya/urls.py :
#     path("api/payments/webhooks/", include("apps.payments.api.webhooks.urls")),

from django.urls import path

from .views import CampayWebhookView

app_name = "payments_webhooks"

urlpatterns = [
    path("campay/", CampayWebhookView.as_view(), name="campay"),
]