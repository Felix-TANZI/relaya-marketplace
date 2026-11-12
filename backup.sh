#!/bin/bash
# Sauvegarde automatique de la base PostgreSQL de production.
# Lancé chaque nuit par cron et avant chaque déploiement (deploy.sh).
set -e
# Sans pipefail, l'échec de pg_dump est masqué par gzip : le script pourrait
# produire un fichier vide et annoncer un succès.
set -o pipefail

# Surchargeables par variable d'environnement (utile pour tester le script).
PROJECT_DIR="${PROJECT_DIR:-/var/www/belivay}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/belivay}"
RETENTION_DAYS=14
# Une sauvegarde plus petite que ça est forcément anormale (les vraies font
# plusieurs Mo) : on la considère comme échouée.
MIN_BYTES=102400

cd "$PROJECT_DIR"

# Extrait uniquement les 2 valeurs nécessaires, sans exécuter le fichier
# comme un script bash (certaines valeurs de .env.prod contiennent des
# espaces ou des caractères spéciaux qui casseraient un `source`).
POSTGRES_USER=$(grep -m1 '^POSTGRES_USER=' .env.prod | cut -d'=' -f2-)
POSTGRES_DB=$(grep -m1 '^POSTGRES_DB=' .env.prod | cut -d'=' -f2-)

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FINAL="$BACKUP_DIR/belivay_${TIMESTAMP}.sql.gz"
TMP="$FINAL.partial"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$BACKUP_DIR/backup.log"; }

# En cas d'échec, on supprime le fichier incomplet et on le note dans le log.
# Les sauvegardes précédentes ne sont jamais touchées.
cleanup() {
  code=$?
  if [ "$code" -ne 0 ]; then
    rm -f "$TMP"
    log "ECHEC de la sauvegarde (code $code)"
  fi
}
trap cleanup EXIT

# On écrit d'abord dans un fichier .partial : une sauvegarde n'apparaît sous
# son vrai nom qu'une fois vérifiée.
FICHIER_COMPOSE=$(grep -m1 '^BELIVAY_COMPOSE=' .env.prod | cut -d'=' -f2-)  # DEV-SRV-01 : vitrine ou site réel
docker compose -f "${FICHIER_COMPOSE:-docker-compose.prod.yml}" --env-file .env.prod exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$TMP"

# Vérifications : archive lisible de bout en bout, et taille plausible.
gzip -t "$TMP"
SIZE_BYTES=$(stat -c %s "$TMP")
if [ "$SIZE_BYTES" -lt "$MIN_BYTES" ]; then
  echo "Sauvegarde anormalement petite ($SIZE_BYTES octets) : considérée comme échouée." >&2
  exit 1
fi

chmod 600 "$TMP"
mv "$TMP" "$FINAL"

# Rotation : seulement APRÈS une sauvegarde réussie, pour que des échecs
# répétés ne grignotent jamais les bonnes sauvegardes existantes.
find "$BACKUP_DIR" -name "belivay_*.sql.gz" -mtime +$RETENTION_DAYS -delete

log "Sauvegarde terminee : $(basename "$FINAL") ($(du -h "$FINAL" | cut -f1))"

# Copie chiffrée hors du serveur (DEV-SRV-01, T06-2) : une sauvegarde qui reste sur le serveur disparaît avec lui.
# Son échec n'annule pas la sauvegarde locale, déjà vérifiée : il est inscrit au journal, que le diagnostic de
# maintenance (maintenance.yml) lit et signale.
set +e
"$PROJECT_DIR/ops/sauvegarde/copier-vers-r2.sh" "$FINAL" >> "$BACKUP_DIR/backup.log" 2>&1
CODE_R2=$?
set -e
case "$CODE_R2" in
  0) log "Copie R2 terminee" ;;
  3) log "COPIE R2 NON CONFIGUREE (BACKUP_R2_BUCKET)" ;;
  *) log "ECHEC de la copie R2 (code $CODE_R2)" ;;
esac