import type { EmulatorEvent } from '../domain/emulator.ts';
import { contextStore } from './ContextStore.ts';
import { bus, BUS } from './EventBus.ts';
import type { SceneSnapshot } from '../domain/emulator.ts';
import type { ConnectionStatus } from '../domain/emulator.ts';

export class GatewayClient {
  private es: EventSource | null = null;
  private lastEventAt: number | null = null;

  connect(): void {
    if (this.es) this.es.close();
    bus.emit<ConnectionStatus>(BUS.CONNECTION_CHANGED, 'connecting');

    this.es = new EventSource('/stream');

    this.es.onopen = () => {
      bus.emit<ConnectionStatus>(BUS.CONNECTION_CHANGED, 'live');
    };

    this.es.onmessage = (e: MessageEvent) => {
      this.lastEventAt = Date.now();
      try {
        const event = JSON.parse(e.data as string) as EmulatorEvent;
        this.handleEvent(event);
      } catch {
        // malformed event
      }
    };

    this.es.onerror = () => {
      bus.emit<ConnectionStatus>(BUS.CONNECTION_CHANGED, 'offline');
    };
  }

  private handleEvent(event: EmulatorEvent): void {
    bus.emit(BUS.TIMELINE_EVENT, event);

    if (event.eventType === 'contextSnapshot') {
      const snapshot = event.payload as SceneSnapshot;
      if (snapshot?.entities) {
        contextStore.replaceSnapshot(snapshot.entities);
      }
      return;
    }

    if (event.eventType === 'entityChanged' && event.entityId) {
      contextStore.applyEntityChange(
        event.entityId,
        (event.payload as Record<string, unknown>) ?? {},
      );
      return;
    }

    if (event.eventType === 'scenarioStarted') {
      const payload = event.payload as { steps?: unknown[] };
      if (payload?.steps) {
        bus.emit(BUS.TUTORIAL_UPDATED, payload.steps);
      }
      return;
    }
  }

  get freshness(): number | null {
    return this.lastEventAt;
  }

  disconnect(): void {
    this.es?.close();
    this.es = null;
  }
}

export const gatewayClient = new GatewayClient();
