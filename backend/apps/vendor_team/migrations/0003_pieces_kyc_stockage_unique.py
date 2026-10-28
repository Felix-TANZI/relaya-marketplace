# Feuille de route D19 et D6 : un seul stockage des pièces d'identité vendeur. Les pièces déjà déposées depuis
# l'espace vendeur (VendorKycPiece) rejoignent ComplianceDocument, que lit le verrou de publication et de versement
# (apps.vendors.kyc), puis l'ancien modèle est retiré.

from django.db import migrations

TYPES = {"recto": "CNI_RECTO", "verso": "CNI_VERSO", "selfie": "SELFIE_VIDEO"}
ETATS = {"verifie": "APPROVED", "refuse": "REJECTED"}


def regrouper(apps, schema_editor):
    VendorKycPiece = apps.get_model("vendor_team", "VendorKycPiece")
    ComplianceDocument = apps.get_model("accounts", "ComplianceDocument")
    for piece in VendorKycPiece.objects.select_related("vendor"):
        type_ = TYPES.get(piece.piece)
        if type_ is None or not piece.image:
            continue
        ComplianceDocument.objects.get_or_create(
            user_id=piece.vendor.user_id, owner_role="VENDOR", document_type=type_,
            defaults={"file": piece.image.name, "status": ETATS.get(piece.etat, "PENDING"),
                      "review_note": piece.motif_refus or ""},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('vendor_team', '0002_codes_un_seul_systeme'),
        ('accounts', '0031_codes_un_seul_systeme'),
    ]

    operations = [
        migrations.RunPython(regrouper, migrations.RunPython.noop),
        migrations.DeleteModel(
            name='VendorKycPiece',
        ),
    ]
