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
