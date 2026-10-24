# Feuille de route D21 (notifications push à chaque étape de commande) et D24 (administration minimum).

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import ComplianceDocument, UserNotification
from apps.notifications_client.models import Appareil
from apps.notifications_client.prestataires import FCMPush, PushConsole
from apps.vendors import kyc
from apps.vendors.models import VendorProfile

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _push():
    PushConsole.ENVOYES.clear()
    yield
    PushConsole.ENVOYES.clear()


def _appareil(user, type_="fcm"):
    return Appareil.objects.create(user=user, type=type_, endpoint=f"jeton-{user.pk}-{type_}", endpoint_empreinte=f"e{user.pk}{type_}")


def test_chaque_etape_de_commande_part_en_push():
    client = User.objects.create_user(username="cl_push", password="p")
    _appareil(client)
    UserNotification.objects.create(user=client, title="Colis prêt au retrait", message="Ton colis t'attend.",
                                    notification_type=UserNotification.NotificationType.ORDER, action_url="/orders/1")
    assert PushConsole.ENVOYES and PushConsole.ENVOYES[-1]["titre"] == "Colis prêt au retrait"              # D21


def test_jamais_de_code_dans_un_push():
    client = User.objects.create_user(username="cl_code", password="p")
    _appareil(client)
    UserNotification.objects.create(user=client, title="Votre colis arrive", message="Code de livraison : 123456.",
                                    notification_type=UserNotification.NotificationType.ORDER)
    assert "123456" not in PushConsole.ENVOYES[-1]["texte"]                                               # CAP-19


def test_fcm_ignore_les_adresses_du_site():
    client = User.objects.create_user(username="cl_web", password="p")
    assert FCMPush().envoyer(_appareil(client, "webpush"), "Titre", "Texte").ok is False                   # D21


def _staff():
    c = APIClient()
    c.force_authenticate(User.objects.create_user(username=f"staff{User.objects.count()}", password="p", is_staff=True))
    return c


def test_les_pages_d_administration_repondent():
    c = _staff()
    for url in ("/api/auth/admin/support/", "/api/auth/admin/fraud/", "/api/auth/admin/couriers/overview/",
                "/api/auth/admin/kyc/pieces/"):
        assert c.get(url).status_code == 200, url                                                          # D24
    autre = APIClient()
    autre.force_authenticate(User.objects.create_user(username="pas_staff", password="p"))
    assert autre.get("/api/auth/admin/fraud/").status_code == 403


def test_support_repond_au_client():
    from apps.messaging.services import conversation_support, envoyer_message

    client = User.objects.create_user(username="cl_sup", password="p")
    conv = conversation_support(client)
    envoyer_message(conv, "Où est ma commande ?")
    c = _staff()
    fils = c.get("/api/auth/admin/support/").json()
    assert fils["a_traiter"] == 1
    fil = c.post(f"/api/auth/admin/support/{conv.pk}/", {"texte": "Elle arrive demain.", "resolue": True},
                 format="json").json()
    assert fil["resolue"] and fil["messages"][-1]["de"] == "eux"
    assert UserNotification.objects.filter(user=client, title__icontains="support").exists()


def test_decider_les_pieces_une_par_une():
    user = User.objects.create_user(username="vend_kyc", password="p")
    VendorProfile.objects.create(user=user, business_name="Boutique kyc", phone="690000999", city="Yaoundé")
    docs = [ComplianceDocument.objects.create(user=user, owner_role="VENDOR", document_type=t,
                                              file=SimpleUploadedFile(f"{t}.jpg", b"x"))
            for t in kyc.PIECES_EXIGEES]
    c = _staff()
    assert c.post(f"/api/auth/admin/kyc/pieces/{docs[0].pk}/", {"decision": "REJECTED"}, format="json").status_code == 400
    r = c.post(f"/api/auth/admin/kyc/pieces/{docs[0].pk}/", {"decision": "REJECTED", "motif": "Photo floue"},
               format="json").json()
    assert r["statut"] == "REJECTED" and r["motif"] == "Photo floue"                                       # D19, D24
    for d in docs:
        c.post(f"/api/auth/admin/kyc/pieces/{d.pk}/", {"decision": "APPROVED"}, format="json")
    assert kyc.identite_verifiee(user)
    assert UserNotification.objects.filter(user=user, title="Identité vérifiée").exists()
