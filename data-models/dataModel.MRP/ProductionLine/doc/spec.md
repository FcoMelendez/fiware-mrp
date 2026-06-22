# ProductionLine

## Description

A **ProductionLine** represents a sequence of Work Centers arranged to manufacture a product family in a continuous or near-continuous flow. It is defined by a **takt time** — the maximum time allowed between the completion of successive units — and is physically located within a **Plant**.

Production Lines are used in scheduling and capacity planning to model flow-shop or assembly-line environments. They provide an aggregated view over the individual Work Centers that compose them, enabling line-level KPI tracking (throughput, OEE, downtime) alongside the more granular work-center view.

## Data Model

All properties follow NGSI-LD conventions. Scalar values are wrapped in a `Property` object with a `value` key; references are wrapped in a `Relationship` object with an `object` key.

### Identifier

| Attribute | Value |
|---|---|
| `id` | `urn:ngsi-ld:ProductionLine:<BusinessKey>` |
| `type` | `ProductionLine` |

### Properties

#### `name` (Required)

- Type: Property → string
- Description: Human-readable name of the production line.

#### `lineCode` (Required)

- Type: Property → string matching `^[A-Z0-9_-]+$`
- Description: Short alphanumeric business code used in production orders and routings. Must be unique within a Plant.

#### `state` (Required)

- Type: Property → enum
- Allowed values: `active`, `inactive`, `maintenance`
- Description: Current operational state of the production line. An `active` line is available for scheduling. `maintenance` indicates planned stoppage for upkeep. `inactive` means the line is not in use.

#### `taktTime` (Optional)

- Type: Property → number (> 0), `unitCode: "SEC"`
- Description: The takt time in seconds. Takt time is the ratio of available production time to customer demand rate:

  ```
  taktTime = availableTime / customerDemand
  ```

  For example, if a shift has 27,000 seconds of available time and demand is 450 units, the takt time is 60 seconds per unit. Work Center cycle times must not exceed the takt time to avoid bottlenecks.

### Relationships

#### `locatedIn` (Required)

- Target type: `Plant`
- Description: The Plant in which this production line is physically located.

#### `hasWorkCenter` (Optional)

- Target type: `WorkCenter[]`
- Description: The Work Centers that form this production line, listed in order of material flow. The `object` value is an array of WorkCenter URNs.

## Notes

### Takt Time and Throughput

Takt time governs the maximum throughput of the line. The theoretical hourly output is:

```
throughput = 3600 / taktTime   (units per hour)
```

When actual cycle times at any work center exceed the takt time, that station becomes a bottleneck and must be rebalanced or its capacity increased.

### Line Balancing

The `hasWorkCenter` relationship lists all work centers on the line. MRP and scheduling systems can iterate over them to compute:

- **Line balance efficiency** = sum(individual cycle times) / (number of stations × takt time)
- **Bottleneck station** = work center with the highest cycle time

### State Transitions

Typical transitions are:

```
inactive → active → maintenance → active
active   → inactive
```

A state change on a Production Line does not automatically change the state of individual Work Centers; each Work Center manages its own state independently.

## Examples

See [`examples/example.jsonld`](../examples/example.jsonld) for a key-values representation and [`examples/example-normalized.jsonld`](../examples/example-normalized.jsonld) for the normalized NGSI-LD form.

## Context

```
http://context-server:3000/contexts/mrp/v0.1/context.jsonld
```
