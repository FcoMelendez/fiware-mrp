StockMove
=========

**Tutorial introduced:** :doc:`02 — Inventory <../tutorials/02-inventory>` |
**Schema version:** ``0.2.0`` |
**ID pattern:** ``urn:ngsi-ld:StockMove:SM-{yyyyMMdd}-{random}``

An immutable audit record of a single inventory movement that transfers a quantity of a
product between two stock locations (or from a supplier for receipts).
Every ``StockMove`` that reaches state ``done`` updates the ``InventoryBalance`` of the
affected product/location combinations.

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
     - Unique identifier. Pattern: ``urn:ngsi-ld:StockMove:.+``
   * - ``type``
     - —
     - ``"StockMove"``
     - Yes
     - NGSI-LD entity type
   * - ``moveType``
     - Property
     - ``receipt`` | ``issue`` | ``transfer`` | ``adjustment`` | ``scrap``
     - Yes
     - Category of the movement
   * - ``quantity``
     - Property
     - ``number > 0`` + ``unitCode``
     - Yes
     - Quantity moved; always positive
   * - ``state``
     - Property
     - ``draft`` | ``done`` | ``cancelled``
     - Yes
     - Lifecycle state; only ``done`` moves update balances
   * - ``actualDate``
     - Property
     - ISO 8601 ``date-time``
     - Yes
     - Timestamp when the physical movement occurred
   * - ``origin``
     - Property
     - ``string``
     - No
     - Source document reference (e.g. purchase order number)
   * - ``product``
     - Relationship
     - → ``Product``
     - Yes
     - Product being moved
   * - ``fromLocation``
     - Relationship
     - → ``StockLocation``
     - No
     - Source location; absent for supplier receipts
   * - ``toLocation``
     - Relationship
     - → ``StockLocation``
     - Yes
     - Destination location
   * - ``lot``
     - Relationship
     - → ``Lot``
     - No
     - Present only when the product is lot-tracked

.. list-table:: ``moveType`` values
   :header-rows: 1
   :widths: 20 80

   * - Value
     - Meaning
   * - ``receipt``
     - Goods in from a supplier; ``fromLocation`` is absent
   * - ``issue``
     - Consumption by production; stock leaves a location
   * - ``transfer``
     - Location-to-location movement within the same company
   * - ``adjustment``
     - Inventory count correction (positive or negative)
   * - ``scrap``
     - Write-off; quantity moves to a scrap location

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/StockMove/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/StockMove/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/StockMove/schema.json
   :language: json
