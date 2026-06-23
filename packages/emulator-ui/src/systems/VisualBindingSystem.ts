import type { VisualBindingDef } from '../domain/emulator.ts';
import type { NgsiLdEntity } from '../domain/ngsi-ld.ts';
import { WO_STATE_COLOR, WO_STATE_LABEL, type WoState } from '../domain/mrp.ts';
import { bus, BUS } from '../services/EventBus.ts';

export interface BoundObject {
  bindingId: string;
  entityId: string;
  zoneId: string;
  displayKind: string;
  // Phaser objects updated by the system
  badgeEl?: HTMLElement;
  update: (entity: NgsiLdEntity) => void;
}

export class VisualBindingSystem {
  private bindings = new Map<string, BoundObject>();

  constructor() {
    bus.on<NgsiLdEntity>(BUS.ENTITY_CHANGED, (entity) => {
      this.updateEntity(entity);
    });
  }

  registerBinding(def: VisualBindingDef, update: (entity: NgsiLdEntity) => void): void {
    this.bindings.set(def.entityId, {
      bindingId: def.id,
      entityId: def.entityId,
      zoneId: def.zoneId,
      displayKind: def.displayKind,
      update,
    });
  }

  updateEntity(entity: NgsiLdEntity): void {
    const bound = this.bindings.get(entity.id);
    if (bound) {
      bound.update(entity);
    }
  }

  renderAll(entities: NgsiLdEntity[]): void {
    for (const entity of entities) {
      this.updateEntity(entity);
    }
  }

  static woStateBadgeStyle(state: string): { bg: string; text: string } {
    const color = WO_STATE_COLOR[state as WoState] ?? '#9ca3af';
    return { bg: color, text: WO_STATE_LABEL[state as WoState] ?? state };
  }

  clear(): void {
    this.bindings.clear();
  }
}

export const visualBindingSystem = new VisualBindingSystem();
