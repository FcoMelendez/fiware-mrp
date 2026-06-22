#!/usr/bin/env bash
# Wait for Orion-LD Context Broker to be ready.
set -euo pipefail

ORION_URL="${ORION_URL:-http://localhost:1026}"
MAX_WAIT="${MAX_WAIT:-60}"
INTERVAL=3
elapsed=0

echo "Waiting for Orion-LD at ${ORION_URL} ..."

until curl -sf "${ORION_URL}/ngsi-ld/ex/v1/version" > /dev/null 2>&1; do
  if [ "$elapsed" -ge "$MAX_WAIT" ]; then
    echo "ERROR: Orion-LD did not become ready within ${MAX_WAIT}s." >&2
    exit 1
  fi
  echo "  ... not ready yet (${elapsed}s elapsed)"
  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
done

echo "Orion-LD is ready."
