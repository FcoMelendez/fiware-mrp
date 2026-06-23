import type { SceneSnapshot, TutorialStep } from '../types.js';

// ── Tutorial 01 entities (mirrors services/seed-loader/data/tutorial-01.json) ──

export const TUTORIAL_01_ENTITIES = [
  {
    id: 'urn:ngsi-ld:Company:HydraulicPartsCo',
    type: 'Company',
    name: { type: 'Property', value: 'Hydraulic Parts Co.' },
    companyCode: { type: 'Property', value: 'HPC' },
    state: { type: 'Property', value: 'active' },
  },
  {
    id: 'urn:ngsi-ld:Plant:Plant-BCN',
    type: 'Plant',
    name: { type: 'Property', value: 'Barcelona Plant' },
    plantCode: { type: 'Property', value: 'BCN' },
    timezone: { type: 'Property', value: 'Europe/Madrid' },
    state: { type: 'Property', value: 'active' },
    ownedBy: { type: 'Relationship', object: 'urn:ngsi-ld:Company:HydraulicPartsCo' },
  },
  {
    id: 'urn:ngsi-ld:WorkCenter:WC-Assembly',
    type: 'WorkCenter',
    name: { type: 'Property', value: 'Assembly' },
    code: { type: 'Property', value: 'WC-ASM' },
    state: { type: 'Property', value: 'active' },
    capacity: { type: 'Property', value: 1 },
    timeEfficiency: { type: 'Property', value: 0.85 },
    costPerHour: { type: 'Property', value: 45.0 },
    oeeTarget: { type: 'Property', value: 0.80 },
    locatedIn: { type: 'Relationship', object: 'urn:ngsi-ld:Plant:Plant-BCN' },
  },
  {
    id: 'urn:ngsi-ld:WorkCenter:WC-LeakTest',
    type: 'WorkCenter',
    name: { type: 'Property', value: 'Leak Test Bench' },
    code: { type: 'Property', value: 'WC-LTB' },
    state: { type: 'Property', value: 'active' },
    capacity: { type: 'Property', value: 1 },
    timeEfficiency: { type: 'Property', value: 0.90 },
    costPerHour: { type: 'Property', value: 30.0 },
    oeeTarget: { type: 'Property', value: 0.85 },
    locatedIn: { type: 'Relationship', object: 'urn:ngsi-ld:Plant:Plant-BCN' },
  },
  {
    id: 'urn:ngsi-ld:WorkCenter:WC-Packaging',
    type: 'WorkCenter',
    name: { type: 'Property', value: 'Packaging' },
    code: { type: 'Property', value: 'WC-PKG' },
    state: { type: 'Property', value: 'active' },
    capacity: { type: 'Property', value: 2 },
    timeEfficiency: { type: 'Property', value: 0.95 },
    costPerHour: { type: 'Property', value: 20.0 },
    oeeTarget: { type: 'Property', value: 0.90 },
    locatedIn: { type: 'Relationship', object: 'urn:ngsi-ld:Plant:Plant-BCN' },
  },
  {
    id: 'urn:ngsi-ld:Product:HydraulicPump-P100',
    type: 'Product',
    name: { type: 'Property', value: 'Hydraulic Pump P100' },
    sku: { type: 'Property', value: 'HP-P100' },
    productType: { type: 'Property', value: 'manufactured' },
    trackingPolicy: { type: 'Property', value: 'lot' },
    standardCost: { type: 'Property', value: 250.0 },
    active: { type: 'Property', value: true },
    company: { type: 'Relationship', object: 'urn:ngsi-ld:Company:HydraulicPartsCo' },
  },
  {
    id: 'urn:ngsi-ld:Product:PumpCasing',
    type: 'Product',
    name: { type: 'Property', value: 'Pump Casing' },
    sku: { type: 'Property', value: 'PC-001' },
    productType: { type: 'Property', value: 'purchased' },
    trackingPolicy: { type: 'Property', value: 'lot' },
    standardCost: { type: 'Property', value: 80.0 },
    active: { type: 'Property', value: true },
    company: { type: 'Relationship', object: 'urn:ngsi-ld:Company:HydraulicPartsCo' },
  },
  {
    id: 'urn:ngsi-ld:Product:Impeller',
    type: 'Product',
    name: { type: 'Property', value: 'Impeller' },
    sku: { type: 'Property', value: 'IMP-001' },
    productType: { type: 'Property', value: 'purchased' },
    trackingPolicy: { type: 'Property', value: 'lot' },
    standardCost: { type: 'Property', value: 45.0 },
    active: { type: 'Property', value: true },
    company: { type: 'Relationship', object: 'urn:ngsi-ld:Company:HydraulicPartsCo' },
  },
  {
    id: 'urn:ngsi-ld:Product:ElectricMotor',
    type: 'Product',
    name: { type: 'Property', value: 'Electric Motor 2.2kW' },
    sku: { type: 'Property', value: 'EM-2200' },
    productType: { type: 'Property', value: 'purchased' },
    trackingPolicy: { type: 'Property', value: 'serial' },
    standardCost: { type: 'Property', value: 95.0 },
    active: { type: 'Property', value: true },
    company: { type: 'Relationship', object: 'urn:ngsi-ld:Company:HydraulicPartsCo' },
  },
  {
    id: 'urn:ngsi-ld:Product:SealKit',
    type: 'Product',
    name: { type: 'Property', value: 'Seal Kit P100' },
    sku: { type: 'Property', value: 'SK-P100' },
    productType: { type: 'Property', value: 'purchased' },
    trackingPolicy: { type: 'Property', value: 'none' },
    standardCost: { type: 'Property', value: 12.0 },
    active: { type: 'Property', value: true },
    company: { type: 'Relationship', object: 'urn:ngsi-ld:Company:HydraulicPartsCo' },
  },
  {
    id: 'urn:ngsi-ld:StockLocation:WH-STOCK',
    type: 'StockLocation',
    name: { type: 'Property', value: 'Raw Materials Warehouse' },
    locationCode: { type: 'Property', value: 'WH-STOCK' },
    locationType: { type: 'Property', value: 'internal' },
    state: { type: 'Property', value: 'active' },
    locatedIn: { type: 'Relationship', object: 'urn:ngsi-ld:Plant:Plant-BCN' },
  },
  {
    id: 'urn:ngsi-ld:StockLocation:WH-FINISHED',
    type: 'StockLocation',
    name: { type: 'Property', value: 'Finished Goods Warehouse' },
    locationCode: { type: 'Property', value: 'WH-FINISHED' },
    locationType: { type: 'Property', value: 'internal' },
    state: { type: 'Property', value: 'active' },
    locatedIn: { type: 'Relationship', object: 'urn:ngsi-ld:Plant:Plant-BCN' },
  },
];

