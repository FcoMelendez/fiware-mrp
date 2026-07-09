#!/usr/bin/env bash
# Tutorial 12 automated assertions — the full end-to-end demo.
# Drives every tutorial's commands (T02-T11) once, in sequence, against a
# single continuously-running stack: forecast -> MPS -> confirmed MO ->
# reservations -> work orders -> shop-floor execution (with IoT signals and
# operator clock-in/out) -> quality inspection -> finished-goods receipt.
# Prerequisites: full stack up, TUTORIAL=12 make seed
# Note: MO-2024-002 is walked through its full lifecycle exactly once. Re-running
# this script against the same broker without reseeding will fail (WorkOrders are
# already completed, ProductionEvent IDs are deterministic and create-only) — use
# `make reset && make seed TUTORIAL=12` (or `make test-12`, which does this for you)
# for a clean re-run.
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
BOM="${BOM_URL:-http://localhost:8082}"
INV="${INVENTORY_URL:-http://localhost:8081}"
MFG="${MFG_URL:-http://localhost:8083}"
SCHED="${SCHEDULER_URL:-http://localhost:8084}"
SHOP="${SHOPFLOOR_URL:-http://localhost:8085}"
FG="${FG_URL:-http://localhost:8086}"
QUAL="${QUALITY_URL:-http://localhost:8087}"
MPS="${MPS_URL:-http://localhost:8088}"
IOT="${IOT_URL:-http://localhost:8089}"

PRODUCT="urn:ngsi-ld:Product:HydraulicPump-P100"
MO="urn:ngsi-ld:ManufacturingOrder:MO-2024-002"
DF="urn:ngsi-ld:DemandForecast:DF-HydraulicPump-P100-2024-09"
OPERATOR="urn:ngsi-ld:Operator:OP-JaneDoe"
WC_ASSEMBLY="urn:ngsi-ld:WorkCenter:WC-Assembly"
WO_ASSEMBLY="urn:ngsi-ld:WorkOrder:WO-MO-2024-002-Assembly"
WO_LEAKTEST="urn:ngsi-ld:WorkOrder:WO-MO-2024-002-LeakTest"
WO_PACKAGING="urn:ngsi-ld:WorkOrder:WO-MO-2024-002-Packaging"

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

jget() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))" 2>/dev/null || echo ""; }

get_entity_attr() {
  # $1 = entity id, $2 = attribute name (matches by suffix so short or expanded keys both work)
  curl -s "${ORION}/ngsi-ld/v1/entities/$1" -H "Accept: application/ld+json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if k == '$2' or k.endswith('#$2'):
        if isinstance(v, dict):
            print(v.get('value', v.get('object', '')))
        else:
            print(v)
        sys.exit(0)
print('')
" 2>/dev/null || echo ""
}

echo ""
echo "=== Tutorial 12 — End-to-end demo ==="
echo ""

# ── 0. Full stack health ───────────────────────────────────────────────────────
for pair in "bom-service:$BOM" "inventory-service:$INV" "manufacturing-service:$MFG" \
            "scheduler-service:$SCHED" "shopfloor-service:$SHOP" "finished-goods-service:$FG" \
            "quality-service:$QUAL" "mps-service:$MPS" "iot-simulator:$IOT"; do
  name="${pair%%:*}"; url="${pair#*:}"
  status=$(curl -s "${url}/health" | jget status || echo "unreachable")
  check "$name health" "ok" "$status"
done

# ── 1. Tutorial 03 — explode-bom for the demo quantity ────────────────────────
explode=$(curl -s -X POST "${BOM}/commands/explode-bom" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\": \"${PRODUCT}\", \"quantity\": 5}")
component_count=$(echo "$explode" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('components',[])))" 2>/dev/null || echo "0")
check "explode-bom returns 4 component lines" "4" "$component_count"

