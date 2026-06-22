# Product

## Description

A **Product** entity represents a product master record in a Manufacturing Resource Planning (MRP) system. It captures all the information needed to plan, procure, manufacture, and track an item throughout its lifecycle within a supply chain.

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
| id | URI | Yes | `urn:ngsi-ld:Product:<BusinessKey>` |
| type | string | Yes | Must be `Product` |
| name | Property (string) | Yes | Human-readable product name |
| sku | Property (string) | Yes | Unique stock-keeping unit code |
| productType | Property (enum) | Yes | `manufactured`, `purchased`, `consumable`, `service`, `byproduct` |
| trackingPolicy | Property (enum) | Yes | `none`, `lot`, `serial` |
| defaultUnitCode | Property (string) | Yes | UN/CEFACT unit code |
| standardCost | Property (number) | No | Standard cost with currency unitCode |
| active | Property (boolean) | Yes | Activation status |
| description | Property (string) | No | Free-text description |
| company | Relationship | No | Owning Company URN |
| defaultBom | Relationship | No | Default BillOfMaterials URN |

## Context

```json
"@context": ["http://context-server:3000/contexts/mrp/v0.1/context.jsonld"]
```

## License

[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
