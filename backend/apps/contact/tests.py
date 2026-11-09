# DEV-SRV-01, T09 : la candidature d'un point relais envoyait une adresse inventée (« candidature@belivay.test »),
# enregistrée en base, parce que le formulaire de contact exigeait un e-mail. Un téléphone suffit désormais.

from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings

from .models import ContactMessage
from .utils import send_contact_emails

MESSAGE = {"name": "Mama Ngono", "subject": "[Candidature point relais] Chez Mama",
           "message": "Commerce : Chez Mama (boutique) — Quartier : Bastos"}


@patch("apps.contact.views.send_contact_emails.delay")
class ContactSansEmailTests(TestCase):
    def test_un_telephone_suffit(self, _envoi):
        reponse = self.client.post("/api/contact/", {**MESSAGE, "phone": "+237699112233"},
                                   content_type="application/json")

        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(ContactMessage.objects.get().email, "")

    def test_ni_email_ni_telephone_refuse(self, _envoi):
        reponse = self.client.post("/api/contact/", MESSAGE, content_type="application/json")

        self.assertEqual(reponse.status_code, 400)
        self.assertFalse(ContactMessage.objects.exists())

    def test_avec_email_rien_ne_change(self, _envoi):
        reponse = self.client.post("/api/contact/", {**MESSAGE, "email": "mama@example.com"},
                                   content_type="application/json")

        self.assertEqual(reponse.status_code, 201, reponse.content)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class EnvoiSansEmailTests(TestCase):
    def test_sans_email_le_support_est_prevenu_sans_confirmation(self):
        message = ContactMessage.objects.create(phone="+237699112233", **MESSAGE)

        send_contact_emails.apply(args=[message.id])

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].reply_to, [])
