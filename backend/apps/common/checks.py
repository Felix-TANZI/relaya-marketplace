# backend/apps/common/checks.py
# DEV-SRV-01, règle R8 : « Pièces d'identité et documents sur Cloudflare R2, jamais sur un disque de serveur ».
# Sans R2, la production refuse chaque pièce (apps.common.storage.PiecesConfidentiellesStorage) : `check --deploy`
# le dit avant chaque démarrage, plutôt que de le laisser découvrir par un vendeur sur le terrain.

from django.conf import settings
from django.core import checks


@checks.register(checks.Tags.security, deploy=True)
def pieces_sur_r2(app_configs=None, **kwargs):
    if not getattr(settings, "BELIVAY_PRODUCTION", False) or settings.R2_STORAGE_ENABLED:
        return []
    # Avertissement et non erreur : le reste du site (catalogue, commandes) doit pouvoir démarrer.
    return [checks.Warning(
        "R2 n'est pas configuré : les pièces d'identité et documents de boutique seront refusés (R8 interdit le disque).",
        hint="Renseigner USE_R2_STORAGE=1 et AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_STORAGE_BUCKET_NAME, "
             "AWS_S3_ENDPOINT_URL dans l'environnement GitHub du déploiement.",
        id="common.W008")]
