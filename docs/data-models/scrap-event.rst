ScrapEvent
==========

**Tutorial:** v0.9 — Quality, Scrap & Rework  |
**Service:** ``quality-service``  |
**Port:** 8087

An immutable record of a quantity of product written off following a
failed :doc:`QualityCheck <quality-check>` with ``disposition: scrap``.
``scrapCost`` is computed from the product's ``standardCost`` at the time
of the event.

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
     - ``urn:ngsi-ld:ScrapEvent:SE-{workOrderSlug}``
   * - ``type``
     - —
     - ``ScrapEvent``
     - Entity type
   * - ``quantity``
     - Property
     - number (unitCode: EA)
     - Quantity scrapped
   * - ``reasonCode``
     - Property
     - string
     - Short code for why the units were scrapped, e.g. ``seal_leak``
   * - ``scrapCost``
     - Property
     - number (unitCode: EUR)
     - ``quantity × product.standardCost``
   * - ``comment``
     - Property
     - string
     - Optional free-text note
   * - ``eventTime``
     - Property
     - ISO-8601 datetime
     - When the scrap event was recorded
   * - ``workOrder``
     - Relationship
     - → WorkOrder
     - The WorkOrder the scrapped units came from
   * - ``product``
     - Relationship
     - → Product
     - Item scrapped
   * - ``qualityCheck``
     - Relationship
     - → QualityCheck
     - The inspection that triggered this scrap event

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:ScrapEvent:SE-WO-MO-2024-001-LeakTest",
     "type": "ScrapEvent",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "quantity":   { "type": "Property", "value": 2, "unitCode": "EA" },
     "reasonCode": { "type": "Property", "value": "seal_leak" },
     "scrapCost":  { "type": "Property", "value": 500.0, "unitCode": "EUR" },
     "eventTime":  { "type": "Property", "value": "2024-07-01T23:10:00Z" },
     "workOrder":    { "type": "Relationship", "object": "urn:ngsi-ld:WorkOrder:WO-MO-2024-001-LeakTest" },
     "product":      { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" },
     "qualityCheck": { "type": "Relationship", "object": "urn:ngsi-ld:QualityCheck:QC-WO-MO-2024-001-LeakTest" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/ScrapEvent/schema.json>`

Querying scrap events
-----------------------

.. code-block:: bash

   curl http://localhost:8087/scrap-events
   curl "http://localhost:8087/scrap-events?work_order_id=urn:ngsi-ld:WorkOrder:WO-MO-2024-001-LeakTest"
