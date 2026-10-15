# backend/tests/test_codes_otp_admin.py
# Tache D6 — « garder un seul systeme de codes », volet securite.
#
# L'ecran d'administration des codes OTP montrait le code en clair, en colonne
# de liste et dans la recherche. Un membre du staff avec le simple droit de
# lecture pouvait donc lire le code 2FA actif d'un compte, ou retrouver a qui
# appartenait un code, et terminer la connexion a sa place.
#
# Ces tests figent la correction : le code ne doit reapparaitre nulle part.

from datetime import timedelta

import pytest
from django.contrib import admin as django_admin
from django.utils import timezone

from apps.accounts.models import OTPCode

pytestmark = pytest.mark.django_db


@pytest.fixture
def ecran():
    return django_admin.site._registry[OTPCode]


@pytest.fixture
def staff(django_user_model):
    return django_user_model.objects.create_user(
        username="staff_otp",
        email="staff.otp@example.com",
        password="Codes-2026",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def code(django_user_model):
    victime = django_user_model.objects.create_user(
        username="victime", email="victime@example.com", password="Codes-2026",
    )
    return OTPCode.objects.create(
        user=victime,
        code="123456",
        purpose="2FA_LOGIN",
        expires_at=timezone.now() + timedelta(minutes=10),
    )


def test_le_code_n_est_pas_affiche_en_liste(ecran):
    assert "code" not in ecran.list_display


def test_le_code_n_est_pas_recherchable(ecran):
    # Rechercher par code permettait de remonter au compte vise.
    assert "code" not in ecran.search_fields


def test_le_code_est_exclu_du_formulaire(ecran, rf, staff, code):
    requete = rf.get("/django-admin/")
    requete.user = staff

    champs = ecran.get_fields(requete, code)

    assert "code" not in champs


def test_l_ecran_reste_consultable_et_dit_l_etat(ecran, code):
    # Le support doit encore pouvoir constater qu'un code a ete emis.
    assert ecran.etat(code) == "valable"

    code.is_used = True
    assert ecran.etat(code) == "utilisé"

    code.is_used = False
    code.expires_at = timezone.now() - timedelta(minutes=1)
    assert ecran.etat(code) == "expiré"


def test_aucune_modification_ni_creation_a_la_main(ecran, rf, staff):
    requete = rf.get("/django-admin/")
    requete.user = staff

    assert ecran.has_add_permission(requete) is False
    assert ecran.has_change_permission(requete) is False
