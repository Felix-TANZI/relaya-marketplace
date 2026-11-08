#!/bin/bash
# Test de restauration — DEV-SRV-01, T06-3 : « Restaurer l'export de la veille dans une base temporaire et comparer
# le nombre de lignes des tables principales. » Terminé quand la restauration a réussi et sa capture est transmise.
#
#   ops/sauvegarde/tester-restauration.sh /chemin/vers/cle-privee-age.txt [nom_de_la_copie.sql.gz.age]
#
# Sans nom : la copie la plus récente sur R2. La clé privée n'est lue que le temps du test ; ne la laissez pas sur
# le serveur ensuite (le script le rappelle).
#
# La vraie base n'est JAMAIS écrite : tout se passe dans une base temporaire, supprimée à la fin, même en cas
# d'échec. Une table restaurée avec PLUS de lignes que la vraie base est une anomalie (code 1) ; avec moins, c'est
# l'activité depuis la sauvegarde de la nuit.
set -euo pipefail

CLE="${1:?Chemin de la clé privée age attendu}"
NOM_DEMANDE="${2:-}"
PROJECT_DIR="${PROJECT_DIR:-/var/www/belivay}"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.prod.yml --env-file .env.prod}"
IMAGE="belivay-sauvegarde:1"
BASE_TEST="belivay_test_restauration"
# Les tables qui portent l'activité réelle : comptes, vendeurs, catalogue, commandes, colis, pièces, argent.
TABLES="auth_user vendors_vendorprofile accounts_compliancedocument catalog_product orders_order shipping_shipment
payments_paymentintent payments_ledgertransaction payments_ledgerentry payments_payoutrequest"

[ -r "$CLE" ] || { echo "Clé privée illisible : $CLE" >&2; exit 1; }
# Chemin absolu de la clé, monté dans le conteneur des outils (pwd -W : chemin compris par Docker sur un poste Windows
# de test ; sur le serveur Linux, pwd suffit).
CLE_ABS="$(cd "$(dirname "$CLE")" && (pwd -W 2>/dev/null || pwd))/$(basename "$CLE")"
cd "$PROJECT_DIR"

valeur() { grep -m1 "^$1=" .env.prod 2>/dev/null | cut -d'=' -f2- || true; }
POSTGRES_USER="$(valeur POSTGRES_USER)"
POSTGRES_DB="$(valeur POSTGRES_DB)"
BUCKET="$(valeur BACKUP_R2_BUCKET)"
FOURNISSEUR="$(valeur BACKUP_R2_PROVIDER)"
[ -n "$BUCKET" ] || { echo "BACKUP_R2_BUCKET est vide : rien à restaurer." >&2; exit 1; }

docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -q -t "$IMAGE" "$PROJECT_DIR/ops/sauvegarde" >/dev/null

outils() {
  docker run --rm -i \
    -v "$CLE_ABS":/cle.txt:ro \
    -e BUCKET="$BUCKET" \
    -e RCLONE_CONFIG_R2_TYPE=s3 \
    -e RCLONE_CONFIG_R2_PROVIDER="${FOURNISSEUR:-Cloudflare}" \
    -e RCLONE_CONFIG_R2_ACCESS_KEY_ID="$(valeur BACKUP_R2_ACCESS_KEY_ID)" \
    -e RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$(valeur BACKUP_R2_SECRET_ACCESS_KEY)" \
    -e RCLONE_CONFIG_R2_ENDPOINT="$(valeur BACKUP_R2_ENDPOINT)" \
    -e RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true \
    --entrypoint sh "$IMAGE" -c "$1"
}
psql_base() { $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -q "${@:2}"; }
compter() { psql_base "$1" -tAc "SELECT count(*) FROM $2" 2>/dev/null || echo "absente"; }

supprimer_base_test() {
  $COMPOSE exec -T postgres dropdb -U "$POSTGRES_USER" --if-exists "$BASE_TEST" >/dev/null 2>&1 || true
}
trap supprimer_base_test EXIT

NOM="$NOM_DEMANDE"
if [ -z "$NOM" ]; then
  # Les noms portent la date (belivay_AAAAMMJJ_HHMMSS) : le dernier dans l'ordre alphabétique est le plus récent.
  NOM="$(outils 'rclone lsf --files-only --include "belivay_*.sql.gz.age" "r2:$BUCKET"' | sort | tail -1)"
fi
[ -n "$NOM" ] || { echo "Aucune copie trouvée sur R2." >&2; exit 1; }

echo "== Test de restauration BelivaY — $(date '+%Y-%m-%d %H:%M') =="
echo "Copie restaurée : $NOM"

supprimer_base_test
$COMPOSE exec -T postgres createdb -U "$POSTGRES_USER" "$BASE_TEST"
DEBUT=$(date +%s)
outils "rclone cat \"r2:\$BUCKET/$NOM\" | age -d -i /cle.txt" | gunzip | psql_base "$BASE_TEST" >/dev/null
echo "Restauration terminée en $(( $(date +%s) - DEBUT )) s, dans la base temporaire $BASE_TEST."
echo

ANOMALIE=0
printf "%-32s %12s %12s  %s\n" "Table" "Restaurée" "Base réelle" "Écart"
for TABLE in $TABLES; do
  RESTAUREE="$(compter "$BASE_TEST" "$TABLE")"
  REELLE="$(compter "$POSTGRES_DB" "$TABLE")"
  if [ "$RESTAUREE" = "absente" ] || [ "$REELLE" = "absente" ]; then
    ECART="table absente"
    [ "$RESTAUREE" = "$REELLE" ] || ANOMALIE=1
  elif [ "$RESTAUREE" -gt "$REELLE" ]; then
    ECART="ANOMALIE : plus de lignes que la base réelle"
    ANOMALIE=1
  elif [ "$RESTAUREE" -lt "$REELLE" ]; then
    ECART="$(( REELLE - RESTAUREE )) ligne(s) créée(s) depuis la sauvegarde"
  else
    ECART="identique"
  fi
  printf "%-32s %12s %12s  %s\n" "$TABLE" "$RESTAUREE" "$REELLE" "$ECART"
done
echo

if [ "$ANOMALIE" -eq 0 ]; then
  echo "RÉSULTAT : restauration réussie."
else
  echo "RÉSULTAT : ANOMALIE — voir les lignes ci-dessus."
fi
echo "La base temporaire est supprimée. Pensez à retirer la clé privée du serveur : rm \"$CLE\""
exit "$ANOMALIE"
