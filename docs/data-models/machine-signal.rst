MachineSignal
==============

**Tutorial:** v0.11 — IoT/MES Signals & Subscriptions  |
**Service:** ``iot-simulator``  |
**Port:** 8089

An immutable telemetry reading for a WorkCenter — a temperature,
vibration, or other sensor value. ``actualValue`` carries an
``observedAt`` timestamp per the NGSI-LD Property metadata convention,
recording when the physical reading occurred independently of when the
entity was written to Orion-LD.

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
     - ``urn:ngsi-ld:MachineSignal:MS-{workCenterCode}-{timestamp}``
   * - ``type``
     - —
     - ``MachineSignal``
     - Entity type
   * - ``signalType``
     - Property
     - string
     - Kind of telemetry, e.g. ``temperature``, ``vibration``, ``cycle_count``
   * - ``actualValue``
     - Property
     - number, with ``observedAt`` metadata
     - The measured reading and when it was physically taken
   * - ``quality``
     - Property
     - string enum
     - ``good`` | ``uncertain`` | ``bad`` (OPC-UA-style signal quality)
   * - ``workCenter``
     - Relationship
     - → WorkCenter
     - Where the reading was taken

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:MachineSignal:MS-WC-Assembly-20240701T091500",
     "type": "MachineSignal",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "signalType":  { "type": "Property", "value": "temperature" },
     "actualValue": { "type": "Property", "value": 92.0, "unitCode": "CEL", "observedAt": "2024-07-01T09:15:00Z" },
     "quality":     { "type": "Property", "value": "bad" },
     "workCenter": { "type": "Relationship", "object": "urn:ngsi-ld:WorkCenter:WC-Assembly" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/MachineSignal/schema.json>`

Querying machine signals
---------------------------

.. code-block:: bash

   curl http://localhost:8089/machine-signals
   curl "http://localhost:8089/machine-signals?work_center_id=urn:ngsi-ld:WorkCenter:WC-Assembly"
