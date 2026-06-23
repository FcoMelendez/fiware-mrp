Tutorial 02 — Inventory balances and material receipts
=======================================================

**Tag:** ``v0.2`` |
**Effort:** ~30 minutes (CLI path) or ~20 minutes (visual emulator) |
**Stack additions:** ``inventory-service``

----

What you will build
-------------------

An ``inventory-service`` (Python/FastAPI) that handles the ``receive-material``
business command and tracks on-hand quantities through NGSI-LD entities.

By the end of this tutorial you can:

* Receive goods from a supplier into a stock location with a single API call.
* Track inventory with and without lot numbers.
* Query current balances by product, location, or lot.
* Verify that every receipt creates an auditable ``StockMove`` entity in Orion-LD.
* *(Optional)* Replay the same six exercises through the Phaser 3 visual emulator.

----

Concepts introduced
-------------------

Business command pattern
~~~~~~~~~~~~~~~~~~~~~~~~

The ``receive-material`` endpoint accepts a simple JSON payload, validates it,
and writes the result as NGSI-LD entities.  No raw NGSI-LD is needed from the
caller — the service owns the data model translation.

This pattern (command → validate → upsert) is the standard used by every
business service in this reference implementation.

InventoryBalance
~~~~~~~~~~~~~~~~

An ``InventoryBalance`` entity records the on-hand quantity of one product at
one stock location.  It is updated (not replaced) on every committed
``StockMove``.

When a product has ``trackingPolicy: lot``, there is a separate
``InventoryBalance`` per lot, giving you fine-grained traceability.

StockMove
~~~~~~~~~

A ``StockMove`` is the immutable audit record of every inventory movement.
It is created in state ``done`` for synchronous receipts.  Later tutorials
introduce ``draft`` → ``done`` transitions for multi-step moves.

Lot
~~~

A ``Lot`` entity represents a traceable batch of material.  Products with
``trackingPolicy: lot`` or ``serial`` carry lot references on their
``InventoryBalance`` and ``StockMove`` records.

----

Architecture of this tutorial
------------------------------

.. code-block:: text

   ┌────────────────────────────────────────────────────────────┐
   │  Tutorial 02 stack (adds inventory-service)                │
   │                                                            │
   │  ┌──────────────────┐  POST receive-material               │
   │  │  inventory-svc   │  ──────────────────────────────────► │
   │  │  :8081           │  PATCH /ngsi-ld/v1/entities/…/attrs  │
   │  └──────────────────┘  ──────────────────────────────────► │
   │          ▲                    ┌──────────────┐             │
   │          │  GET /inventory    │  orion-ld    │             │
   │          │  ◄─────────────────│  :1026       │             │
   │          │                   └──────────────┘             │
   │  (same core stack as Tutorial 01)                          │
   └────────────────────────────────────────────────────────────┘

.. list-table::
   :header-rows: 1
   :widths: 25 15 60

   * - Service
     - Host port
     - Purpose
   * - ``inventory-service``
     - 8081
     - ``receive-material`` command + inventory query

All Tutorial 01 services remain unchanged.

----

Models introduced
-----------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - ``InventoryBalance``
     - On-hand quantity of a product at a stock location
   * - ``StockMove``
     - Auditable record of every inventory movement
   * - ``Lot``
     - Traceable batch of material (lot-tracked products only)

----

Prerequisites
-------------

* Tutorial 01 completed at least once (you understand Orion-LD basics).
* ``docker compose version`` — Docker Compose v2.
* ``curl`` and ``python3`` available in your shell.
* Ports **1026**, **3000**, **8080**, and **8081** free on ``localhost``.

----

Step 1 — Start the full stack
------------------------------

If the core stack is not already running:

.. code-block:: bash

   make start          # starts orion-ld, context-server, mrp-api
   make seed           # loads Tutorial 01 master data (12 entities)

Then start the inventory service:

.. code-block:: bash

   docker compose up -d --build inventory-service

Or use the convenience target:

.. code-block:: bash

   make start-emulator     # starts everything including the emulator

Verify all services are healthy:

.. code-block:: bash

   curl -s http://localhost:8081/health | python3 -m json.tool

Expected:

.. code-block:: json

   {
       "status": "ok",
       "service": "inventory-service",
       "version": "0.2.0"
   }

----

Step 2 — Query initial inventory
---------------------------------

Before any receipts the inventory is empty:

.. code-block:: bash

   curl -s "http://localhost:8081/inventory" | python3 -m json.tool

