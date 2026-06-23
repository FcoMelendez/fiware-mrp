import { bus, BUS } from '../services/EventBus.ts';
import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';
import { contextStore } from '../services/ContextStore.ts';
import { sendCommand } from '../services/CommandClient.ts';

export class EntityInspector {
  private el: HTMLElement;
  private selectedId: string | null = null;
  private lastList: NgsiLdEntity[] | null = null;
  private showRaw = false;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`EntityInspector: #${containerId} not found`);
    this.el = el;

    bus.on<string>(BUS.ENTITY_SELECTED, (entityId) => {
      this.lastList = null;
      this.showRaw = false;
      this.selectedId = entityId;
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
    const backBtn = this.lastList
      ? `<button id="inspector-back" class="btn-inspector-nav">← Back to list</button>`
      : '';

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

    // Back to list
    if (this.lastList) {
      const list = this.lastList;
      this.el.querySelector('#inspector-back')?.addEventListener('click', () => this.showList(list));
    }

    // Type badge → data model
    this.el.querySelector('.inspector-type-badge')?.addEventListener('click', () => {
      this.showDataModel(entity.type, typeColor, entity);
    });

    // Raw JSON-LD toggle
    this.el.querySelector('#inspector-raw-cb')?.addEventListener('change', (e) => {
      this.showRaw = (e.target as HTMLInputElement).checked;
      const attrsEl = this.el.querySelector<HTMLElement>('#inspector-attrs');
      if (attrsEl) attrsEl.innerHTML = this.showRaw ? this.renderRaw(entity) : this.renderFormatted(entity, typeColor);
    });

    this.updateCommandPanel(entity);
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
        const target = String(val.object).split(':').pop();
        valueHtml = `<span class="attr-value-rel">→ ${target}</span>`;
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
    const model = DATA_MODELS[type];
    const template = this.buildRawTemplate(type, model);

    const rows = model
      ? model.attrs.map((a, idx) => `
          <tr>
            <td class="dm-attr-name" style="color:${typeColor}" data-attr-idx="${idx}">${a.name}</td>
            <td class="${a.ngsiType === 'Relationship' ? 'dm-ngsi-rel' : 'dm-ngsi-prop'}">${a.ngsiType}</td>
            <td class="dm-value-type">${a.valueType}<br><span style="color:#94a3b8;font-size:9px">${a.xsdType}</span></td>
            <td class="dm-desc">${a.desc}</td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="color:#94a3b8">No data model defined for this type.</td></tr>';

    this.el.innerHTML = `
      <button id="inspector-back-model" class="btn-inspector-nav">← Back to entity</button>
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

    // Back button
    this.el.querySelector('#inspector-back-model')?.addEventListener('click', () => {
      this.show(fromEntity);
    });

    // Raw template toggle
    const dmContent = this.el.querySelector<HTMLElement>('#dm-content');
    this.el.querySelector('#dm-raw-cb')?.addEventListener('change', (e) => {
      const raw = (e.target as HTMLInputElement).checked;
      if (!dmContent) return;
      if (raw) {
        dmContent.innerHTML = `<pre class="inspector-json-raw">${template}</pre>`;
      } else {
        dmContent.innerHTML = `<div style="overflow-x:auto"><table class="data-model-table">
          <thead><tr><th>Attribute</th><th>NGSI-LD type</th><th>Value type</th><th>Description</th></tr></thead>
          <tbody>${rows}</tbody></table></div>`;
        this.attachAttrTooltips(model);
      }
    });

    // Attribute hover tooltips (for the table view)
    this.attachAttrTooltips(model);
  }

  private buildRawTemplate(type: string, model: ModelDef | undefined): string {
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

  private attachAttrTooltips(model: ModelDef | undefined): void {
    if (!model) return;
    const tooltip = document.getElementById('attr-tooltip');
    if (!tooltip) return;

    this.el.querySelectorAll<HTMLElement>('[data-attr-idx]').forEach((cell) => {
      const idx = parseInt(cell.dataset['attrIdx'] ?? '0', 10);
      const attr = model.attrs[idx];
      if (!attr) return;

      cell.style.cursor = 'help';
      cell.style.borderBottom = '1px dashed currentColor';

      cell.addEventListener('mouseenter', () => {
        const nameEl  = tooltip.querySelector<HTMLElement>('#at-name');
        const semEl   = tooltip.querySelector<HTMLElement>('#at-semantic');
        const typeEl  = tooltip.querySelector<HTMLElement>('#at-type');
        const structEl = tooltip.querySelector<HTMLElement>('#at-structure');
        const structRow = tooltip.querySelector<HTMLElement>('#at-structure-row');

        if (nameEl)   nameEl.textContent  = attr.name;
        if (semEl)    semEl.textContent   = attr.semantic;
        if (typeEl)   typeEl.textContent  = `${attr.ngsiType} (${attr.xsdType})`;
        if (structEl) structEl.textContent = attr.structure ?? 'Scalar value — no internal structure.';
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

  private showList(entities: NgsiLdEntity[]): void {
    this.lastList = entities;
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
      <span class="inspector-type-badge" style="color:${typeColor};border-color:${typeColor};background:${typeColor}18;margin-bottom:6px;display:inline-flex">${entities[0].type}</span>
      <div class="inspector-id" style="margin-bottom:8px">${entities.length} entities — click one to inspect</div>
      ${items}
    `;

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
  Company:            '#7c3aed',
  Plant:              '#0284c7',
  WorkCenter:         '#2563eb',
  Product:            '#d97706',
  StockLocation:      '#16a34a',
  WorkOrder:          '#dc2626',
  ManufacturingOrder: '#9333ea',
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
};
