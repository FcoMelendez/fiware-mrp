import type { SceneSnapshot } from '../types.js';

// ── Tutorial 01 entities ───────────────────────────────────────────────────────

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

// ── Tutorial 02 additional mock entities ───────────────────────────────────────

export const MOCK_IB_PUMP_CASING = {
  id: 'urn:ngsi-ld:InventoryBalance:IB-PumpCasing-WH-STOCK',
  type: 'InventoryBalance',
  quantityOnHand: { type: 'Property', value: 50, unitCode: 'EA' },
  reservedQuantity: { type: 'Property', value: 0, unitCode: 'EA' },
  availableQuantity: { type: 'Property', value: 50, unitCode: 'EA' },
  state: { type: 'Property', value: 'active' },
  product: { type: 'Relationship', object: 'urn:ngsi-ld:Product:PumpCasing' },
  location: { type: 'Relationship', object: 'urn:ngsi-ld:StockLocation:WH-STOCK' },
};

export const MOCK_IB_IMPELLER = {
  id: 'urn:ngsi-ld:InventoryBalance:IB-Impeller-WH-STOCK-LOT-240001',
  type: 'InventoryBalance',
  quantityOnHand: { type: 'Property', value: 30, unitCode: 'EA' },
  reservedQuantity: { type: 'Property', value: 0, unitCode: 'EA' },
  availableQuantity: { type: 'Property', value: 30, unitCode: 'EA' },
  state: { type: 'Property', value: 'active' },
  product: { type: 'Relationship', object: 'urn:ngsi-ld:Product:Impeller' },
  location: { type: 'Relationship', object: 'urn:ngsi-ld:StockLocation:WH-STOCK' },
  lot: { type: 'Relationship', object: 'urn:ngsi-ld:Lot:LOT-240001' },
};

export const MOCK_LOT_240001 = {
  id: 'urn:ngsi-ld:Lot:LOT-240001',
  type: 'Lot',
  lotCode: { type: 'Property', value: 'LOT-240001' },
  origin: { type: 'Property', value: 'PO-2024-002' },
  qualityStatus: { type: 'Property', value: 'approved' },
  state: { type: 'Property', value: 'active' },
  product: { type: 'Relationship', object: 'urn:ngsi-ld:Product:Impeller' },
};

// ── Shared scene layout ────────────────────────────────────────────────────────

export const MOCK_SCENE: SceneSnapshot = {
  sceneId: 'mrp-demo-cell',
  mode: 'mock',
  entities: [],
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
    bindings: [],
  },
};

// ── Shared GuidedStep interface ────────────────────────────────────────────────

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
  workflow: string[];
  actionLabel?: string;
  promptLabel?: string;
}

// ── Tutorial 01 step definitions ───────────────────────────────────────────────

export const TUTORIAL_01_STEPS: GuidedStep[] = [
  {
    id: 'stack-health',
    title: 'Verify the stack',
    shortDesc: 'Check that all services are healthy',
    desc: 'Before loading data the emulator verifies that Orion-LD, the context server and the MRP API are all responding. In live mode it polls each service health endpoint.',
    hood: { method: 'GET', url: '/api/ready', expectedStatus: 200 },
    workflow: [
      'Emulator → GET /api/ready → Gateway (health aggregator)',
      'Gateway → GET /ngsi-ld/v1/version → Orion-LD',
      'Gateway → GET /context.jsonld → Context Server',
      'All services healthy → { status: ok }',
    ],
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
    workflow: [
      'Gateway attaches @context URL to each of the 12 entity payloads',
      'POST /ngsi-ld/v1/entityOperations/upsert (application/ld+json) → Orion-LD',
      'Orion-LD stores: 1 Company · 1 Plant · 3 WorkCenter · 5 Product · 2 StockLocation',
      'Gateway emits contextSnapshot → Phaser canvas renders factory zones',
    ],
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
    workflow: [
      'User clicks a factory zone → zone entityId resolved from canvas binding',
      'GET /ngsi-ld/v1/entities/:id with Link: <context>; rel=context → Orion-LD',
      'Orion-LD returns compacted JSON-LD (short attribute names via @context)',
      'Entity Inspector renders Properties and Relationships in the right panel',
    ],
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
    workflow: [
      'GET /ngsi-ld/v1/entities?type=WorkCenter with Link: <context>; rel=context → Orion-LD',
      'Link header enables type compaction: "WorkCenter" resolves via @context',
      'Orion-LD returns 3 entities: WC-Assembly · WC-LeakTest · WC-Packaging',
      'Inspector lists results → click an entity to inspect capacity, efficiency, costPerHour',
    ],
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
    workflow: [
      'GET /ngsi-ld/v1/entities?type=Product with Link: <context>; rel=context → Orion-LD',
      'Orion-LD returns 5 Product entities',
      '1 manufactured (HydraulicPump-P100) · 4 purchased components',
      'Inspector → inspect productType, trackingPolicy, standardCost per product',
    ],
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
    workflow: [
      'GET /ngsi-ld/v1/entities?type=StockLocation with Link: <context>; rel=context → Orion-LD',
      'Orion-LD returns 2 StockLocation entities: WH-STOCK · WH-FINISHED',
      'Each carries locatedIn Relationship → Plant-BCN',
      'WH-STOCK holds raw materials · WH-FINISHED holds finished goods',
    ],
    actionLabel: 'Query StockLocations',
  },
];

// ── Tutorial 02 step definitions ───────────────────────────────────────────────

