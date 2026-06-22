FIWARE-based MRP Reference Implementation
==========================================

A tutorial-driven Proof of Concept for a **Manufacturing Resource Planning (MRP)
module** built on `NGSI-LD <https://ngsi-ld.org/>`_ and the
`Orion-LD Context Broker <https://github.com/FIWARE/context.Orion-LD>`_.

The module exposes manufacturing orders, Bills of Materials, inventory, work orders,
quality events and traceability records through an interoperable NGSI-LD graph.
Business logic lives in Python/FastAPI microservices above the broker; the broker
is the shared context layer, not the transaction engine.

.. note::

   All tutorials are self-contained and runnable from a clean checkout using a
   **single** ``docker compose`` stack.  No additional tooling is required
   beyond Docker.

----

Quick start
-----------

.. code-block:: bash

   git clone https://github.com/<org>/arise-fiware-mrp-reference.git
   cd arise-fiware-mrp-reference

   make start        # builds and starts the stack
   make seed         # loads Tutorial 01 seed data
   make test-01      # runs automated assertions (4/4 should pass)

----

.. toctree::
   :maxdepth: 2
   :caption: Tutorials

   tutorials/index

.. toctree::
   :maxdepth: 2
   :caption: Architecture

   architecture/index

.. toctree::
   :maxdepth: 2
   :caption: Data Models

   data-models/index

.. toctree::
   :maxdepth: 2
   :caption: Adopter Guide

   adopters/index