// ── Scene snapshot (empty until seeded) ───────────────────────────────────────

export const MOCK_SCENE: SceneSnapshot = {
  sceneId: 'mrp-demo-cell',
  mode: 'mock',
  entities: [],          // populated by seed step
  layout: {
    zones: [
      {
        id: 'warehouse',
        label: 'Warehouse (WH-STOCK)',
        kind: 'warehouse',
        xPct: 0.02, yPct: 0.05, wPct: 0.29, hPct: 0.40,
        entityId: 'urn:ngsi-ld:StockLocation:WH-STOCK',
      },
      {
        id: 'production-buffer',
        label: 'WIP / Production Buffer',
        kind: 'buffer',
        xPct: 0.34, yPct: 0.05, wPct: 0.32, hPct: 0.40,
      },
      {
        id: 'finished-goods',
        label: 'Finished Goods (WH-FINISHED)',
        kind: 'finishedGoods',
        xPct: 0.69, yPct: 0.05, wPct: 0.29, hPct: 0.40,
        entityId: 'urn:ngsi-ld:StockLocation:WH-FINISHED',
      },
      {
        id: 'assembly',
        label: 'Assembly (WC-ASM)',
        kind: 'workCenter',
        xPct: 0.02, yPct: 0.50, wPct: 0.29, hPct: 0.46,
        entityId: 'urn:ngsi-ld:WorkCenter:WC-Assembly',
      },
      {
        id: 'leak-test',
        label: 'Leak Test Bench (WC-LTB)',
        kind: 'workCenter',
        xPct: 0.34, yPct: 0.50, wPct: 0.32, hPct: 0.27,
        entityId: 'urn:ngsi-ld:WorkCenter:WC-LeakTest',
      },
      {
        id: 'quality-area',
        label: 'Quality / Inspection',
        kind: 'quality',
        xPct: 0.34, yPct: 0.79, wPct: 0.32, hPct: 0.17,
      },
      {
        id: 'packaging',
        label: 'Packaging (WC-PKG)',
        kind: 'workCenter',
        xPct: 0.69, yPct: 0.50, wPct: 0.29, hPct: 0.46,
        entityId: 'urn:ngsi-ld:WorkCenter:WC-Packaging',
      },
    ],
    bindings: [],  // no WO bindings in Tutorial 01
  },
};

