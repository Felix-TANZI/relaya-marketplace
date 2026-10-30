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


# Revue du 29/10 (A2) : « is_staff » dans un views.py n'est permis que pour ces usages, qui ne sont PAS des contrôles
# d'accès. Chaque entrée : (fichier, motif de la ligne, justification). Tout autre is_staff fait échouer le test.
IS_STAFF_AUTORISES = [
    ("accounts/views.py", r"user\.is_staff = (True|staff)$",
     "attribution du statut à la création d'un compte (démonstration, création par l'administration)"),
    ("accounts/views.py", r'user\.save\(update_fields=\["is_staff", "is_superuser"\]\)',
     "enregistrement de ce statut, même création de compte"),
    ("vendors/views.py", r"filter\(.*is_staff=(True|False)",
     "filtre de requête pour compter ou cibler des comptes (statistiques, envois), aucun droit"),
    ("vendors/views.py", r"^is_active=True, is_staff=False",
     "suite du même filtre de requête, sur la ligne suivante"),
    ("vendors/views.py", r'role_display = "Admin" if user\.is_staff',
     "libellé affiché dans l'export CSV des comptes, aucun droit"),
]


def test_a2_plus_aucun_is_staff_comme_controle_d_acces():
    import re

    racine = Path(settings.BASE_DIR) / "apps"
    fautifs = []
    for f in racine.rglob("views*.py"):
        if "tests" in f.parts:
            continue
        rel = f.relative_to(racine).as_posix()
        for n, ligne in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if "is_staff" not in ligne:
                continue
            texte = ligne.strip()
            if not any(rel == fichier and re.search(motif, texte) for fichier, motif, _ in IS_STAFF_AUTORISES):
                fautifs.append(f"{rel}:{n}: {texte}")
    assert fautifs == [], " | ".join(fautifs)


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
