WorkOrder
=========

**Tutorial:** :doc:`Tutorial 06 – Work Orders and Finite-Capacity Scheduling </tutorials/06-work-orders>`

A ``WorkOrder`` is one routing step in the execution of a ``ManufacturingOrder``.
It is created by the ``scheduler-service`` and links a specific production operation
(e.g., Assembly, Leak Test, Packaging) to the ``WorkCenter`` that performs it, carrying
planned start/end timestamps and a duration derived from MO quantity × routing rate.

In Tutorial 06, the routing is hardcoded: **Assembly → LeakTest → Packaging**.
Work orders are scheduled sequentially with no shift-calendar constraints — each
operation starts exactly when the previous one ends.

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
   * - ``workOrderCode``
     - Property
     - Text
     - Human-readable work order code, e.g. ``WO-MO-2024-001-Assembly``
   * - ``operationName``
     - Property
     - Text
     - Name of the production operation, e.g. ``Assembly``
   * - ``sequence``
     - Property
     - Integer
     - Routing step position (1 = first, 2 = second, …)
   * - ``plannedStart``
     - Property
     - DateTime
     - Planned operation start (ISO 8601)
   * - ``plannedEnd``
     - Property
     - DateTime
     - Planned operation end (ISO 8601)
   * - ``durationHours``
     - Property
     - Number
     - Planned duration in hours (MO quantity × hours-per-unit for this operation)
   * - ``state``
     - Property
     - Text enum
     - ``planned`` | ``in_progress`` | ``completed`` | ``cancelled``
   * - ``manufacturingOrder``
     - Relationship
     - ManufacturingOrder
     - The parent manufacturing order this work order belongs to
   * - ``workCenter``
     - Relationship
     - WorkCenter
     - The production resource assigned to perform this operation
   * - ``product``
     - Relationship
     - Product
     - The finished product being manufactured

----

State machine
-------------

::

  planned ──► in_progress ──► completed
      │                            │
      └────────────────────────────► cancelled

``planned`` is the initial state set by ``create-work-orders``.
State transitions (to ``in_progress`` and ``completed``) are implemented in Tutorial 07
(shop-floor execution).

----

NGSI-LD normalised example
--------------------------

.. code-block:: json

   {
     "id": "urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly",
     "type": "WorkOrder",
     "workOrderCode":      { "type": "Property",     "value": "WO-MO-2024-001-Assembly" },
     "operationName":      { "type": "Property",     "value": "Assembly" },
     "sequence":           { "type": "Property",     "value": 1 },
     "plannedStart":       { "type": "Property",     "value": "2024-07-01T08:00:00Z" },
     "plannedEnd":         { "type": "Property",     "value": "2024-07-01T18:00:00Z" },
     "durationHours":      { "type": "Property",     "value": 10.0 },
     "state":              { "type": "Property",     "value": "planned" },
     "manufacturingOrder": { "type": "Relationship", "object": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001" },
     "workCenter":         { "type": "Relationship", "object": "urn:ngsi-ld:WorkCenter:WC-Assembly" },
     "product":            { "type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100" },
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld"
   }

----

JSON Schema
-----------

:download:`schema.json <../../data-models/dataModel.MRP/WorkOrder/schema.json>`
