Tutorial 01 — Getting started with the FIWARE MRP context
===========================================================

**Tag:** ``v0.1`` |
**Effort:** ~30 minutes (CLI path) or ~20 minutes (visual emulator) |
**Stack additions:** Orion-LD, MongoDB, context-server, mrp-api, emulator-gateway *(optional)*, emulator-ui *(optional)*

----

What you will build
-------------------

A running FIWARE stack with a project-owned JSON-LD ``@context`` and a minimal
factory graph stored in the Orion-LD Context Broker.

By the end of this tutorial you can:

* Start a complete NGSI-LD stack with a single ``make`` command.
* Understand what the MRP JSON-LD context does and how it is served.
* Create NGSI-LD entities through the batch upsert API.
* Query entities by type and by attribute value.
* Inspect normalized NGSI-LD format (Properties and Relationships).
* Run automated assertions that verify the seed data is correct.
* *(Optional)* Explore the same 12 entities through the Phaser 3 visual factory emulator.

----

Concepts introduced
-------------------

NGSI-LD
~~~~~~~

NGSI-LD (Next Generation Service Interface with Linked Data) is an ETSI standard
(`ETSI GS CIM 009 <https://www.etsi.org/deliver/etsi_gs/CIM/001_099/009/01.09.01_60/gs_CIM009v010901p.pdf>`_)
for managing context information.  A *context* is the set of facts that are
currently true about entities in the world — machines, orders, inventory levels.

Each entity has an **id** (a URN), a **type**, and a set of **attributes**.
Attributes are either:

* **Properties** — scalar or structured values with an optional unit of measure.
* **Relationships** — links to other entities by their URN.
* **GeoProperties** — geographic coordinates.

JSON-LD @context
~~~~~~~~~~~~~~~~