# ── 2. Tutorial 02 — receive-material tops up PumpCasing stock ───────────────
receive=$(curl -s -X POST "${INV}/commands/receive-material" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\": \"urn:ngsi-ld:Product:PumpCasing\", \"location_id\": \"urn:ngsi-ld:StockLocation:WH-STOCK\", \"quantity\": 10, \"reference\": \"T12 E2E replenishment\"}")
new_qty=$(echo "$receive" | jget quantity_on_hand)
check "receive-material tops PumpCasing up to 60" "60.0" "$new_qty"

# ── 3. Tutorial 10 — generate & confirm the MPS suggestion ───────────────────
mps=$(curl -s -X POST "${MPS}/commands/generate-mps" \
  -H "Content-Type: application/json" \
  -d "{\"demand_forecast_id\": \"${DF}\"}")
suggested=$(echo "$mps" | jget suggested_production_quantity)
check "generate-mps suggests 5 units (safety stock 3, forecast 2, on-hand 0)" "5.0" "$suggested"

mps_line_id=$(echo "$mps" | jget mps_line_id)
mps_confirm=$(curl -s -X POST "${MPS}/commands/confirm-mps-line" \
  -H "Content-Type: application/json" \
  -d "{\"mps_line_id\": \"${mps_line_id}\"}")
mps_state=$(echo "$mps_confirm" | jget state)
check "confirm-mps-line sets state=confirmed" "confirmed" "$mps_state"

# ── 4. Tutorial 04 — confirm the ManufacturingOrder ───────────────────────────
mo_confirm=$(curl -s -X POST "${MFG}/commands/confirm-manufacturing-order" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"${MO}\"}")
mo_state=$(echo "$mo_confirm" | jget status)
check "confirm-manufacturing-order sets state=confirmed" "confirmed" "$mo_state"

# ── 5. Tutorial 05 — reserve components (no shortage: inventory is generous) ─
reserve=$(curl -s -X POST "${INV}/commands/reserve-components" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"${MO}\"}")
reserved_count=$(echo "$reserve" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('summary',{}).get('reserved',0))" 2>/dev/null || echo "0")
check "reserve-components reserves all 4 components in full" "4" "$reserved_count"

# ── 6. Tutorial 06 — schedule work orders ─────────────────────────────────────
create_wo=$(curl -s -X POST "${SCHED}/commands/create-work-orders" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"${MO}\"}")
wo_count=$(echo "$create_wo" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('work_orders',[])))" 2>/dev/null || echo "0")
check "create-work-orders creates 3 work orders (Assembly, LeakTest, Packaging)" "3" "$wo_count"

# ── 7. Tutorial 07 + 11 — execute Assembly with IoT signal + operator clock-in ─
clockin=$(curl -s -X POST "${IOT}/commands/clock-in" \
  -H "Content-Type: application/json" \
  -d "{\"operator_id\": \"${OPERATOR}\", \"work_center_id\": \"${WC_ASSEMBLY}\"}")
assignment_id=$(echo "$clockin" | jget assignment_id)
check "clock-in returns status=done" "done" "$(echo "$clockin" | jget status)"

start_asm=$(curl -s -X POST "${SHOP}/commands/start-work-order" \
  -H "Content-Type: application/json" \
  -d "{\"work_order_id\": \"${WO_ASSEMBLY}\"}")
check "start-work-order (Assembly) -> in_progress" "in_progress" "$(echo "$start_asm" | jget state)"

emit=$(curl -s -X POST "${IOT}/commands/emit-signal" \
  -H "Content-Type: application/json" \
  -d "{\"work_center_id\": \"${WC_ASSEMBLY}\", \"signal_type\": \"temperature\", \"actual_value\": 65, \"unit_code\": \"CEL\", \"quality\": \"good\"}")
check "emit-signal (65C, good) derives state=running" "running" "$(echo "$emit" | jget state)"

complete_asm=$(curl -s -X POST "${SHOP}/commands/complete-work-order" \
  -H "Content-Type: application/json" \
  -d "{\"work_order_id\": \"${WO_ASSEMBLY}\", \"quantity_produced\": 5}")
