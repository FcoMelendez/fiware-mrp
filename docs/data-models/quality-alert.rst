QualityAlert
============

**Tutorial:** v0.9 — Quality, Scrap & Rework  |
**Service:** ``quality-service``  |
**Port:** 8087

Raised automatically when a :doc:`QualityCheck <quality-check>`'s failure
rate (``quantityFailed / quantityInspected``) reaches 20%. This is the
entity a quality-manager dashboard or NGSI-LD subscription would watch —
and, once reviewed, acknowledges via ``acknowledge-quality-alert`` (see
:doc:`Tutorial 09 </tutorials/09-quality>`).

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
     - ``urn:ngsi-ld:QualityAlert:QA-{workOrderSlug}``
   * - ``type``
     - —
     - ``QualityAlert``
     - Entity type
   * - ``severity``
     - Property
     - string enum
     - ``low`` | ``medium`` | ``high`` | ``critical`` — ``high`` at ≥20% failure rate, ``critical`` at ≥50%
   * - ``detectedAt``
     - Property
     - ISO-8601 datetime
     - When the alert was raised
   * - ``comment``
     - Property
     - string
     - Human-readable summary of what triggered the alert
   * - ``status``
     - Property
     - string enum
     - ``open`` | ``acknowledged`` — absent until first acknowledged
   * - ``acknowledgedAt``
     - Property
     - ISO-8601 datetime
     - When the alert was acknowledged — absent until then
   * - ``workOrder``
     - Relationship
     - → WorkOrder
     - The WorkOrder with the high reject rate
   * - ``manufacturingOrder``
     - Relationship
     - → ManufacturingOrder
     - Parent production order
   * - ``product``
     - Relationship
     - → Product
     - Item affected
   * - ``qualityCheck``
     - Relationship
     - → QualityCheck
     - The inspection that triggered this alert

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:QualityAlert:QA-WO-MO-2024-001-LeakTest",
     "type": "QualityAlert",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "severity":   { "type": "Property", "value": "high" },
     "detectedAt": { "type": "Property", "value": "2024-07-01T23:10:00Z" },
     "comment":    { "type": "Property", "value": "20% failure rate on leak_test inspection (2 of 10 units)" },
     "workOrder":          { "type": "Relationship", "object": "urn:ngsi-ld:WorkOrder:WO-MO-2024-001-LeakTest" },
     "manufacturingOrder": { "type": "Relationship", "object": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001" },
     "product":            { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" },
     "qualityCheck":       { "type": "Relationship", "object": "urn:ngsi-ld:QualityCheck:QC-WO-MO-2024-001-LeakTest" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/QualityAlert/schema.json>`

Querying quality alerts
-------------------------

.. code-block:: bash

   curl http://localhost:8087/quality-alerts
   curl "http://localhost:8087/quality-alerts?severity=high"
