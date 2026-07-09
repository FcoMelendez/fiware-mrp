OperatorAssignment
====================

**Tutorial:** v0.11 — IoT/MES Signals & Subscriptions  |
**Service:** ``iot-simulator``  |
**Port:** 8089

A record of an Operator clocking in and out at a WorkCenter.
``actualDuration`` is computed and set only at clock-out.

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
     - ``urn:ngsi-ld:OperatorAssignment:OA-{operatorCode}-{workCenterCode}-{suffix}``
   * - ``type``
     - —
     - ``OperatorAssignment``
     - Entity type
   * - ``timerStatus``
     - Property
     - string enum
     - ``clocked_in`` | ``clocked_out``
   * - ``actualStart``
     - Property
     - ISO-8601 datetime
     - Clock-in timestamp
   * - ``actualEnd``
     - Property
     - ISO-8601 datetime
     - Clock-out timestamp; absent until clocked out
   * - ``actualDuration``
     - Property
     - number, hours
     - ``actualEnd − actualStart``, computed at clock-out
   * - ``operator``
     - Relationship
     - → Operator
     - Who clocked in
   * - ``workCenter``
     - Relationship
     - → WorkCenter
     - Where they clocked in

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:OperatorAssignment:OA-JaneDoe-WC-Assembly-A1B2",
     "type": "OperatorAssignment",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "timerStatus":    { "type": "Property", "value": "clocked_out" },
     "actualStart":    { "type": "Property", "value": "2024-07-01T08:00:00Z" },
     "actualEnd":      { "type": "Property", "value": "2024-07-01T16:00:00Z" },
     "actualDuration": { "type": "Property", "value": 8.0 },
     "operator":   { "type": "Relationship", "object": "urn:ngsi-ld:Operator:OP-JaneDoe" },
     "workCenter": { "type": "Relationship", "object": "urn:ngsi-ld:WorkCenter:WC-Assembly" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/OperatorAssignment/schema.json>`

Querying operator assignments
--------------------------------

.. code-block:: bash

   curl http://localhost:8089/operator-assignments
   curl "http://localhost:8089/operator-assignments?timer_status=clocked_in"
