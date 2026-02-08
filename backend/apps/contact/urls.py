# backend/apps/contact/urls.py
# URLs pour l'API de contact

from django.urls import path
from . import views

app_name = 'contact'

urlpatterns = [
    path('', views.contact_message_create, name='contact-create'),
]