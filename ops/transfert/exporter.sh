#!/bin/bash
# Export de la base réelle à transférer (sur MAIN 2) — DEV-SRV-01, T18-2 : « exporte la base de MAIN 2 ».
#
#   ops/transfert/exporter.sh [--sans-maintenance]
#
# Refuse de partir si le site n'est pas en maintenance (une écriture pendant l'export serait perdue au transfert) ;
# --sans-maintenance ne sert qu'à la répétition (T15), sur une copie. Produit dans TRANSFERT_DIR :
#   transfert_AAAAMMJJ_HHMMSS.dump         export complet (format pg_dump « custom », restaurable par pg_restore)
#   transfert_AAAAMMJJ_HHMMSS.dump.sha256  empreinte, vérifiée avant toute restauration
#   transfert_AAAAMMJJ_HHMMSS.comptes      lignes de chaque table, au moment de l'export (à comparer après)
set -euo pipefail
source "$(dirname "$0")/commun.sh"

if [ "${1:-}" != "--sans-maintenance" ] && [ ! -f "$PROJECT_DIR/nginx/maintenance/actif" ]; then
  echo "Le site n'est pas en maintenance : lancer d'abord ops/transfert/maintenance.sh on." >&2
  exit 1
fi

mkdir -p "$TRANSFERT_DIR"
chmod 700 "$TRANSFERT_DIR"
NOM="transfert_$(date +%Y%m%d_%H%M%S)"
DEBUT=$(date +%s)

$COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$TRANSFERT_DIR/$NOM.dump.partiel"
mv "$TRANSFERT_DIR/$NOM.dump.partiel" "$TRANSFERT_DIR/$NOM.dump"
chmod 600 "$TRANSFERT_DIR/$NOM.dump"
(cd "$TRANSFERT_DIR" && sha256sum "$NOM.dump" > "$NOM.dump.sha256")
compter_base "$POSTGRES_DB" > "$TRANSFERT_DIR/$NOM.comptes"

echo "Export terminé en $(( $(date +%s) - DEBUT )) s :"
echo "  $TRANSFERT_DIR/$NOM.dump ($(du -h "$TRANSFERT_DIR/$NOM.dump" | cut -f1))"
echo "  $(wc -l < "$TRANSFERT_DIR/$NOM.comptes") tables comptées dans $NOM.comptes"
echo "À copier sur MAIN 1 : scp $TRANSFERT_DIR/$NOM.dump* $TRANSFERT_DIR/$NOM.comptes <utilisateur>@<MAIN 1>:$TRANSFERT_DIR/"
