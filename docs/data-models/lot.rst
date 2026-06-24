Lot
===

**Tutorial introduced:** :doc:`02 — Inventory <../tutorials/02-inventory>` |
**Schema version:** ``0.2.0`` |
**ID pattern:** ``urn:ngsi-ld:Lot:{LotCode}``

A traceable batch of product received from a supplier or produced in-house.
Lots enable end-to-end traceability from raw material receipt through production
to finished-goods shipment.

Only products with ``trackingPolicy: lot`` or ``serial`` carry lot references on
their ``InventoryBalance`` and ``StockMove`` records.
Only lots with ``qualityStatus: approved`` may be issued to production.

----

Readable view — attribute reference
-------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 22 15 30 10 23

   * - Attribute
     - NGSI-LD kind
     - Type / Values
     - Required
     - Description
   * - ``id``
     - —
     - ``string`` (URN)
     - Yes
     - Unique identifier. Pattern: ``urn:ngsi-ld:Lot:.+``
   * - ``type``
     - —
     - ``"Lot"``
     - Yes
     - NGSI-LD entity type
   * - ``lotCode``
     - Property
     - ``string``
     - Yes
     - Human-readable lot/batch number as assigned by supplier or production
   * - ``expirationDate``
     - Property
     - ISO 8601 ``date``
     - No
     - Expiry date; omit for non-perishable materials
   * - ``origin``
     - Property
     - ``string``
     - No
     - Supplier name or manufacturing order that produced the lot
   * - ``qualityStatus``
     - Property
     - ``pending`` | ``approved`` | ``quarantine`` | ``rejected``
     - Yes
     - Quality disposition; only ``approved`` lots may be issued
   * - ``state``
     - Property
     - ``active`` | ``consumed`` | ``expired``
     - Yes
     - Lifecycle state of the lot
   * - ``product``
     - Relationship
     - → ``Product``
     - Yes
     - Product this lot belongs to

.. list-table:: ``qualityStatus`` values
   :header-rows: 1
   :widths: 20 80

   * - Value
     - Meaning
   * - ``pending``
     - Awaiting quality inspection
   * - ``approved``
     - Cleared for use in production and shipment
   * - ``quarantine``
     - Held pending investigation; cannot be issued
   * - ``rejected``
     - Blocked from use; must be scrapped or returned

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/Lot/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/Lot/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/Lot/schema.json
   :language: json
