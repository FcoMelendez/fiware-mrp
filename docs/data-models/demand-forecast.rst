DemandForecast
================

**Tutorial:** v0.10 — MPS-lite Demand Planning  |
**Service:** ``mps-service``  |
**Port:** 8088

A forecasted demand quantity for a product over a time bucket. Consumed
by :doc:`generate-mps <../tutorials/10-mps>` alongside a
:doc:`ReorderingRule <reordering-rule>` and current inventory to compute
a :doc:`MasterProductionScheduleLine <master-production-schedule-line>`.

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
     - ``urn:ngsi-ld:DemandForecast:DF-{productCode}-{bucketLabel}``
   * - ``type``
     - —
     - ``DemandForecast``
     - Entity type
   * - ``bucketStart``
     - Property
     - ISO-8601 datetime
     - Start of the forecast period
   * - ``bucketEnd``
     - Property
     - ISO-8601 datetime
     - End of the forecast period
   * - ``forecastQuantity``
     - Property
     - number (unitCode: EA)
     - Forecasted demand for the bucket
   * - ``confidence``
     - Property
     - number, 0.0-1.0
     - Forecast confidence
   * - ``product``
     - Relationship
     - → Product
     - Item being forecast

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:DemandForecast:DF-HydraulicPump-P100-2024-08",
     "type": "DemandForecast",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "bucketStart":      { "type": "Property", "value": "2024-08-01T00:00:00Z" },
     "bucketEnd":        { "type": "Property", "value": "2024-08-31T23:59:59Z" },
     "forecastQuantity": { "type": "Property", "value": 12, "unitCode": "EA" },
     "confidence":       { "type": "Property", "value": 0.8 },
     "product": { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/DemandForecast/schema.json>`

Querying demand forecasts
---------------------------

.. code-block:: bash

   curl http://localhost:8088/demand-forecasts
   curl "http://localhost:8088/demand-forecasts?product_id=urn:ngsi-ld:Product:HydraulicPump-P100"
