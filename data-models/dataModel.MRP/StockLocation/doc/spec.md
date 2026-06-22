# StockLocation - Full Specification

## Overview

The **StockLocation** entity models every place — physical or virtual — where inventory quantities are recorded in an MRP system. A location tree provides the structural backbone for warehouse management, production logistics, and supply chain traceability.

Stock Moves always reference a source location and a destination location. The `locationType` of each endpoint determines accounting treatment, lot/serial traceability requirements, and whether the move is considered an internal transfer, a goods receipt, a delivery, or a scrap write-off.

---

## NGSI-LD Context

```
http://context-server:3000/contexts/mrp/v0.1/context.jsonld
```

---

## URN Pattern

```
urn:ngsi-ld:StockLocation:<BusinessKey>
```

`<BusinessKey>` is typically derived from the `locationCode`, e.g. `urn:ngsi-ld:StockLocation:WH-STOCK`.

---

## Properties

### id
- **Type:** URI (string)
- **Required:** Yes
- **Pattern:** `^urn:ngsi-ld:StockLocation:.+`
- **Description:** Globally unique identifier for the stock location entity.

### type
- **Type:** string
- **Required:** Yes
- **Value:** `"StockLocation"`

### name
- **NGSI-LD type:** Property
- **Value type:** string
- **Required:** Yes
- **Description:** Human-readable label displayed in UIs, pick lists, and reports (e.g. "Main Warehouse Stock", "Supplier Receipt Bay").

### locationCode
- **NGSI-LD type:** Property
- **Value type:** string
- **Required:** Yes
- **Pattern:** `^[A-Z0-9_-]+$`
- **Description:** Short, opaque code uniquely identifying the location within its company or plant. Used in barcodes, labels, and EDI messages. Only uppercase letters (A-Z), digits (0-9), underscores (_), and hyphens (-) are allowed.

### locationType
- **NGSI-LD type:** Property
- **Value type:** string (enum)
- **Required:** Yes
- **Allowed values:** `internal`, `customer`, `supplier`, `transit`, `scrap`, `virtual`

#### locationType Values and MRP Flow Semantics

| Value | Description | Typical MRP Usage |
|---|---|---|
| `internal` | A location physically owned and operated by the company (warehouse bin, production floor area, quality hold area). | Source and destination for internal transfers, manufacturing inputs/outputs, and inter-warehouse moves. Stock on-hand is visible to MRP for supply calculations. |
| `customer` | Represents a customer's premises or consignment store. | Destination of outbound deliveries (Sales Order deliveries). Goods leaving for a customer location reduce on-hand stock. Can model vendor-managed inventory (VMI) at the customer site. |
| `supplier` | Represents a supplier's virtual location. | Source location for Purchase Order receipts. Goods received from a supplier originate from a supplier location and move into an internal receipt/stock location. |
| `transit` | An intermediate location used during multi-step transfers or inter-company flows. | Used for two-step receipts (dock → quality inspection → stock) or inter-warehouse shipments. Quantities in transit are visible but not available for MRP demand coverage until cleared. |
| `scrap` | A sink location for products that are written off or disposed of. | Destination of scrap moves generated during manufacturing or quality rejection. Stock moved to scrap reduces on-hand and is expensed. |
| `virtual` | A logical location with no physical counterpart. | Used as a starting location for inventory adjustments (opening balances), production losses, or exploded BOM components. Quantities sourced from a virtual location represent creation of value, not a real stock transfer. |

#### Stock Move Direction Rules

```
Purchase Receipt:   supplier  -->  internal (or transit)
Sale Delivery:      internal  -->  customer
Internal Transfer:  internal  -->  internal
Manufacturing In:   internal  -->  virtual  (component consumption)
Manufacturing Out:  virtual   -->  internal (finished goods)
Scrap:              internal  -->  scrap
Inventory Adjust:   virtual   -->  internal (positive) or internal --> virtual (negative)
```

### state
- **NGSI-LD type:** Property
- **Value type:** string (enum)
- **Required:** Yes
- **Allowed values:** `active`, `inactive`, `archived`

| Value | Description |
|---|---|
| `active` | Location is in normal operation. Stock moves can be created targeting this location. |
| `inactive` | Location is temporarily suspended (e.g. under maintenance, rearrangement). It will not appear in pick lists for new moves but existing stock is still tracked. |
| `archived` | Location is permanently retired. No new stock moves are permitted. Historical records are preserved. |

### locatedIn
- **NGSI-LD type:** Relationship
- **Object pattern:** `urn:ngsi-ld:Plant:<BusinessKey>`
- **Required:** No
- **Description:** Reference to the Plant in which this location physically resides. Enables plant-level stock aggregation and MRP site planning. A location without `locatedIn` is considered company-wide or virtual.

### parentLocation
- **NGSI-LD type:** Relationship
- **Object pattern:** `urn:ngsi-ld:StockLocation:<BusinessKey>`
- **Required:** No
- **Description:** Reference to the parent StockLocation in the location hierarchy. Enables multi-level trees such as:

```
WH-MAIN  (internal, warehouse root)
  └── WH-STOCK  (internal, main stock area)
        ├── WH-STOCK-A1-R1-B01  (internal, bin)
        └── WH-STOCK-A1-R1-B02  (internal, bin)
  └── WH-RECV   (transit, goods receipt)
  └── WH-SCRAP  (scrap)
```

Querying a parent location can aggregate stock across all descendant locations.

---

## Hierarchy and Aggregation

MRP stock availability is computed by summing quantities across all `internal` locations that belong to a given Plant. Locations can be queried recursively via the `parentLocation` relationship to obtain sub-totals at any level of the hierarchy.

---

## Examples

See [examples/example.jsonld](../examples/example.jsonld) for key-values format and [examples/example-normalized.jsonld](../examples/example-normalized.jsonld) for the normalized NGSI-LD representation.
