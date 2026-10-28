# backend/apps/accounts/compliance.py
# Dépôt d'une pièce justificative (relais, entreprise de livraison, vendeur), au même endroit pour tous les écrans.
#
# Feuille de route D19 : « Recevoir la CNI recto et verso et le selfie vidéo, les stocker en accès restreint ». Un seul
# stockage, ComplianceDocument : c'est lui que lit le verrou de publication et de versement (apps.vendors.kyc), et
# nginx refuse /media/compliance/ (lecture seulement par ComplianceDocumentFileView).

import os

from .models import ComplianceDocument

#: Un selfie vidéo ne tient pas dans les formats d'une pièce scannée, ni dans 10 Mo (D19) : deux jeux de règles.
FORMATS_IMAGE = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
FORMATS_VIDEO = {".mp4", ".mov", ".webm", ".m4v", ".3gp"}
TAILLE_MAX_IMAGE = 10 * 1024 * 1024
TAILLE_MAX_VIDEO = 50 * 1024 * 1024


class FichierRefuse(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def deposer_piece(user, owner_role: str, document_type: str, fichier) -> tuple[ComplianceDocument, bool]:
    """Enregistre (ou remplace) la pièce ; une pièce redéposée repasse en attente d'examen."""
    extension = os.path.splitext(getattr(fichier, "name", "") or "")[1].lower()
    est_video = extension in FORMATS_VIDEO
    if extension not in FORMATS_IMAGE and not est_video:
        raise FichierRefuse("Formats acceptés : PDF, JPG, PNG, WEBP, ou MP4, MOV, WEBM, 3GP pour un selfie vidéo.")
    taille_max = TAILLE_MAX_VIDEO if est_video else TAILLE_MAX_IMAGE
    if fichier.size > taille_max:
        raise FichierRefuse(f"Le fichier ne doit pas dépasser {taille_max // (1024 * 1024)} Mo.")

    document, cree = ComplianceDocument.objects.get_or_create(
        user=user, owner_role=owner_role, document_type=document_type[:60], defaults={"file": fichier},
    )
    if not cree:
        ancien = document.file
        document.file = fichier
        document.status = ComplianceDocument.Status.PENDING
        document.review_note = ""
        document.save(update_fields=["file", "status", "review_note", "updated_at"])
        if ancien and ancien.name != document.file.name:
            ancien.delete(save=False)
    return document, cree
