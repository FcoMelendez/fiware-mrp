Adopter Guide
=============

This guide is for organizations that want to run the FIWARE MRP module
against their own Orion-LD broker and integrate it with existing ERP or MES
infrastructure. It assumes you've completed at least a few tutorials —
:doc:`../tutorials/index` is where the concepts referenced here are
introduced and demonstrated.

Every command service in this reference implementation is a small,
stateless FastAPI process that talks to Orion-LD over plain HTTP and holds
no state of its own — the broker is the only thing that needs durable
storage. That property is what makes every topic below tractable: there is
no service-local database to migrate, replicate, or back up.

Deploying to production
------------------------

The tutorials run everything through a single ``docker-compose.yml`` for
simplicity, but nothing about the services is compose-specific. Each one
is a plain container built from a small Dockerfile
(``services/<name>/Dockerfile``) reading its Orion-LD and context-server
URLs from environment variables (``ORION_URL``, ``CONTEXT_URL`` — see any
``services/*/main.py`` for the exact names). Moving to Kubernetes is
mostly a matter of translating the compose file's services into
Deployments + Services, one per container, with those same environment
variables pointing at your cluster's Orion-LD and context-server
Services:

* **Orion-LD + MongoDB** are the only stateful pieces. Run MongoDB as a
  StatefulSet with a persistent volume (and a replica set once you need
  more than one Orion-LD replica sharing state) — see the "MongoDB
  version" entry in :doc:`../troubleshooting` for the version constraint
  that matters here.
* **context-server** just serves static JSON-LD files
  (``contexts/mrp/<version>/context.jsonld``) — any static file host or a
  ConfigMap-backed Nginx pod works.
* **Business services** (``manufacturing-service``, ``inventory-service``,
  etc.) are stateless and horizontally scalable — run as many replicas as
  you need behind a ClusterIP Service, since they hold no session state
  and every request is a self-contained call to Orion-LD.
* **emulator-gateway**/**emulator-ui** are tutorial/demo tooling, not part
  of the production surface — leave them out of a production deployment
  entirely.

Configuring multi-tenancy
---------------------------

Orion-LD supports per-tenant data isolation via the ``NGSILD-Tenant``
header (or the legacy ``Fiware-Service`` header) — every request the
broker receives is scoped to whichever tenant it names, with completely
separate MongoDB collections per tenant. None of the tutorials in this
series exercise it, since a single-tenant PoC has no need to, but every
service already builds its Orion-LD requests from one central
``ORION_URL`` + header dict (see ``HEADERS_READ``/``HEADERS_WRITE`` near
the top of any ``services/*/main.py``) — adding tenant scoping is a matter
of threading a tenant identifier through those header dicts, most naturally
sourced from an auth token or an incoming request header rather than a
service-wide environment variable, so that one deployment can safely serve
many tenants concurrently.

The data model has one existing hook for tenant-style scoping at the
data level rather than the transport level: ``BillOfMaterials.company``
(a ``Relationship`` to ``Company``) is documented as scoping access "in
multi-tenant deployments" — see :doc:`../data-models/bill-of-materials`.
That's a data-level convention (filter queries by owning company), which
is complementary to, not a replacement for, Orion-LD's own tenant header —
use the tenant header for hard isolation between organizations, and a
``company``/``ownedBy`` Relationship for finer-grained scoping within one
tenant.

Replacing the seed loader with a live ERP integration
-------------------------------------------------------

``services/seed-loader`` exists purely to make every tutorial runnable
from a clean checkout with no external system required — it reads a
static JSON file per tutorial (``services/seed-loader/data/tutorial-NN.json``)
and POSTs it to Orion-LD's batch upsert endpoint. In a real deployment,
delete this piece entirely and replace it with whatever integration layer
translates events from your ERP/MES into the same NGSI-LD entities. The
integration point is exactly the batch-upsert pattern every seed file
already uses (``POST /ngsi-ld/v1/entityOperations/upsert``, same
``@context`` URL) — an ERP connector that upserts ``Product``,
``BillOfMaterials``, and ``ManufacturingOrder`` entities in that shape is
functionally identical to the seed loader, just sourced from a live system
instead of a static file. The business command services
(``confirm-manufacturing-order``, ``reserve-components``, and so on) don't
care where their input entities came from.

Extending the data model with your own entity types
------------------------------------------------------

Every entity type in this project follows the same three-file convention
under ``data-models/dataModel.MRP/<EntityType>/``:

* ``schema.json`` — a JSON Schema describing the entity's NGSI-LD
  attribute shape (see any existing one, e.g.
  ``data-models/dataModel.MRP/ManufacturingOrder/schema.json``, for the
  ``Property``/``Relationship`` wrapper pattern every attribute uses).
* ``README.md`` — human-readable description, state machine (if any), and
  a properties table (optional but recommended once an entity has a
  lifecycle worth documenting).
* ``examples/example.json`` — one realistic instance.

To add a new type of your own: create that directory, then add the type
name and any new Property attribute names to the project's JSON-LD
``@context`` file (``contexts/mrp/<version>/context.jsonld``). Two rules
matter here, both learned the hard way (see
:doc:`../troubleshooting`):

* **Never explicitly alias a Relationship attribute name in the
  context.** This project's context uses ``"@vocab":
  "https://fiware-mrp.io/ontology/mrp#"`` specifically so that
  Relationship terms (``product``, ``bom``, ``workCenter``, and so on)
  auto-expand via the vocab rather than being explicitly defined — Orion-LD
  1.6.0 rejects ``"type": "Relationship"`` for any term that *is* explicitly
  aliased, treating it as a Property instead. Only define entity type names
  and Property attribute names explicitly; let Relationship terms fall
  through ``@vocab``.
* **Bump the context version directory** (``contexts/mrp/v0.2/``, etc.)
  rather than editing a version in place if the change needs to reach a
  broker that has already cached the old one — see the "Context caching"
  entry in :doc:`../troubleshooting`.

A new business command service that reads/writes your new entity type is
just another small FastAPI service following the same pattern as
``services/manufacturing-service`` or ``services/quality-service``: fetch
from Orion-LD with the shared ``@context`` Link header, validate, then
``POST`` (new attribute) or ``PATCH`` (existing attribute) back — see
"PATCH silently drops brand-new attributes" in :doc:`../troubleshooting`
before writing your first command handler.

Enabling NGSI-LD subscriptions for real-time events
-------------------------------------------------------

:doc:`Tutorial 11 <../tutorials/11-iot-mes>` is the reference example for
this: it registers a real ``Subscription`` against Orion-LD (not a mock)
and receives a push notification the moment a matching entity changes.
The pattern to copy is the one that tutorial establishes:

* **The consumer registers the subscription, not the producer.** In
  Tutorial 11, ``iot-simulator`` (the producer of ``MachineSignal``
  updates) never calls ``/subscriptions`` itself — the emulator-gateway,
  as the consumer that wants to react to ``MachineState`` changes,
  registers it and exposes a ``/notify`` endpoint for Orion-LD to call.
  Any real-time consumer you build (a dashboard, an alerting service, an
  ERP-side event handler) should own its own subscription the same way,
  rather than expecting a producer service to push to it directly.
* **Use inline ``@context`` in the subscription body, not a ``Link``
  header** — ``POST /ngsi-ld/v1/subscriptions`` rejects the combination
  of a ``Content-Type: application/ld+json`` header and a ``Link``
  header together, unlike every other write in this codebase. See
  :doc:`../troubleshooting` for the exact error.
