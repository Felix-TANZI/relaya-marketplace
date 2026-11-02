# Revue du 29 octobre 2026 — groupe D (P2). Chaque test échoue avant sa correction et passe après.

import json

import pytest
from django.core.cache import cache

from apps.shipping.models import RelayPickupAttempt
from apps.shipping.serializers import RelayParcelPickupSerializer
from tests.test_livraison_publication import _colis_au_relais, _referentiel  # noqa: F401  (fixture)
from tests.test_securite_etape15 import _gerant, _verifier

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _cache_vide():
    cache.clear()
    yield
    cache.clear()


def _ref(parcel):
    return f"BVY-{parcel.shipment.order_id}-{parcel.shipment_id}"


def _qr(parcel, depot_code=None):
    """Le jeton du QR du colis, celui que montre l'application du livreur : {shipment_id, depot_code}."""
    code = parcel.shipment.ensure_depot_code() if depot_code is None else depot_code
    return json.dumps({"shipment_id": parcel.shipment_id, "depot_code": code})


# ── D1 · R66.2 : le colis se désigne par son QR, ou par sa référence tapée (tracée) ──────────────────────────

def test_d1_l_identifiant_interne_n_est_plus_accepte():
    parcel = _colis_au_relais("482913")
    c = _gerant(parcel)
    r = _verifier(c, "482913", parcel_id=parcel.pk)
    assert r.status_code == 400 and "colis" in r.json()
    r = _verifier(c, "482913", colis=str(parcel.shipment_id))                 # le numéro seul non plus
    assert r.status_code == 400 and "colis" in r.json()
    assert not RelayPickupAttempt.objects.exists()


def test_d1_le_qr_doit_porter_le_code_de_depot_du_colis():
    parcel = _colis_au_relais("482913")
    c = _gerant(parcel)
    r = _verifier(c, "482913", colis=_qr(parcel, depot_code="faux"))
    assert r.status_code == 400 and "colis" in r.json()
    r = _verifier(c, "482913", colis=_qr(parcel))
    assert r.status_code == 200 and r.json()["locked"] is False
    assert RelayPickupAttempt.objects.get().saisie_manuelle is False


def test_d1_la_reference_tapee_est_tracee_comme_saisie_manuelle():
    parcel = _colis_au_relais("482913")
    r = _verifier(_gerant(parcel), "482913", colis=_ref(parcel))
    assert r.status_code == 200
    assert RelayPickupAttempt.objects.get().saisie_manuelle is True


# ── D2 · WhatsApp : erreurs lues par leur code ; un seul passage par le compteur d'essais ────────────────────

def test_d2_les_refus_du_retrait_portent_un_code_dedie():
    parcel = _colis_au_relais("482913")
    _gerant(parcel)
    s = RelayParcelPickupSerializer(data={"colis": _ref(parcel), "pickup_code": "000000"},
                                    context={"relay_point": parcel.relay_point})
    assert s.is_valid(), s.errors
    with pytest.raises(Exception) as erreur:
        s.save()
    assert erreur.value.get_codes() == {"pickup_code": "code_faux"}


def test_d2_whatsapp_une_remise_ne_passe_qu_une_fois_par_le_compteur():
    from apps.whatsapp_assistant.bridge import relay as pont
    from tests.aide_preuves import photo

    parcel = _colis_au_relais("482913")
    _gerant(parcel)
    resultat, _ = pont.hand_over(f"{_ref(parcel)} 000000", parcel.relay_point_id)
    assert resultat == pont.ActionResult.BAD_CODE
    assert RelayPickupAttempt.objects.filter(success=False).count() == 1
    photo(parcel.shipment, "RELAY_RELEASED")  # R66.3
    resultat, _ = pont.hand_over(f"{_ref(parcel)} 482913", parcel.relay_point_id)
    assert resultat == pont.ActionResult.DONE
    assert RelayPickupAttempt.objects.filter(success=True).count() == 1          # avant : contrôle + remise = 2


def test_d2_whatsapp_reconnait_la_photo_par_son_code_et_non_son_texte(monkeypatch):
    from rest_framework import serializers

    from apps.shipping import preuves
    from apps.whatsapp_assistant.bridge import relay as pont

    def photo_exigee(*args, **kwargs):
        raise serializers.ValidationError({"photo": "Texte reformulé"}, code="photo_obligatoire")

    monkeypatch.setattr(preuves, "exiger_photo", photo_exigee)
    parcel = _colis_au_relais("482913")
    _gerant(parcel)
    resultat, refs = pont.hand_over(f"{_ref(parcel)} 482913", parcel.relay_point_id)
    assert resultat == pont.ActionResult.NEEDS_PHOTO and refs == [_ref(parcel)]