export const TUTORIAL_02_STEPS: GuidedStep[] = [
  {
    id: 'check-inventory-service',
    title: 'Verify inventory service',
    shortDesc: 'Health-check the inventory-service',
    desc: 'Tutorial 02 adds the inventory-service to the stack. This step confirms it is running and can reach Orion-LD.',
    hood: { method: 'GET', url: 'http://inventory-service:8081/health', expectedStatus: 200 },
    workflow: [
      'Emulator → GET /health → inventory-service:8081',
      'inventory-service verifies its own connection to Orion-LD internally',
      'Returns { status: ok, service: inventory-service, version: 0.2.0 }',
    ],
    actionLabel: 'Check health',
  },
  {
    id: 'seed-context',
    title: 'Load seed data',
    shortDesc: 'Re-seed the 12 Tutorial 01 master-data entities',
    desc: 'Tutorial 02 starts from the same factory graph as Tutorial 01. Seeding is idempotent — running it again is always safe.',
    hood: {
      method: 'POST',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entityOperations/upsert',
      body: '12 entities  •  application/ld+json',
      expectedStatus: 201,
    },
    workflow: [
      'Gateway attaches @context URL to each of the 12 master-data entities',
      'POST /ngsi-ld/v1/entityOperations/upsert (application/ld+json) → Orion-LD (idempotent)',
      'Orion-LD stores: 1 Company · 1 Plant · 3 WorkCenter · 5 Product · 2 StockLocation',
      'No InventoryBalance or StockMove entities are created in this step',
    ],
    actionLabel: 'Seed entities',
  },
  {
    id: 'query-initial-inventory',
    title: 'Query initial inventory',
    shortDesc: 'Expect zero InventoryBalance entities',
    desc: 'Before any material receipts there are no InventoryBalance entities in the broker. The inventory-service returns an empty list.',
    hood: {
      method: 'GET',
      url: 'http://inventory-service:8081/inventory',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /inventory → inventory-service:8081',
      'inventory-service → GET /ngsi-ld/v1/entities?type=InventoryBalance → Orion-LD',
      'No receipts posted yet → Orion-LD returns []',
      'Expected result: 0 InventoryBalance entities in the broker',
    ],
    actionLabel: 'Query inventory',
  },
  {
    id: 'receive-pump-casings',
    title: 'Receive PumpCasing',
    shortDesc: 'POST receive-material — 50 PumpCasing into WH-STOCK',
    desc: 'The receive-material command creates a StockMove (moveType=receipt, state=done) and upserts an InventoryBalance for the product/location pair. quantityOnHand accumulates across multiple receipts.',
    hood: {
      method: 'POST',
      url: 'http://inventory-service:8081/commands/receive-material',
      body: JSON.stringify({
        product_id: 'urn:ngsi-ld:Product:PumpCasing',
        location_id: 'urn:ngsi-ld:StockLocation:WH-STOCK',
        quantity: 50,
        unit: 'EA',
        reference: 'PO-2024-001',
      }, null, 2),
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → POST /commands/receive-material { product, qty: 50, unit: EA } → inventory-service',
      'inventory-service resolves product_id and location_id against Orion-LD',
      'UPSERT InventoryBalance (quantityOnHand: 50, state: active) → Orion-LD',
      'UPSERT StockMove (moveType: receipt, state: done, origin: PO-2024-001) → Orion-LD',
      'Returns { status: done, quantity_on_hand: 50, stock_move_id }',
    ],
    actionLabel: 'Receive PumpCasing',
  },
  {
    id: 'receive-impellers',
    title: 'Receive Impeller (lot-tracked)',
    shortDesc: 'POST receive-material — 30 Impeller, lot LOT-240001',
    desc: 'When lot_code is provided the service creates a Lot entity and keys the InventoryBalance to that lot. This enables traceability: you can later query "how much Impeller is in lot LOT-240001?"',
    hood: {
      method: 'POST',
      url: 'http://inventory-service:8081/commands/receive-material',
      body: JSON.stringify({
        product_id: 'urn:ngsi-ld:Product:Impeller',
        location_id: 'urn:ngsi-ld:StockLocation:WH-STOCK',
        quantity: 30,
        unit: 'EA',
        lot_code: 'LOT-240001',
        reference: 'PO-2024-002',
      }, null, 2),
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → POST /commands/receive-material { product, qty: 30, lot_code: LOT-240001 } → inventory-service',
      'lot_code provided → UPSERT Lot entity (LOT-240001, qualityStatus: approved) → Orion-LD',
      'UPSERT InventoryBalance (keyed to lot, quantityOnHand: 30) → Orion-LD',
      'UPSERT StockMove (moveType: receipt, lot ref, state: done, origin: PO-2024-002) → Orion-LD',
      'Returns { status: done, quantity_on_hand: 30, stock_move_id }',
    ],
    actionLabel: 'Receive Impeller',
  },
  {
    id: 'query-all-balances',
    title: 'Query all balances',
    shortDesc: 'GET /inventory — see 2 InventoryBalance entities',
    desc: 'After the two receipts, the inventory-service returns 2 InventoryBalance entities. Inspect each one in the entity inspector to see quantityOnHand, the product Relationship, and — for Impeller — the lot Relationship.',
    hood: {
      method: 'GET',
      url: 'http://inventory-service:8081/inventory',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /inventory → inventory-service:8081',
      'inventory-service → GET /ngsi-ld/v1/entities?type=InventoryBalance → Orion-LD',
      '2 balances returned: PumpCasing (50 EA) · Impeller (30 EA, lot LOT-240001)',
      'Inspector lists both → inspect to see quantityOnHand, product, and lot Relationships',
    ],
    actionLabel: 'Query all balances',
  },
];

export const TUTORIAL_01_STEP_IDS = TUTORIAL_01_STEPS.map((s) => s.id);
export const TUTORIAL_02_STEP_IDS = TUTORIAL_02_STEPS.map((s) => s.id);

// ── Tutorial 03 entities ───────────────────────────────────────────────────────

export const TUTORIAL_03_ENTITIES = [
  {
    id: 'urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1',
    type: 'BillOfMaterials',
    bomCode: { type: 'Property', value: 'BOM-HP-P100-v1' },
    bomType: { type: 'Property', value: 'manufacturing' },
    version: { type: 'Property', value: '1.0' },
    state: { type: 'Property', value: 'active' },
    product: { type: 'Relationship', object: 'urn:ngsi-ld:Product:HydraulicPump-P100' },
    company: { type: 'Relationship', object: 'urn:ngsi-ld:Company:HydraulicPartsCo' },
  },
  {
    id: 'urn:ngsi-ld:BillOfMaterialsLine:BML-HP-P100-PumpCasing',
    type: 'BillOfMaterialsLine',
    sequence: { type: 'Property', value: 1 },
    quantity: { type: 'Property', value: 1, unitCode: 'EA' },
    scrapFactor: { type: 'Property', value: 0.02 },
    bom: { type: 'Relationship', object: 'urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1' },
    component: { type: 'Relationship', object: 'urn:ngsi-ld:Product:PumpCasing' },
  },
  {
    id: 'urn:ngsi-ld:BillOfMaterialsLine:BML-HP-P100-Impeller',
    type: 'BillOfMaterialsLine',
    sequence: { type: 'Property', value: 2 },
    quantity: { type: 'Property', value: 1, unitCode: 'EA' },
    scrapFactor: { type: 'Property', value: 0.01 },
    bom: { type: 'Relationship', object: 'urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1' },
    component: { type: 'Relationship', object: 'urn:ngsi-ld:Product:Impeller' },
  },
  {
    id: 'urn:ngsi-ld:BillOfMaterialsLine:BML-HP-P100-ElectricMotor',
    type: 'BillOfMaterialsLine',
    sequence: { type: 'Property', value: 3 },
    quantity: { type: 'Property', value: 1, unitCode: 'EA' },
    scrapFactor: { type: 'Property', value: 0.01 },
    bom: { type: 'Relationship', object: 'urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1' },
    component: { type: 'Relationship', object: 'urn:ngsi-ld:Product:ElectricMotor' },
  },
  {
    id: 'urn:ngsi-ld:BillOfMaterialsLine:BML-HP-P100-SealKit',
    type: 'BillOfMaterialsLine',
    sequence: { type: 'Property', value: 4 },
    quantity: { type: 'Property', value: 2, unitCode: 'EA' },
    scrapFactor: { type: 'Property', value: 0.05 },
    bom: { type: 'Relationship', object: 'urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1' },
    component: { type: 'Relationship', object: 'urn:ngsi-ld:Product:SealKit' },
  },
];

export const MOCK_EXPLODE_RESULT = {
  product_id: 'urn:ngsi-ld:Product:HydraulicPump-P100',
  quantity: 10,
  bom_id: 'urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1',
  bom_code: 'BOM-HP-P100-v1',
  bom_version: '1.0',
  components: [
    {
      line_id: 'urn:ngsi-ld:BillOfMaterialsLine:BML-HP-P100-PumpCasing',
      component_id: 'urn:ngsi-ld:Product:PumpCasing',
      component_code: 'PumpCasing',
      sequence: 1,
      required_quantity: 10,
      unit: 'EA',
      scrap_factor: 0.02,
    },
    {
      line_id: 'urn:ngsi-ld:BillOfMaterialsLine:BML-HP-P100-Impeller',
      component_id: 'urn:ngsi-ld:Product:Impeller',
      component_code: 'Impeller',
      sequence: 2,
      required_quantity: 10,
      unit: 'EA',
      scrap_factor: 0.01,
    },
    {
      line_id: 'urn:ngsi-ld:BillOfMaterialsLine:BML-HP-P100-ElectricMotor',
      component_id: 'urn:ngsi-ld:Product:ElectricMotor',
      component_code: 'ElectricMotor',
      sequence: 3,
      required_quantity: 10,
      unit: 'EA',
      scrap_factor: 0.01,
    },
    {
      line_id: 'urn:ngsi-ld:BillOfMaterialsLine:BML-HP-P100-SealKit',
      component_id: 'urn:ngsi-ld:Product:SealKit',
      component_code: 'SealKit',
      sequence: 4,
      required_quantity: 20,
      unit: 'EA',
      scrap_factor: 0.05,
    },
  ],
};

// ── Tutorial 03 step definitions ───────────────────────────────────────────────

