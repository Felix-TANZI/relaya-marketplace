# Grille d'achat des entreprises et plafond d'achat (BV-DEV-05, A10) : apps/shipping/grille.py.

from datetime import date

import pytest
from django.contrib.auth.models import User

from apps.accounts.models import DeliveryOrganizationProfile
from apps.regles import services as regles
from apps.regles.reference import donnees_reference
from apps.shipping.grille import plafond
from apps.shipping.models import GrilleAchat, LigneGrille

pytestmark = pytest.mark.django_db
DERIVES = donnees_reference()["derives"]["plafonds"]


@pytest.fixture(autouse=True)
def _cache():
    regles.cache.delete(regles.CLE_CACHE)


def test_les_plafonds_de_controle_de_la_spec():
    for f, v in DERIVES["relais"].items():
        assert plafond("RELAIS", f) == v
    for niv, v in DERIVES["domicile_course_simple"].items():
        assert plafond("DOMICILE", niv) == v
    for niv, v in DERIVES["xl"].items():
        assert plafond("XL", niv) == v
    for f, v in DERIVES["supplement_carton"].items():
        assert plafond("SUPPLEMENT_FORMAT", f) == v
    assert plafond("KM") == DERIVES["par_km"]
    assert (plafond("BOUTIQUE_EN_PLUS", "meme_zone"), plafond("BOUTIQUE_EN_PLUS", "autre_zone")) == (450, 900)
    assert (plafond("RETOUR"), plafond("TRANSFERT"), plafond("AGENCE_RELAIS")) == (450, 360, 590)


def _grille():
    u = User.objects.create_user(username="wink", password="p")
    org = DeliveryOrganizationProfile.objects.create(user=u, company_name="Wink Express", phone="1", city="YAOUNDE")
    return GrilleAchat.objects.create(organisation=org, signee_le=date(2026, 9, 25), annoncee_le=date(2026, 9, 25),
                                      entree_en_vigueur=date(2026, 10, 25))


def test_la_grille_de_reference_wink_est_controlee():
    g = _grille()
    lignes = [
        (1, "Domicile Z3-Z6-Z7", "DOMICILE", "centre", False, 1000, "conforme"),
        (4, "Domicile périphérie", "DOMICILE", "peripherie", False, 1500, "conforme"),
        (5, "Relais pochette, 1 à 4 colis", "RELAIS", "P", True, 600, "exception_r86"),     # R86
        (6, "Relais pochette, 5 à 9 colis", "RELAIS", "P", False, 450, "conforme"),
        (8, "Tournée d'une autre zone", "AUTRE_ZONE_TOURNEE", "P", False, 30, "conforme"),   # R55.1
        (9, "Supplément C2", "SUPPLEMENT_FORMAT", "C2", False, 300, "conforme"),
        (20, "Domicile trop cher", "DOMICILE", "centre", False, 1400, "bloquee"),             # R54.3
        (21, "Autre zone à +100 F", "AUTRE_ZONE_TOURNEE", "P", False, 100, "bloquee"),        # R55.1
    ]
    for n, nom, t, param, petit, tarif, attendu in lignes:
        ligne = LigneGrille.objects.create(grille=g, numero=n, prestation=nom, type=t, param=param, petit_paquet=petit, tarif=tarif)
        assert ligne.controle == attendu, (nom, ligne.controle_note)


def test_preavis_de_la_grille():
    from django.core.exceptions import ValidationError

    g = _grille()
    g.entree_en_vigueur = date(2026, 10, 1)                 # 6 jours après l'annonce
    with pytest.raises(ValidationError):
        g.full_clean()                                       # R61.1
