# Plant - Specification

## Description

A **Plant** represents a physical manufacturing facility managed within the MRP system. It belongs to exactly one [Company](../../Company/doc/spec.md) and aggregates production lines and stock locations. The Plant entity provides the geographic and operational context for scheduling, routing, and inventory operations.

## Data Model

| Attribute          | NGSI-LD Kind | Value type                            | Required | Description                                          |
|--------------------|--------------|---------------------------------------|----------|------------------------------------------------------|
| id                 | —            | string (URN)                          | Yes      | `urn:ngsi-ld:Plant:<BusinessKey>`                    |
| type               | —            | string                                | Yes      | `"Plant"`                                            |
| name               | Property     | string                                | Yes      | Human-readable display name of the plant             |
| plantCode          | Property     | string (`[A-Z0-9_-]+`)               | Yes      | Short unique code used in business documents         |
| timezone           | Property     | string (IANA tz)                      | Yes      | Local timezone for scheduling (e.g. `Europe/Madrid`) |
| state              | Property     | enum                                  | Yes      | Lifecycle state (see State Machine below)            |
| ownedBy            | Relationship | URI                                   | Yes      | The Company that owns this plant                     |
| hasProductionLine  | Relationship | URI or array of URIs                  | No       | Production lines operating within this plant         |
| hasStockLocation   | Relationship | URI or array of URIs                  | No       | Stock locations (warehouses, buffers) in this plant  |

### @context

```
http://context-server:3000/contexts/mrp/v0.1/context.jsonld
```

## Relationships

| Relationship      | Target Type    | Cardinality | Description                                     |
|-------------------|----------------|-------------|-------------------------------------------------|
| ownedBy           | Company        | 1           | The company that owns and operates this plant   |
| hasProductionLine | ProductionLine | 0..*        | Production lines within the plant               |
| hasStockLocation  | StockLocation  | 0..*        | Stock locations (warehouses, staging areas)     |

## State Machine

```
          ┌──────────┐
   create │          │ deactivate
─────────►│  active  │──────────────►┌──────────┐
          │          │               │ inactive │
          └──────────┘◄──────────────└──────────┘
                │         reactivate
                │ archive
                ▼
          ┌──────────┐
          │ archived │  (terminal)
          └──────────┘
```

- **active**: The plant is operational. Production lines and stock movements are allowed.
- **inactive**: Temporarily shut down. No new work orders should be created against this plant.
- **archived**: Permanently decommissioned. No further transitions allowed.

## Example Usage

Create a plant via NGSI-LD API:

```http
POST /ngsi-ld/v1/entities
Content-Type: application/ld+json

{
  "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
  "id": "urn:ngsi-ld:Plant:Plant-BCN",
  "type": "Plant",
  "name": { "type": "Property", "value": "Barcelona Plant" },
  "plantCode": { "type": "Property", "value": "BCN" },
  "timezone": { "type": "Property", "value": "Europe/Madrid" },
  "state": { "type": "Property", "value": "active" },
  "ownedBy": { "type": "Relationship", "object": "urn:ngsi-ld:Company:HPC" }
}
```

Query all production lines for a plant:

```http
GET /ngsi-ld/v1/entities?type=ProductionLine&q=plant==%22urn:ngsi-ld:Plant:Plant-BCN%22
```
