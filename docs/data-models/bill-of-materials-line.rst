BillOfMaterialsLine
===================

**Tutorial introduced:** :doc:`03 — Bill of Materials <../tutorials/03-bom>` |
**Schema version:** ``0.3.0`` |
**ID pattern:** ``urn:ngsi-ld:BillOfMaterialsLine:{BomCode}-{ComponentCode}``

One component line within a ``BillOfMaterials``.  Each line specifies the
quantity of a purchased or manufactured component required to produce one unit
of the finished product.  The complete set of lines for a BOM is its recipe.

During ``explode-bom``, the ``bom-service`` multiplies each line's ``quantity``
by the order quantity:
``required_quantity = line_qty × order_qty``.

The ``scrapFactor`` field records the expected waste rate but is not applied to
net requirements until the MRP planning engine is introduced in Tutorial 10.

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
     - Unique identifier. Pattern: ``urn:ngsi-ld:BillOfMaterialsLine:.+``
   * - ``type``
     - —
     - ``"BillOfMaterialsLine"``
     - Yes
     - NGSI-LD entity type
   * - ``sequence``
     - Property
     - ``integer ≥ 1``
     - Yes
     - Display and pick order within the BOM; lower values appear first
   * - ``quantity``
     - Property
     - ``number > 0`` + ``unitCode``
     - Yes
     - Units of the component needed per one finished product unit
   * - ``scrapFactor``
     - Property
     - ``number`` 0–1
     - No
     - Expected scrap rate (e.g. ``0.02`` = 2%); informational until Tutorial 10
   * - ``bom``
     - Relationship
     - → ``BillOfMaterials``
     - Yes
     - Parent BOM header this line belongs to
   * - ``component``
     - Relationship
     - → ``Product``
     - Yes
     - The component product required by this line

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/BillOfMaterialsLine/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/BillOfMaterialsLine/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/BillOfMaterialsLine/schema.json
   :language: json
