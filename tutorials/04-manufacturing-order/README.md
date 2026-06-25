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

- Tutorial 01 stack running and seeded (`make start && make seed`)
- Tutorial 03 BoM data seeded (`TUTORIAL=03 make seed`)
- Port 8083 free on localhost

## Start the stack

```bash
make start                         # start core infrastructure
make seed                          # load Tutorial 01 master data
TUTORIAL=03 make seed              # load Tutorial 03 BoM data
TUTORIAL=04 make seed              # load Tutorial 04 ManufacturingOrder (draft)
docker compose up -d --build manufacturing-service
```

## Tutorial steps

### Step 1 — Verify manufacturing-service health

```bash
curl http://localhost:8083/health
# { "status": "ok", "service": "manufacturing-service", "version": "0.4.0" }
```

### Step 2 — Seed Tutorial 04 data

The seed step loads 1 `ManufacturingOrder` (MO-2024-001) in `draft` state for 10 units of
`HydraulicPump-P100`, referencing the BoM from Tutorial 03.

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
