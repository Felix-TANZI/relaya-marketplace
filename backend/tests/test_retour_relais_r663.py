# Revue du 1er novembre 2026 — R66.3, P1 : un colis ne sort plus du relais en retour (vers le vendeur ou BelivaY) sans
# sa photo ; la sortie entre dans la chaîne de garde et dans le journal d'audit, comme les autres changements de main.
# Chaque test échoue avant la correction et passe après.

import base64

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.common.models import AuditLog
from apps.shipping.models import RelayParcel, ShipmentEvidence
from apps.shipping.preuves import chaine_de_garde
from tests.test_livraison_publication import _colis_au_relais, _referentiel  # noqa: F401  (fixture)
from tests.test_securite_etape15 import _gerant

pytestmark = pytest.mark.django_db

URL = "/api/shipping/relay-point/return/"
PNG_1PX = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")


def _photo_de_sortie(c, parcel):
    return c.post("/api/shipping/relay-point/evidence/", {
        "parcel_id": parcel.pk, "stage": "RELAY_RETURNED",
        "file": SimpleUploadedFile("sortie.png", PNG_1PX, content_type="image/png"),
    }, format="multipart")


def test_le_retour_sans_photo_est_refuse():
    parcel = _colis_au_relais()
    c = _gerant(parcel)
    r = c.post(URL, {"parcel_id": parcel.pk, "destination": "VENDOR"}, format="json")
    assert r.status_code == 400 and "photo" in r.json()
    parcel.refresh_from_db()
    assert parcel.status == RelayParcel.Status.RECEIVED and parcel.returned_at is None


def test_le_retour_avec_photo_passe_et_laisse_sa_trace():
    parcel = _colis_au_relais()
    c = _gerant(parcel)
    assert _photo_de_sortie(c, parcel).status_code == 201                      # l'application l'envoie d'abord
    r = c.post(URL, {"parcel_id": parcel.pk, "destination": "VENDOR"}, format="json")
    assert r.status_code == 200, r.content
    parcel.refresh_from_db()
    assert parcel.status == RelayParcel.Status.RETURNED_TO_VENDOR

    etape = next(e for e in chaine_de_garde(parcel.shipment)["etapes"]
                 if e["etape"] == ShipmentEvidence.Stage.RELAY_RETURNED)
    assert etape["franchie"] and etape["preuve"]                               # chaîne de garde
    trace = AuditLog.objects.get(object_id=str(parcel.pk), object_repr__startswith="Retour depuis le relais")
    assert trace.actor == parcel.relay_point.user and trace.changes["destination"] == "VENDOR"


def test_un_colis_deja_remis_au_client_ne_sort_pas_en_retour():
    from tests.aide_preuves import photo

    parcel = _colis_au_relais()
    c = _gerant(parcel)
    RelayParcel.objects.filter(pk=parcel.pk).update(status=RelayParcel.Status.PICKED_UP)
    photo(parcel.shipment, ShipmentEvidence.Stage.RELAY_RETURNED)
    r = c.post(URL, {"parcel_id": parcel.pk, "destination": "BELIVAY"}, format="json")
    assert r.status_code == 400
    parcel.refresh_from_db()
    assert parcel.status == RelayParcel.Status.PICKED_UP
