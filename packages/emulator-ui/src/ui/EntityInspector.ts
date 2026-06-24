import { bus, BUS } from '../services/EventBus.ts';
import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';
import { contextStore } from '../services/ContextStore.ts';
import { sendCommand } from '../services/CommandClient.ts';

export class EntityInspector {
  private el: HTMLElement;
  private selectedId: string | null = null;
  private lastList: NgsiLdEntity[] | null = null;
  private showRaw = false;
  private entityHistory: NgsiLdEntity[] = [];

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`EntityInspector: #${containerId} not found`);
    this.el = el;

    bus.on<string>(BUS.ENTITY_SELECTED, (entityId) => {
      this.lastList = null;
      this.showRaw = false;
      this.selectedId = entityId;
      this.entityHistory = [];
      this.loadAndShow(entityId);
    });

    bus.on<NgsiLdEntity[]>(BUS.ENTITIES_LISTED, (entities) => {
      this.lastList = entities;
      this.showRaw = false;
      this.showList(entities);
    });

    bus.on<NgsiLdEntity>(BUS.ENTITY_CHANGED, (entity) => {
      if (entity.id === this.selectedId) this.show(entity);
    });

    bus.on<void>(BUS.SCENARIO_RESET, () => {
      this.lastList = null;
      this.selectedId = null;
      this.showRaw = false;
      this.entityHistory = [];
      this.clear();
    });

    this.clear();
  }

  private async loadAndShow(entityId: string): Promise<void> {
    const cached = contextStore.get(entityId);
    if (cached) { this.show(cached); return; }
    try {
      const res = await fetch(`/api/entities/${encodeURIComponent(entityId)}`);
      if (res.ok) this.show((await res.json()) as NgsiLdEntity);
    } catch {
      this.showError(entityId);
    }
  }

  private show(entity: NgsiLdEntity): void {
    const typeColor = TYPE_COLOR[entity.type] ?? '#64748b';

    let backBtn = '';
    if (this.entityHistory.length > 0) {
      const prev = this.entityHistory[this.entityHistory.length - 1];
      const prevShort = prev.id.split(':').pop() ?? prev.id;
      backBtn = `<button id="inspector-back" class="btn-inspector-nav">← ${prevShort}</button>`;
    } else if (this.lastList) {
      backBtn = `<button id="inspector-back" class="btn-inspector-nav">← Back to list</button>`;
    }

    this.el.innerHTML = `
      ${backBtn}
      <div class="inspector-type-row">
        <button class="inspector-type-badge" style="color:${typeColor};border-color:${typeColor};background:${typeColor}18"
          data-type="${entity.type}">${entity.type}</button>
        <label class="inspector-raw-toggle">
          <input type="checkbox" id="inspector-raw-cb" ${this.showRaw ? 'checked' : ''}> Raw JSON-LD
        </label>
      </div>
      <div class="inspector-id">${entity.id}</div>
      <div id="inspector-attrs">${
        this.showRaw ? this.renderRaw(entity) : this.renderFormatted(entity, typeColor)
      }</div>
    `;

    // Back: pop entity history or return to list
    this.el.querySelector('#inspector-back')?.addEventListener('click', () => {
      if (this.entityHistory.length > 0) {
        const prev = this.entityHistory.pop()!;
        this.showRaw = false;
        this.show(prev);
      } else if (this.lastList) {
        this.showList(this.lastList);
      }
    });

    // Type badge → data model
    this.el.querySelector('.inspector-type-badge')?.addEventListener('click', () => {
      this.showDataModel(entity.type, typeColor, entity);
    });

    // Raw JSON-LD toggle
    const attrsEl = this.el.querySelector<HTMLElement>('#inspector-attrs');
    this.el.querySelector('#inspector-raw-cb')?.addEventListener('change', (e) => {
      this.showRaw = (e.target as HTMLInputElement).checked;
      if (attrsEl) {
        attrsEl.innerHTML = this.showRaw ? this.renderRaw(entity) : this.renderFormatted(entity, typeColor);
        if (!this.showRaw) this.wireRelLinks(attrsEl, entity);
      }
    });

    // Relationship navigation
    if (attrsEl && !this.showRaw) this.wireRelLinks(attrsEl, entity);

    this.updateCommandPanel(entity);
  }

  private wireRelLinks(container: HTMLElement, fromEntity: NgsiLdEntity): void {
    container.querySelectorAll<HTMLButtonElement>('.attr-rel-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        const relId = btn.dataset['relId'];
        if (!relId) return;
        this.entityHistory.push(fromEntity);
        this.showRaw = false;
        const cached = contextStore.get(relId);
        if (cached) { this.show(cached); return; }
        this.loadAndShow(relId);
      });
    });
  }

  private renderFormatted(entity: NgsiLdEntity, typeColor: string): string {
    const rows: string[] = [];
    for (const [k, v] of Object.entries(entity)) {
      if (k === 'id' || k === 'type' || k === '@context') continue;
      const val = v as { type?: string; value?: unknown; object?: string };
      let valueHtml: string;
      if (val?.type === 'Property') {
        valueHtml = `<span class="attr-value-prop">${JSON.stringify(val.value)}</span>`;
      } else if (val?.type === 'Relationship') {
        const obj = String(val.object ?? '');
        const target = obj.split(':').pop() ?? obj;
        valueHtml = `<button class="attr-rel-link" data-rel-id="${obj}">→ ${target}</button>`;
      } else {
        valueHtml = `<span class="attr-value-other">${JSON.stringify(v)}</span>`;
      }
      rows.push(`<div class="attr-row">
        <span class="attr-name" style="color:${typeColor}">${k}</span>${valueHtml}
      </div>`);
    }
    return `<div class="attr-table">${rows.join('')}</div>`;
  }

  private renderRaw(entity: NgsiLdEntity): string {
    return `<pre class="inspector-json-raw">${JSON.stringify(entity, null, 2)}</pre>`;
  }

  private showDataModel(type: string, typeColor: string, fromEntity: NgsiLdEntity): void {
    renderDataModel(this.el, type, typeColor, () => this.show(fromEntity));
  }

  private showList(entities: NgsiLdEntity[]): void {
    this.lastList = entities;
    this.entityHistory = [];
    if (!entities.length) { this.clear(); return; }

    const typeColor = TYPE_COLOR[entities[0].type] ?? '#64748b';
    const items = entities.map((e) => {
      const shortId = e.id.split(':').pop() ?? e.id;
      const name = (e['name'] as { value?: string } | undefined)?.value ?? shortId;
      return `<div class="entity-list-item" data-id="${e.id}">
        <span class="entity-list-type" style="color:${typeColor};border-color:${typeColor};background:${typeColor}18">${e.type}</span>
        <span class="entity-list-name">${name}</span>
        <span class="entity-list-id">${shortId}</span>
      </div>`;
    }).join('');

    this.el.innerHTML = `
      <button class="inspector-type-badge" style="color:${typeColor};border-color:${typeColor};background:${typeColor}18;margin-bottom:6px;display:inline-flex" data-type="${entities[0].type}">${entities[0].type}</button>
      <div class="inspector-id" style="margin-bottom:8px">${entities.length} entities — click one to inspect</div>
      ${items}
    `;

    this.el.querySelector<HTMLButtonElement>('.inspector-type-badge')?.addEventListener('click', () => {
      renderDataModel(this.el, entities[0].type, typeColor, () => this.showList(entities));
    });

    this.el.querySelectorAll<HTMLElement>('.entity-list-item').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.dataset['id'];
        if (!id) return;
        this.selectedId = id;
        const cached = contextStore.get(id);
        if (cached) { this.show(cached); return; }
        this.loadAndShow(id);
      });
    });

    const panel = document.getElementById('command-panel-actions');
    if (panel) panel.innerHTML = '';
  }

  private updateCommandPanel(entity: NgsiLdEntity): void {
    const panel = document.getElementById('command-panel-actions');
    if (!panel) return;
    const commands = this.relevantCommands(entity.type,
      (entity['state'] as { value?: string } | undefined)?.value ?? '');
    panel.innerHTML = '';
    for (const cmd of commands) {
      const btn = document.createElement('button');
      btn.className = `btn btn-${cmd.color}`;
      btn.textContent = cmd.label;
      btn.onclick = () => sendCommand(cmd.commandName, { targetEntity: entity.id }).catch(console.error);
      panel.appendChild(btn);
    }
  }

  private relevantCommands(type: string, state: string): { label: string; commandName: string; color: string }[] {
    if (type === 'WorkOrder') {
      if (state === 'ready')      return [{ label: 'Start WO',  commandName: 'work-orders.start',  color: 'green' }];
      if (state === 'inProgress') return [{ label: 'Finish WO', commandName: 'work-orders.finish', color: 'green' },
                                          { label: 'Pause',     commandName: 'work-orders.pause',  color: 'amber' }];
    }
    if (type === 'ManufacturingOrder') {
      if (state === 'draft')     return [{ label: 'Confirm MO',         commandName: 'manufacturing-orders.confirm',  color: 'blue' }];
      if (state === 'confirmed') return [{ label: 'Reserve components', commandName: 'inventory.reserve-components', color: 'blue' }];
    }
    return [];
  }

  clear(): void {
    this.el.innerHTML = '<p class="inspector-empty">Click a zone on the canvas or run a step to inspect an NGSI-LD entity.</p>';
    const panel = document.getElementById('command-panel-actions');
    if (panel) panel.innerHTML = '';
  }

  private showError(entityId: string): void {
    this.el.innerHTML = `<p class="inspector-empty">Could not load: ${entityId}</p>`;
  }
}

