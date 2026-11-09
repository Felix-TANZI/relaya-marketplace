#!/bin/bash
# Active (ou retire) une configuration du lancement préparée à l'avance — DEV-SRV-01, T21 / T22 / T24 / T25.
# « Le 14 décembre, on applique ; on ne construit plus. »
#
#   ops/lancement/activer.sh belivay-com             # belivay.com → espace client réel (T24)
#   ops/lancement/activer.sh redirections-vitrine    # adresses françaises → anglaises, arrêt d'api-demo (T25)
#   ops/lancement/activer.sh <nom> --retirer         # retour arrière
#   ops/lancement/activer.sh --etat                  # ce qui est activé
#
# Copie nginx/lancement-pret/<nom>.conf dans nginx/lancement/ (inclus par nginx/reel.conf), fait vérifier la
# configuration par nginx (nginx -t) et ne recharge qu'alors ; si nginx la refuse, le fichier est retiré aussitôt et
# le site continue avec la configuration d'avant.
set -euo pipefail
source "$(dirname "$0")/../transfert/commun.sh"

PRETS="$PROJECT_DIR/nginx/lancement-pret"
ACTIFS="$PROJECT_DIR/nginx/lancement"

recharger() {
  $COMPOSE exec -T nginx nginx -t && $COMPOSE exec -T nginx nginx -s reload
}

if [ "${1:-}" = "--etat" ]; then
  ls "$ACTIFS"/*.conf 2>/dev/null | xargs -r -n1 basename || true
  [ -n "$(ls "$ACTIFS"/*.conf 2>/dev/null)" ] || echo "Rien d'activé."
  exit 0
fi

NOM="${1:?Usage : $0 <belivay-com|redirections-vitrine> [--retirer] | --etat}"
[ -f "$PRETS/$NOM.conf" ] || { echo "Configuration préparée introuvable : $PRETS/$NOM.conf" >&2; exit 2; }
mkdir -p "$ACTIFS"

if [ "${2:-}" = "--retirer" ]; then
  rm -f "$ACTIFS/$NOM.conf"
  recharger
  echo "« $NOM » retiré : nginx rechargé sans elle."
  exit 0
fi

cp "$PRETS/$NOM.conf" "$ACTIFS/$NOM.conf"
if recharger; then
  echo "« $NOM » activé : nginx a validé et rechargé la configuration."
else
  rm -f "$ACTIFS/$NOM.conf"
  echo "nginx a REFUSÉ « $NOM » : fichier retiré, le site continue avec la configuration d'avant." >&2
  echo "Cause la plus fréquente : le certificat ne couvre pas encore ces adresses (ops/lancement/LANCEMENT-14-DECEMBRE.md)." >&2
  exit 1
fi
