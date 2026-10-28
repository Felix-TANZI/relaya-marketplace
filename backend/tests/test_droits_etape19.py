# Droits par partie sur TOUS les écrans de gestion (étape 19, avant main 2) : plus aucun IsAdminUser ; chaque écran
# s'ouvre à son équipe (apps.common.droits), le superutilisateur garde l'accès, le compte expose ses parties au menu.

from pathlib import Path

import pytest
from django.conf import settings
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

ECRANS = {  # un écran représentatif par partie
    "/api/vendors/admin/vendors/": "vendeurs",
    "/api/vendors/admin/orders/": "commandes",
    "/api/vendors/admin/users/": "clients",
    "/api/vendors/admin/disputes/": "litiges",
    "/api/vendors/admin/finances/stats/": "finance",
    "/api/vendors/admin/kyc/": "conformite",
    "/api/vendors/admin/logs/": "pilotage",
    "/api/catalog/admin/categories/": "catalogue",
    "/api/shipping/admin/supervision/": "logistique",
    "/api/ai/admin/services/": "pilotage",
}


def _client(*parties, **extra):
    from apps.common.droits import PARTIES

    u = User.objects.create_user(f"adm{User.objects.count()}", password="p", is_staff=True, **extra)
    for p in parties:
        u.groups.add(Group.objects.get_or_create(name=PARTIES[p])[0])
    c = APIClient()
    c.force_authenticate(u)
    return c


def test_plus_aucun_ecran_en_isadminuser():
    racine = Path(settings.BASE_DIR) / "apps"
    fautifs = [str(f.relative_to(racine)) for f in racine.rglob("*.py")
               if "tests" not in f.parts and f.name != "droits.py" and "IsAdminUser" in f.read_text(encoding="utf-8")]
    assert fautifs == []


@pytest.mark.parametrize("url,partie", list(ECRANS.items()))
def test_chaque_ecran_s_ouvre_a_sa_partie_seulement(url, partie):
    assert _client().get(url).status_code == 403                         # être du personnel ne suffit plus
    assert _client(partie).get(url).status_code == 200, url
    autre = "support" if partie != "support" else "fraude"
    assert _client(autre).get(url).status_code == 403


def test_le_superutilisateur_garde_l_acces_et_le_compte_expose_ses_parties():
    assert _client(is_superuser=True).get("/api/vendors/admin/orders/").status_code == 200
    c = _client("catalogue", "litiges")
    assert sorted(c.get("/api/auth/me/").json()["parties"]) == ["catalogue", "litiges"]
