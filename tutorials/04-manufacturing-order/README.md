# Tutorial 04 — Manufacturing order confirmation

## What you will build

The `manufacturing-service` goes live and handles the `confirm-manufacturing-order` business command. By the end of this tutorial you can:

- Create a `ManufacturingOrder` in draft state via seed data.
- Query manufacturing orders filtered by state.
- Confirm an order via a single API call — transitioning it from `draft` to `confirmed`.
- Verify that the state change and `confirmedAt` timestamp are persisted in Orion-LD.

## Architecture of this tutorial

```
┌────────────────────────────────────────────────────────────────┐
│  Tutorial 04 stack (adds manufacturing-service to T01+T03)     │
│                                                                │
│  ┌──────────────────────┐  POST confirm-manufacturing-order    │
│  │  manufacturing-svc   │ ──────────────────────────────────►  │
│  │  :8083               │  PATCH /ngsi-ld/v1/entities/…/attrs  │
│  └──────────────────────┘ ──────────────────────────────────►  │
│                            ┌──────────────┐                    │
│                            │  orion-ld    │                    │
│                            │  :1026       │                    │
│                            └──────────────┘                    │
└────────────────────────────────────────────────────────────────┘
```

Services introduced:

| Service | Port | Purpose |
|---|---|---|
| `manufacturing-service` | 8083 | `confirm-manufacturing-order` command + order query |

## Models introduced

| Entity type | Description |
|---|---|
| `ManufacturingOrder` | Instruction to produce a quantity of a product by a planned date |

## Prerequisites

- Docker stack running (`make start`)
- Port 8083 free on localhost

The Tutorial 04 seed file is **self-contained**: it bundles all Tutorial 01 master data and Tutorial 03 BoM entities — no separate T01 or T03 seed step is needed.

## Start the stack

```bash
make start                         # start core infrastructure
TUTORIAL=04 make seed              # loads 18 entities: T01 + T03 + ManufacturingOrder
docker compose up -d --build manufacturing-service
```

## Tutorial steps

### Step 1 — Verify manufacturing-service health

```bash
curl http://localhost:8083/health
# { "status": "ok", "service": "manufacturing-service", "version": "0.4.0" }
```

### Step 2 — Seed Tutorial 04 data

The seed step loads **18 entities**: 12 T01 master-data entities (Company, Plant, WorkCenter × 3, Product × 5, StockLocation × 2), 5 T03 BoM entities (BillOfMaterials + 4 lines), and one `ManufacturingOrder` (MO-2024-001) in `draft` state for 10 units of `HydraulicPump-P100`.

### Step 3 — Query manufacturing orders in draft state

```bash
curl "http://localhost:8083/manufacturing-orders?state=draft"
```

Returns 1 ManufacturingOrder with `state=draft`.

### Step 4 — Confirm the manufacturing order

```bash
curl -X POST http://localhost:8083/commands/confirm-manufacturing-order \
  -H "Content-Type: application/json" \
  -d '{"order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001"}'
```

Returns:
```json
{
  "status": "confirmed",
  "order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001",
  "confirmed_at": "2024-07-01T07:45:23Z"
}
```

The service validates that the order is in `draft` state, then patches the `state` and `confirmedAt`
attributes in Orion-LD.

### Step 5 — Query confirmed orders

```bash
curl "http://localhost:8083/manufacturing-orders?state=confirmed"
```

Returns the same order, now with `state=confirmed` and `confirmedAt` set.

### Step 6 — Inspect the entity directly in the broker

```bash
curl "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:ManufacturingOrder:MO-2024-001" \
  -H "Accept: application/ld+json" \
  -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
```

You should see `state: { type: Property, value: confirmed }` and the `confirmedAt` timestamp.

## Emulator dashboard

The interactive emulator (`make start-mock` → http://localhost:5173) shows a live business dashboard while you step through the tutorial. After Tutorial 04 seed loads you will see:

| Dashboard card | Value after seed | Value after confirm |
|---|---|---|
| **Context Graph** | `18 entities` + company name + last-event timestamp | unchanged |
| **Shop Floor** | `0% util. · 85% OEE tgt` + 3 WC status dots | unchanged |
| **Inventory** | `0.0× coverage · 2 loc. · 0 units / 10 demand` | unchanged |
| **Bill of Materials** | `1 BoM · 1/1 products ready` (green) | unchanged |
| **Mfg Orders** | `1 open · €2.5k · draft 1 · conf. 0 · in prog. 0` | `conf. 1 · draft 0` |

Hover the `last: HH:MM:SS` text on the Context Graph card to see a tooltip with the last changed entity, its attributes, and a breakdown of all entity types in the context store.

## Run automated assertions

```bash
make test-04
```

All 6 assertions must pass.

## Business context

A confirmed ManufacturingOrder acts as the production commitment signal:

- **Tutorial 05** uses it to reserve components from stock and detect shortages.
- **Tutorial 06** schedules work orders against work centers based on confirmed MOs.
- **Tutorial 07** executes those work orders on the shop floor.

Keeping the MO in `draft` state until all planning checks pass prevents premature component
consumption — a key principle in discrete manufacturing.
