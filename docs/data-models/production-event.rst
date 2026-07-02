ProductionEvent
===============

**Tutorial:** v0.7 — Shop-floor Execution  |
**Service:** ``shopfloor-service``  |
**Port:** 8085

An immutable shop-floor audit record created whenever a WorkOrder
changes execution state.  The two event types are:

* ``work_order_started`` — recorded when ``POST /commands/start-work-order``
  transitions a WorkOrder from ``planned`` → ``in_progress``.
* ``work_order_completed`` — recorded when ``POST /commands/complete-work-order``
  transitions a WorkOrder from ``in_progress`` → ``completed``, capturing
  the actual quantity produced.

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
     - ``urn:ngsi-ld:ProductionEvent:{slug}``
   * - ``type``
     - —
     - ``ProductionEvent``
     - Entity type
   * - ``eventType``
     - Property
     - string enum
     - ``work_order_started`` or ``work_order_completed``
   * - ``eventTime``
     - Property
     - ISO-8601 datetime
     - Timestamp when the event was recorded (server clock)
   * - ``quantity``
     - Property
     - number  (unitCode: EA)
     - Units produced; present only on ``work_order_completed`` events
   * - ``workOrder``
     - Relationship
     - → WorkOrder
     - The WorkOrder that triggered the event
   * - ``workCenter``
     - Relationship
     - → WorkCenter
     - The machine/cell where the operation ran
   * - ``manufacturingOrder``
     - Relationship
     - → ManufacturingOrder
     - Parent production order (denormalised for query convenience)
   * - ``product``
     - Relationship
     - → Product
     - Finished item being produced

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:ProductionEvent:PE-WO-MO-2024-001-Assembly-completed",
     "type": "ProductionEvent",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "eventType":  { "type": "Property",      "value": "work_order_completed" },
     "eventTime":  { "type": "Property",      "value": "2024-07-01T18:05:00Z" },
     "quantity":   { "type": "Property",      "value": 10.0, "unitCode": "EA" },
     "workOrder":          { "type": "Relationship", "object": "urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly" },
     "workCenter":         { "type": "Relationship", "object": "urn:ngsi-ld:WorkCenter:WC-Assembly" },
     "manufacturingOrder": { "type": "Relationship", "object": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001" },
     "product":            { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" }
   }

JSON Schema
-----------

Schema location: ``data-models/dataModel.MRP/ProductionEvent/schema.json``

Key constraints:

* ``eventType`` is an enum: ``work_order_started`` | ``work_order_completed``
* ``eventTime`` value must be a valid ``date-time`` string
* ``quantity.value`` must be strictly positive (when present)
* ``workOrder`` Relationship is required; others are recommended

Querying production events
--------------------------

.. code-block:: bash

   # All events
   curl http://localhost:8085/production-events

   # Filter by WorkOrder
   curl "http://localhost:8085/production-events?work_order_id=urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly"

   # Filter by ManufacturingOrder
   curl "http://localhost:8085/production-events?manufacturing_order_id=urn:ngsi-ld:ManufacturingOrder:MO-2024-001"

   # Direct broker query
   curl "http://localhost:1026/ngsi-ld/v1/entities?type=ProductionEvent&limit=50" \
     -H "Accept: application/ld+json"
