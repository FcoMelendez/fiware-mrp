#!/usr/bin/env bash
# Tutorial 04 automated assertions — ManufacturingOrder confirmation
# Prerequisites: stack up, TUTORIAL=04 make seed  (file is self-contained: includes T01+T03+T04 entities)
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
MFG="${MFG_URL:-http://localhost:8083}"
MRP_NS="https://fiware-mrp.io/ontology/mrp%23"
ORDER_ID="urn:ngsi-ld:ManufacturingOrder:MO-2024-001"

PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "[PASS] $desc: expected $expected, got $actual"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $desc: expected $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== Tutorial 04 Assertions ==="
echo ""

# ── 1. manufacturing-service health ──────────────────────────────────────────
status=$(curl -s "${MFG}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "manufacturing-service health" "ok" "$status"

# ── 2. ManufacturingOrder in draft state exists in broker ─────────────────────
draft_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/${ORDER_ID}" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'state' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "ManufacturingOrder initial state is draft" "draft" "$draft_state"

# ── 3. GET /manufacturing-orders?state=draft returns 1 order ─────────────────
draft_count=$(curl -s "${MFG}/manufacturing-orders?state=draft" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /manufacturing-orders?state=draft returns 1" "1" "$draft_count"

# ── 4. Confirm the order ──────────────────────────────────────────────────────
confirm_status=$(curl -s -X POST "${MFG}/commands/confirm-manufacturing-order" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"${ORDER_ID}\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "confirm-manufacturing-order returns status=confirmed" "confirmed" "$confirm_status"

# ── 5. State is now confirmed in broker ───────────────────────────────────────
confirmed_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/${ORDER_ID}" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'state' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "ManufacturingOrder state is confirmed after command" "confirmed" "$confirmed_state"

# ── 6. GET /manufacturing-orders?state=confirmed returns 1 order ──────────────
confirmed_count=$(curl -s "${MFG}/manufacturing-orders?state=confirmed" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /manufacturing-orders?state=confirmed returns 1" "1" "$confirmed_count"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
