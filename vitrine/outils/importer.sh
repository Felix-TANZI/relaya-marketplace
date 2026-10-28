#!/bin/sh
# Met à jour les sources de la vitrine depuis le dépôt de l'équipe produit (PG-BelivaY), à un commit précis.
#   sh vitrine/outils/importer.sh <chemin du dépôt PG-BelivaY> [commit, défaut HEAD]
# Remplace site/, espace-*/ et les fichiers de données partagés (liste ci-dessous) par leur état à ce commit (fichiers
# suivis par git seulement : ni node_modules, ni dist, ni fichiers locaux), puis note le commit dans SOURCE.txt.
# Ne touche pas à serveur/, outils/, Dockerfile, .dockerignore. Relire ensuite le diff, construire et vérifier
# (PR-VITRINE.md, « Vérifier »).
set -eu
SRC="${1:?usage : sh vitrine/outils/importer.sh <dépôt PG-BelivaY> [commit]}"
REV="${2:-HEAD}"
ICI="$(cd "$(dirname "$0")/.." && pwd)"
COMMIT="$(git -C "$SRC" rev-parse --verify "$REV^{commit}")"
APPS="site espace-vendeur espace-entreprise espace-livreur espace-relais espace-admin"
# Fichiers lus par les applications hors de leur dossier (imports et vite.config.ts) : à compléter si une
# application en lit un nouveau (la construction échoue alors sur un fichier introuvable).
PARTAGES="logique-metier/parametres-en-vigueur.json
logique-metier/visibilite-anonymat.json
logique-metier/livraison/zones-yaounde.geo.json
logique-metier/livraison/quartiers-zones.json
logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json
logique-metier/reference/elements-dev-v1.4/BelivaY_elements_dev_16oct_v1.4/06_BelivaY_Donnees_a_saisir.json
backend-kit/apps/console/donnees/routes-console.json"
for a in $APPS logique-metier backend-kit; do rm -rf "${ICI:?}/$a"; done
# shellcheck disable=SC2086
echo "$PARTAGES" | tr '\n' '\0' | xargs -0 git -C "$SRC" archive "$COMMIT" $APPS | tar -x -C "$ICI"
{
  echo "Sources de la vitrine : dépôt PG-BelivaY (équipe produit BelivaY)"
  echo "branche  : $(git -C "$SRC" branch --contains "$COMMIT" --format='%(refname:short)' | head -1)"
  echo "commit   : $COMMIT"
  echo "date     : $(git -C "$SRC" show -s --format=%cI "$COMMIT")"
  echo "importé  : $(date -u +%Y-%m-%dT%H:%M:%SZ) par vitrine/outils/importer.sh"
} > "$ICI/SOURCE.txt"
echo "vitrine : sources au commit $COMMIT"
