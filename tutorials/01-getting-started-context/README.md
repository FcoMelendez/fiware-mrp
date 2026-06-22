# Tutorial 01 — Getting started with the FIWARE MRP context

## What you will build

A running FIWARE stack with a project-owned JSON-LD `@context` and a minimal factory
graph stored in the Orion-LD Context Broker. By the end of this tutorial you can
create, query and inspect NGSI-LD entities that represent a real manufacturing site —
company, plant, work centres, products and stock locations.

## Architecture of this tutorial

```
┌────────────────────────────────────────────────┐
│  Tutorial 01 stack                             │
│                                                │
│  ┌──────────────┐   NGSI-LD API  ┌──────────┐ │
│  │  seed-loader │ ─────────────► │ orion-ld │ │
│  └──────────────┘                └────┬─────┘ │
│                                       │        │
│  ┌──────────────┐   @context    ┌─────▼─────┐ │
│  │  mrp-api     │ ◄─────────── │ context-  │ │
│  │  (health)    │               │ server    │ │
│  └──────────────┘               └───────────┘ │
│                                       │        │
│                                  ┌────▼─────┐ │
│                                  │ mongodb  │ │
│                                  └──────────┘ │
└────────────────────────────────────────────────┘
```

Services introduced:
| Service | Port | Purpose |
|---|---|---|
| orion-ld | 1026 | NGSI-LD Context Broker |
| context-server | 3000 | Serves versioned JSON-LD @context |
| mrp-api | 8080 | MRP Business API (health only in Week 1) |
| mongo | 27017 | Orion-LD persistence (not exposed) |

## Models introduced

| Entity type | Description |
|---|---|
| `Company` | Legal or operating entity |
| `Plant` | Factory or production site |
| `WorkCenter` | Logical production resource |
| `Product` | Manufactured or purchased item |
| `StockLocation` | Physical or logical inventory location |

Seed data: 1 Company, 1 Plant, 3 WorkCenters, 5 Products, 2 StockLocations.

## Prerequisites

- Docker and Docker Compose v2 installed (`docker compose version`)
- `curl` and `jq` available in your shell
- Ports 1026, 3000, and 8080 free on localhost

## Start the stack

```bash
git clone <repo-url>
cd arise-fiware-mrp-reference

make start
```

Expected output ends with:
```
Orion-LD is ready.
```

Verify each service:

```bash
# Orion-LD version
curl -s http://localhost:1026/ngsi-ld/ex/v1/version | jq .

# Context server index
curl -s http://localhost:3000/

# MRP API health
curl -s http://localhost:8080/health | jq .
```

## Load seed data

```bash
make seed
```

Expected output:
```
INFO Orion-LD is ready.
INFO Upserting 12 entities via batch API ...
INFO Batch upsert completed (HTTP 201).
INFO Seed complete — 12 entities loaded for Tutorial 01.
```

## Exercise 1 — Query the factory graph

### List all Plants

```bash
curl -s \
  -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  'http://localhost:1026/ngsi-ld/v1/entities?type=Plant&options=keyValues' \
  | jq .
```

Expected: 1 Plant entity, `plantCode: "BCN"`.

### List all WorkCenters

```bash
curl -s \
  -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  'http://localhost:1026/ngsi-ld/v1/entities?type=WorkCenter&options=keyValues' \
  | jq .
```

Expected: 3 WorkCenters — Assembly, Leak Test Bench, Packaging.

### List all Products

```bash
curl -s \
  -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  'http://localhost:1026/ngsi-ld/v1/entities?type=Product&options=keyValues' \
  | jq .
```

Expected: 5 Products — HydraulicPump-P100, PumpCasing, Impeller, ElectricMotor, SealKit.

### List all StockLocations

```bash
curl -s \
  -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  'http://localhost:1026/ngsi-ld/v1/entities?type=StockLocation&options=keyValues' \
  | jq .
```

Expected: 2 StockLocations — WH-STOCK and WH-FINISHED.

## Exercise 2 — Inspect entity relationships (normalized format)

### Retrieve the Plant with all relationships

```bash
curl -s \
  -H 'Accept: application/ld+json' \
  -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  'http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:Plant:Plant-BCN' \
  | jq .
```

Note how the `ownedBy` attribute has `"type": "Relationship"` and `"object": "urn:ngsi-ld:Company:HydraulicPartsCo"`.

### Retrieve a WorkCenter

```bash
curl -s \
  -H 'Accept: application/ld+json' \
  -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  'http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:WorkCenter:WC-Assembly' \
  | jq .
```

Note the `locatedIn` Relationship pointing back to the Plant.

## Exercise 3 — Query by attribute value

### Find only manufactured products

```bash
curl -s \
  -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  'http://localhost:1026/ngsi-ld/v1/entities?type=Product&q=productType==%22manufactured%22&options=keyValues' \
  | jq .
```

Expected: 1 product — HydraulicPump-P100.

### Find all purchased components

```bash
curl -s \
  -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' \
  'http://localhost:1026/ngsi-ld/v1/entities?type=Product&q=productType==%22purchased%22&options=keyValues' \
  | jq .
```

Expected: 4 products — PumpCasing, Impeller, ElectricMotor, SealKit.

## Inspect the resulting NGSI-LD context

Open the context server in your browser or with curl:

```bash
# Full context file
curl -s http://localhost:3000/contexts/mrp/v0.1/context.jsonld | jq .

# Verify a term resolves correctly — "Plant" should map to mrp:Plant
curl -s http://localhost:3000/contexts/mrp/v0.1/context.jsonld \
  | jq '."@context".Plant'
```

## Automated tests

```bash
make test-01
```

The test script queries Orion-LD and asserts exact entity counts:

| Type | Expected count |
|---|---|
| Plant | 1 |
| WorkCenter | 3 |
| Product | 5 |
| StockLocation | 2 |

A passed test prints `[PASS]` for each assertion and exits 0.  
A failed test prints `[FAIL]` with the actual count and exits 1.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Orion-LD is ready` never appears | Run `docker compose logs orion-ld` — MongoDB might still be starting. Wait 30 s and retry. |
| Seed returns `HTTP 422` | The context server may not be reachable from the seed container. Check `docker compose logs context-server`. |
| `make seed` exits with 1 | Run `docker compose run --rm seed` to see the full Python traceback. |
| Entities not found after seed | Check that the batch upsert returned 201. Re-run `make seed` — it is idempotent. |

## Clean up

```bash
make reset
```

This stops all containers and removes the MongoDB volume so the next run starts clean.

## What comes next

**Tutorial 02 — Inventory balances and material receipts.**  
We receive components into the raw materials warehouse and query inventory
by product, location and lot. The `inventory-service` starts handling the
`receive-material` business command.
