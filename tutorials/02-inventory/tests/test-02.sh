#!/usr/bin/env bash
# Tutorial 02 automated assertions — inventory balances after receive-material
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
INV="${INVENTORY_URL:-http://localhost:8081}"
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
echo "=== Tutorial 02 Assertions ==="
echo ""

# ── 1. Inventory service health ───────────────────────────────────────────────
status=$(curl -s "$INV/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "Inventory service health" "ok" "$status"

# ── 2. Receive 50 PumpCasing into WH-STOCK ───────────────────────────────────
recv1=$(curl -s -X POST "$INV/commands/receive-material" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"urn:ngsi-ld:Product:PumpCasing","location_id":"urn:ngsi-ld:StockLocation:WH-STOCK","quantity":50,"unit":"EA","reference":"PO-2024-001"}')
recv1_status=$(echo "$recv1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "Receive 50 PumpCasing (status)" "done" "$recv1_status"

recv1_qty=$(echo "$recv1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d.get('quantity_on_hand',0)))" 2>/dev/null || echo "0")
check "Receive 50 PumpCasing (quantity_on_hand)" "50" "$recv1_qty"

# ── 3. Receive 30 Impeller with lot LOT-240001 ───────────────────────────────
recv2=$(curl -s -X POST "$INV/commands/receive-material" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"urn:ngsi-ld:Product:Impeller","location_id":"urn:ngsi-ld:StockLocation:WH-STOCK","quantity":30,"unit":"EA","lot_code":"LOT-240001","reference":"PO-2024-002"}')
recv2_status=$(echo "$recv2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "Receive 30 Impeller lot LOT-240001 (status)" "done" "$recv2_status"

# ── 4. Lot entity created in Orion-LD ────────────────────────────────────────
lot_state=$(curl -s "$ORION/ngsi-ld/v1/entities/urn:ngsi-ld:Lot:LOT-240001" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
# look for state regardless of IRI expansion
for k, v in d.items():
    if 'state' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "Lot LOT-240001 state in Orion-LD" "active" "$lot_state"

# ── 5. InventoryBalance count in Orion-LD ────────────────────────────────────
ib_count=$(curl -s "$ORION/ngsi-ld/v1/entities?type=${MRP_NS}InventoryBalance" \
  -H "Accept: application/ld+json" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "InventoryBalance count" "2" "$ib_count"

# ── 6. StockMove count in Orion-LD ───────────────────────────────────────────
sm_count=$(curl -s "$ORION/ngsi-ld/v1/entities?type=${MRP_NS}StockMove" \
  -H "Accept: application/ld+json" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "StockMove count (receipt moves)" "2" "$sm_count"

# ── 7. Receive more PumpCasing — balance must accumulate ─────────────────────
recv3=$(curl -s -X POST "$INV/commands/receive-material" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"urn:ngsi-ld:Product:PumpCasing","location_id":"urn:ngsi-ld:StockLocation:WH-STOCK","quantity":20,"unit":"EA","reference":"PO-2024-003"}')
recv3_qty=$(echo "$recv3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d.get('quantity_on_hand',0)))" 2>/dev/null || echo "0")
check "Second PumpCasing receipt accumulates to 70" "70" "$recv3_qty"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
