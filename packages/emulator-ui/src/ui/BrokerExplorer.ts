import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';
import { TYPE_COLOR, renderDataModel } from './EntityInspector.ts';

export class BrokerExplorer {
  private el: HTMLElement;
  private entities: NgsiLdEntity[] = [];

  constructor(containerId: string) {
    this.el = document.getElementById(containerId)!;
    this.renderEmpty();
  }

  async activate(): Promise<void> {
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    this.renderLoading();
    try {
      const res = await fetch('/api/entities');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.entities = (await res.json()) as NgsiLdEntity[];
      this.renderList();
    } catch (e) {
      this.renderError(e instanceof Error ? e.message : String(e));
    }
  }

  private async showDetail(entityId: string): Promise<void> {
    let entity = this.entities.find((e) => e.id === entityId);
    if (!entity) {
      const res = await fetch(`/api/entities/${encodeURIComponent(entityId)}`);
      if (res.ok) entity = (await res.json()) as NgsiLdEntity;
    }
    if (entity) this.renderDetail(entity);
  }

  // ── Views ──────────────────────────────────────────────────────────────────

  private renderLoading(): void {
    this.el.innerHTML = `<p class="inspector-empty" style="padding:16px 0">Loading entities from broker…</p>`;
  }

  private renderEmpty(): void {
    this.el.innerHTML = `
      ${this.listHeader()}
      <p class="inspector-empty">Open this panel after seeding to browse entities.</p>
    `;
    this.wireHeader();
  }

  private renderError(msg: string): void {
    this.el.innerHTML = `
      ${this.listHeader()}
      <p class="inspector-empty" style="color:#ef4444">Failed to load: ${msg}</p>
    `;
    this.wireHeader();
  }

  private renderList(): void {
    if (this.entities.length === 0) {
      this.el.innerHTML = `
        ${this.listHeader()}
        <p class="inspector-empty">No entities in the broker yet.</p>
      `;
      this.wireHeader();
      return;
    }

    const groups = new Map<string, NgsiLdEntity[]>();
    for (const e of this.entities) {
      if (!groups.has(e.type)) groups.set(e.type, []);
      groups.get(e.type)!.push(e);
    }

    const typeOrder = Object.keys(TYPE_COLOR);
    const sorted = [...groups.entries()].sort(
      (a, b) => (typeOrder.indexOf(a[0]) + 1 || 999) - (typeOrder.indexOf(b[0]) + 1 || 999),
    );

    let html = `
      ${this.listHeader()}
      <p style="font-size:10px;color:#94a3b8;margin-bottom:2px">
        ${this.entities.length} entit${this.entities.length === 1 ? 'y' : 'ies'} · ${groups.size} type${groups.size === 1 ? '' : 's'}
      </p>
    `;

    for (const [type, ents] of sorted) {
      const color = TYPE_COLOR[type] ?? '#64748b';
      html += `<div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span class="entity-list-type" style="color:${color};border-color:${color}">${type}</span>
          <span style="font-size:10px;color:#94a3b8">${ents.length}</span>
        </div>`;
      for (const e of ents) {
        const shortId = e.id.split(':').pop() ?? e.id;
        html += `<div class="entity-list-item explorer-entity" data-id="${e.id}">
          <span class="entity-list-name">${shortId}</span>
        </div>`;
      }
      html += `</div>`;
    }

    this.el.innerHTML = html;
    this.wireHeader();
    this.el.querySelectorAll<HTMLElement>('.explorer-entity').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset['id'];
        if (id) this.showDetail(id);
      });
    });
  }

  private renderDetail(entity: NgsiLdEntity): void {
    const color = TYPE_COLOR[entity.type] ?? '#64748b';
    const skip = new Set(['id', 'type', '@context']);

    let attrsHtml = '<div class="attr-table" style="margin-top:8px">';
    for (const [key, val] of Object.entries(entity)) {
      if (skip.has(key)) continue;
      if (typeof val !== 'object' || val === null) continue;
      const attr = val as Record<string, unknown>;
      const attrType = attr['type'] as string | undefined;
      const isRel = attrType === 'Relationship';
      const value = isRel
        ? String(attr['object'] ?? '')
        : attrType === 'Property'
          ? String(attr['value'] ?? '')
          : JSON.stringify(attr);
      const cls = isRel ? 'attr-value-rel' : 'attr-value-prop';
      attrsHtml += `<div class="attr-row">
        <span class="attr-name">${key}</span>
        <span class="${cls}">${value}</span>
      </div>`;
    }
    attrsHtml += '</div>';

    this.el.innerHTML = `
      <button class="btn-inspector-nav" id="explorer-back">← Back to list</button>
      <div class="inspector-type-row">
        <button class="inspector-type-badge" style="color:${color};border-color:${color};background:${color}18"
          data-type="${entity.type}">${entity.type}</button>
      </div>
      <div class="inspector-id">${entity.id}</div>
      ${attrsHtml}
    `;

    this.el.querySelector('#explorer-back')?.addEventListener('click', () => this.renderList());

    this.el.querySelector<HTMLButtonElement>('.inspector-type-badge')?.addEventListener('click', () => {
      renderDataModel(this.el, entity.type, color, () => this.renderDetail(entity));
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private listHeader(): string {
    return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:12px;font-weight:700;color:#1e293b">Broker Explorer</span>
      <button class="btn-inspector-nav" id="explorer-refresh">↻ Refresh</button>
    </div>`;
  }

  private wireHeader(): void {
    this.el.querySelector('#explorer-refresh')?.addEventListener('click', () => this.refresh());
  }
}
