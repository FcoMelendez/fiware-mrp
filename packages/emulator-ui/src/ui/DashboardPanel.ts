import { bus, BUS } from '../services/EventBus.ts';
import { contextStore } from '../services/ContextStore.ts';
import { propValue, relObject } from '../domain/ngsi-ld.ts';
import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';

// ── State colours ─────────────────────────────────────────────────────────────
const STATE_COLOR: Record<string, string> = {
  available:   '#22c55e',
  ready:       '#22c55e',
  active:      '#22c55e',
  busy:        '#3b82f6',
  inProgress:  '#3b82f6',
  waiting:     '#f59e0b',
  blocked:     '#ef4444',
  maintenance: '#9ca3af',
  done:        '#16a34a',
};

interface KpiSnapshot {
  totalEntities:    number;
  entityTypes:      number;
  plantName:        string | null;
  companyName:      string | null;
  workCenters:      { id: string; label: string; state: string }[];
  inventory:        { skus: number; totalQty: number };
  bom:              { count: number; lines: number };
  production:       { moTotal: number; moInProgress: number; woRunning: number };
  alerts:           number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortId(entity: NgsiLdEntity): string {
  return propValue<string>(entity, 'name') ?? entity.id.split(':').pop() ?? entity.id;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function compute(entities: NgsiLdEntity[]): KpiSnapshot {
  const types = new Set(entities.map((e) => e.type));
  const plant   = entities.find((e) => e.type === 'Plant');
  const company = entities.find((e) => e.type === 'Company');

  const wcs = entities
    .filter((e) => e.type === 'WorkCenter')
    .map((e) => ({
      id:    e.id,
      label: shortId(e),
      state: propValue<string>(e, 'state') ?? 'available',
    }));

  const ibs      = entities.filter((e) => e.type === 'InventoryBalance');
  const totalQty = ibs.reduce((s, e) => s + (propValue<number>(e, 'availableQuantity') ?? 0), 0);

  const boms     = entities.filter((e) => e.type === 'BillOfMaterials');
  const bomLines = entities.filter((e) => e.type === 'BillOfMaterialsLine');

  const mos        = entities.filter((e) => e.type === 'ManufacturingOrder');
  const moInProg   = mos.filter((e) => propValue<string>(e, 'state') === 'inProgress').length;
  const wos        = entities.filter((e) => e.type === 'WorkOrder');
  const woRunning  = wos.filter((e) => {
    const s = propValue<string>(e, 'state') ?? '';
    return s === 'inProgress' || s === 'ready';
  }).length;

  const alerts = entities.filter(
    (e) => e.type === 'QualityAlert' && propValue<string>(e, 'state') === 'open',
  ).length;

  return {
    totalEntities: entities.length,
    entityTypes:   types.size,
    plantName:     plant   ? shortId(plant)   : null,
    companyName:   company ? shortId(company) : null,
    workCenters:   wcs,
    inventory:     { skus: ibs.length, totalQty },
    bom:           { count: boms.length, lines: bomLines.length },
    production:    { moTotal: mos.length, moInProgress: moInProg, woRunning },
    alerts,
  };
}

function el(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function setText(id: string, text: string): void {
  const e = el(id);
  if (e) e.textContent = text;
}

function setColor(id: string, color: string): void {
  const e = el(id);
  if (e) e.style.color = color;
}

// ── Dashboard Panel ───────────────────────────────────────────────────────────

export class DashboardPanel {
  private bomPopover!: HTMLElement;
  private bomExpanded  = new Set<string>();
  private lineExpanded = new Set<string>();

  constructor() {
    this.setupBomWidget();

    bus.on(BUS.SNAPSHOT_LOADED, () => this.refresh());
    bus.on(BUS.ENTITY_CHANGED,  () => this.refresh());
    bus.on(BUS.SCENARIO_RESET,  () => this.refresh());
    this.refresh();
  }

  // ── BoM popover setup ───────────────────────────────────────────────────────

  private setupBomWidget(): void {
    // Create popover, append to #center-column so it sits in the stacking context
    const popover = document.createElement('div');
    popover.id = 'bom-popover';
    popover.className = 'bom-popover bom-popover-hidden';
    document.getElementById('center-column')?.appendChild(popover);
    this.bomPopover = popover;

    // Toggle on BoM card click
    el('db-bom-card')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.bomPopover.classList.contains('bom-popover-hidden')) {
        this.openBomPopover();
      } else {
        this.closeBomPopover();
      }
    });

    // Click anywhere outside → close
    document.addEventListener('click', (e) => {
      if (!this.bomPopover.classList.contains('bom-popover-hidden') &&
          !this.bomPopover.contains(e.target as Node) &&
          (e.target as HTMLElement).closest?.('#db-bom-card') === null) {
        this.closeBomPopover();
      }
    });
  }

