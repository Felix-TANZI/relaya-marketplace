# backend/tests/test_purchases_closed.py
# Tache D2 — verrou des achats pendant la phase vitrine.
#
# Le verrou lit l'interrupteur FF-ACHAT de client_core. Par defaut il est
# ouvert (interrupteurs.json, convention DP-50) : le developpement et la suite
# de tests ne changent donc pas de comportement. C'est une ligne dans
# l'administration qui ferme.
#
# Les tests d'endpoint verifient aussi l'ORDRE d'execution : le verrou doit
# agir AVANT la validation du corps de requete et AVANT toute lecture en
# base. D'ou le corps vide et la reference inexistante — achats ouverts ils
# produisent 400 et 404, achats fermes ils doivent produire 404 dans les deux
# cas. Le test du corps vide est donc le discriminant : 404 au lieu de 400
# prouve que le verrou est passe en premier.

import pytest

from apps.client_core.models import Interrupteur
from apps.common.purchases import CODE_INTERRUPTEUR, purchases_open_for

pytestmark = pytest.mark.django_db

ORDERS_URL = "/api/orders/"
PAY_URL = "/api/payments/v2/me/payments/REF-QUI-N-EXISTE-PAS/pay/"


def _regler_achats(ouvert: bool):
    """Pose l'interrupteur. Le signal post_save vide le cache tout seul."""
    Interrupteur.objects.update_or_create(
        code=CODE_INTERRUPTEUR, defaults={"ouvert": ouvert},
    )


@pytest.fixture
def achats_fermes():
    # Redondant avec la valeur par defaut (FF-ACHAT n'est pas declare dans
    # interrupteurs.json, donc ferme), mais pose l'etat explicitement : le
    # test ne doit pas dependre d'un defaut qu'on pourrait changer ailleurs.
    _regler_achats(False)


@pytest.fixture
def achats_ouverts():
    _regler_achats(True)


@pytest.fixture
def acheteur(django_user_model):
    return django_user_model.objects.create_user(
        username="acheteur_vitrine",
        email="acheteur.vitrine@example.com",
        password="Vitrine-pass-2026",
    )


# ── Achats fermes : les deux chemins sont bloques ────────────────────────────

def test_creation_de_commande_refusee_quand_les_achats_sont_fermes(
    api_client, acheteur, achats_fermes,
):
    api_client.force_authenticate(acheteur)

    reponse = api_client.post(ORDERS_URL, {}, format="json")

    # 404 et non 400 : le verrou passe avant la validation du corps.
    assert reponse.status_code == 404


def test_emission_de_paiement_refusee_quand_les_achats_sont_fermes(
    api_client, acheteur, achats_fermes,
):
    api_client.force_authenticate(acheteur)

    reponse = api_client.post(PAY_URL, {}, format="json")

    assert reponse.status_code == 404


# ── Comptes de test : ils doivent passer (tache D23) ─────────────────────────

def test_un_compte_de_test_franchit_le_verrou(
    api_client, acheteur, achats_fermes, settings,
):
    settings.PURCHASES_TEST_USERNAMES = ["acheteur_vitrine"]
    api_client.force_authenticate(acheteur)

    reponse = api_client.post(ORDERS_URL, {}, format="json")

    # 400 (corps vide invalide) prouve que le verrou a laisse passer.
    assert reponse.status_code == 400


def test_un_compte_non_liste_reste_bloque(
    api_client, acheteur, achats_fermes, settings,
):
    settings.PURCHASES_TEST_USERNAMES = ["un_autre_compte"]
    api_client.force_authenticate(acheteur)

    assert api_client.post(ORDERS_URL, {}, format="json").status_code == 404


# ── Achats ouverts : le verrou ne gene rien ──────────────────────────────────

def test_verrou_transparent_quand_les_achats_sont_ouverts(
    api_client, acheteur, achats_ouverts,
):
    api_client.force_authenticate(acheteur)

    reponse = api_client.post(ORDERS_URL, {}, format="json")

    # 400 : on atteint la validation, le verrou ne gene plus.
    assert reponse.status_code == 400
    assert "cart_items" in reponse.data


def test_sans_interrupteur_en_base_les_achats_sont_fermes(api_client, acheteur):
    """
    Le choix de conception : FF-ACHAT n'est pas declare dans
    interrupteurs.json, donc toute base neuve demarre fermee. Aucun geste a
    oublier pour mettre la vitrine en ligne sans risque.
    """
    api_client.force_authenticate(acheteur)

    assert api_client.post(ORDERS_URL, {}, format="json").status_code == 404


def test_rouvrir_depuis_l_administration_suffit(api_client, acheteur, achats_fermes):
    """Le geste reel du jour du lancement : basculer la case dans l'admin."""
    api_client.force_authenticate(acheteur)
    assert api_client.post(ORDERS_URL, {}, format="json").status_code == 404

    _regler_achats(True)

    # Sans redemarrage ni redeploiement : le cache est invalide au save.
    assert api_client.post(ORDERS_URL, {}, format="json").status_code == 400


# ── La regle elle-meme ───────────────────────────────────────────────────────

def test_un_anonyme_ne_franchit_jamais_le_verrou(achats_fermes):
    from django.contrib.auth.models import AnonymousUser

    assert purchases_open_for(AnonymousUser()) is False


def test_la_regle_refuse_un_utilisateur_ordinaire(acheteur, achats_fermes):
    assert purchases_open_for(acheteur) is False


def test_la_regle_accepte_quand_l_interrupteur_est_ouvert(acheteur, achats_ouverts):
    assert purchases_open_for(acheteur) is True


# ── Simulation de paiement en administration (tache D2) ──────────────────────
# L'action faisait passer une commande a PAYEE sans qu'un franc ne bouge.

def _actions_admin_paiements(rf, staff):
    from django.contrib import admin as django_admin

    from apps.payments.models import PaymentTransaction

    requete = rf.get("/django-admin/")
    requete.user = staff
    return django_admin.site._registry[PaymentTransaction].get_actions(requete)


@pytest.fixture
def staff(django_user_model):
    return django_user_model.objects.create_user(
        username="staff_vitrine",
        email="staff.vitrine@example.com",
        password="Vitrine-pass-2026",
        is_staff=True,
        is_superuser=True,
    )


def test_simulation_de_paiement_retiree_hors_developpement(rf, staff, settings):
    settings.DEBUG = False
    assert "simulate_success" not in _actions_admin_paiements(rf, staff)


def test_simulation_de_paiement_disponible_en_developpement(rf, staff, settings):
    settings.DEBUG = True
    assert "simulate_success" in _actions_admin_paiements(rf, staff)


def test_le_marquage_en_echec_reste_disponible(rf, staff, settings):
    # On ne retire que la simulation : marquer un paiement en echec reste un
    # geste de support legitime en production.
    settings.DEBUG = False
    assert "mark_failed" in _actions_admin_paiements(rf, staff)
