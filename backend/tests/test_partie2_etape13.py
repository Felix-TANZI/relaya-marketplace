# Partie 2 du rapport final, étape 13 : paiement des entreprises de livraison selon leur grille (A10, R53, R43.1).
# Décision du porteur (27/10/2026) : la grille remplace la part de 70 % du transport.

from datetime import date, timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from apps.accounts.models import DeliveryOrganizationProfile
from apps.shipping import remuneration
from apps.shipping.models import GrilleAchat, LigneGrille, PrestationEntreprise, Shipment
from tests.test_preuves_et_codes import _colis, _referentiel  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


def _entreprise_du_colis(colis, lignes):
    org = DeliveryOrganizationProfile.objects.create(
        user=User.objects.create_user(username=f"ent{colis.pk}", password="p"), company_name="Rapide", phone="1",
        city="YAOUNDE", zones=["Yaoundé"], status=DeliveryOrganizationProfile.Status.APPROVED, is_active=True)
    colis.courier.delivery_organization = org
    colis.courier.save(update_fields=["delivery_organization"])
    g = GrilleAchat.objects.create(organisation=org, signee_le=date(2026, 9, 1), annoncee_le=date(2026, 9, 1),
                                   entree_en_vigueur=date(2026, 10, 1))
    for n, (type_, param, tarif) in enumerate(lignes, start=1):
        LigneGrille.objects.create(grille=g, numero=n, prestation=f"{type_} {param}", type=type_, param=param, tarif=tarif)
    return org


def test_la_course_faite_est_due_au_tarif_de_la_grille():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    niveau = (colis.order.frais_detail or {}).get("niv_course") or "centre"
    org = _entreprise_du_colis(colis, [("DOMICILE", niveau, 1000), ("INCIDENT", "absence", 300)])
    remuneration.course_a_domicile(colis)
    remuneration.course_a_domicile(colis)                                                   # idempotent
    p = PrestationEntreprise.objects.get(organisation=org, nature="DOMICILE")
    assert (p.tarif, p.montant, p.note) == (1000, 1000, "")                                 # R53
    remuneration.incident(colis, "absence")
    assert PrestationEntreprise.objects.get(nature="INCIDENT").montant == 300               # R53.3


def test_une_ligne_bloquee_n_est_pas_payee():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    niveau = (colis.order.frais_detail or {}).get("niv_course") or "centre"
    _entreprise_du_colis(colis, [("DOMICILE", niveau, 9000)])                                # au-dessus du plafond
    remuneration.course_a_domicile(colis)
    p = PrestationEntreprise.objects.get(nature="DOMICILE")
    assert p.montant == 0 and "R54.3" in p.note


def test_versement_du_vendredi_des_prestations_de_la_semaine():
    from django.core.management import call_command

    from apps.payments.bridge.actors import payee_for_delivery_company
    from apps.payments.settlements.models import Adjustment

    call_command("seed_chart_of_accounts", stdout=open("/dev/null", "w"))
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    niveau = (colis.order.frais_detail or {}).get("niv_course") or "centre"
    org = _entreprise_du_colis(colis, [("DOMICILE", niveau, 1000), ("INCIDENT", "refus", 500)])
    remuneration.course_a_domicile(colis)
    remuneration.incident(colis, "refus")
    fin = timezone.now() + timedelta(hours=1)
    assert remuneration.preparer_entreprises(fin - timedelta(days=7), fin) == 1
    a = Adjustment.objects.get(payee=payee_for_delivery_company(org), source_contract="spec-v2.1#R53")
    assert a.amount_xaf == 1500 and a.direction == Adjustment.Direction.DEBIT               # BelivaY doit
    assert not PrestationEntreprise.objects.filter(versee_semaine="").exists()
    assert remuneration.preparer_entreprises(fin - timedelta(days=7), fin) == 0              # jamais deux fois


def test_plus_de_part_du_transport_a_l_entreprise():
    from apps.payments.bridge import signals
    from apps.payments.escrow.models import EscrowHold

    colis = _colis(False, Shipment.Status.ASSIGNED)
    _entreprise_du_colis(colis, [])
    signals._signaler_transporteur(colis)
    assert not EscrowHold.objects.filter(component="TRANSPORT", payee__payee_type="DELIVERY_COMPANY").exists()
