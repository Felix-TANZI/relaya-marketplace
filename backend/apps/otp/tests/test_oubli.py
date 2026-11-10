# DEV-SRV-01 T07-5 : « mot de passe oublié » pour tous les comptes, par e-mail ou par SMS (apps.otp.oubli).
# Le vendeur inscrit par un agent n'a pas d'e-mail : le lien doit lui arriver par SMS, et ramener à son portail.

import re
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core import mail

from apps.vendors.models import VendorProfile

pytestmark = pytest.mark.django_db

OUBLI = "/api/auth/password/forgot"
NOUVEAU = "/api/auth/password/reset"
OUBLI_VENDEUR = "/api/vendors/auth/password-reset"


class FauxSms:
    def __init__(self):
        self.envoyes = []

    def envoyer(self, numero, texte, canal="sms"):
        self.envoyes.append((numero, texte))


@pytest.fixture
def faux_sms():
    sms = FauxSms()
    with patch("apps.otp.oubli.sms", return_value=sms):
        yield sms


@pytest.fixture
def vendeur_sans_email():
    user = User.objects.create_user("v677001122")  # sans mot de passe : il en choisit un par le lien
    VendorProfile.objects.create(user=user, business_name="Chez Tantine", phone="+237677001122")
    return user


def _jeton(texte):
    return re.search(r"/mdp-nouveau\?jeton=([\w-]+)", texte).group(1)


def test_vendeur_sans_email_recoit_le_lien_par_sms_et_change_son_mot_de_passe(api_client, faux_sms, vendeur_sans_email,
                                                                              settings):
    settings.BELIVAY_SITE_URL = "https://shop.belivay.com"

    reponse = api_client.post(OUBLI_VENDEUR, {"identifiant": "677 00 11 22"}, format="json")

    assert reponse.status_code == 200 and reponse.json()["lien"]["canal"] == "sms"
    numero, texte = faux_sms.envoyes[-1]
    assert numero == "+237677001122" and mail.outbox == []
    r = api_client.post(NOUVEAU, {"jeton": _jeton(texte), "mot_de_passe": "nouveau2026"}, format="json")
    assert r.status_code == 200
    vendeur_sans_email.refresh_from_db()
    assert vendeur_sans_email.check_password("nouveau2026")


def test_client_par_email(api_client, faux_sms, settings):
    settings.BELIVAY_SITE_URL = "https://shop.belivay.com"
    User.objects.create_user("carine", email="carine@exemple.cm")

    reponse = api_client.post(OUBLI, {"email": "carine@exemple.cm"}, format="json")

    assert reponse.status_code == 202 and reponse.json()["canal"] == "email"
    assert "https://shop.belivay.com/mdp-nouveau?jeton=" in mail.outbox[-1].body
    assert faux_sms.envoyes == []


def test_par_numero_depuis_l_adresse_client(api_client, faux_sms, vendeur_sans_email):
    reponse = api_client.post(OUBLI, {"identifiant": "+237677001122"}, format="json")

    assert reponse.status_code == 202 and reponse.json()["canal"] == "sms"
    assert len(faux_sms.envoyes) == 1


def test_le_lien_ramene_au_portail_configure_de_la_demande(api_client, faux_sms, vendeur_sans_email, settings):
    settings.CORS_ALLOWED_ORIGINS = ["https://seller.belivay.com", "https://localhost"]

    api_client.post(OUBLI_VENDEUR, {"identifiant": "677001122"}, format="json",
                    HTTP_ORIGIN="https://seller.belivay.com")

    assert "https://seller.belivay.com/mdp-nouveau?jeton=" in faux_sms.envoyes[-1][1]


@pytest.mark.parametrize("origine", ["https://pirate.example", "https://localhost", "http://seller.belivay.com"])
def test_une_origine_non_configuree_ne_choisit_pas_l_adresse_du_lien(api_client, faux_sms, vendeur_sans_email, settings,
                                                                    origine):
    settings.CORS_ALLOWED_ORIGINS = ["https://seller.belivay.com", "https://localhost", "http://seller.belivay.com"]
    settings.BELIVAY_SITE_URL = "https://shop.belivay.com"

    api_client.post(OUBLI_VENDEUR, {"identifiant": "677001122"}, format="json", HTTP_ORIGIN=origine)

    assert "https://shop.belivay.com/mdp-nouveau?jeton=" in faux_sms.envoyes[-1][1]


def test_compte_inconnu_meme_reponse_et_rien_n_est_envoye(api_client, faux_sms):
    reponse = api_client.post(OUBLI, {"identifiant": "699999999"}, format="json")

    assert reponse.status_code == 202 and reponse.json()["canal"] == "sms"
    assert faux_sms.envoyes == [] and mail.outbox == []


def test_sans_identifiant_refuse(api_client):
    assert api_client.post(OUBLI, {}, format="json").status_code == 400
