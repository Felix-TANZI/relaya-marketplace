# DP-42 : double validation des versements (étape 16, avant main 2) ; R22.2 et R43.1 : le vendredi sans minimum.
#
#   - deux validations pour tous les versements, le comptable (Finance) puis le porteur (Direction), deux personnes
#   - la liste du vendredi se valide en bloc, total vérifié
#   - un valideur de secours : accordé par le porteur, au plus r_secours_jours_max jours, tracé
#   - rappels aux valideurs le vendredi (r_rappel_valideurs_h1 puis _h2), avant r_versement_heure

from datetime import datetime, timedelta

import pytest
from django.contrib.auth.models import Group, User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserNotification
from apps.payments.settlements import dp42
from apps.payments.settlements.models import PayoutRequest, RappelValidation, ValideurSecours
from apps.payments.settlements.services import (
    SettlementError, approve_payout, build_batch, confirm_batch, request_payout,
)
from apps.payments.tests.settlements.test_settlements import (  # noqa: F401  (fixtures)
    _mock, acheteur, configuration, liberer, operateur, plan_comptable, vendeur,
)
from apps.regles import services as regles

pytestmark = pytest.mark.django_db


def _membre(nom, *groupes):
    u = User.objects.create_user(nom, f"{nom}@belivay.cm", "x")
    for g in groupes:
        u.groups.add(Group.objects.get_or_create(name=g)[0])
    return u


@pytest.fixture
def comptable():
    return _membre("comptable", "finance", "finance-comptable")


@pytest.fixture
def porteur():
    return _membre("porteur", "finance", "direction")


def _demande(acheteur, vendeur, operateur, montant=45000, cle="c1", liste=""):
    liberer(acheteur, vendeur, montant=montant, cle=cle)
    return request_payout(confirm_batch(build_batch(vendeur)), requested_by=operateur, liste=liste)


def test_le_vendredi_part_sans_minimum(acheteur, vendeur, operateur):
    """R22.2, R43.1 : la politique garde 1 000 F de minimum, mais il ne vaut plus pour le versement du cycle."""
    d = _demande(acheteur, vendeur, operateur, montant=1000, cle="petit")
    assert d.amount_xaf < 1000 and d.status == PayoutRequest.Status.PENDING_APPROVAL


def test_deux_validations_pour_tout_versement_comptable_puis_porteur(acheteur, vendeur, operateur, comptable, porteur):
    d = _demande(acheteur, vendeur, operateur, montant=5000)
    assert d.required_approvals == 2
    with pytest.raises(SettlementError, match="comptable"):
        approve_payout(d, approved_by=porteur)                              # le porteur ne passe pas en premier
    d = approve_payout(d, approved_by=comptable)
    assert d.status == PayoutRequest.Status.PENDING_APPROVAL
    d = approve_payout(d, approved_by=porteur)
    assert d.status == PayoutRequest.Status.APPROVED
    assert list(d.approvals.values_list("role", flat=True)) == ["comptable", "direction"]


def test_jamais_la_meme_personne_pour_les_deux(acheteur, vendeur, operateur):
    les_deux = _membre("cumul", "finance", "finance-comptable", "direction")
    d = approve_payout(_demande(acheteur, vendeur, operateur), approved_by=les_deux)
    with pytest.raises(SettlementError):
        approve_payout(d, approved_by=les_deux)


def test_sans_role_pas_de_validation_meme_superutilisateur(acheteur, vendeur, operateur):
    chef = User.objects.create_superuser("chef", "c@b.cm", "x")
    with pytest.raises(SettlementError, match="DP-42"):
        approve_payout(_demande(acheteur, vendeur, operateur), approved_by=chef)


def test_la_liste_du_vendredi_se_valide_en_bloc(acheteur, vendeur, operateur, comptable, porteur):
    d = _demande(acheteur, vendeur, operateur, liste="vendredi-2026-10-30")
    etat = dp42.liste_du_vendredi("vendredi-2026-10-30")
    assert etat["nombre"] == 1 and etat["total_xaf"] == d.amount_xaf and etat["etape"] == "comptable"
    with pytest.raises(dp42.Dp42Error, match="a changé"):
        dp42.valider_liste("vendredi-2026-10-30", par=comptable, empreinte="autre")
    etat = dp42.valider_liste("vendredi-2026-10-30", par=comptable, empreinte=etat["empreinte"])
    assert etat["etape"] == "direction"
    with pytest.raises(dp42.Dp42Error):
        dp42.valider_liste("vendredi-2026-10-30", par=comptable,
                           empreinte=etat["empreinte"])                     # pas deux fois la même personne
    dp42.valider_liste("vendredi-2026-10-30", par=porteur, empreinte=etat["empreinte"])
    d.refresh_from_db()
    assert d.status == PayoutRequest.Status.APPROVED


