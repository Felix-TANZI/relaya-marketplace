# Feuille de route D6 et D19 : un seul système de codes, un seul stockage des pièces, un seul chemin d'ouverture.
#
#   D6   tous les codes (2FA, PIN relais, compte de versement, connexion et gestes du vendeur) passent par apps.otp ;
#        la 2FA part par le canal choisi (e-mail, SMS, WhatsApp)
#   D19  boutique créée depuis le compte, sans pièce, par une seule règle ; les pièces de l'espace vendeur rejoignent
#        le stockage que lit le verrou de publication et de versement

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import ComplianceDocument, PayoutAccount, UserProfile
from apps.vendors.models import VendorProfile
from apps.otp.models import CodeOtp
from apps.vendors import kyc
from apps.vendors.ouverture import Refus, ouvrir_boutique

pytestmark = pytest.mark.django_db

TIRAGE = "apps.otp.services.secrets.randbelow"


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def test_la_double_authentification_part_par_le_canal_choisi():
    from apps.accounts.views import _create_and_send_otp, _verifier_code_2fa

    user = User.objects.create_user(username="sms2fa", email="a@example.com", password="p")
    UserProfile.objects.create(user=user, phone="690112233", two_factor_method="SMS")
    with patch(TIRAGE, return_value=654321):
        _create_and_send_otp(user, "2FA_LOGIN")
    assert CodeOtp.objects.get().canal == "sms"                                                    # D6
    assert _verifier_code_2fa(user, "2FA_LOGIN", "654321")


def test_le_compte_de_versement_recoit_un_vrai_code():
    from apps.accounts.models import RelayPointProfile

    user = User.objects.create_user(username="relaisv", password="p")
    RelayPointProfile.objects.create(user=user, name="R", phone="690000301", city="Yaounde",
                                     status=RelayPointProfile.Status.APPROVED, is_active=True)
    c = _client(user)
    with patch(TIRAGE, return_value=111222):
        compte = c.post("/api/auth/payout-accounts/", {"owner_role": "RELAY_POINT", "phone": "677123441"},
                        format="json").json()
    assert "dev_code" not in compte and CodeOtp.objects.filter(objet="moyen").exists()            # D6
    assert c.post(f"/api/auth/payout-accounts/{compte['id']}/verify/", {"code": "000000"}, format="json").status_code == 400
    assert c.post(f"/api/auth/payout-accounts/{compte['id']}/verify/", {"code": "111222"}, format="json").status_code == 200
    assert PayoutAccount.objects.get(pk=compte["id"]).status == PayoutAccount.Status.VERIFIED


def test_le_vendeur_se_connecte_par_numero_avec_le_moteur_unique():
    user = User.objects.create_user(username="vendnum", password="p")
    VendorProfile.objects.create(user=user, business_name="Boutique num", phone="690445566", city="Yaoundé")
    c = APIClient()
    with patch(TIRAGE, return_value=246810):
        envoi = c.post("/api/vendors/auth/otp", {"telephone": "690445566", "appareil": "tel-1"}, format="json").json()
    assert envoi["ok"] and CodeOtp.objects.get().objet == CodeOtp.Objet.VENDEUR_CONNEXION               # D6
    assert c.post("/api/vendors/auth/verify", {"code": "000000", "appareil": "tel-1"}, format="json").json()["raison"] == "code"
    jetons = c.post("/api/vendors/auth/verify", {"code": "246810", "appareil": "tel-1"}, format="json").json()
    assert jetons["ok"] and jetons["jetons"]["access"]


def test_une_seule_regle_d_ouverture_de_boutique():
    premier = User.objects.create_user(username="ouvre1", password="p")
    ouvrir_boutique(premier, nom="Chez Awa", telephone="690778899")
    assert VendorProfile.objects.get(user=premier).status == "PENDING"                              # D19 : sans pièce
    with pytest.raises(Refus) as nom_pris:
        ouvrir_boutique(User.objects.create_user(username="ouvre2", password="p"), nom="chez awa")
    assert nom_pris.value.raison == "nom_pris"
    # La même règle derrière l'écran de l'espace vendeur
    second = User.objects.create_user(username="ouvre3", password="p")
    r = _client(second).post("/api/vendors/shops", {"nom": "Chez Awa", "categorie": "mode", "telephone": "691000000"},
                             format="json").json()
    assert r == {"ok": False, "raison": "nom"}


def test_les_pieces_de_l_espace_vendeur_alimentent_le_verrou():
    user = User.objects.create_user(username="kycv", password="p")
    VendorProfile.objects.create(user=user, business_name="Boutique kyc", phone="690990011", city="Yaoundé")
    c = _client(user)
    image = SimpleUploadedFile("recto.jpg", b"\xff\xd8\xff\xe0jpeg", content_type="image/jpeg")
    r = c.post("/api/vendors/shops/current/kyc", {"piece": "recto", "image": image}, format="multipart").json()
    assert r["ok"] and r["dossier"]["etat"] == "recu"
    doc = ComplianceDocument.objects.get(user=user, owner_role="VENDOR")                            # D19
    assert doc.document_type == kyc.CNI_RECTO and kyc.pieces_en_attente(user) == [kyc.CNI_RECTO]
    assert not kyc.identite_verifiee(user)
