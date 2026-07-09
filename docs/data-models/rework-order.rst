ReworkOrder
===========

**Tutorial:** v0.9 — Quality, Scrap & Rework  |
**Service:** ``quality-service``  |
**Port:** 8087

An order to correct a quantity of product that failed a
:doc:`QualityCheck <quality-check>` with ``disposition: rework``, routing
the failed units back through production instead of scrapping them.

Attribute reference
-------------------

.. list-table::
   :header-rows: 1
   :widths: 25 15 15 45

   * - Attribute
     - NGSI-LD kind
     - Type / values
     - Description
   * - ``id``
     - —
     - URN string
     - ``urn:ngsi-ld:ReworkOrder:RW-{workOrderSlug}``
   * - ``type``
     - —
     - ``ReworkOrder``
     - Entity type
   * - ``quantity``
     - Property
     - number (unitCode: EA)
     - Quantity to be reworked
   * - ``state``
     - Property
     - string enum
     - ``planned`` | ``in_progress`` | ``completed``
   * - ``reasonCode``
     - Property
     - string
     - Short code for why the units need rework
   * - ``createdAt``
     - Property
     - ISO-8601 datetime
     - When the rework order was created
   * - ``originWorkOrder``
     - Relationship
     - → WorkOrder
     - The WorkOrder whose failed units this rework order corrects
   * - ``manufacturingOrder``
     - Relationship
     - → ManufacturingOrder
     - Parent production order
   * - ``product``
     - Relationship
     - → Product
     - Item being reworked
   * - ``qualityCheck``
     - Relationship
     - → QualityCheck
     - The inspection that triggered this rework order

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:ReworkOrder:RW-WO-MO-2024-001-LeakTest",
     "type": "ReworkOrder",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "quantity":   { "type": "Property", "value": 2, "unitCode": "EA" },
     "state":      { "type": "Property", "value": "planned" },
     "reasonCode": { "type": "Property", "value": "seal_leak" },
     "createdAt":  { "type": "Property", "value": "2024-07-01T23:10:00Z" },
     "originWorkOrder":    { "type": "Relationship", "object": "urn:ngsi-ld:WorkOrder:WO-MO-2024-001-LeakTest" },
     "manufacturingOrder": { "type": "Relationship", "object": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001" },
     "product":            { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" },
     "qualityCheck":       { "type": "Relationship", "object": "urn:ngsi-ld:QualityCheck:QC-WO-MO-2024-001-LeakTest" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/ReworkOrder/schema.json>`

Querying rework orders
-------------------------

.. code-block:: bash

   curl http://localhost:8087/rework-orders
   curl "http://localhost:8087/rework-orders?state=planned"
