import { Router } from 'express';
import type { NgsiLdClient } from '../ngsi/NgsiLdClient.js';
import { MOCK_SCENE } from '../scenario/fixtures.js';
import { config } from '../config.js';

export function entitiesRouter(ngsi: NgsiLdClient): Router {
  const router = Router();

  router.get('/:entityId(*)', async (req, res) => {
    const entityId = req.params['entityId'];
    if (config.mode === 'live') {
      const entity = await ngsi.getEntity(entityId);
      if (entity) {
        res.json(entity);
        return;
      }
    }
    const mock = MOCK_SCENE.entities.find((e) => e.id === entityId);
    if (mock) {
      res.json(mock);
    } else {
      res.status(404).json({ error: 'Entity not found', entityId });
    }
  });

  return router;
}