Expected:

.. code-block:: json

   []

----

Step 3 — Receive PumpCasing (no lot)
--------------------------------------

.. code-block:: bash

   curl -s -X POST http://localhost:8081/commands/receive-material \
     -H "Content-Type: application/json" \
     -d '{
       "product_id":  "urn:ngsi-ld:Product:PumpCasing",
       "location_id": "urn:ngsi-ld:StockLocation:WH-STOCK",
       "quantity":    50,
       "unit":        "EA",
       "reference":   "PO-2024-001"
     }' | python3 -m json.tool

Expected response:

.. code-block:: json

   {
       "status": "done",
       "stock_move_id": "urn:ngsi-ld:StockMove:SM-20240115-XXXX",
       "inventory_balance_id": "urn:ngsi-ld:InventoryBalance:IB-PumpCasing-WH-STOCK",
       "quantity_on_hand": 50.0
   }

The service has created two NGSI-LD entities in Orion-LD:

* a ``StockMove`` (``moveType: receipt``, ``state: done``)
* an ``InventoryBalance`` for ``PumpCasing`` at ``WH-STOCK``

----

Step 4 — Receive Impeller with lot tracking
--------------------------------------------

.. code-block:: bash

   curl -s -X POST http://localhost:8081/commands/receive-material \
     -H "Content-Type: application/json" \
     -d '{
       "product_id":  "urn:ngsi-ld:Product:Impeller",
       "location_id": "urn:ngsi-ld:StockLocation:WH-STOCK",
       "quantity":    30,
       "unit":        "EA",
       "lot_code":    "LOT-240001",
       "reference":   "PO-2024-002"
     }' | python3 -m json.tool

The response includes a ``lot_id``.  The service created three entities:

* a ``Lot`` (``lotCode: LOT-240001``, ``qualityStatus: approved``)
* a ``StockMove`` referencing the lot
* a lot-specific ``InventoryBalance`` keyed to ``IB-Impeller-WH-STOCK-LOT-240001``

----

Step 5 — Query and inspect balances
-------------------------------------

Query all balances
~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -s "http://localhost:8081/inventory" | python3 -m json.tool

Expected: two ``InventoryBalance`` entities — PumpCasing and Impeller (lot LOT-240001).

Filter by product
~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -s "http://localhost:8081/inventory?product_id=urn:ngsi-ld:Product:PumpCasing" \
     | python3 -m json.tool

Inspect entities directly in Orion-LD
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   MRP="https://fiware-mrp.io/ontology/mrp%23"

   # All InventoryBalance entities
   curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}InventoryBalance" \
     -H "Accept: application/ld+json" | python3 -m json.tool

   # All StockMove entities (audit trail)
   curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}StockMove" \
     -H "Accept: application/ld+json" | python3 -m json.tool

   # The Lot entity
   curl -s "http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:Lot:LOT-240001" \
     -H "Accept: application/ld+json" | python3 -m json.tool

----

Step 6 — Verify balance accumulation
--------------------------------------

Receive more PumpCasing:

.. code-block:: bash

   curl -s -X POST http://localhost:8081/commands/receive-material \
     -H "Content-Type: application/json" \
     -d '{
       "product_id":  "urn:ngsi-ld:Product:PumpCasing",
       "location_id": "urn:ngsi-ld:StockLocation:WH-STOCK",
       "quantity":    20,
       "unit":        "EA",
       "reference":   "PO-2024-003"
     }' | python3 -m json.tool

``quantity_on_hand`` should now return **70** (50 + 20).  A second ``StockMove``
entity appears in Orion-LD.  The ``InventoryBalance`` entity is patched in place
— its ``quantityOnHand`` attribute is updated, not the entity replaced.

----

Step 7 — Run automated tests
------------------------------

.. code-block:: bash

   make test-02

Expected output:

.. code-block:: text

   === Tutorial 02 Assertions ===

   [PASS] Inventory service health: expected ok, got ok
   [PASS] Receive 50 PumpCasing (status): expected done, got done
   [PASS] Receive 50 PumpCasing (quantity_on_hand): expected 50, got 50
   [PASS] Receive 30 Impeller lot LOT-240001 (status): expected done, got done
   [PASS] Lot LOT-240001 state in Orion-LD: expected active, got active
   [PASS] InventoryBalance count: expected 2, got 2
   [PASS] StockMove count (receipt moves): expected 2, got 2
   [PASS] Second PumpCasing receipt accumulates to 70: expected 70, got 70

   Results: 8 passed, 0 failed.

