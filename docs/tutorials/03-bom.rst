Tutorial 03 — Bill of Materials and BoM explosion
==================================================

**Tag:** ``v0.3`` |
**Effort:** ~30 minutes (CLI path) or ~20 minutes (visual emulator) |
**Stack additions:** ``bom-service``

----

What you will build
-------------------

A ``bom-service`` (Python/FastAPI) that stores a Bill of Materials for the
Hydraulic Pump P100 and exposes an ``explode-bom`` command that computes the
net material requirements for a given production quantity.

By the end of this tutorial you can:

* Create a ``BillOfMaterials`` header and four ``BillOfMaterialsLine`` entities
  in Orion-LD.
* Query all BOMs and the component lines for a specific BOM via the service API.
* Explode a BOM for any order quantity and read back the net requirements for
  each component.
* Understand why ``scrapFactor`` is stored on the line but *not* applied to net
  requirements in this tutorial (gross requirements are a Tutorial 10 concern).

----

Concepts introduced
-------------------

BillOfMaterials
~~~~~~~~~~~~~~~

A ``BillOfMaterials`` entity is the header record that links a finished product
to its recipe.  Each BOM has a ``state`` (``active``, ``draft``, or
``obsolete``), a ``version`` string, and a ``bomType``
(``manufacturing``, ``kitting``, or ``phantom``).

Only one BOM per product may be ``active`` at a time.  The bom-service filters
by ``state: active`` when resolving which BOM to explode.

BillOfMaterialsLine
~~~~~~~~~~~~~~~~~~~

Each ``BillOfMaterialsLine`` entity represents one component in the recipe.
It carries:

* ``sequence`` — display and pick order.
* ``quantity`` — how much of the component is needed per finished unit.
* ``scrapFactor`` — informational expected waste rate (not applied here).
* A ``bom`` Relationship → the parent BOM header.
* A ``component`` Relationship → the component ``Product``.

BoM explosion
~~~~~~~~~~~~~

The ``explode-bom`` command (``POST /commands/explode-bom``) accepts a
``product_id`` and an ``order quantity``.  It:

1. Finds the active BOM for the product.
2. Fetches all BillOfMaterialsLine entities for that BOM.
3. Multiplies each line's ``quantity`` by the order quantity:
   ``required_quantity = line_qty × order_qty``.
4. Returns the full component requirement list.

This gives you *net requirements* — the starting point for MRP planning in
Tutorial 10.

----

Architecture of this tutorial
------------------------------

.. code-block:: text

   ┌──────────────────────────────────────────────────────────────┐
   │  Tutorial 03 stack (adds bom-service)                        │
   │                                                              │
   │  ┌──────────────────┐  POST explode-bom                     │
   │  │  bom-service     │  ────────────────────────────────────► │
   │  │  :8082           │  GET /ngsi-ld/v1/entities?type=BOM     │
   │  └──────────────────┘  ────────────────────────────────────► │
   │          ▲                      ┌──────────────┐             │
   │          │  GET /boms           │  orion-ld    │             │
   │          │  ◄───────────────────│  :1026       │             │
   │          │                     └──────────────┘             │
   └──────────────────────────────────────────────────────────────┘

The bom-service never stores state of its own.  All data lives in Orion-LD
as NGSI-LD entities.  The service is a thin business-logic layer that
translates the ``explode-bom`` command into two broker queries and a
multiplication loop.

----

Data models
-----------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Purpose
   * - :doc:`../data-models/bill-of-materials`
     - BoM header: product, version, state
   * - :doc:`../data-models/bill-of-materials-line`
     - One component line: quantity, scrapFactor, component Relationship

----

Seed data
---------

The Tutorial 03 seed (``services/seed-loader/data/tutorial-03.json``) creates
five entities on top of the twelve Tutorial 01 master-data entities:

