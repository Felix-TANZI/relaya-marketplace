# URL du projet d'essai : comme relaya/urls.py, plus la ligne du kit.
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    # ── AJOUT DU KIT (à placer dans relaya/urls.py, avant ou après les autres routes /api/) ──
    path("api/", include("apps.client_core.urls_api")),
]
