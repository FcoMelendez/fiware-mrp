InventoryBalance
================

**Tutorial introduced:** :doc:`02 — Inventory <../tutorials/02-inventory>` |
**Schema version:** ``0.2.0`` |
**ID pattern:** ``urn:ngsi-ld:InventoryBalance:IB-{ProductCode}-{LocationCode}[-{LotCode}]``

The current on-hand quantity of a specific product at a specific stock location.
An ``InventoryBalance`` is created by the first ``receive-material`` command for a
product/location combination and patched (not replaced) by every subsequent
``StockMove`` that reaches state ``done``.

When a product has ``trackingPolicy: lot``, a separate ``InventoryBalance`` exists
per lot — the ID includes the lot code as a suffix.

----

Readable view — attribute reference
-------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 22 15 25 10 28

   * - Attribute
     - NGSI-LD kind
     - Type / Values
     - Required
     - Description
   * - ``id``
     - —
     - ``string`` (URN)
     - Yes
     - Unique identifier. Pattern: ``urn:ngsi-ld:InventoryBalance:.+``
   * - ``type``
     - —
     - ``"InventoryBalance"``
     - Yes
     - NGSI-LD entity type
   * - ``quantityOnHand``
     - Property
     - ``number >= 0`` + ``unitCode``
     - Yes
     - Total quantity physically present, regardless of reservation
   * - ``reservedQuantity``
     - Property
     - ``number >= 0`` + ``unitCode``
     - No
     - Quantity committed to open orders or transfers
   * - ``availableQuantity``
     - Property
     - ``number`` + ``unitCode``
     - No
     - ``quantityOnHand`` minus ``reservedQuantity``
   * - ``inventoryDate``
     - Property
     - ISO 8601 ``date-time``
     - Yes
     - Timestamp of the last balance update
   * - ``state``
     - Property
     - ``active`` | ``frozen``
     - Yes
     - ``frozen``: location under inventory count; no movements allowed
   * - ``product``
     - Relationship
     - → ``Product``
     - Yes
     - Product whose quantity is tracked
   * - ``location``
     - Relationship
     - → ``StockLocation``
     - Yes
     - Location where the stock physically resides
   * - ``lot``
     - Relationship
     - → ``Lot``
     - No
     - Present only when the product is lot-tracked

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/InventoryBalance/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/InventoryBalance/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/InventoryBalance/schema.json
   :language: json