The ``@context`` file maps short human-readable names (e.g. ``Plant``,
``locatedIn``) to globally unique IRIs (e.g.
``https://fiware-mrp.io/ontology/mrp#Plant``).  This makes the data
self-describing and interoperable across systems.

The MRP project uses a single versioned context file served by the
``context-server`` container:

.. code-block:: text

   http://context-server:3000/contexts/mrp/v0.1/context.jsonld   ← inside Docker
   http://localhost:3000/contexts/mrp/v0.1/context.jsonld        ← from your host

.. note::

   Orion-LD fetches the ``@context`` URL from *inside* the Docker network.
   Use ``context-server:3000`` in entity payloads sent by services, and
   ``localhost:3000`` when fetching the file from your browser or curl on the host.

----

Architecture of this tutorial
------------------------------

.. code-block:: text

   ┌──────────────────────────────────────────────────────┐
   │  Tutorial 01 stack                                   │
   │                                                      │
   │  ┌──────────────┐  NGSI-LD batch  ┌──────────────┐  │
   │  │ seed-loader  │ ──────────────► │  orion-ld    │  │
   │  └──────────────┘                 └──────┬───────┘  │
   │                                          │           │
   │  ┌──────────────┐  @context file  ┌──────▼───────┐  │
   │  │   mrp-api    │ ◄────────────── │  context-    │  │
   │  │  (health)    │                 │  server      │  │
   │  └──────────────┘                 └──────────────┘  │
   │                                          │           │
   │                                   ┌──────▼───────┐  │
   │                                   │   mongodb    │  │
   │                                   └──────────────┘  │
   └──────────────────────────────────────────────────────┘

.. list-table::
   :header-rows: 1
   :widths: 25 15 60

   * - Service
     - Host port
     - Purpose
   * - ``orion-ld``
     - 1026
     - NGSI-LD Context Broker
   * - ``context-server``
     - 3000
     - Serves versioned JSON-LD ``@context`` files
   * - ``mrp-api``
     - 8080
     - MRP Business API (health endpoint only in Week 1)
   * - ``mongo``
     - *(internal)*
     - Orion-LD persistence
   * - ``emulator-gateway`` *(optional)*
     - 8090
     - Node.js + Express SSE gateway — proxies NGSI-LD calls and streams entity events
   * - ``emulator-ui`` *(optional)*
     - 5173
     - Phaser 3 + TypeScript visual factory emulator (served by Vite)

----

Models introduced
-----------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Entity type
     - Description
   * - ``Company``
     - Legal or operating entity that owns one or more plants
   * - ``Plant``
     - Factory or production site belonging to a company
   * - ``WorkCenter``
     - Logical production resource with capacity and calendar
   * - ``Product``
     - Manufactured, purchased or consumable item
   * - ``StockLocation``
     - Physical or logical inventory location (warehouse, scrap zone …)
   * - ``ProductionLine``
     - Ordered sequence of work centres within a plant *(defined but not seeded)*

Seed data loaded in this tutorial:

* **1** Company — Hydraulic Parts Co.
* **1** Plant — Barcelona Plant (BCN)
* **3** WorkCenters — Assembly, Leak Test Bench, Packaging
* **5** Products — HydraulicPump-P100, PumpCasing, Impeller, ElectricMotor, SealKit
* **2** StockLocations — WH-STOCK, WH-FINISHED

----

Prerequisites
-------------

* Docker Engine ≥ 24 and Docker Compose v2 installed.

  .. code-block:: bash

     docker compose version
     # Docker Compose version v2.x.x

* ``curl`` and ``python3`` available in your shell (used in the exercises).

  .. code-block:: bash

     curl --version | head -1
     python3 --version

* Ports **1026**, **3000** and **8080** free on ``localhost``.

----

Step 1 — Start the stack
------------------------

Clone the repository (or use your existing working copy) and start the stack:

.. code-block:: bash

   git clone https://github.com/FcoMelendez/fiware-mrp.git
   cd fiware-mrp

   make start

``make start`` runs ``docker compose up -d`` for the four core services and then
waits until Orion-LD responds to a health probe.  The first run downloads the
``mongo:5.0`` and ``fiware/orion-ld:1.6.0`` images (~300 MB total) and builds
the two Python service images.

Expected final output:

.. code-block:: text

   Orion-LD is ready.

Verify each service independently:

.. code-block:: bash

   # Orion-LD — returns version JSON
   curl -s http://localhost:1026/ngsi-ld/ex/v1/version | python3 -m json.tool

   # Context server — returns available context URLs
   curl -s http://localhost:3000/

   # MRP API — health check
   curl -s http://localhost:8080/health

.. code-block:: json

   {
       "status": "ok",
       "service": "mrp-api",
       "version": "0.1.0"
   }

----

Step 2 — Inspect the JSON-LD context
-------------------------------------

Before loading data, explore the context file that gives MRP terms their
globally unique identity:

.. code-block:: bash

   curl -s http://localhost:3000/contexts/mrp/v0.1/context.jsonld \
     | python3 -m json.tool | head -40

You will see the ``@vocab`` declaration and the explicit term definitions:

.. code-block:: text

   {
     "@context": {
       "mrp":    "https://fiware-mrp.io/ontology/mrp#",
       "@vocab": "https://fiware-mrp.io/ontology/mrp#",
       "Plant":  "mrp:Plant",
       "name":   "mrp:name",
       "state":  "mrp:state",
       ...                   (further term aliases omitted)
     }
   }

Key points:

* ``@vocab`` means any attribute name *not* listed explicitly still expands to
  the ``mrp:`` namespace.  This is how Relationship attributes (``locatedIn``,
  ``ownedBy``, ``company`` …) are resolved without being explicitly listed.
* Entity types (``Plant``, ``WorkCenter`` …) and Property attribute names
  (``name``, ``plantCode`` …) are listed explicitly.
* The context is versioned.  ``v0.1`` is immutable after the ``v0.1`` tag.
  ``latest`` points to the current development version.

----

Step 3 — Load seed data
------------------------

.. code-block:: bash

   make seed

The seed loader container starts, waits for Orion-LD, and posts all 12 entities
via the NGSI-LD batch upsert endpoint:

.. code-block:: text

   INFO Loading Tutorial 01 seed data from /app/data/tutorial-01.json
   INFO Orion-LD is ready.
   INFO Upserting 12 entities via batch API ...
   INFO Batch upsert completed (HTTP 201).
   INFO Seed complete — 12 entities loaded for Tutorial 01.

The seed is **idempotent** — running ``make seed`` again overwrites the same
entities without creating duplicates (batch upsert).

.. note::

   The seed data lives in
   ``services/seed-loader/data/tutorial-01.json``.  Open it to see the
   full NGSI-LD normalized payloads for each entity.

----

Step 4 — Query the factory graph
---------------------------------

NGSI-LD queries use the ``/ngsi-ld/v1/entities`` endpoint with a ``type``
filter.  Because attribute names are stored as expanded IRIs inside Orion-LD,
host-side queries use the full MRP namespace IRI (URL-encoded) rather than a
Link header.

.. tip::

   The MRP namespace is ``https://fiware-mrp.io/ontology/mrp#``.  URL-encoded,
   ``#`` becomes ``%23``, giving the prefix ``https%3A%2F%2Ffiware-mrp.io%2Fontology%2Fmrp%23``.
   Save it as a shell variable for the exercises below:

   .. code-block:: bash

      MRP="https://fiware-mrp.io/ontology/mrp%23"

Query the Plant
~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}Plant&options=keyValues" \
     | python3 -m json.tool

