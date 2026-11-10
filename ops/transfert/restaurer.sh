#!/bin/bash
# Restauration de l'export sur MAIN 1 — DEV-SRV-01, T18-3 : « restaure l'export sur MAIN 1, dans la base réelle »,
# et T15 : « restaurer dans une base distincte sur MAIN 1, sans toucher aux adresses ni à la vitrine ».
#
#   ops/transfert/restaurer.sh <fichier .dump> [base cible]
#
# Base cible : celle de .env.prod (POSTGRES_DB) par défaut ; un autre nom pour la répétition (ex. belivay_repetition),
# créée si besoin. Garde-fous :
#   - l'empreinte .sha256 doit correspondre (export copié sans erreur) ;
#   - la base cible doit être VIDE (aucune table) : on ne fusionne jamais un export dans une base qui a des données.
# Produit <fichier>.comptes-restaures, à comparer avec le .comptes de l'export (ops/transfert/comparer.sh).
set -euo pipefail
source "$(dirname "$0")/commun.sh"

EXPORT="${1:?Usage : $0 <fichier .dump> [base cible]}"
CIBLE="${2:-$POSTGRES_DB}"
[ -f "$EXPORT" ] || { echo "Export introuvable : $EXPORT" >&2; exit 1; }

echo "1. Empreinte de l'export"
(cd "$(dirname "$EXPORT")" && sha256sum -c "$(basename "$EXPORT").sha256")

echo "2. Base cible « $CIBLE »"
EXISTE=$(psql_dans postgres -tA -c "SELECT 1 FROM pg_database WHERE datname = '$CIBLE'")
if [ -z "$EXISTE" ]; then
  $COMPOSE exec -T postgres createdb -U "$POSTGRES_USER" "$CIBLE"
  echo "   créée."
fi
TABLES=$(psql_dans "$CIBLE" -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
if [ "$TABLES" != "0" ]; then
  echo "   REFUS : la base « $CIBLE » contient déjà $TABLES table(s). Elle doit être vide (voir la procédure)." >&2
  exit 1
fi

echo "3. Restauration"
DEBUT=$(date +%s)
$COMPOSE exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$CIBLE" --no-owner --exit-on-error < "$EXPORT"
echo "   terminée en $(( $(date +%s) - DEBUT )) s."

echo "4. Comptage des tables restaurées"
compter_base "$CIBLE" > "$EXPORT.comptes-restaures"
echo "   $(wc -l < "$EXPORT.comptes-restaures") tables -> $EXPORT.comptes-restaures"
echo "Comparer : ops/transfert/comparer.sh ${EXPORT%.dump}.comptes $EXPORT.comptes-restaures"
