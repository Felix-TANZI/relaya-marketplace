from django.urls import path
from .views import (
    AdminApiUsageEventListView,
    AdminApiUsageSummaryView,
    AdminExternalServiceDetailView,
    AdminExternalServiceListView,
    CatalogAssistantView,
    LocationAssistantView,
)

urlpatterns = [
    path("catalog-assistant/", CatalogAssistantView.as_view(), name="ai-catalog-assistant"),
    path("location-assistant/", LocationAssistantView.as_view(), name="ai-location-assistant"),
    path("admin/services/", AdminExternalServiceListView.as_view(), name="admin-external-services"),
    path("admin/services/<slug:key>/", AdminExternalServiceDetailView.as_view(), name="admin-external-service-detail"),
    path("admin/services/usage/events/", AdminApiUsageEventListView.as_view(), name="admin-api-usage-events"),
    path("admin/services/usage/summary/", AdminApiUsageSummaryView.as_view(), name="admin-api-usage-summary"),
]
