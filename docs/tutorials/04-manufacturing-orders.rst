Tutorial 04 — Manufacturing Order Confirmation
================================================

**Stack tag:** v0.4  |  **New service:** ``manufacturing-service`` (port 8083)

Business goal
-------------

Turn a planned ``ManufacturingOrder`` into a locked production commitment.
A ManufacturingOrder (MO) starts life in ``draft`` — provisional, easily
changed — and moves to ``confirmed`` only when the business is ready to
commit real components and capacity to it. That single state transition is
the signal every downstream tutorial waits for: component reservation
(Tutorial 05), work-order scheduling (Tutorial 06), and shop-floor execution
(Tutorial 07) all key off ``state == confirmed``. Not every draft becomes a
confirmed order, though — this tutorial also covers cancelling one that
never gets committed.

What you will build
--------------------

* ``manufacturing-service`` (FastAPI, port 8083) — three commands:

  - ``POST /commands/confirm-manufacturing-order`` — transitions an MO from
    ``draft`` → ``confirmed`` and sets ``confirmedAt``.
  - ``POST /commands/cancel-manufacturing-order`` — transitions an MO from
    ``draft`` or ``confirmed`` → ``cancelled`` and sets ``cancelledAt``.
    Cancelling means no components are ever consumed for that order.
  - ``GET /manufacturing-orders`` — list/filter by ``state`` or ``product``.

* **ManufacturingOrder** — the new NGSI-LD entity type introduced in this
  tutorial. See :doc:`../data-models/manufacturing-order` for the full
  attribute reference and state machine.

* The interactive emulator (``make start-mock``) reflects both outcomes on
  its live dashboard: the Mfg Orders card moves from ``draft 1`` to
  ``conf. 1 · draft 0`` after confirmation, and shows the second, throwaway
  order (used for the cancel demo) moving to ``cancelled`` without ever
  touching ``MO-2024-001``.

Prerequisites
-------------

Running into trouble? See the :doc:`/troubleshooting` guide.

- Docker stack running (``make start``)
- Port 8083 free on localhost

The Tutorial 04 seed file is self-contained: it includes all Tutorial 01
master data and Tutorial 03 BoM entities. No separate T01 or T03 seed step
is required.

Quick start
-----------

.. code-block:: bash

   # 1. Start core infrastructure and the manufacturing-service
   make start
   docker compose up -d --build manufacturing-service

   # 2. Seed Tutorial 04 data (18 entities: T01 + T03 + one draft MO)
   TUTORIAL=04 make seed

   # 3. Query draft orders
   curl "http://localhost:8083/manufacturing-orders?state=draft"

   # 4. Confirm the order
   curl -X POST http://localhost:8083/commands/confirm-manufacturing-order \
     -H "Content-Type: application/json" \
     -d '{"order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001"}'

   # 5. Confirm the transition, then inspect the entity directly
   curl "http://localhost:8083/manufacturing-orders?state=confirmed"
   curl "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:ManufacturingOrder:MO-2024-001" \
     -H "Accept: application/ld+json" \
     -H 'Link: <http://localhost:3000/contexts/mrp/v0.1/context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'

   # 6. Cancel a second, disposable order — MO-2024-001 is never touched
   curl -X POST http://localhost:8083/commands/cancel-manufacturing-order \
     -H "Content-Type: application/json" \
     -d '{"order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-CANCEL-DEMO"}'

   # 7. Run automated assertions
   make test-04

Automated assertions
---------------------

``make test-04`` runs ``tutorials/04-manufacturing-order/tests/test-04.sh``
and verifies ten assertions:

.. list-table::
   :header-rows: 1
   :widths: 5 95

   * - #
     - Assertion
   * - 1
     - ``manufacturing-service`` health returns ``ok``
   * - 2
     - ``ManufacturingOrder`` initial state is ``draft``
   * - 3
     - ``GET /manufacturing-orders?state=draft`` returns 1 order
   * - 4
     - ``confirm-manufacturing-order`` returns ``status=confirmed``
   * - 5
     - Entity state in broker is ``confirmed`` after the command
   * - 6
     - ``GET /manufacturing-orders?state=confirmed`` returns 1 order
   * - 7
     - A second, throwaway draft order (``MO-2024-CANCEL-DEMO``) is seeded
       directly for the cancel demo
   * - 8
     - ``cancel-manufacturing-order`` returns ``status=cancelled``
   * - 9
     - Entity state in broker is ``cancelled`` after the command
   * - 10
     - Re-cancelling an already-cancelled order is rejected with ``422``

NGSI-LD patterns
----------------

POST, not PATCH, for a brand-new attribute
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Both ``confirmedAt`` and ``cancelledAt`` are attributes that do not exist on
a freshly-seeded ``ManufacturingOrder`` — they are set by the service for
the first time, the moment the order is confirmed or cancelled. Orion-LD's
``PATCH /entities/{id}/attrs`` only *updates* attributes that already exist
on the entity; it silently drops any attribute in the payload that isn't
already there. Setting a new attribute for the first time requires
``POST /entities/{id}/attrs`` instead, which appends new attributes and
overwrites existing ones:

.. code-block:: bash

   POST /ngsi-ld/v1/entities/{id}/attrs
   Content-Type: application/ld+json

   {
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "state":       {"type": "Property", "value": "confirmed"},
     "confirmedAt": {"type": "Property", "value": "2024-07-01T07:45:00Z"}
   }

This is a sharp edge with real consequences once several services patch the
same entity type over a tutorial's lifetime — Tutorial 08 hits the specific
failure mode this causes (a PATCH that silently drops the new attribute it
was supposed to set) and is where the lesson really lands.

Data model introduced
----------------------

* :doc:`../data-models/manufacturing-order` — ``ManufacturingOrder``

What's next
-----------

Tutorial 05 picks up the confirmed ``ManufacturingOrder`` and runs component
reservation: for each ``BillOfMaterialsLine``, it checks
``InventoryBalance`` and either creates an ``InventoryReservation`` or
raises a shortage alert.


----

Architecture snapshot
-----------------------

.. image:: ../_static/architecture/arch-t04.png
   :alt: Stack at tutorial 04
   :align: center
   :width: 90%

See :doc:`../architecture/index` for the full architecture and all incremental diagrams.