Expected result — one entity:

.. code-block:: json

   [
     {
       "id": "urn:ngsi-ld:Plant:Plant-BCN",
       "type": "https://fiware-mrp.io/ontology/mrp#Plant",
       "https://fiware-mrp.io/ontology/mrp#name": "Barcelona Plant",
       "https://fiware-mrp.io/ontology/mrp#plantCode": "BCN",
       "https://fiware-mrp.io/ontology/mrp#timezone": "Europe/Madrid",
       "https://fiware-mrp.io/ontology/mrp#state": "active",
       "ownedBy": "urn:ngsi-ld:Company:HydraulicPartsCo"
     }
   ]

Notice two things:

* Property attribute names appear as full IRIs (``mrp#name``, ``mrp#plantCode``).
  When querying from the host without a resolvable context, the broker returns
  the expanded form.
* The ``ownedBy`` Relationship appears as a *short name* because it was stored
  via ``@vocab`` expansion — the broker returns it compacted automatically.

Query the WorkCenters
~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}WorkCenter&options=keyValues" \
     | python3 -m json.tool

Expected result — three entities: Assembly, Leak Test Bench, Packaging.

Query the Products
~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}Product&options=keyValues" \
     | python3 -m json.tool

Expected result — five entities: HydraulicPump-P100, PumpCasing, Impeller,
ElectricMotor, SealKit.

Query the StockLocations
~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}StockLocation&options=keyValues" \
     | python3 -m json.tool

Expected result — two entities: WH-STOCK, WH-FINISHED.

----

Step 5 — Retrieve a single entity in normalized format
-------------------------------------------------------

Key-values format is convenient for exploration but loses NGSI-LD type
information.  The full **normalized** format shows Properties and Relationships
explicitly:

.. code-block:: bash

   curl -s \
     -H 'Accept: application/ld+json' \
     http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:WorkCenter:WC-Assembly \
     | python3 -m json.tool

Excerpt of the response:

.. code-block:: json

   {
     "id": "urn:ngsi-ld:WorkCenter:WC-Assembly",
     "type": "https://fiware-mrp.io/ontology/mrp#WorkCenter",
     "https://fiware-mrp.io/ontology/mrp#name": {
       "type": "Property",
       "value": "Assembly"
     },
     "https://fiware-mrp.io/ontology/mrp#capacity": {
       "type": "Property",
       "value": 1,
       "unitCode": "C62"
     },
     "locatedIn": {
       "type": "Relationship",
       "object": "urn:ngsi-ld:Plant:Plant-BCN"
     }
   }

The ``locatedIn`` Relationship links the WorkCenter to its Plant by URN.
Following this link gives you the full graph of the factory:

.. code-block:: text

   Company:HydraulicPartsCo
       └── Plant:Plant-BCN
               ├── WorkCenter:WC-Assembly      → locatedIn → Plant:Plant-BCN
               ├── WorkCenter:WC-LeakTest      → locatedIn → Plant:Plant-BCN
               ├── WorkCenter:WC-Packaging     → locatedIn → Plant:Plant-BCN
               ├── StockLocation:WH-STOCK      → locatedIn → Plant:Plant-BCN
               └── StockLocation:WH-FINISHED   → locatedIn → Plant:Plant-BCN

Products reference the Company through the ``company`` Relationship:

.. code-block:: bash

   curl -s \
     -H 'Accept: application/ld+json' \
     http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:Product:HydraulicPump-P100 \
     | python3 -m json.tool

----

Step 6 — Query by attribute value
-----------------------------------

NGSI-LD supports attribute-value filtering with the ``q`` query parameter.

Find only manufactured products
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}Product&q=${MRP}productType==%22manufactured%22&options=keyValues" \
     | python3 -m json.tool

Expected: **1 product** — ``HydraulicPump-P100``.

Find all purchased components
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}Product&q=${MRP}productType==%22purchased%22&options=keyValues" \
     | python3 -m json.tool

Expected: **4 products** — PumpCasing, Impeller, ElectricMotor, SealKit.

Find active work centres
~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   curl -s "http://localhost:1026/ngsi-ld/v1/entities?type=${MRP}WorkCenter&q=${MRP}state==%22active%22&options=keyValues" \
     | python3 -m json.tool

Expected: all 3 work centres (they are all ``active``).

----

Step 7 — Run automated tests
------------------------------

The test script queries Orion-LD and asserts exact entity counts for each type:

.. code-block:: bash

   make test-01

Expected output:

.. code-block:: text

   === Tutorial 01 Assertions ===

   [PASS] Plant count: expected 1, got 1
   [PASS] WorkCenter count: expected 3, got 3
   [PASS] Product count: expected 5, got 5
   [PASS] StockLocation count: expected 2, got 2

   Results: 4 passed, 0 failed.

.. list-table::
   :header-rows: 1
   :widths: 30 20 50

   * - Assertion
     - Expected count
     - Why
   * - Plant
     - 1
     - Barcelona Plant (BCN)
   * - WorkCenter
     - 3
     - Assembly, Leak Test Bench, Packaging
   * - Product
     - 5
     - HP-P100 + 4 purchased components
   * - StockLocation
     - 2
     - WH-STOCK (raw), WH-FINISHED

----

Optional — Visual guided tour
------------------------------

Tutorial 01 ships a **Phaser 3 browser emulator** that wraps the same six API
calls in a step-by-step guided tour.  You can use it instead of, or alongside,
the curl exercises above.

.. note::

   Node.js 18 or later must be installed on the host to install npm dependencies
   (one-time setup).  Docker is still the only runtime requirement.

Mock mode (no Orion-LD required)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Mock mode runs the emulator entirely from in-memory fixtures — the core
stack does not need to be running:

.. code-block:: bash

   make install-emulator   # install npm deps in packages/ — run once
   make start-mock         # starts emulator-gateway + emulator-ui

Then open the emulator in your browser:

.. code-block:: text

   http://localhost:5173

Live mode (against a running broker)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If the core stack is already running and seeded:

.. code-block:: bash

   make start-emulator     # adds emulator-gateway and emulator-ui to the stack

.. _tutorial-01-ui-layout:

UI layout
~~~~~~~~~

The emulator has a three-column layout:

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Panel
     - Content
   * - **Left**
     - **Guided Tour** — six step cards with execute / retry controls and a global ↺ Restart button
   * - **Center**
     - **Factory canvas** — Phaser 3 scene; zones highlight in amber when entities are returned; click any zone to open the NGSI-LD entity in the inspector
   * - **Right**
     - **Tabbed panel** — *Query Inspector* (default) and *Broker Explorer*

**Query Inspector tab** contains three stacked sections:

* **REQUEST** console (orange header) — shows the outgoing NGSI-LD query: HTTP method,
  URL, and body (if any).  The *Copy curl* button copies a ready-to-run ``curl``
  command.  Click the header to collapse or expand the console.
