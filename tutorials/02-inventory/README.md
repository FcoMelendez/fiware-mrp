# Tutorial 02 — Inventory balances and material receipts

## What you will build

The `inventory-service` goes live and handles the `receive-material` business command. By the end of this tutorial you can:

- Receive goods from a supplier into a stock location via a single API call.
- Track inventory with and without lot numbers.
- Query current balances by product, location, or lot.
- Verify that every receipt creates an auditable `StockMove` entity in Orion-LD.

## Architecture of this tutorial

```
┌────────────────────────────────────────────────────────────┐
│  Tutorial 02 stack (adds inventory-service to Tutorial 01) │
│                                                            │
│  ┌──────────────────┐  POST receive-material               │
│  │  inventory-svc   │ ──────────────────────────────────►  │
│  │  :8081           │  PATCH /ngsi-ld/v1/entities/…/attrs  │
│  └──────────────────┘ ──────────────────────────────────►  │
│                        ┌──────────────┐                    │
│                        │  orion-ld    │                    │
│                        │  :1026       │                    │
│                        └──────────────┘                    │
└────────────────────────────────────────────────────────────┘
```

Services introduced:

| Service | Port | Purpose |
|---|---|---|
| `inventory-service` | 8081 | `receive-material` command + inventory query |

## Models introduced

| Entity type | Description |
|---|---|
| `InventoryBalance` | On-hand quantity of a product at a stock location |
| `StockMove` | Auditable record of every inventory movement |
| `Lot` | Traceable batch of material (lot-tracked products only) |

## Prerequisites

- Tutorial 01 stack running and seeded (`make start && make seed`)
- Ports 8081 free on localhost

## Start the stack

```bash
make start          # if not already running
make seed           # load Tutorial 01 baseline (or TUTORIAL=02 make seed)
```

Then start the inventory service:

```bash
docker compose up -d --build inventory-service
```

Or use the convenience target in the Makefile:

```bash
make start TUTORIAL=02
```

Verify the inventory service is healthy:

```bash
curl -s http://localhost:8081/health | python3 -m json.tool
```

## Exercise 1 — Query initial inventory

Before any receipts the inventory is empty:

```bash
curl -s "http://localhost:8081/inventory" | python3 -m json.tool
```

Expected: `[]`

## Exercise 2 — Receive PumpCasing

```bash
curl -s -X POST http://localhost:8081/commands/receive-material \
  -H "Content-Type: application/json" \
  -d '{
    "product_id":  "urn:ngsi-ld:Product:PumpCasing",
    "location_id": "urn:ngsi-ld:StockLocation:WH-STOCK",
    "quantity":    50,
    "unit":        "EA",
    "reference":   "PO-2024-001"
  }' | python3 -m json.tool
```

Expected response:

```json
{
  "status": "done",
  "stock_move_id":        "urn:ngsi-ld:StockMove:SM-20240115-XXXX",
  "inventory_balance_id": "urn:ngsi-ld:InventoryBalance:IB-PumpCasing-WH-STOCK",
  "quantity_on_hand":     50.0
}
```

## Exercise 3 — Receive Impeller with lot tracking

```bash
curl -s -X POST http://localhost:8081/commands/receive-material \
  -H "Content-Type: application/json" \
  -d '{
    "product_id":  "urn:ngsi-ld:Product:Impeller",
    "location_id": "urn:ngsi-ld:StockLocation:WH-STOCK",
    "quantity":    30,
    "unit":        "EA",
    "lot_code":    "LOT-240001",
    "reference":   "PO-2024-002"
  }' | python3 -m json.tool
```

The response includes `lot_id`. Two NGSI-LD entities were created in Orion-LD: a `Lot` and an `InventoryBalance` keyed to that lot.

## Exercise 4 — Query all balances

```bash
curl -s "http://localhost:8081/inventory" | python3 -m json.tool
```

Expected: two `InventoryBalance` entities — one for PumpCasing, one for Impeller (lot LOT-240001).

## Exercise 5 — Query by product

```bash
curl -s "http://localhost:8081/inventory?product_id=urn:ngsi-ld:Product:PumpCasing" \
  | python3 -m json.tool
```

## Exercise 6 — Inspect in Orion-LD directly

```bash
MRP="https://fiware-mrp.io/ontology/mrp%23"

# All InventoryBalance entities
curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}InventoryBalance" \
  -H "Accept: application/ld+json" | python3 -m json.tool

# All StockMove entities (audit trail)
curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}StockMove" \
  -H "Accept: application/ld+json" | python3 -m json.tool

# The Lot
curl -s "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:Lot:LOT-240001" \
  -H "Accept: application/ld+json" | python3 -m json.tool
```

## Exercise 7 — Receive more stock and verify accumulation

```bash
curl -s -X POST http://localhost:8081/commands/receive-material \
  -H "Content-Type: application/json" \
  -d '{
    "product_id":  "urn:ngsi-ld:Product:PumpCasing",
    "location_id": "urn:ngsi-ld:StockLocation:WH-STOCK",
    "quantity":    20,
    "unit":        "EA",
    "reference":   "PO-2024-003"
  }' | python3 -m json.tool
```

`quantity_on_hand` should now show **70** (50 + 20). A second `StockMove` entity appears in Orion-LD.

## Automated tests

```bash
make test-02
```

Expected: 8 assertions, all `[PASS]`.

## Clean up

```bash
make reset          # stops all containers and removes volumes
```

## What comes next

**Tutorial 03 — Bill of Materials.**
We define the `HydraulicPump-P100` BOM, link its four components, and implement the `explode-bom` command that returns the full list of materials needed to produce N units.

New models introduced: `BillOfMaterials`, `BillOfMaterialsLine`.
New service: `bom-service`.
