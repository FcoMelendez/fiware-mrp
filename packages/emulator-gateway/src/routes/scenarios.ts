import { Router } from 'express';
import type { ScenarioEngine } from '../scenario/ScenarioEngine.js';

export function scenariosRouter(engine: ScenarioEngine): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(engine.listScenarios());
  });

  router.get('/tutorial-01/steps', (_req, res) => {
    res.json(engine.getSteps());
  });

  router.post('/tutorial-01/steps/:stepId/execute', async (req, res) => {
    const { stepId } = req.params;
    try {
      const result = await engine.executeStep(stepId);
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: 'Step execution failed',
        stepId,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}
