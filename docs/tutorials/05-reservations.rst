Tutorial 05 — Component Reservations and Shortages
====================================================

**Version:** v0.5 |
**Stack tag:** ``inventory-service:0.5`` |
**New entity:** :doc:`InventoryReservation </data-models/inventory-reservation>`

----

Overview
--------

A *confirmed* ManufacturingOrder knows what to build and how many.
Before production can start, the planner must answer: **"Do we have enough stock?"**

Tutorial 05 adds the **reserve-components** command to the ``inventory-service``.
The command reads the confirmed order, explodes its Bill of Materials, checks each
component's ``InventoryBalance``, and creates one ``InventoryReservation`` entity per
BOM line.  Reservations carry three quantities:

* **requiredQuantity** — what the order needs (line_qty × order_qty)
* **reservedQuantity** — what is actually available and locked
* **shortageQuantity** — the gap that must be sourced before production can start

An ``InventoryReservation`` can have one of three states:

* ``reserved`` — fully covered by on-hand stock
* ``partial``  — partially covered (some stock, not enough)
* ``shortage``  — zero stock available; purchasing action required

Scenario
^^^^^^^^

ManufacturingOrder **MO-2024-001** (10 units of Hydraulic Pump P100, confirmed) is
waiting for component reservation.  The warehouse holds:

============================  ===========  ==========
Component                     On hand (EA) Required (EA)
============================  ===========  ==========
Pump Casing                   50           10 → **reserved**
Impeller (lot LOT-240001)     30           10 → **reserved**
Electric Motor 2.2 kW         0            10 → **shortage**
Seal Kit P100                 0            20 → **shortage**
============================  ===========  ==========

After the command, ``WH-STOCK`` balances for PumpCasing and Impeller are updated
(``reservedQuantity`` += 10, ``availableQuantity`` -= 10).

----

Prerequisites
-------------

* Tutorial 04 complete (or use the self-contained seed file below)
* Full stack running:

  .. code-block:: bash

     make start-emulator

* Seed Tutorial 05 data (includes T01 master data, T02 inventory, T03 BoM, T04 confirmed MO):

  .. code-block:: bash

     TUTORIAL=05 make seed

----

Step-by-step
------------

Step 1 — Verify the inventory service
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Check that ``inventory-service`` v0.5 is running and can reach Orion-LD:

.. code-block:: bash

   curl http://localhost:8081/health

Expected response:

.. code-block:: json

   { "status": "ok", "service": "inventory-service", "version": "0.5.0" }

Step 2 — Inspect inventory before reservation
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Confirm the starting inventory state:

.. code-block:: bash

   curl http://localhost:8081/inventory

You should see 2 ``InventoryBalance`` entities — PumpCasing (50 EA) and Impeller
(30 EA, lot LOT-240001).  ElectricMotor and SealKit have no balance → they will
generate shortages.

Step 3 — Run reserve-components
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   curl -s -X POST http://localhost:8081/commands/reserve-components \
     -H "Content-Type: application/json" \
     -d '{
       "order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001",
       "location_id": "urn:ngsi-ld:StockLocation:WH-STOCK"
     }' | python3 -m json.tool

Expected response (abbreviated):

.. code-block:: json

   {
     "status": "done",
     "order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001",
     "reservations_created": 4,
     "summary": { "reserved": 2, "partial": 0, "shortage": 2 },
     "reservations": [
       { "state": "reserved",  "component_id": "...PumpCasing",    "required_quantity": 10, "reserved_quantity": 10, "shortage_quantity": 0  },
       { "state": "reserved",  "component_id": "...Impeller",      "required_quantity": 10, "reserved_quantity": 10, "shortage_quantity": 0  },
       { "state": "shortage",  "component_id": "...ElectricMotor", "required_quantity": 10, "reserved_quantity": 0,  "shortage_quantity": 10 },
       { "state": "shortage",  "component_id": "...SealKit",       "required_quantity": 20, "reserved_quantity": 0,  "shortage_quantity": 20 }
     ]
   }

Step 4 — Query reservations
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   curl http://localhost:8081/inventory-reservations | python3 -m json.tool

Four ``InventoryReservation`` entities are returned.  Each carries ``state``,
``requiredQuantity``, ``reservedQuantity``, ``shortageQuantity``, and
Relationships to ``manufacturingOrder``, ``product``, ``stockLocation``, and
``inventoryBalance``.

Step 5 — Inspect a reservation directly from Orion-LD
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   curl "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-ElectricMotor" \
     -H "Accept: application/ld+json" | python3 -m json.tool

The entity shows all NGSI-LD attributes in normalised form, including the
``shortageQuantity: 10 EA`` that signals a purchasing action is required.

----

Automated assertions
--------------------

.. code-block:: bash

   make test-05

The test script runs 8 assertions:

#. ``inventory-service`` health is ``ok``
#. Version is ``0.5.0``
#. 2 ``InventoryBalance`` entities exist before the command
#. 0 ``InventoryReservation`` entities exist before the command
#. ``reserve-components`` returns ``status: done``
#. 4 ``InventoryReservation`` entities exist after the command
#. PumpCasing reservation ``state=reserved``
#. ElectricMotor reservation ``state=shortage``
#. PumpCasing ``availableQuantity`` decremented from 50 to 40

----

Under the hood — NGSI-LD API calls
-----------------------------------

.. list-table::
   :header-rows: 1
   :widths: 5 30 65

   * - #
     - Call
     - Purpose
   * - 1
     - ``GET /ngsi-ld/v1/entities/{order_id}``
     - Fetch the ManufacturingOrder; validate state=confirmed; extract bom Relationship
   * - 2
     - ``GET /ngsi-ld/v1/entities?type=BillOfMaterialsLine``
     - Retrieve all BOM lines; filter by bom Relationship = bom_id
   * - 3
     - ``GET /ngsi-ld/v1/entities?type=InventoryBalance``
     - Retrieve all balances; index by product × location
   * - 4
     - ``POST /ngsi-ld/v1/entityOperations/upsert`` (×4)
     - Create one InventoryReservation per BOM line
   * - 5
     - ``PATCH /ngsi-ld/v1/entities/{ib_id}/attrs`` (×2)
     - Decrement availableQuantity; increment reservedQuantity for stocked components

----

Next: Tutorial 06 — Work Orders and Finite-Capacity Scheduling *(coming soon)*
