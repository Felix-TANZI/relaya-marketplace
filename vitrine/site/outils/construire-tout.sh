#!/bin/sh
# Un seul déploiement pour les six interfaces (logique-metier/CAHIER-CONNECTIVITE.md, étape 1) : le client à la racine,
# puis le vendeur, l'entreprise de livraison, le livreur, le point relais et la console d'administration copiés sous
# /vendeur/, /entreprise/, /livreur/, /relais/ et /admin/ du même dist. Même origine : le pont de démonstration (src/demo/pont.ts, journal partagé en
# localStorage) relie les six applications. Chaque application est construite avec sa propre base (vite.config.ts).
#   sh outils/construire-tout.sh            (Vercel : installe chaque application, npm ci)
#   SANS_INSTALLATION=1 sh outils/construire-tout.sh   (poste de travail : dépendances déjà installées)
#   RECONSTRUIRE="client vendeur" … : ne reconstruit que ces applications, les autres reprennent leur dist existant
set -e
cd "$(dirname "$0")/.."
RECONSTRUIRE="${RECONSTRUIRE:-client vendeur entreprise livreur relais admin}"
a_construire() { case " $RECONSTRUIRE " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
if a_construire client || [ ! -f dist/index.html ]; then npm run build; fi
for app in vendeur entreprise livreur relais admin; do
  (
    cd "../espace-$app"
    [ -n "$SANS_INSTALLATION" ] || npm ci
    if a_construire "$app" || [ ! -f dist/index.html ]; then npm run build; fi
  )
  # La base de chaque application doit être son chemin, sinon ses fichiers ne se chargent pas sous /<app>/.
  grep -q "src=\"/$app/assets/" "../espace-$app/dist/index.html" || { echo "espace-$app : base différente de /$app/" >&2; exit 1; }
  rm -rf "dist/$app"
  cp -R "../espace-$app/dist" "dist/$app"
done
# Adresse du site dans les pages (partage, adresse canonique), robots.txt et sitemap.xml (pages publiques seulement).
node outils/publication.mjs
echo "dist commun : / /vendeur/ /entreprise/ /livreur/ /relais/ /admin/"
