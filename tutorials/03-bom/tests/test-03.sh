#!/usr/bin/env bash
# Tutorial 03 automated assertions — Bill of Materials and BoM explosion
# Prerequisites: stack up, TUTORIAL=01 make seed && TUTORIAL=03 make seed
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
BOM="${BOM_URL:-http://localhost:8082}"
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
echo "=== Tutorial 03 Assertions ==="
echo ""

# ── 1. bom-service health ─────────────────────────────────────────────────────
status=$(curl -s "${BOM}/health" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "unreachable")
check "bom-service health" "ok" "$status"

# ── 2. BillOfMaterials count in Orion-LD (seed verification) ─────────────────
bom_count=$(curl -s "${ORION}/ngsi-ld/v1/entities?type=${MRP_NS}BillOfMaterials" \
  -H "Accept: application/ld+json" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "1 BillOfMaterials entity in Orion-LD" "1" "$bom_count"

# ── 3. BillOfMaterials via bom-service /boms ──────────────────────────────────
svc_bom_count=$(curl -s "${BOM}/boms" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /boms returns 1 BillOfMaterials" "1" "$svc_bom_count"

# ── 4. BillOfMaterialsLine count for BOM-HP-P100-v1 ──────────────────────────
BOM_ID="urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1"
line_count=$(curl -s "${BOM}/boms/${BOM_ID}/lines" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
check "GET /boms/{id}/lines returns 4 BillOfMaterialsLine" "4" "$line_count"

# ── 5. Explode BoM for 10 units — SealKit must be 20 ─────────────────────────
explode=$(curl -s -X POST "${BOM}/commands/explode-bom" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"urn:ngsi-ld:Product:HydraulicPump-P100","quantity":10}')

seal_qty=$(echo "$explode" | python3 -c "
import sys, json
d = json.load(sys.stdin)
seal = next((c for c in d.get('components', []) if c['component_code'] == 'SealKit'), None)
print(int(seal['required_quantity']) if seal else 'missing')
" 2>/dev/null || echo "error")
check "Explode-bom 10 units → SealKit required_quantity=20" "20" "$seal_qty"

# ── 6. BOM entity state=active in Orion-LD ────────────────────────────────────
bom_state=$(curl -s "${ORION}/ngsi-ld/v1/entities/${BOM_ID}" \
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
check "BillOfMaterials state in Orion-LD" "active" "$bom_state"

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed."
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
