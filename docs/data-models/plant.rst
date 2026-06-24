Plant
=====

**Tutorial introduced:** :doc:`01 — Getting started <../tutorials/01-getting-started-context>` |
**Schema version:** ``0.1.0`` |
**ID pattern:** ``urn:ngsi-ld:Plant:<identifier>``

A manufacturing facility (plant) operated by a Company. Every WorkCenter and StockLocation
belongs to a Plant through a ``locatedIn`` Relationship.

----

Readable view — attribute reference
-------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 20 15 25 10 30

   * - Attribute
     - NGSI-LD kind
     - Type / Values
     - Required
     - Description
   * - ``id``
     - —
     - ``string`` (URN)
     - Yes
     - Unique identifier. Pattern: ``urn:ngsi-ld:Plant:.+``
   * - ``type``
     - —
     - ``"Plant"``
     - Yes
     - NGSI-LD entity type
   * - ``name``
     - Property
     - ``string``
     - Yes
     - Plant display name
   * - ``plantCode``
     - Property
     - ``string`` ``[A-Z0-9_-]+``
     - Yes
     - Short alphanumeric code identifying the plant (e.g. ``BCN``)
   * - ``timezone``
     - Property
     - ``string`` (IANA)
     - Yes
     - IANA timezone string for the plant's local time (e.g. ``Europe/Madrid``)
   * - ``state``
     - Property
     - ``active`` | ``inactive`` | ``archived``
     - Yes
     - Lifecycle state of the plant
   * - ``ownedBy``
     - Relationship
     - → ``Company``
     - Yes
     - The Company that owns this plant
   * - ``hasProductionLine``
     - Relationship
     - → ``ProductionLine`` (one or array)
     - No
     - Production lines located within this plant
   * - ``hasStockLocation``
     - Relationship
     - → ``StockLocation`` (one or array)
     - No
     - Stock locations within this plant

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/Plant/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/Plant/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/Plant/schema.json
   :language: json
