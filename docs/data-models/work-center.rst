WorkCenter
==========

**Tutorial introduced:** :doc:`01 — Getting started <../tutorials/01-getting-started-context>` |
**Schema version:** ``0.0.1`` |
**ID pattern:** ``urn:ngsi-ld:WorkCenter:<identifier>``

A manufacturing resource (machine, cell, or area) where production operations are performed.
It has a defined capacity and belongs to a Plant.

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
     - Unique identifier. Pattern: ``urn:ngsi-ld:WorkCenter:.+``
   * - ``type``
     - —
     - ``"WorkCenter"``
     - Yes
     - NGSI-LD entity type
   * - ``name``
     - Property
     - ``string``
     - Yes
     - Human-readable name of the work center
   * - ``code``
     - Property
     - ``string`` ``[A-Z0-9_-]+``
     - Yes
     - Short business code (e.g. ``WC-ASM``)
   * - ``state``
     - Property
     - ``active`` | ``inactive`` | ``maintenance``
     - Yes
     - Current operational state
   * - ``capacity``
     - Property
     - ``number > 0`` + ``unitCode``
     - Yes
     - Nominal production capacity with UN/CEFACT unit (e.g. ``HUR`` for hours)
   * - ``timeEfficiency``
     - Property
     - ``number`` 0–1
     - No
     - Ratio of productive time to scheduled time
   * - ``costPerHour``
     - Property
     - ``number >= 0`` + ``unitCode``
     - No
     - Operating cost per hour with ISO 4217 currency code
   * - ``oeeTarget``
     - Property
     - ``number`` 0–1
     - No
     - Target Overall Equipment Effectiveness
   * - ``calendarId``
     - Property
     - ``string``
     - No
     - Reference to the shift or working-time calendar
   * - ``locatedIn``
     - Relationship
     - → ``Plant``
     - Yes
     - Plant in which this work center resides
   * - ``hasMachine``
     - Relationship
     - → ``Machine[]``
     - No
     - Machines operated within this work center
   * - ``alternativeWorkCenter``
     - Relationship
     - → ``WorkCenter``
     - No
     - Alternative work center that can substitute this one

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/WorkCenter/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/WorkCenter/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/WorkCenter/schema.json
   :language: json
