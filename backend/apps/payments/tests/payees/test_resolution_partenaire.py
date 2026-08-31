# backend/apps/payments/tests/payees/test_resolution_partenaire.py
# Resolution d'un utilisateur vers son compte financier partenaire.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE FICHIER EXISTE A CAUSE D'UN BUG SILENCIEUX
#
# `bridge/actors.py` cherchait `user.delivery_organization`. Le vrai
# related_name est `delivery_organization_profile` — `delivery_organization`
# est la cle etrangere de CourierProfile vers l'organisation, un objet
# DIFFERENT.
#
# Consequence : AUCUNE entreprise de livraison n'aurait jamais ete resolue.
# Son espace partenaire aurait repondu « cet espace ne vous concerne pas »,
# et son montant du serait reste invisible.
#
# Le bug ne levait AUCUNE erreur : getattr avec un defaut retourne None.
# C'est le genre de defaut qu'aucun test ne trouve tant qu'on ne teste pas
# le cas precis.
# ─────────────────────────────────────────────────────────────────────────────

import pytest
from django.contrib.auth.models import User

from apps.accounts.models import DeliveryOrganizationProfile, RelayPointProfile
from apps.payments.bridge.actors import (
    has_partner_profile, partner_payee_for_user, payee_for_delivery_company,
    payee_for_relay_point, payee_for_vendor,
)
from apps.payments.payees.models import PayeeType
from apps.vendors.models import VendorProfile

pytestmark = pytest.mark.django_db


@pytest.fixture
def gestionnaire():
    return User.objects.create_user("gestionnaire", "g@b.cm", "x")


@pytest.fixture
def organisation(gestionnaire):
    return DeliveryOrganizationProfile.objects.create(
        user=gestionnaire, company_name="Express Douala",
        phone="237699000111", city="Douala")


class TestEntrepriseDeLivraison:

    def test_l_accesseur_inverse_est_le_bon(self, gestionnaire, organisation):
        """
        LE test qui verrouille le bug.

        `delivery_organization_profile` est l'accesseur inverse depuis un
        User. `delivery_organization` designe autre chose : la cle etrangere
        de CourierProfile vers l'organisation.
        """
        gestionnaire.refresh_from_db()
        assert getattr(gestionnaire, "delivery_organization_profile", None) is not None
        assert getattr(gestionnaire, "delivery_organization", None) is None

    def test_le_gestionnaire_est_reconnu_comme_partenaire(
        self, gestionnaire, organisation,
    ):
        assert has_partner_profile(gestionnaire) is True

    def test_son_compte_financier_est_resolu(self, gestionnaire, organisation):
        payee_for_delivery_company(organisation, create=True)
        gestionnaire.refresh_from_db()

        compte = partner_payee_for_user(gestionnaire)
        assert compte is not None
        assert compte.payee_type == PayeeType.DELIVERY_COMPANY

    def test_sans_activite_il_reste_un_partenaire(
        self, gestionnaire, organisation,
    ):
        """
        Il n'a pas encore de compte financier, mais son espace doit lui
        montrer un etat vide plutot qu'un refus d'acces.
        """
        assert has_partner_profile(gestionnaire) is True
        assert partner_payee_for_user(gestionnaire) is None


class TestVendeur:

    def test_le_vendeur_est_resolu(self):
        utilisateur = User.objects.create_user("vendeur", "v@b.cm", "x")
        profil = VendorProfile.objects.create(
            user=utilisateur, business_name="Boutique")
        assert has_partner_profile(utilisateur) is True

        payee_for_vendor(profil, create=True)
        compte = partner_payee_for_user(utilisateur)
        assert compte.payee_type == PayeeType.VENDOR


class TestPointRelais:

    def test_le_point_relais_est_resolu(self):
        utilisateur = User.objects.create_user("relais", "r@b.cm", "x")
        profil = RelayPointProfile.objects.create(
            user=utilisateur, name="Relais Mokolo", city="Yaounde")
        assert has_partner_profile(utilisateur) is True

        payee_for_relay_point(profil, create=True)
        compte = partner_payee_for_user(utilisateur)
        assert compte.payee_type == PayeeType.RELAY_POINT


class TestNonPartenaire:

    def test_un_acheteur_n_est_pas_partenaire(self):
        acheteur = User.objects.create_user("acheteur", "a@b.cm", "x")
        assert has_partner_profile(acheteur) is False
        assert partner_payee_for_user(acheteur) is None

    def test_la_resolution_ne_cree_jamais_de_compte(self):
        """
        Une LECTURE ne doit pas avoir d'effet de bord. Consulter son espace
        ne doit pas creer un compte financier.
        """
        from apps.payments.payees.models import PayeeAccount

        utilisateur = User.objects.create_user("lecteur", "l@b.cm", "x")
        VendorProfile.objects.create(user=utilisateur, business_name="B")
        avant = PayeeAccount.objects.count()

        partner_payee_for_user(utilisateur)
        assert PayeeAccount.objects.count() == avant