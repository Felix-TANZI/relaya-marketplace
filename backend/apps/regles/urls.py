from django.urls import path

from . import views

urlpatterns = [
    path("tables/<str:nom>/", views.table, name="regles-table"),
]
