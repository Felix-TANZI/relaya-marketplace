# Feuille de route D7 : SMS et WhatsApp (spec v2.1, R50.2, R78).
#
#   - les codes partent par le canal choisi : WhatsApp (modèle « Authentification ») quand l'assistant est ouvert,
#     sinon SMS ; numéros étrangers au format international
#   - SMS de commande : paiement protégé, code de retrait, deux rappels, incident, remerciement ; r_sms_max au plus,
#     jamais de promotion (R78.1)
#   - « Ce n'est plus mon numéro » : l'ancien numéro remplacé par un code à l'e-mail du compte

import re
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth.models import User
from django.core import mail
from rest_framework.test import APIClient

from apps.orders import sms
from apps.orders.models import Order, SmsCommande
from apps.otp.prestataires import Aiguillage, SmsConsole, international
from apps.regles import services as regles
from apps.whatsapp_assistant.message_templates import CODE, definitions

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _propre():
    SmsConsole.ENVOYES.clear()
    yield
    SmsConsole.ENVOYES.clear()


def test_numeros_au_format_international():
    assert international("677123441") == "+237677123441"
    assert international("+33 6 12 34 56 78") == "+33612345678"                     # numéro étranger
    assert international("0033612345678") == "+33612345678"


def test_whatsapp_ferme_le_code_part_par_sms():
    Aiguillage().envoyer("677123441", "BelivaY : ton code est 123456.", "whatsapp")
    assert SmsConsole.ENVOYES[-1]["numero"] == "677123441"


def test_whatsapp_ouvert_le_code_part_par_le_modele_authentification():
    fournisseur = MagicMock()
    fournisseur.send_code.return_value = "wamid.1"
    config = MagicMock(enabled=True)
    with patch("apps.whatsapp_assistant.conf.get_config", return_value=config), \
         patch("apps.whatsapp_assistant.providers.get_provider", return_value=fournisseur):
        envoi = Aiguillage().envoyer("677123441", "BelivaY : ton code est 123456.", "whatsapp")
    assert envoi.ok and fournisseur.send_code.call_args.args == ("237677123441", "123456")
    assert SmsConsole.ENVOYES == []
    assert any(t["name"] == CODE and t["category"] == "AUTHENTICATION" for t in definitions("https://app"))


def _commande():
    return Order.objects.create(customer_phone="+237690123456", city="Yaounde", address="x", total_xaf=1000)


def test_sms_de_commande_bornes_et_sans_promotion():
    o = _commande()
    assert sms.paiement_protege(o) and not sms.paiement_protege(o)                         # une seule fois
    with pytest.raises(ValueError):
        sms.envoyer(o, "promotion", "‑20 % ce week-end")                                    # R78.1
    for _ in range(10):
        sms.incident(o, "retard")
    assert SmsCommande.objects.filter(order=o, ok=True).count() == regles.reglage("r_sms_max")   # R78.1


def test_ce_n_est_plus_mon_numero():
    from apps.client_accounts import services as comptes

    user = User.objects.create_user(username="perdu", email="perdu@example.com", password="p")
    comptes.enregistrer_numero(user, "677123441")
    c = APIClient()
    c.force_authenticate(user)
    # Sans preuve sur l'ancien numéro, le nouveau numéro est refusé
    assert c.post("/api/auth/otp/send", {"purpose": "numero-nouveau", "destination": "699887766"},
                  format="json").status_code == 409
    mail.outbox = []
    assert c.post("/api/auth/otp/send", {"purpose": "change_lost", "canal": "email"}, format="json").status_code == 202
    code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)                          # code à l'e-mail
    assert c.post("/api/auth/otp/verify", {"purpose": "change_lost", "code": code}, format="json").json()["ok"]
    assert c.post("/api/auth/otp/send", {"purpose": "numero-nouveau", "destination": "699887766"},
                  format="json").status_code == 202