.. list-table::
   :header-rows: 1
   :widths: 45 15 40

   * - Entity ID
     - Type
     - Key fields
   * - ``BOM-HP-P100-v1``
     - BillOfMaterials
     - type=manufacturing, state=active, product→HydraulicPump-P100
   * - ``BML-HP-P100-PumpCasing``
     - BillOfMaterialsLine
     - seq=1, qty=1 EA, scrap=0.02, component→PumpCasing
   * - ``BML-HP-P100-Impeller``
     - BillOfMaterialsLine
     - seq=2, qty=1 EA, scrap=0.01, component→Impeller
   * - ``BML-HP-P100-ElectricMotor``
     - BillOfMaterialsLine
     - seq=3, qty=1 EA, scrap=0.01, component→ElectricMotor
   * - ``BML-HP-P100-SealKit``
     - BillOfMaterialsLine
     - seq=4, qty=2 EA, scrap=0.05, component→SealKit

----

Running the tutorial
--------------------

Prerequisites
~~~~~~~~~~~~~

* Docker and Docker Compose installed.
* Docker stack running (``make start``). The Tutorial 03 seed file is self-contained and includes all Tutorial 01 master data — no separate T01 seed step needed.
* ``bom-service`` is part of the default stack from Tutorial 03 onwards.

CLI path
~~~~~~~~

.. code-block:: bash

   # 1. Start the full stack (includes bom-service from this tutorial onwards)
   make start

   # 2. Seed Tutorial 03 data (self-contained — includes T01 master data)
   TUTORIAL=03 make seed

   # 3. Verify the bom-service is running
   curl http://localhost:8082/health

   # 4. List all Bills of Materials
   curl http://localhost:8082/boms | python3 -m json.tool

   # 5. List the BOM lines for the Hydraulic Pump P100
   curl http://localhost:8082/boms/urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1/lines \
     | python3 -m json.tool

   # 6. Explode the BoM for an order of 10 units
   curl -s -X POST http://localhost:8082/commands/explode-bom \
     -H "Content-Type: application/json" \
     -d '{"product_id":"urn:ngsi-ld:Product:HydraulicPump-P100","quantity":10}' \
     | python3 -m json.tool

   # Expected: SealKit required_quantity = 20 (2 × 10)

   # 7. Run the automated test assertions
   make test-03

Visual emulator path
~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   make start-emulator

Open ``http://localhost:5173``, select **Tutorial 03** from the dropdown, and
follow the six guided steps.  The explode-bom step shows the component
requirement breakdown in the Entity Inspector.

Automated assertions
~~~~~~~~~~~~~~~~~~~~

``make test-03`` runs six assertions against the live stack:

1. ``bom-service`` health endpoint returns ``status: ok``.
2. Upsert of T01 + T03 seed data returns HTTP 201 or 204.
3. ``GET /boms`` returns exactly 1 ``BillOfMaterials`` entity.
4. ``GET /boms/{id}/lines`` returns exactly 4 ``BillOfMaterialsLine`` entities.
5. ``POST /commands/explode-bom`` for 10 units returns ``SealKit.required_quantity = 20``.
6. The ``BillOfMaterials`` entity fetched directly from Orion-LD has ``state: active``.

----

Design notes
------------

scrapFactor is informational in Tutorial 03
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The ``scrapFactor`` field records the expected component waste rate but is
intentionally not applied to ``required_quantity`` in this tutorial.

Net requirements (line_qty × order_qty) are the input to demand planning.
Gross requirements (net × (1 + scrapFactor)) are computed by the MRP planner
in Tutorial 10.  Separating the two concerns keeps this tutorial focused on the
BoM data model and explosion mechanics.

Active BOM resolution
~~~~~~~~~~~~~~~~~~~~~

The bom-service resolves the BOM to explode by filtering
``BillOfMaterials`` entities where:

* ``product`` Relationship = the requested ``product_id``
* ``state`` Property = ``"active"``

If no active BOM is found, the service returns HTTP 404.  Only one BOM per
product should be ``active`` at any time — a constraint enforced by the
seed data and by the service's design; multi-version BOM management will be
added in a later tutorial.

----

What's next
-----------

* **Tutorial 04** — Manufacturing order confirmation: use the BOM to create a
  ``ManufacturingOrder`` entity and check component availability before
  confirming.
