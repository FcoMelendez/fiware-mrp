import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';
import { bus, BUS } from './EventBus.ts';

export class ContextStore {
  private entities = new Map<string, NgsiLdEntity>();

  replaceSnapshot(entities: NgsiLdEntity[]): void {
    this.entities.clear();
    for (const e of entities) this.entities.set(e.id, e);
    bus.emit(BUS.SNAPSHOT_LOADED, this.getAll());
  }

  applyEntityChange(entityId: string, attrs: Record<string, unknown>): void {
    const existing = this.entities.get(entityId);
    if (existing) {
      const updated = { ...existing, ...attrs };
      this.entities.set(entityId, updated);
      bus.emit(BUS.ENTITY_CHANGED, updated);
    } else {
      const stub = { id: entityId, type: 'Unknown', ...attrs };
      this.entities.set(entityId, stub);
      bus.emit(BUS.ENTITY_CHANGED, stub);
    }
  }

  get(id: string): NgsiLdEntity | undefined {
    return this.entities.get(id);
  }

  getAll(): NgsiLdEntity[] {
    return [...this.entities.values()];
  }

  getByType(type: string): NgsiLdEntity[] {
    return this.getAll().filter((e) => e.type === type);
  }

  clear(): void {
    this.entities.clear();
  }
}

export const contextStore = new ContextStore();
