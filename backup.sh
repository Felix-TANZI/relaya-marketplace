#!/bin/bash
# Sauvegarde automatique de la base PostgreSQL de production.
# Lancé quotidiennement par cron (voir SETUP-CD.md pour l'installation).
set -e

PROJECT_DIR="/var/www/belivay"
BACKUP_DIR="/var/backups/belivay"
RETENTION_DAYS=14

cd "$PROJECT_DIR"

# Extrait uniquement les 2 valeurs nécessaires, sans exécuter le fichier
# comme un script bash (certaines valeurs de .env.prod contiennent des
# espaces ou des caractères spéciaux qui casseraient un `source`).
POSTGRES_USER=$(grep -m1 '^POSTGRES_USER=' .env.prod | cut -d'=' -f2-)
POSTGRES_DB=$(grep -m1 '^POSTGRES_DB=' .env.prod | cut -d'=' -f2-)

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="belivay_${TIMESTAMP}.sql.gz"

docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/$FILENAME"

chmod 600 "$BACKUP_DIR/$FILENAME"

# Rotation : supprime les sauvegardes de plus de RETENTION_DAYS jours
find "$BACKUP_DIR" -name "belivay_*.sql.gz" -mtime +$RETENTION_DAYS -delete

SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "$(date '+%Y-%m-%d %H:%M:%S') - Sauvegarde terminee : $FILENAME ($SIZE)" >> "$BACKUP_DIR/backup.log"