#!/usr/bin/env bash
# Tutorial 06 automated assertions — Work orders and finite-capacity scheduling
# Prerequisites: stack up (scheduler-service included), TUTORIAL=06 make seed
#   (file is self-contained: includes T01+T02+T03+T04+T05 entities)
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
SCHED="${SCHED_URL:-http://localhost:8084}"
ORDER_ID="urn:ngsi-ld:ManufacturingOrder:MO-2024-001"
PLANNED_START="2024-07-01T08:00:00Z"

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
echo "=== Tutorial 06 Assertions ==="
echo ""

# ── 1. scheduler-service health ───────────────────────────────────────────────
status=$(curl -s "${SCHED}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "scheduler-service health" "ok" "$status"

version=$(curl -s "${SCHED}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version',''))" 2>/dev/null || echo "")
check "scheduler-service version is 0.6.0" "0.6.0" "$version"

# ── 2. No work orders exist before command ────────────────────────────────────
wo_pre=$(curl -s "${SCHED}/work-orders" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /work-orders returns 0 before command" "0" "$wo_pre"

# ── 3. create-work-orders command succeeds ────────────────────────────────────
create_status=$(curl -s -X POST "${SCHED}/commands/create-work-orders" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"${ORDER_ID}\", \"planned_start\": \"${PLANNED_START}\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "create-work-orders returns status=done" "done" "$create_status"

# ── 4. Three work orders created ──────────────────────────────────────────────
wo_count=$(curl -s "${SCHED}/work-orders" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /work-orders returns 3 after command" "3" "$wo_count"

# ── 5. Assembly WorkOrder state=planned ───────────────────────────────────────
asm_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly" \
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
check "Assembly WorkOrder state=planned" "planned" "$asm_state"

# ── 6. Assembly WorkOrder assigned to WC-Assembly ─────────────────────────────
asm_wc=$(curl -s "${ORION}/ngsi-ld/v1/entities/urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'workCenter' in k and isinstance(v, dict):
        print(v.get('object', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "Assembly WorkOrder workCenter=WC-Assembly" "urn:ngsi-ld:WorkCenter:WC-Assembly" "$asm_wc"

# ── 7. Work orders are sequential (Assembly.plannedEnd == LeakTest.plannedStart) ──
asm_end=$(curl -s "${ORION}/ngsi-ld/v1/entities/urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'plannedEnd' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")

lt_start=$(curl -s "${ORION}/ngsi-ld/v1/entities/urn:ngsi-ld:WorkOrder:WO-MO-2024-001-LeakTest" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'plannedStart' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")

check "Assembly.plannedEnd == LeakTest.plannedStart (sequential)" "$asm_end" "$lt_start"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
