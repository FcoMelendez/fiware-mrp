MasterProductionScheduleLine
==============================

**Tutorial:** v0.10 — MPS-lite Demand Planning  |
**Service:** ``mps-service``  |
**Port:** 8088

The result of running ``generate-mps`` for a
:doc:`DemandForecast <demand-forecast>`: the projected inventory
position for the bucket and a suggested production quantity, which a
planner may confirm via ``confirm-mps-line``.

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
     - ``urn:ngsi-ld:MasterProductionScheduleLine:MPSL-{productCode}-{bucketLabel}``
   * - ``type``
     - —
     - ``MasterProductionScheduleLine``
     - Entity type
   * - ``bucketStart`` / ``bucketEnd``
     - Property
     - ISO-8601 datetime
     - Copied from the source DemandForecast
   * - ``projectedInventory``
     - Property
     - number (unitCode: EA)
     - Current on-hand (summed across locations) minus ``forecastQuantity``; may be negative
   * - ``suggestedProductionQuantity``
     - Property
     - number (unitCode: EA)
     - Shortfall against ``safetyStock``, rounded up to ``lotSize``; 0 when no shortfall
   * - ``confirmedProductionQuantity``
     - Property
     - number (unitCode: EA)
     - Set by ``confirm-mps-line``; absent until confirmed
   * - ``state``
     - Property
     - string enum
     - ``suggested`` | ``confirmed``
   * - ``product``
     - Relationship
     - → Product
     - Item being planned
   * - ``demandForecast``
     - Relationship
     - → DemandForecast
     - The forecast this line was generated from
   * - ``reorderingRule``
     - Relationship
     - → ReorderingRule
     - The policy used to compute the suggestion

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:MasterProductionScheduleLine:MPSL-HydraulicPump-P100-2024-08",
     "type": "MasterProductionScheduleLine",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "bucketStart":                 { "type": "Property", "value": "2024-08-01T00:00:00Z" },
     "bucketEnd":                   { "type": "Property", "value": "2024-08-31T23:59:59Z" },
     "projectedInventory":          { "type": "Property", "value": -7, "unitCode": "EA" },
     "suggestedProductionQuantity": { "type": "Property", "value": 10, "unitCode": "EA" },
     "confirmedProductionQuantity": { "type": "Property", "value": 10, "unitCode": "EA" },
     "state": { "type": "Property", "value": "confirmed" },
     "product":        { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" },
     "demandForecast":  { "type": "Relationship", "object": "urn:ngsi-ld:DemandForecast:DF-HydraulicPump-P100-2024-08" },
     "reorderingRule":  { "type": "Relationship", "object": "urn:ngsi-ld:ReorderingRule:RR-HydraulicPump-P100" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/MasterProductionScheduleLine/schema.json>`

Querying MPS lines
--------------------

.. code-block:: bash

   curl http://localhost:8088/mps-lines
   curl "http://localhost:8088/mps-lines?state=suggested"
