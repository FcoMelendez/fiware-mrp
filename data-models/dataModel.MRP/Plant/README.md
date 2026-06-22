# Plant

A manufacturing facility operated by a [Company](../Company/README.md) in the MRP system.

## Properties

| Property           | Type         | Required | Description                                          |
|--------------------|--------------|----------|------------------------------------------------------|
| id                 | string (URN) | Yes      | `urn:ngsi-ld:Plant:<BusinessKey>`                    |
| type               | string       | Yes      | Must be `"Plant"`                                    |
| name               | Property     | Yes      | Plant display name                                   |
| plantCode          | Property     | Yes      | Short code, pattern `[A-Z0-9_-]+`                    |
| timezone           | Property     | Yes      | IANA timezone string (e.g. `Europe/Madrid`)          |
| state              | Property     | Yes      | Lifecycle state: `active`, `inactive`, `archived`    |
| ownedBy            | Relationship | Yes      | URN of the owning Company                            |
| hasProductionLine  | Relationship | No       | URN(s) of ProductionLine entities in this plant      |
| hasStockLocation   | Relationship | No       | URN(s) of StockLocation entities in this plant       |

## Links

- [Specification](doc/spec.md)
- [JSON Schema](schema.json)
- [Key-values example](examples/example.jsonld)
- [Normalized example](examples/example-normalized.jsonld)
