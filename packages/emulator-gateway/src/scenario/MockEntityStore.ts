/**
 * In-memory entity store for mock mode.
 * Tracks the full set of entities that have been seeded or mutated during
 * step execution so that /api/entities reflects the current mock "broker" state.
 */
export class MockEntityStore {
  private store = new Map<string, Record<string, unknown>>();

  upsertMany(entities: Array<Record<string, unknown>>): void {
    for (const e of entities) {
      const id = e['id'] as string;
      if (id) this.store.set(id, e);
    }
  }

  patchAttrs(entityId: string, attrs: Record<string, unknown>): void {
    const existing = this.store.get(entityId);
    if (existing) {
      this.store.set(entityId, { ...existing, ...attrs });
    }
  }

  getAll(): Record<string, unknown>[] {
    return [...this.store.values()];
  }

  getById(id: string): Record<string, unknown> | undefined {
    return this.store.get(id);
  }

  clear(): void {
    this.store.clear();
  }

  seedFrom(entities: Array<Record<string, unknown>>): void {
    this.clear();
    this.upsertMany(entities);
  }
}
