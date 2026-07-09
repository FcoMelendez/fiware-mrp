import { bus, BUS } from '../services/EventBus.ts';
import type { CanvasEntityClick } from '../services/EventBus.ts';
import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';
import { contextStore } from '../services/ContextStore.ts';
import { TYPE_COLOR, renderEntityAttributesHtml } from './EntityInspector.ts';

/**
 * A popup showing entity details anchored near the clicked shape on the Phaser
 * canvas — the canvas-click counterpart to EntityInspector's sidebar view.
 * Closes via its "×" button, an outside click, or Escape.
 */
export class EntityPopup {
  private containerEl: HTMLElement;
  private popupEl: HTMLElement;
  private titleEl: HTMLElement;
  private contentEl: HTMLElement;
  private history: NgsiLdEntity[] = [];
  // The same physical click that opens the popup (via the Phaser canvas's own
  // pointerdown handler) also bubbles up to this class's document-level
  // "click outside closes it" listener — and the canvas is never "inside" the
  // popup, so without this guard every open would immediately self-close.
  // Arm the outside-click listener only after the opening click has finished
  // propagating (setTimeout defers to the next macrotask, after the bubble).
  private armedForOutsideClose = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`EntityPopup: #${containerId} not found`);
    this.containerEl = container;

    this.popupEl = document.createElement('div');
    this.popupEl.className = 'entity-popup hidden';
    this.popupEl.innerHTML = `
      <div class="entity-popup-header">
        <span class="entity-popup-title"></span>
        <button class="entity-popup-close" aria-label="Close" title="Close">×</button>
      </div>
      <div class="entity-popup-content"></div>
    `;
    container.appendChild(this.popupEl);

    this.titleEl = this.popupEl.querySelector('.entity-popup-title')!;
    this.contentEl = this.popupEl.querySelector('.entity-popup-content')!;

    this.popupEl.querySelector('.entity-popup-close')?.addEventListener('click', () => this.close());

    // Phaser's pointer input isn't scoped to the canvas element — it does its own
    // coordinate-based hit-testing against every interactive zone regardless of which
    // DOM element the browser actually dispatched the click to. Without this, any click
    // inside the popup (a relationship link, the back button, anywhere) that happens to
    // land over a canvas zone underneath also fires that zone's own click, re-opening
    // the popup for a *different* entity and resetting the nav history — which looks
    // exactly like "clicking back closed the popup" from the user's perspective.
    this.popupEl.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.popupEl.addEventListener('mousedown', (e) => e.stopPropagation());

    document.addEventListener('mousedown', (e) => {
      if (!this.armedForOutsideClose) return;
      if (this.popupEl.classList.contains('hidden')) return;
      if (!this.popupEl.contains(e.target as Node)) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    bus.on<CanvasEntityClick>(BUS.CANVAS_ENTITY_CLICKED, ({ entityId, x, y }) => {
      this.history = [];
      this.openAt(entityId, x, y);
    });

    bus.on<void>(BUS.SCENARIO_RESET, () => this.close());
  }

  private openAt(entityId: string, x: number, y: number): void {
    this.armedForOutsideClose = false;
    this.popupEl.classList.remove('hidden');
    this.position(x, y);
    this.contentEl.innerHTML = '<p class="entity-popup-loading">Loading…</p>';
    this.loadAndRender(entityId);
    setTimeout(() => { this.armedForOutsideClose = true; }, 0);
  }

  private async loadAndRender(entityId: string): Promise<void> {
    const cached = contextStore.get(entityId);
    if (cached) { this.render(cached); return; }
    try {
      const res = await fetch(`/api/entities/${encodeURIComponent(entityId)}`);
      if (res.ok) { this.render((await res.json()) as NgsiLdEntity); return; }
    } catch {
      // fall through to error message below
    }
    this.contentEl.innerHTML = `<p class="entity-popup-loading">Could not load: ${entityId}</p>`;
  }

  private render(entity: NgsiLdEntity): void {
    const typeColor = TYPE_COLOR[entity.type] ?? '#64748b';
    const backBtn = this.history.length > 0
      ? '<button class="btn-inspector-nav entity-popup-back">← Back</button>'
      : '';

    this.titleEl.textContent = entity.type;
    this.titleEl.style.color = typeColor;

    this.contentEl.innerHTML = `
      ${backBtn}
      <div class="entity-popup-id">${entity.id}</div>
      ${renderEntityAttributesHtml(entity, typeColor)}
    `;

    this.contentEl.querySelector('.entity-popup-back')?.addEventListener('click', () => {
      const prev = this.history.pop();
      if (prev) this.render(prev);
    });

    this.contentEl.querySelectorAll<HTMLButtonElement>('.attr-rel-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        const relId = btn.dataset['relId'];
        if (!relId) return;
        this.history.push(entity);
        const cached = contextStore.get(relId);
        if (cached) { this.render(cached); return; }
        this.contentEl.innerHTML = '<p class="entity-popup-loading">Loading…</p>';
        this.loadAndRender(relId);
      });
    });
  }

  private position(x: number, y: number): void {
    // Place immediately so it's visible, then re-clamp once real dimensions are known.
    this.popupEl.style.left = `${x}px`;
    this.popupEl.style.top = `${y}px`;

    requestAnimationFrame(() => {
      const containerRect = this.containerEl.getBoundingClientRect();
      const popW = this.popupEl.offsetWidth;
      const popH = this.popupEl.offsetHeight;

      let left = x + 14;
      if (left + popW > containerRect.width - 8) left = x - popW - 14;
      left = Math.max(8, Math.min(left, containerRect.width - popW - 8));

      let top = y - popH / 2;
      top = Math.max(8, Math.min(top, containerRect.height - popH - 8));

      this.popupEl.style.left = `${left}px`;
      this.popupEl.style.top = `${top}px`;
    });
  }

  private close(): void {
    this.popupEl.classList.add('hidden');
    this.armedForOutsideClose = false;
  }
}
