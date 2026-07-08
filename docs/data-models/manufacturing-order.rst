ManufacturingOrder
==================

**Tutorial:** :doc:`Tutorial 04 – Manufacturing Order Confirmation </tutorials/tutorial_04>`

A ``ManufacturingOrder`` is an instruction to produce a specified quantity of a finished
product by a planned date.  It links a ``Product`` to its ``BillOfMaterials``, carries
a state machine (``draft`` → ``confirmed`` → ``in_progress`` → ``completed``), and
drives component reservation and work-order generation in subsequent tutorials.

----

Attribute table
---------------

.. list-table::
   :header-rows: 1
   :widths: 25 12 15 48

   * - Attribute
     - NGSI-LD kind
     - Type
     - Description
   * - ``orderCode``
     - Property
     - Text
     - Human-readable order code, e.g. ``MO-2024-001``
   * - ``quantity``
     - Property
     - Number (unitCode)
     - Quantity of finished product to produce
   * - ``state``
     - Property
     - Text enum
     - ``draft`` | ``confirmed`` | ``in_progress`` | ``completed``
   * - ``plannedStart``
     - Property
     - DateTime
     - Planned production start (ISO 8601)
   * - ``plannedEnd``
     - Property
     - DateTime
     - Planned production end (ISO 8601)
   * - ``priority``
     - Property
     - Text
     - ``normal`` | ``urgent`` | ``critical``
   * - ``confirmedAt``
     - Property
     - DateTime
     - Timestamp set when the order transitions to ``confirmed``
   * - ``completedAt``
     - Property
     - DateTime
     - Timestamp set when the order transitions to ``completed`` (see :doc:`Tutorial 08 </tutorials/08-finished-goods>`)
   * - ``product``
     - Relationship
     - Product
     - The finished product being manufactured
   * - ``bom``
     - Relationship
     - BillOfMaterials
     - The Bill of Materials recipe to follow

----

NGSI-LD normalised example
--------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001",
     "type": "ManufacturingOrder",
     "orderCode":    { "type": "Property",     "value": "MO-2024-001" },
     "quantity":     { "type": "Property",     "value": 10, "unitCode": "EA" },
     "state":        { "type": "Property",     "value": "confirmed" },
     "plannedStart": { "type": "Property",     "value": "2024-07-01T08:00:00Z" },
     "plannedEnd":   { "type": "Property",     "value": "2024-07-03T17:00:00Z" },
     "priority":     { "type": "Property",     "value": "normal" },
     "confirmedAt":  { "type": "Property",     "value": "2024-07-01T07:45:00Z" },
     "completedAt":  { "type": "Property",     "value": "2024-07-02T01:25:00Z" },
     "product":      { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" },
     "bom":          { "type": "Relationship", "object": "urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1" },
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld"
   }

----

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/ManufacturingOrder/schema.json>`
