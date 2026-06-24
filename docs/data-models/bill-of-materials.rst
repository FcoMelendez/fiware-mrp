BillOfMaterials
===============

**Tutorial introduced:** :doc:`03 — Bill of Materials <../tutorials/03-bom>` |
**Schema version:** ``0.3.0`` |
**ID pattern:** ``urn:ngsi-ld:BillOfMaterials:{BomCode}``

A Bill of Materials header record.  Links a finished ``Product`` to its
manufacturing recipe — the set of components and quantities required to produce
one unit.  A product may have multiple BOM versions, but only one may carry
``state: active`` at any given time.  The ``bom-service`` always resolves the
active BOM when executing an ``explode-bom`` command.

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
     - Unique identifier. Pattern: ``urn:ngsi-ld:BillOfMaterials:.+``
   * - ``type``
     - —
     - ``"BillOfMaterials"``
     - Yes
     - NGSI-LD entity type
   * - ``bomCode``
     - Property
     - ``string``
     - Yes
     - Short alphanumeric code (e.g. ``BOM-HP-P100-v1``). Human reference key.
   * - ``bomType``
     - Property
     - ``manufacturing`` | ``kitting`` | ``phantom``
     - Yes
     - Controls how the BOM is exploded during MRP planning
   * - ``version``
     - Property
     - ``string``
     - Yes
     - Version label (e.g. ``1.0``, ``2.1-ECO-007``)
   * - ``state``
     - Property
     - ``active`` | ``draft`` | ``obsolete``
     - Yes
     - Lifecycle state; only the ``active`` BOM is used for explosion
   * - ``product``
     - Relationship
     - → ``Product``
     - Yes
     - The finished product that this BOM describes how to make
   * - ``company``
     - Relationship
     - → ``Company``
     - No
     - Owning company; scopes access in multi-tenant deployments

.. list-table:: ``bomType`` values
   :header-rows: 1
   :widths: 20 80

   * - Value
     - Meaning
   * - ``manufacturing``
     - Standard production BOM; generates Work Orders during explosion
   * - ``kitting``
     - Assembly without a routing; used for pick-and-pack operations
   * - ``phantom``
     - Transparent BOM exploded through without a production order; components go to the parent level

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/BillOfMaterials/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/BillOfMaterials/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/BillOfMaterials/schema.json
   :language: json
