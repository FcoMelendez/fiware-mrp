ReorderingRule
================

**Tutorial:** v0.10 — MPS-lite Demand Planning  |
**Service:** ``mps-service``  |
**Port:** 8088

Per-product inventory policy: safety stock, min/max levels, lot sizing,
lead time, and whether shortfalls are covered by production or
purchasing. Read by ``generate-mps`` alongside a
:doc:`DemandForecast <demand-forecast>` to compute a suggested
production quantity.

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
     - ``urn:ngsi-ld:ReorderingRule:RR-{productCode}``
   * - ``type``
     - —
     - ``ReorderingRule``
     - Entity type
   * - ``safetyStock``
     - Property
     - number (unitCode: EA)
     - Minimum inventory level to protect against demand variability
   * - ``minimumQuantity``
     - Property
     - number (unitCode: EA)
     - Reorder point
   * - ``maximumQuantity``
     - Property
     - number (unitCode: EA)
     - Target stock ceiling
   * - ``lotSize``
     - Property
     - number (unitCode: EA)
     - Suggested quantities are rounded up to a multiple of this batch size
   * - ``leadTimeDays``
     - Property
     - number
     - Days between triggering replenishment and receiving it
   * - ``routePolicy``
     - Property
     - string enum
     - ``make`` | ``buy``
   * - ``product``
     - Relationship
     - → Product
     - Item this policy governs

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:ReorderingRule:RR-HydraulicPump-P100",
     "type": "ReorderingRule",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "safetyStock":     { "type": "Property", "value": 3, "unitCode": "EA" },
     "minimumQuantity": { "type": "Property", "value": 3, "unitCode": "EA" },
     "maximumQuantity": { "type": "Property", "value": 30, "unitCode": "EA" },
     "lotSize":         { "type": "Property", "value": 5, "unitCode": "EA" },
     "leadTimeDays":    { "type": "Property", "value": 3 },
     "routePolicy":     { "type": "Property", "value": "make" },
     "product": { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/ReorderingRule/schema.json>`

Querying reordering rules
---------------------------

.. code-block:: bash

   curl http://localhost:8088/reordering-rules
   curl "http://localhost:8088/reordering-rules?product_id=urn:ngsi-ld:Product:HydraulicPump-P100"
