# WorkCenter

A **WorkCenter** represents a manufacturing resource — a machine, cell, or area — where production operations are performed. It has a defined capacity, an operational state, and belongs to a Plant. Work Centers are the core scheduling units in an MRP/MES context.

## Data Model

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | string (URI) | Yes | `urn:ngsi-ld:WorkCenter:<BusinessKey>` |
| `type` | string | Yes | `"WorkCenter"` |
| `name` | Property (string) | Yes | Human-readable name |
| `code` | Property (string) | Yes | Business code matching `[A-Z0-9_-]+` |
| `state` | Property (enum) | Yes | `active`, `inactive`, or `maintenance` |
| `capacity` | Property (number, unitCode) | Yes | Nominal capacity > 0 |
| `timeEfficiency` | Property (number 0–1) | No | Ratio of productive to scheduled time |
| `costPerHour` | Property (number, unitCode) | No | Operating cost per hour (currency) |
| `oeeTarget` | Property (number 0–1) | No | Target Overall Equipment Effectiveness |
| `calendarId` | Property (string) | No | Reference to working-time calendar |
| `locatedIn` | Relationship → Plant | Yes | Parent Plant URN |
| `hasMachine` | Relationship → Machine[] | No | Machines operated here |
| `alternativeWorkCenter` | Relationship → WorkCenter | No | Substitute work center |

## Context

`http://context-server:3000/contexts/mrp/v0.1/context.jsonld`

## License

[EUPL-1.2](https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12) © FIWARE Foundation
