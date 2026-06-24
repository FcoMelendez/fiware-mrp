type Listener<T = unknown> = (payload: T) => void;

class TypedEventBus {
  private listeners = new Map<string, Set<Listener>>();

  on<T>(event: string, listener: Listener<T>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Listener);
    return () => this.listeners.get(event)?.delete(listener as Listener);
  }

  emit<T>(event: string, payload: T): void {
    this.listeners.get(event)?.forEach((l) => l(payload));
  }
}

export const bus = new TypedEventBus();

// Typed event helpers
export const BUS = {
  ENTITY_SELECTED:    'entity:selected',
  ENTITIES_LISTED:    'entities:listed',
  ENTITY_CHANGED:     'entity:changed',
  SNAPSHOT_LOADED:    'snapshot:loaded',
  ZONES_HIGHLIGHTED:  'zones:highlighted',
  CONNECTION_CHANGED: 'connection:changed',
  COMMAND_SENT:       'command:sent',
  TUTORIAL_UPDATED:   'tutorial:updated',
  TIMELINE_EVENT:     'timeline:event',
  SCENARIO_RESET:     'scenario:reset',
  STEP_COMPLETED:     'step:completed',
} as const;