// ── Tutorial 01 guided-tour step definitions ───────────────────────────────────

export interface GuidedStep {
  id: string;
  title: string;
  shortDesc: string;
  desc: string;
  hood: {
    method: string;
    url: string;
    body?: string;
    expectedStatus: number;
  };
  actionLabel?: string;
  promptLabel?: string;   // shown instead of button when user must click on canvas
}

export const TUTORIAL_01_STEPS: GuidedStep[] = [
  {
    id: 'stack-health',
    title: 'Verify the stack',
    shortDesc: 'Check that all services are healthy',
    desc: 'Before loading data the emulator verifies that Orion-LD, the context server and the MRP API are all responding. In live mode it polls each service health endpoint.',
    hood: {
      method: 'GET',
      url: '/api/ready',
      expectedStatus: 200,
    },
    actionLabel: 'Check health',
  },
  {
    id: 'seed-entities',
    title: 'Load seed data',
    shortDesc: 'Create 12 NGSI-LD entities in Orion-LD',
    desc: 'Seeds the FIWARE Context Broker with the Tutorial 01 factory graph: 1 Company, 1 Plant, 3 WorkCenters, 5 Products and 2 StockLocations — all as normalised NGSI-LD entities.',
    hood: {
      method: 'POST',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entityOperations/upsert',
      body: '12 entities  •  application/ld+json',
      expectedStatus: 201,
    },
    actionLabel: 'Seed entities',
  },
  {
    id: 'explore-plant',
    title: 'Inspect the Plant',
    shortDesc: 'Click a zone to see the Plant entity',
    desc: 'Every coloured zone on the factory canvas is bound to an NGSI-LD entity. Click on the Warehouse or a WorkCenter zone to fetch the entity from the broker and see its normalised JSON-LD in the inspector.',
    hood: {
      method: 'GET',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entities/urn:ngsi-ld:Plant:Plant-BCN',
      expectedStatus: 200,
    },
    promptLabel: 'Click any zone on the canvas →',
  },
  {
    id: 'query-workcenters',
    title: 'Query WorkCenters',
    shortDesc: 'Fetch all 3 WorkCenters from the broker',
    desc: 'The NGSI-LD query API lets you retrieve all entities of a type in one request. WorkCenters hold capacity, efficiency and cost information that the scheduler will use in later tutorials.',
    hood: {
      method: 'GET',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entities?type=WorkCenter',
      expectedStatus: 200,
    },
    actionLabel: 'Query WorkCenters',
  },
  {
    id: 'query-products',
    title: 'Browse Products',
    shortDesc: 'Fetch the 5-item product catalogue',
    desc: 'Products are the items the factory makes or buys. HydraulicPump-P100 is the manufactured finished good. The other 4 are purchased components that will be used in the Bill of Materials in a later tutorial.',
    hood: {
      method: 'GET',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entities?type=Product',
      expectedStatus: 200,
    },
    actionLabel: 'Browse Products',
  },
  {
    id: 'query-stocklocations',
    title: 'Inspect StockLocations',
    shortDesc: 'See the 2 warehouse zones',
    desc: 'StockLocations represent physical or logical inventory zones. WH-STOCK holds raw materials; WH-FINISHED holds finished goods. Both are linked to the Plant via an NGSI-LD Relationship.',
    hood: {
      method: 'GET',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entities?type=StockLocation',
      expectedStatus: 200,
    },
    actionLabel: 'Query StockLocations',
  },
];

export const TUTORIAL_01_STEP_IDS = TUTORIAL_01_STEPS.map((s) => s.id);
