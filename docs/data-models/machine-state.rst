MachineState
=============

**Tutorial:** v0.11 — IoT/MES Signals & Subscriptions  |
**Service:** ``iot-simulator``  |
**Port:** 8089

The current derived operational state of a WorkCenter's machine — one
entity per WorkCenter, overwritten (not appended) each time a new
:doc:`MachineSignal <machine-signal>` is processed. This is the entity
Tutorial 11's NGSI-LD subscription watches, so any change pushes live to
the emulator canvas without polling.

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
     - ``urn:ngsi-ld:MachineState:MST-{workCenterCode}`` (one per WorkCenter)
   * - ``type``
     - —
     - ``MachineState``
     - Entity type
   * - ``state``
     - Property
     - string enum
     - ``running`` | ``idle`` | ``fault``
   * - ``detectedAt``
     - Property
     - ISO-8601 datetime
     - When this state was last (re)computed
   * - ``workCenter``
     - Relationship
     - → WorkCenter
     - The machine this state describes
   * - ``lastSignal``
     - Relationship
     - → MachineSignal
     - The reading that produced this state

State derivation rule
-----------------------

``iot-simulator`` computes ``state`` from the incoming signal's
``quality`` and ``signalType``/``actualValue``:

.. code-block:: text

   quality == "bad"                                  → fault
   signalType == "temperature" and actualValue > 80   → fault
   quality == "uncertain"                             → idle
   otherwise                                          → running

NGSI-LD normalized example
---------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:MachineState:MST-WC-Assembly",
     "type": "MachineState",
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "state":      { "type": "Property", "value": "fault" },
     "detectedAt": { "type": "Property", "value": "2024-07-01T09:15:00Z" },
     "workCenter": { "type": "Relationship", "object": "urn:ngsi-ld:WorkCenter:WC-Assembly" },
     "lastSignal": { "type": "Relationship", "object": "urn:ngsi-ld:MachineSignal:MS-WC-Assembly-20240701T091500" }
   }

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/MachineState/schema.json>`

Querying machine states
--------------------------

.. code-block:: bash

   curl http://localhost:8089/machine-states
   curl "http://localhost:8089/machine-states?state=fault"

Subscribing to machine states
--------------------------------

This is the entity type Tutorial 11's NGSI-LD subscription filters on:

.. code-block:: json

   {
     "type": "Subscription",
     "entities": [{ "type": "MachineState" }],
     "notification": {
       "endpoint": { "uri": "http://emulator-gateway:8090/notify", "accept": "application/json" }
     }
   }
