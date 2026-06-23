# InventoryBalance

**Tag:** v0.2 | **Tutorial:** 02 — Inventory balances and material receipts

## Overview

`InventoryBalance` tracks the current on-hand quantity of a specific `Product` at a specific `StockLocation`. Every committed `StockMove` (state = `done`) updates the relevant balance. When a product is lot-tracked, a separate balance record exists per lot.

## URN pattern

```
urn:ngsi-ld:InventoryBalance:IB-{ProductCode}-{LocationCode}
urn:ngsi-ld:InventoryBalance:IB-{ProductCode}-{LocationCode}-{LotCode}   # lot-tracked
```

## Key attributes

| Attribute | NGSI-LD type | Description |
|-----------|-------------|-------------|
| `quantityOnHand` | Property (number) | Physical stock at the location |
| `reservedQuantity` | Property (number) | Committed to open orders |
| `availableQuantity` | Property (number) | `quantityOnHand` − `reservedQuantity` |
| `inventoryDate` | Property (datetime) | Last balance update |
| `state` | Property (enum) | `active` \| `frozen` |
| `product` | Relationship | → `Product` |
| `location` | Relationship | → `StockLocation` |
| `lot` | Relationship | → `Lot` *(lot-tracked only)* |

## Files

| File | Description |
|------|-------------|
| `schema.json` | NGSI-LD JSON Schema |
| `examples/example-normalized.jsonld` | Full normalized NGSI-LD entity |
| `examples/example.jsonld` | Key-values representation |
| `doc/spec.md` | Full attribute specification |
