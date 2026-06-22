#!/usr/bin/env bash
# Tutorial 01 — demo walkthrough (pretty-printed).
# Queries use the expanded MRP type IRIs for host-to-broker queries,
# and the Link header for retrieving single entities with full context.
set -euo pipefail

ORION="${ORION_URL:-http://localhost:1026}"
MRP="https://fiware-mrp.io/ontology/mrp%23"

step() { echo ""; echo "──────────────────────────────────────────"; echo "▶  $1"; echo "──────────────────────────────────────────"; }

step "Orion-LD version"
curl -s "${ORION}/ngsi-ld/ex/v1/version" | python3 -m json.tool

step "Context server — available contexts"
curl -s http://localhost:3000/ | python3 -m json.tool

step "MRP API health"
curl -s http://localhost:8080/health | python3 -m json.tool

step "Plant (key-values) — 1 expected"
curl -s "${ORION}/ngsi-ld/v1/entities?type=${MRP}Plant&options=keyValues" \
  | python3 -m json.tool

step "WorkCenters (key-values) — 3 expected"
curl -s "${ORION}/ngsi-ld/v1/entities?type=${MRP}WorkCenter&options=keyValues" \
  | python3 -m json.tool

step "Products (key-values) — 5 expected"
curl -s "${ORION}/ngsi-ld/v1/entities?type=${MRP}Product&options=keyValues" \
  | python3 -m json.tool

step "StockLocations (key-values) — 2 expected"
curl -s "${ORION}/ngsi-ld/v1/entities?type=${MRP}StockLocation&options=keyValues" \
  | python3 -m json.tool

step "Plant Barcelona — normalized (with Relationships)"
curl -s \
  -H 'Accept: application/ld+json' \
  "${ORION}/ngsi-ld/v1/entities/urn:ngsi-ld:Plant:Plant-BCN" \
  | python3 -m json.tool

step "Manufactured products only"
curl -s "${ORION}/ngsi-ld/v1/entities?type=${MRP}Product&q=${MRP}productType==%22manufactured%22&options=keyValues" \
  | python3 -m json.tool

echo ""
echo "Demo complete."
