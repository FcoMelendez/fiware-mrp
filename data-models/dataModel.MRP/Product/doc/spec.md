# Product - Full Specification

## Overview

The **Product** entity is the central master-data object of the FIWARE MRP data model suite. Every item that moves through the supply chain — whether bought from a supplier, assembled on a production line, consumed as a raw material, or delivered as a service — is described by a Product record.

Products are referenced by Bills of Materials, Manufacturing Orders, Purchase Orders, Stock Moves, and Inventory entries. Understanding the `productType` and `trackingPolicy` fields is essential for correct MRP behaviour.

---

## NGSI-LD Context

```
http://context-server:3000/contexts/mrp/v0.1/context.jsonld
```

---

## URN Pattern

```
urn:ngsi-ld:Product:<BusinessKey>
```

`<BusinessKey>` is typically the SKU or an internal product code, e.g. `urn:ngsi-ld:Product:HydraulicPump-P100`.

---

## Properties

### id
- **Type:** URI (string)
- **Required:** Yes
- **Pattern:** `^urn:ngsi-ld:Product:.+`
- **Description:** Globally unique identifier for the product entity.

### type
- **Type:** string
- **Required:** Yes
- **Value:** `"Product"`

### name
- **NGSI-LD type:** Property
- **Value type:** string
- **Required:** Yes
- **Description:** Human-readable product name shown in UI labels and reports.

### sku
- **NGSI-LD type:** Property
- **Value type:** string
- **Required:** Yes
- **Description:** Stock-Keeping Unit code. Must be unique within a company. Used as the primary business key for identifying a product in transactions.

### productType
- **NGSI-LD type:** Property
- **Value type:** string (enum)
- **Required:** Yes
- **Allowed values:** `manufactured`, `purchased`, `consumable`, `service`, `byproduct`

#### productType Semantics

| Value | Description |
|---|---|
| `manufactured` | The item is produced in-house. MRP will generate Manufacturing Orders (MO) to meet demand. A Bill of Materials is typically associated. |
| `purchased` | The item is sourced from external suppliers. MRP will generate Purchase Orders (PO) or RFQs to replenish stock. |
| `consumable` | A low-value supply item (e.g. lubricant, gloves) that is consumed during production but not tracked individually in BOM components. |
| `service` | An intangible deliverable billed to customers or purchased from vendors. Does not generate stock movements. |
| `byproduct` | A secondary output of a manufacturing process. Appears as a co-product line on a BOM or Routing. Inventory is credited when the parent MO is completed. |

### trackingPolicy
- **NGSI-LD type:** Property
- **Value type:** string (enum)
- **Required:** Yes
- **Allowed values:** `none`, `lot`, `serial`

#### trackingPolicy Semantics

| Value | Description |
|---|---|
| `none` | Stock is tracked by quantity only. No lot or serial number is recorded. Suitable for low-value, interchangeable items. |
| `lot` | Stock is grouped into numbered production batches or purchase lots. All units within a lot share the same lot number. Used for traceability of food, chemicals, pharmaceuticals, etc. |
| `serial` | Each individual unit has a unique serial number. Used for high-value or regulated products requiring full individual traceability (e.g. machinery, medical devices). |

### defaultUnitCode
- **NGSI-LD type:** Property
- **Value type:** string
- **Required:** Yes
- **Description:** Default unit of measure expressed as a [UN/CEFACT Recommendation 20](https://unece.org/trade/uncefact/cl-recommendations) common code (e.g. `EA` for each, `KGM` for kilogram, `LTR` for litre, `MTR` for metre).

### standardCost
- **NGSI-LD type:** Property
- **Value type:** number (≥ 0)
- **Required:** No
- **unitCode:** ISO 4217 currency code (e.g. `USD`, `EUR`)
- **Description:** Standard cost per default unit used for inventory valuation, variance analysis, and BOM cost roll-up.

### active
- **NGSI-LD type:** Property
- **Value type:** boolean
- **Required:** Yes
- **Description:** When `false`, the product is archived. It will not appear in selection lists for new orders or BOMs, though existing records referencing it are preserved.

### description
- **NGSI-LD type:** Property
- **Value type:** string
- **Required:** No
- **Description:** Free-text long description of the product. May include specifications, notes, or regulatory information.

### company
- **NGSI-LD type:** Relationship
- **Object pattern:** `urn:ngsi-ld:Company:<BusinessKey>`
- **Required:** No
- **Description:** Reference to the Company that owns this product record. Enables multi-tenant deployments where multiple companies share one context broker.

### defaultBom
- **NGSI-LD type:** Relationship
- **Object pattern:** `urn:ngsi-ld:BillOfMaterials:<BusinessKey>`
- **Required:** No
- **Description:** Reference to the default Bill of Materials used when creating Manufacturing Orders for this product. Only meaningful when `productType` is `manufactured` or `byproduct`.

---

## MRP Planning Behaviour by productType

```
Demand signal (SO/Forecast)
        |
        v
  MRP engine evaluates product supply rule
        |
        +--- manufactured  --> generates ManufacturingOrder (uses defaultBom + Routing)
        |
        +--- purchased     --> generates PurchaseOrder / RFQ (uses vendor price lists)
        |
        +--- consumable    --> may generate PO; no detailed tracking
        |
        +--- service       --> no stock movement; billing only
        |
        +--- byproduct     --> credited automatically when parent MO is confirmed/done
```

---

## Examples

See [examples/example.jsonld](../examples/example.jsonld) for key-values format and [examples/example-normalized.jsonld](../examples/example-normalized.jsonld) for the normalized NGSI-LD representation.