  private openBomPopover(): void {
    this.bomPopover.classList.remove('bom-popover-hidden');
    this.renderBomTree();
    this.positionBomPopover();
    el('db-bom-card')?.classList.add('db-card-active');
  }

  private closeBomPopover(): void {
    this.bomPopover.classList.add('bom-popover-hidden');
    el('db-bom-card')?.classList.remove('db-card-active');
  }

  private positionBomPopover(): void {
    const card = el('db-bom-card');
    const container = el('center-column');
    if (!card || !container) return;

    const cardRect = card.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    const POPOVER_WIDTH = 400;
    let left = cardRect.left - contRect.left;
    // Don't overflow right
    left = Math.min(left, contRect.width - POPOVER_WIDTH - 4);
    // Don't overflow left
    left = Math.max(4, left);

    this.bomPopover.style.left  = `${left}px`;
    this.bomPopover.style.width = `${POPOVER_WIDTH}px`;
  }

  // ── BoM tree rendering ──────────────────────────────────────────────────────

  private renderBomTree(): void {
    const entities = contextStore.getAll();
    const boms = entities
      .filter((e) => e.type === 'BillOfMaterials')
      .sort((a, b) => {
        const ca = propValue<string>(a, 'bomCode') ?? a.id;
        const cb = propValue<string>(b, 'bomCode') ?? b.id;
        return ca.localeCompare(cb);
      });
    const lines = entities.filter((e) => e.type === 'BillOfMaterialsLine');

    const listHtml = boms.length === 0
      ? '<div class="bom-empty">No BoMs loaded yet — run the Tutorial 03 seed step.</div>'
      : boms.map((bom) => this.renderBomItem(bom, lines)).join('');

    this.bomPopover.innerHTML = `
      <div class="bom-pop-header">
        <span>Bill of Materials</span>
        <span class="bom-pop-count">${boms.length} BoM${boms.length !== 1 ? 's' : ''} · ${lines.length} lines</span>
        <button class="bom-pop-close" id="bom-close-btn">×</button>
      </div>
      <div class="bom-pop-list">${listHtml}</div>
    `;

    el('bom-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeBomPopover();
    });

