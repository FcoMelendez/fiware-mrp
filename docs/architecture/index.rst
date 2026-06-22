Architecture
============

.. note::

   Full architecture documentation is being drafted.
   See Tutorial 01 for the first stack increment.

The FIWARE MRP reference implementation follows a **context-broker-centric**
architecture: business microservices write and read context from the Orion-LD
broker via NGSI-LD.  The broker is the shared truth layer; services do not
talk directly to each other's databases.

.. toctree::
   :maxdepth: 2

