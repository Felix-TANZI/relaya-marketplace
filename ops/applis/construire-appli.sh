#!/bin/bash
# Construit une application mobile BelivaY vers le bon serveur — DEV-SRV-01, T12 :
# « Les versions destinées à Google Play et à l'App Store pointent vers api.belivay.com ; aucune ne pointe vers
# api-demo. Terminé quand l'application installée affiche les boutiques réelles. »
#
#   VITE_API_URL=https://api.belivay.com ops/applis/construire-appli.sh <appli> [android|ios]
#
#   <appli> : client | seller | courier | admin | delivery-org | relay-point
#
# Les écrans de l'appli sont embarqués dans l'APK / l'IPA : l'adresse du serveur y est figée à la construction.
# Elle vient de VITE_API_URL (jamais du code, règle R5) et doit être absolue, en https : une appli n'a pas de domaine
# à elle, une adresse relative (« /api ») ne mènerait nulle part. Le script prépare le projet natif (npx cap sync) ;
# la signature et l'envoi au store restent dans Android Studio / Xcode (ops/APPLIS-MOBILES.md).
set -euo pipefail

APPLI="${1:-}"
PLATEFORME="${2:-android}"

case "$APPLI" in
  client|seller|courier|admin|delivery-org|relay-point) ;;
  *) echo "Usage : VITE_API_URL=https://api.belivay.com $0 <client|seller|courier|admin|delivery-org|relay-point> [android|ios]" >&2
     exit 2 ;;
esac
case "$PLATEFORME" in
  android|ios) ;;
  *) echo "Plateforme inconnue : $PLATEFORME (android ou ios)." >&2; exit 2 ;;
esac
case "${VITE_API_URL:-}" in
  https://*) ;;
  *) echo "VITE_API_URL doit être l'adresse complète du serveur, en https (ex. https://api.belivay.com)." >&2
     exit 1 ;;
esac
case "$VITE_API_URL" in
  *api-demo*) echo "ATTENTION : appli de DÉMONSTRATION (api-demo). Elle ne doit jamais être publiée sur un store." >&2 ;;
esac

cd "$(dirname "$0")/../../frontend"

# La configuration Capacitor de l'appli remplace le temps du « cap sync » celle par défaut (client), remise ensuite
# telle qu'elle est dans git, même en cas d'échec.
trap 'git checkout -- capacitor.config.ts 2>/dev/null || true' EXIT

echo "→ Écrans de l'appli « $APPLI » construits vers $VITE_API_URL"
export VITE_API_URL
npm run "build:$APPLI"

cp "capacitor.$APPLI.config.ts" capacitor.config.ts
npx cap sync "$PLATEFORME"

echo
echo "Projet natif prêt. Vérifier l'adresse embarquée avant de signer :"
echo "  grep -rl \"$VITE_API_URL\" dist-$APPLI/assets | head -1"
echo "Puis : Android Studio (Build > Generate Signed Bundle / APK) ou Xcode (Product > Archive)."
