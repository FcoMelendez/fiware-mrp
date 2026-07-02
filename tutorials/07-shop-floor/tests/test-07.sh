#!/usr/bin/env bash
# Tutorial 07 automated assertions — Shop-floor execution (start/complete WorkOrders)
# Prerequisites: stack up (shopfloor-service included), TUTORIAL=07 make seed
#   (file is self-contained: includes T01–T06 entities + 3 WorkOrders in planned state)
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
SF="${SF_URL:-http://localhost:8085}"
WO_ASSEMBLY="urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly"

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
echo "=== Tutorial 07 Assertions ==="
echo ""

# ── 1. shopfloor-service health ───────────────────────────────────────────────
status=$(curl -s "${SF}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "shopfloor-service health" "ok" "$status"

version=$(curl -s "${SF}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version',''))" 2>/dev/null || echo "")
check "shopfloor-service version is 0.7.0" "0.7.0" "$version"

# ── 2. start-work-order transitions Assembly to in_progress ──────────────────
start_status=$(curl -s -X POST "${SF}/commands/start-work-order" \
  -H "Content-Type: application/json" \
  -d "{\"work_order_id\": \"${WO_ASSEMBLY}\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "start-work-order returns status=done" "done" "$start_status"

# ── 3. Assembly WorkOrder state=in_progress in broker ────────────────────────
asm_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/${WO_ASSEMBLY}" \
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
check "Assembly WorkOrder state=in_progress" "in_progress" "$asm_state"

# ── 4. complete-work-order transitions Assembly to completed ──────────────────
complete_status=$(curl -s -X POST "${SF}/commands/complete-work-order" \
  -H "Content-Type: application/json" \
  -d "{\"work_order_id\": \"${WO_ASSEMBLY}\", \"quantity_produced\": 10}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "complete-work-order returns status=done" "done" "$complete_status"

# ── 5. Assembly WorkOrder state=completed in broker ───────────────────────────
asm_final=$(curl -s "${ORION}/ngsi-ld/v1/entities/${WO_ASSEMBLY}" \
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
check "Assembly WorkOrder state=completed" "completed" "$asm_final"

# ── 6. ProductionEvent created for completed work order ───────────────────────
pe_count=$(curl -s "${SF}/production-events" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /production-events returns at least 1" "1" "$([ "$pe_count" -ge 1 ] && echo 1 || echo 0)"

# ── 7. ProductionEvent eventType=work_order_completed ────────────────────────
pe_type=$(curl -s "${SF}/production-events" \
  | python3 -c "
import sys, json
events = json.load(sys.stdin)
if not events:
    print('')
    sys.exit(0)
last = events[-1]
for k, v in last.items():
    if 'eventType' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "Latest ProductionEvent eventType=work_order_completed" "work_order_completed" "$pe_type"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
