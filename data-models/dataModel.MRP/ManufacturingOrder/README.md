# ManufacturingOrder

An instruction to produce a specified quantity of a finished product by a planned date.

## Description

A `ManufacturingOrder` (MO) links a `Product` to its `BillOfMaterials` and carries a lifecycle state that drives downstream processes: component reservation (Tutorial 05), work-order generation (Tutorial 06), and shop-floor execution (Tutorial 07).

## State machine

```
draft → confirmed → in_progress → completed
              ↘ cancelled
```

| State | Description |
|---|---|
| `draft` | Order created but not yet released |
| `confirmed` | Locked for scheduling and component reservation |
| `in_progress` | Work orders exist and production has started |
| `completed` | All quantity produced and received into finished goods |
| `cancelled` | Order voided — no components consumed |

## Properties

| Attribute | NGSI-LD type | Description |
|---|---|---|
| `orderCode` | Property | Human-readable identifier (e.g. MO-2024-001) |
| `product` | Relationship | The Product entity being manufactured |
| `bom` | Relationship | The BillOfMaterials used for component explosion |
| `quantity` | Property (number) | Units to produce |
| `state` | Property | Lifecycle state (see table above) |
| `plannedStart` | Property (date-time) | Planned production start |
| `plannedEnd` | Property (date-time) | Planned production completion |
| `priority` | Property | `normal` \| `urgent` \| `critical` |
| `confirmedAt` | Property (date-time) | Timestamp of confirmation (set by service) |

## Example

See [`examples/example.json`](examples/example.json) for a confirmed ManufacturingOrder
for 10 units of `HydraulicPump-P100`.

## Introduced in

Tutorial 04 — Manufacturing order confirmation
