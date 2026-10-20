# backend/tests/test_2fa_moteur_unique.py
# Tache D6 — « garder un seul systeme de codes (OTP et 2FA) ».
#
# La double authentification avait son propre mecanisme, dans apps/accounts :
#   - le code etait stocke EN CLAIR (et lisible dans l'administration) ;
#   - il etait tire avec `random`, generateur non cryptographique ;
#   - aucun compteur d'essais par code : un code a 6 chiffres sans limite propre.
#
# Elle s'appuie desormais sur le moteur unique du projet (apps/otp) : empreinte
# seulement, tirage par `secrets`, essais comptes et blocage temporaire.
#
# Le test central est celui des adresses partagees. Le moteur retrouve
# normalement un code par (objet, destination), et la destination d'un code 2FA
# est l'e-mail du compte. Or Django n'impose PAS l'unicite de `email` : seuls
# les serialiseurs la verifient. Sans liaison explicite au compte, le code de
# l'un validerait la connexion de l'autre.

import re

import pytest
from django.core import mail

from apps.accounts.models import OTPCode
from apps.otp.models import CodeOtp

pytestmark = pytest.mark.django_db

ENVOI = "/api/auth/2fa/send-code/"
ACTIVATION = "/api/auth/2fa/enable/"
CONNEXION = "/api/auth/2fa/verify-login/"


def _code_recu(index: int = -1) -> str:
    """Lit le code dans le dernier e-mail parti."""
    trouve = re.search(r"\b(\d{4,8})\b", mail.outbox[index].body)
    assert trouve, f"aucun code dans l'e-mail : {mail.outbox[index].body!r}"
    return trouve.group(1)


@pytest.fixture
def compte(django_user_model):
    return django_user_model.objects.create_user(
        username="client_2fa", email="client.2fa@example.com", password="Codes-2026",
    )


# ── Le code n'est plus lisible nulle part ────────────────────────────────────

def test_le_code_n_est_plus_stocke_en_clair(api_client, compte):
    mail.outbox = []
    api_client.force_authenticate(compte)

    reponse = api_client.post(ENVOI, {"purpose": "2FA_ENABLE"}, format="json")

    assert reponse.status_code == 200
    # Plus aucune ligne dans l'ancien modele, qui gardait le code en clair.
    assert OTPCode.objects.count() == 0

    enregistre = CodeOtp.objects.get()
    code = _code_recu()
    assert code not in enregistre.code_empreinte
    assert enregistre.utilisateur == compte


# ── Parcours complets ────────────────────────────────────────────────────────

def test_activer_la_double_authentification_de_bout_en_bout(api_client, compte):
    mail.outbox = []
    api_client.force_authenticate(compte)
    api_client.post(ENVOI, {"purpose": "2FA_ENABLE"}, format="json")

    reponse = api_client.post(
        ACTIVATION, {"code": _code_recu(), "method": "EMAIL"}, format="json")

    assert reponse.status_code == 200
    compte.profile.refresh_from_db()
    assert compte.profile.two_factor_enabled is True


def test_connexion_par_code_de_bout_en_bout(api_client, compte):
    from apps.accounts.views import _create_and_send_otp

    mail.outbox = []
    _create_and_send_otp(compte, "2FA_LOGIN")

    reponse = api_client.post(
        CONNEXION, {"user_id": compte.id, "code": _code_recu()}, format="json")

    assert reponse.status_code == 200
    assert "access" in reponse.data and "refresh" in reponse.data


# ── Le test qui compte : deux comptes, une seule adresse ─────────────────────

def test_deux_comptes_partageant_une_adresse_ne_partagent_pas_leurs_codes(
    api_client, django_user_model,
):
    adresse = "famille@example.com"
    alice = django_user_model.objects.create_user(
        username="alice", email=adresse, password="Codes-2026")
    bob = django_user_model.objects.create_user(
        username="bob", email=adresse, password="Codes-2026")
    # Django ne l'interdit pas : la preuve.
    assert django_user_model.objects.filter(email=adresse).count() == 2

    from apps.accounts.views import _create_and_send_otp

    mail.outbox = []
    _create_and_send_otp(alice, "2FA_LOGIN")
    code_d_alice = _code_recu()

    # Bob tente d'ouvrir SA session avec le code recu par Alice.
    usurpation = api_client.post(
        CONNEXION, {"user_id": bob.id, "code": code_d_alice}, format="json")

    assert usurpation.status_code == 400

    # Et le code d'Alice reste valable pour elle : la tentative de Bob ne l'a
    # ni consomme, ni fait compter un essai contre elle.
    legitime = api_client.post(
        CONNEXION, {"user_id": alice.id, "code": code_d_alice}, format="json")
    assert legitime.status_code == 200


def test_la_limite_anti_abus_protege_la_boite_mail_sans_annuler_le_code_en_cours(
    api_client, django_user_model,
):
    """
    La limite de renvoi porte sur la DESTINATION, pas sur le compte : deux
    comptes ne peuvent pas inonder la meme boite de codes. C'est voulu.

    Ce qui compte, c'est qu'un refus n'emporte pas le code deja envoye : la
    demande de Bob est rejetee, et Alice peut toujours se servir du sien.
    """
    from apps.client_core.erreurs import ErreurClient

    adresse = "famille2@example.com"
    alice = django_user_model.objects.create_user(
        username="alice2", email=adresse, password="Codes-2026")
    bob = django_user_model.objects.create_user(
        username="bob2", email=adresse, password="Codes-2026")

    from apps.accounts.views import _create_and_send_otp

    mail.outbox = []
    _create_and_send_otp(alice, "2FA_LOGIN")
    code_d_alice = _code_recu()

    with pytest.raises(ErreurClient) as refus:
        _create_and_send_otp(bob, "2FA_LOGIN")
    assert refus.value.status_code == 429

    # Le code d'Alice a survecu au refus.
    legitime = api_client.post(
        CONNEXION, {"user_id": alice.id, "code": code_d_alice}, format="json")
    assert legitime.status_code == 200


# ── Essais comptes, puis blocage ─────────────────────────────────────────────

def test_un_code_faux_est_compte_et_finit_par_bloquer(api_client, compte):
    from apps.accounts.views import _create_and_send_otp

    mail.outbox = []
    _create_and_send_otp(compte, "2FA_LOGIN")

    for _ in range(10):
        api_client.post(CONNEXION, {"user_id": compte.id, "code": "000000"}, format="json")

    enregistre = CodeOtp.objects.get()
    # L'ancien systeme ne comptait rien du tout.
    assert enregistre.essais > 0
    assert enregistre.bloque_jusqua is not None


# ── Suppression de compte ────────────────────────────────────────────────────

def test_la_suppression_du_compte_purge_les_codes(compte):
    from apps.accounts.account_deletion import _clear_personal_records
    from apps.accounts.views import _create_and_send_otp

    mail.outbox = []
    _create_and_send_otp(compte, "2FA_LOGIN")
    assert CodeOtp.objects.filter(utilisateur=compte).exists()

    _clear_personal_records(compte)

    assert not CodeOtp.objects.filter(utilisateur=compte).exists()
