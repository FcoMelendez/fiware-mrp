Tutorial 08 — Finished Goods Receipt
======================================

**Stack tag:** v0.8  |  **New service:** ``finished-goods-service`` (port 8086)

Business goal
-------------

Close the production loop.  Once every WorkOrder for a ManufacturingOrder
has been executed on the shop floor, the finished product needs to land in
the finished-goods warehouse and the order itself needs to be marked done.
``finished-goods-service`` automates that final handoff: it validates the
WorkOrders, closes the order, and receipts the produced quantity into stock.

What you will build
--------------------

* ``finished-goods-service`` (FastAPI, port 8086) — one command:

  - ``POST /commands/receive-finished-goods`` — given a ManufacturingOrder
    ID: validates that all of its WorkOrders are ``completed``, patches the
    order to ``state: completed`` with a ``completedAt`` timestamp, creates
    a ``StockMove`` receipt into the finished-goods location, and creates
    or increments the ``InventoryBalance`` for the finished product there.

* No new NGSI-LD entity type.  Tutorial 08 reuses ``StockMove`` and
  ``InventoryBalance`` from :doc:`Tutorial 02 <02-inventory>`, and adds a
  ``completedAt`` attribute to ``ManufacturingOrder``.  See
  :doc:`../data-models/index` for how each entity is used.

Prerequisites
-------------

Tutorials 01–07 delivered and tested.  ``TUTORIAL=08 make seed`` loads
30 entities: the full Tutorial 07 context, but with the 3 WorkOrders for
``MO-2024-001`` already in ``completed`` state (Assembly, LeakTest,
Packaging) plus the two ProductionEvents recorded for the Assembly
operation — a shop floor that has finished producing and is ready for
receipt.

Quick start
-----------

.. code-block:: bash

   # 1. Start the full stack including finished-goods-service
   make start-emulator          # or: docker compose up -d ... finished-goods-service

   # 2. Seed Tutorial 08 data
   TUTORIAL=08 make seed

   # 3. Receive the finished pumps into stock
   curl -s -X POST http://localhost:8086/commands/receive-finished-goods \
     -H 'Content-Type: application/json' \
     -d '{"manufacturing_order_id": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001"}'

   # 4. Inspect the manufacturing order — state is now completed
   curl -s http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:ManufacturingOrder:MO-2024-001 \
     -H 'Accept: application/ld+json' | python3 -m json.tool

   # 5. Inspect the production receipt
   curl -s http://localhost:8086/production-receipts | python3 -m json.tool

   # 6. Run automated assertions
   make test-08

Automated assertions
---------------------

``make test-08`` runs ``tutorials/08-finished-goods/tests/test-08.sh`` and
verifies seven assertions:

.. list-table::
   :header-rows: 1
   :widths: 5 95

   * - #
     - Assertion
   * - 1
     - ``finished-goods-service /health`` → ``{"status": "ok"}``
   * - 2
     - ``version`` == ``0.8.0``
   * - 3
     - ``receive-finished-goods`` returns ``{"status": "done"}``
   * - 4
     - ManufacturingOrder ``state`` == ``completed`` (verified in broker)
   * - 5
     - ManufacturingOrder ``completedAt`` is set (verified in broker)
   * - 6
     - ``GET /production-receipts`` returns ≥ 1 receipt with
       ``moveType == receipt``
   * - 7
     - ``InventoryBalance`` for HydraulicPump-P100 at ``WH-FINISHED`` has
       ``quantityOnHand`` > 0

NGSI-LD patterns
----------------

Guarding on related entities before a state transition
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Unlike earlier commands that patch a single entity, ``receive-finished-goods``
first queries every ``WorkOrder`` related to the ``ManufacturingOrder`` and
refuses to proceed unless all of them report ``state: completed``:

.. code-block:: bash

   GET /ngsi-ld/v1/entities?type=WorkOrder

   # In-process filter: manufacturingOrder.object == req.manufacturing_order_id
   # 422 if any matching WorkOrder has state != completed

Setting a brand-new attribute requires POST, not PATCH
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``PATCH /entities/{id}/attrs`` only **updates** attributes that already
exist on the entity — for a brand-new attribute (like ``completedAt`` on
a ManufacturingOrder that has never been completed before) it returns
``207`` with ``notUpdated: [{reason: "attribute doesn't exist"}]``,
which is easy to miss if your code only checks the status code.
``POST /entities/{id}/attrs`` is append-or-overwrite and handles both
cases correctly:

.. code-block:: bash

   POST /ngsi-ld/v1/entities/{id}/attrs
   Content-Type: application/ld+json

   {
     "@context": "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
     "state":       {"type": "Property", "value": "completed"},
     "completedAt": {"type": "Property", "value": "2024-07-02T01:25:00Z"}
   }

Create-or-update on the destination InventoryBalance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The finished-goods location may not yet have a balance record for a product
the first time it is produced.  ``finished-goods-service`` follows the same
create-or-update pattern as ``inventory-service`` from Tutorial 02: ``GET``
the balance by its deterministic ID; ``PATCH`` it if found, otherwise
``POST`` a new ``InventoryBalance`` entity:

.. code-block:: bash

   GET /ngsi-ld/v1/entities/urn:ngsi-ld:InventoryBalance:IB-HydraulicPump-P100-WH-FINISHED
   # 200 → PATCH quantityOnHand, availableQuantity, inventoryDate
   # 404 → POST a new InventoryBalance with quantityOnHand = quantity_received

Traceability via ``origin``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The receipt ``StockMove`` sets ``origin`` to the full ManufacturingOrder
URN rather than a free-text order code, so any consumer can trace a
finished-goods receipt straight back to the order that produced it:

.. code-block:: json

   {
     "id": "urn:ngsi-ld:StockMove:SM-MO-2024-001-receipt",
     "type": "StockMove",
     "moveType":   {"type": "Property", "value": "receipt"},
     "quantity":   {"type": "Property", "value": 10, "unitCode": "EA"},
     "state":      {"type": "Property", "value": "done"},
     "actualDate": {"type": "Property", "value": "2024-07-02T01:25:00Z"},
     "origin":     {"type": "Property", "value": "urn:ngsi-ld:ManufacturingOrder:MO-2024-001"},
     "product":    {"type": "Relationship", "object": "urn:ngsi-ld:Product:HydraulicPump-P100"},
     "toLocation": {"type": "Relationship", "object": "urn:ngsi-ld:StockLocation:WH-FINISHED"}
   }

Data model changes
-------------------

* No new entity type — see :doc:`../data-models/index` for how
  :doc:`StockMove <../data-models/stock-move>` and
  :doc:`InventoryBalance <../data-models/inventory-balance>` are reused.
* :doc:`ManufacturingOrder <../data-models/manufacturing-order>` gains a
  ``completedAt`` attribute.

What's next
-----------

Tutorial 09 introduces **quality inspection**: ``quality-service``
records pass/fail checks against completed WorkOrders and routes failed
units to scrap or rework, raising an alert when the failure rate crosses
a threshold.


----

Architecture snapshot
----------------------

.. image:: ../_static/architecture/arch-t08.png
   :alt: Stack at 08-finished-goods
   :align: center
   :width: 90%

See :doc:`../architecture/index` for the full architecture and all incremental diagrams.
