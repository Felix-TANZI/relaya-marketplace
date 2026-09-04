import hashlib

from rest_framework.exceptions import ValidationError

from .models import DisputeEvidence, DisputeEvidenceRequest


ALLOWED_EVIDENCE_TYPES = {
    "image/jpeg": DisputeEvidence.EvidenceType.PHOTO,
    "image/png": DisputeEvidence.EvidenceType.PHOTO,
    "image/webp": DisputeEvidence.EvidenceType.PHOTO,
    "application/pdf": DisputeEvidence.EvidenceType.DOCUMENT,
    "video/mp4": DisputeEvidence.EvidenceType.VIDEO,
}
MAX_EVIDENCE_SIZE = 15 * 1024 * 1024


def validate_evidence_file(upload):
    content_type = (getattr(upload, "content_type", "") or "").lower()
    if content_type not in ALLOWED_EVIDENCE_TYPES:
        raise ValidationError({"files": "Formats acceptés : JPG, PNG, WEBP, PDF et MP4."})
    if upload.size > MAX_EVIDENCE_SIZE:
        raise ValidationError({"files": "Chaque preuve doit peser au maximum 15 Mo."})


# Retention differenciee par moyen de paiement (proposition validee) : 60
# jours suffit pour Mobile Money, mais un chargeback carte peut etre conteste
# jusqu'a 120 jours — on retient donc les preuves plus longtemps pour ce
# moyen de paiement. "CARD" n'existe pas encore dans PaymentTransaction.Provider
# (seuls MTN_MOMO/ORANGE_MONEY sont construits) : ce readiness ne change rien
# tant que le paiement par carte n'est pas livre, et prend le relais des que
# ce provider existera sous ce nom.
CARD_PAYMENT_PROVIDERS = {"CARD"}
CARD_EVIDENCE_RETENTION_DAYS = 180


def _evidence_retention_deadline(dispute):
    from django.utils import timezone as _timezone

    from .models import PlatformSettings

    days = PlatformSettings.get_settings().dispute_evidence_retention_days
    paid_by = (
        dispute.order.payments.filter(status="SUCCESS").values_list("provider", flat=True).first()
        if dispute.order_id else None
    )
    if paid_by in CARD_PAYMENT_PROVIDERS:
        days = CARD_EVIDENCE_RETENTION_DAYS
    return _timezone.now() + _timezone.timedelta(days=days)


def create_evidence(*, dispute, user, upload, uploader_role, description="", evidence_request=None, message=None):
    validate_evidence_file(upload)
    digest = hashlib.sha256()
    for chunk in upload.chunks():
        digest.update(chunk)
    upload.seek(0)
    return DisputeEvidence.objects.create(
        dispute=dispute,
        request=evidence_request,
        message=message,
        uploaded_by=user,
        file=upload,
        evidence_type=ALLOWED_EVIDENCE_TYPES[upload.content_type.lower()],
        uploader_role=uploader_role,
        content_type=upload.content_type,
        size_bytes=upload.size,
        sha256=digest.hexdigest(),
        description=(description or "")[:255],
        retain_until=_evidence_retention_deadline(dispute),
    )


def resolve_dispute_actor(dispute, role):
    role = (role or "").upper()
    if role == DisputeEvidenceRequest.RecipientRole.CLIENT:
        return dispute.opened_by
    if role == DisputeEvidenceRequest.RecipientRole.VENDOR:
        return dispute.vendor

    # Un colis par vendeur : le shipment pertinent est celui du vendeur
    # concerne par ce litige, pas un shipment quelconque de la commande.
    shipment = dispute.order.shipments.filter(vendor_id=dispute.vendor_id).first() if dispute.vendor_id else None
    if shipment is None:
        shipment = dispute.order.shipments.first()
    if not shipment:
        return None
    if role == DisputeEvidenceRequest.RecipientRole.COURIER:
        return shipment.courier.user if shipment.courier_id else None
    if role == DisputeEvidenceRequest.RecipientRole.LOGISTICS:
        courier = shipment.courier
        organization = courier.delivery_organization if courier else None
        return organization.user if organization else None
    if role == DisputeEvidenceRequest.RecipientRole.RELAY_POINT:
        relay_parcel = getattr(shipment, "relay_parcel", None)
        return relay_parcel.relay_point.user if relay_parcel else None
    return None
