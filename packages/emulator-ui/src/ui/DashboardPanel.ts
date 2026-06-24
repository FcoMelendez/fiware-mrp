import { bus, BUS } from '../services/EventBus.ts';
import { contextStore } from '../services/ContextStore.ts';
import { propValue } from '../domain/ngsi-ld.ts';
import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';

// ── State colours (matches FactorySceneEnhanced palette) ─────────────────────
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

// ── Helper ────────────────────────────────────────────────────────────────────

function shortId(entity: NgsiLdEntity): string {
  return propValue<string>(entity, 'name') ?? entity.id.split(':').pop() ?? entity.id;
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

  const ibs    = entities.filter((e) => e.type === 'InventoryBalance');
  const totalQty = ibs.reduce((s, e) => s + (propValue<number>(e, 'availableQuantity') ?? 0), 0);

  const boms    = entities.filter((e) => e.type === 'BillOfMaterials');
  const bomLines = entities.filter((e) => e.type === 'BillOfMaterialsLine');

  const mos = entities.filter((e) => e.type === 'ManufacturingOrder');
  const moInProg = mos.filter((e) => propValue<string>(e, 'state') === 'inProgress').length;

  const wos = entities.filter((e) => e.type === 'WorkOrder');
  const woRunning = wos.filter((e) => {
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

// ── DOM helpers ───────────────────────────────────────────────────────────────

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
  constructor() {
    bus.on(BUS.SNAPSHOT_LOADED, () => this.update());
    bus.on(BUS.ENTITY_CHANGED,  () => this.update());
    bus.on(BUS.SCENARIO_RESET,  () => this.update());
    this.update();
  }

  private update(): void {
    const kpi = compute(contextStore.getAll());
    this.renderContextGraph(kpi);
    this.renderShopFloor(kpi);
    this.renderInventory(kpi);
    this.renderBoM(kpi);
    this.renderProduction(kpi);
  }

  // ── Card renderers ──────────────────────────────────────────────────────────

  private renderContextGraph(kpi: KpiSnapshot): void {
    const hasData = kpi.totalEntities > 0;
    const topLine  = hasData ? `${kpi.totalEntities} entities` : '—';
    const botLine  = hasData
      ? `${kpi.entityTypes} type${kpi.entityTypes !== 1 ? 's' : ''} · ${kpi.plantName ?? 'no plant'}`
      : 'no data loaded';

    setText('db-ctx-val', topLine);
    setText('db-ctx-sub', botLine);
    setColor('db-ctx-val', hasData ? '#f1f5f9' : '#475569');

    const strip = el('db-ctx-strip');
    if (strip) strip.style.background = hasData ? '#2563eb' : '#1e293b';

    const meta = el('db-ctx-meta');
    if (meta) {
      meta.textContent = kpi.companyName ?? '';
    }
  }

  private renderShopFloor(kpi: KpiSnapshot): void {
    const wcs = kpi.workCenters;
    const available = wcs.filter((w) => w.state === 'available' || w.state === 'active' || w.state === 'ready').length;
    const blocked   = wcs.filter((w) => w.state === 'blocked').length;
    const busy      = wcs.filter((w) => w.state === 'busy').length;

    const statusColor = blocked > 0 ? '#ef4444' : busy > 0 ? '#3b82f6' : wcs.length > 0 ? '#22c55e' : '#475569';
    const topLine = wcs.length === 0
      ? '—'
      : `${available}/${wcs.length} ready`;

    setText('db-wc-val', topLine);
    setColor('db-wc-val', statusColor);

    const strip = el('db-wc-strip');
    if (strip) strip.style.background = statusColor;

    // Dots row
    const dotsEl = el('db-wc-dots');
    if (dotsEl) {
      if (wcs.length === 0) {
        dotsEl.innerHTML = '<span style="color:#475569;font-size:10px">no work centres</span>';
      } else {
        dotsEl.innerHTML = wcs.map((w) => {
          const col = STATE_COLOR[w.state] ?? '#9ca3af';
          const short = w.label.replace(/WorkCenter|WC-?/gi, '').trim().slice(0, 8) || w.label.slice(0, 8);
          return `<span class="db-wc-dot" title="${w.label} · ${w.state}" style="color:${col}">
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="${col}"/></svg>
            ${short}
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
    setColor('db-inv-val', hasData ? '#fbbf24' : '#475569');

    const strip = el('db-inv-strip');
    if (strip) strip.style.background = hasData ? '#d97706' : '#1e293b';
  }

  private renderBoM(kpi: KpiSnapshot): void {
    const { count, lines } = kpi.bom;
    const hasData = count > 0;
    setText('db-bom-val', hasData ? `${count} BoM${count !== 1 ? 's' : ''}` : '—');
    setText('db-bom-sub', hasData ? `${lines} component line${lines !== 1 ? 's' : ''}` : 'no bill of materials');
    setColor('db-bom-val', hasData ? '#a78bfa' : '#475569');

    const strip = el('db-bom-strip');
    if (strip) strip.style.background = hasData ? '#7c3aed' : '#1e293b';
  }

  private renderProduction(kpi: KpiSnapshot): void {
    const { moTotal, moInProgress, woRunning } = kpi.production;
    const alerts = kpi.alerts;
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

    const statusColor = alerts > 0 ? '#ef4444' : hasData ? '#3b82f6' : '#475569';

    setText('db-prod-val', topLine);
    setText('db-prod-sub', botLine);
    setColor('db-prod-val', statusColor);
    setColor('db-prod-sub', alerts > 0 ? '#fca5a5' : '#64748b');

    const strip = el('db-prod-strip');
    if (strip) strip.style.background = alerts > 0 ? '#dc2626' : hasData ? '#2563eb' : '#1e293b';
  }
}
