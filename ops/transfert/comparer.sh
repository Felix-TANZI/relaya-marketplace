#!/bin/bash
# Comparaison des comptages table par table — DEV-SRV-01, T18-4 : « compare les comptages MAIN 1 et MAIN 2, table par
# table ». Condition de réouverture : identiques ; sinon, retour arrière (les adresses restent sur MAIN 2).
#
#   ops/transfert/comparer.sh <comptes de l'export> <comptes restaurés>
#
# Code 0 : identiques. Code 1 : au moins un écart (table absente, ou nombre de lignes différent).
set -euo pipefail

USAGE="Usage : $0 <comptes export> <comptes restaures>"
AVANT="${1:?$USAGE}"
APRES="${2:?$USAGE}"

ECARTS=$(join -t $'\t' -a 1 -a 2 -e ABSENTE -o 0,1.2,2.2 <(sort "$AVANT") <(sort "$APRES") | awk -F'\t' '$2 != $3')
TOTAL=$(wc -l < "$AVANT")

if [ -z "$ECARTS" ]; then
  echo "RÉSULTAT : identiques — $TOTAL tables, même nombre de lignes partout. La réouverture peut avoir lieu."
  exit 0
fi
echo "RÉSULTAT : ÉCART — RETOUR ARRIÈRE (les adresses restent sur MAIN 2, voir la procédure)."
printf "%-45s %14s %14s\n" "Table" "Export (MAIN 2)" "Restauré (MAIN 1)"
echo "$ECARTS" | while IFS=$'\t' read -r table avant apres; do
  printf "%-45s %14s %14s\n" "$table" "$avant" "$apres"
done
exit 1
