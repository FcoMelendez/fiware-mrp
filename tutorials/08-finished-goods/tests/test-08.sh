#!/usr/bin/env bash
# Tutorial 08 automated assertions — Finished goods receipt (close out a ManufacturingOrder)
# Prerequisites: stack up (finished-goods-service included), TUTORIAL=08 make seed
#   (file is self-contained: includes T01–T07 entities + 3 WorkOrders in completed state)
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
FG="${FG_URL:-http://localhost:8086}"
MO_ID="urn:ngsi-ld:ManufacturingOrder:MO-2024-001"

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
echo "=== Tutorial 08 Assertions ==="
echo ""

# ── 1. finished-goods-service health ──────────────────────────────────────────
status=$(curl -s "${FG}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "finished-goods-service health" "ok" "$status"

version=$(curl -s "${FG}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version',''))" 2>/dev/null || echo "")
check "finished-goods-service version is 0.8.0" "0.8.0" "$version"

# ── 2. receive-finished-goods closes out the ManufacturingOrder ──────────────
receive_status=$(curl -s -X POST "${FG}/commands/receive-finished-goods" \
  -H "Content-Type: application/json" \
  -d "{\"manufacturing_order_id\": \"${MO_ID}\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "receive-finished-goods returns status=done" "done" "$receive_status"

# ── 3. ManufacturingOrder state=completed in broker ───────────────────────────
mo_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/${MO_ID}" \
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
check "ManufacturingOrder state=completed" "completed" "$mo_state"

# ── 4. ManufacturingOrder has completedAt set ─────────────────────────────────
mo_completed_at=$(curl -s "${ORION}/ngsi-ld/v1/entities/${MO_ID}" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'completedAt' in k and isinstance(v, dict):
        print('set')
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "ManufacturingOrder completedAt is set" "set" "$mo_completed_at"

# ── 5. StockMove receipt created into finished-goods location ────────────────
sm_count=$(curl -s "${FG}/production-receipts" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /production-receipts returns at least 1" "1" "$([ "$sm_count" -ge 1 ] && echo 1 || echo 0)"

# ── 6. Production receipt moveType=receipt ────────────────────────────────────
sm_move_type=$(curl -s "${FG}/production-receipts" \
  | python3 -c "
import sys, json
receipts = json.load(sys.stdin)
if not receipts:
    print('')
    sys.exit(0)
last = receipts[-1]
for k, v in last.items():
    if 'moveType' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "Production receipt moveType=receipt" "receipt" "$sm_move_type"

# ── 7. InventoryBalance for HydraulicPump-P100 at WH-FINISHED > 0 ────────────
ib_id="urn:ngsi-ld:InventoryBalance:IB-HydraulicPump-P100-WH-FINISHED"
ib_qty=$(curl -s "${ORION}/ngsi-ld/v1/entities/${ib_id}" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'quantityOnHand' in k and isinstance(v, dict):
        print(v.get('value', 0))
        sys.exit(0)
print(0)
" 2>/dev/null || echo "0")
check "InventoryBalance HydraulicPump-P100 quantityOnHand > 0" "1" "$(python3 -c "print(1 if float('${ib_qty}' or 0) > 0 else 0)")"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
