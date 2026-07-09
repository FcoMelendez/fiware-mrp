# Tutorial 12 — End-to-end demo (v1.0)

## What you will build

Nothing new. Tutorial 12 introduces **no new service and no new entity type** —
it closes the twelve-week series by driving every command from Tutorials 02-11
once, in sequence, against a single continuously-running stack. It is the
release tutorial: if this passes, the full forecast-to-traceability pipeline
works end to end and the reference implementation is v1.0.

The story it tells:

1. **Plan** — explode a BoM to preview material requirements, then generate
   and confirm an MPS suggestion from a demand forecast.
2. **Execute** — confirm the resulting ManufacturingOrder, reserve its
   components, schedule its work orders, and run them on the shop floor with
   live IoT machine signals and an operator clock-in/out.
3. **Close the loop** — inspect the finished work for quality, receive the
   finished goods into stock, and verify the whole graph — forecast, MO,
   reservations, work orders, machine state, operator assignment, quality
   check, and finished-goods stock — is coherent from a single query.

## Architecture of this tutorial

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Tutorial 12 stack — identical to Tutorial 11, driven end to end          │
│                                                                            │
│  bom-svc  inventory-svc  mps-svc  manufacturing-svc  scheduler-svc        │
│    │           │            │            │                │              │
│    │           │            │            │                │              │
│    ▼           ▼            ▼            ▼                ▼              │
│  explode-   receive-    generate-/    confirm-        create-work-       │
│  bom        material    confirm-mps   manufacturing-  orders             │
│                                       order                               │
│                                                                            │
│  shopfloor-svc      iot-simulator      quality-svc     finished-goods-svc │
│    │                    │                  │                   │         │
│    ▼                    ▼                  ▼                   ▼         │
│  start/complete-    clock-in/out,     inspect-             receive-       │
│  work-order         emit-signal       work-order           finished-goods│
│                                                                            │
│                       all against orion-ld :1026                         │
└──────────────────────────────────────────────────────────────────────────┘
```

No new services. `docker-compose.yml` is unchanged from Tutorial 11.

## Models introduced

None. Every entity type used here (`ManufacturingOrder`, `DemandForecast`,
`ReorderingRule`, `MasterProductionScheduleLine`, `InventoryReservation`,
`WorkOrder`, `MachineSignal`, `MachineState`, `OperatorAssignment`,
`QualityCheck`, `StockMove`, `InventoryBalance`) was introduced in an earlier
tutorial.

## Prerequisites

- Full stack running (`make start-emulator` or the `test-all` service list)
- All ports 8081-8089 free on localhost

The Tutorial 12 seed file is self-contained: T01 master data, the T03 BoM, a
fresh (unreserved) set of component `InventoryBalance` entities, a
`DemandForecast` + `ReorderingRule` for T10's MPS step, a **draft**
`ManufacturingOrder` (`MO-2024-002`), and the Operator from T11. Unlike
Tutorials 01-11, nothing here has already been executed — every command in
this walkthrough runs for the first time against this data.

## Run it

```bash
make start-emulator            # full stack, live mode
TUTORIAL=12 make seed           # 27 entities: T01 + T03 BoM + fresh MO + forecast
make test-12                    # drives the full sequence and asserts the result
```

`make test-12` re-seeds automatically, so it's always safe to re-run from a
clean stack. Running the underlying `tutorials/12-end-to-end/tests/test-12.sh`
script by hand twice **without** reseeding in between will fail partway
through — `MO-2024-002` only has one lifecycle to walk through, and a couple
of the commands it drives (`ProductionEvent` creation, `WorkOrder` state
guards) are intentionally not idempotent against already-completed state.

## Walkthrough

### 1 — Explode the BoM (Tutorial 03)

```bash
curl -X POST http://localhost:8082/commands/explode-bom \
  -H "Content-Type: application/json" \
  -d '{"product_id": "urn:ngsi-ld:Product:HydraulicPump-P100", "quantity": 5}'
```

Returns the four required components (PumpCasing, Impeller, ElectricMotor,
SealKit) with quantities scaled to a production run of 5 pumps.

### 2 — Receive material (Tutorial 02)

```bash
curl -X POST http://localhost:8081/commands/receive-material \
  -H "Content-Type: application/json" \
  -d '{"product_id": "urn:ngsi-ld:Product:PumpCasing", "location_id": "urn:ngsi-ld:StockLocation:WH-STOCK", "quantity": 10}'
