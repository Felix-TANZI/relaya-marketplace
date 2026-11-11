# Règle de mot de passe de toute la plateforme (décision du porteur, 2026-11-11) : MDP-LONG du registre, mots de passe
# trop courants refusés. Valeurs passées directement, jamais écrites comme « mot de passe » en dur (GitGuardian).

import pytest
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("valeur", ["1", "abc", "abcdefgh", "1234567"])
def test_trop_court_ou_sans_chiffre_refuse(valeur):
    with pytest.raises(ValidationError) as erreur:
        validate_password(valeur)
    assert any("8 caractères" in m for m in erreur.value.messages)


def test_mot_de_passe_trop_courant_refuse():
    with pytest.raises(ValidationError):
        validate_password("password1")


def test_conforme_accepte():
    validate_password("Bastos-Mvog-2026")


def test_trop_proche_de_l_identifiant_refuse():
    compte = User(username="tantinebastos", email="tantine@exemple.cm")
    with pytest.raises(ValidationError):
        validate_password("tantinebastos1", compte)


def test_changement_de_mot_de_passe_applique_la_regle(api_client):
    compte = User.objects.create_user("vendeur_regle")
    compte.set_password("Ancien-Code-2026")
    compte.save()
    api_client.force_authenticate(compte)

    reponse = api_client.post("/api/auth/change-password/", {"old_password": "Ancien-Code-2026", "new_password": "123",
                                                             "new_password2": "123"}, format="json")

    assert reponse.status_code == 400 and "new_password" in reponse.json()
