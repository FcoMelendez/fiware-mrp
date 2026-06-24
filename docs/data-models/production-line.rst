ProductionLine
==============

**Tutorial introduced:** :doc:`01 — Getting started <../tutorials/01-getting-started-context>` |
**Schema version:** ``0.0.1`` |
**ID pattern:** ``urn:ngsi-ld:ProductionLine:<identifier>``

A Production Line groups an ordered set of Work Centers that collaborate to manufacture a
product family. It defines the takt time that governs throughput rate and belongs to a Plant.

.. note::

   ``ProductionLine`` is defined and seeded in Tutorial 01 but is not populated with
   data in the standard seed file.  It becomes relevant from Tutorial 06 (Scheduling)
   onwards when routing sequences are introduced.

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
     - Unique identifier. Pattern: ``urn:ngsi-ld:ProductionLine:.+``
   * - ``type``
     - —
     - ``"ProductionLine"``
     - Yes
     - NGSI-LD entity type
   * - ``name``
     - Property
     - ``string``
     - Yes
     - Human-readable name of the production line
   * - ``lineCode``
     - Property
     - ``string`` ``[A-Z0-9_-]+``
     - Yes
     - Short business code (e.g. ``PL-BCN-001``)
   * - ``state``
     - Property
     - ``active`` | ``inactive`` | ``maintenance``
     - Yes
     - Current operational state
   * - ``taktTime``
     - Property
     - ``number > 0``, ``unitCode: "SEC"``
     - No
     - Takt time in seconds — rate at which finished units must be produced
   * - ``locatedIn``
     - Relationship
     - → ``Plant``
     - Yes
     - Plant in which this production line is located
   * - ``hasWorkCenter``
     - Relationship
     - → ``WorkCenter[]``
     - No
     - Ordered list of Work Centers forming this production line

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/ProductionLine/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/ProductionLine/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/ProductionLine/schema.json
   :language: json
