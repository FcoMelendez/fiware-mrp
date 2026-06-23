import type { EmulatorEvent } from '../domain/emulator.ts';
import { bus, BUS } from '../services/EventBus.ts';

const MAX_EVENTS = 20;

interface TrackedEvent {
  ev: EmulatorEvent;
  expanded: boolean;
}

interface TooltipInfo { what: string; why: string; note: string; }

export class EventTimeline {
  private el: HTMLElement;
  private tooltip: HTMLElement | null;
  private events: TrackedEvent[] = [];

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`EventTimeline: #${containerId} not found`);
    this.el = el;
    this.tooltip = document.getElementById('event-tooltip');

    bus.on<EmulatorEvent>(BUS.TIMELINE_EVENT, (event) => this.push(event));

    bus.on<void>(BUS.SCENARIO_RESET, () => {
      this.events = [];
      this.render();
    });
  }

  private push(event: EmulatorEvent): void {
    this.events.unshift({ ev: event, expanded: false });
    if (this.events.length > MAX_EVENTS) this.events.pop();
    this.render();
  }

  private render(): void {
    this.el.innerHTML = '';
    this.events.forEach((tracked, i) => {
      const { ev } = tracked;
      const card = document.createElement('div');
      card.className = `timeline-card${tracked.expanded ? ' expanded' : ''}`;

      const time     = new Date(ev.observedAt).toLocaleTimeString();
      const title    = this.titleFor(ev);
      const tag      = ev.entityType ?? ev.eventType;
      const hasEntity = !!ev.entityId;

      card.innerHTML = `
        <div class="timeline-card-header">
          <div>
            <div class="timeline-time">${time}</div>
            <div class="timeline-title">${title}</div>
            <div class="timeline-subtitle">${tag}</div>
          </div>
          <div class="timeline-chevron">${tracked.expanded ? '▲' : '▼'}</div>
        </div>
        ${tracked.expanded ? `
          <div class="timeline-payload">
            ${hasEntity ? `<div class="timeline-entity-link" data-id="${ev.entityId}">→ ${ev.entityId?.split(':').pop()}</div>` : ''}
            <pre class="timeline-json">${this.formatPayload(ev)}</pre>
          </div>` : ''}
      `;

      card.querySelector('.timeline-card-header')!.addEventListener('click', () => {
        this.events[i].expanded = !this.events[i].expanded;
        this.render();
      });

      card.querySelector<HTMLElement>('.timeline-entity-link')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (ev.entityId) bus.emit(BUS.ENTITY_SELECTED, ev.entityId);
      });

      // Hover tooltip
      this.attachTooltip(card, ev);

      this.el.appendChild(card);
    });
  }

  private attachTooltip(card: HTMLElement, ev: EmulatorEvent): void {
    if (!this.tooltip) return;
    const tt = this.tooltip;

    card.addEventListener('mouseenter', () => {
      const info = this.tooltipInfo(ev);
      const whatEl = tt.querySelector<HTMLElement>('#tt-what');
      const whyEl  = tt.querySelector<HTMLElement>('#tt-why');
      const noteEl = tt.querySelector<HTMLElement>('#tt-note');
      if (whatEl) whatEl.textContent = info.what;
      if (whyEl)  whyEl.textContent  = info.why;
      if (noteEl) noteEl.textContent = info.note;

      tt.classList.remove('hidden');

      // Position: above the card, anchored to its left edge
      const rect = card.getBoundingClientRect();
      const tw = tt.offsetWidth || 290;
      const th = tt.offsetHeight || 140;
      // Clamp horizontally so it doesn't leave the viewport
      const left = Math.min(rect.left, window.innerWidth - tw - 8);
      tt.style.left = `${Math.max(8, left)}px`;
      tt.style.top  = `${rect.top - th - 10}px`;
    });

    card.addEventListener('mouseleave', () => {
      tt.classList.add('hidden');
    });
  }

  private titleFor(ev: EmulatorEvent): string {
    switch (ev.eventType) {
      case 'contextSnapshot': return 'Context snapshot';
      case 'entityChanged':   return `${ev.entityType ?? 'Entity'} updated`;
      case 'scenarioStarted': return 'Scenario started';
      case 'commandAccepted': return 'Command accepted';
      case 'commandFailed':   return 'Command failed';
      case 'checkpointPassed': return 'Checkpoint passed';
      default: return ev.eventType;
    }
  }

  private formatPayload(ev: EmulatorEvent): string {
    if (ev.eventType === 'contextSnapshot') {
      const snap = ev.payload as { entities?: unknown[]; sceneId?: string } | undefined;
      return JSON.stringify({ sceneId: snap?.sceneId, entityCount: snap?.entities?.length }, null, 2);
    }
    const { eventType, entityId, entityType, observedAt } = ev as EmulatorEvent & { observedAt?: string };
    return JSON.stringify({ eventType, entityId, entityType, observedAt }, null, 2);
  }

  private tooltipInfo(ev: EmulatorEvent): TooltipInfo {
    switch (ev.eventType) {
      case 'contextSnapshot': {
        const count = (ev.payload as { entities?: unknown[] } | undefined)?.entities?.length ?? 0;
        return {
          what: `Full context snapshot — ${count} NGSI-LD entities sent to the browser in one push.`,
          why: 'Triggered when "Seed entities" runs, or when a browser connects and requests the current scene state.',
          note: 'The browser replaces its local context store entirely. Canvas zone labels and the inspector refresh automatically.',
        };
      }
      case 'entityChanged':
        return {
          what: `Attribute update for ${ev.entityType ?? 'entity'} "${ev.entityId?.split(':').pop() ?? ev.entityId}".`,
          why: 'Orion-LD notified the gateway via an active NGSI-LD subscription. The gateway forwarded the delta over SSE to all connected browsers.',
          note: 'The affected canvas zone updates its border colour. If the entity is open in the inspector, the attribute table refreshes in place.',
        };
      case 'commandAccepted':
        return {
          what: 'A command was accepted by the gateway and dispatched to the MRP API.',
          why: 'The user clicked an action button (e.g. "Start WO"). The gateway wrapped the payload in a CommandEnvelope and forwarded it.',
          note: 'In mock mode a simulated entity update follows ~600 ms later. In live mode the MRP service triggers real NGSI-LD state changes.',
        };
      case 'commandFailed':
        return {
          what: 'A command was rejected.',
          why: 'The MRP API returned an error, or the command is not valid for the entity\'s current state.',
          note: 'Check the entity state in the inspector, select the appropriate action, and retry.',
        };
      case 'scenarioStarted':
        return {
          what: 'A tutorial scenario was activated on the gateway.',
          why: 'The guided tour panel initialised a scenario and fetched its step definitions.',
          note: 'The guided tour in the left panel will now show the steps and allow executing them in order.',
        };
      case 'checkpointPassed':
        return {
          what: 'A scenario checkpoint was verified and passed.',
          why: 'The emulator confirmed that the expected NGSI-LD state was reached after a step completed.',
          note: 'The guided tour auto-advances to the next step.',
        };
      default:
        return {
          what: `Event type: ${ev.eventType}`,
          why: 'Emitted by the gateway in response to an internal state change.',
          note: 'Expand the card to inspect the raw event payload.',
        };
    }
  }
}
