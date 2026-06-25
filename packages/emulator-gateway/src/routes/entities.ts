import { Router } from 'express';
import type { NgsiLdClient } from '../ngsi/NgsiLdClient.js';
import type { MockEntityStore } from '../scenario/MockEntityStore.js';
import { config } from '../config.js';

const MRP_TYPES = [
  'Company', 'Plant', 'WorkCenter', 'Product', 'StockLocation',
  'InventoryBalance', 'StockMove', 'Lot',
  'BillOfMaterials', 'BillOfMaterialsLine',
  'ManufacturingOrder', 'WorkOrder',
];

export function entitiesRouter(ngsi: NgsiLdClient, mockStore: MockEntityStore): Router {
  const router = Router();

  // List all entities — live mode queries the broker; mock mode uses the in-memory store
  router.get('/', async (_req, res) => {
    if (config.mode === 'live') {
      const entities = await ngsi.queryEntities(MRP_TYPES);
      res.json(entities);
    } else {
      res.json(mockStore.getAll());
    }
  });

  router.get('/:entityId(*)', async (req, res) => {
    const entityId = req.params['entityId'];
    if (config.mode === 'live') {
      const entity = await ngsi.getEntity(entityId);
      if (entity) { res.json(entity); return; }
    }
    const mock = mockStore.getById(entityId);
    if (mock) {
      res.json(mock);
    } else {
      res.status(404).json({ error: 'Entity not found', entityId });
    }
  });

  return router;
}
