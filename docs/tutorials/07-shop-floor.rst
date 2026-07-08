Tutorial 07 — Shop-floor Execution
====================================

**Stack tag:** v0.7  |  **New service:** ``shopfloor-service`` (port 8085)

Business goal
-------------

Turn planned WorkOrders into execution records.  The shop-floor team
starts each WorkOrder when the machine begins, and completes it when
the last unit rolls off the line.  Every completion creates an
immutable **ProductionEvent** that forms the foundation for OEE
analytics and finished-goods traceability in later tutorials.

What you will build
-------------------

* ``shopfloor-service`` (FastAPI, port 8085) — two commands:

  - ``POST /commands/start-work-order`` — transitions a WorkOrder from
    ``planned`` → ``in_progress``, sets ``actualStart``, and creates a
    ``work_order_started`` ProductionEvent.
  - ``POST /commands/complete-work-order`` — transitions
    ``in_progress`` → ``completed``, sets ``actualEnd``, and creates a
    ``work_order_completed`` ProductionEvent with ``quantity_produced``.

* **ProductionEvent** — the new NGSI-LD entity type introduced in this
  tutorial.  See :doc:`../data-models/production-event` for the full
  attribute reference.

Prerequisites
-------------

Tutorials 01–06 delivered and tested.  ``TUTORIAL=07 make seed`` loads
28 entities (T06 state + 3 WorkOrders in ``planned`` state).

Quick start
-----------

.. code-block:: bash

   # 1. Start the full stack including shopfloor-service
   make start-emulator          # or: docker compose up -d ... shopfloor-service

   # 2. Seed Tutorial 07 data
   TUTORIAL=07 make seed

   # 3. Start the Assembly work order
   curl -s -X POST http://localhost:8085/commands/start-work-order \
     -H 'Content-Type: application/json' \
     -d '{"work_order_id": "urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly"}'

   # 4. Complete the Assembly work order (10 units produced)
   curl -s -X POST http://localhost:8085/commands/complete-work-order \
     -H 'Content-Type: application/json' \
     -d '{"work_order_id": "urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly",
          "quantity_produced": 10}'

   # 5. Inspect production events
   curl -s http://localhost:8085/production-events | python3 -m json.tool

   # 6. Run automated assertions
   make test-07

Automated assertions
--------------------

``make test-07`` runs ``tutorials/07-shop-floor/tests/test-07.sh`` and
verifies seven assertions:

.. list-table::
   :header-rows: 1
   :widths: 5 95

   * - #
     - Assertion
   * - 1
     - ``shopfloor-service /health`` → ``{"status": "ok"}``
   * - 2
     - ``version`` == ``0.7.0``
   * - 3
     - ``start-work-order`` returns ``{"status": "done"}``
   * - 4
     - Assembly WorkOrder ``state`` == ``in_progress`` (verified in broker)
   * - 5
     - ``complete-work-order`` returns ``{"status": "done"}``
   * - 6
     - Assembly WorkOrder ``state`` == ``completed`` (verified in broker)
   * - 7
     - ``GET /production-events`` returns ≥ 1 event with
       ``eventType == work_order_completed``

NGSI-LD patterns
----------------

State transition via PATCH
~~~~~~~~~~~~~~~~~~~~~~~~~~

``shopfloor-service`` patches WorkOrder attributes directly in Orion-LD:

.. code-block:: bash

   PATCH /ngsi-ld/v1/entities/{id}/attrs
   Content-Type: application/ld+json

   {
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "state":       {"type": "Property", "value": "in_progress"},
     "actualStart": {"type": "Property", "value": "2024-07-01T08:05:00Z"}
   }

The broker returns ``204 No Content`` (all-new attrs) or
``207 Multi-Status`` (mixed new/existing); both are treated as success.

Creating immutable audit records
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

ProductionEvents are ``POST``-ed to ``/ngsi-ld/v1/entities`` (not
upserted) so each event has a unique ID and a permanent timestamp:

.. code-block:: bash

   POST /ngsi-ld/v1/entities
   Content-Type: application/ld+json

   {
     "id": "urn:ngsi-ld:ProductionEvent:PE-WO-MO-2024-001-Assembly-completed",
     "type": "ProductionEvent",
     "@context": "...",
     "eventType":  {"type": "Property", "value": "work_order_completed"},
     "eventTime":  {"type": "Property", "value": "2024-07-01T18:05:00Z"},
     "quantity":   {"type": "Property", "value": 10.0, "unitCode": "EA"},
     "workOrder":  {"type": "Relationship", "object": "urn:ngsi-ld:WorkOrder:..."}
   }

Data model introduced
---------------------

* :doc:`../data-models/production-event` — ``ProductionEvent``

What's next
-----------

Tutorial 08 introduces **finished-goods receipt**: once every WorkOrder for
an MO is completed, ``finished-goods-service`` closes the order and receipts
the produced quantity into the finished-goods warehouse (StockMove +
InventoryBalance).


----

Architecture snapshot
----------------------

.. image:: ../_static/architecture/arch-t07.png
   :alt: Stack at 07-shop-floor
   :align: center
   :width: 90%

See :doc:`../architecture/index` for the full architecture and all incremental diagrams.