* **RESPONSE** console (blue header) — shows the raw JSON-LD reply with full
  formatting.  The *Copy answer* button copies the payload.  Also collapsible.
* **Entity Inspector** — structured attribute table for the most recently selected
  entity.  Properties are shown in plain text; Relationships appear in italic purple.
  Click any coloured **type badge** to open the entity type's data model, which shows
  every attribute, its NGSI-LD kind (Property / Relationship), value type, and a
  raw NGSI-LD template you can toggle on.  Click **← Back** to return.

**Broker Explorer tab** — fetches all entities currently in Orion-LD and groups them
by type.  Click a type badge to read its data model; click an entity row to see its
attributes.  Use the **↻ Refresh** button to reload after new entities are written.

A **Live event timeline** along the bottom bar scrolls horizontally and shows every
SSE notification broadcast from the broker.  Hover a card to read what triggered the
event, why it happened, and what it means for system state.  Click a card to expand
the raw entity payload and jump to the inspector.

The guided tour
~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Step
     - What it does
   * - Verify the stack
     - Health check — confirms gateway, mrp-api, and Orion-LD are responding
   * - Load seed data
     - Batch-upserts all 12 NGSI-LD entities and broadcasts them to the canvas
   * - Inspect the Plant
     - Click any canvas zone to open its entity in the right-panel inspector
   * - Query WorkCenters
     - Fetches all 3 WorkCenters and highlights them on the factory canvas
   * - Browse Products
     - Fetches the 5-item product catalogue
   * - Inspect StockLocations
     - Fetches the 2 warehouse zones

After each step executes, the step card automatically reveals an **Under the hood**
section with a numbered narrative tracing the full call chain — from the emulator
through the gateway to Orion-LD — together with the HTTP status and timing.

Controls on each step card:

* **Execute** button — runs the step.
* **↺ Retry** — re-runs the step without restarting the scenario.
* **↺ Restart** (top of panel) — resets the entire scenario and canvas to the
  initial state, including clearing all entities from the broker.

Stop the emulator
~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   make stop-emulator      # stops emulator containers, leaves core stack running

----

Troubleshooting
---------------

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Symptom
     - Fix
   * - ``make start`` hangs at "Waiting for Orion-LD"
     - Check ``docker compose logs orion-ld``.  MongoDB may still be starting.
       Wait 30 s and check again with ``docker compose ps``.
   * - Orion-LD exits with code 139 (segfault)
     - You are running ``mongo:6`` instead of ``mongo:5.0``.  Run
       ``make reset`` and check ``docker-compose.yml``.
   * - Seed fails with ``HTTP 207`` (partial errors)
     - The context file may be cached incorrectly.  Run ``make reset`` to
       wipe MongoDB and start fresh.
   * - Test counts show 0
     - Check that ``make seed`` completed successfully.  Re-run it — the
       seed is idempotent.
   * - Port conflict on 1026, 3000 or 8080
     - Stop the conflicting process or change the port in ``.env`` (copy
       ``.env.example`` and edit).
   * - Emulator UI shows "Connecting…" and never loads
     - Check ``docker compose logs emulator-gateway``.  In mock mode the
       gateway does not need Orion-LD, but it must be healthy before the UI
       container starts.  Run ``docker compose ps`` to confirm.
   * - Port conflict on 5173 or 8090
     - Set ``EMULATOR_UI_PORT`` or ``EMULATOR_GATEWAY_PORT`` in ``.env`` and
       restart with ``make start-mock`` or ``make start-emulator``.

----

Clean up
--------

Stop containers without removing data:

.. code-block:: bash

   make stop

Stop containers **and** remove all volumes (clean slate for the next run):

.. code-block:: bash

   make reset

----

What comes next
---------------

**Tutorial 02 — Inventory balances and material receipts.**

We will add the ``inventory-service`` and implement the ``receive-material``
business command.  After this tutorial, the system can answer:
*"How much PumpCasing is available in WH-STOCK right now?"*

New models introduced: ``InventoryBalance``, ``StockMove``, ``Lot``.
New service added to ``docker-compose.yml``: ``inventory-service``.
