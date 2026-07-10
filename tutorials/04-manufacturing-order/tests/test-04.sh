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

# ── 7. Seed a second, throwaway draft order for the cancel demo ──────────────
# (created directly in the broker, not via the static seed file, so it doesn't
#  perturb assertion #3's "returns 1 draft order" count above)
CANCEL_ORDER_ID="urn:ngsi-ld:ManufacturingOrder:MO-2024-CANCEL-DEMO"
seed_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${ORION}/ngsi-ld/v1/entityOperations/upsert" \
  -H "Content-Type: application/ld+json" \
  -d "[{
    \"id\": \"${CANCEL_ORDER_ID}\",
    \"type\": \"ManufacturingOrder\",
    \"orderCode\": {\"type\": \"Property\", \"value\": \"MO-2024-CANCEL-DEMO\"},
    \"product\": {\"type\": \"Relationship\", \"object\": \"urn:ngsi-ld:Product:HydraulicPump-P100\"},
    \"bom\": {\"type\": \"Relationship\", \"object\": \"urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1\"},
    \"quantity\": {\"type\": \"Property\", \"value\": 5, \"unitCode\": \"EA\"},
    \"state\": {\"type\": \"Property\", \"value\": \"draft\"},
    \"plannedStart\": {\"type\": \"Property\", \"value\": \"2024-08-01T08:00:00Z\"},
    \"plannedEnd\": {\"type\": \"Property\", \"value\": \"2024-08-02T17:00:00Z\"},
    \"priority\": {\"type\": \"Property\", \"value\": \"normal\"},
    \"@context\": \"http://context-server:3000/contexts/mrp/v0.1/context.jsonld\"
  }]" \
  -H "Accept: application/json")
check "Seed second draft order for cancel demo" "1" "$([[ "$seed_status" =~ ^(201|204|207)$ ]] && echo 1 || echo 0)"

# ── 8. Cancel the draft order ─────────────────────────────────────────────────
cancel_status=$(curl -s -X POST "${MFG}/commands/cancel-manufacturing-order" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"${CANCEL_ORDER_ID}\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "cancel-manufacturing-order returns status=cancelled" "cancelled" "$cancel_status"

# ── 9. State is now cancelled in broker ───────────────────────────────────────
cancelled_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/${CANCEL_ORDER_ID}" \
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
check "ManufacturingOrder state is cancelled after command" "cancelled" "$cancelled_state"

# ── 10. Cancelling an already-cancelled order is rejected (422) ─────────────
recancel_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${MFG}/commands/cancel-manufacturing-order" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"${CANCEL_ORDER_ID}\"}")
check "Re-cancelling an already-cancelled order is rejected" "422" "$recancel_status"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
