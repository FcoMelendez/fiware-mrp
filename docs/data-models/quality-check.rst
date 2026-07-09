QualityCheck
=============

**Tutorial:** v0.9 — Quality, Scrap & Rework  |
**Service:** ``quality-service``  |
**Port:** 8087

A quality inspection performed on a completed WorkOrder. Compares a
measured ``actualValue`` against an ``expectedValue`` within a
``tolerance`` to derive ``result`` (``pass`` | ``fail``), and records how
many of the inspected units failed. When ``quantityFailed`` is greater
than zero, ``disposition`` records how those units are handled
(``scrap`` | ``rework`` | ``use_as_is``).

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
     - ``urn:ngsi-ld:QualityCheck:QC-{workOrderSlug}``
   * - ``type``
     - —
     - ``QualityCheck``
     - Entity type
   * - ``checkType``
     - Property
     - string
     - Kind of inspection, e.g. ``leak_test``, ``dimensional``, ``visual``
   * - ``result``
     - Property
     - string enum
     - ``pass`` or ``fail`` — derived from ``|actualValue − expectedValue| ≤ tolerance``
   * - ``expectedValue``
     - Property
     - number
     - Target measurement
   * - ``actualValue``
     - Property
     - number
     - Measured value
   * - ``tolerance``
     - Property
     - number
     - Maximum allowed deviation for ``result: pass``
   * - ``required``
     - Property
     - boolean
     - Whether passing this check is mandatory
   * - ``quantityInspected``
     - Property
     - number (unitCode: EA)
     - Units inspected
   * - ``quantityFailed``
     - Property
     - number (unitCode: EA)
     - Units rejected; 0 when ``result: pass``
   * - ``disposition``
     - Property
     - string enum
     - ``scrap`` | ``rework`` | ``use_as_is`` — present only when ``quantityFailed`` > 0
   * - ``eventTime``
     - Property
     - ISO-8601 datetime
     - When the inspection was recorded
   * - ``workOrder``
     - Relationship
     - → WorkOrder
     - The WorkOrder inspected
   * - ``manufacturingOrder``
     - Relationship
     - → ManufacturingOrder
     - Parent production order
   * - ``product``
     - Relationship
     - → Product
     - Item being inspected

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:QualityCheck:QC-WO-MO-2024-001-LeakTest",
     "type": "QualityCheck",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "checkType":         { "type": "Property", "value": "leak_test" },
     "result":            { "type": "Property", "value": "fail" },
     "expectedValue":     { "type": "Property", "value": 0.0 },
     "actualValue":       { "type": "Property", "value": 0.2 },
     "tolerance":         { "type": "Property", "value": 0.1 },
     "required":          { "type": "Property", "value": true },
     "quantityInspected": { "type": "Property", "value": 10, "unitCode": "EA" },
     "quantityFailed":    { "type": "Property", "value": 2, "unitCode": "EA" },
     "disposition":       { "type": "Property", "value": "rework" },
     "eventTime":         { "type": "Property", "value": "2024-07-01T23:10:00Z" },
     "workOrder":          { "type": "Relationship", "object": "urn:ngsi-ld:WorkOrder:WO-MO-2024-001-LeakTest" },
     "manufacturingOrder": { "type": "Relationship", "object": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001" },
     "product":            { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/QualityCheck/schema.json>`

Key constraints:

* ``result`` is an enum: ``pass`` | ``fail``
* ``disposition`` is an enum: ``scrap`` | ``rework`` | ``use_as_is``
* ``workOrder`` Relationship is required; ``manufacturingOrder`` and ``product`` are recommended

Querying quality checks
------------------------

.. code-block:: bash

   # All checks
   curl http://localhost:8087/quality-checks

   # Filter by WorkOrder or result
   curl "http://localhost:8087/quality-checks?work_order_id=urn:ngsi-ld:WorkOrder:WO-MO-2024-001-LeakTest"
   curl "http://localhost:8087/quality-checks?result=fail"
