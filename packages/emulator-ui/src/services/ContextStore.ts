import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';
import { bus, BUS } from './EventBus.ts';

export class ContextStore {
  private entities = new Map<string, NgsiLdEntity>();

  replaceSnapshot(entities: NgsiLdEntity[]): void {
    this.entities.clear();
    for (const e of entities) this.entities.set(e.id, e);
    bus.emit(BUS.SNAPSHOT_LOADED, this.getAll());
  }

  applyEntityChange(entityId: string, attrs: Record<string, unknown>, entityType?: string): void {
    const existing = this.entities.get(entityId);
    if (existing) {
      const updated = { ...existing, ...attrs };
      this.entities.set(entityId, updated);
      bus.emit(BUS.ENTITY_CHANGED, updated);
    } else {
      // entityType lets a broker-side broadcast introduce a brand-new entity (one that was
      // never in a prior contextSnapshot/seed) with its real type — without it, every scene's
      // `entity.type === 'WorkOrder'`-style checks silently no-op forever on a stub whose type
      // got stamped 'Unknown' here and is never corrected by later partial-attribute updates.
      const stub = { id: entityId, type: entityType ?? 'Unknown', ...attrs };
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
