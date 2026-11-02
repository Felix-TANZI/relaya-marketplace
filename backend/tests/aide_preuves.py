# Aide des tests : R66.3 impose une photo à chaque changement de main, vérifiée par le serveur (étape 18). Les tests
# dont le sujet est ailleurs (codes, garde, WhatsApp…) déposent ici la photo de l'étape avant d'agir, comme le font
# les applications.

import hashlib

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile

PNG = b"\x89PNG\r\n\x1a\n-photo-de-test"


def photo(shipment, stage, user=None):
    from apps.shipping.models import ShipmentEvidence

    auteur = user or User.objects.get_or_create(username="photographe-test")[0]
    contenu = PNG + str(stage).encode() + str(shipment.pk).encode()
    return ShipmentEvidence.objects.create(
        shipment=shipment, stage=stage, uploaded_by=auteur, actor_role="TEST",
        file=SimpleUploadedFile(f"{stage}.png", contenu, content_type="image/png"),
        sha256=hashlib.sha256(contenu).hexdigest())


def photos(shipment, *stages):
    for stage in stages:
        photo(shipment, stage)
