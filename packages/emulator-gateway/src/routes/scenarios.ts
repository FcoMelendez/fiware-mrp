import { Router } from 'express';
import type { ScenarioEngine } from '../scenario/ScenarioEngine.js';

export function scenariosRouter(engine: ScenarioEngine): Router {
  const router = Router();

  // List all available tutorials/scenarios
  router.get('/', (_req, res) => {
    res.json(engine.listScenarios());
  });

  // Get guided steps for a tutorial
  router.get('/:tutorialId/steps', (req, res) => {
    const { tutorialId } = req.params;
    try {
      res.json(engine.getSteps(tutorialId));
    } catch (err) {
      res.status(404).json({ error: 'Unknown tutorial', tutorialId });
    }
  });

  // Execute a single step
  router.post('/:tutorialId/steps/:stepId/execute', async (req, res) => {
    const { tutorialId, stepId } = req.params;
    try {
      const result = await engine.executeStep(tutorialId, stepId);
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: 'Step execution failed',
        tutorialId,
        stepId,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}
