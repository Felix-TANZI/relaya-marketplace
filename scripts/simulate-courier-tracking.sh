#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
COURIER_USERNAME="${COURIER_USERNAME:-workflow_courier}"
COURIER_PASSWORD="${COURIER_PASSWORD:-Courier2026}"
SHIPMENT_ID="${SHIPMENT_ID:-13}"
DELAY_SECONDS="${DELAY_SECONDS:-3}"

access_token="$({
  curl --fail --silent --show-error \
    -X POST "$BASE_URL/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$COURIER_USERNAME\",\"password\":\"$COURIER_PASSWORD\"}"
} | jq -r '.access')"

if [[ -z "$access_token" || "$access_token" == "null" ]]; then
  echo "Impossible d'obtenir le jeton du livreur." >&2
  exit 1
fi

# Bastos -> centre-ville -> Mvan, Yaounde.
positions=(
  "3.883300 11.514700 5.8 185"
  "3.869800 11.516000 6.2 182"
  "3.854900 11.516800 7.1 178"
  "3.837800 11.515200 6.7 183"
  "3.819600 11.513400 4.3 190"
)

for position in "${positions[@]}"; do
  read -r latitude longitude speed heading <<< "$position"
  response="$({
    curl --fail --silent --show-error \
      -X POST "$BASE_URL/api/shipping/my-shipments/$SHIPMENT_ID/location/" \
      -H "Authorization: Bearer $access_token" \
      -H "Content-Type: application/json" \
      -d "{\"latitude\":$latitude,\"longitude\":$longitude,\"accuracy_m\":8,\"speed_mps\":$speed,\"heading_deg\":$heading,\"source\":\"SIMULATION\"}"
  })"
  echo "$response" | jq '{id, latitude, longitude, speed_mps, captured_at}'
  sleep "$DELAY_SECONDS"
done

echo "Simulation terminee pour la mission $SHIPMENT_ID."
