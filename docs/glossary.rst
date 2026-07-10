Glossary
========

Core NGSI-LD terms used throughout the tutorials, plus quick pointers to
where this project's own recurring gotchas are explained in more depth.

NGSI-LD core terms
--------------------

Entity
~~~~~~

A single "thing" in the context — a ``ManufacturingOrder``, a
``WorkCenter``, a ``QualityCheck``. Every entity has an ``id`` (a URN,
e.g. ``urn:ngsi-ld:ManufacturingOrder:MO-2024-001``), a ``type``, and a
set of attributes that are either Properties, Relationships, or
GeoProperties.

Property
~~~~~~~~

An attribute holding a value — a number, string, boolean, or structured
value — optionally with a ``unitCode`` (e.g. ``{"type": "Property",
"value": 10, "unitCode": "EA"}``). Most business data (``quantity``,
``state``, timestamps) is modeled this way.

Relationship
~~~~~~~~~~~~

An attribute that links one entity to another by URN (e.g. a
``WorkOrder``'s ``manufacturingOrder`` Relationship pointing at the
``ManufacturingOrder`` it belongs to), rather than embedding the related
entity's data inline. This is what makes the context a connected graph
instead of a set of disconnected documents.

GeoProperty
~~~~~~~~~~~

A geographic-coordinate attribute (point, line, polygon). None of this
project's data models use one yet, but it's a first-class NGSI-LD
attribute type alongside Property and Relationship.

``@context`` / ``@vocab``
~~~~~~~~~~~~~~~~~~~~~~~~~~

The JSON-LD ``@context`` maps short, human-readable term names (``Plant``,
``locatedIn``) to globally unique IRIs
(``https://fiware-mrp.io/ontology/mrp#Plant``), so the same data means the
same thing to every system that shares the context — the core promise of
NGSI-LD interoperability. This project's context uses ``@vocab`` so that
*unlisted* terms auto-expand under the project's namespace rather than
being rejected; see "Never explicitly alias a Relationship attribute name"
in :doc:`adopters/index` for why that specific choice matters.

Upsert vs. PATCH vs. POST /attrs
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Three different NGSI-LD write operations that are easy to conflate:

* ``POST /ngsi-ld/v1/entityOperations/upsert`` — create-or-replace a whole
  entity (or batch of entities). Used by every seed step and by any
  command that creates a brand-new entity (a ``WorkOrder``, a
  ``QualityCheck``).
* ``POST /ngsi-ld/v1/entities/{id}/attrs`` — append-or-overwrite specific
  attributes on an *existing* entity. Correct for setting an attribute for
  the first time.
* ``PATCH /ngsi-ld/v1/entities/{id}/attrs`` — update specific attributes
  that **already exist** on the entity; silently drops anything that
  doesn't. See "PATCH silently drops brand-new attributes" in
  :doc:`troubleshooting` — this exact mix-up is the single most common bug
  class across this project's services.

Temporal API
~~~~~~~~~~~~

Orion-LD's ``/ngsi-ld/v1/temporal/entities`` endpoints, which return the
full history of an entity's attribute changes over time rather than just
its current state. None of the tutorials in this series exercise it —
every entity here is queried at its current value — but it's the natural
next step for anyone building trend/history views (OEE over time,
inventory drawdown curves) on top of this data model.

Subscription
~~~~~~~~~~~~

A standing NGSI-LD registration (``POST /ngsi-ld/v1/subscriptions``) that
tells Orion-LD to push a notification to a URL whenever a matching entity
changes, instead of the consumer having to poll. :doc:`Tutorial 11
<tutorials/11-iot-mes>` is this project's one real example — see
"Enabling NGSI-LD subscriptions" in :doc:`adopters/index` for the pattern
to copy (the consumer registers the subscription, not the producer).

NGSI-LD tenant header
~~~~~~~~~~~~~~~~~~~~~~

The ``NGSILD-Tenant`` request header, which scopes every request to a
separate, fully-isolated set of MongoDB collections inside the same
Orion-LD instance. No tutorial here uses multi-tenancy — see "Configuring
multi-tenancy" in :doc:`adopters/index` for how you'd introduce it.

Where the deeper gotchas live
-------------------------------

This glossary defines terms; :doc:`troubleshooting` is where the sharp
edges each term can cause are explained with real symptoms and fixes —
PATCH-vs-POST, MongoDB version compatibility, context caching, and
eventual-consistency races right after entity creation.
