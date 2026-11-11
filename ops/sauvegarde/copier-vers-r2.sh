#!/bin/bash
# Copie chiffrée d'une sauvegarde de la base vers Cloudflare R2 — DEV-SRV-01, T06-2 :
# « Programmer chaque nuit un export complet de la base vers un espace Cloudflare R2 dédié, conservé 30 jours. »
#
# Appelé par backup.sh juste après une sauvegarde locale vérifiée :
#   ops/sauvegarde/copier-vers-r2.sh /var/backups/belivay/belivay_AAAAMMJJ_HHMMSS.sql.gz
#
# - L'export est chiffré AVANT de quitter le serveur, avec la clé publique age (BACKUP_AGE_RECIPIENT) : la clé
#   privée, seule capable de le relire, n'est ni sur le serveur ni sur R2 (décision du porteur du 2026-11-08).
# - Accès propres aux sauvegardes (BACKUP_R2_*), distincts de ceux des photos et des pièces (AWS_*).
# - La taille sur R2 est vérifiée après l'envoi ; les copies de plus de BACKUP_R2_RETENTION_JOURS (30) sont
#   effacées. Une règle de cycle de vie du bucket dans Cloudflare fait la même chose, en filet de sécurité.
#
# Codes de sortie : 0 copié ; 3 non configuré (BACKUP_R2_BUCKET vide) ; autre = échec.
set -euo pipefail

SAUVEGARDE="${1:?Chemin de la sauvegarde .sql.gz attendu}"
PROJECT_DIR="${PROJECT_DIR:-/var/www/belivay}"
IMAGE="belivay-sauvegarde:1"

cd "$PROJECT_DIR"

# Même lecture que backup.sh : une valeur à la fois, sans exécuter .env.prod.
valeur() { grep -m1 "^$1=" .env.prod 2>/dev/null | cut -d'=' -f2- || true; }

BUCKET="$(valeur BACKUP_R2_BUCKET)"
if [ -z "$BUCKET" ]; then
  echo "Copie R2 non configurée : BACKUP_R2_BUCKET est vide." >&2
  exit 3
fi
DESTINATAIRE="$(valeur BACKUP_AGE_RECIPIENT)"
if [ -z "$DESTINATAIRE" ]; then
  echo "BACKUP_AGE_RECIPIENT est vide : une sauvegarde ne part jamais en clair, rien n'est envoyé." >&2
  exit 1
fi
FOURNISSEUR="$(valeur BACKUP_R2_PROVIDER)"
RETENTION="$(valeur BACKUP_R2_RETENTION_JOURS)"

docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -q -t "$IMAGE" "$PROJECT_DIR/ops/sauvegarde" >/dev/null

docker run --rm \
  -v "$(dirname "$SAUVEGARDE")":/sauvegardes:ro \
  -e SOURCE="$(basename "$SAUVEGARDE")" \
  -e DESTINATAIRE="$DESTINATAIRE" \
  -e BUCKET="$BUCKET" \
  -e RETENTION="${RETENTION:-30}" \
  -e RCLONE_CONFIG_R2_TYPE=s3 \
  -e RCLONE_CONFIG_R2_PROVIDER="${FOURNISSEUR:-Cloudflare}" \
  -e RCLONE_CONFIG_R2_ACCESS_KEY_ID="$(valeur BACKUP_R2_ACCESS_KEY_ID)" \
  -e RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$(valeur BACKUP_R2_SECRET_ACCESS_KEY)" \
  -e RCLONE_CONFIG_R2_ENDPOINT="$(valeur BACKUP_R2_ENDPOINT)" \
  -e RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true \
  --entrypoint sh "$IMAGE" -c '
    set -eu
    NOM="$SOURCE.age"
    age -r "$DESTINATAIRE" -o "/tmp/$NOM" "/sauvegardes/$SOURCE"
    rclone copyto "/tmp/$NOM" "r2:$BUCKET/$NOM"
    ICI=$(stat -c %s "/tmp/$NOM")
    LA_BAS=$(rclone lsf --format s "r2:$BUCKET/$NOM")
    if [ "$ICI" != "$LA_BAS" ]; then
      echo "Taille différente sur R2 ($LA_BAS octets au lieu de $ICI) : copie à refaire." >&2
      exit 1
    fi
    rclone delete "r2:$BUCKET" --min-age "${RETENTION}d" --include "belivay_*.sql.gz.age"
    echo "Copie chiffrée sur R2 : $NOM ($ICI octets)"
  '
