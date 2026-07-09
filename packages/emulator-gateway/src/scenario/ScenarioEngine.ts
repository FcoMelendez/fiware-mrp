import type { ClientHub } from '../stream/ClientHub.js';
import type { NgsiLdClient } from '../ngsi/NgsiLdClient.js';
import type { MockEntityStore } from './MockEntityStore.js';
import {
  MOCK_SCENE,
  MOCK_IB_PUMP_CASING,
  MOCK_IB_IMPELLER,
  MOCK_LOT_240001,
  MOCK_EXPLODE_RESULT,
  MOCK_MO_DRAFT,
  MOCK_MO_CONFIRMED,
  TUTORIAL_01_ENTITIES,
  TUTORIAL_01_STEPS,
  TUTORIAL_02_STEPS,
  TUTORIAL_03_ENTITIES,
  TUTORIAL_03_STEPS,
  TUTORIAL_04_ENTITIES,
  TUTORIAL_04_STEPS,
  TUTORIAL_05_ENTITIES,
  TUTORIAL_05_STEPS,
  TUTORIAL_06_ENTITIES,
  TUTORIAL_06_STEPS,
  TUTORIAL_07_ENTITIES,
  TUTORIAL_07_STEPS,
  TUTORIAL_08_ENTITIES,
  TUTORIAL_08_STEPS,
  TUTORIAL_09_ENTITIES,
  TUTORIAL_09_STEPS,
  TUTORIAL_10_ENTITIES,
  TUTORIAL_10_STEPS,
  TUTORIAL_11_ENTITIES,
  TUTORIAL_11_STEPS,
  MOCK_WO_ASSEMBLY,
  MOCK_WO_LEAK_TEST,
  MOCK_WO_PACKAGING,
  MOCK_WO_ASSEMBLY_IN_PROGRESS,
  MOCK_WO_ASSEMBLY_COMPLETED,
  MOCK_WO_LEAK_TEST_COMPLETED,
  MOCK_WO_PACKAGING_COMPLETED,
  MOCK_PE_ASSEMBLY_STARTED,
  MOCK_PE_ASSEMBLY_COMPLETED,
  MOCK_MO_COMPLETED,
  MOCK_SM_RECEIPT,
  MOCK_IB_FINISHED,
  MOCK_QC_LEAKTEST_FAIL,
  MOCK_RW_LEAKTEST,
  MOCK_QA_LEAKTEST,
  MOCK_DF_HP_P100_2024_08,
  MOCK_MPSL_HP_P100_SUGGESTED,
  MOCK_MPSL_HP_P100_CONFIRMED,
  MOCK_MS_WC_ASSEMBLY_FAULT,
  MOCK_MST_WC_ASSEMBLY_FAULT,
  MOCK_OA_JANE_DOE_CLOCKED_IN,
  MOCK_OA_JANE_DOE_CLOCKED_OUT,
  MOCK_OPERATOR_JANE_DOE,
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
    private readonly mockStore?: MockEntityStore,
    private readonly notifyUrl: string = 'http://emulator-gateway:8090/notify',
  ) {}

  // iot-simulator generates a unique OperatorAssignment ID per clock-in (unlike the
  // deterministic IDs every other service uses), so the real ID from a live clock-in
  // must be threaded through to the matching clock-out step rather than hardcoded.
  private lastAssignmentId: string | null = null;

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
      {
        id: 'tutorial-03',
        title: 'Tutorial 03 – Bill of Materials and BoM explosion',
        stepsCount: TUTORIAL_03_STEPS.length,
      },
      {
        id: 'tutorial-04',
        title: 'Tutorial 04 – Manufacturing order confirmation',
        stepsCount: TUTORIAL_04_STEPS.length,
      },
      {
        id: 'tutorial-05',
        title: 'Tutorial 05 – Component reservations and shortages',
        stepsCount: TUTORIAL_05_STEPS.length,
      },
      {
        id: 'tutorial-06',
        title: 'Tutorial 06 – Work orders and finite-capacity scheduling',
        stepsCount: TUTORIAL_06_STEPS.length,
      },
      {
        id: 'tutorial-07',
        title: 'Tutorial 07 – Shop-floor execution',
        stepsCount: TUTORIAL_07_STEPS.length,
      },
      {
        id: 'tutorial-08',
        title: 'Tutorial 08 – Finished goods receipt',
        stepsCount: TUTORIAL_08_STEPS.length,
      },
      {
        id: 'tutorial-09',
        title: 'Tutorial 09 – Quality, scrap and rework',
        stepsCount: TUTORIAL_09_STEPS.length,
      },
      {
        id: 'tutorial-10',
        title: 'Tutorial 10 – MPS-lite demand planning',
        stepsCount: TUTORIAL_10_STEPS.length,
      },
      {
        id: 'tutorial-11',
        title: 'Tutorial 11 – IoT/MES signals and subscriptions',
        stepsCount: TUTORIAL_11_STEPS.length,
      },
    ];
  }

  getSteps(tutorialId: string): GuidedStep[] {
    if (tutorialId === 'tutorial-01') return TUTORIAL_01_STEPS;
    if (tutorialId === 'tutorial-02') return TUTORIAL_02_STEPS;
    if (tutorialId === 'tutorial-03') return TUTORIAL_03_STEPS;
    if (tutorialId === 'tutorial-04') return TUTORIAL_04_STEPS;
    if (tutorialId === 'tutorial-05') return TUTORIAL_05_STEPS;
    if (tutorialId === 'tutorial-06') return TUTORIAL_06_STEPS;
    if (tutorialId === 'tutorial-07') return TUTORIAL_07_STEPS;
    if (tutorialId === 'tutorial-08') return TUTORIAL_08_STEPS;
    if (tutorialId === 'tutorial-09') return TUTORIAL_09_STEPS;
    if (tutorialId === 'tutorial-10') return TUTORIAL_10_STEPS;
    if (tutorialId === 'tutorial-11') return TUTORIAL_11_STEPS;
    throw new Error(`Unknown tutorial: ${tutorialId}`);
  }

  async executeStep(tutorialId: string, stepId: string): Promise<StepResult> {
    if (tutorialId === 'tutorial-01') return this.executeTutorial01Step(stepId);
    if (tutorialId === 'tutorial-02') return this.executeTutorial02Step(stepId);
    if (tutorialId === 'tutorial-03') return this.executeTutorial03Step(stepId);
    if (tutorialId === 'tutorial-04') return this.executeTutorial04Step(stepId);
    if (tutorialId === 'tutorial-05') return this.executeTutorial05Step(stepId);
    if (tutorialId === 'tutorial-06') return this.executeTutorial06Step(stepId);
    if (tutorialId === 'tutorial-07') return this.executeTutorial07Step(stepId);
    if (tutorialId === 'tutorial-08') return this.executeTutorial08Step(stepId);
    if (tutorialId === 'tutorial-09') return this.executeTutorial09Step(stepId);
    if (tutorialId === 'tutorial-10') return this.executeTutorial10Step(stepId);
    if (tutorialId === 'tutorial-11') return this.executeTutorial11Step(stepId);
    throw new Error(`Unknown tutorial: ${tutorialId}`);
  }

  async resetTutorial(tutorialId: string): Promise<{ deleted: number }> {
    let deleted = 0;

    if (this.mode === 'live') {
      deleted = await this.ngsi.deleteEntitiesByType([
        'Company', 'Plant', 'WorkCenter', 'Product', 'StockLocation',
        'InventoryBalance', 'StockMove', 'Lot',
        'BillOfMaterials', 'BillOfMaterialsLine',
        'ManufacturingOrder',
        'InventoryReservation',
        'WorkOrder',
        'ProductionEvent',
        'QualityCheck', 'ScrapEvent', 'ReworkOrder', 'QualityAlert',
        'DemandForecast', 'ReorderingRule', 'MasterProductionScheduleLine',
        'MachineSignal', 'MachineState', 'OperatorAssignment', 'Operator',
      ]);
    }

    // Broadcast an empty snapshot so the canvas resets to blank.
    // Entities only appear after the user explicitly runs the seed step.
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: { ...MOCK_SCENE, entities: [] } });

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.seedFrom([]);
    }

    return { deleted };
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

    const serviceNote = tutorialId === 'tutorial-02' || tutorialId === 'tutorial-05'
      ? ' (inventory-service, orion-ld)'
      : tutorialId === 'tutorial-06'
      ? ' (scheduler-service, orion-ld)'
      : tutorialId === 'tutorial-07'
      ? ' (shopfloor-service, orion-ld)'
      : tutorialId === 'tutorial-08'
      ? ' (finished-goods-service, orion-ld)'
      : tutorialId === 'tutorial-09'
      ? ' (quality-service, orion-ld)'
      : tutorialId === 'tutorial-10'
      ? ' (mps-service, orion-ld)'
      : tutorialId === 'tutorial-11'
      ? ' (iot-simulator, orion-ld)'
      : '';
    const summary = this.mode === 'mock'
      ? `Mock mode — all services considered healthy${serviceNote}`
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
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(TUTORIAL_01_ENTITIES as Array<Record<string, unknown>>);
    }

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
      const mockPool = [
        ...TUTORIAL_01_ENTITIES,
        MOCK_IB_PUMP_CASING, MOCK_IB_IMPELLER, MOCK_LOT_240001,
        ...TUTORIAL_03_ENTITIES,
        ...TUTORIAL_04_ENTITIES,
        ...TUTORIAL_05_ENTITIES,
        ...TUTORIAL_06_ENTITIES,
        ...TUTORIAL_07_ENTITIES,
        ...TUTORIAL_08_ENTITIES,
        ...TUTORIAL_09_ENTITIES,
        ...TUTORIAL_10_ENTITIES,
        ...TUTORIAL_11_ENTITIES,
      ];
      entities = singleId
        ? mockPool.filter((e) => (e as { id: string }).id === singleId)
        : mockPool.filter((e) => (e as { type: string }).type === type);
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

  // ── Tutorial 03 step handlers ──────────────────────────────────────────────

  private async executeTutorial03Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_03_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-03`);
    switch (stepId) {
      case 'check-bom-service': return this.stepStackHealth(step, 'tutorial-03');
      case 'seed-bom-data':     return this.stepSeedBomData(step);
      case 'query-boms':        return this.stepQueryEntities(step, 'BillOfMaterials');
      case 'query-bom-lines':   return this.stepQueryBomLines(step);
      case 'explode-bom':       return this.stepExplodeBom(step);
      case 'inspect-bom-entity': return this.stepQueryEntities(step, 'BillOfMaterials', 'urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1');
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepSeedBomData(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '17 entities upserted';
    const allEntities = [...TUTORIAL_01_ENTITIES, ...TUTORIAL_03_ENTITIES];

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = allEntities.map((e) => ({ ...e, '@context': contextUrl }));
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
        responseSummary = res.ok ? '17 entities upserted' : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;
    const snapshot = { ...MOCK_SCENE, entities: allEntities };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(allEntities as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — 12 T01 master-data + 1 BillOfMaterials + 4 BillOfMaterialsLine`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: '17 entities  •  application/ld+json',
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: allEntities,
    };
  }

  private async stepQueryBomLines(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let entities: unknown[];
    let responseStatus = 200;
    const bomId = 'urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1';

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const bomUrl = orionUrl.replace(':1026', ':8082').replace('orion-ld', 'bom-service');
        const res = await fetch(`${bomUrl}/boms/${encodeURIComponent(bomId)}/lines`, {
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
        entities = res.ok ? (await res.json() as unknown[]) : [];
      } catch { responseStatus = 503; entities = []; }
    } else {
      entities = TUTORIAL_03_ENTITIES.filter((e) => e.type === 'BillOfMaterialsLine');
    }

    const durationMs = Date.now() - t0;
    return {
      stepId: step.id,
      status: 'completed',
      result: `${entities.length} BillOfMaterialsLine entit${entities.length === 1 ? 'y' : 'ies'} returned`,
      apiTrace: [{ method: 'GET', url: step.hood.url, responseStatus, responseSummary: `${entities.length} lines`, durationMs }],
      entities,
    };
  }

  private async stepExplodeBom(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    let result = MOCK_EXPLODE_RESULT;

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const bomUrl = orionUrl.replace(':1026', ':8082').replace('orion-ld', 'bom-service');
        const res = await fetch(`${bomUrl}/commands/explode-bom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: 'urn:ngsi-ld:Product:HydraulicPump-P100', quantity: 10 }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
        if (res.ok) result = await res.json() as typeof MOCK_EXPLODE_RESULT;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;
    const sealKit = result.components.find((c) => c.component_code === 'SealKit');
    const summary = `Exploded BOM-HP-P100-v1 for 10 units → ${result.components.length} components (SealKit=${sealKit?.required_quantity ?? '?'} EA)`;

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: summary,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: '{ product_id: "urn:ngsi-ld:Product:HydraulicPump-P100", quantity: 10 }',
        responseStatus,
        responseSummary: `${result.components.length} components`,
        durationMs,
      }],
      entities: [result],
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

    // Track received entities in mock store
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(returnedEntities as Array<Record<string, unknown>>);
    }

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

  // ── Tutorial 04 step handlers ──────────────────────────────────────────────

  private async executeTutorial04Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_04_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-04`);
    switch (stepId) {
      case 'check-mfg-service':      return this.stepStackHealth(step, 'tutorial-04');
      case 'seed-mfg-data':          return this.stepSeedMfgData(step);
      case 'query-orders-draft':     return this.stepQueryMfgOrders(step, 'draft');
      case 'confirm-order':          return this.stepConfirmOrder(step);
      case 'query-orders-confirmed': return this.stepQueryMfgOrders(step, 'confirmed');
      case 'inspect-order':          return this.stepQueryEntities(step, 'ManufacturingOrder', MOCK_MO_CONFIRMED.id);
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepSeedMfgData(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '18 entities upserted';
    const allEntities = [...TUTORIAL_01_ENTITIES, ...TUTORIAL_03_ENTITIES, MOCK_MO_DRAFT];

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = allEntities.map((e) => ({ ...e, '@context': contextUrl }));
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
        responseSummary = res.ok ? '18 entities upserted' : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;
    // Broadcast all seeded entities so dashboard KPIs reflect the full context graph
    const snapshot = { ...MOCK_SCENE, entities: allEntities };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(allEntities as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — 12 T01 master-data + 5 T03 BoM entities + 1 ManufacturingOrder (draft)`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: '18 entities  •  application/ld+json',
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: [MOCK_MO_DRAFT],
    };
  }

  private async stepQueryMfgOrders(step: GuidedStep, state: string): Promise<StepResult> {
    const t0 = Date.now();
    let entities: unknown[];
    let responseStatus = 200;

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const mfgUrl = orionUrl.replace(':1026', ':8083').replace('orion-ld', 'manufacturing-service');
        const res = await fetch(`${mfgUrl}/manufacturing-orders?state=${state}`, {
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
        entities = res.ok ? (await res.json() as unknown[]) : [];
      } catch { responseStatus = 503; entities = []; }
    } else {
      entities = state === 'draft' ? [MOCK_MO_DRAFT] : [MOCK_MO_CONFIRMED];
    }

    const durationMs = Date.now() - t0;
    return {
      stepId: step.id,
      status: 'completed',
      result: `${entities.length} ManufacturingOrder entit${entities.length === 1 ? 'y' : 'ies'} with state=${state}`,
      apiTrace: [{ method: 'GET', url: step.hood.url, responseStatus, responseSummary: `${entities.length} orders`, durationMs }],
      entities,
    };
  }

  // ── Tutorial 05 step handlers ──────────────────────────────────────────────

  private async executeTutorial05Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_05_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-05`);
    switch (stepId) {
      case 'check-inventory-service-t05': return this.stepStackHealth(step, 'tutorial-05');
      case 'seed-t05-data':              return this.stepSeedT05Data(step);
      case 'query-inventory-t05':        return this.stepQueryEntities(step, 'InventoryBalance');
      case 'reserve-components':         return this.stepReserveComponents(step);
      case 'query-reservations':         return this.stepQueryEntities(step, 'InventoryReservation');
      case 'inspect-reservation':        return this.stepQueryEntities(
        step, 'InventoryReservation',
        'urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-ElectricMotor',
      );
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepSeedT05Data(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '24 entities upserted';

    // T05 seed: T01 (12) + T02 IBs (2) + T03 BoM (5) + T04 MO confirmed (1) + Lot (1) = 21 (+Lot=22 but
    // IB for impeller includes lot ref; seed file has 21 core entities)
    const t05SeedEntities = [
      ...TUTORIAL_01_ENTITIES,
      MOCK_IB_PUMP_CASING,
      MOCK_IB_IMPELLER,
      MOCK_LOT_240001,
      ...TUTORIAL_03_ENTITIES,
      MOCK_MO_CONFIRMED,
    ];

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = t05SeedEntities.map((e) => ({ ...e, '@context': contextUrl }));
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
        responseSummary = res.ok
          ? `${t05SeedEntities.length} entities upserted`
          : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;
    const snapshot = { ...MOCK_SCENE, entities: t05SeedEntities };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(t05SeedEntities as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — 12 T01 master-data + 2 T02 InventoryBalance + Lot + 5 T03 BoM + 1 T04 MO (confirmed)`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `${t05SeedEntities.length} entities  •  application/ld+json`,
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: t05SeedEntities,
    };
  }

  private async stepReserveComponents(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const orderId = MOCK_MO_CONFIRMED.id;
    const locationId = 'urn:ngsi-ld:StockLocation:WH-STOCK';

    const mockResult = {
      status: 'done',
      order_id: orderId,
      reservations_created: 4,
      summary: { reserved: 2, partial: 0, shortage: 2 },
      reservations: [
        { reservation_id: 'urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-PumpCasing', component_id: 'urn:ngsi-ld:Product:PumpCasing', required_quantity: 10, reserved_quantity: 10, shortage_quantity: 0, state: 'reserved' },
        { reservation_id: 'urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-Impeller', component_id: 'urn:ngsi-ld:Product:Impeller', required_quantity: 10, reserved_quantity: 10, shortage_quantity: 0, state: 'reserved' },
        { reservation_id: 'urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-ElectricMotor', component_id: 'urn:ngsi-ld:Product:ElectricMotor', required_quantity: 10, reserved_quantity: 0, shortage_quantity: 10, state: 'shortage' },
        { reservation_id: 'urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-SealKit', component_id: 'urn:ngsi-ld:Product:SealKit', required_quantity: 20, reserved_quantity: 0, shortage_quantity: 20, state: 'shortage' },
      ],
    };

    if (this.mode === 'live') {
      try {
        const invUrl = (this.ngsi as unknown as { orionUrl: string }).orionUrl
          .replace(':1026', ':8081').replace('orion-ld', 'inventory-service');
        const res = await fetch(`${invUrl}/commands/reserve-components`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, location_id: locationId }),
          signal: AbortSignal.timeout(15_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    // Highlight WH-STOCK zone
    this.hub.broadcast({
      eventType: 'entityChanged',
      entityId: locationId,
      entityType: 'StockLocation',
      payload: { message: '4 reservations created — 2 reserved, 2 shortage' },
    });

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(TUTORIAL_05_ENTITIES as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `4 InventoryReservation entities created — PumpCasing: reserved · Impeller: reserved · ElectricMotor: shortage · SealKit: shortage`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ order_id: "${orderId}", location_id: "WH-STOCK" }`,
        responseStatus,
        responseSummary: `{ reservations_created: 4, summary: { reserved: 2, shortage: 2 } }`,
        durationMs,
      }],
      entities: TUTORIAL_05_ENTITIES,
    };
  }

  // ── Tutorial 07 step handlers ──────────────────────────────────────────────

  private async executeTutorial07Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_07_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-07`);
    switch (stepId) {
      case 'check-shopfloor-service': return this.stepStackHealth(step, 'tutorial-07');
      case 'seed-t07-data':           return this.stepSeedT07Data(step);
      case 'start-work-order':        return this.stepStartWorkOrder(step);
      case 'query-work-orders-t07':   return this.stepQueryWorkOrdersT07(step);
      case 'complete-work-order':     return this.stepCompleteWorkOrder(step);
      case 'query-production-events': return this.stepQueryEntities(step, 'ProductionEvent');
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepSeedT07Data(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '28 entities upserted';

    // T07 seed = T06 seed (25) + 3 WorkOrders (planned)
    const t07SeedEntities = [
      ...TUTORIAL_01_ENTITIES,
      MOCK_IB_PUMP_CASING,
      MOCK_IB_IMPELLER,
      MOCK_LOT_240001,
      ...TUTORIAL_03_ENTITIES,
      MOCK_MO_CONFIRMED,
      ...TUTORIAL_05_ENTITIES,
      MOCK_WO_ASSEMBLY,
      MOCK_WO_LEAK_TEST,
      MOCK_WO_PACKAGING,
    ];

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = t07SeedEntities.map((e) => ({ ...e, '@context': contextUrl }));
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
        responseSummary = res.ok
          ? `${t07SeedEntities.length} entities upserted`
          : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;
    const snapshot = { ...MOCK_SCENE, entities: t07SeedEntities };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(t07SeedEntities as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — T06 state: 25 entities + 3 WorkOrders (Assembly/LeakTest/Packaging: planned)`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `${t07SeedEntities.length} entities  •  application/ld+json`,
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: t07SeedEntities,
    };
  }

  private async stepStartWorkOrder(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const woId = MOCK_WO_ASSEMBLY.id;
    const mockActualStart = '2024-07-01T08:05:00Z';

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const sfUrl = orionUrl.replace(':1026', ':8085').replace('orion-ld', 'shopfloor-service');
        const res = await fetch(`${sfUrl}/commands/start-work-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ work_order_id: woId }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    this.hub.broadcast({
      eventType: 'entityChanged',
      entityId: 'urn:ngsi-ld:WorkCenter:WC-Assembly',
      entityType: 'WorkCenter',
      payload: { message: 'Assembly work order started — state: in_progress' },
    });

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.patchAttrs(woId, {
        state: { type: 'Property', value: 'in_progress' },
        actualStart: { type: 'Property', value: mockActualStart },
      });
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `Assembly WorkOrder started — state: planned → in_progress, actualStart: ${mockActualStart}`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ work_order_id: "${woId}" }`,
        responseStatus,
        responseSummary: `{ status: "done", state: "in_progress", actual_start: "${mockActualStart}" }`,
        durationMs,
      }],
      entities: [MOCK_WO_ASSEMBLY_IN_PROGRESS],
    };
  }

  private async stepQueryWorkOrdersT07(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let entities: unknown[];
    let responseStatus = 200;

    if (this.mode === 'live') {
      entities = await this.ngsi.queryEntities(['WorkOrder']);
      if (entities.length === 0) responseStatus = 404;
    } else {
      // Show post-start state: Assembly=in_progress, others=planned
      entities = [MOCK_WO_ASSEMBLY_IN_PROGRESS, MOCK_WO_LEAK_TEST, MOCK_WO_PACKAGING];
    }

    const durationMs = Date.now() - t0;
    return {
      stepId: step.id,
      status: 'completed',
      result: `3 WorkOrder entities — Assembly: in_progress · LeakTest: planned · Packaging: planned`,
      apiTrace: [{ method: 'GET', url: step.hood.url, responseStatus, responseSummary: `${entities.length} entities`, durationMs }],
      entities,
    };
  }

  private async stepCompleteWorkOrder(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const woId = MOCK_WO_ASSEMBLY.id;
    const mockActualEnd = '2024-07-01T18:05:00Z';

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const sfUrl = orionUrl.replace(':1026', ':8085').replace('orion-ld', 'shopfloor-service');
        const res = await fetch(`${sfUrl}/commands/complete-work-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ work_order_id: woId, quantity_produced: 10 }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    this.hub.broadcast({
      eventType: 'entityChanged',
      entityId: 'urn:ngsi-ld:WorkCenter:WC-Assembly',
      entityType: 'WorkCenter',
      payload: { message: 'Assembly work order completed — ProductionEvent created' },
    });

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.patchAttrs(woId, {
        state:     { type: 'Property', value: 'completed' },
        actualEnd: { type: 'Property', value: mockActualEnd },
      });
      this.mockStore.upsertMany([MOCK_PE_ASSEMBLY_COMPLETED as Record<string, unknown>]);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `Assembly WorkOrder completed — state: in_progress → completed, ProductionEvent created (10 EA produced)`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ work_order_id: "${woId}", quantity_produced: 10 }`,
        responseStatus,
        responseSummary: `{ status: "done", state: "completed", actual_end: "${mockActualEnd}" }`,
        durationMs,
      }],
      entities: [MOCK_PE_ASSEMBLY_COMPLETED],
    };
  }

  // ── Tutorial 08 step handlers ──────────────────────────────────────────────

  private async executeTutorial08Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_08_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-08`);
    switch (stepId) {
      case 'check-finished-goods-service': return this.stepStackHealth(step, 'tutorial-08');
      case 'seed-t08-data':                return this.stepSeedT08Data(step);
      case 'query-work-orders-t08':         return this.stepQueryWorkOrdersT08(step);
      case 'receive-finished-goods':        return this.stepReceiveFinishedGoods(step);
      case 'query-manufacturing-order-t08': return this.stepQueryEntities(step, 'ManufacturingOrder', MOCK_MO_COMPLETED.id);
      case 'query-stock-moves':             return this.stepQueryEntities(step, 'StockMove');
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepSeedT08Data(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '30 entities upserted';

    // T08 seed = T07 seed (28) but WorkOrders completed, + 2 ProductionEvents (started + completed)
    const t08SeedEntities = [
      ...TUTORIAL_01_ENTITIES,
      MOCK_IB_PUMP_CASING,
      MOCK_IB_IMPELLER,
      MOCK_LOT_240001,
      ...TUTORIAL_03_ENTITIES,
      MOCK_MO_CONFIRMED,
      ...TUTORIAL_05_ENTITIES,
      MOCK_WO_ASSEMBLY_COMPLETED,
      MOCK_WO_LEAK_TEST_COMPLETED,
      MOCK_WO_PACKAGING_COMPLETED,
      MOCK_PE_ASSEMBLY_STARTED,
      MOCK_PE_ASSEMBLY_COMPLETED,
    ];

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = t08SeedEntities.map((e) => ({ ...e, '@context': contextUrl }));
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
        responseSummary = res.ok
          ? `${t08SeedEntities.length} entities upserted`
          : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;
    const snapshot = { ...MOCK_SCENE, entities: t08SeedEntities };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(t08SeedEntities as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — T07 state: 28 entities + 3 WorkOrders (completed) + 2 ProductionEvents`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `${t08SeedEntities.length} entities  •  application/ld+json`,
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: t08SeedEntities,
    };
  }

  private async stepQueryWorkOrdersT08(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let entities: unknown[];
    let responseStatus = 200;

    if (this.mode === 'live') {
      entities = await this.ngsi.queryEntities(['WorkOrder']);
      if (entities.length === 0) responseStatus = 404;
    } else {
      entities = [MOCK_WO_ASSEMBLY_COMPLETED, MOCK_WO_LEAK_TEST_COMPLETED, MOCK_WO_PACKAGING_COMPLETED];
    }

    const durationMs = Date.now() - t0;
    return {
      stepId: step.id,
      status: 'completed',
      result: `3 WorkOrder entities — Assembly, LeakTest, Packaging: all completed`,
      apiTrace: [{ method: 'GET', url: step.hood.url, responseStatus, responseSummary: `${entities.length} entities`, durationMs }],
      entities,
    };
  }

  private async stepReceiveFinishedGoods(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const moId = MOCK_MO_CONFIRMED.id;
    const mockCompletedAt = '2024-07-02T01:25:00Z';

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const fgUrl = orionUrl.replace(':1026', ':8086').replace('orion-ld', 'finished-goods-service');
        const res = await fetch(`${fgUrl}/commands/receive-finished-goods`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manufacturing_order_id: moId }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    this.hub.broadcast({
      eventType: 'entityChanged',
      entityId: 'urn:ngsi-ld:StockLocation:WH-FINISHED',
      entityType: 'StockLocation',
      payload: { message: 'MO-2024-001 received — 10 EA HydraulicPump-P100 into WH-FINISHED' },
    });

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.patchAttrs(moId, {
        state:       { type: 'Property', value: 'completed' },
        completedAt: { type: 'Property', value: mockCompletedAt },
      });
      this.mockStore.upsertMany([
        MOCK_SM_RECEIPT as Record<string, unknown>,
        MOCK_IB_FINISHED as Record<string, unknown>,
      ]);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `ManufacturingOrder MO-2024-001 completed — StockMove receipt created, InventoryBalance updated (10 EA)`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ manufacturing_order_id: "${moId}" }`,
        responseStatus,
        responseSummary: `{ status: "done", quantity_received: 10, stock_move_id: "${MOCK_SM_RECEIPT.id}" }`,
        durationMs,
      }],
      entities: [MOCK_SM_RECEIPT, MOCK_IB_FINISHED],
    };
  }

  // ── Tutorial 09 step handlers ──────────────────────────────────────────────

  private async executeTutorial09Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_09_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-09`);
    switch (stepId) {
      case 'check-quality-service': return this.stepStackHealth(step, 'tutorial-09');
      case 'seed-t09-data':         return this.stepSeedT09Data(step);
      case 'inspect-work-order':    return this.stepInspectWorkOrder(step);
      case 'query-quality-checks':  return this.stepQueryEntities(step, 'QualityCheck');
      case 'query-rework-orders':   return this.stepQueryEntities(step, 'ReworkOrder');
      case 'query-quality-alerts':  return this.stepQueryEntities(step, 'QualityAlert');
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepSeedT09Data(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '30 entities upserted';

    // T09 seed = T08 seed unchanged (30 entities) — quality entities are created live
    const t09SeedEntities = [
      ...TUTORIAL_01_ENTITIES,
      MOCK_IB_PUMP_CASING,
      MOCK_IB_IMPELLER,
      MOCK_LOT_240001,
      ...TUTORIAL_03_ENTITIES,
      MOCK_MO_CONFIRMED,
      ...TUTORIAL_05_ENTITIES,
      MOCK_WO_ASSEMBLY_COMPLETED,
      MOCK_WO_LEAK_TEST_COMPLETED,
      MOCK_WO_PACKAGING_COMPLETED,
      MOCK_PE_ASSEMBLY_STARTED,
      MOCK_PE_ASSEMBLY_COMPLETED,
    ];

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = t09SeedEntities.map((e) => ({ ...e, '@context': contextUrl }));
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
        responseSummary = res.ok
          ? `${t09SeedEntities.length} entities upserted`
          : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;
    const snapshot = { ...MOCK_SCENE, entities: t09SeedEntities };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(t09SeedEntities as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — T08 state unchanged: 30 entities, 3 WorkOrders completed`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `${t09SeedEntities.length} entities  •  application/ld+json`,
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: t09SeedEntities,
    };
  }

  private async stepInspectWorkOrder(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const woId = MOCK_WO_LEAK_TEST.id;

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const qsUrl = orionUrl.replace(':1026', ':8087').replace('orion-ld', 'quality-service');
        const res = await fetch(`${qsUrl}/commands/inspect-work-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            work_order_id: woId,
            check_type: 'leak_test',
            expected_value: 0,
            actual_value: 0.2,
            tolerance: 0.1,
            quantity_inspected: 10,
            quantity_failed: 2,
            disposition: 'rework',
            reason_code: 'seal_leak',
          }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    this.hub.broadcast({
      eventType: 'entityChanged',
      entityId: 'urn:ngsi-ld:WorkCenter:WC-LeakTest',
      entityType: 'WorkCenter',
      payload: { message: 'LeakTest inspection: 2 of 10 units failed — routed to rework' },
    });

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany([
        MOCK_QC_LEAKTEST_FAIL as Record<string, unknown>,
        MOCK_RW_LEAKTEST as Record<string, unknown>,
        MOCK_QA_LEAKTEST as Record<string, unknown>,
      ]);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `LeakTest inspected — result: fail, 2 EA routed to rework, QualityAlert raised (severity: high)`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ work_order_id: "${woId}", check_type: "leak_test", quantity_failed: 2, disposition: "rework" }`,
        responseStatus,
        responseSummary: `{ status: "done", result: "fail", rework_order_id: "${MOCK_RW_LEAKTEST.id}", quality_alert_id: "${MOCK_QA_LEAKTEST.id}" }`,
        durationMs,
      }],
      entities: [MOCK_QC_LEAKTEST_FAIL, MOCK_RW_LEAKTEST, MOCK_QA_LEAKTEST],
    };
  }

  // ── Tutorial 10 step handlers ──────────────────────────────────────────────

  private async executeTutorial10Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_10_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-10`);
    switch (stepId) {
      case 'check-mps-service': return this.stepStackHealth(step, 'tutorial-10');
      case 'seed-t10-data':     return this.stepSeedT10Data(step);
      case 'generate-mps':      return this.stepGenerateMps(step);
      case 'query-mps-lines':   return this.stepQueryEntities(step, 'MasterProductionScheduleLine');
      case 'confirm-mps-line':  return this.stepConfirmMpsLine(step);
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepSeedT10Data(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '33 entities upserted';

    // T10 seed = T09 seed (30) + IB (5 EA) + DemandForecast (12 EA) + ReorderingRule
    const t10SeedEntities = [
      ...TUTORIAL_01_ENTITIES,
      MOCK_IB_PUMP_CASING,
      MOCK_IB_IMPELLER,
      MOCK_LOT_240001,
      ...TUTORIAL_03_ENTITIES,
      MOCK_MO_CONFIRMED,
      ...TUTORIAL_05_ENTITIES,
      MOCK_WO_ASSEMBLY_COMPLETED,
      MOCK_WO_LEAK_TEST_COMPLETED,
      MOCK_WO_PACKAGING_COMPLETED,
      MOCK_PE_ASSEMBLY_STARTED,
      MOCK_PE_ASSEMBLY_COMPLETED,
      ...TUTORIAL_10_ENTITIES,
    ];

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = t10SeedEntities.map((e) => ({ ...e, '@context': contextUrl }));
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
        responseSummary = res.ok
          ? `${t10SeedEntities.length} entities upserted`
          : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;
    const snapshot = { ...MOCK_SCENE, entities: t10SeedEntities };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(t10SeedEntities as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — T09 state: 30 entities + InventoryBalance (5 EA) + DemandForecast (12 EA) + ReorderingRule`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `${t10SeedEntities.length} entities  •  application/ld+json`,
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: t10SeedEntities,
    };
  }

  private async stepGenerateMps(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const dfId = MOCK_DF_HP_P100_2024_08.id;

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const mpsUrl = orionUrl.replace(':1026', ':8088').replace('orion-ld', 'mps-service');
        const res = await fetch(`${mpsUrl}/commands/generate-mps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ demand_forecast_id: dfId }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    this.hub.broadcast({
      eventType: 'entityChanged',
      entityId: 'urn:ngsi-ld:StockLocation:WH-FINISHED',
      entityType: 'StockLocation',
      payload: { message: 'MPS generated: projected -7 EA vs. safety stock 3 EA → suggest 10 EA' },
    });

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany([MOCK_MPSL_HP_P100_SUGGESTED as Record<string, unknown>]);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `MPS line generated — projectedInventory: -7 EA, suggestedProductionQuantity: 10 EA`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ demand_forecast_id: "${dfId}" }`,
        responseStatus,
        responseSummary: `{ status: "done", projected_inventory: -7, suggested_production_quantity: 10 }`,
        durationMs,
      }],
      entities: [MOCK_MPSL_HP_P100_SUGGESTED],
    };
  }

  private async stepConfirmMpsLine(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const mpslId = MOCK_MPSL_HP_P100_SUGGESTED.id;

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const mpsUrl = orionUrl.replace(':1026', ':8088').replace('orion-ld', 'mps-service');
        const res = await fetch(`${mpsUrl}/commands/confirm-mps-line`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mps_line_id: mpslId }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.patchAttrs(mpslId, {
        state: { type: 'Property', value: 'confirmed' },
        confirmedProductionQuantity: { type: 'Property', value: 10, unitCode: 'EA' },
      });
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `MPS line confirmed — state: suggested → confirmed, confirmedProductionQuantity: 10 EA`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ mps_line_id: "${mpslId}" }`,
        responseStatus,
        responseSummary: `{ status: "done", state: "confirmed", confirmed_production_quantity: 10 }`,
        durationMs,
      }],
      entities: [MOCK_MPSL_HP_P100_CONFIRMED],
    };
  }

  // ── Tutorial 11 step handlers ──────────────────────────────────────────────

  private async executeTutorial11Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_11_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-11`);
    switch (stepId) {
      case 'check-iot-simulator':   return this.stepStackHealth(step, 'tutorial-11');
      case 'seed-t11-data':         return this.stepSeedT11Data(step);
      case 'register-subscription': return this.stepRegisterSubscription(step);
      case 'emit-signal':           return this.stepEmitSignal(step);
      case 'clock-in-operator':     return this.stepClockInOperator(step);
      case 'clock-out-operator':    return this.stepClockOutOperator(step);
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepSeedT11Data(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '34 entities upserted';

    // T11 seed = T10 seed (33) + 1 Operator
    const t11SeedEntities = [
      ...TUTORIAL_01_ENTITIES,
      MOCK_IB_PUMP_CASING,
      MOCK_IB_IMPELLER,
      MOCK_LOT_240001,
      ...TUTORIAL_03_ENTITIES,
      MOCK_MO_CONFIRMED,
      ...TUTORIAL_05_ENTITIES,
      MOCK_WO_ASSEMBLY_COMPLETED,
      MOCK_WO_LEAK_TEST_COMPLETED,
      MOCK_WO_PACKAGING_COMPLETED,
      MOCK_PE_ASSEMBLY_STARTED,
      MOCK_PE_ASSEMBLY_COMPLETED,
      ...TUTORIAL_10_ENTITIES,
      ...TUTORIAL_11_ENTITIES,
    ];

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = t11SeedEntities.map((e) => ({ ...e, '@context': contextUrl }));
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
        responseSummary = res.ok
          ? `${t11SeedEntities.length} entities upserted`
          : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;
    const snapshot = { ...MOCK_SCENE, entities: t11SeedEntities };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(t11SeedEntities as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — T10 state: 33 entities + 1 Operator (Jane Doe, active)`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `${t11SeedEntities.length} entities  •  application/ld+json`,
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: t11SeedEntities,
    };
  }

  private async stepRegisterSubscription(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let subscriptionId: string | null = null;

    if (this.mode === 'live') {
      subscriptionId = await this.ngsi.createSubscription({
        type: 'Subscription',
        entities: [{ type: 'MachineState' }],
        notification: {
          endpoint: { uri: this.notifyUrl, accept: 'application/json' },
        },
      });
      responseStatus = subscriptionId ? 201 : 502;
    }

    const durationMs = Date.now() - t0;

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: this.mode === 'live'
        ? `Subscription registered${subscriptionId ? ` (${subscriptionId})` : ''} — Orion-LD will now push MachineState changes to ${this.notifyUrl}`
        : 'Mock mode — subscription registration simulated (no real Orion-LD to subscribe to)',
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: 'entities: [{ type: "MachineState" }]',
        responseStatus,
        responseSummary: subscriptionId ? `{ id: "${subscriptionId}" }` : '{ status: "simulated" }',
        durationMs,
      }],
    };
  }

  private async stepEmitSignal(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const wcId = 'urn:ngsi-ld:WorkCenter:WC-Assembly';

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const iotUrl = orionUrl.replace(':1026', ':8089').replace('orion-ld', 'iot-simulator');
        const res = await fetch(`${iotUrl}/commands/emit-signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            work_center_id: wcId,
            signal_type: 'temperature',
            actual_value: 92,
            unit_code: 'CEL',
            quality: 'bad',
          }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    // In live mode this broadcast is redundant with the real subscription push (which
    // arrives asynchronously via /notify) — kept so mock mode gets the same UX.
    this.hub.broadcast({
      eventType: 'entityChanged',
      entityId: wcId,
      entityType: 'WorkCenter',
      payload: { message: 'MachineState → fault (92°C, quality: bad)' },
    });

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany([
        MOCK_MS_WC_ASSEMBLY_FAULT as Record<string, unknown>,
        MOCK_MST_WC_ASSEMBLY_FAULT as Record<string, unknown>,
      ]);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `MachineSignal recorded (92°C, quality: bad) — MachineState derived: fault`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ work_center_id: "${wcId}", signal_type: "temperature", actual_value: 92, quality: "bad" }`,
        responseStatus,
        responseSummary: `{ status: "done", state: "fault" }`,
        durationMs,
      }],
      entities: [MOCK_MS_WC_ASSEMBLY_FAULT, MOCK_MST_WC_ASSEMBLY_FAULT],
    };
  }

  private async stepClockInOperator(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const operatorId = MOCK_OPERATOR_JANE_DOE.id;
    const wcId = 'urn:ngsi-ld:WorkCenter:WC-Assembly';

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const iotUrl = orionUrl.replace(':1026', ':8089').replace('orion-ld', 'iot-simulator');
        const res = await fetch(`${iotUrl}/commands/clock-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operator_id: operatorId, work_center_id: wcId }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
        if (res.ok) {
          const data = await res.json() as { assignment_id?: string };
          this.lastAssignmentId = data.assignment_id ?? null;
        }
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany([MOCK_OA_JANE_DOE_CLOCKED_IN as Record<string, unknown>]);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `Jane Doe clocked in at WC-Assembly`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ operator_id: "${operatorId}", work_center_id: "${wcId}" }`,
        responseStatus,
        responseSummary: `{ status: "done", timer_status: "clocked_in" }`,
        durationMs,
      }],
      entities: [MOCK_OA_JANE_DOE_CLOCKED_IN],
    };
  }

  private async stepClockOutOperator(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    // Live mode: use the real ID captured from clock-in (iot-simulator generates a
    // unique suffix per call, unlike every other service's deterministic IDs).
    const assignmentId = (this.mode === 'live' && this.lastAssignmentId)
      ? this.lastAssignmentId
      : MOCK_OA_JANE_DOE_CLOCKED_IN.id;

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const iotUrl = orionUrl.replace(':1026', ':8089').replace('orion-ld', 'iot-simulator');
        const res = await fetch(`${iotUrl}/commands/clock-out`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignment_id: assignmentId }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany([MOCK_OA_JANE_DOE_CLOCKED_OUT as Record<string, unknown>]);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `Jane Doe clocked out — actualDuration: 8.0 hours`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ assignment_id: "${assignmentId}" }`,
        responseStatus,
        responseSummary: `{ status: "done", timer_status: "clocked_out", actual_duration_hours: 8.0 }`,
        durationMs,
      }],
      entities: [MOCK_OA_JANE_DOE_CLOCKED_OUT],
    };
  }

  // ── Tutorial 06 step handlers ──────────────────────────────────────────────

  private async executeTutorial06Step(stepId: string): Promise<StepResult> {
    const step = TUTORIAL_06_STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error(`Unknown step: ${stepId} in tutorial-06`);
    switch (stepId) {
      case 'check-scheduler-service': return this.stepStackHealth(step, 'tutorial-06');
      case 'seed-t06-data':           return this.stepSeedT06Data(step);
      case 'query-confirmed-mo':      return this.stepQueryEntities(step, 'ManufacturingOrder', MOCK_WO_ASSEMBLY.manufacturingOrder.object);
      case 'create-work-orders':      return this.stepCreateWorkOrders(step);
      case 'query-work-orders':       return this.stepQueryEntities(step, 'WorkOrder');
      case 'inspect-work-order':      return this.stepQueryEntities(step, 'WorkOrder', MOCK_WO_ASSEMBLY.id);
      default: throw new Error(`No executor for step: ${stepId}`);
    }
  }

  private async stepSeedT06Data(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 201;
    let responseSummary = '25 entities upserted';

    // T06 seed = T05 seed (21) + 4 InventoryReservations (reserved/shortage state)
    const t06SeedEntities = [
      ...TUTORIAL_01_ENTITIES,
      MOCK_IB_PUMP_CASING,
      MOCK_IB_IMPELLER,
      MOCK_LOT_240001,
      ...TUTORIAL_03_ENTITIES,
      MOCK_MO_CONFIRMED,
      ...TUTORIAL_05_ENTITIES,
    ];

    if (this.mode === 'live') {
      try {
        const { orionUrl, contextUrl } = this.ngsi as unknown as { orionUrl: string; contextUrl: string };
        const withContext = t06SeedEntities.map((e) => ({ ...e, '@context': contextUrl }));
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
        responseSummary = res.ok
          ? `${t06SeedEntities.length} entities upserted`
          : `Error: ${res.status}`;
      } catch (err) {
        responseStatus = 503;
        responseSummary = err instanceof Error ? err.message : 'Broker unreachable';
      }
    }

    const durationMs = Date.now() - t0;
    const snapshot = { ...MOCK_SCENE, entities: t06SeedEntities };
    this.hub.broadcast({ eventType: 'contextSnapshot', payload: snapshot });
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(t06SeedEntities as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `${responseSummary} — T05 state: 12 T01 + 2 IB + Lot + 5 BoM + 1 MO (confirmed) + 4 InventoryReservations`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `${t06SeedEntities.length} entities  •  application/ld+json`,
        responseStatus,
        responseSummary,
        durationMs,
      }],
      entities: t06SeedEntities,
    };
  }

  private async stepCreateWorkOrders(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const orderId = MOCK_WO_ASSEMBLY.manufacturingOrder.object;
    const plannedStart = '2024-07-01T08:00:00Z';

    const mockResult = {
      status: 'done',
      order_id: orderId,
      work_orders_created: 3,
      work_orders: [
        { work_order_id: MOCK_WO_ASSEMBLY.id, operation: 'Assembly', sequence: 1, work_center_id: 'urn:ngsi-ld:WorkCenter:WC-Assembly', planned_start: '2024-07-01T08:00:00Z', planned_end: '2024-07-01T18:00:00Z', duration_hours: 10.0, state: 'planned' },
        { work_order_id: MOCK_WO_LEAK_TEST.id, operation: 'LeakTest', sequence: 2, work_center_id: 'urn:ngsi-ld:WorkCenter:WC-LeakTest', planned_start: '2024-07-01T18:00:00Z', planned_end: '2024-07-01T23:00:00Z', duration_hours: 5.0, state: 'planned' },
        { work_order_id: MOCK_WO_PACKAGING.id, operation: 'Packaging', sequence: 3, work_center_id: 'urn:ngsi-ld:WorkCenter:WC-Packaging', planned_start: '2024-07-01T23:00:00Z', planned_end: '2024-07-02T01:30:00Z', duration_hours: 2.5, state: 'planned' },
      ],
    };

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const schedulerUrl = orionUrl.replace(':1026', ':8084').replace('orion-ld', 'scheduler-service');
        const res = await fetch(`${schedulerUrl}/commands/create-work-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, planned_start: plannedStart }),
          signal: AbortSignal.timeout(15_000),
        });
        responseStatus = res.status;
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    // Highlight all three work center zones
    for (const wc of ['WC-Assembly', 'WC-LeakTest', 'WC-Packaging']) {
      this.hub.broadcast({
        eventType: 'entityChanged',
        entityId: `urn:ngsi-ld:WorkCenter:${wc}`,
        entityType: 'WorkCenter',
        payload: { message: 'WorkOrder scheduled — state: planned' },
      });
    }

    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.upsertMany(TUTORIAL_06_ENTITIES as Array<Record<string, unknown>>);
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `3 WorkOrder entities created — Assembly: 10h · LeakTest: 5h · Packaging: 2.5h (all state: planned)`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ order_id: "${orderId}", planned_start: "${plannedStart}" }`,
        responseStatus,
        responseSummary: JSON.stringify({ status: 'done', work_orders_created: 3 }),
        durationMs,
      }],
      entities: TUTORIAL_06_ENTITIES,
    };
  }

  private async stepConfirmOrder(step: GuidedStep): Promise<StepResult> {
    const t0 = Date.now();
    let responseStatus = 200;
    const orderId = MOCK_MO_DRAFT.id;
    let confirmedAt = '2024-07-01T07:45:00Z';

    if (this.mode === 'live') {
      try {
        const { orionUrl } = this.ngsi as unknown as { orionUrl: string };
        const mfgUrl = orionUrl.replace(':1026', ':8083').replace('orion-ld', 'manufacturing-service');
        const res = await fetch(`${mfgUrl}/commands/confirm-manufacturing-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId }),
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
        if (res.ok) {
          const data = await res.json() as { confirmed_at?: string };
          confirmedAt = data.confirmed_at ?? confirmedAt;
        }
      } catch { responseStatus = 503; }
    }

    const durationMs = Date.now() - t0;

    // Highlight WC-Assembly zone — the confirmed order targets the assembly work center
    this.hub.broadcast({
      eventType: 'entityChanged',
      entityId: 'urn:ngsi-ld:WorkCenter:WC-Assembly',
      entityType: 'WorkCenter',
      payload: { message: 'ManufacturingOrder MO-2024-001 confirmed — assembly scheduled' },
    });

    // Patch the mock store to reflect the confirmed state
    if (this.mode === 'mock' && this.mockStore) {
      this.mockStore.patchAttrs(orderId, {
        state: { type: 'Property', value: 'confirmed' },
        confirmedAt: { type: 'Property', value: confirmedAt },
      });
    }

    return {
      stepId: step.id,
      status: responseStatus < 300 ? 'completed' : 'failed',
      result: `ManufacturingOrder MO-2024-001 confirmed — state: draft → confirmed, confirmedAt: ${confirmedAt}`,
      apiTrace: [{
        method: 'POST',
        url: step.hood.url,
        requestSummary: `{ order_id: "${orderId}" }`,
        responseStatus,
        responseSummary: `{ status: "confirmed", confirmed_at: "${confirmedAt}" }`,
        durationMs,
      }],
      entities: [MOCK_MO_CONFIRMED],
    };
  }

}
