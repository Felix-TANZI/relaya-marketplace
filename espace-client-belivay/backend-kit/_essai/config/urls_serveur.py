# URL du serveur d'essai (site contre le kit en local) : les routes du kit (comme chez relaya), l'imitation des routes
# existantes de relaya que le site appelle (relaya_essai), et les photos téléversées (MEDIA_URL).
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("relaya_essai.urls")),
    path("api/", include("apps.client_core.urls_api")),
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
]
