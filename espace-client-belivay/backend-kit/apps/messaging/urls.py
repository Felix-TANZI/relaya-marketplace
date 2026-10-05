# backend/apps/messaging/urls.py
# Routes de la messagerie, de l'aide et du rappel, sous /api/ (apps.client_core.urls_api), sans barre finale.
# « me/threads/read » avant « me/threads/<id> » : sinon « read » serait pris pour un identifiant.

from django.urls import path

from . import views

urlpatterns = [
    path("me/threads", views.ConversationsVue.as_view()),
    path("me/threads/read", views.ToutLuVue.as_view()),
    path("me/threads/<str:id>", views.ConversationVue.as_view()),
    path("me/threads/<str:id>/messages", views.MessagesVue.as_view()),
    path("messages/threads", views.QuestionVue.as_view()),
    path("help", views.AideVue.as_view()),
    path("help/faq", views.FaqVue.as_view()),
    path("support/callback", views.RappelVue.as_view()),
]
