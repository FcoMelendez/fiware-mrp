import type { ClientHub } from '../stream/ClientHub.js';
import type { NgsiLdClient } from '../ngsi/NgsiLdClient.js';
import {
  MOCK_SCENE,
  MOCK_IB_PUMP_CASING,
  MOCK_IB_IMPELLER,
  MOCK_LOT_240001,
  TUTORIAL_01_ENTITIES,
  TUTORIAL_01_STEPS,
  TUTORIAL_02_STEPS,
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

export interface ScenarioInfo {
  id: string;
  title: string;
  stepsCount: number;
}

export class ScenarioEngine {
  constructor(
    private readonly hub: ClientHub,
    private readonly ngsi: NgsiLdClient,
    private readonly mode: string,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  listScenarios(): ScenarioInfo[] {
    return [
      {
        id: 'tutorial-01',
        title: 'Tutorial 01 – Getting started with the FIWARE MRP context',
        stepsCount: TUTORIAL_01_STEPS.length,
      },
      {
        id: 'tutorial-02',
        title: 'Tutorial 02 – Inventory balances and material receipts',
        stepsCount: TUTORIAL_02_STEPS.length,
      },
    ];
  }

  getSteps(tutorialId: string): GuidedStep[] {
    if (tutorialId === 'tutorial-01') return TUTORIAL_01_STEPS;
    if (tutorialId === 'tutorial-02') return TUTORIAL_02_STEPS;
    throw new Error(`Unknown tutorial: ${tutorialId}`);
  }

  async executeStep(tutorialId: string, stepId: string): Promise<StepResult> {
    if (tutorialId === 'tutorial-01') return this.executeTutorial01Step(stepId);
    if (tutorialId === 'tutorial-02') return this.executeTutorial02Step(stepId);
    throw new Error(`Unknown tutorial: ${tutorialId}`);
  }

  async resetTutorial(tutorialId: string): Promise<{ deleted: number }> {
    if (this.mode !== 'live') return { deleted: 0 };
    if (tutorialId === 'tutorial-02') {
      const deleted = await this.ngsi.deleteEntitiesByType(['InventoryBalance', 'StockMove', 'Lot']);
      return { deleted };
    }
    return { deleted: 0 };
  }

  // ── Tutorial 01 step handlers ──────────────────────────────────────────────

  private async executeTutorial01Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_01_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-01`);
    switch (stepId) {
      case 'stack-health':     return this.stepStackHealth(step, 'tutorial-01');
      case 'seed-entities':    return this.stepSeedEntities(step);
      case 'explore-plant':    return this.stepQueryEntities(step, 'Plant', 'urn:ngsi-ld:Plant:Plant-BCN');
      case 'query-workcenters': return this.stepQueryEntities(step, 'WorkCenter');
      case 'query-products':   return this.stepQueryEntities(step, 'Product');
      case 'query-stocklocations': return this.stepQueryEntities(step, 'StockLocation');
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  // ── Tutorial 02 step handlers ──────────────────────────────────────────────

  private async executeTutorial02Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_02_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-02`);
    switch (stepId) {
      case 'check-inventory-service': return this.stepStackHealth(step, 'tutorial-02');
      case 'seed-context':            return this.stepSeedEntities(step);
      case 'query-initial-inventory': return this.stepQueryEntities(step, 'InventoryBalance');
      case 'receive-pump-casings':    return this.stepReceiveMaterial(step, {
        productId: 'urn:ngsi-ld:Product:PumpCasing',
        locationId: 'urn:ngsi-ld:StockLocation:WH-STOCK',
        quantity: 50, unit: 'EA', reference: 'PO-2024-001',
        mockBalance: MOCK_IB_PUMP_CASING,
        mockSmId: 'urn:ngsi-ld:StockMove:SM-MOCK-PC50',
      });
      case 'receive-impellers': return this.stepReceiveMaterial(step, {
        productId: 'urn:ngsi-ld:Product:Impeller',
        locationId: 'urn:ngsi-ld:StockLocation:WH-STOCK',
        quantity: 30, unit: 'EA', lotCode: 'LOT-240001', reference: 'PO-2024-002',
        mockBalance: MOCK_IB_IMPELLER,
        mockSmId: 'urn:ngsi-ld:StockMove:SM-MOCK-IMP30',
        mockLot: MOCK_LOT_240001,
      });
      case 'query-all-balances': return this.stepQueryEntities(step, 'InventoryBalance');
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  // ── Shared step implementations ────────────────────────────────────────────

  private async stepStackHealth(step: GuidedStep, tutorialId: string): Promise<StepResult> {
    const t0 = Date.now();
    let brokerOk = true;
    if (this.mode === 'live') {
      brokerOk = await this.ngsi.isReady();
    }
    const durationMs = Date.now() - t0;

    const isT02 = tutorialId === 'tutorial-02';
    const summary = this.mode === 'mock'
      ? `Mock mode — all services considered healthy${isT02 ? ' (inventory-service, orion-ld)' : ''}`
      : brokerOk ? 'All services healthy' : 'Broker unreachable';

    return {
      stepId: step.id,
      status: 'completed',
      result: summary,
      apiTrace: [{
        method: 'GET',
        url: step.hood.url,
        responseStatus: 200,
        responseSummary: this.mode === 'mock' ? '{ "status": "ok" }' : brokerOk ? '{ "status": "ok" }' : '{ "status": "error" }',
        durationMs,
      }],
    };
  }

  private async stepSeedEntities(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '12 entities upserted';

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = TUTORIAL_01_ENTITIES.map((e) => ({ ...e, '@context': contextUrl }));
        const res = await fetch(
          `${orionUrl}/ngsi-ld/v1/entityOperations/upsert`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/ld+json' },
            body: JSON.stringify(withContext),
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
    const snapshot = { ...MOCK_SCENE, entities: TUTORIAL_01_ENTITIES };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });

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
      const mockPool = [...TUTORIAL_01_ENTITIES, MOCK_IB_PUMP_CASING, MOCK_IB_IMPELLER, MOCK_LOT_240001];
      entities = mockPool.filter((e) => (e as { type: string }).type === type);
    }

    const durationMs = Date.now() - t0;

    if (entities.length === 1) {
      const ent = entities[0] as { id: string };
      this.hub.broadcast({ eventType: 'entityChanged', entityId: ent.id, entityType: type, payload: ent });
    }

    return {
      stepId: step.id,
      status: 'completed',
      result: `${entities.length} ${type} entit${entities.length === 1 ? 'y' : 'ies'} returned`,
      apiTrace: [{ method: 'GET', url: step.hood.url, responseStatus, responseSummary: `${entities.length} entities`, durationMs }],
      entities,
    };
  }

  private async stepReceiveMaterial(
    step: GuidedStep,
    opts: {
      productId: string; locationId: string; quantity: number; unit: string;
      lotCode?: string; reference?: string;
      mockBalance: unknown; mockSmId: string; mockLot?: unknown;
    },
  ): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    let quantityOnHand = opts.quantity;
    let stockMoveId = opts.mockSmId;
    let returnedEntities: unknown[];

    if (this.mode === 'live') {
      try {
        const body: Record<string, unknown> = {
          product_id: opts.productId,
          location_id: opts.locationId,
          quantity: opts.quantity,
          unit: opts.unit,
        };
        if (opts.lotCode) body['lot_code'] = opts.lotCode;
        if (opts.reference) body['reference'] = opts.reference;

        const invUrl = (this.ngsi as unknown as { orionUrl: string }).orionUrl
          .replace(':1026', ':8081').replace('orion-ld', 'inventory-service');
        const res = await fetch(`${invUrl}/commands/receive-material`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
        if (res.ok) {
          const data = await res.json() as { quantity_on_hand?: number; stock_move_id?: string };
          quantityOnHand = data.quantity_on_hand ?? opts.quantity;
          stockMoveId = data.stock_move_id ?? opts.mockSmId;
        }
      } catch { responseStatus = 503; }
      returnedEntities = [opts.mockBalance];
    } else {
      returnedEntities = opts.mockLot
        ? [opts.mockBalance, opts.mockLot]
        : [opts.mockBalance];
    }

    const durationMs = Date.now() - t0;

    // Highlight WH-STOCK zone
    this.hub.broadcast({
      eventType: 'entityChanged',
      entityId: opts.locationId,
      entityType: 'StockLocation',
      payload: { message: `Received ${opts.quantity} ${opts.unit}` },
    });

    const productCode = opts.productId.split(':').pop() ?? opts.productId;
    const lotNote = opts.lotCode ? `, lot ${opts.lotCode}` : '';
    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `Received ${opts.quantity} ${opts.unit} ${productCode} into WH-STOCK${lotNote} — quantityOnHand: ${quantityOnHand}`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `product: ${productCode}, qty: ${opts.quantity}${lotNote}`,
        responseStatus,
        responseSummary: `{ status: "done", quantity_on_hand: ${quantityOnHand} }`,
        durationMs,
      }],
      entities: returnedEntities,
    };
  }

}
