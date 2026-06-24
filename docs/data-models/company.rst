Company
=======

**Tutorial introduced:** :doc:`01 — Getting started <../tutorials/01-getting-started-context>` |
**Schema version:** ``0.1.0`` |
**ID pattern:** ``urn:ngsi-ld:Company:<identifier>``

A legal entity that owns one or more manufacturing plants in the MRP system.

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
     - Unique identifier. Pattern: ``urn:ngsi-ld:Company:.+``
   * - ``type``
     - —
     - ``"Company"``
     - Yes
     - NGSI-LD entity type
   * - ``name``
     - Property
     - ``string``
     - Yes
     - Company display name
   * - ``legalName``
     - Property
     - ``string``
     - No
     - Full legal name of the company
   * - ``companyCode``
     - Property
     - ``string`` ``[A-Z0-9_-]+``
     - Yes
     - Short alphanumeric code identifying the company
   * - ``state``
     - Property
     - ``active`` | ``inactive`` | ``archived``
     - Yes
     - Lifecycle state of the company
   * - ``hasPlant``
     - Relationship
     - → ``Plant`` (one or array)
     - No
     - Plants owned by this company

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/Company/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/Company/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/Company/schema.json
   :language: json
