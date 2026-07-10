#!/usr/bin/env bash
# Tutorial 09 automated assertions — Quality inspection, rework, and alerting
# Prerequisites: stack up (quality-service included), TUTORIAL=09 make seed
#   (file is self-contained: identical to T08's 30 entities — 3 WorkOrders completed)
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
QS="${QS_URL:-http://localhost:8087}"
WO_LEAKTEST="urn:ngsi-ld:WorkOrder:WO-MO-2024-001-LeakTest"

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
echo "=== Tutorial 09 Assertions ==="
echo ""

# ── 1. quality-service health ─────────────────────────────────────────────────
status=$(curl -s "${QS}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "quality-service health" "ok" "$status"

version=$(curl -s "${QS}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version',''))" 2>/dev/null || echo "")
check "quality-service version is 0.9.0" "0.9.0" "$version"

# ── 2. inspect-work-order finds a leak-test failure, disposition=rework ──────
inspect_response=$(curl -s -X POST "${QS}/commands/inspect-work-order" \
  -H "Content-Type: application/json" \
  -d "{
    \"work_order_id\": \"${WO_LEAKTEST}\",
    \"check_type\": \"leak_test\",
    \"expected_value\": 0,
    \"actual_value\": 0.2,
    \"tolerance\": 0.1,
    \"quantity_inspected\": 10,
    \"quantity_failed\": 2,
    \"disposition\": \"rework\",
    \"reason_code\": \"seal_leak\"
  }")
inspect_status=$(echo "$inspect_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "inspect-work-order returns status=done" "done" "$inspect_status"

result=$(echo "$inspect_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',''))" 2>/dev/null || echo "")
check "QualityCheck result=fail" "fail" "$result"

rework_id=$(echo "$inspect_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('rework_order_id',''))" 2>/dev/null || echo "")
check "ReworkOrder created" "urn:ngsi-ld:ReworkOrder:RW-WO-MO-2024-001-LeakTest" "$rework_id"

alert_id=$(echo "$inspect_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('quality_alert_id',''))" 2>/dev/null || echo "")
check "QualityAlert created (20% failure rate)" "urn:ngsi-ld:QualityAlert:QA-WO-MO-2024-001-LeakTest" "$alert_id"

severity=$(echo "$inspect_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('severity',''))" 2>/dev/null || echo "")
check "QualityAlert severity=high" "high" "$severity"

# ── 3. ReworkOrder state=planned in broker ────────────────────────────────────
rw_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/${rework_id}" \
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
check "ReworkOrder state=planned" "planned" "$rw_state"

# ── 4. Queries return the created entities ────────────────────────────────────
qc_count=$(curl -s "${QS}/quality-checks?work_order_id=${WO_LEAKTEST}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /quality-checks returns at least 1" "1" "$([ "$qc_count" -ge 1 ] && echo 1 || echo 0)"

rw_count=$(curl -s "${QS}/rework-orders" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /rework-orders returns at least 1" "1" "$([ "$rw_count" -ge 1 ] && echo 1 || echo 0)"

# ── 5. Complete the rework order ──────────────────────────────────────────────
complete_response=$(curl -s -X POST "${QS}/commands/complete-rework-order" \
  -H "Content-Type: application/json" \
  -d "{\"rework_order_id\": \"${rework_id}\"}")
complete_status=$(echo "$complete_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "complete-rework-order returns status=completed" "completed" "$complete_status"

rw_state_after=$(curl -s "${ORION}/ngsi-ld/v1/entities/${rework_id}" \
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
check "ReworkOrder state=completed after command" "completed" "$rw_state_after"

recomplete_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${QS}/commands/complete-rework-order" \
  -H "Content-Type: application/json" \
  -d "{\"rework_order_id\": \"${rework_id}\"}")
check "Re-completing an already-completed rework order is rejected" "422" "$recomplete_status"

# ── 6. Acknowledge the quality alert ──────────────────────────────────────────
ack_response=$(curl -s -X POST "${QS}/commands/acknowledge-quality-alert" \
  -H "Content-Type: application/json" \
  -d "{\"alert_id\": \"${alert_id}\"}")
ack_status=$(echo "$ack_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "acknowledge-quality-alert returns status=done" "done" "$ack_status"

alert_status_after=$(curl -s "${ORION}/ngsi-ld/v1/entities/${alert_id}" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'status' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check "QualityAlert status=acknowledged after command" "acknowledged" "$alert_status_after"

reack_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${QS}/commands/acknowledge-quality-alert" \
  -H "Content-Type: application/json" \
  -d "{\"alert_id\": \"${alert_id}\"}")
check "Re-acknowledging an already-acknowledged alert is rejected" "422" "$reack_status"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
