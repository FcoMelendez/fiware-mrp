StockLocation
=============

**Tutorial introduced:** :doc:`01 — Getting started <../tutorials/01-getting-started-context>` |
**Schema version:** ``0.1.0`` |
**ID pattern:** ``urn:ngsi-ld:StockLocation:<identifier>``

A physical or virtual location that holds or routes inventory within the MRP system.
Locations form a hierarchy (warehouse → aisle → rack → bin) and are classified by
``locationType`` to drive MRP valuation and traceability rules.

----

Readable view — attribute reference
-------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 22 15 35 10 18

   * - Attribute
     - NGSI-LD kind
     - Type / Values
     - Required
     - Description
   * - ``id``
     - —
     - ``string`` (URN)
     - Yes
     - Unique identifier. Pattern: ``urn:ngsi-ld:StockLocation:.+``
   * - ``type``
     - —
     - ``"StockLocation"``
     - Yes
     - NGSI-LD entity type
   * - ``name``
     - Property
     - ``string``
     - Yes
     - Human-readable name of the location
   * - ``locationCode``
     - Property
     - ``string`` ``[A-Z0-9_-]+``
     - Yes
     - Unique alphanumeric code within the plant or company
   * - ``locationType``
     - Property
     - ``internal`` | ``customer`` | ``supplier`` | ``transit`` | ``scrap`` | ``virtual``
     - Yes
     - Role of the location in MRP inventory flows
   * - ``state``
     - Property
     - ``active`` | ``inactive`` | ``archived``
     - Yes
     - Current operational state
   * - ``locatedIn``
     - Relationship
     - → ``Plant``
     - No
     - Plant that physically contains this location
   * - ``parentLocation``
     - Relationship
     - → ``StockLocation``
     - No
     - Parent location in the location hierarchy

.. list-table:: ``locationType`` values
   :header-rows: 1
   :widths: 20 80

   * - Value
     - Meaning
   * - ``internal``
     - Owned stock location (warehouse, shop floor, WIP buffer)
   * - ``customer``
     - Customer site — destination for shipments
   * - ``supplier``
     - Supplier site — origin for purchase receipts
   * - ``transit``
     - In-transit stock between locations
   * - ``scrap``
     - Scrap zone — moves here are written off
   * - ``virtual``
     - Virtual location used for adjustments and system entries

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/StockLocation/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/StockLocation/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/StockLocation/schema.json
   :language: json