.. note::

   The test script calls ``make test-02`` from a **clean state** — it does not
   reset first.  If you ran earlier exercises the move and balance counts may be
   higher than 2.  Run ``make reset && make start && make seed`` then re-run the
   test to get the canonical counts.

.. list-table::
   :header-rows: 1
   :widths: 40 20 40

   * - Assertion
     - Expected
     - Why
   * - Inventory service health
     - ``ok``
     - Service is running and can reach Orion-LD
   * - Receive PumpCasing — status
     - ``done``
     - Command completed synchronously
   * - Receive PumpCasing — quantity_on_hand
     - ``50``
     - First receipt, nothing previously in stock
   * - Receive Impeller + lot — status
     - ``done``
     - Lot-tracked receipt completed
   * - Lot LOT-240001 state in Orion-LD
     - ``active``
     - Lot entity created correctly
   * - InventoryBalance count in Orion-LD
     - ``2``
     - One per product/location(/lot) combination
   * - StockMove count in Orion-LD
     - ``2``
     - One audit record per receipt
   * - Second PumpCasing receipt accumulates to 70
     - ``70``
     - 50 + 20 — balance is patched, not replaced

----

Optional — Visual guided tour
------------------------------

Tutorial 02 ships a Phaser 3 emulator extension that lets you replay all six
steps above through a browser UI with live NGSI-LD traces.

.. note::

   Node.js 18 or later must be installed on the host to install npm dependencies
   (one-time setup).

Mock mode (no backend required)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   make install-emulator   # run once
   make start-mock

Then open ``http://localhost:5173`` and select **Tutorial 02 – Inventory** from
the dropdown in the top bar.

Live mode (against a running stack)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   make start-emulator     # includes inventory-service

Then open ``http://localhost:5173`` and select Tutorial 02.

The guided tour
~~~~~~~~~~~~~~~

The left panel walks through six steps:

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Step
     - What it does
   * - Verify inventory service
     - Health-checks the inventory-service
   * - Load seed data
     - Re-upserts the 12 Tutorial 01 master-data entities
   * - Query initial inventory
     - Confirms zero InventoryBalance entities exist
   * - Receive PumpCasing
     - POSTs ``receive-material`` for 50 PumpCasing, shows the StockMove and balance
   * - Receive Impeller (lot-tracked)
     - POSTs ``receive-material`` with ``lot_code``, shows the Lot entity
   * - Query all balances
     - GETs ``/inventory``, lists both InventoryBalance entities in the inspector

Each step shows the exact HTTP call under the hood, the live API trace, and
the raw JSON-LD response.

Stop the emulator
~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   make stop-emulator

----

Troubleshooting
---------------

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Symptom
     - Fix
   * - ``inventory-service`` exits immediately
     - Check ``docker compose logs inventory-service``.  The service depends on
       ``orion-ld`` being healthy — run ``make start`` first.
   * - ``receive-material`` returns ``502``
     - Orion-LD may be unhealthy.  Check with
       ``curl -s http://localhost:1026/ngsi-ld/ex/v1/version``.
   * - ``/inventory`` always returns ``[]``
     - Verify the context URL matches what was used when writing.  Run
       ``make reset && make start && make seed`` then retry the receipts.
   * - Balance does not accumulate (always shows the same quantity)
     - The PATCH to Orion-LD may be silently failing.  Check
       ``docker compose logs inventory-service`` for ``502`` errors.
   * - Test shows count > 2
     - You ran earlier exercises without resetting.  Run
       ``make reset && make start && make seed`` and re-run ``make test-02``.
   * - Port conflict on 8081
     - Set ``INVENTORY_SERVICE_PORT`` in ``.env`` and rebuild
       ``docker compose up -d --build inventory-service``.

----

Clean up
--------

Stop containers without removing data:

.. code-block:: bash

   make stop

Stop containers **and** remove all volumes (clean slate):

.. code-block:: bash

   make reset

----

What comes next
---------------

**Tutorial 03 — Bill of Materials and BoM explosion.**

We define the ``HydraulicPump-P100`` BOM, link its four component lines, and
implement the ``explode-bom`` command that returns the full list of materials
needed to manufacture *N* units.

New models introduced: ``BillOfMaterials``, ``BillOfMaterialsLine``.
New service added: ``bom-service``.
