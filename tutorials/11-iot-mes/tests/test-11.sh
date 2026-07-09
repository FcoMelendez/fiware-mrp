#!/usr/bin/env bash
# Tutorial 11 automated assertions — IoT/MES signals and derived machine state
# Prerequisites: stack up (iot-simulator included), TUTORIAL=11 make seed
#   (file is self-contained: T10's 33 entities + an Operator)
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
IOT="${IOT_URL:-http://localhost:8089}"
WC_ASSEMBLY="urn:ngsi-ld:WorkCenter:WC-Assembly"
OPERATOR="urn:ngsi-ld:Operator:OP-JaneDoe"
MST_ID="urn:ngsi-ld:MachineState:MST-WC-Assembly"

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
echo "=== Tutorial 11 Assertions ==="
echo ""

# ── 1. iot-simulator health ────────────────────────────────────────────────────
status=$(curl -s "${IOT}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "iot-simulator health" "ok" "$status"

version=$(curl -s "${IOT}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version',''))" 2>/dev/null || echo "")
check "iot-simulator version is 0.11.0" "0.11.0" "$version"

# ── 2. emit-signal (normal reading) derives state=running ────────────────────
emit1=$(curl -s -X POST "${IOT}/commands/emit-signal" \
  -H "Content-Type: application/json" \
  -d "{\"work_center_id\": \"${WC_ASSEMBLY}\", \"signal_type\": \"temperature\", \"actual_value\": 65, \"unit_code\": \"CEL\", \"quality\": \"good\"}")
emit1_state=$(echo "$emit1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('state',''))" 2>/dev/null || echo "error")
check "emit-signal (65C, good) derives state=running" "running" "$emit1_state"

mst_running=$(curl -s "${ORION}/ngsi-ld/v1/entities/${MST_ID}" \
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
check "MachineState state=running in broker" "running" "$mst_running"

# ── 3. emit-signal (fault reading) overwrites the same MachineState ──────────
emit2=$(curl -s -X POST "${IOT}/commands/emit-signal" \
  -H "Content-Type: application/json" \
  -d "{\"work_center_id\": \"${WC_ASSEMBLY}\", \"signal_type\": \"temperature\", \"actual_value\": 92, \"unit_code\": \"CEL\", \"quality\": \"bad\"}")
emit2_state=$(echo "$emit2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('state',''))" 2>/dev/null || echo "error")
check "emit-signal (92C, bad) derives state=fault" "fault" "$emit2_state"

mst_fault=$(curl -s "${ORION}/ngsi-ld/v1/entities/${MST_ID}" \
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
check "MachineState state=fault in broker (overwritten, not duplicated)" "fault" "$mst_fault"

mst_count=$(curl -s "${IOT}/machine-states" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "Exactly 1 MachineState exists for WC-Assembly" "1" "$mst_count"

# ── 4. clock-in / clock-out ────────────────────────────────────────────────────
clockin=$(curl -s -X POST "${IOT}/commands/clock-in" \
  -H "Content-Type: application/json" \
  -d "{\"operator_id\": \"${OPERATOR}\", \"work_center_id\": \"${WC_ASSEMBLY}\"}")
clockin_status=$(echo "$clockin" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "clock-in returns status=done" "done" "$clockin_status"

assignment_id=$(echo "$clockin" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('assignment_id',''))" 2>/dev/null || echo "")
timer_status_1=$(echo "$clockin" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('timer_status',''))" 2>/dev/null || echo "")
check "clock-in timer_status=clocked_in" "clocked_in" "$timer_status_1"

clockout=$(curl -s -X POST "${IOT}/commands/clock-out" \
  -H "Content-Type: application/json" \
  -d "{\"assignment_id\": \"${assignment_id}\"}")
clockout_status=$(echo "$clockout" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "clock-out returns status=done" "done" "$clockout_status"

timer_status_2=$(echo "$clockout" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('timer_status',''))" 2>/dev/null || echo "")
check "clock-out timer_status=clocked_out" "clocked_out" "$timer_status_2"

duration=$(echo "$clockout" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('actual_duration_hours',''))" 2>/dev/null || echo "")
check "actual_duration_hours >= 0" "1" "$(python3 -c "print(1 if float('${duration}' or -1) >= 0 else 0)" 2>/dev/null || echo 0)"

# ── 5. OperatorAssignment persisted correctly in broker (POST /attrs) ────────
oa_timer_status=$(curl -s "${ORION}/ngsi-ld/v1/entities/${assignment_id}" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'timerStatus' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "OperatorAssignment timerStatus=clocked_out persisted in broker" "clocked_out" "$oa_timer_status"

# ── 6. Query endpoints ────────────────────────────────────────────────────────
signal_count=$(curl -s "${IOT}/machine-signals" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /machine-signals returns at least 2 (both immutable readings)" "1" "$([ "$signal_count" -ge 2 ] && echo 1 || echo 0)"

oa_count=$(curl -s "${IOT}/operator-assignments" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /operator-assignments returns at least 1" "1" "$([ "$oa_count" -ge 1 ] && echo 1 || echo 0)"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