    // Wire all toggle buttons via delegation
    this.bomPopover.querySelectorAll<HTMLElement>('[data-bom-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.dataset['bomToggle']!;
        const isLine   = btn.dataset['bomLine'] === '1';
        const content  = this.bomPopover.querySelector<HTMLElement>(`[data-bom-id="${targetId}"]`);
        if (!content) return;

        const isOpen = !content.classList.contains('bom-collapsed');
        if (isOpen) {
          content.classList.add('bom-collapsed');
          if (isLine) this.lineExpanded.delete(targetId);
          else         this.bomExpanded.delete(targetId);
        } else {
          content.classList.remove('bom-collapsed');
          if (isLine) this.lineExpanded.add(targetId);
          else         this.bomExpanded.add(targetId);
        }

        const chevron = btn.querySelector<HTMLElement>('.bom-chevron');
        if (chevron) chevron.textContent = isOpen ? '▶' : '▼';
      });
    });
  }

  private renderBomItem(bom: NgsiLdEntity, allLines: NgsiLdEntity[]): string {
    const code       = esc(propValue<string>(bom, 'bomCode') ?? bom.id.split(':').pop() ?? bom.id);
    const version    = esc(propValue<string>(bom, 'version') ?? '');
    const state      = propValue<string>(bom, 'state') ?? '';
    const bomType    = esc(propValue<string>(bom, 'bomType') ?? '');
    const productRef = relObject(bom, 'product') ?? '';
    const companyRef = relObject(bom, 'company') ?? '';

    const myLines = allLines
      .filter((l) => relObject(l, 'bom') === bom.id)
      .sort((a, b) => (propValue<number>(a, 'sequence') ?? 0) - (propValue<number>(b, 'sequence') ?? 0));

    const stateColor = STATE_COLOR[state] ?? '#9ca3af';
    const isOpen     = this.bomExpanded.has(bom.id);
    const safeId     = bom.id;

    return `
      <div class="bom-row">
        <button class="bom-row-header" data-bom-toggle="${esc(safeId)}" data-bom-line="0">
          <span class="bom-chevron">${isOpen ? '▼' : '▶'}</span>
          <span class="bom-row-code">${code}</span>
          <span class="bom-row-meta">${version ? `v${version} · ` : ''}${myLines.length} line${myLines.length !== 1 ? 's' : ''}</span>
          <span class="bom-row-state" style="color:${stateColor}">${esc(state)}</span>
        </button>
        <div class="bom-row-body ${isOpen ? '' : 'bom-collapsed'}" data-bom-id="${esc(safeId)}">
          <div class="bom-meta-row">
            <span class="bom-meta-key">product</span>
            <span class="bom-meta-val bom-rel">${esc(productRef.split(':').pop() ?? productRef)}</span>
          </div>
          ${companyRef ? `
          <div class="bom-meta-row">
            <span class="bom-meta-key">company</span>
            <span class="bom-meta-val bom-rel">${esc(companyRef.split(':').pop() ?? companyRef)}</span>
          </div>` : ''}
          <div class="bom-meta-row">
            <span class="bom-meta-key">type</span>
            <span class="bom-meta-val">${bomType}</span>
          </div>
          <div class="bom-lines-section">
            ${myLines.map((l) => this.renderBomLine(l)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderBomLine(line: NgsiLdEntity): string {
    const seq          = propValue<number>(line, 'sequence') ?? 0;
    const qtyAttr      = line['quantity'] as { type: string; value: number; unitCode?: string } | undefined;
    const qty          = qtyAttr?.value ?? 0;
    const unit         = esc(qtyAttr?.unitCode ?? 'EA');
    const scrap        = propValue<number>(line, 'scrapFactor') ?? 0;
    const componentRef = relObject(line, 'component') ?? '';
    const compShort    = esc(componentRef.split(':').pop() ?? componentRef);
    const safeId       = line.id;
    const isOpen       = this.lineExpanded.has(line.id);

    return `
      <div class="bom-line">
        <button class="bom-line-header" data-bom-toggle="${esc(safeId)}" data-bom-line="1">
          <span class="bom-chevron">${isOpen ? '▼' : '▶'}</span>
          <span class="bom-line-seq">${seq}.</span>
          <span class="bom-line-name">${compShort}</span>
          <span class="bom-line-qty">× ${qty} ${unit}</span>
        </button>
        <div class="bom-line-data ${isOpen ? '' : 'bom-collapsed'}" data-bom-id="${esc(safeId)}">
          <div class="bom-meta-row">
            <span class="bom-meta-key">component</span>
            <span class="bom-meta-val bom-rel">${esc(componentRef)}</span>
          </div>
          <div class="bom-meta-row">
            <span class="bom-meta-key">quantity</span>
            <span class="bom-meta-val">${qty} ${unit}</span>
          </div>
          <div class="bom-meta-row">
            <span class="bom-meta-key">scrapFactor</span>
            <span class="bom-meta-val">${(scrap * 100).toFixed(1)}%</span>
          </div>
          <div class="bom-meta-row">
            <span class="bom-meta-key">lineId</span>
            <span class="bom-meta-val" style="color:#475569;font-size:9px">${esc(line.id)}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ── KPI card refresh ────────────────────────────────────────────────────────

  private refresh(): void {
    const kpi = compute(contextStore.getAll());
    this.renderContextGraph(kpi);
    this.renderShopFloor(kpi);
    this.renderInventory(kpi);
    this.renderBoM(kpi);
    this.renderProduction(kpi);
    // Refresh tree if popover is open
    if (!this.bomPopover.classList.contains('bom-popover-hidden')) {
      this.renderBomTree();
    }
  }

  private renderContextGraph(kpi: KpiSnapshot): void {
    const hasData = kpi.totalEntities > 0;
    setText('db-ctx-val', hasData ? `${kpi.totalEntities} entities` : '—');
    setText('db-ctx-sub', hasData
      ? `${kpi.entityTypes} type${kpi.entityTypes !== 1 ? 's' : ''} · ${kpi.plantName ?? 'no plant'}`
      : 'no data loaded');
    setColor('db-ctx-val', hasData ? '#1e293b' : '#9ca3af');

    const strip = el('db-ctx-strip');
    if (strip) strip.style.background = hasData ? '#2563eb' : '#e2e8f0';

    const meta = el('db-ctx-meta');
    if (meta) meta.textContent = kpi.companyName ?? '';
  }

  private renderShopFloor(kpi: KpiSnapshot): void {
    const wcs       = kpi.workCenters;
    const available = wcs.filter((w) => ['available', 'active', 'ready'].includes(w.state)).length;
    const blocked   = wcs.filter((w) => w.state === 'blocked').length;
    const busy      = wcs.filter((w) => w.state === 'busy').length;

    const statusColor = blocked > 0 ? '#dc2626' : busy > 0 ? '#2563eb' : wcs.length > 0 ? '#16a34a' : '#9ca3af';

    setText('db-wc-val', wcs.length === 0 ? '—' : `${available}/${wcs.length} ready`);
    setColor('db-wc-val', statusColor);

    const strip = el('db-wc-strip');
    if (strip) strip.style.background = wcs.length > 0 ? statusColor : '#e2e8f0';

    const dotsEl = el('db-wc-dots');
    if (dotsEl) {
      if (wcs.length === 0) {
        dotsEl.innerHTML = '<span style="color:#334155;font-size:10px">no work centres</span>';
      } else {
        dotsEl.innerHTML = wcs.map((w) => {
          const col   = STATE_COLOR[w.state] ?? '#9ca3af';
          const short = w.label.replace(/WorkCenter|WC-?/gi, '').trim().slice(0, 8) || w.label.slice(0, 8);
          return `<span class="db-wc-dot" title="${esc(w.label)} · ${esc(w.state)}" style="color:${col}">
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="${col}"/></svg>
            ${esc(short)}
          </span>`;
        }).join('');
      }
    }
  }

  private renderInventory(kpi: KpiSnapshot): void {
    const { skus, totalQty } = kpi.inventory;
    const hasData = skus > 0;
    setText('db-inv-val', hasData ? `${skus} SKU${skus !== 1 ? 's' : ''}` : '—');
    setText('db-inv-sub', hasData ? `${totalQty.toLocaleString()} units on hand` : 'no stock data');
    setColor('db-inv-val', hasData ? '#b45309' : '#9ca3af');

    const strip = el('db-inv-strip');
    if (strip) strip.style.background = hasData ? '#d97706' : '#e2e8f0';
  }

  private renderBoM(kpi: KpiSnapshot): void {
    const { count, lines } = kpi.bom;
    const hasData = count > 0;

    setText('db-bom-val', hasData ? `${count} BoM${count !== 1 ? 's' : ''}` : '—');
    setText('db-bom-sub', hasData ? `${lines} component line${lines !== 1 ? 's' : ''}` : 'no bill of materials');
    setColor('db-bom-val', hasData ? '#6d28d9' : '#9ca3af');

    const strip = el('db-bom-strip');
    if (strip) strip.style.background = hasData ? '#7c3aed' : '#e2e8f0';
  }

  private renderProduction(kpi: KpiSnapshot): void {
    const { moTotal, moInProgress, woRunning } = kpi.production;
    const alerts  = kpi.alerts;
    const hasData = moTotal > 0 || woRunning > 0;

    const topLine = moTotal > 0
      ? `${moTotal} order${moTotal !== 1 ? 's' : ''}`
      : woRunning > 0
        ? `${woRunning} WO${woRunning !== 1 ? 's' : ''} running`
        : '—';

    const botLine = moTotal > 0
      ? `${moInProgress} in progress · ${woRunning} WO${woRunning !== 1 ? 's' : ''}`
      : alerts > 0
        ? `${alerts} quality alert${alerts !== 1 ? 's' : ''}`
        : 'no production orders';

    const statusColor = alerts > 0 ? '#dc2626' : hasData ? '#2563eb' : '#9ca3af';

    setText('db-prod-val', topLine);
    setText('db-prod-sub', botLine);
    setColor('db-prod-val', statusColor);
    setColor('db-prod-sub', alerts > 0 ? '#dc2626' : '#94a3b8');

    const strip = el('db-prod-strip');
    if (strip) strip.style.background = alerts > 0 ? '#dc2626' : hasData ? '#2563eb' : '#e2e8f0';
  }
}
