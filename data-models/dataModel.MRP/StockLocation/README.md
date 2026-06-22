# StockLocation

## Description

A **StockLocation** entity represents a physical or virtual place in a Manufacturing Resource Planning (MRP) system where inventory is stored, received, dispatched, or logically grouped. Locations form a hierarchy (e.g. warehouse > aisle > rack > bin) and are classified by `locationType` to govern how MRP treats stock movements entering or leaving them.

This data model follows the [Smart Data Models](https://smartdatamodels.org) initiative conventions and is designed for NGSI-LD compatibility.

## Data Model

A JSON Schema description of this entity is available at:
[schema.json](./schema.json)

Full specification: [doc/spec.md](./doc/spec.md)

## Examples

- [Key-values (simplified)](./examples/example.jsonld)
- [Normalized (NGSI-LD full)](./examples/example-normalized.jsonld)

## Key Properties

| Property | Type | Required | Description |
|---|---|---|---|
| id | URI | Yes | `urn:ngsi-ld:StockLocation:<BusinessKey>` |
| type | string | Yes | Must be `StockLocation` |
| name | Property (string) | Yes | Human-readable location name |
| locationCode | Property (string) | Yes | Uppercase alphanumeric code `[A-Z0-9_-]+` |
| locationType | Property (enum) | Yes | `internal`, `customer`, `supplier`, `transit`, `scrap`, `virtual` |
| state | Property (enum) | Yes | `active`, `inactive`, `archived` |
| locatedIn | Relationship | No | Plant URN |
| parentLocation | Relationship | No | Parent StockLocation URN |

## Context

```json
"@context": ["http://context-server:3000/contexts/mrp/v0.1/context.jsonld"]
```

## License

[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
