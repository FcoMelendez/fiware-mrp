#!/usr/bin/env bash
# Tutorial 10 automated assertions — MPS-lite demand planning
# Prerequisites: stack up (mps-service included), TUTORIAL=10 make seed
#   (file is self-contained: T09's 30 entities + IB/DemandForecast/ReorderingRule for HydraulicPump-P100)
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
MPS="${MPS_URL:-http://localhost:8088}"
DF_ID="urn:ngsi-ld:DemandForecast:DF-HydraulicPump-P100-2024-08"
MPSL_ID="urn:ngsi-ld:MasterProductionScheduleLine:MPSL-HydraulicPump-P100-2024-08"

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

# Numeric comparison — avoids false failures from float formatting (10 vs 10.0)
check_num() {
  local desc="$1" expected="$2" actual="$3"
  if python3 -c "import sys; sys.exit(0 if abs(float('$actual') - float('$expected')) < 1e-6 else 1)" 2>/dev/null; then
    echo "[PASS] $desc: expected $expected, got $actual"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $desc: expected $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== Tutorial 10 Assertions ==="
echo ""

# ── 1. mps-service health ──────────────────────────────────────────────────────
status=$(curl -s "${MPS}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "mps-service health" "ok" "$status"

version=$(curl -s "${MPS}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version',''))" 2>/dev/null || echo "")
check "mps-service version is 0.10.0" "0.10.0" "$version"

# ── 2. generate-mps computes projected inventory and suggested quantity ──────
gen_response=$(curl -s -X POST "${MPS}/commands/generate-mps" \
  -H "Content-Type: application/json" \
  -d "{\"demand_forecast_id\": \"${DF_ID}\"}")
gen_status=$(echo "$gen_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "generate-mps returns status=done" "done" "$gen_status"

projected=$(echo "$gen_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('projected_inventory',''))" 2>/dev/null || echo "")
check_num "projected_inventory = -7 (5 on hand - 12 forecast)" "-7" "$projected"

suggested=$(echo "$gen_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('suggested_production_quantity',''))" 2>/dev/null || echo "")
check_num "suggested_production_quantity = 10 (shortfall 10, rounded to lotSize 5)" "10" "$suggested"

# ── 3. MasterProductionScheduleLine state=suggested in broker ────────────────
mpsl_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/${MPSL_ID}" \
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
check "MasterProductionScheduleLine state=suggested" "suggested" "$mpsl_state"

# ── 4. confirm-mps-line defaults to the suggested quantity ────────────────────
confirm_response=$(curl -s -X POST "${MPS}/commands/confirm-mps-line" \
  -H "Content-Type: application/json" \
  -d "{\"mps_line_id\": \"${MPSL_ID}\"}")
confirm_status=$(echo "$confirm_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "error")
check "confirm-mps-line returns status=done" "done" "$confirm_status"

confirmed_qty=$(echo "$confirm_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('confirmed_production_quantity',''))" 2>/dev/null || echo "")
check_num "confirmed_production_quantity = 10" "10" "$confirmed_qty"

# ── 5. MasterProductionScheduleLine state=confirmed in broker ────────────────
mpsl_final=$(curl -s "${ORION}/ngsi-ld/v1/entities/${MPSL_ID}" \
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
check "MasterProductionScheduleLine state=confirmed" "confirmed" "$mpsl_final"

# ── 6. confirmedProductionQuantity persisted in broker (POST /attrs, not PATCH) ─
mpsl_confirmed_qty=$(curl -s "${ORION}/ngsi-ld/v1/entities/${MPSL_ID}" \
  -H "Accept: application/ld+json" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in d.items():
    if 'confirmedProductionQuantity' in k and isinstance(v, dict):
        print(v.get('value', ''))
        sys.exit(0)
print('')
" 2>/dev/null || echo "")
check_num "confirmedProductionQuantity persisted in broker" "10" "$mpsl_confirmed_qty"

# ── 7. Query endpoints ────────────────────────────────────────────────────────
df_count=$(curl -s "${MPS}/demand-forecasts" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /demand-forecasts returns at least 1" "1" "$([ "$df_count" -ge 1 ] && echo 1 || echo 0)"

mpsl_count=$(curl -s "${MPS}/mps-lines" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /mps-lines returns at least 1" "1" "$([ "$mpsl_count" -ge 1 ] && echo 1 || echo 0)"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