check "complete-work-order (Assembly) -> completed" "completed" "$(echo "$complete_asm" | jget state)"

clockout=$(curl -s -X POST "${IOT}/commands/clock-out" \
  -H "Content-Type: application/json" \
  -d "{\"assignment_id\": \"${assignment_id}\"}")
check "clock-out returns timer_status=clocked_out" "clocked_out" "$(echo "$clockout" | jget timer_status)"

# ── 8. Tutorial 07 — execute LeakTest, then Tutorial 09 quality inspection ────
curl -s -X POST "${SHOP}/commands/start-work-order" -H "Content-Type: application/json" \
  -d "{\"work_order_id\": \"${WO_LEAKTEST}\"}" > /dev/null
complete_lt=$(curl -s -X POST "${SHOP}/commands/complete-work-order" \
  -H "Content-Type: application/json" \
  -d "{\"work_order_id\": \"${WO_LEAKTEST}\", \"quantity_produced\": 5}")
check "complete-work-order (LeakTest) -> completed" "completed" "$(echo "$complete_lt" | jget state)"

inspect=$(curl -s -X POST "${QUAL}/commands/inspect-work-order" \
  -H "Content-Type: application/json" \
  -d "{\"work_order_id\": \"${WO_LEAKTEST}\", \"check_type\": \"leak_test\", \"expected_value\": 0, \"actual_value\": 0, \"tolerance\": 0.1, \"quantity_inspected\": 5}")
check "inspect-work-order (LeakTest) -> result=pass" "pass" "$(echo "$inspect" | jget result)"

# ── 9. Tutorial 07 — execute Packaging ────────────────────────────────────────
curl -s -X POST "${SHOP}/commands/start-work-order" -H "Content-Type: application/json" \
  -d "{\"work_order_id\": \"${WO_PACKAGING}\"}" > /dev/null
complete_pkg=$(curl -s -X POST "${SHOP}/commands/complete-work-order" \
  -H "Content-Type: application/json" \
  -d "{\"work_order_id\": \"${WO_PACKAGING}\", \"quantity_produced\": 5}")
check "complete-work-order (Packaging) -> completed" "completed" "$(echo "$complete_pkg" | jget state)"

# ── 10. Tutorial 08 — receive finished goods, closing out the MO ─────────────
receive_fg=$(curl -s -X POST "${FG}/commands/receive-finished-goods" \
  -H "Content-Type: application/json" \
  -d "{\"manufacturing_order_id\": \"${MO}\"}")
check "receive-finished-goods returns status=done" "done" "$(echo "$receive_fg" | jget status)"

# ── 11. Final traceability assertions — the full forecast-to-shelf graph ─────
mo_final_state=$(get_entity_attr "$MO" "state")
check "ManufacturingOrder is completed in the broker" "completed" "$mo_final_state"

fg_balance=$(get_entity_attr "urn:ngsi-ld:InventoryBalance:IB-HydraulicPump-P100-WH-FINISHED" "quantityOnHand")
check "Finished-goods stock went from 0 to 5" "5" "$fg_balance"

mst_state=$(get_entity_attr "urn:ngsi-ld:MachineState:MST-WC-Assembly" "state")
check "MachineState for Assembly is running" "running" "$mst_state"

oa_status=$(get_entity_attr "$assignment_id" "timerStatus")
check "OperatorAssignment persisted as clocked_out" "clocked_out" "$oa_status"

qc_result=$(get_entity_attr "urn:ngsi-ld:QualityCheck:QC-WO-MO-2024-002-LeakTest" "result")
check "QualityCheck persisted as pass" "pass" "$qc_result"

sm_movetype=$(get_entity_attr "urn:ngsi-ld:StockMove:SM-MO-2024-002-receipt" "moveType")
check "Finished-goods StockMove is a receipt" "receipt" "$sm_movetype"

wo_count_final=$(curl -s "${SCHED}/work-orders?order_id=${MO}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "All 3 WorkOrders for the MO exist" "3" "$wo_count_final"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