export const TUTORIAL_03_STEPS: GuidedStep[] = [
  {
    id: 'check-bom-service',
    title: 'Verify BoM service',
    shortDesc: 'Health-check the bom-service',
    desc: 'Tutorial 03 adds the bom-service to the stack. This step confirms it is running and can reach Orion-LD.',
    hood: { method: 'GET', url: 'http://bom-service:8082/health', expectedStatus: 200 },
    workflow: [
      'Emulator → GET /health → bom-service:8082',
      'bom-service verifies its connection to Orion-LD internally',
      'Returns { status: ok, service: bom-service, version: 0.3.0 }',
    ],
    actionLabel: 'Check health',
  },
  {
    id: 'seed-bom-data',
    title: 'Load BoM seed data',
    shortDesc: 'Seed 17 entities: T01 master data + BOM + 4 BOM lines',
    desc: 'Seeds Orion-LD with the Tutorial 01 factory graph (12 entities) plus the Tutorial 03 Bill of Materials for the Hydraulic Pump P100: 1 BillOfMaterials header and 4 BillOfMaterialsLine components.',
    hood: {
      method: 'POST',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entityOperations/upsert',
      body: '17 entities  •  application/ld+json',
      expectedStatus: 201,
    },
    workflow: [
      'Gateway attaches @context URL to all 17 entity payloads',
      'POST /ngsi-ld/v1/entityOperations/upsert (application/ld+json) → Orion-LD (idempotent)',
      'Orion-LD stores 12 T01 master-data entities + 1 BillOfMaterials + 4 BillOfMaterialsLine',
      'BOM links product → HydraulicPump-P100 via NGSI-LD Relationship',
    ],
    actionLabel: 'Seed entities',
  },
  {
    id: 'query-boms',
    title: 'Query Bills of Materials',
    shortDesc: 'GET /boms — list 1 BillOfMaterials entity',
    desc: 'The bom-service exposes a /boms endpoint that proxies an NGSI-LD type query to Orion-LD. You can also filter by product_id to retrieve only the BoM for a specific finished good.',
    hood: {
      method: 'GET',
      url: 'http://bom-service:8082/boms',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /boms → bom-service:8082',
      'bom-service → GET /ngsi-ld/v1/entities?type=BillOfMaterials → Orion-LD',
      '1 BillOfMaterials returned: BOM-HP-P100-v1 (state: active, type: manufacturing)',
      'bomCode, version, state, product Relationship visible in the Inspector',
    ],
    actionLabel: 'Query BoMs',
  },
  {
    id: 'query-bom-lines',
    title: 'Query BoM lines',
    shortDesc: 'GET /boms/{id}/lines — list 4 BillOfMaterialsLine entities',
    desc: 'Each BillOfMaterialsLine links a component Product to the BOM header via an NGSI-LD Relationship. The line carries quantity, unitCode, and scrapFactor (informational in this tutorial).',
    hood: {
      method: 'GET',
      url: 'http://bom-service:8082/boms/BOM-HP-P100-v1/lines',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /boms/BOM-HP-P100-v1/lines → bom-service:8082',
      'bom-service → GET /ngsi-ld/v1/entities?type=BillOfMaterialsLine → Orion-LD',
      'Filter by bom Relationship = urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1',
      '4 lines returned: PumpCasing×1 · Impeller×1 · ElectricMotor×1 · SealKit×2',
    ],
    actionLabel: 'Query BoM lines',
  },
  {
    id: 'explode-bom',
    title: 'Explode BoM for 10 units',
    shortDesc: 'POST /commands/explode-bom — compute net requirements',
    desc: 'The explode-bom command fetches the active BoM for HydraulicPump-P100, multiplies each line quantity by the order quantity (10), and returns the full component requirement list. Net requirements = line_qty × order_qty.',
    hood: {
      method: 'POST',
      url: 'http://bom-service:8082/commands/explode-bom',
      body: JSON.stringify({ product_id: 'urn:ngsi-ld:Product:HydraulicPump-P100', quantity: 10 }, null, 2),
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → POST /commands/explode-bom { product_id, quantity: 10 } → bom-service',
      'bom-service queries active BOM for HydraulicPump-P100 → BOM-HP-P100-v1',
      'Fetches 4 BillOfMaterialsLine entities for that BOM from Orion-LD',
      'Computes: PumpCasing=10 · Impeller=10 · ElectricMotor=10 · SealKit=20',
      'scrapFactor is informational only — net requirements = line_qty × order_qty',
    ],
    actionLabel: 'Explode BoM',
  },
  {
    id: 'inspect-bom-entity',
    title: 'Inspect the BOM entity',
    shortDesc: 'Fetch the BillOfMaterials entity directly from the broker',
    desc: 'You can always fetch any entity directly from Orion-LD. The BillOfMaterials entity carries the product Relationship that links it to HydraulicPump-P100, letting you navigate from finished good to BoM to components.',
    hood: {
      method: 'GET',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entities/urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1',
      expectedStatus: 200,
    },
    workflow: [
      'GET /ngsi-ld/v1/entities/urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1 with Link: <context> → Orion-LD',
      'Orion-LD returns compacted JSON-LD (short keys via @context)',
      'product Relationship → urn:ngsi-ld:Product:HydraulicPump-P100',
      'bomCode: BOM-HP-P100-v1 · version: 1.0 · state: active · bomType: manufacturing',
    ],
    actionLabel: 'Inspect BOM',
  },
];

export const TUTORIAL_03_STEP_IDS = TUTORIAL_03_STEPS.map((s) => s.id);

// ── Tutorial 04 mock entities ──────────────────────────────────────────────────

export const MOCK_MO_DRAFT = {
  id: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001',
  type: 'ManufacturingOrder',
  orderCode: { type: 'Property', value: 'MO-2024-001' },
  product: { type: 'Relationship', object: 'urn:ngsi-ld:Product:HydraulicPump-P100' },
  bom: { type: 'Relationship', object: 'urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1' },
  quantity: { type: 'Property', value: 10, unitCode: 'EA' },
  state: { type: 'Property', value: 'draft' },
  plannedStart: { type: 'Property', value: '2024-07-01T08:00:00Z' },
  plannedEnd: { type: 'Property', value: '2024-07-03T17:00:00Z' },
  priority: { type: 'Property', value: 'normal' },
};

export const MOCK_MO_CONFIRMED = {
  ...MOCK_MO_DRAFT,
  state: { type: 'Property', value: 'confirmed' },
  confirmedAt: { type: 'Property', value: '2024-07-01T07:45:00Z' },
};

export const TUTORIAL_04_ENTITIES = [MOCK_MO_CONFIRMED];

// ── Tutorial 04 step definitions ───────────────────────────────────────────────

