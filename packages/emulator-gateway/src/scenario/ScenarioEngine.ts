import type { ClientHub } from '../stream/ClientHub.js';
import type { NgsiLdClient } from '../ngsi/NgsiLdClient.js';
import {
  MOCK_SCENE,
  TUTORIAL_01_ENTITIES,
  TUTORIAL_01_STEPS,
  type GuidedStep,
} from './fixtures.js';

export interface ApiTrace {
  method: string;
  url: string;
  requestSummary?: string;
  responseStatus: number;
  responseSummary: string;
  durationMs: number;
}

export interface StepResult {
  stepId: string;
  status: 'completed' | 'failed';
  result: string;
  apiTrace: ApiTrace[];
  entities?: unknown[];
}

export class ScenarioEngine {
  constructor(
    private readonly hub: ClientHub,
    private readonly ngsi: NgsiLdClient,
    private readonly mode: string,
  ) {}

  async executeStep(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_01_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId}`);

    switch (stepId) {
      case 'stack-health': return this.stepStackHealth(step);
      case 'seed-entities': return this.stepSeedEntities(step);
      case 'explore-plant': return this.stepQueryEntities(step, 'Plant', 'urn:ngsi-ld:Plant:Plant-BCN');
      case 'query-workcenters': return this.stepQueryEntities(step, 'WorkCenter');
      case 'query-products': return this.stepQueryEntities(step, 'Product');
      case 'query-stocklocations': return this.stepQueryEntities(step, 'StockLocation');
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepStackHealth(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    const brokerOk = this.mode === 'mock' ? true : await this.ngsi.isReady();
    const durationMs = Date.now() - t0;
    return {
      stepId: step.id,
      status: 'completed',
      result: this.mode === 'mock'
        ? 'Mock mode — all services considered healthy'
        : brokerOk ? 'All services healthy' : 'Broker unreachable',
      apiTrace: [{
        method: 'GET',
        url: step.hood.url,
        responseStatus: 200,
        responseSummary: this.mode === 'mock'
          ? '{ ready: true, mode: "mock" }'
          : brokerOk ? '{ ready: true }' : '{ ready: false }',
        durationMs,
      }],
    };
  }

  private async stepSeedEntities(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '12 entities created';

    if (this.mode === 'live') {
      // In live mode, attempt the actual upsert via NGSI-LD client
      try {
        const res = await fetch(
          `${(this.ngsi as unknown as { orionUrl: string }).orionUrl}/ngsi-ld/v1/entityOperations/upsert`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/ld+json' },
            body: JSON.stringify(TUTORIAL_01_ENTITIES),
            signal: AbortSignal.timeout(10_000),
          },
        );
        responseStatus = res.status;
        responseSummary = res.ok ? '12 entities upserted' : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;

    // Always broadcast snapshot so the UI updates
    const snapshot = { ...MOCK_SCENE, entities: TUTORIAL_01_ENTITIES };
    this.hub.broadcast({
      eventType: 'contextSnapshot',
      payload: snapshot,
    });

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — 1 Plant, 3 WorkCenters, 5 Products, 2 StockLocations`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: '12 entities  •  application/ld+json',
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: TUTORIAL_01_ENTITIES,
    };
  }

  private async stepQueryEntities(step: GuidedStep, type: string, singleId?: string): Promise<StepResult> {
    const t0 = Date.now();
    let entities: unknown[];
    let responseStatus = 200;

    if (this.mode === 'live') {
      entities = singleId
        ? [await this.ngsi.getEntity(singleId)].filter(Boolean)
        : await this.ngsi.queryEntities([type]);
      if (entities.length === 0) responseStatus = 404;
    } else {
      entities = TUTORIAL_01_ENTITIES.filter((e) => e.type === type);
    }

    const durationMs = Date.now() - t0;

    // If it's a single entity, select it in the inspector
    if (entities.length === 1) {
      const ent = entities[0] as { id: string };
      this.hub.broadcast({
        eventType: 'entityChanged',
        entityId: ent.id,
        entityType: type,
        payload: ent,
      });
    }

    return {
      stepId: step.id,
      status: 'completed',
      result: `${entities.length} ${type} entit${entities.length === 1 ? 'y' : 'ies'} returned`,
      apiTrace: [{
        method: 'GET',
        url: step.hood.url,
        responseStatus,
        responseSummary: `${entities.length} entities`,
        durationMs,
      }],
      entities,
    };
  }

  listScenarios(): { id: string; title: string }[] {
    return [{ id: 'tutorial-01', title: 'Tutorial 01 – Getting started with the FIWARE MRP context' }];
  }

  getSteps(): GuidedStep[] {
    return TUTORIAL_01_STEPS;
  }
}
