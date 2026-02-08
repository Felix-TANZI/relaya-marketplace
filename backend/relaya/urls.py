# backend/relaya/urls.py
# Main URL configuration for the Relaya backend project.

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),

    # API
    path("api/auth/", include("apps.accounts.urls")),
    path("api/catalog/", include("apps.catalog.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/shipping/", include("apps.shipping.urls")),
    path('api/vendors/', include('apps.vendors.urls')),
    path('api/contact/', include('apps.contact.urls')),

    # OpenAPI / Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

# Servir les fichiers média en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)