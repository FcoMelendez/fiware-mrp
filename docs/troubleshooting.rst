Troubleshooting
================

Lessons learned the hard way while building this reference implementation,
collected in one place instead of scattered one-off notes per tutorial.
If you hit something not covered here, check the tutorial you're on for a
"NGSI-LD patterns" section — the trickiest edge cases are usually explained
in the tutorial where they were first discovered.

General stack issues
---------------------

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Symptom
     - Fix
   * - ``make start`` hangs at "Waiting for Orion-LD"
     - Check ``docker compose logs orion-ld``. MongoDB may still be
       starting. Wait 30s and check again with ``docker compose ps``.
   * - Orion-LD exits with code 139 (segfault)
     - You are running ``mongo:6`` instead of ``mongo:5.0`` — see
       `MongoDB version`_ below. Run ``make reset`` and check
       ``docker-compose.yml``.
   * - Seed fails with ``HTTP 207`` (partial errors)
     - The context file may be cached incorrectly — see `Context caching`_
       below. Run ``make reset`` to wipe MongoDB and start fresh.
   * - Test counts show 0
     - Check that ``make seed`` (or ``TUTORIAL=NN make seed``) completed
       successfully. Re-run it — the seed is idempotent.
   * - Port conflict on 1026, 3000, 8080, or a service's own port
     - Stop the conflicting process, or override the port via ``.env``
       (copy ``.env.example`` and edit).
   * - A service container is running but returns 404 for every route
     - It's usually running an older image. Rebuild it explicitly:
       ``docker compose up -d --build <service-name>``.
   * - Emulator UI shows "Connecting…" and never loads
     - Check ``docker compose logs emulator-gateway``. In mock mode the
       gateway does not need Orion-LD, but it must be healthy before the UI
       container starts. Run ``docker compose ps`` to confirm.

NGSI-LD gotchas
----------------

PATCH silently drops brand-new attributes
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``PATCH /ngsi-ld/v1/entities/{id}/attrs`` only **updates** attributes that
already exist on the entity. If the request body includes an attribute the
entity doesn't have yet, Orion-LD returns ``207`` with
``notUpdated: [{attributeName, reason: "attribute doesn't exist"}]`` — a
service that only checks ``status_code in (204, 207)`` treats this as
success and silently loses the new attribute.

.. code-block:: bash

   # Wrong — confirmedAt doesn't exist on this entity yet, so PATCH drops it
   PATCH /ngsi-ld/v1/entities/{id}/attrs
   { "state": {...}, "confirmedAt": {...} }
   → 207, notUpdated: [{"attributeName": "confirmedAt", "reason": "attribute doesn't exist"}]

   # Right — POST appends new attributes and overwrites existing ones
   POST /ngsi-ld/v1/entities/{id}/attrs
   { "state": {...}, "confirmedAt": {...} }
   → 204

**Rule of thumb:** use ``POST .../attrs`` any time you're setting an
attribute for the first time (a state-transition timestamp, a first-time
relationship). Reserve ``PATCH`` for attributes guaranteed to already exist.
Every command in this reference implementation that sets a new attribute —
``confirm-manufacturing-order`` (Tutorial 04), ``cancel-manufacturing-order``
(Tutorial 04), ``complete-rework-order`` and ``acknowledge-quality-alert``
(Tutorial 09) — follows this rule; ``resolve-shortages`` (Tutorial 05) is
the counter-example that correctly uses PATCH, because it only ever adjusts
attributes ``reserve-components`` already set.

MongoDB version
~~~~~~~~~~~~~~~~

Orion-LD 1.6.0 uses a MongoDB driver that depends on the legacy
``OP_QUERY`` wire protocol for ``listDatabases``. MongoDB 6.0 dropped
``OP_QUERY`` support, which causes Orion-LD to segfault on startup (exit
code 139). Always run ``mongo:5.0``, never ``mongo:6`` or later.

Context caching
~~~~~~~~~~~~~~~~

Orion-LD caches fetched ``@context`` files in MongoDB. After changing the
project's context file, a container restart is **not** enough to pick up
the change — the broker will keep serving the cached version. Run
``make reset`` (a full volume wipe) to force it to re-fetch.

Entity-not-found races right after creation
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A command that queries an entity immediately after a *different* request
created it can occasionally 404 — Orion-LD's write path has a small
eventual-consistency window under load. Tutorial 11's clock-in/clock-out
pair hit exactly this: ``clock-out`` looked up the ``OperatorAssignment``
that ``clock-in`` had just created moments earlier in a separate request.
The fix is a short, bounded retry around the read (a few attempts, ~150ms
apart) rather than assuming the write is instantly visible everywhere.

Subscription creation rejects Content-Type + Link together
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``POST /ngsi-ld/v1/subscriptions`` with both a ``Content-Type:
application/ld+json`` header and a ``Link`` header returns ``400
BadRequestData`` — this endpoint won't accept both context-resolution
mechanisms at once. Use inline ``@context`` in the subscription body
instead of a ``Link`` header, the same way every entity write in this
codebase does it.

Batch upsert does not reset an entity's attributes on replay
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Re-running a tutorial's seed step against a broker that still has data from
a previous run does **not** roll back attribute values a later command
changed — re-upserting a ``WorkOrder`` with ``state: "planned"`` will not
override that same entity's current ``state: "completed"`` if it already
completed once. Each service's own state guard checks the *live* value, so
replaying a command sequence without reseeding fails downstream with a 422,
not at the upsert step. If you're manually re-testing a tutorial mid-flow
without going through ``make test-NN`` (which reseeds automatically), run
``make reset`` first.
