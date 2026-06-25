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

- Tutorial 01 master data loaded (``make start && make seed``)
- Tutorial 03 BoM data loaded (``TUTORIAL=03 make seed``)
- Port 8083 free on localhost

Quickstart
----------

.. code-block:: bash

   make start                               # start core infrastructure
   make seed                                # Tutorial 01 master data
   TUTORIAL=03 make seed                    # Tutorial 03 BoM data
   TUTORIAL=04 make seed                    # Tutorial 04 ManufacturingOrder (draft)
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

The seed step (performed by the emulator or ``TUTORIAL=04 make seed``) loads one
``ManufacturingOrder`` entity in ``draft`` state for 10 units of ``HydraulicPump-P100``,
referencing the BoM seeded in Tutorial 03.

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
