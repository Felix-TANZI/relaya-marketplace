#!/usr/bin/env bash
set -euo pipefail

delete_originals=false
if [[ "${1:-}" == "--delete-originals" ]]; then
  delete_originals=true
  shift
fi

root="${1:-assets}"
destination="$root/captures-par-date"

mkdir -p "$destination"

is_capture() {
  local file="$1"
  local base
  base="$(basename "$file")"

  [[ "$base" == "Capture d’écran du "* ]] ||
  [[ "$base" == "Capture d'ecran du "* ]] ||
  [[ "$file" == *"/captures-patron-corrections-"* ]] ||
  [[ "$file" == *"/workflow-captures/"* ]] ||
  [[ "$file" == *"/workflow-guide/screenshots/"* ]] ||
  [[ "$file" == *"/workflow-litige-guide/screenshots/"* ]] ||
  [[ "$file" == *"/avatar-profile-captures-"* ]] ||
  [[ "$file" == *"/category-tests/"* ]] ||
  [[ "$file" == *"/chatbot-tests-"* ]] ||
  [[ "$file" == *"/google-auth-test/"* ]] ||
  [[ "$file" == *"/osm-tests/"* ]] ||
  [[ "$file" == *"/portal-audit-"* ]] ||
  [[ "$file" == *"/portal-corrections-"* ]] ||
  [[ "$file" == *"/seller-offer-2fa-reproduction-"* ]] ||
  [[ "$file" == *"/tracking-simulation/"* ]] ||
  [[ "$file" == *"/admin-category-capture-"* ]] ||
  [[ "$file" == *"/vendor-category-capture-"* ]]
}

capture_date() {
  local file="$1"
  local date_value compact

  date_value="$(printf '%s' "$file" | sed -nE 's/.*(20[0-9]{2}-[01][0-9]-[0-3][0-9]).*/\1/p' | head -n 1)"
  if [[ -z "$date_value" ]]; then
    compact="$(printf '%s' "$file" | sed -nE 's/.*(20[0-9]{2}[01][0-9][0-3][0-9]).*/\1/p' | head -n 1)"
    if [[ -n "$compact" ]]; then
      date_value="${compact:0:4}-${compact:4:2}-${compact:6:2}"
    fi
  fi
  if [[ -z "$date_value" ]]; then
    date_value="$(stat -c '%y' "$file" | cut -d' ' -f1)"
  fi

  printf '%s-%s-%s' "${date_value:8:2}" "${date_value:5:2}" "${date_value:0:4}"
}

copied=0
deleted=0
while IFS= read -r -d '' file; do
  is_capture "$file" || continue

  date_dir="$(capture_date "$file")"
  relative="${file#"$root"/}"
  target="$destination/$date_dir/$relative"
  mkdir -p "$(dirname "$target")"
  cp -a --reflink=auto "$file" "$target"
  copied=$((copied + 1))

  if $delete_originals && cmp -s "$file" "$target"; then
    rm -- "$file"
    deleted=$((deleted + 1))
  fi
done < <(
  find "$root" -path "$destination" -prune -o -type f \
    \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) \
    -print0
)

printf 'Captures classées : %d\n' "$copied"
printf 'Originaux supprimés après vérification : %d\n' "$deleted"
find "$destination" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
