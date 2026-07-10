Tutorial 06 – Work Orders and Finite-Capacity Scheduling
=========================================================

**Version tag:** v0.6
**New service:** ``scheduler-service`` (port 8084)
**New entity:** ``WorkOrder``

Business goal
-------------

Turn a confirmed manufacturing order into a concrete production schedule.
The confirmed manufacturing order from Tutorial 04 drives automatic
work-order generation.  The ``scheduler-service`` reads the confirmed MO, applies a
hardcoded routing (Assembly → LeakTest → Packaging), and creates three ``WorkOrder``
entities with back-to-back planned timestamps.  No shift calendars or infinite-capacity
relaxations are used — Tutorial 06 establishes the scheduling skeleton; T07 will
execute it on the shop floor.

What you will build
--------------------

* ``scheduler-service`` (FastAPI, port 8084) — one command:

  - ``POST /commands/create-work-orders`` — reads a confirmed
    ``ManufacturingOrder``, applies a fixed Assembly → LeakTest → Packaging
    routing, and creates three sequential ``WorkOrder`` entities.

* **WorkOrder** — the new NGSI-LD entity type introduced in this tutorial,
  one per routing operation, each carrying its own planned start/end and a
  ``workCenter`` Relationship.

----

Prerequisites
-------------

Running into trouble? See the :doc:`/troubleshooting` guide.

* Tutorials 01–05 understood (master data, inventory, BoM, MO confirmation, component reservation).
* This tutorial's seed file is self-contained — it includes all T01–T05 entities
  plus the four ``InventoryReservation`` entities that represent the completed T05 state.

Quick start
-----------

.. code-block:: bash

   # 1 — Start the full stack including scheduler-service
   make start-emulator

   # 2 — Seed T06 master data (T01–T05 state + 4 InventoryReservations)
   TUTORIAL=06 make seed

   # 3 — Run automated assertions
   make test-06

----

Step-by-step
-------------

Step 1 — Verify the scheduler service
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl http://localhost:8084/health

Expected response:

.. code-block:: json

   { "status": "ok", "service": "scheduler-service", "version": "0.6.0" }

Step 2 — Query the confirmed manufacturing order
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Before scheduling, verify the MO is in ``confirmed`` state:

.. code-block:: bash

   curl "http://localhost:8083/manufacturing-orders?state=confirmed"

The single result is MO-2024-001 with ``quantity: 10``, ``plannedStart: 2024-07-01T08:00:00Z``.

Step 3 — Create work orders
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -X POST http://localhost:8084/commands/create-work-orders \
     -H "Content-Type: application/json" \
     -d '{
       "order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001",
       "planned_start": "2024-07-01T08:00:00Z"
     }'

The scheduler-service:

1. Fetches the MO and validates ``state = confirmed``.
2. Reads ``quantity = 10`` and applies the routing rates:
   - Assembly: 1 h/unit → 10 h
   - LeakTest: 0.5 h/unit → 5 h
   - Packaging: 0.25 h/unit → 2.5 h
3. Chains the dates sequentially (no gaps, no shift calendars).
4. Upserts three ``WorkOrder`` entities to Orion-LD via batch upsert.

Expected response:

.. code-block:: json

   {
     "status": "done",
     "order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001",
     "work_orders_created": 3,
     "work_orders": [
       { "operation": "Assembly",  "planned_start": "2024-07-01T08:00:00Z", "planned_end": "2024-07-01T18:00:00Z", "duration_hours": 10.0 },
       { "operation": "LeakTest",  "planned_start": "2024-07-01T18:00:00Z", "planned_end": "2024-07-01T23:00:00Z", "duration_hours": 5.0 },
       { "operation": "Packaging", "planned_start": "2024-07-01T23:00:00Z", "planned_end": "2024-07-02T01:30:00Z", "duration_hours": 2.5 }
     ]
   }

Step 4 — Query work orders via the service
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl http://localhost:8084/work-orders

Returns all three ``WorkOrder`` entities in NGSI-LD normalised format.

You can also filter by manufacturing order:

.. code-block:: bash

   curl "http://localhost:8084/work-orders?order_id=urn:ngsi-ld:ManufacturingOrder:MO-2024-001"

Or by work center:

.. code-block:: bash

   curl "http://localhost:8084/work-orders?work_center_id=urn:ngsi-ld:WorkCenter:WC-Assembly"

Step 5 — Inspect a work order in Orion-LD
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly" \
     -H "Accept: application/ld+json"

----

Automated assertions
--------------------

``tutorials/06-work-orders/tests/test-06.sh`` runs 8 assertions:

.. list-table::
   :header-rows: 1
   :widths: 5 95

   * - #
     - Assertion
   * - 1
     - ``GET /health`` → ``status: ok``
   * - 2
     - ``GET /health`` → ``version: 0.6.0``
   * - 3
     - ``GET /work-orders`` returns 0 entities before the command
   * - 4
     - ``POST /commands/create-work-orders`` returns ``status: done``
   * - 5
     - ``GET /work-orders`` returns 3 entities after the command
   * - 6
     - Assembly WorkOrder ``state: planned`` (fetched from Orion-LD)
   * - 7
     - Assembly WorkOrder ``workCenter: WC-Assembly`` (Relationship verified in broker)
   * - 8
     - Assembly ``plannedEnd`` == LeakTest ``plannedStart`` (sequential scheduling verified)

----

NGSI-LD patterns
-----------------

One command, three related entities
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``create-work-orders`` is the first command in the series that creates more
than one entity per call, and the entities it creates are chained to each
other in time (each ``WorkOrder``'s ``plannedStart`` equals the previous
one's ``plannedEnd``) as well as to the ``ManufacturingOrder`` and
``WorkCenter`` they belong to. Getting that chaining right in a single
batch upsert — rather than three separate round-trips that could partially
fail — is why all three ``WorkOrder`` entities are POSTed to Orion-LD
together via ``/ngsi-ld/v1/entityOperations/upsert``.

.. list-table::
   :header-rows: 1
   :widths: 8 25 67

   * - Step
     - Endpoint
     - Description
   * - Health
     - ``GET /health``
     - scheduler-service health check
   * - Create WOs
     - ``POST /commands/create-work-orders``
     - Generate 3 WorkOrders for a confirmed MO
   * - List WOs
     - ``GET /work-orders``
     - Return all WorkOrder entities (filterable)
   * - Inspect (broker)
     - ``GET /ngsi-ld/v1/entities/{id}``
     - Fetch a single WorkOrder from Orion-LD

----

What's next
-----------

:doc:`07-shop-floor` — Shop-floor Execution

Tutorial 07 introduces the ``shopfloor-service`` that transitions work orders
through ``planned → in_progress → completed`` and records ``ProductionEvent``
entities for each execution step.


----

Architecture snapshot
----------------------

.. image:: ../_static/architecture/arch-t06.png
   :alt: Stack at 06-work-orders
   :align: center
   :width: 90%

See :doc:`../architecture/index` for the full architecture and all incremental diagrams.
