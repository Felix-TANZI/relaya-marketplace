# backend/tests/test_mail_asynchrone.py
# Tache D6 — envoi des e-mails hors du fil de la requete.
#
# Le point sensible n'est pas la vitesse : c'est de NE JAMAIS PERDRE un
# message. Un code de connexion ou une reinitialisation de mot de passe qui
# disparait silencieusement est bien pire qu'un e-mail lent. Ces tests
# verifient donc surtout les cas degrades.

from unittest.mock import patch

import pytest
from django.core import mail
from django.core.mail import EmailMultiAlternatives, send_mail
from django.test import override_settings

from apps.common.mail import reconstruire, serialiser

CELERY = override_settings(
    EMAIL_BACKEND="apps.common.mail.CeleryEmailBackend",
    EMAIL_BACKEND_REEL="django.core.mail.backends.locmem.EmailBackend",
)


def _message_complet():
    message = EmailMultiAlternatives(
        subject="Ton code BelivaY",
        body="Code : 123456",
        from_email="BelivaY <noreply@belivay.com>",
        to=["client@example.com"],
        cc=["copie@example.com"],
        bcc=["cachee@example.com"],
        reply_to=["support@belivay.com"],
    )
    message.attach_alternative("<p>Code : 123456</p>", "text/html")
    message.attach("facture.txt", "contenu", "text/plain")
    return message


# ── Le message traverse la file sans rien perdre ─────────────────────────────

def test_la_serialisation_conserve_tout_le_message():
    refait = reconstruire(serialiser(_message_complet()))

    assert refait.subject == "Ton code BelivaY"
    assert refait.body == "Code : 123456"
    assert refait.to == ["client@example.com"]
    assert refait.cc == ["copie@example.com"]
    assert refait.bcc == ["cachee@example.com"]
    assert refait.reply_to == ["support@belivay.com"]
    # Le formulaire de contact envoie du HTML : le perdre serait une regression.
    assert refait.alternatives == [("<p>Code : 123456</p>", "text/html")]
    assert refait.attachments == [("facture.txt", "contenu", "text/plain")]


# ── Fonctionnement normal : on met en file, on ne bloque pas ─────────────────

@CELERY
def test_un_envoi_part_en_file_et_ne_bloque_pas_la_requete():
    mail.outbox = []

    with patch("apps.common.tasks.envoyer_courriels.delay") as file_celery:
        send_mail("Sujet", "Corps", None, ["client@example.com"])

    file_celery.assert_called_once()
    # Rien n'est parti tout de suite : c'est la tache qui enverra.
    assert mail.outbox == []


@CELERY
def test_la_tache_envoie_pour_de_bon():
    mail.outbox = []

    from apps.common.tasks import envoyer_courriels
    envoyer_courriels(charges=[serialiser(_message_complet())])

    assert len(mail.outbox) == 1
    assert mail.outbox[0].subject == "Ton code BelivaY"


# ── Cas degrade : la file est injoignable ────────────────────────────────────

@CELERY
def test_si_la_file_est_injoignable_l_e_mail_part_quand_meme():
    """
    Broker arrete, reseau coupe : on bascule en envoi direct. Mieux vaut une
    requete lente qu'un code de connexion jamais recu.
    """
    mail.outbox = []

    with patch(
        "apps.common.tasks.envoyer_courriels.delay",
        side_effect=OSError("broker injoignable"),
    ):
        send_mail("Sujet", "Corps", None, ["client@example.com"])

    assert len(mail.outbox) == 1
    assert mail.outbox[0].subject == "Sujet"


@CELERY
def test_aucun_message_aucun_appel():
    with patch("apps.common.tasks.envoyer_courriels.delay") as file_celery:
        from django.core.mail import get_connection
        assert get_connection().send_messages([]) == 0

    file_celery.assert_not_called()


# ── L'ancienne tache ne doit pas se remettre en file ─────────────────────────

@CELERY
def test_l_ancienne_tache_vise_directement_le_backend_reel():
    """
    `send_plain_email` est encore appelee par apps/accounts et apps/vendors.
    Si elle repassait par EMAIL_BACKEND, une tache en programmerait une autre
    pour le meme message.
    """
    mail.outbox = []

    with patch("apps.common.tasks.envoyer_courriels.delay") as file_celery:
        from apps.common.tasks import send_plain_email
        send_plain_email(
            subject="Direct", message="Corps", from_email=None,
            recipient_list=["client@example.com"],
        )

    file_celery.assert_not_called()
    assert len(mail.outbox) == 1
    assert mail.outbox[0].subject == "Direct"


# ── En test, rien ne doit partir en file par defaut ──────────────────────────

@pytest.mark.django_db
def test_les_tests_n_utilisent_pas_la_file_par_defaut():
    mail.outbox = []

    send_mail("Sujet", "Corps", None, ["client@example.com"])

    # settings/test.py garde les deux niveaux sur la boite en memoire.
    assert len(mail.outbox) == 1