def test_la_liste_par_l_api(acheteur, vendeur, operateur, comptable):
    d = _demande(acheteur, vendeur, operateur, liste="vendredi-2026-10-30")
    c = APIClient()
    c.force_authenticate(comptable)
    r = c.get("/api/payments/v2/admin/payouts/vendredi/")
    assert r.status_code == 200 and r.json()["liste"] == "vendredi-2026-10-30" and r.json()["mes_roles"] == ["comptable"]
    r = c.post("/api/payments/v2/admin/payouts/vendredi/vendredi-2026-10-30/valider/",
               {"empreinte": r.json()["empreinte"]},
               format="json")
    assert r.status_code == 200 and r.json()["etape"] == "direction"


def test_valideur_de_secours_limite_et_trace(acheteur, vendeur, operateur, comptable, porteur):
    remplacant = _membre("remplacant", "finance")
    jours = regles.reglage("r_secours_jours_max")
    with pytest.raises(dp42.Dp42Error, match="au plus"):
        dp42.accorder_secours(user=remplacant, role="direction", fin=timezone.now() + timedelta(days=jours + 1),
                              motif="Congés", par=porteur)
    with pytest.raises(dp42.Dp42Error, match="porteur"):
        dp42.accorder_secours(user=remplacant, role="direction", fin=timezone.now() + timedelta(days=1),
                              motif="Congés", par=comptable)               # seul le porteur accorde
    with pytest.raises(dp42.Dp42Error, match="soi-même"):
        dp42.accorder_secours(user=porteur, role="direction", fin=timezone.now() + timedelta(days=1),
                              motif="x", par=porteur)
    s = dp42.accorder_secours(user=remplacant, role="direction", fin=timezone.now() + timedelta(days=1),
                              motif="Congés du porteur", par=porteur)
    d = approve_payout(_demande(acheteur, vendeur, operateur), approved_by=comptable)
    d = approve_payout(d, approved_by=remplacant)
    assert d.status == PayoutRequest.Status.APPROVED
    assert d.approvals.get(role="direction").secours == s                     # validation faite à ce titre, tracée
    dp42.revoquer_secours(s, par=porteur)
    assert "direction" not in dp42.roles_de(remplacant)
    with pytest.raises(Exception):
        s.delete()


def test_un_secours_expire_ne_valide_plus(acheteur, vendeur, operateur, comptable, porteur):
    remplacant = _membre("remplacant2", "finance")
    debut = timezone.now() - timedelta(days=2)
    ValideurSecours.objects.create(user=remplacant, role="direction", debut=debut, fin=debut + timedelta(days=1),
                                   motif="Passé", accorde_par=porteur)
    d = approve_payout(_demande(acheteur, vendeur, operateur), approved_by=comptable)
    with pytest.raises(SettlementError, match="porteur"):
        approve_payout(d, approved_by=remplacant)


def _vendredi(heure):
    jour = timezone.localdate()
    vendredi = jour + timedelta(days=(4 - jour.weekday()) % 7)
    return timezone.make_aware(datetime(vendredi.year, vendredi.month, vendredi.day, heure, 5))


def test_rappels_du_vendredi(acheteur, vendeur, operateur, comptable, porteur):
    tot = _vendredi(regles.reglage("r_rappel_valideurs_h1"))
    _demande(acheteur, vendeur, operateur, liste=dp42.cle_du_vendredi(tot))
    assert dp42.rappels_du_vendredi(tot - timedelta(hours=1))["rappels"] == 0       # trop tôt
    assert dp42.rappels_du_vendredi(tot)["rappels"] == 1
    assert dp42.rappels_du_vendredi(tot)["rappels"] == 0                            # une seule fois
    assert UserNotification.objects.filter(user=comptable).count() == 1
    assert not UserNotification.objects.filter(user=porteur).exists()               # étape du comptable
    dp42.valider_liste(dp42.cle_du_vendredi(tot), par=comptable,
                       empreinte=dp42.liste_du_vendredi(dp42.cle_du_vendredi(tot))["empreinte"])
    second = _vendredi(regles.reglage("r_rappel_valideurs_h2"))
    assert dp42.rappels_du_vendredi(second)["rappels"] == 1
    assert UserNotification.objects.filter(user=porteur).count() == 1               # puis le porteur
    assert RappelValidation.objects.count() == 2
    assert dp42.rappels_du_vendredi(_vendredi(regles.reglage("r_versement_heure")))["skipped"] is True
