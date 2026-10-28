# Heure promise et échéance du vendeur (BV-DEV-01, A3) : apps/orders/delais.py, sur de vraies dates.

from datetime import date, datetime, timedelta
from fractions import Fraction

import pytest
from django.utils import timezone

from apps.orders import delais
from apps.regles import services as regles
from apps.regles.reference import donnees_reference

pytestmark = pytest.mark.django_db

LUNDI = date(2026, 10, 19)


@pytest.fixture(autouse=True)
def _cache():
    regles.cache.delete(regles.CLE_CACHE)


def _instant(jour_semaine: str, heure) -> datetime:
    jour = LUNDI + timedelta(days=delais.JOURS.index(jour_semaine))
    minutes = round(Fraction(str(heure)) * 60)
    return timezone.make_aware(datetime(jour.year, jour.month, jour.day, int(minutes // 60), int(minutes % 60)))


def _relatif(dt: datetime, paye_le: datetime) -> tuple:
    dt = timezone.localtime(dt)
    return (dt.date() - timezone.localtime(paye_le).date()).days, float(delais._decimale(dt))


@pytest.mark.parametrize("cas", donnees_reference()["tests"]["promesse"], ids=lambda c: c["id"])
def test_les_tests_promesse_de_la_spec(cas):
    paye_le = _instant(cas["jour"], cas["heure"])
    r = delais.pret_et_echeance(paye_le, cas["delai_h"])
    p = delais.promesse(r["pret"], cas["mode"])
    a = cas["attendu"]
    assert _relatif(r["pret"], paye_le) == (a["pret"]["jours_apres_paiement"], a["pret"]["heure"])
    assert delais.JOURS[timezone.localtime(r["pret"]).weekday()] == a["pret"]["jour"]
    assert _relatif(p, paye_le) == (a["promesse"]["jours_apres_paiement"], a["promesse"]["heure"])
    assert delais.texte(p, paye_le, cas["mode"]) == a["texte"]
    assert _relatif(r["echeance"], paye_le) == (a["echeance"]["jours_apres_paiement"], a["echeance"]["heure"])


def test_une_fermeture_de_la_boutique_decale_le_pret():
    # Lundi 9 h, 4 h ouvrées : prête à 13 h ; boutique fermée le lundi (closed_days) : mardi 12 h.
    cal = delais.Calendrier(ferme=lambda jour: jour.weekday() == 0)
    paye_le = _instant("lundi", 9)
    pret = cal.ajouter_heures_ouvrees(cal.prochaine_heure_ouvree(paye_le), 4)
    assert _relatif(pret, paye_le) == (1, 12.0)


def test_fermetures_reelles_d_une_boutique(django_user_model):
    from apps.vendors.models import ShopClosure, VendorProfile

    u = django_user_model.objects.create_user(username="v-delais", password="p")
    profil = VendorProfile.objects.create(user=u, business_name="b", phone="1", address="x", city="Yaoundé",
                                          closed_days=[1])                          # fermée le mardi
    ShopClosure.objects.create(vendor=profil, start_date=LUNDI + timedelta(days=2), end_date=LUNDI + timedelta(days=2))
    paye_le = _instant("lundi", 17)                                                  # 1 h ce lundi, reste 3 h
    r = delais.pret_et_echeance(paye_le, 4, u)
    assert _relatif(r["pret"], paye_le) == (3, 11.0)                                 # mardi et mercredi fermés : jeudi 11 h


def test_promesse_de_la_commande_part_du_dernier_colis_pret(django_user_model):
    from apps.vendors.models import VendorProfile

    a = django_user_model.objects.create_user(username="v-a", password="p")
    b = django_user_model.objects.create_user(username="v-b", password="p")
    for u, fermes in ((a, []), (b, [0])):
        VendorProfile.objects.create(user=u, business_name=u.username, phone="1", address="x", city="Yaoundé",
                                     closed_days=fermes)
    paye_le = _instant("lundi", 8)
    r = delais.promesse_commande(paye_le, "domicile", [a, b])
    assert _relatif(r["pret"], paye_le) == (1, 12.0)                                 # la boutique b ouvre mardi
    assert r["texte"] == "Livré demain avant 17 h"


def test_le_paiement_fige_la_promesse_et_les_echeances():
    from apps.shipping import zones
    from apps.shipping.models import Shipment
    from tests.test_commission_v21 import commander
    from tests.test_frais_v21 import boutique, offre

    zones.synchroniser_zones()
    o = commander([(offre(boutique(), 14000), 1)])
    o.confirm_payment()
    o.refresh_from_db()
    colis = Shipment.objects.get(order=o)
    assert o.promesse_at and o.promesse_texte.startswith("Disponible au relais")      # R45.6
    assert colis.pret_prevu == o.prep_deadline and colis.echeance_vendeur >= colis.pret_prevu   # R44.2
