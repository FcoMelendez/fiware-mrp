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

Tutorial 04 — Manufacturing order entities
-------------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`ManufacturingOrder <manufacturing-order>`
     - Production order header with quantity, state, and BoM Relationship

Tutorial 05 — Component reservation entities
---------------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`InventoryReservation <inventory-reservation>`
     - Stock commitment per BOM line: required, reserved, and shortage quantities

Tutorial 06 — Work order entities
-----------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`WorkOrder <work-order>`
     - One routing step in MO execution: operation, WorkCenter, planned dates, duration

Tutorial 07 — Shop-floor execution entities
--------------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`ProductionEvent <production-event>`
     - Immutable audit record of a work-order-started or work-order-completed event

Tutorial 08 — Finished goods receipt
---------------------------------------

Tutorial 08 introduces **no new entity type**.  It closes the production
loop by reusing two entities already defined in Tutorial 02:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - How Tutorial 08 uses it
   * - :doc:`StockMove <stock-move>`
     - A ``moveType: receipt`` move into the finished-goods ``StockLocation``, with ``origin`` pointing back at the ``ManufacturingOrder`` for traceability
   * - :doc:`InventoryBalance <inventory-balance>`
     - Created or incremented for the finished product at the finished-goods location
   * - :doc:`ManufacturingOrder <manufacturing-order>`
     - Gains a new ``completedAt`` attribute, set when the order reaches ``state: completed``

Tutorial 09 — Quality, scrap and rework entities
---------------------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`QualityCheck <quality-check>`
     - Inspection result on a completed WorkOrder: measured value vs. tolerance, quantity failed, disposition
   * - :doc:`ScrapEvent <scrap-event>`
     - Immutable record of units written off following a failed check with ``disposition: scrap``
   * - :doc:`ReworkOrder <rework-order>`
     - Order to correct failed units following a check with ``disposition: rework``
   * - :doc:`QualityAlert <quality-alert>`
     - Auto-raised when a check's failure rate reaches 20%

Tutorial 10 — MPS-lite demand planning entities
----------------------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`DemandForecast <demand-forecast>`
     - Forecasted demand for a product over a time bucket
   * - :doc:`ReorderingRule <reordering-rule>`
     - Per-product safety stock, min/max, lot size, and lead time policy
   * - :doc:`MasterProductionScheduleLine <master-production-schedule-line>`
     - Computed projected inventory and suggested production quantity, confirmable by a planner

Tutorial 11 — IoT/MES signals and subscriptions entities
-------------------------------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - :doc:`MachineSignal <machine-signal>`
     - Immutable telemetry reading for a WorkCenter, with an ``observedAt``-timestamped value
   * - :doc:`MachineState <machine-state>`
     - Derived running/idle/fault state per WorkCenter — watched by a live NGSI-LD subscription
   * - :doc:`OperatorAssignment <operator-assignment>`
     - An Operator's clock-in/clock-out record at a WorkCenter

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
   manufacturing-order
   inventory-reservation
   work-order
   production-event
   quality-check
   scrap-event
   rework-order
   quality-alert
   demand-forecast
   reordering-rule
   master-production-schedule-line
   machine-signal
   machine-state
   operator-assignment
