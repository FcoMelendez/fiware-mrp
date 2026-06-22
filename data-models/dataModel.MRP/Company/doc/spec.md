# Company - Specification

## Description

A **Company** represents a legal entity that operates within the MRP system. It is the top-level organizational unit and owns one or more [Plant](../../Plant/doc/spec.md) entities. The Company entity captures the minimal master data required to identify and classify an organization.

## Data Model

| Attribute     | NGSI-LD Kind | Value type                            | Required | Description                                     |
|---------------|--------------|---------------------------------------|----------|-------------------------------------------------|
| id            | —            | string (URN)                          | Yes      | `urn:ngsi-ld:Company:<BusinessKey>`             |
| type          | —            | string                                | Yes      | `"Company"`                                     |
| name          | Property     | string                                | Yes      | Human-readable display name of the company      |
| legalName     | Property     | string                                | No       | Full registered legal name                      |
| companyCode   | Property     | string (`[A-Z0-9_-]+`)               | Yes      | Short unique code used in business documents    |
| state         | Property     | enum                                  | Yes      | Lifecycle state (see State Machine below)       |
| hasPlant      | Relationship | URI or array of URIs                  | No       | Links to Plant entities owned by this company   |

### @context

```
http://context-server:3000/contexts/mrp/v0.1/context.jsonld
```

## Relationships

| Relationship | Target Type | Cardinality | Description                          |
|--------------|-------------|-------------|--------------------------------------|
| hasPlant     | Plant       | 0..*        | Manufacturing plants owned by this company |

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

- **active**: The company is operating and may own active plants.
- **inactive**: Temporarily suspended. Plants under this company should also be inactive.
- **archived**: Permanently closed. No further transitions allowed.

## Example Usage

Create a company via NGSI-LD API:

```http
POST /ngsi-ld/v1/entities
Content-Type: application/ld+json

{
  "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
  "id": "urn:ngsi-ld:Company:HPC",
  "type": "Company",
  "name": { "type": "Property", "value": "Hydraulic Parts Co." },
  "companyCode": { "type": "Property", "value": "HPC" },
  "state": { "type": "Property", "value": "active" }
}
```

Query all plants for a company:

```http
GET /ngsi-ld/v1/entities?type=Plant&q=ownedBy==%22urn:ngsi-ld:Company:HPC%22
```
