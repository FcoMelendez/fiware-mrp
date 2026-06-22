Tutorial 01 — Getting started with the FIWARE MRP context
===========================================================

**Tag:** ``v0.1`` |
**Effort:** ~30 minutes |
**Stack additions:** Orion-LD, MongoDB, context-server, mrp-api

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

   git clone https://github.com/<org>/arise-fiware-mrp-reference.git
   cd arise-fiware-mrp-reference

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
