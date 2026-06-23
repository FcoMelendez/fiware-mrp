# StockMove

**Tag:** v0.2 | **Tutorial:** 02 — Inventory balances and material receipts

## Overview

`StockMove` records a single inventory movement — a quantity of a `Product` moving from one `StockLocation` to another. Receipts from suppliers have no `fromLocation`. Every move that reaches state `done` triggers an update to the corresponding `InventoryBalance` records.

## URN pattern

```
urn:ngsi-ld:StockMove:SM-{yyyyMMdd}-{random4}
```

## Key attributes

| Attribute | NGSI-LD type | Description |
|-----------|-------------|-------------|
| `moveType` | Property (enum) | `receipt` \| `issue` \| `transfer` \| `adjustment` \| `scrap` |
| `quantity` | Property (number) | Quantity moved (with `unitCode`) |
| `state` | Property (enum) | `draft` \| `done` \| `cancelled` |
| `actualDate` | Property (datetime) | When the physical movement occurred |
| `origin` | Property (string) | Source document reference (PO, MO …) |
| `product` | Relationship | → `Product` |
| `fromLocation` | Relationship | → `StockLocation` *(absent for receipts)* |
| `toLocation` | Relationship | → `StockLocation` |
| `lot` | Relationship | → `Lot` *(lot-tracked only)* |

## Files

| File | Description |
|------|-------------|
| `schema.json` | NGSI-LD JSON Schema |
| `examples/example-normalized.jsonld` | Receipt from supplier (normalized) |
| `examples/example.jsonld` | Key-values representation |
| `doc/spec.md` | Full attribute specification |
