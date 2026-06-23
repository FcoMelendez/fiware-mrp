# Lot

**Tag:** v0.2 | **Tutorial:** 02 — Inventory balances and material receipts

## Overview

`Lot` represents a traceable batch of product received from a supplier or produced in-house. Lots are referenced by `InventoryBalance` and `StockMove` entities whenever a product has `trackingPolicy = "lot"` or `"serial"`. They enable end-to-end traceability from raw material receipt through production to finished-goods shipment.

## URN pattern

```
urn:ngsi-ld:Lot:{LotCode}
```

## Key attributes

| Attribute | NGSI-LD type | Description |
|-----------|-------------|-------------|
| `lotCode` | Property (string) | Human-readable batch/lot number |
| `expirationDate` | Property (date) | Use-by date *(optional)* |
| `origin` | Property (string) | Supplier name or producing MO |
| `qualityStatus` | Property (enum) | `pending` \| `approved` \| `quarantine` \| `rejected` |
| `state` | Property (enum) | `active` \| `consumed` \| `expired` |
| `product` | Relationship | → `Product` |

## Files

| File | Description |
|------|-------------|
| `schema.json` | NGSI-LD JSON Schema |
| `examples/example-normalized.jsonld` | Approved incoming lot (normalized) |
| `examples/example.jsonld` | Key-values representation |
| `doc/spec.md` | Full attribute specification |
