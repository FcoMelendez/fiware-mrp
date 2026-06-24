Data Models
===========

The FIWARE MRP data model follows the `Smart Data Models <https://smartdatamodels.org>`_ specification.
Every entity type is published as a JSON Schema under ``data-models/dataModel.MRP/`` and served
through the versioned JSON-LD ``@context`` at ``http://context-server:3000/contexts/mrp/v0.1/context.jsonld``.

Click any entity type below to open its full reference page with:

* **Readable view** — attribute table with NGSI-LD kind, type, and description
* **NGSI-LD template** — normalized example ready to POST to Orion-LD
* **JSON Schema** — machine-readable validation schema
* **Examples** — both key-values and normalized representations

----

Tutorial 01 — Master data entities
------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`Company <company>`
     - Legal or operating entity that owns one or more plants
   * - :doc:`Plant <plant>`
     - Manufacturing facility belonging to a Company
   * - :doc:`ProductionLine <production-line>`
     - Ordered sequence of Work Centers within a Plant
   * - :doc:`WorkCenter <work-center>`
     - Logical production resource with capacity and calendar
   * - :doc:`Product <product>`
     - Manufactured, purchased, consumable, or service item
   * - :doc:`StockLocation <stock-location>`
     - Physical or logical inventory location (warehouse, scrap zone …)

Tutorial 02 — Inventory entities
----------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`InventoryBalance <inventory-balance>`
     - On-hand quantity of a product at a stock location
   * - :doc:`StockMove <stock-move>`
     - Immutable audit record of every inventory movement
   * - :doc:`Lot <lot>`
     - Traceable batch of material (lot-tracked products only)

Tutorial 03 — Bill of Materials entities
-----------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`BillOfMaterials <bill-of-materials>`
     - BOM header: links a finished product to its recipe
   * - :doc:`BillOfMaterialsLine <bill-of-materials-line>`
     - One component line: quantity, scrapFactor, and component Relationship

----

.. toctree::
   :hidden:
   :maxdepth: 1

   company
   plant
   production-line
   work-center
   product
   stock-location
   inventory-balance
   stock-move
   lot
   bill-of-materials
   bill-of-materials-line
