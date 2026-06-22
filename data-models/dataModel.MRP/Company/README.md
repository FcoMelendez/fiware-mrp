# Company

A legal entity that owns one or more manufacturing plants in the MRP system.

## Properties

| Property      | Type         | Required | Description                                     |
|---------------|--------------|----------|-------------------------------------------------|
| id            | string (URN) | Yes      | `urn:ngsi-ld:Company:<BusinessKey>`             |
| type          | string       | Yes      | Must be `"Company"`                             |
| name          | Property     | Yes      | Company display name                            |
| legalName     | Property     | No       | Full legal name                                 |
| companyCode   | Property     | Yes      | Short code, pattern `[A-Z0-9_-]+`               |
| state         | Property     | Yes      | Lifecycle state: `active`, `inactive`, `archived` |
| hasPlant      | Relationship | No       | URN(s) of owned Plant entities                  |

## Links

- [Specification](doc/spec.md)
- [JSON Schema](schema.json)
- [Key-values example](examples/example.jsonld)
- [Normalized example](examples/example-normalized.jsonld)
