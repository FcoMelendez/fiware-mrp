Product
=======

**Tutorial introduced:** :doc:`01 — Getting started <../tutorials/01-getting-started-context>` |
**Schema version:** ``0.1.0`` |
**ID pattern:** ``urn:ngsi-ld:Product:<identifier>``

A product master record used in Manufacturing Resource Planning. Represents any item that can
be manufactured, purchased, consumed, or delivered as a service.

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
     - Unique identifier. Pattern: ``urn:ngsi-ld:Product:.+``
   * - ``type``
     - —
     - ``"Product"``
     - Yes
     - NGSI-LD entity type
   * - ``name``
     - Property
     - ``string``
     - Yes
     - Human-readable name of the product
   * - ``sku``
     - Property
     - ``string``
     - Yes
     - Stock-Keeping Unit code; unique within a company
   * - ``productType``
     - Property
     - ``manufactured`` | ``purchased`` | ``consumable`` | ``service`` | ``byproduct``
     - Yes
     - Classification determining sourcing and planning behaviour
   * - ``trackingPolicy``
     - Property
     - ``none`` | ``lot`` | ``serial``
     - Yes
     - Inventory tracking granularity
   * - ``defaultUnitCode``
     - Property
     - ``string`` (UN/CEFACT)
     - Yes
     - Default unit of measure (e.g. ``EA``, ``KGM``, ``LTR``)
   * - ``standardCost``
     - Property
     - ``number >= 0`` + ``unitCode``
     - No
     - Standard cost per unit with ISO 4217 currency code
   * - ``active``
     - Property
     - ``boolean``
     - Yes
     - Whether the product is active and available for orders and BoMs
   * - ``description``
     - Property
     - ``string``
     - No
     - Free-text description of the product
   * - ``company``
     - Relationship
     - → ``Company``
     - No
     - Owning Company
   * - ``defaultBom``
     - Relationship
     - → ``BillOfMaterials``
     - No
     - Default Bill of Materials used when manufacturing this product *(Tutorial 03)*

----

NGSI-LD template (normalized)
------------------------------

.. literalinclude:: ../../data-models/dataModel.MRP/Product/examples/example-normalized.jsonld
   :language: json

----

Example — key-values
---------------------

.. literalinclude:: ../../data-models/dataModel.MRP/Product/examples/example.jsonld
   :language: json

----

JSON Schema
-----------

.. literalinclude:: ../../data-models/dataModel.MRP/Product/schema.json
   :language: json
