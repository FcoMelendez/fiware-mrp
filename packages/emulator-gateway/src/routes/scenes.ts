import { Router } from 'express';
import type { NgsiLdClient } from '../ngsi/NgsiLdClient.js';
import type { ClientHub } from '../stream/ClientHub.js';
import { MOCK_SCENE } from '../scenario/fixtures.js';
import { config } from '../config.js';

export function scenesRouter(_ngsi: NgsiLdClient, _hub: ClientHub): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json([{ id: 'mrp-demo-cell', label: 'MRP Demo Cell' }]);
  });

  router.get('/:sceneId/snapshot', async (req, res) => {
    const { sceneId } = req.params;
    if (sceneId !== 'mrp-demo-cell') {
      res.status(404).json({ error: 'Scene not found' });
      return;
    }
    if (config.mode === 'mock') {
      res.json(MOCK_SCENE);
      return;
    }
    const entities = await _ngsi.queryEntities([
      'WorkCenter',
      'ManufacturingOrder',
      'WorkOrder',
      'InventoryBalance',
    ]);
    res.json({ ...MOCK_SCENE, entities, mode: 'live' });
  });

  return router;
}
