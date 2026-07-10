InventoryReservation
====================

**Tutorial:** :doc:`Tutorial 05 – Component Reservations and Shortages </tutorials/05-reservations>`

An ``InventoryReservation`` records the outcome of a component availability check
against a confirmed ``ManufacturingOrder``.  One reservation is created per
``BillOfMaterialsLine``.  Reservations make stock commitments visible to planners
and drive purchasing decisions for shortage lines. Once the missing stock
arrives, ``resolve-shortages`` tops up a ``shortage``/``partial`` reservation
from the newly-available quantity — see the "Receive stock and resolve the
shortage" step in :doc:`Tutorial 05 </tutorials/05-reservations>`.

----

Attribute table
---------------

.. list-table::
   :header-rows: 1
   :widths: 25 12 15 48

   * - Attribute
     - NGSI-LD kind
     - Type
     - Description
   * - ``reservationCode``
     - Property
     - Text
     - Human-readable code, e.g. ``IR-MO-2024-001-PumpCasing``
   * - ``requiredQuantity``
     - Property
     - Number (unitCode)
     - Total quantity the order requires for this component
   * - ``reservedQuantity``
     - Property
     - Number (unitCode)
     - Quantity actually locked from available stock (≤ requiredQuantity)
   * - ``shortageQuantity``
     - Property
     - Number (unitCode)
     - Gap that must be sourced (requiredQuantity − reservedQuantity)
   * - ``state``
     - Property
     - Text enum
     - ``reserved`` | ``partial`` | ``shortage``
   * - ``reservedAt``
     - Property
     - DateTime
     - ISO 8601 timestamp when the reservation was created
   * - ``manufacturingOrder``
     - Relationship
     - ManufacturingOrder
     - The order that triggered this reservation
   * - ``product``
     - Relationship
     - Product
     - The component product being reserved
   * - ``stockLocation``
     - Relationship
     - StockLocation
     - The warehouse location from which stock was drawn
   * - ``inventoryBalance``
     - Relationship
     - InventoryBalance
     - The balance record that was decremented (absent when no stock exists)

----

State machine
-------------

.. code-block:: text

   reserve-components command
         │
         ▼
   availableQty >= requiredQty?
         │ YES → state = reserved
         │
         ▼ NO
   availableQty > 0?
         │ YES → state = partial
         │ NO  → state = shortage

----

NGSI-LD normalised example
--------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-PumpCasing",
     "type": "InventoryReservation",
     "reservationCode":   { "type": "Property",     "value": "IR-MO-2024-001-PumpCasing" },
     "requiredQuantity":  { "type": "Property",     "value": 10, "unitCode": "EA" },
     "reservedQuantity":  { "type": "Property",     "value": 10, "unitCode": "EA" },
     "shortageQuantity":  { "type": "Property",     "value": 0,  "unitCode": "EA" },
     "state":             { "type": "Property",     "value": "reserved" },
     "reservedAt":        { "type": "Property",     "value": "2024-07-01T07:50:00Z" },
     "manufacturingOrder":{ "type": "Relationship", "object": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001" },
     "product":           { "type": "Relationship", "object": "urn:ngsi-ld:Product:PumpCasing" },
     "stockLocation":     { "type": "Relationship", "object": "urn:ngsi-ld:StockLocation:WH-STOCK" },
     "inventoryBalance":  { "type": "Relationship", "object": "urn:ngsi-ld:InventoryBalance:IB-PumpCasing-WH-STOCK" },
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld"
   }

Shortage example
^^^^^^^^^^^^^^^^

.. code-block:: json

   {
     "id": "urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-ElectricMotor",
     "type": "InventoryReservation",
     "reservationCode":   { "type": "Property",     "value": "IR-MO-2024-001-ElectricMotor" },
     "requiredQuantity":  { "type": "Property",     "value": 10, "unitCode": "EA" },
     "reservedQuantity":  { "type": "Property",     "value": 0,  "unitCode": "EA" },
     "shortageQuantity":  { "type": "Property",     "value": 10, "unitCode": "EA" },
     "state":             { "type": "Property",     "value": "shortage" },
     "reservedAt":        { "type": "Property",     "value": "2024-07-01T07:50:00Z" },
     "manufacturingOrder":{ "type": "Relationship", "object": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001" },
     "product":           { "type": "Relationship", "object": "urn:ngsi-ld:Product:ElectricMotor" },
     "stockLocation":     { "type": "Relationship", "object": "urn:ngsi-ld:StockLocation:WH-STOCK" },
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld"
   }

----

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/InventoryReservation/schema.json>`
