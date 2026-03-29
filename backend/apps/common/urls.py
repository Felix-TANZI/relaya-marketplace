from django.urls import path
from .views import CatalogAssistantView

urlpatterns = [
    path("catalog-assistant/", CatalogAssistantView.as_view(), name="ai-catalog-assistant"),
]
