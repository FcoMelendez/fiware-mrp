# WorkCenter

## Description

A **WorkCenter** is a manufacturing resource — a machine, cell, or production area — at which one or more operations of a routing can be performed. It is the primary scheduling and costing unit in an MRP or MES system.

Work Centers have a rated **capacity** (e.g. hours per shift), an **operational state**, and optionally a **time efficiency** factor that reduces available capacity to reflect setup, changeover, and non-productive time. They are always physically located within a **Plant** and may contain one or more **Machines**.

When a Work Center is unavailable (maintenance or inactive), MRP scheduling can redirect orders to an **alternativeWorkCenter**.

## Data Model

All properties follow NGSI-LD conventions. Scalar values are wrapped in a `Property` object with a `value` key; references are wrapped in a `Relationship` object with an `object` key.

### Identifier

| Attribute | Value |
|---|---|
| `id` | `urn:ngsi-ld:WorkCenter:<BusinessKey>` |
| `type` | `WorkCenter` |

### Properties

#### `name` (Required)

- Type: Property → string
- Description: Human-readable name of the work center.

#### `code` (Required)

- Type: Property → string matching `^[A-Z0-9_-]+$`
- Description: Short alphanumeric business code used in BOMs and routings.

#### `state` (Required)

- Type: Property → enum
- Allowed values: `active`, `inactive`, `maintenance`
- Description: Current operational state. An `active` work center is available for scheduling. `maintenance` indicates planned downtime. `inactive` means the resource is not in use.

#### `capacity` (Required)

- Type: Property → number (> 0) + `unitCode`
- Description: Nominal available production capacity per planning period. The `unitCode` follows UN/CEFACT recommendations (e.g. `HUR` for hours). Effective capacity equals `capacity × timeEfficiency`.

#### `timeEfficiency` (Optional)

- Type: Property → number [0, 1]
- Description: Fraction of scheduled time that is productive. A value of `0.85` means 85 % efficiency. When absent, a value of `1.0` (100 %) is assumed.

#### `costPerHour` (Optional)

- Type: Property → number (≥ 0) + `unitCode`
- Description: Operating cost per hour including labour and overhead. The `unitCode` should be an ISO 4217 currency code (e.g. `EUR`, `USD`).

#### `oeeTarget` (Optional)

- Type: Property → number [0, 1]
- Description: Target Overall Equipment Effectiveness (OEE) for this work center. Used as a KPI baseline in reporting and continuous improvement programmes.

#### `calendarId` (Optional)

- Type: Property → string
- Description: Identifier referencing the shift or working-time calendar that governs availability. When absent, a default plant calendar applies.

### Relationships

#### `locatedIn` (Required)

- Target type: `Plant`
- Description: The Plant in which this work center is physically located.

#### `hasMachine` (Optional)

- Target type: `Machine[]`
- Description: One or more Machines operated within this work center. The `object` value is an array of Machine URNs.

#### `alternativeWorkCenter` (Optional)

- Target type: `WorkCenter`
- Description: An alternative Work Center that can substitute for this one when it is unavailable. Used by scheduling algorithms to reroute production orders.

## Notes

### Capacity and Scheduling

The effective capacity available for MRP scheduling is:

```
effectiveCapacity = capacity.value × timeEfficiency.value
```

When `timeEfficiency` is not present, the multiplier is `1.0`.

Capacity units must be consistent with the operation times defined in the associated routings. If routings express operation time in hours (`HUR`), the work center capacity should also be in hours.

### OEE

OEE combines availability, performance, and quality into a single metric:

```
OEE = Availability × Performance × Quality
```

The `oeeTarget` property stores the planned OEE; actual OEE is tracked by a separate telemetry data model (e.g. `WorkCenterPerformance`).

### State Transitions

Typical state transitions are:

```
inactive → active → maintenance → active
active   → inactive
```

State changes should be accompanied by a context-broker notification to downstream planning systems.

## Examples

See [`examples/example.jsonld`](../examples/example.jsonld) for a key-values representation and [`examples/example-normalized.jsonld`](../examples/example-normalized.jsonld) for the normalized NGSI-LD form.

## Context

```
http://context-server:3000/contexts/mrp/v0.1/context.jsonld
```
