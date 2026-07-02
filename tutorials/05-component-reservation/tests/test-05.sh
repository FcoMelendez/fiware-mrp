#!/usr/bin/env bash
# Tutorial 05 automated assertions — Component reservations and shortages
# Prerequisites: stack up, TUTORIAL=05 make seed  (file is self-contained: includes T01+T02+T03+T04 entities)
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
INV="${INV_URL:-http://localhost:8081}"
ORDER_ID="urn:ngsi-ld:ManufacturingOrder:MO-2024-001"
LOCATION_ID="urn:ngsi-ld:StockLocation:WH-STOCK"
MRP_NS="https://fiware-mrp.io/ontology/mrp%23"

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
echo "=== Tutorial 05 Assertions ==="
echo ""

# ── 1. inventory-service health (v0.5) ───────────────────────────────────────
status=$(curl -s "${INV}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "inventory-service health" "ok" "$status"

version=$(curl -s "${INV}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version',''))" 2>/dev/null || echo "")
check "inventory-service version is 0.5.0" "0.5.0" "$version"

# ── 2. Inventory balances exist before reservation ────────────────────────────
ib_count=$(curl -s "${INV}/inventory" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /inventory returns 2 InventoryBalance entities" "2" "$ib_count"

# ── 3. No reservations exist before running the command ──────────────────────
ir_pre=$(curl -s "${INV}/inventory-reservations" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /inventory-reservations returns 0 before command" "0" "$ir_pre"

# ── 4. reserve-components command succeeds ────────────────────────────────────
reserve_status=$(curl -s -X POST "${INV}/commands/reserve-components" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"${ORDER_ID}\", \"location_id\": \"${LOCATION_ID}\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "reserve-components returns status=done" "done" "$reserve_status"

# ── 5. Four reservations created ─────────────────────────────────────────────
ir_count=$(curl -s "${INV}/inventory-reservations" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /inventory-reservations returns 4 after command" "4" "$ir_count"

# ── 6. PumpCasing reservation is in state=reserved ───────────────────────────
pc_state=$(curl -s "${INV}/inventory-reservations" \
  | python3 -c "
import sys, json
items = json.load(sys.stdin)
for item in items:
    for k, v in item.items():
        if 'reservationCode' in k and isinstance(v, dict):
            if 'PumpCasing' in str(v.get('value','')):
                for k2, v2 in item.items():
                    if 'state' in k2 and isinstance(v2, dict):
                        print(v2.get('value',''))
                        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "PumpCasing reservation state=reserved" "reserved" "$pc_state"

# ── 7. ElectricMotor reservation is in state=shortage ────────────────────────
em_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-ElectricMotor" \
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
check "ElectricMotor reservation state=shortage" "shortage" "$em_state"

# ── 8. InventoryBalance availableQuantity decremented for PumpCasing ─────────
pc_avail=$(curl -s "${ORION}/ngsi-ld/v1/entities/urn:ngsi-ld:InventoryBalance:IB-PumpCasing-WH-STOCK" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'availableQuantity' in k and isinstance(v, dict):
        print(int(v.get('value', -1)))
        sys.exit(0)
print('-1')
" 2>/dev/null || echo "-1")
check "PumpCasing availableQuantity decremented to 40" "40" "$pc_avail"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
