# ProductionLine

A **ProductionLine** groups an ordered set of Work Centers that collaborate to manufacture a product family. It defines the **takt time** — the rate at which finished units must be produced — and belongs to a Plant.

## Data Model

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | string (URI) | Yes | `urn:ngsi-ld:ProductionLine:<BusinessKey>` |
| `type` | string | Yes | `"ProductionLine"` |
| `name` | Property (string) | Yes | Human-readable name |
| `lineCode` | Property (string) | Yes | Business code matching `[A-Z0-9_-]+` |
| `state` | Property (enum) | Yes | `active`, `inactive`, or `maintenance` |
| `taktTime` | Property (number, seconds) | No | Takt time in seconds (> 0) |
| `locatedIn` | Relationship → Plant | Yes | Parent Plant URN |
| `hasWorkCenter` | Relationship → WorkCenter[] | No | Work Centers forming this line |

## Context

`http://context-server:3000/contexts/mrp/v0.1/context.jsonld`

## License

[EUPL-1.2](https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12) © FIWARE Foundation
