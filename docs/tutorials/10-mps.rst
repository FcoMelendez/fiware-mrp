Tutorial 10 — MPS-lite Demand Planning
==========================================

**Stack tag:** v0.10  |  **New service:** ``mps-service`` (port 8088)

Business goal
-------------

Before a ManufacturingOrder ever gets confirmed, a planner needs to know
*whether* one is needed at all. ``mps-service`` turns a demand forecast
and a per-product reordering policy into a suggested production
quantity — comparing projected inventory against safety stock and
rounding the shortfall up to a sensible batch size — so a planner can
review and confirm it before anyone touches the shop floor.

What you will build
--------------------

* ``mps-service`` (FastAPI, port 8088) — two commands:

  - ``POST /commands/generate-mps`` — given a ``DemandForecast`` ID,
    computes ``projectedInventory`` (current on-hand summed across
    locations minus the forecast quantity) and, if that falls below the
    matching ``ReorderingRule``'s ``safetyStock``, a
    ``suggestedProductionQuantity`` rounded up to the rule's ``lotSize``.
  - ``POST /commands/confirm-mps-line`` — records a planner's sign-off:
    sets ``confirmedProductionQuantity`` (defaulting to the suggested
    value) and moves ``state`` to ``confirmed``.

* Three new NGSI-LD entity types:

  - :doc:`DemandForecast <../data-models/demand-forecast>` — forecasted demand for a bucket
  - :doc:`ReorderingRule <../data-models/reordering-rule>` — per-product safety stock and lot-sizing policy
  - :doc:`MasterProductionScheduleLine <../data-models/master-production-schedule-line>` — the computed suggestion

``mps-service`` is advisory-only and additive, matching every other
service in this stack: it never creates a ``ManufacturingOrder`` itself.
Turning a confirmed MPS line into an actual order remains
``manufacturing-service``'s responsibility — the two services never call
each other directly, only through the entities they read and write in
Orion-LD.

Prerequisites
-------------

Running into trouble? See the :doc:`/troubleshooting` guide.

Tutorials 01–09 delivered and tested. ``TUTORIAL=10 make seed`` loads
33 entities: Tutorial 09's 30 entities, plus a 5 EA ``InventoryBalance``
for HydraulicPump-P100 at WH-FINISHED, a ``DemandForecast`` of 12 EA for
August, and a ``ReorderingRule`` (``safetyStock``: 3 EA, ``lotSize``: 5 EA).

Quick start
-----------

.. code-block:: bash

   # 1. Start the full stack including mps-service
   make start-emulator          # or: docker compose up -d ... mps-service

   # 2. Seed Tutorial 10 data
   TUTORIAL=10 make seed

   # 3. Generate the MPS line: 5 EA on hand vs. 12 EA forecast → suggest 10 EA
   curl -s -X POST http://localhost:8088/commands/generate-mps \
     -H 'Content-Type: application/json' \
     -d '{"demand_forecast_id": "urn:ngsi-ld:DemandForecast:DF-HydraulicPump-P100-2024-08"}'

   # 4. Confirm the suggestion
   curl -s -X POST http://localhost:8088/commands/confirm-mps-line \
     -H 'Content-Type: application/json' \
     -d '{"mps_line_id": "urn:ngsi-ld:MasterProductionScheduleLine:MPSL-HydraulicPump-P100-2024-08"}'

   # 5. Inspect the result
   curl -s http://localhost:8088/mps-lines | python3 -m json.tool

   # 6. Run automated assertions
   make test-10

Automated assertions
---------------------

``make test-10`` runs ``tutorials/10-mps/tests/test-10.sh`` and verifies
nine assertions covering service health, the generate-mps calculation
(``projectedInventory`` = −7, ``suggestedProductionQuantity`` = 10),
confirmation, and both query endpoints.

NGSI-LD patterns
----------------

Aggregating across multiple entities before computing
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``generate-mps`` is the first command in this stack to combine three
independent queries — a ``DemandForecast``, the matching
``ReorderingRule``, and every ``InventoryBalance`` for the product —
before writing anything:

.. code-block:: text

   on_hand = sum(balance.quantityOnHand for balance in InventoryBalance if balance.product == product_id)
   projectedInventory = on_hand - forecastQuantity
   if projectedInventory < safetyStock:
       suggestedProductionQuantity = ceil((safetyStock - projectedInventory) / lotSize) * lotSize
   else:
       suggestedProductionQuantity = 0

Rounding a shortfall to a lot size
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The shortfall against ``safetyStock`` is rarely a clean multiple of the
batch size a factory actually produces in, so it is rounded up rather
than truncated — a factory never suggests producing a *partial* lot:

.. code-block:: python

   suggested_qty = math.ceil(shortfall / lot_size) * lot_size

Confirming a suggestion is a POST, not a PATCH
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``confirmedProductionQuantity`` does not exist on a freshly generated
MPS line, so ``confirm-mps-line`` must use ``POST /attrs``
(append-or-overwrite) rather than ``PATCH /attrs`` — which only updates
attributes that already exist and would otherwise silently drop the new
value. See the note on this in
:doc:`Tutorial 08 <08-finished-goods>` for the bug this pattern
originally surfaced.

Data model introduced
----------------------

* :doc:`../data-models/demand-forecast`
* :doc:`../data-models/reordering-rule`
* :doc:`../data-models/master-production-schedule-line`

No new context terms beyond the ones already reserved for this tutorial
in the v0.1 context (``bucketStart``, ``bucketEnd``, ``forecastQuantity``,
``confidence``, ``projectedInventory``, ``suggestedProductionQuantity``,
``confirmedProductionQuantity``, ``safetyStock``, ``minimumQuantity``,
``maximumQuantity``, ``lotSize``, ``leadTimeDays``, ``routePolicy``).

What's next
-----------

Tutorial 11 introduces **IoT/MES signals**: machine telemetry and NGSI-LD
subscriptions that push updates to the emulator in real time, rather than
every step being explicitly triggered by an operator.


----

Architecture snapshot
----------------------

.. image:: ../_static/architecture/arch-t10.png
   :alt: Stack at 10-mps
   :align: center
   :width: 90%

See :doc:`../architecture/index` for the full architecture and all incremental diagrams.
