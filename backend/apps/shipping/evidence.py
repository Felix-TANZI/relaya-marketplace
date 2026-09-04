# backend/apps/shipping/evidence.py
# Preuves de garde (photo/signature) — capture obligatoire, transmission
# best-effort (regle verrouillee, voir memoire projet "gros morceaux").
#
# Le backend ne sait pas QUAND la photo a ete prise (l'app capture hors-ligne
# et synchronise plus tard) — il sait seulement quand elle arrive. C'est
# volontaire : imposer une fenetre de synchro cote serveur reviendrait a
# recreer cote backend une contrainte reseau que le principe "best-effort"
# interdit precisement.

import hashlib

from rest_framework.exceptions import ValidationError

from .models import ShipmentEvidence

ALLOWED_EVIDENCE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_EVIDENCE_SIZE = 15 * 1024 * 1024


def validate_shipment_evidence_file(upload):
    content_type = (getattr(upload, "content_type", "") or "").lower()
    if content_type not in ALLOWED_EVIDENCE_TYPES:
        raise ValidationError({"file": "Formats acceptés : JPG, PNG, WEBP."})
    if upload.size > MAX_EVIDENCE_SIZE:
        raise ValidationError({"file": "La photo doit peser au maximum 15 Mo."})


def create_shipment_evidence(*, shipment, user, actor_role, stage, upload, description="", order_item=None):
    validate_shipment_evidence_file(upload)
    digest = hashlib.sha256()
    for chunk in upload.chunks():
        digest.update(chunk)
    upload.seek(0)
    return ShipmentEvidence.objects.create(
        shipment=shipment,
        order_item=order_item,
        stage=stage,
        uploaded_by=user,
        actor_role=actor_role,
        file=upload,
        content_type=upload.content_type,
        size_bytes=upload.size,
        sha256=digest.hexdigest(),
        description=(description or "")[:255],
    )
