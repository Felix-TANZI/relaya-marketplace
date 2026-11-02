# Revue du 1er novembre 2026 — sécurité, P0 : création des comptes administrateurs (admin_create_user).
#   - seule la Direction crée ou promeut un compte « admin » ; le pilotage garde les autres rôles ;
#   - is_superuser n'est jamais accordé par l'API (le superutilisateur se crée en ligne de commande sur le serveur) ;
#   - chaque création est inscrite au journal d'audit avec son auteur.
# Chaque test échoue avant la correction et passe après.

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient

from apps.common.models import AuditLog

pytestmark = pytest.mark.django_db

URL = "/api/auth/admin/users/create/"


def _membre(nom, *groupes):
    user = User.objects.create_user(nom, password="p", is_staff=True)
    for groupe in groupes:
        user.groups.add(Group.objects.get_or_create(name=groupe)[0])
    c = APIClient()
    c.force_authenticate(user)
    return user, c


def _admin(nom, **extra):
    return {"role": "admin", "username": nom, "password": "MotDePasse-123", **extra}


def test_le_pilotage_ne_cree_pas_de_compte_admin():
    _, c = _membre("pilote", "gestion-pilotage")
    r = c.post(URL, _admin("nouvel_admin"), format="json")
    assert r.status_code == 403
    assert not User.objects.filter(username="nouvel_admin").exists()


def test_le_pilotage_ne_promeut_pas_un_compte_existant_en_admin():
    _, c = _membre("pilote2", "gestion-pilotage")
    cible = User.objects.create_user("simple_client", password="p")
    r = c.post(URL, {"role": "admin", "existing_user_id": cible.pk}, format="json")
    assert r.status_code == 403
    cible.refresh_from_db()
    assert not cible.is_staff and not cible.is_superuser


def test_la_direction_cree_un_admin_jamais_superutilisateur_et_c_est_journalise():
    directeur, c = _membre("directeur", "direction")
    r = c.post(URL, _admin("admin_direction"), format="json")
    assert r.status_code == 201, r.content
    cree = User.objects.get(username="admin_direction")
    assert cree.is_staff and cree.is_superuser is False
    trace = AuditLog.objects.get(object_id=str(cree.pk), actor=directeur)
    assert trace.action == AuditLog.Action.CREATE and trace.changes["role"] == "admin"


def test_is_superuser_envoye_a_true_reste_a_false():
    _, c = _membre("directeur2", "direction")
    r = c.post(URL, _admin("admin_force", is_superuser=True), format="json")
    assert r.status_code == 201, r.content
    assert User.objects.get(username="admin_force").is_superuser is False


def test_le_pilotage_cree_toujours_un_client_et_c_est_journalise():
    pilote, c = _membre("pilote3", "gestion-pilotage")
    r = c.post(URL, {"role": "client", "username": "client_cree", "password": "MotDePasse-123"}, format="json")
    assert r.status_code == 201, r.content
    cree = User.objects.get(username="client_cree")
    assert AuditLog.objects.filter(object_id=str(cree.pk), actor=pilote, changes__role="client").exists()


def test_la_direction_seule_ne_cree_pas_les_autres_roles():
    _, c = _membre("directeur3", "direction")
    r = c.post(URL, {"role": "client", "username": "client_dir", "password": "MotDePasse-123"}, format="json")
    assert r.status_code == 403
    assert not User.objects.filter(username="client_dir").exists()