// ── Type → display color ──────────────────────────────────────────────────────

export const TYPE_COLOR: Record<string, string> = {
  Company:               '#7c3aed',
  Plant:                 '#0284c7',
  WorkCenter:            '#2563eb',
  Product:               '#d97706',
  StockLocation:         '#16a34a',
  InventoryBalance:      '#0e7490',
  StockMove:             '#0369a1',
  Lot:                   '#065f46',
  BillOfMaterials:       '#b45309',
  BillOfMaterialsLine:   '#92400e',
  WorkOrder:             '#dc2626',
  ManufacturingOrder:    '#9333ea',
};

// ── NGSI-LD data models for Tutorial 01 entity types ─────────────────────────

interface AttrDef {
  name: string;
  ngsiType: 'Property' | 'Relationship';
  valueType: string;          // short: "Text", "Number", "Boolean", "Plant"
  xsdType: string;            // e.g. "xsd:string", "xsd:float", "xsd:boolean", "URI"
  desc: string;               // one-line description for the table
  semantic: string;           // full semantic meaning for the tooltip
  structure?: string;         // internal JSON structure note for complex types (omit if simple scalar)
}
interface ModelDef { description: string; attrs: AttrDef[]; }

const DATA_MODELS: Record<string, ModelDef> = {
  Company: {
    description: 'A legal entity (manufacturer or supplier) that owns one or more Plants. Root of the ownership graph.',
    attrs: [
      { name: 'name',        ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'Display name',             semantic: 'Human-readable name of the company as it appears in documents and reports.',                                    },
      { name: 'companyCode', ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'Short identifier',         semantic: 'Short alphanumeric code used in system identifiers and as a namespace prefix (e.g. HPC).', },
      { name: 'state',       ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'active | inactive',        semantic: 'Lifecycle state. Only active companies can own active Plants. Changing to inactive cascades to scheduling rules.', structure: 'Enum: "active" | "inactive"' },
    ],
  },
  Plant: {
    description: 'A physical manufacturing site. Contains WorkCenters and StockLocations. Belongs to exactly one Company.',
    attrs: [
      { name: 'name',      ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'Display name',     semantic: 'Human-readable name of the plant site (e.g. "Barcelona Plant").', },
      { name: 'plantCode', ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'Site code',        semantic: 'Short uppercase code for the site used in Work Order IDs and stock location codes (e.g. BCN).', },
      { name: 'timezone',  ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'IANA timezone',    semantic: 'IANA timezone string (e.g. Europe/Madrid). Used by the scheduler to convert shift times and MRP due-dates to UTC.',  structure: 'IANA timezone database name, e.g. "Europe/Madrid"' },
      { name: 'state',     ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'active | inactive', semantic: 'Lifecycle state. Inactive plants are excluded from scheduling and capacity planning.', structure: 'Enum: "active" | "inactive"' },
      { name: 'ownedBy',   ngsiType: 'Relationship', valueType: 'Company', xsdType: 'URI',         desc: 'Owning company',   semantic: 'NGSI-LD Relationship pointing to the Company entity that owns this plant. Mandatory — a plant without an owner cannot be used in production orders.', },
    ],
  },
  WorkCenter: {
    description: 'A production resource (machine, assembly cell, test bench) that can execute manufacturing operations. The scheduler assigns Work Orders to WorkCenters based on capacity and efficiency.',
    attrs: [
      { name: 'name',           ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'Display name',               semantic: 'Human-readable label for this resource shown on the factory canvas and work order routing.', },
      { name: 'code',           ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'Short code',                  semantic: 'Unique alphanumeric code within the plant (e.g. WC-ASM). Used as a key in routing operations and capacity checks.', },
      { name: 'state',          ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'active | unavailable | …',    semantic: 'Operational state of the resource. "unavailable" blocks scheduling; "maintenance" allows pre-planned downtime to be recorded.', structure: 'Enum: "active" | "unavailable" | "maintenance"' },
      { name: 'capacity',       ngsiType: 'Property',     valueType: 'Number',  xsdType: 'xsd:integer', desc: 'Max concurrent operations',   semantic: 'Number of Work Orders that can run in parallel on this resource. Used by the scheduler to prevent over-booking.', },
      { name: 'timeEfficiency', ngsiType: 'Property',     valueType: 'Number',  xsdType: 'xsd:float',   desc: 'Efficiency fraction 0–1',     semantic: 'Ratio of productive run-time to total available time. The scheduler multiplies planned operation times by (1 / timeEfficiency) to get realistic lead-time estimates.', },
      { name: 'costPerHour',    ngsiType: 'Property',     valueType: 'Number',  xsdType: 'xsd:float',   desc: 'Operating cost €/h',          semantic: 'Variable operating cost per hour. Used by the cost-roll-up engine to compute the manufacturing cost of a finished product.', },
      { name: 'oeeTarget',      ngsiType: 'Property',     valueType: 'Number',  xsdType: 'xsd:float',   desc: 'Target OEE fraction 0–1',     semantic: 'Target Overall Equipment Effectiveness. Combines availability, performance and quality. Reported against in the KPI dashboard (Tutorial 08+).', },
      { name: 'locatedIn',      ngsiType: 'Relationship', valueType: 'Plant',   xsdType: 'URI',         desc: 'Host plant',                  semantic: 'NGSI-LD Relationship to the Plant entity that contains this resource. Determines which capacity pool it belongs to for multi-plant scheduling.', },
    ],
  },
  Product: {
    description: 'An item the factory manufactures or purchases. Products are the nodes of the Bill of Materials (BOM) graph. Tutorial 01 has 1 manufactured product (HydraulicPump-P100) and 4 purchased components.',
    attrs: [
      { name: 'name',           ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'Display name',                semantic: 'Human-readable product name as it appears in Manufacturing Orders and inventory reports.', },
      { name: 'sku',            ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'Stock-keeping unit',          semantic: 'Unique alphanumeric stock code used in purchase orders, goods receipts, and inventory transactions.', },
      { name: 'productType',    ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'manufactured | purchased | …', semantic: 'Determines whether this product is made in-house (triggers MRP explosion into Work Orders) or bought externally (triggers purchase requisition).', structure: 'Enum: "manufactured" | "purchased" | "phantom"' },
      { name: 'trackingPolicy', ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string',  desc: 'none | lot | serial',         semantic: 'Controls inventory tracking granularity. "serial" requires a unique ID per unit; "lot" groups units by batch; "none" tracks only quantities.', structure: 'Enum: "none" | "lot" | "serial"' },
      { name: 'standardCost',   ngsiType: 'Property',     valueType: 'Number',  xsdType: 'xsd:float',   desc: 'Standard cost €',             semantic: 'Pre-defined cost used for inventory valuation and variance analysis. Updated by the cost-roll-up engine when BOM or routing changes.', },
      { name: 'active',         ngsiType: 'Property',     valueType: 'Boolean', xsdType: 'xsd:boolean', desc: 'Active flag',                 semantic: 'Inactive products are excluded from MRP planning, BOM explosion, and new Manufacturing Orders. Existing WOs in progress are not affected.', },
      { name: 'company',        ngsiType: 'Relationship', valueType: 'Company', xsdType: 'URI',         desc: 'Owning company',              semantic: 'NGSI-LD Relationship to the Company that owns this product definition. Controls which plants can use it in production.', },
    ],
  },
  StockLocation: {
    description: 'A physical or logical storage zone within a Plant. Inventory movements between StockLocations are tracked as journal entries. Tutorial 01 has WH-STOCK (raw materials) and WH-FINISHED (finished goods).',
    attrs: [
      { name: 'name',         ngsiType: 'Property',     valueType: 'Text',  xsdType: 'xsd:string', desc: 'Display name',                semantic: 'Human-readable label shown on the factory canvas and inventory reports.', },
      { name: 'locationCode', ngsiType: 'Property',     valueType: 'Text',  xsdType: 'xsd:string', desc: 'Short code',                  semantic: 'Unique alphanumeric code within the plant (e.g. WH-STOCK). Used as a key in inventory reservation and goods movements.', },
      { name: 'locationType', ngsiType: 'Property',     valueType: 'Text',  xsdType: 'xsd:string', desc: 'internal | external | virtual', semantic: 'Classification of the storage zone. "internal" is a physical location in the plant; "external" is a supplier/customer site; "virtual" is a logical holding area (e.g. WIP in-transit).', structure: 'Enum: "internal" | "external" | "virtual"' },
      { name: 'state',        ngsiType: 'Property',     valueType: 'Text',  xsdType: 'xsd:string', desc: 'active | inactive',           semantic: 'Inactive locations are excluded from inventory reservations and MRP supply proposals.', structure: 'Enum: "active" | "inactive"' },
      { name: 'locatedIn',    ngsiType: 'Relationship', valueType: 'Plant', xsdType: 'URI',        desc: 'Host plant',                  semantic: 'NGSI-LD Relationship to the Plant that contains this storage zone. Determines which plant\'s inventory pool it contributes to.', },
    ],
  },
  InventoryBalance: {
    description: 'Current on-hand quantity of a Product at a StockLocation. Updated by every committed StockMove. When lot-tracked, a separate balance exists per lot.',
    attrs: [
      { name: 'quantityOnHand',    ngsiType: 'Property',          valueType: 'Number',         xsdType: 'xsd:float',   desc: 'Physical stock',      semantic: 'Total units physically present at the location, regardless of reservations. Increases on receipt, decreases on issue or transfer out.' },
      { name: 'reservedQuantity',  ngsiType: 'Property',          valueType: 'Number',         xsdType: 'xsd:float',   desc: 'Committed to orders', semantic: 'Quantity committed to open Manufacturing Orders or pending transfers. Cannot exceed quantityOnHand. Updated by the reservation engine (Tutorial 05+).' },
      { name: 'availableQuantity', ngsiType: 'Property',          valueType: 'Number',         xsdType: 'xsd:float',   desc: 'Free to use',         semantic: 'quantityOnHand minus reservedQuantity. The MRP planner uses this to determine whether a component shortage exists before scheduling a new production order.' },
      { name: 'inventoryDate',     ngsiType: 'Property',          valueType: 'DateTime',       xsdType: 'xsd:dateTime',desc: 'Last updated at',     semantic: 'ISO 8601 timestamp of the last balance update. Enables stale-stock detection and audit queries.' },
      { name: 'state',             ngsiType: 'Property',          valueType: 'Text',           xsdType: 'xsd:string',  desc: 'active | frozen',     semantic: 'active: normal; frozen: location is under inventory count — no movements are allowed until counting completes.', structure: 'Enum: "active" | "frozen"' },
      { name: 'product',           ngsiType: 'Relationship',      valueType: 'Product',        xsdType: 'URI',         desc: 'Tracked product',     semantic: 'NGSI-LD Relationship to the Product whose quantity is tracked by this balance record.' },
      { name: 'location',          ngsiType: 'Relationship',      valueType: 'StockLocation',  xsdType: 'URI',         desc: 'Storage zone',        semantic: 'NGSI-LD Relationship to the StockLocation where the stock physically resides.' },
      { name: 'lot',               ngsiType: 'Relationship',      valueType: 'Lot',            xsdType: 'URI',         desc: 'Lot reference',       semantic: 'Present only when the product is lot-tracked. Links the balance to a specific Lot entity, enabling queries like "how much of lot LOT-240001 is still in WH-STOCK?"' },
    ],
  },
  StockMove: {
    description: 'Auditable record of a single inventory movement. Created by the inventory-service for every receipt, issue, or transfer. Reaching state "done" triggers a balance update.',
    attrs: [
      { name: 'moveType',   ngsiType: 'Property',     valueType: 'Text',         xsdType: 'xsd:string',  desc: 'receipt | issue | …', semantic: 'Category of movement. receipt: goods in from supplier; issue: components consumed by production; transfer: relocation within the plant; adjustment: inventory count correction; scrap: write-off.', structure: 'Enum: "receipt" | "issue" | "transfer" | "adjustment" | "scrap"' },
      { name: 'quantity',   ngsiType: 'Property',     valueType: 'Number',       xsdType: 'xsd:float',   desc: 'Quantity moved',      semantic: 'Absolute quantity moved. Always positive — direction is implied by moveType and fromLocation/toLocation.' },
      { name: 'state',      ngsiType: 'Property',     valueType: 'Text',         xsdType: 'xsd:string',  desc: 'draft | done | …',    semantic: 'done: movement committed, balances updated; draft: created but not validated; cancelled: voided, no balance impact.', structure: 'Enum: "draft" | "done" | "cancelled"' },
      { name: 'actualDate', ngsiType: 'Property',     valueType: 'DateTime',     xsdType: 'xsd:dateTime',desc: 'When it happened',    semantic: 'ISO 8601 timestamp of the physical movement. Used for stock valuation (FIFO/LIFO) and expiry date calculations.' },
      { name: 'origin',     ngsiType: 'Property',     valueType: 'Text',         xsdType: 'xsd:string',  desc: 'Source document',     semantic: 'Free-text reference to the originating document (e.g. PO-2024-001, MO-BCN-0042). Provides the audit link back to the business transaction.' },
      { name: 'product',    ngsiType: 'Relationship', valueType: 'Product',      xsdType: 'URI',         desc: 'Product moved',       semantic: 'NGSI-LD Relationship to the Product being moved.' },
      { name: 'fromLocation', ngsiType: 'Relationship', valueType: 'StockLocation', xsdType: 'URI',      desc: 'Source location',     semantic: 'Origin StockLocation. Absent for supplier receipts (goods originate outside the system).' },
      { name: 'toLocation', ngsiType: 'Relationship', valueType: 'StockLocation', xsdType: 'URI',        desc: 'Destination location', semantic: 'Destination StockLocation. Always present.' },
      { name: 'lot',        ngsiType: 'Relationship', valueType: 'Lot',          xsdType: 'URI',         desc: 'Lot reference',       semantic: 'Present only when the product is lot-tracked. Links the move to a specific batch.' },
    ],
  },
  Lot: {
    description: 'A traceable batch of product received from a supplier or produced in-house. Only products with trackingPolicy "lot" or "serial" carry lot references.',
    attrs: [
      { name: 'lotCode',       ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string', desc: 'Lot/batch number',   semantic: 'Human-readable batch number assigned by the supplier or production system. Must be unique within the scope of a product.' },
      { name: 'expirationDate', ngsiType: 'Property',    valueType: 'Date',    xsdType: 'xsd:date',   desc: 'Use-by date',        semantic: 'ISO 8601 date after which the lot must not be issued to production. The inventory-service blocks receipts to manufacturing after this date.' },
      { name: 'origin',        ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string', desc: 'Source',             semantic: 'Supplier name or Manufacturing Order that produced this lot. First link in the traceability chain from raw material to finished good.' },
      { name: 'qualityStatus', ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string', desc: 'approved | quarantine | …', semantic: 'Quality disposition. Only "approved" lots may be issued to production. "quarantine" holds the lot for investigation; "rejected" blocks it permanently.', structure: 'Enum: "pending" | "approved" | "quarantine" | "rejected"' },
      { name: 'state',         ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string', desc: 'active | consumed | expired', semantic: 'Lifecycle state. "consumed" when all stock of this lot has been issued or scrapped; "expired" when past expirationDate.', structure: 'Enum: "active" | "consumed" | "expired"' },
      { name: 'product',       ngsiType: 'Relationship', valueType: 'Product', xsdType: 'URI',        desc: 'Product',            semantic: 'NGSI-LD Relationship to the Product this lot belongs to. All InventoryBalance records for this lot reference the same product.' },
    ],
  },
  BillOfMaterials: {
    description: 'Header of a Bill of Materials: defines which BOM version applies to a finished product. A product can have multiple BOMs (e.g. different versions), but only one may be "active" at a time.',
    attrs: [
      { name: 'bomCode',  ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string', desc: 'BOM identifier',             semantic: 'Unique alphanumeric code for this BOM (e.g. BOM-HP-P100-v1). Used as a human reference in manufacturing orders and reports.' },
      { name: 'bomType',  ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string', desc: 'manufacturing | kitting | phantom', semantic: '"manufacturing" BOMs are used for production orders. "kitting" groups items for assembly without routing. "phantom" BOMs are exploded through during MRP without generating production orders.', structure: 'Enum: "manufacturing" | "kitting" | "phantom"' },
      { name: 'version',  ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string', desc: 'Version label',              semantic: 'Human-readable version string (e.g. "1.0", "2.1-ECO-007"). Enables change management: new versions can be drafted while the previous remains active.' },
      { name: 'state',    ngsiType: 'Property',     valueType: 'Text',    xsdType: 'xsd:string', desc: 'active | draft | obsolete',  semantic: 'Only one BOM per product may be "active" — this is the one used by bom-service for explosion. "draft" allows editing; "obsolete" retains history.', structure: 'Enum: "active" | "draft" | "obsolete"' },
      { name: 'product',  ngsiType: 'Relationship', valueType: 'Product', xsdType: 'URI',        desc: 'Finished product',           semantic: 'NGSI-LD Relationship to the Product that is the output of this BOM. The bom-service uses this to resolve "which BOM applies to this production order?".' },
      { name: 'company',  ngsiType: 'Relationship', valueType: 'Company', xsdType: 'URI',        desc: 'Owning company',             semantic: 'NGSI-LD Relationship to the Company that owns this BOM definition. Scopes access in multi-tenant deployments.' },
    ],
  },
  BillOfMaterialsLine: {
    description: 'One component line within a Bill of Materials. Each line specifies a required quantity of a purchased or manufactured component. The full set of lines for a BOM defines the recipe for the finished product.',
    attrs: [
      { name: 'sequence',    ngsiType: 'Property',     valueType: 'Number',  xsdType: 'xsd:integer', desc: 'Line order',             semantic: 'Integer sequence number that determines the display and pick order. Lower numbers appear first. Gaps are allowed (10, 20, 30) to ease future insertion.' },
      { name: 'quantity',    ngsiType: 'Property',     valueType: 'Number',  xsdType: 'xsd:float',   desc: 'Required qty per unit',  semantic: 'Quantity of the component needed to produce one unit of the finished product. Multiplied by the production order quantity during explosion: required = line_qty × order_qty.' },
      { name: 'scrapFactor', ngsiType: 'Property',     valueType: 'Number',  xsdType: 'xsd:float',   desc: 'Waste factor 0–1',       semantic: 'Expected scrap rate for this component during production (e.g. 0.02 = 2%). Informational in Tutorial 03 — applied to gross requirements starting in Tutorial 10 MRP planning.' },
      { name: 'bom',         ngsiType: 'Relationship', valueType: 'BillOfMaterials',    xsdType: 'URI', desc: 'Parent BOM header', semantic: 'NGSI-LD Relationship to the BillOfMaterials header this line belongs to. Used to filter lines when exploding a specific BOM.' },
      { name: 'component',   ngsiType: 'Relationship', valueType: 'Product', xsdType: 'URI',         desc: 'Component product',      semantic: 'NGSI-LD Relationship to the Product entity that is the component. Can be a purchased part or a manufactured sub-assembly (triggers recursive explosion in MRP).' },
    ],
  },
};

// ── Shared data-model rendering (used by EntityInspector and BrokerExplorer) ─

function buildRawTemplate(type: string, model: ModelDef | undefined): string {
  if (!model) return `{ "type": "${type}" }`;
  const attrs: Record<string, unknown> = { id: `urn:ngsi-ld:${type}:example`, type };
  for (const a of model.attrs) {
    if (a.ngsiType === 'Property') {
      const val = a.xsdType === 'xsd:float' || a.xsdType === 'xsd:integer' ? 0
        : a.xsdType === 'xsd:boolean' ? true
        : `<${a.valueType}>`;
      attrs[a.name] = { type: 'Property', value: val };
    } else {
      attrs[a.name] = { type: 'Relationship', object: `urn:ngsi-ld:${a.valueType}:*` };
    }
  }
  attrs['@context'] = 'https://uri.fiware.org/ns/data-models';
  return JSON.stringify(attrs, null, 2);
}

function attachAttrTooltips(el: HTMLElement, model: ModelDef | undefined): void {
  if (!model) return;
  const tooltip = document.getElementById('attr-tooltip');
  if (!tooltip) return;

  el.querySelectorAll<HTMLElement>('[data-attr-idx]').forEach((cell) => {
    const idx = parseInt(cell.dataset['attrIdx'] ?? '0', 10);
    const attr = model.attrs[idx];
    if (!attr) return;

    cell.style.cursor = 'help';
    cell.style.borderBottom = '1px dashed currentColor';

    cell.addEventListener('mouseenter', () => {
      const nameEl   = tooltip.querySelector<HTMLElement>('#at-name');
      const semEl    = tooltip.querySelector<HTMLElement>('#at-semantic');
      const typeEl   = tooltip.querySelector<HTMLElement>('#at-type');
      const structEl = tooltip.querySelector<HTMLElement>('#at-structure');
      const structRow = tooltip.querySelector<HTMLElement>('#at-structure-row');

      if (nameEl)    nameEl.textContent   = attr.name;
      if (semEl)     semEl.textContent    = attr.semantic;
      if (typeEl)    typeEl.textContent   = `${attr.ngsiType} (${attr.xsdType})`;
      if (structEl)  structEl.textContent = attr.structure ?? 'Scalar value — no internal structure.';
      if (structRow) structRow.style.display = 'flex';

      tooltip.classList.remove('hidden');
      const rect = cell.getBoundingClientRect();
      const tw = tooltip.offsetWidth || 290;
      const th = tooltip.offsetHeight || 120;
      const left = Math.min(rect.right + 8, window.innerWidth - tw - 8);
      tooltip.style.left = `${Math.max(8, left)}px`;
      tooltip.style.top  = `${Math.max(8, rect.top - th / 2)}px`;
    });

    cell.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
    });
  });
}

export function renderDataModel(
  el: HTMLElement,
  type: string,
  typeColor: string,
  backFn: () => void,
): void {
  const model = DATA_MODELS[type];
  const template = buildRawTemplate(type, model);

  const rows = model
    ? model.attrs.map((a, idx) => `
        <tr>
          <td class="dm-attr-name" style="color:${typeColor}" data-attr-idx="${idx}">${a.name}</td>
          <td class="${a.ngsiType === 'Relationship' ? 'dm-ngsi-rel' : 'dm-ngsi-prop'}">${a.ngsiType}</td>
          <td class="dm-value-type">${a.valueType}<br><span style="color:#94a3b8;font-size:9px">${a.xsdType}</span></td>
          <td class="dm-desc">${a.desc}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="color:#94a3b8">No data model defined for this type.</td></tr>';

  el.innerHTML = `
    <button id="dm-back" class="btn-inspector-nav">← Back</button>
    <div class="inspector-type-row" style="margin-top:8px">
      <span class="inspector-type-badge" style="color:${typeColor};border-color:${typeColor};background:${typeColor}18">${type}</span>
      <label class="inspector-raw-toggle">
        <input type="checkbox" id="dm-raw-cb"> Raw NGSI-LD template
      </label>
    </div>
    ${model ? `<p class="dm-desc">${model.description}</p>` : ''}
    <div id="dm-content">
      <div style="overflow-x:auto">
        <table class="data-model-table">
          <thead><tr>
            <th>Attribute</th><th>NGSI-LD type</th><th>Value type</th><th>Description</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  el.querySelector('#dm-back')?.addEventListener('click', backFn);

  const dmContent = el.querySelector<HTMLElement>('#dm-content');
  el.querySelector('#dm-raw-cb')?.addEventListener('change', (e) => {
    const raw = (e.target as HTMLInputElement).checked;
    if (!dmContent) return;
    if (raw) {
      dmContent.innerHTML = `<pre class="inspector-json-raw">${template}</pre>`;
    } else {
      dmContent.innerHTML = `<div style="overflow-x:auto"><table class="data-model-table">
        <thead><tr><th>Attribute</th><th>NGSI-LD type</th><th>Value type</th><th>Description</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
      attachAttrTooltips(el, model);
    }
  });

  attachAttrTooltips(el, model);
}
