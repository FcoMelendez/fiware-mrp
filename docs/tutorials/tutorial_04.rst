Tutorial 04 — Manufacturing order confirmation
=============================================

.. rubric:: Tag: v0.4

**Business capability:** Create a manufacturing order in draft state and confirm it via the
``confirm-manufacturing-order`` command, transitioning it from ``draft`` to ``confirmed`` in
Orion-LD.

Overview
--------

A ``ManufacturingOrder`` (MO) is the production commitment signal that unlocks downstream
processes: component reservation (Tutorial 05), work-order scheduling (Tutorial 06), and
shop-floor execution (Tutorial 07). This tutorial introduces the ``manufacturing-service`` and
the state machine that governs the MO lifecycle.

.. code-block:: text

   draft → confirmed → in_progress → completed
                 ↘ cancelled

New service introduced
-----------------------

.. list-table::
   :header-rows: 1
   :widths: 30 10 60

   * - Service
     - Port
     - Purpose
   * - ``manufacturing-service``
     - 8083
     - ``confirm-manufacturing-order`` command and ManufacturingOrder queries

New data model
--------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - ``ManufacturingOrder``
     - Instruction to produce a quantity of a finished product by a planned date

ManufacturingOrder properties
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 25 20 55

   * - Attribute
     - NGSI-LD type
     - Description
   * - ``orderCode``
     - Property
     - Human-readable identifier (e.g. ``MO-2024-001``)
   * - ``product``
     - Relationship
     - The ``Product`` entity being manufactured
   * - ``bom``
     - Relationship
     - The ``BillOfMaterials`` used for component explosion
   * - ``quantity``
     - Property (number)
     - Units to produce
   * - ``state``
     - Property
     - ``draft`` | ``confirmed`` | ``in_progress`` | ``completed`` | ``cancelled``
   * - ``plannedStart``
     - Property (date-time)
     - Planned production start
   * - ``plannedEnd``
     - Property (date-time)
     - Planned production completion
   * - ``priority``
     - Property
     - ``normal`` | ``urgent`` | ``critical``
   * - ``confirmedAt``
     - Property (date-time)
     - Timestamp set by the service on confirmation

Prerequisites
-------------

- Docker stack running (``make start``)
- Port 8083 free on localhost

The Tutorial 04 seed file is self-contained: it includes all Tutorial 01 master data and Tutorial 03 BoM entities. No separate T01 or T03 seed step is required.

Quickstart
----------

.. code-block:: bash

   make start                               # start core infrastructure
   TUTORIAL=04 make seed                    # loads 18 entities: T01 + T03 + ManufacturingOrder
   docker compose up -d --build manufacturing-service

Tutorial steps
--------------

Step 1 — Verify manufacturing-service health
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl http://localhost:8083/health

Expected response::

   { "status": "ok", "service": "manufacturing-service", "version": "0.4.0" }

Step 2 — Seed Tutorial 04 data
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The seed step (performed by the emulator or ``TUTORIAL=04 make seed``) loads 18 entities:
12 Tutorial 01 master-data entities (Company, Plant, WorkCenter × 3, Product × 5,
StockLocation × 2), 5 Tutorial 03 BoM entities (BillOfMaterials + 4 lines), and one
``ManufacturingOrder`` (``MO-2024-001``) in ``draft`` state for 10 units of
``HydraulicPump-P100``.

Step 3 — Query manufacturing orders in draft state
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl "http://localhost:8083/manufacturing-orders?state=draft"

Returns a list with one order: ``MO-2024-001`` in state ``draft``.

Step 4 — Confirm the manufacturing order
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -X POST http://localhost:8083/commands/confirm-manufacturing-order \
     -H "Content-Type: application/json" \
     -d '{"order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001"}'

The service:

1. Fetches the entity from Orion-LD and validates ``state == draft``.
2. Patches ``state → confirmed`` and sets ``confirmedAt`` to the current timestamp.
3. Returns ``{ "status": "confirmed", "order_id": "...", "confirmed_at": "..." }``.

Step 5 — Query confirmed orders
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl "http://localhost:8083/manufacturing-orders?state=confirmed"

Returns the same order with ``state=confirmed`` and ``confirmedAt`` populated.

Step 6 — Inspect the entity in the broker
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:ManufacturingOrder:MO-2024-001" \
     -H "Accept: application/ld+json" \
     -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'

Emulator dashboard
------------------

The interactive emulator (``make start-mock``) shows a live business dashboard while you
step through the tutorial. Key card readings after Tutorial 04:

.. list-table::
   :header-rows: 1
   :widths: 30 35 35

   * - Card
     - After seed
     - After confirm
   * - Context Graph
     - ``18 entities`` · company name · last-event timestamp
     - unchanged
   * - Shop Floor
     - ``0% util. · 85% OEE tgt``
     - unchanged
   * - Inventory
     - ``0.0× coverage · 2 loc. · 0 / 10 demand``
     - unchanged
   * - Bill of Materials
     - ``1 BoM · 1/1 products ready`` (green)
     - unchanged
   * - Mfg Orders
     - ``1 open · €2.5k · draft 1``
     - ``conf. 1 · draft 0``

Hover the ``last: HH:MM:SS`` sub-line on the Context Graph card to see a tooltip listing the
last changed entity and a breakdown of all entity types currently in the context store.

Automated assertions
---------------------

.. code-block:: bash

   make test-04

Six assertions are verified:

1. ``manufacturing-service`` health returns ``ok``
2. ``ManufacturingOrder`` initial state is ``draft``
3. ``GET /manufacturing-orders?state=draft`` returns 1 order
4. ``confirm-manufacturing-order`` command returns ``status=confirmed``
5. Entity state in broker is ``confirmed`` after the command
6. ``GET /manufacturing-orders?state=confirmed`` returns 1 order

What's next
-----------

Tutorial 05 picks up the confirmed ``ManufacturingOrder`` and runs component reservation:
for each ``BillOfMaterialsLine``, it checks ``InventoryBalance`` and either creates an
``InventoryReservation`` or raises a shortage alert.
