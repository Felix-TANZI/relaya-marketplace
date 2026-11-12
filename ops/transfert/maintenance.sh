#!/bin/bash
# Maintenance du site réel — DEV-SRV-01, T18-1 : « 22 h — le site réel passe en maintenance : plus aucune écriture
# possible. » Tant que le fichier témoin existe, nginx (nginx/reel.conf.template) répond 503 et la page de maintenance sur
# l'API et les six portails ; rien à redémarrer.
#
#   ops/transfert/maintenance.sh on      # ferme le site
#   ops/transfert/maintenance.sh off     # rouvre le site
#   ops/transfert/maintenance.sh etat    # dit s'il est fermé
set -euo pipefail
source "$(dirname "$0")/commun.sh"

TEMOIN="$PROJECT_DIR/nginx/maintenance/actif"

case "${1:-etat}" in
  on)
    date '+%Y-%m-%d %H:%M:%S' > "$TEMOIN"
    echo "Site réel EN MAINTENANCE depuis $(cat "$TEMOIN") : plus aucune écriture possible."
    ;;
  off)
    rm -f "$TEMOIN"
    echo "Site réel ROUVERT."
    ;;
  etat)
    if [ -f "$TEMOIN" ]; then echo "En maintenance depuis $(cat "$TEMOIN")."; else echo "Ouvert."; fi
    ;;
  *)
    echo "Usage : $0 on|off|etat" >&2
    exit 2
    ;;
esac
