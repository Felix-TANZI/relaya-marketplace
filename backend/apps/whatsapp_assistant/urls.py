# backend/apps/whatsapp_assistant/urls.py

from django.urls import path

from . import webhooks

app_name = "whatsapp_assistant"

urlpatterns = [
    path("webhook/", webhooks.webhook, name="webhook"),
]
