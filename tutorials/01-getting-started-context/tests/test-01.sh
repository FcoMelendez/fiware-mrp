#!/usr/bin/env bash
# Tutorial 01 — automated assertions.
# Queries Orion-LD using expanded MRP type IRIs so no context URL fetch is needed.
# Usage: bash tutorials/01-getting-started-context/tests/test-01.sh
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
MRP_NS="https://fiware-mrp.io/ontology/mrp%23"   # URL-encoded #

PASS=0
FAIL=0

assert_count() {
  local label="$1"
  local type_iri="$2"     # already URL-encoded
  local expected="$3"

  local actual
  actual=$(curl -sf \
    "${ORION}/ngsi-ld/v1/entities?type=${type_iri}&options=keyValues" \
    | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

  if [ "$actual" = "$expected" ]; then
    echo "[PASS] ${label}: expected ${expected}, got ${actual}"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] ${label}: expected ${expected}, got ${actual}"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== Tutorial 01 Assertions ==="
echo ""

assert_count "Plant count"         "${MRP_NS}Plant"         "1"
assert_count "WorkCenter count"    "${MRP_NS}WorkCenter"    "3"
assert_count "Product count"       "${MRP_NS}Product"       "5"
assert_count "StockLocation count" "${MRP_NS}StockLocation" "2"

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed."
echo ""

[ "$FAIL" -eq 0 ]
