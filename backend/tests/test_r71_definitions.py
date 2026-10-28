# R71 : palier « Élevé » (R71.1) et « relais habituel » (R71.2), définitions validées par le porteur le 2026-10-28.

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from apps.client_accounts.models import ProfilClient
from apps.client_core.chiffrement import chiffrer, empreinte
from apps.orders import remboursement_auto as rmb
from apps.orders.models import Dispute, Order
from apps.regles import services as regles
from tests.test_comptoir_d14 import _referentiel  # noqa: F401  (fixture)
from tests.test_remboursement_auto_d32 import _client
from apps.payments.tests.bridge.test_checkout import _mock, configuration, plan_comptable  # noqa: F401,E402

pytestmark = pytest.mark.django_db


def _fidele(nom, numero="677000111"):
    """Un client qui remplit toutes les conditions du palier Élevé."""
    user = _client(nom, livrees=regles.reglage("r_palier_eleve_livrees"))
    User.objects.filter(pk=user.pk).update(
        date_joined=timezone.now() - timedelta(days=30 * regles.reglage("r_palier_eleve_anciennete_mois") + 1))
    user.refresh_from_db()
    ProfilClient.objects.create(user=user, numero_chiffre=chiffrer(numero), numero_empreinte=empreinte(numero),
                                numero_verifie_le=timezone.now())
    return user


def test_le_palier_eleve_releve_le_seuil_du_remboursement_automatique():
    user = _fidele("c_fidele")
    assert rmb.palier_client(user) == "Élevé"
    assert rmb.seuil(user) == regles.reglage("r_auto_rmb_max_eleve")                      # R71.1 : 10 000 F
    assert rmb.palier_client(_client("c_nouveau")) == "Standard"
    assert rmb.seuil(_client("c_nouveau2")) == regles.reglage("r_auto_rmb_max")


@pytest.mark.parametrize("manque", ["anciennete", "numero", "litige_perdu", "livrees"])
def test_chaque_condition_du_palier_eleve_compte(manque):
    user = _fidele(f"c_{manque}", numero=f"6770{len(manque):05d}")
    if manque == "anciennete":
        User.objects.filter(pk=user.pk).update(date_joined=timezone.now())
        user.refresh_from_db()
    elif manque == "numero":
        ProfilClient.objects.filter(user=user).update(numero_verifie_le=None)
    elif manque == "litige_perdu":
        o = Order.objects.filter(user=user).first()
        Dispute.objects.create(order=o, opened_by=user, reason="DAMAGED", resolution="REJECTED",
                               resolved_at=timezone.now())
    else:
        Order.objects.filter(pk=Order.objects.filter(user=user).first().pk).delete()
    assert rmb.palier_client(user) == "Standard"


def test_meme_relais_habituel_et_meme_nom_c_est_la_meme_personne(monkeypatch):
    """R71.2 : un second compte, même relais habituel et même nom de retrait, n'ouvre pas une nouvelle limite ; un
    autre client du même relais, sous un autre nom, n'est pas concerné."""
    from tests import test_remboursement_auto_d32 as d32

    vrai = regles.reglage
    monkeypatch.setattr(regles, "reglage",
                        lambda nom: d32.PLAFOND if nom == "r_auto_rmb_plafond_mois" else vrai(nom))
    premier = _client("c_rel_1")
    o = d32._commande_retiree(premier)
    relais = o.relay_point_id
    ProfilClient.objects.create(user=premier, relais_habituel_id=relais, nom_retrait="Awa N.")
    assert d32._reclamer(premier, o)["accorde"] is True
    assert rmb.relais_habituel_id(premier) == relais

    depuis = timezone.now() - timedelta(days=30)
    # Comptage par la seule clé relais habituel + nom (sans numéro ni téléphone communs) :
    second_compte = _client("c_rel_2")
    ProfilClient.objects.create(user=second_compte, relais_habituel_id=relais, nom_retrait="AWA  n")
    assert rmb._deja(second_compte, "", "", depuis) == 1                                # même personne
    voisin = _client("c_rel_3")
    ProfilClient.objects.create(user=voisin, relais_habituel_id=relais, nom_retrait="Paul K.")
    assert rmb._deja(voisin, "", "", depuis) == 0                                       # le relais seul ne suffit pas
