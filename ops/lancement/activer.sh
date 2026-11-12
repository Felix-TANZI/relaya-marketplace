#!/bin/bash
# Active (ou retire) une configuration du lancement préparée à l'avance — DEV-SRV-01, T21 / T22 / T24 / T25.
# « Le 14 décembre, on applique ; on ne construit plus. »
#
#   ops/lancement/activer.sh vitrine                 # la vitrine sur MAIN 1, du transfert au 14/12 (T08, T13)
#   ops/lancement/activer.sh belivay-com             # belivay.com → espace client réel (T24)
#   ops/lancement/activer.sh redirections-vitrine    # adresses françaises → anglaises, arrêt d'api-demo (T25)
#   ops/lancement/activer.sh <nom> --retirer         # retour arrière
#   ops/lancement/activer.sh --etat                  # ce qui est activé
#
# Copie nginx/lancement-pret/<nom>.conf dans nginx/lancement/ (inclus par nginx/reel.conf.template), fait vérifier la
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

NOM="${1:?Usage : $0 <vitrine|belivay-com|redirections-vitrine> [--retirer] | --etat}"
[ -f "$PRETS/$NOM.conf" ] || { echo "Configuration préparée introuvable : $PRETS/$NOM.conf" >&2; exit 2; }
mkdir -p "$ACTIFS"

if [ "${2:-}" = "--retirer" ]; then
  rm -f "$ACTIFS/$NOM.conf"
  recharger
  echo "« $NOM » retiré : nginx rechargé sans elle."
  exit 0
fi

# La vitrine (du 18/11 au 14/12) et les configurations du 14/12 répondent aux mêmes adresses (belivay.com, vendeur.…) :
# une seule à la fois. Le 14/12 : « activer.sh vitrine --retirer », puis belivay-com et redirections-vitrine.
case "$NOM" in
  vitrine) RIVALES="belivay-com redirections-vitrine" ;;
  belivay-com|redirections-vitrine) RIVALES="vitrine" ;;
  *) RIVALES="" ;;
esac
for rivale in $RIVALES; do
  if [ -f "$ACTIFS/$rivale.conf" ]; then
    echo "« $rivale » est active et sert les mêmes adresses : retirez-la d'abord ($0 $rivale --retirer)." >&2
    exit 3
  fi
done

# DEV-SRV-01 v1.8, C02 : les configurations préparées sont écrites pour belivay.com ; sur le serveur de test
# (BELIVAY_DOMAINE=test.belivay.com), la copie active prend ses noms et son certificat (vendeur.test.belivay.com…).
if [ "$DOMAINE" = "belivay.com" ]; then
  cp "$PRETS/$NOM.conf" "$ACTIFS/$NOM.conf"
else
  sed "s/belivay\.com/$DOMAINE/g" "$PRETS/$NOM.conf" > "$ACTIFS/$NOM.conf"
fi
if recharger; then
  echo "« $NOM » activé : nginx a validé et rechargé la configuration."
else
  rm -f "$ACTIFS/$NOM.conf"
  echo "nginx a REFUSÉ « $NOM » : fichier retiré, le site continue avec la configuration d'avant." >&2
  echo "Cause la plus fréquente : le certificat ne couvre pas encore ces adresses (ops/lancement/LANCEMENT-14-DECEMBRE.md)." >&2
  exit 1
fi
