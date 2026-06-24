#!/usr/bin/env bash
# Tutorial 03 — Bill of Materials and BoM explosion
# Run: make test-03   (stack must be up with bom-service and T01+T03 seed data loaded)

set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
BOM="${BOM_URL:-http://localhost:8082}"
CTX="http://localhost:3000/contexts/mrp/v0.1/context.jsonld"
LINK="<${CTX}>; rel=\"http://www.w3.org/ns/json-ld#context\"; type=\"application/ld+json\""

PASS=0; FAIL=0

assert() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  PASS  $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $desc"
    echo "        expected: $expected"
    echo "        actual:   $actual"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "=== Tutorial 03: Bill of Materials ==="
echo ""

# ── 1. bom-service health ──────────────────────────────────────────────────────
echo "Step 1: bom-service health"
STATUS=$(curl -s "${BOM}/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))")
assert "bom-service reports status=ok" "ok" "$STATUS"

# ── 2. Seed T01 + T03 data (idempotent) ───────────────────────────────────────
echo "Step 2: seed tutorial-01 and tutorial-03 data"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${ORION}/ngsi-ld/v1/entityOperations/upsert" \
  -H "Content-Type: application/ld+json" \
  -d @<(python3 -c "
import json, pathlib
ctx = '${CTX}'
entities = []
for f in ['tutorial-01.json', 'tutorial-03.json']:
    data = json.loads(pathlib.Path('/app/data/' + f).read_text())
    for e in data:
        e['@context'] = ctx
        entities.append(e)
print(json.dumps(entities))
") 2>/dev/null || echo "000")

# Accept 201 (created) or 204 (all updated / idempotent)
if [ "$HTTP" = "201" ] || [ "$HTTP" = "204" ]; then
  echo "  PASS  seed upsert returned HTTP $HTTP"
  PASS=$((PASS+1))
else
  echo "  FAIL  seed upsert returned HTTP $HTTP (expected 201 or 204)"
  FAIL=$((FAIL+1))
fi

# ── 3. Query BillOfMaterials via bom-service ───────────────────────────────────
echo "Step 3: query BillOfMaterials"
BOM_COUNT=$(curl -s "${BOM}/boms" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
assert "1 BillOfMaterials entity exists" "1" "$BOM_COUNT"

# ── 4. Query BOM lines ─────────────────────────────────────────────────────────
echo "Step 4: query BillOfMaterialsLine"
BOM_ID="urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1"
LINE_COUNT=$(curl -s "${BOM}/boms/${BOM_ID}/lines" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
assert "4 BillOfMaterialsLine entities for BOM-HP-P100-v1" "4" "$LINE_COUNT"

# ── 5. Explode BoM for 10 units ────────────────────────────────────────────────
echo "Step 5: explode BOM for 10 units of HydraulicPump-P100"
EXPLODE=$(curl -s -X POST "${BOM}/commands/explode-bom" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"urn:ngsi-ld:Product:HydraulicPump-P100","quantity":10}')

SEAL_QTY=$(echo "$EXPLODE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
seal = next((c for c in d.get('components', []) if c['component_code'] == 'SealKit'), None)
print(seal['required_quantity'] if seal else 'missing')
")
assert "SealKit required_quantity = 20 (qty 2 × order 10, no scrap)" "20" "$SEAL_QTY"

# ── 6. Inspect BillOfMaterials entity directly from broker ─────────────────────
echo "Step 6: GET BillOfMaterials entity from Orion-LD"
BOM_STATE=$(curl -s \
  -H "Link: ${LINK}" \
  -H "Accept: application/ld+json" \
  "${ORION}/ngsi-ld/v1/entities/${BOM_ID}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
state = d.get('state', {})
print(state.get('value', '') if isinstance(state, dict) else str(state))
")
assert "BOM entity state = active" "active" "$BOM_STATE"

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