export const TUTORIAL_04_STEPS: GuidedStep[] = [
  {
    id: 'check-mfg-service',
    title: 'Verify manufacturing service',
    shortDesc: 'Health-check the manufacturing-service',
    desc: 'Tutorial 04 adds the manufacturing-service to the stack. This step confirms it is running and can reach Orion-LD.',
    hood: { method: 'GET', url: 'http://manufacturing-service:8083/health', expectedStatus: 200 },
    workflow: [
      'Emulator → GET /health → manufacturing-service:8083',
      'manufacturing-service verifies its connection to Orion-LD internally',
      'Returns { status: ok, service: manufacturing-service, version: 0.4.0 }',
    ],
    actionLabel: 'Check health',
  },
  {
    id: 'seed-mfg-data',
    title: 'Load manufacturing seed data',
    shortDesc: 'Seed 18 entities: T01 master data + T03 BoM + ManufacturingOrder (draft)',
    desc: 'Seeds Orion-LD with the Tutorial 01 factory graph (12 entities), the Tutorial 03 Bill of Materials (5 entities), and the Tutorial 04 ManufacturingOrder MO-2024-001 in draft state for 10 units of HydraulicPump-P100.',
    hood: {
      method: 'POST',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entityOperations/upsert',
      body: '18 entities  •  application/ld+json',
      expectedStatus: 201,
    },
    workflow: [
      'Gateway attaches @context URL to all 18 entity payloads',
      'POST /ngsi-ld/v1/entityOperations/upsert (application/ld+json) → Orion-LD (idempotent)',
      'Orion-LD stores 12 T01 master-data entities + 5 T03 BoM entities + 1 ManufacturingOrder',
      'ManufacturingOrder MO-2024-001: state=draft, product→HydraulicPump-P100, qty=10 EA',
    ],
    actionLabel: 'Seed entities',
  },
  {
    id: 'query-orders-draft',
    title: 'Query draft manufacturing orders',
    shortDesc: 'GET /manufacturing-orders?state=draft — list 1 draft ManufacturingOrder',
    desc: 'The manufacturing-service exposes a /manufacturing-orders endpoint that proxies an NGSI-LD type query to Orion-LD and filters by state. The MO is still in draft — it has not yet been confirmed.',
    hood: {
      method: 'GET',
      url: 'http://manufacturing-service:8083/manufacturing-orders?state=draft',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /manufacturing-orders?state=draft → manufacturing-service:8083',
      'manufacturing-service → GET /ngsi-ld/v1/entities?type=ManufacturingOrder → Orion-LD',
      'Filters results client-side: state == draft',
      '1 ManufacturingOrder returned: MO-2024-001 (state: draft, qty: 10 EA)',
    ],
    actionLabel: 'Query draft orders',
  },
  {
    id: 'confirm-order',
    title: 'Confirm the manufacturing order',
    shortDesc: 'POST /commands/confirm-manufacturing-order — draft → confirmed',
    desc: 'The confirm-manufacturing-order command validates that the order is in draft state, then patches state=confirmed and records a confirmedAt timestamp in Orion-LD. A confirmed order is locked for scheduling and component reservation.',
    hood: {
      method: 'POST',
      url: 'http://manufacturing-service:8083/commands/confirm-manufacturing-order',
      body: JSON.stringify({ order_id: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' }, null, 2),
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → POST /commands/confirm-manufacturing-order { order_id } → manufacturing-service',
      'manufacturing-service → GET /ngsi-ld/v1/entities/{id} → validates state == draft',
      'PATCH /ngsi-ld/v1/entities/{id}/attrs → state: confirmed, confirmedAt: <timestamp>',
      'Returns { status: confirmed, order_id, confirmed_at }',
    ],
    actionLabel: 'Confirm order',
  },
  {
    id: 'query-orders-confirmed',
    title: 'Query confirmed manufacturing orders',
    shortDesc: 'GET /manufacturing-orders?state=confirmed — verify state transition',
    desc: 'After confirmation the order should no longer appear in draft queries. Filtering by state=confirmed shows the order with its confirmedAt timestamp set.',
    hood: {
      method: 'GET',
      url: 'http://manufacturing-service:8083/manufacturing-orders?state=confirmed',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /manufacturing-orders?state=confirmed → manufacturing-service:8083',
      'manufacturing-service → GET /ngsi-ld/v1/entities?type=ManufacturingOrder → Orion-LD',
      'Filters results client-side: state == confirmed',
      '1 ManufacturingOrder returned: MO-2024-001 (state: confirmed, confirmedAt set)',
    ],
    actionLabel: 'Query confirmed orders',
  },
  {
    id: 'inspect-order',
    title: 'Inspect the ManufacturingOrder entity',
    shortDesc: 'Fetch MO-2024-001 directly from the broker',
    desc: 'Fetch the ManufacturingOrder entity directly from Orion-LD to see all NGSI-LD attributes: the product and bom Relationships, the confirmed state, and the confirmedAt timestamp set by the service.',
    hood: {
      method: 'GET',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entities/urn:ngsi-ld:ManufacturingOrder:MO-2024-001',
      expectedStatus: 200,
    },
    workflow: [
      'GET /ngsi-ld/v1/entities/urn:ngsi-ld:ManufacturingOrder:MO-2024-001 with Link: <context>',
      'Orion-LD returns compacted JSON-LD (short keys via @context)',
      'product → urn:ngsi-ld:Product:HydraulicPump-P100 (Relationship)',
      'bom → urn:ngsi-ld:BillOfMaterials:BOM-HP-P100-v1 (Relationship)',
      'state: confirmed · confirmedAt: <timestamp> · quantity: 10 EA',
    ],
    actionLabel: 'Inspect order',
  },
];

export const TUTORIAL_04_STEP_IDS = TUTORIAL_04_STEPS.map((s) => s.id);

// ── Tutorial 05 mock entities ──────────────────────────────────────────────────

export const MOCK_IR_PUMP_CASING = {
  id: 'urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-PumpCasing',
  type: 'InventoryReservation',
  reservationCode: { type: 'Property', value: 'IR-MO-2024-001-PumpCasing' },
  requiredQuantity: { type: 'Property', value: 10, unitCode: 'EA' },
  reservedQuantity: { type: 'Property', value: 10, unitCode: 'EA' },
  shortageQuantity: { type: 'Property', value: 0, unitCode: 'EA' },
  state: { type: 'Property', value: 'reserved' },
  reservedAt: { type: 'Property', value: '2024-07-01T07:50:00Z' },
  manufacturingOrder: { type: 'Relationship', object: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  product: { type: 'Relationship', object: 'urn:ngsi-ld:Product:PumpCasing' },
  stockLocation: { type: 'Relationship', object: 'urn:ngsi-ld:StockLocation:WH-STOCK' },
  inventoryBalance: { type: 'Relationship', object: 'urn:ngsi-ld:InventoryBalance:IB-PumpCasing-WH-STOCK' },
};

export const MOCK_IR_IMPELLER = {
  id: 'urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-Impeller',
  type: 'InventoryReservation',
  reservationCode: { type: 'Property', value: 'IR-MO-2024-001-Impeller' },
  requiredQuantity: { type: 'Property', value: 10, unitCode: 'EA' },
  reservedQuantity: { type: 'Property', value: 10, unitCode: 'EA' },
  shortageQuantity: { type: 'Property', value: 0, unitCode: 'EA' },
  state: { type: 'Property', value: 'reserved' },
  reservedAt: { type: 'Property', value: '2024-07-01T07:50:00Z' },
  manufacturingOrder: { type: 'Relationship', object: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  product: { type: 'Relationship', object: 'urn:ngsi-ld:Product:Impeller' },
  stockLocation: { type: 'Relationship', object: 'urn:ngsi-ld:StockLocation:WH-STOCK' },
  inventoryBalance: { type: 'Relationship', object: 'urn:ngsi-ld:InventoryBalance:IB-Impeller-WH-STOCK-LOT-240001' },
};

export const MOCK_IR_ELECTRIC_MOTOR = {
  id: 'urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-ElectricMotor',
  type: 'InventoryReservation',
  reservationCode: { type: 'Property', value: 'IR-MO-2024-001-ElectricMotor' },
  requiredQuantity: { type: 'Property', value: 10, unitCode: 'EA' },
  reservedQuantity: { type: 'Property', value: 0, unitCode: 'EA' },
  shortageQuantity: { type: 'Property', value: 10, unitCode: 'EA' },
  state: { type: 'Property', value: 'shortage' },
  reservedAt: { type: 'Property', value: '2024-07-01T07:50:00Z' },
  manufacturingOrder: { type: 'Relationship', object: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  product: { type: 'Relationship', object: 'urn:ngsi-ld:Product:ElectricMotor' },
  stockLocation: { type: 'Relationship', object: 'urn:ngsi-ld:StockLocation:WH-STOCK' },
};

export const MOCK_IR_SEAL_KIT = {
  id: 'urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-SealKit',
  type: 'InventoryReservation',
  reservationCode: { type: 'Property', value: 'IR-MO-2024-001-SealKit' },
  requiredQuantity: { type: 'Property', value: 20, unitCode: 'EA' },
  reservedQuantity: { type: 'Property', value: 0, unitCode: 'EA' },
  shortageQuantity: { type: 'Property', value: 20, unitCode: 'EA' },
  state: { type: 'Property', value: 'shortage' },
  reservedAt: { type: 'Property', value: '2024-07-01T07:50:00Z' },
  manufacturingOrder: { type: 'Relationship', object: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  product: { type: 'Relationship', object: 'urn:ngsi-ld:Product:SealKit' },
  stockLocation: { type: 'Relationship', object: 'urn:ngsi-ld:StockLocation:WH-STOCK' },
};

export const TUTORIAL_05_ENTITIES = [
  MOCK_IR_PUMP_CASING,
  MOCK_IR_IMPELLER,
  MOCK_IR_ELECTRIC_MOTOR,
  MOCK_IR_SEAL_KIT,
];

// ── Tutorial 05 step definitions ───────────────────────────────────────────────

export const TUTORIAL_05_STEPS: GuidedStep[] = [
  {
    id: 'check-inventory-service-t05',
    title: 'Verify inventory service',
    shortDesc: 'Health-check the inventory-service (v0.5)',
    desc: 'Tutorial 05 extends the inventory-service with a new reserve-components command. This step confirms the updated service is running.',
    hood: { method: 'GET', url: 'http://inventory-service:8081/health', expectedStatus: 200 },
    workflow: [
      'Emulator → GET /health → inventory-service:8081',
      'inventory-service verifies its connection to Orion-LD internally',
      'Returns { status: ok, service: inventory-service, version: 0.5.0 }',
    ],
    actionLabel: 'Check health',
  },
  {
    id: 'seed-t05-data',
    title: 'Load T05 seed data',
    shortDesc: 'Seed 24 entities: T01 + T02 inventory + T03 BoM + T04 confirmed MO',
    desc: 'Seeds Orion-LD with the full context for Tutorial 05: 12 master-data entities, 2 InventoryBalance entities (PumpCasing×50, Impeller×30), 5 BoM entities, and ManufacturingOrder MO-2024-001 in confirmed state.',
    hood: {
      method: 'POST',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entityOperations/upsert',
      body: '24 entities  •  application/ld+json',
      expectedStatus: 201,
    },
    workflow: [
      'Gateway attaches @context URL to all 24 entity payloads',
      'POST /ngsi-ld/v1/entityOperations/upsert (application/ld+json) → Orion-LD (idempotent)',
      'Orion-LD stores 12 T01 master-data + 2 T02 InventoryBalance + 5 T03 BoM + 1 T04 MO (confirmed)',
      'PumpCasing: 50 EA on hand · Impeller: 30 EA on hand · ElectricMotor/SealKit: 0 EA',
    ],
    actionLabel: 'Seed entities',
  },
  {
    id: 'query-inventory-t05',
    title: 'Query inventory balances',
    shortDesc: 'GET /inventory — see current stock before reservation',
    desc: 'Before running the reserve-components command, inspect the current inventory. PumpCasing and Impeller have stock; ElectricMotor and SealKit have none. This sets up the shortage scenario.',
    hood: {
      method: 'GET',
      url: 'http://inventory-service:8081/inventory',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /inventory → inventory-service:8081',
      'inventory-service → GET /ngsi-ld/v1/entities?type=InventoryBalance → Orion-LD',
      '2 balances returned: PumpCasing (50 EA) · Impeller (30 EA, lot LOT-240001)',
      'ElectricMotor and SealKit have no InventoryBalance — they will generate shortages',
    ],
    actionLabel: 'Query inventory',
  },
  {
    id: 'reserve-components',
    title: 'Reserve components',
    shortDesc: 'POST /commands/reserve-components — check stock and lock quantities',
    desc: 'The reserve-components command reads the confirmed ManufacturingOrder, expands its BoM, checks InventoryBalance for each component, and creates one InventoryReservation per BOM line. Components with stock are reserved; those without generate a shortage.',
    hood: {
      method: 'POST',
      url: 'http://inventory-service:8081/commands/reserve-components',
      body: JSON.stringify({
        order_id: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001',
        location_id: 'urn:ngsi-ld:StockLocation:WH-STOCK',
      }, null, 2),
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → POST /commands/reserve-components { order_id, location_id } → inventory-service',
      'inventory-service fetches MO → bom_id → all BillOfMaterialsLine for that BOM',
      'For each line: queries InventoryBalance, computes reserved vs shortage quantities',
      'Creates InventoryReservation entities: PumpCasing=reserved · Impeller=reserved · ElectricMotor=shortage · SealKit=shortage',
      'Patches InventoryBalance.reservedQuantity += · availableQuantity -= for components with stock',
    ],
    actionLabel: 'Reserve components',
  },
  {
    id: 'query-reservations',
    title: 'Query reservations',
    shortDesc: 'GET /inventory-reservations — inspect 4 InventoryReservation entities',
    desc: 'After the reserve-components command, 4 InventoryReservation entities exist in the broker — one per BOM line. Each carries state, requiredQuantity, reservedQuantity, and shortageQuantity. The shortage lines flag that purchasing or production adjustments are needed.',
    hood: {
      method: 'GET',
      url: 'http://inventory-service:8081/inventory-reservations',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /inventory-reservations → inventory-service:8081',
      'inventory-service → GET /ngsi-ld/v1/entities?type=InventoryReservation → Orion-LD',
      '4 reservations returned (one per BOM line)',
      'PumpCasing: state=reserved, reserved=10 · Impeller: state=reserved, reserved=10',
      'ElectricMotor: state=shortage, shortage=10 · SealKit: state=shortage, shortage=20',
    ],
    actionLabel: 'Query reservations',
  },
  {
    id: 'inspect-reservation',
    title: 'Inspect a reservation entity',
    shortDesc: 'Fetch an InventoryReservation directly from the broker',
    desc: 'Fetch one InventoryReservation entity directly from Orion-LD to see all NGSI-LD attributes: the manufacturingOrder, product, stockLocation, and inventoryBalance Relationships, plus the shortage quantities that drive purchasing actions.',
    hood: {
      method: 'GET',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entities/urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-ElectricMotor',
      expectedStatus: 200,
    },
    workflow: [
      'GET /ngsi-ld/v1/entities/urn:ngsi-ld:InventoryReservation:IR-MO-2024-001-ElectricMotor with Link: <context>',
      'Orion-LD returns compacted JSON-LD (short keys via @context)',
      'state: shortage · requiredQuantity: 10 EA · reservedQuantity: 0 EA · shortageQuantity: 10 EA',
      'manufacturingOrder → MO-2024-001 · product → ElectricMotor (Relationships)',
    ],
    actionLabel: 'Inspect reservation',
  },
];

export const TUTORIAL_05_STEP_IDS = TUTORIAL_05_STEPS.map((s) => s.id);

// ── Tutorial 06 mock entities ──────────────────────────────────────────────────

export const MOCK_WO_ASSEMBLY = {
  id: 'urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly',
  type: 'WorkOrder',
  workOrderCode:  { type: 'Property', value: 'WO-MO-2024-001-Assembly' },
  operationName:  { type: 'Property', value: 'Assembly' },
  sequence:       { type: 'Property', value: 1 },
  plannedStart:   { type: 'Property', value: '2024-07-01T08:00:00Z' },
  plannedEnd:     { type: 'Property', value: '2024-07-01T18:00:00Z' },
  durationHours:  { type: 'Property', value: 10.0 },
  state:          { type: 'Property', value: 'planned' },
  manufacturingOrder: { type: 'Relationship', object: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  workCenter:     { type: 'Relationship', object: 'urn:ngsi-ld:WorkCenter:WC-Assembly' },
  product:        { type: 'Relationship', object: 'urn:ngsi-ld:Product:HydraulicPump-P100' },
};

export const MOCK_WO_LEAK_TEST = {
  id: 'urn:ngsi-ld:WorkOrder:WO-MO-2024-001-LeakTest',
  type: 'WorkOrder',
  workOrderCode:  { type: 'Property', value: 'WO-MO-2024-001-LeakTest' },
  operationName:  { type: 'Property', value: 'LeakTest' },
  sequence:       { type: 'Property', value: 2 },
  plannedStart:   { type: 'Property', value: '2024-07-01T18:00:00Z' },
  plannedEnd:     { type: 'Property', value: '2024-07-01T23:00:00Z' },
  durationHours:  { type: 'Property', value: 5.0 },
  state:          { type: 'Property', value: 'planned' },
  manufacturingOrder: { type: 'Relationship', object: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  workCenter:     { type: 'Relationship', object: 'urn:ngsi-ld:WorkCenter:WC-LeakTest' },
  product:        { type: 'Relationship', object: 'urn:ngsi-ld:Product:HydraulicPump-P100' },
};

export const MOCK_WO_PACKAGING = {
  id: 'urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Packaging',
  type: 'WorkOrder',
  workOrderCode:  { type: 'Property', value: 'WO-MO-2024-001-Packaging' },
  operationName:  { type: 'Property', value: 'Packaging' },
  sequence:       { type: 'Property', value: 3 },
  plannedStart:   { type: 'Property', value: '2024-07-01T23:00:00Z' },
  plannedEnd:     { type: 'Property', value: '2024-07-02T01:30:00Z' },
  durationHours:  { type: 'Property', value: 2.5 },
  state:          { type: 'Property', value: 'planned' },
  manufacturingOrder: { type: 'Relationship', object: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  workCenter:     { type: 'Relationship', object: 'urn:ngsi-ld:WorkCenter:WC-Packaging' },
  product:        { type: 'Relationship', object: 'urn:ngsi-ld:Product:HydraulicPump-P100' },
};

export const TUTORIAL_06_ENTITIES = [
  MOCK_WO_ASSEMBLY,
  MOCK_WO_LEAK_TEST,
  MOCK_WO_PACKAGING,
];

// ── Tutorial 06 step definitions ───────────────────────────────────────────────

export const TUTORIAL_06_STEPS: GuidedStep[] = [
  {
    id: 'check-scheduler-service',
    title: 'Verify scheduler service',
    shortDesc: 'Health-check the scheduler-service (v0.6)',
    desc: 'Tutorial 06 introduces the scheduler-service, which generates work orders from a confirmed manufacturing order. This step confirms the new service is running and reachable.',
    hood: { method: 'GET', url: 'http://scheduler-service:8084/health', expectedStatus: 200 },
    workflow: [
      'Emulator → GET /health → scheduler-service:8084',
      'scheduler-service verifies its own startup (no external call)',
      'Returns { status: ok, service: scheduler-service, version: 0.6.0 }',
    ],
    actionLabel: 'Check health',
  },
  {
    id: 'seed-t06-data',
    title: 'Load T06 seed data',
    shortDesc: 'Seed 25 entities: T05 context + 4 InventoryReservations (reserved/shortage)',
    desc: 'Seeds Orion-LD with the full context for Tutorial 06: all T05 entities plus the 4 InventoryReservation entities that were created by the reserve-components command in T05 — representing the completed T05 state.',
    hood: {
      method: 'POST',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entityOperations/upsert',
      body: '25 entities  •  application/ld+json',
      expectedStatus: 201,
    },
    workflow: [
      'Gateway attaches @context URL to all 25 entity payloads',
      'POST /ngsi-ld/v1/entityOperations/upsert (application/ld+json) → Orion-LD (idempotent)',
      'T05 state: 12 T01 + 2 T02 IBs + Lot + 5 T03 BoM + 1 T04 MO (confirmed)',
      'T05 result: 4 InventoryReservations — PumpCasing/Impeller: reserved · ElectricMotor/SealKit: shortage',
    ],
    actionLabel: 'Seed entities',
  },
  {
    id: 'query-confirmed-mo',
    title: 'Query confirmed manufacturing order',
    shortDesc: 'GET /manufacturing-orders?state=confirmed — verify MO is ready to schedule',
    desc: 'Before scheduling work orders, confirm that the ManufacturingOrder exists in confirmed state. The scheduler-service will validate this before creating work orders.',
    hood: {
      method: 'GET',
      url: 'http://manufacturing-service:8083/manufacturing-orders?state=confirmed',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /manufacturing-orders?state=confirmed → manufacturing-service:8083',
      'manufacturing-service → GET /ngsi-ld/v1/entities?type=ManufacturingOrder → Orion-LD',
      'Filters results client-side: state == confirmed',
      '1 ManufacturingOrder returned: MO-2024-001 (quantity: 10 EA, plannedStart: 2024-07-01)',
    ],
    actionLabel: 'Query confirmed orders',
  },
  {
    id: 'create-work-orders',
    title: 'Create work orders',
    shortDesc: 'POST /commands/create-work-orders — schedule 3 operations sequentially',
    desc: 'The create-work-orders command reads MO-2024-001, applies the hardcoded routing (Assembly → LeakTest → Packaging), and generates 3 WorkOrder entities with back-to-back planned dates. Each operation\'s duration is proportional to the MO quantity.',
    hood: {
      method: 'POST',
      url: 'http://scheduler-service:8084/commands/create-work-orders',
      body: JSON.stringify({
        order_id: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001',
        planned_start: '2024-07-01T08:00:00Z',
      }, null, 2),
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → POST /commands/create-work-orders { order_id, planned_start } → scheduler-service',
      'scheduler-service fetches MO → validates state=confirmed → reads quantity=10',
      'Assembly (10h): 08:00 → 18:00 · LeakTest (5h): 18:00 → 23:00 · Packaging (2.5h): 23:00 → 01:30',
      'Upserts 3 WorkOrder entities to Orion-LD with state=planned and WorkCenter Relationships',
    ],
    actionLabel: 'Create work orders',
  },
  {
    id: 'query-work-orders',
    title: 'Query work orders',
    shortDesc: 'GET /work-orders — inspect 3 WorkOrder entities',
    desc: 'After the create-work-orders command, 3 WorkOrder entities exist in the broker — one per routing step. Each carries a planned date range, duration, and Relationship to its WorkCenter and ManufacturingOrder.',
    hood: {
      method: 'GET',
      url: 'http://scheduler-service:8084/work-orders',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /work-orders → scheduler-service:8084',
      'scheduler-service → GET /ngsi-ld/v1/entities?type=WorkOrder → Orion-LD',
      '3 work orders returned (one per routing step)',
      'Assembly: WC-Assembly, 10h · LeakTest: WC-LeakTest, 5h · Packaging: WC-Packaging, 2.5h',
    ],
    actionLabel: 'Query work orders',
  },
  {
    id: 'inspect-work-order',
    title: 'Inspect a work order entity',
    shortDesc: 'Fetch the Assembly WorkOrder directly from the broker',
    desc: 'Fetch the Assembly WorkOrder entity directly from Orion-LD to see all NGSI-LD attributes: the manufacturingOrder and workCenter Relationships, the sequential planned dates, and the state=planned.',
    hood: {
      method: 'GET',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entities/urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly',
      expectedStatus: 200,
    },
    workflow: [
      'GET /ngsi-ld/v1/entities/urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly with Link: <context>',
      'Orion-LD returns compacted JSON-LD (short keys via @context)',
      'state: planned · operationName: Assembly · durationHours: 10 · sequence: 1',
      'workCenter → WC-Assembly · manufacturingOrder → MO-2024-001 (Relationships)',
    ],
    actionLabel: 'Inspect work order',
  },
];

// ── Tutorial 07 mock entities ──────────────────────────────────────────────────

export const MOCK_WO_ASSEMBLY_IN_PROGRESS = {
  ...MOCK_WO_ASSEMBLY,
  state:       { type: 'Property', value: 'in_progress' },
  actualStart: { type: 'Property', value: '2024-07-01T08:05:00Z' },
};

export const MOCK_PE_ASSEMBLY_COMPLETED = {
  id: 'urn:ngsi-ld:ProductionEvent:PE-WO-MO-2024-001-Assembly-completed',
  type: 'ProductionEvent',
  eventType: { type: 'Property', value: 'work_order_completed' },
  eventTime: { type: 'Property', value: '2024-07-01T18:05:00Z' },
  quantity:  { type: 'Property', value: 10.0, unitCode: 'EA' },
  workOrder:         { type: 'Relationship', object: 'urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly' },
  workCenter:        { type: 'Relationship', object: 'urn:ngsi-ld:WorkCenter:WC-Assembly' },
  manufacturingOrder:{ type: 'Relationship', object: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  product:           { type: 'Relationship', object: 'urn:ngsi-ld:Product:HydraulicPump-P100' },
};

export const TUTORIAL_07_ENTITIES = [MOCK_PE_ASSEMBLY_COMPLETED];

// ── Tutorial 07 step definitions ───────────────────────────────────────────────

export const TUTORIAL_07_STEPS: GuidedStep[] = [
  {
    id: 'check-shopfloor-service',
    title: 'Verify shopfloor service',
    shortDesc: 'Health-check the shopfloor-service (v0.7)',
    desc: 'Tutorial 07 introduces the shopfloor-service, which drives work orders through their execution lifecycle. This step confirms the new service is running and reachable.',
    hood: { method: 'GET', url: 'http://shopfloor-service:8085/health', expectedStatus: 200 },
    workflow: [
      'Emulator → GET /health → shopfloor-service:8085',
      'shopfloor-service verifies its own startup',
      'Returns { status: ok, service: shopfloor-service, version: 0.7.0 }',
    ],
    actionLabel: 'Check health',
  },
  {
    id: 'seed-t07-data',
    title: 'Load T07 seed data',
    shortDesc: 'Seed 28 entities: T06 context + 3 WorkOrders (planned)',
    desc: 'Seeds Orion-LD with the full context for Tutorial 07: all T06 entities plus the 3 WorkOrder entities created by the scheduler in T06 — representing the completed T06 state, ready for shop-floor execution.',
    hood: {
      method: 'POST',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entityOperations/upsert',
      body: '28 entities  •  application/ld+json',
      expectedStatus: 201,
    },
    workflow: [
      'Gateway attaches @context URL to all 28 entity payloads',
      'POST /ngsi-ld/v1/entityOperations/upsert (application/ld+json) → Orion-LD (idempotent)',
      'T06 state: 25 entities (T01–T05 + 4 IRs)',
      'T06 result: 3 WorkOrders — Assembly, LeakTest, Packaging (all state: planned)',
    ],
    actionLabel: 'Seed entities',
  },
  {
    id: 'start-work-order',
    title: 'Start the Assembly work order',
    shortDesc: 'POST /commands/start-work-order — planned → in_progress',
    desc: 'The start-work-order command fetches the Assembly WorkOrder, validates state=planned, patches it to in_progress, sets actualStart, and creates a work_order_started ProductionEvent in Orion-LD.',
    hood: {
      method: 'POST',
      url: 'http://shopfloor-service:8085/commands/start-work-order',
      body: JSON.stringify({ work_order_id: 'urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly' }, null, 2),
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → POST /commands/start-work-order { work_order_id } → shopfloor-service',
      'shopfloor-service fetches WO → validates state=planned',
      'PATCH /ngsi-ld/v1/entities/{id}/attrs → state: in_progress, actualStart: <now>',
      'POST /ngsi-ld/v1/entities → ProductionEvent (eventType: work_order_started)',
    ],
    actionLabel: 'Start work order',
  },
  {
    id: 'query-work-orders-t07',
    title: 'Query work orders',
    shortDesc: 'GET /work-orders — see Assembly=in_progress',
    desc: 'After starting the Assembly work order, query all WorkOrders to see the state transition. Assembly is now in_progress; LeakTest and Packaging remain planned.',
    hood: {
      method: 'GET',
      url: 'http://scheduler-service:8084/work-orders',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /work-orders → scheduler-service:8084',
      'scheduler-service → GET /ngsi-ld/v1/entities?type=WorkOrder → Orion-LD',
      '3 work orders returned',
      'Assembly: state=in_progress, actualStart set · LeakTest/Packaging: state=planned',
    ],
    actionLabel: 'Query work orders',
  },
  {
    id: 'complete-work-order',
    title: 'Complete the Assembly work order',
    shortDesc: 'POST /commands/complete-work-order — in_progress → completed + ProductionEvent',
    desc: 'The complete-work-order command transitions the Assembly WorkOrder to completed, sets actualEnd, and creates a work_order_completed ProductionEvent with the actual quantity produced.',
    hood: {
      method: 'POST',
      url: 'http://shopfloor-service:8085/commands/complete-work-order',
      body: JSON.stringify({
        work_order_id: 'urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly',
        quantity_produced: 10,
      }, null, 2),
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → POST /commands/complete-work-order { work_order_id, quantity_produced } → shopfloor-service',
      'shopfloor-service fetches WO → validates state=in_progress',
      'PATCH /ngsi-ld/v1/entities/{id}/attrs → state: completed, actualEnd: <now>',
      'POST /ngsi-ld/v1/entities → ProductionEvent (eventType: work_order_completed, quantity: 10 EA)',
    ],
    actionLabel: 'Complete work order',
  },
  {
    id: 'query-production-events',
    title: 'Query production events',
    shortDesc: 'GET /production-events — inspect the work_order_completed ProductionEvent',
    desc: 'After completing the Assembly work order, one ProductionEvent entity exists in the broker capturing the completion: eventType, eventTime, quantity produced, and Relationships to the WorkOrder, WorkCenter, ManufacturingOrder, and Product.',
    hood: {
      method: 'GET',
      url: 'http://shopfloor-service:8085/production-events',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /production-events → shopfloor-service:8085',
      'shopfloor-service → GET /ngsi-ld/v1/entities?type=ProductionEvent → Orion-LD',
      '1 ProductionEvent returned: eventType=work_order_completed, quantity=10 EA',
      'Relationships: workOrder → WO-Assembly · workCenter → WC-Assembly · manufacturingOrder → MO-2024-001',
    ],
    actionLabel: 'Query production events',
  },
];

// ── Tutorial 08 mock entities ──────────────────────────────────────────────────

export const MOCK_PE_ASSEMBLY_STARTED = {
  id: 'urn:ngsi-ld:ProductionEvent:PE-WO-MO-2024-001-Assembly-started',
  type: 'ProductionEvent',
  eventType: { type: 'Property', value: 'work_order_started' },
  eventTime: { type: 'Property', value: '2024-07-01T08:05:00Z' },
  workOrder:         { type: 'Relationship', object: 'urn:ngsi-ld:WorkOrder:WO-MO-2024-001-Assembly' },
  workCenter:        { type: 'Relationship', object: 'urn:ngsi-ld:WorkCenter:WC-Assembly' },
  manufacturingOrder:{ type: 'Relationship', object: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  product:           { type: 'Relationship', object: 'urn:ngsi-ld:Product:HydraulicPump-P100' },
};

export const MOCK_WO_ASSEMBLY_COMPLETED = {
  ...MOCK_WO_ASSEMBLY,
  state:       { type: 'Property', value: 'completed' },
  actualStart: { type: 'Property', value: '2024-07-01T08:05:00Z' },
  actualEnd:   { type: 'Property', value: '2024-07-01T18:05:00Z' },
};

export const MOCK_WO_LEAK_TEST_COMPLETED = {
  ...MOCK_WO_LEAK_TEST,
  state:       { type: 'Property', value: 'completed' },
  actualStart: { type: 'Property', value: '2024-07-01T18:10:00Z' },
  actualEnd:   { type: 'Property', value: '2024-07-01T23:00:00Z' },
};

export const MOCK_WO_PACKAGING_COMPLETED = {
  ...MOCK_WO_PACKAGING,
  state:       { type: 'Property', value: 'completed' },
  actualStart: { type: 'Property', value: '2024-07-01T23:05:00Z' },
  actualEnd:   { type: 'Property', value: '2024-07-02T01:20:00Z' },
};

export const MOCK_MO_COMPLETED = {
  ...MOCK_MO_CONFIRMED,
  state:       { type: 'Property', value: 'completed' },
  completedAt: { type: 'Property', value: '2024-07-02T01:25:00Z' },
};

export const MOCK_SM_RECEIPT = {
  id: 'urn:ngsi-ld:StockMove:SM-MO-2024-001-receipt',
  type: 'StockMove',
  moveType:   { type: 'Property', value: 'receipt' },
  quantity:   { type: 'Property', value: 10, unitCode: 'EA' },
  state:      { type: 'Property', value: 'done' },
  actualDate: { type: 'Property', value: '2024-07-02T01:25:00Z' },
  origin:     { type: 'Property', value: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' },
  product:    { type: 'Relationship', object: 'urn:ngsi-ld:Product:HydraulicPump-P100' },
  toLocation: { type: 'Relationship', object: 'urn:ngsi-ld:StockLocation:WH-FINISHED' },
};

export const MOCK_IB_FINISHED = {
  id: 'urn:ngsi-ld:InventoryBalance:IB-HydraulicPump-P100-WH-FINISHED',
  type: 'InventoryBalance',
  quantityOnHand:    { type: 'Property', value: 10, unitCode: 'EA' },
  reservedQuantity:  { type: 'Property', value: 0, unitCode: 'EA' },
  availableQuantity: { type: 'Property', value: 10, unitCode: 'EA' },
  inventoryDate:     { type: 'Property', value: '2024-07-02T01:25:00Z' },
  state:             { type: 'Property', value: 'active' },
  product:           { type: 'Relationship', object: 'urn:ngsi-ld:Product:HydraulicPump-P100' },
  location:          { type: 'Relationship', object: 'urn:ngsi-ld:StockLocation:WH-FINISHED' },
};

export const TUTORIAL_08_ENTITIES = [MOCK_SM_RECEIPT, MOCK_IB_FINISHED];

// ── Tutorial 08 step definitions ───────────────────────────────────────────────

export const TUTORIAL_08_STEPS: GuidedStep[] = [
  {
    id: 'check-finished-goods-service',
    title: 'Verify finished goods service',
    shortDesc: 'Health-check the finished-goods-service (v0.8)',
    desc: 'Tutorial 08 introduces the finished-goods-service, which closes out a ManufacturingOrder by receiving its finished product into stock once every WorkOrder is done. This step confirms the new service is running and reachable.',
    hood: { method: 'GET', url: 'http://finished-goods-service:8086/health', expectedStatus: 200 },
    workflow: [
      'Emulator → GET /health → finished-goods-service:8086',
      'finished-goods-service verifies its own startup',
      'Returns { status: ok, service: finished-goods-service, version: 0.8.0 }',
    ],
    actionLabel: 'Check health',
  },
  {
    id: 'seed-t08-data',
    title: 'Load T08 seed data',
    shortDesc: 'Seed 30 entities: T07 context + 3 completed WorkOrders + 2 ProductionEvents',
    desc: 'Seeds Orion-LD with the full context for Tutorial 08: all T07 entities, but with the 3 WorkOrders for MO-2024-001 already transitioned to completed (Assembly, LeakTest, Packaging) and the two ProductionEvents recorded for the Assembly operation — ready for finished-goods receipt.',
    hood: {
      method: 'POST',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entityOperations/upsert',
      body: '30 entities  •  application/ld+json',
      expectedStatus: 201,
    },
    workflow: [
      'Gateway attaches @context URL to all 30 entity payloads',
      'POST /ngsi-ld/v1/entityOperations/upsert (application/ld+json) → Orion-LD (idempotent)',
      'T07 state: 28 entities, but Assembly/LeakTest/Packaging WorkOrders are now state: completed',
      'Plus 2 ProductionEvents for the Assembly operation (started + completed)',
    ],
    actionLabel: 'Seed entities',
  },
  {
    id: 'query-work-orders-t08',
    title: 'Query work orders',
    shortDesc: 'GET /work-orders — all three WorkOrders are completed',
    desc: 'Before receiving finished goods, confirm every WorkOrder for MO-2024-001 has reached the completed state — the precondition the finished-goods-service checks before closing out the order.',
    hood: {
      method: 'GET',
      url: 'http://scheduler-service:8084/work-orders',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /work-orders → scheduler-service:8084',
      'scheduler-service → GET /ngsi-ld/v1/entities?type=WorkOrder → Orion-LD',
      '3 work orders returned',
      'Assembly, LeakTest, Packaging: all state=completed',
    ],
    actionLabel: 'Query work orders',
  },
  {
    id: 'receive-finished-goods',
    title: 'Receive finished goods',
    shortDesc: 'POST /commands/receive-finished-goods — close out MO-2024-001',
    desc: 'The receive-finished-goods command validates that every WorkOrder for the ManufacturingOrder is completed, patches the MO to state=completed with a completedAt timestamp, creates a StockMove receipt into the finished-goods warehouse, and updates (or creates) the InventoryBalance for the finished product there.',
    hood: {
      method: 'POST',
      url: 'http://finished-goods-service:8086/commands/receive-finished-goods',
      body: JSON.stringify({ manufacturing_order_id: 'urn:ngsi-ld:ManufacturingOrder:MO-2024-001' }, null, 2),
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → POST /commands/receive-finished-goods { manufacturing_order_id } → finished-goods-service',
      'finished-goods-service fetches MO → fetches its WorkOrders → validates all state=completed',
      'PATCH /ngsi-ld/v1/entities/{moId}/attrs → state: completed, completedAt: <now>',
      'POST /ngsi-ld/v1/entityOperations/upsert → StockMove (moveType: receipt, toLocation: WH-FINISHED)',
      'GET/PATCH or POST /ngsi-ld/v1/entities → InventoryBalance (quantityOnHand += 10 EA)',
    ],
    actionLabel: 'Receive finished goods',
  },
  {
    id: 'query-manufacturing-order-t08',
    title: 'Query the manufacturing order',
    shortDesc: 'GET manufacturing order — state=completed',
    desc: 'After the receipt, MO-2024-001 shows state=completed with a completedAt timestamp — the production loop from confirmation through finished-goods receipt is now closed.',
    hood: {
      method: 'GET',
      url: 'http://orion-ld:1026/ngsi-ld/v1/entities/urn:ngsi-ld:ManufacturingOrder:MO-2024-001',
      expectedStatus: 200,
    },
    workflow: [
      'GET /ngsi-ld/v1/entities/urn:ngsi-ld:ManufacturingOrder:MO-2024-001 with Link: <context>',
      'Orion-LD returns compacted JSON-LD (short keys via @context)',
      'state: completed · completedAt: 2024-07-02T01:25:00Z',
    ],
    actionLabel: 'Inspect manufacturing order',
  },
  {
    id: 'query-stock-moves',
    title: 'Query production receipts',
    shortDesc: 'GET /production-receipts — inspect the finished-goods StockMove',
    desc: 'After the receipt, one StockMove entity exists capturing the finished-goods receipt: moveType=receipt, quantity=10 EA, destination=WH-FINISHED, with origin pointing back at the ManufacturingOrder for traceability.',
    hood: {
      method: 'GET',
      url: 'http://finished-goods-service:8086/production-receipts',
      expectedStatus: 200,
    },
    workflow: [
      'Emulator → GET /production-receipts → finished-goods-service:8086',
      'finished-goods-service → GET /ngsi-ld/v1/entities?type=StockMove → Orion-LD',
      '1 StockMove returned: moveType=receipt, quantity=10 EA, toLocation=WH-FINISHED',
      'origin → urn:ngsi-ld:ManufacturingOrder:MO-2024-001 (traceability back to the order)',
    ],
    actionLabel: 'Query production receipts',
  },
];
