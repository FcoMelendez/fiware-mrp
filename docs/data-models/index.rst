Data Models
===========

.. note::

   Full data model reference pages are being drafted.
   The Smart Data Models–compatible JSON schema files live in
   ``data-models/dataModel.MRP/``.

Entity types defined in this project:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Type
     - Description
   * - ``Company``
     - Legal or operating entity that owns one or more plants
   * - ``Plant``
     - Factory or production site
   * - ``ProductionLine``
     - Ordered sequence of work centres within a plant
   * - ``WorkCenter``
     - Logical production resource with capacity and calendar
   * - ``Product``
     - Manufactured, purchased or consumable item
   * - ``StockLocation``
     - Physical or logical inventory location

.. toctree::
   :maxdepth: 2