```

Tops up PumpCasing stock — demonstrating that inventory keeps moving even
mid-plan.

### 3 — Generate and confirm the MPS suggestion (Tutorial 10)

```bash
curl -X POST http://localhost:8088/commands/generate-mps \
  -H "Content-Type: application/json" \
  -d '{"demand_forecast_id": "urn:ngsi-ld:DemandForecast:DF-HydraulicPump-P100-2024-09"}'
```

With 0 on hand, a forecast of 2, and a safety stock of 3, mps-service
suggests producing 5 units (rounded up to the `ReorderingRule`'s lot size).
`confirm-mps-line` locks that suggestion in — advisory only, since mps-service
never creates a `ManufacturingOrder` itself.

### 4 — Confirm the ManufacturingOrder (Tutorial 04)

```bash
curl -X POST http://localhost:8083/commands/confirm-manufacturing-order \
  -H "Content-Type: application/json" \
  -d '{"order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-002"}'
```

`MO-2024-002` — seeded in `draft` state for exactly this purpose — moves to
`confirmed`.

### 5 — Reserve components (Tutorial 05)

```bash
curl -X POST http://localhost:8081/commands/reserve-components \
  -H "Content-Type: application/json" \
  -d '{"order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-002"}'
```

All 4 components reserve in full — this seed's inventory is deliberately
generous, so Tutorial 12 shows the happy path (shortages are Tutorial 05's
story to tell, not this one's).

### 6 — Schedule work orders (Tutorial 06)

```bash
curl -X POST http://localhost:8084/commands/create-work-orders \
  -H "Content-Type: application/json" \
  -d '{"order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-002"}'
```

Creates the Assembly → LeakTest → Packaging routing, all `planned`.

### 7 — Execute the shop floor, with live IoT signals (Tutorials 07 + 11)

```bash
curl -X POST http://localhost:8089/commands/clock-in \
  -d '{"operator_id": "urn:ngsi-ld:Operator:OP-JaneDoe", "work_center_id": "urn:ngsi-ld:WorkCenter:WC-Assembly"}'
curl -X POST http://localhost:8085/commands/start-work-order \
  -d '{"work_order_id": "urn:ngsi-ld:WorkOrder:WO-MO-2024-002-Assembly"}'
curl -X POST http://localhost:8089/commands/emit-signal \
  -d '{"work_center_id": "urn:ngsi-ld:WorkCenter:WC-Assembly", "signal_type": "temperature", "actual_value": 65, "quality": "good"}'
curl -X POST http://localhost:8085/commands/complete-work-order \
  -d '{"work_order_id": "urn:ngsi-ld:WorkOrder:WO-MO-2024-002-Assembly", "quantity_produced": 5}'
curl -X POST http://localhost:8089/commands/clock-out -d '{"assignment_id": "<from clock-in>"}'
```

(`Content-Type: application/json` omitted above for brevity — see
`tests/test-12.sh` for the exact calls.) LeakTest and Packaging follow the
same start/complete pattern.

### 8 — Inspect quality (Tutorial 09)

```bash
curl -X POST http://localhost:8087/commands/inspect-work-order \
  -H "Content-Type: application/json" \
  -d '{"work_order_id": "urn:ngsi-ld:WorkOrder:WO-MO-2024-002-LeakTest", "check_type": "leak_test", "expected_value": 0, "actual_value": 0, "tolerance": 0.1, "quantity_inspected": 5}'
```

Runs after LeakTest completes — `result=pass`, no scrap or rework needed.

### 9 — Receive finished goods (Tutorial 08)

```bash
curl -X POST http://localhost:8086/commands/receive-finished-goods \
  -H "Content-Type: application/json" \
  -d '{"manufacturing_order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-002"}'
```

Requires all 3 WorkOrders completed. Sets `MO-2024-002` to `completed`,
creates the receipt `StockMove`, and moves `WH-FINISHED`'s
`HydraulicPump-P100` balance from 0 to 5 — the forecast is now shelf stock.

### 10 — Verify the full graph

```bash
curl http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:ManufacturingOrder:MO-2024-002 -H "Accept: application/ld+json"
```

`state=completed`, `confirmedAt` and `completedAt` both set — the whole
lifecycle, from a demand forecast to a completed, quality-checked,
traceable manufacturing order, in one continuous run.

## Data model introduced

None — see [Models introduced](#models-introduced) above.

## What's next

Nothing — this is the last tutorial. See the top-level
[README](../../README.md) for the v1.0 release summary and the
[architecture overview](../../docs/architecture/index.rst) for the complete,
final reference architecture.
