import Phaser from 'phaser';
import type { SceneSnapshot, ZoneLayout } from '../../domain/emulator.ts';
import type { NgsiLdEntity } from '../../domain/ngsi-ld.ts';
import { propValue, relObject } from '../../domain/ngsi-ld.ts';
import { bus, BUS } from '../../services/EventBus.ts';
import type { CanvasEntityClick } from '../../services/EventBus.ts';
import { contextStore } from '../../services/ContextStore.ts';

const HOVER_BORDER = 0x0ea5e9; // bright sky-blue — distinct from selection pulse (amber) and zone-kind borders

// WorkCenter.state never changes during normal command execution (no tutorial's commands
// ever touch it) — the thing that actually moves during shop-floor execution is
// WorkOrder.state. Without this map, a WorkCenter zone's border only ever reflected the
// WorkCenter's own (static) state, so the zone looked frozen through an entire tutorial run.
const WO_STATE_TO_BORDER: Record<string, number> = {
  planned:     0xf59e0b,
  in_progress: 0x2563eb,
  completed:   0x16a34a,
  cancelled:   0xef4444,
};

const ZONE_COLORS: Record<string, number> = {
  warehouse:     0xdcfce7,
  buffer:        0xfef3c7,
  finishedGoods: 0xdcfce7,
  workCenter:    0xdbeafe,
  quality:       0xfee2e2,
};

const ZONE_BORDER: Record<string, number> = {
  warehouse:     0x16a34a,
  buffer:        0xd97706,
  finishedGoods: 0x16a34a,
  workCenter:    0x2563eb,
  quality:       0xdc2626,
};

interface ZoneObject {
  zone: ZoneLayout;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  entityLabel?: Phaser.GameObjects.Text;
  quantityLabel?: Phaser.GameObjects.Text;
  // Tracks the "resting" (non-hover) stroke so pointerout restores the correct
  // state-dependent border (e.g. WorkCenter inactive = red) rather than a stale default.
  defaultStrokeColor: number;
  defaultStrokeWidth: number;
}

export class FactoryScene extends Phaser.Scene {
  private snapshot!: SceneSnapshot;
  private zoneObjects = new Map<string, ZoneObject>();
  private unsubs: Array<() => void> = [];
  // Live counters for the zones that have no single bound entity to react to —
  // Production Buffer (WIP) and Quality/Inspection (pass/fail) previously showed a
  // permanent "—" placeholder with no way to ever change, even though the underlying
  // WorkOrder/QualityCheck entities driving them update constantly during a tutorial run.
  private bufferCounterText?: Phaser.GameObjects.Text;
  private qualityCounterText?: Phaser.GameObjects.Text;
  private wipWorkOrders = new Set<string>();
  private qualityStats = { pass: 0, fail: 0 };
  private seenQualityChecks = new Set<string>();
  // locationId -> productId -> quantityOnHand, so the Warehouse/Finished Goods zones can show
  // a live total instead of just the static StockLocation name (which itself never changes).
  private stockBalances = new Map<string, Map<string, number>>();

  constructor() {
    super({ key: 'Factory' });
  }

  create(): void {
    this.snapshot = this.registry.get('sceneSnapshot') as SceneSnapshot;
    this.cameras.main.setBackgroundColor('#f1f5f9');

    // Phaser does NOT auto-invoke a method just because it's named `shutdown` — that
    // only applies to init/preload/create/update. Without this, switching away from
    // this scene (or a resize-triggered restart) never unsubscribes its bus listeners,
    // which keep firing against destroyed GameObjects on every future entity update.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.renderZones();
    this.drawFlowArrows();

    // Re-render zones when the container is resized (debounced)
    let resizeTimer: ReturnType<typeof setTimeout>;
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.scene.isActive('Factory')) this.scene.restart();
      }, 250);
    });

    this.unsubs.push(
      bus.on<NgsiLdEntity>(BUS.ENTITY_CHANGED, (entity) => {
        this.applyEntity(entity, true);
      }),

      bus.on<NgsiLdEntity[]>(BUS.SNAPSHOT_LOADED, (entities) => {
        document.getElementById('canvas-overlay')?.classList.add('hidden');
        if (entities.length === 0) {
          // Empty snapshot (e.g. T01 reset) — clear all zone labels
          for (const [, obj] of this.zoneObjects) {
            obj.entityLabel?.setText('');
            obj.quantityLabel?.setText('');
            const defaultBorder = ZONE_BORDER[obj.zone.kind] ?? 0x6b7280;
            obj.bg.setStrokeStyle(2, defaultBorder);
            obj.bg.setAlpha(1);
          }
          this.resetLiveCounters();
        } else {
          // Suppress flash: bulk snapshot is a context load, not new entity arrival
          for (const entity of entities) {
            this.applyEntity(entity, false);
          }
        }
      }),

      bus.on<string[]>(BUS.ZONES_HIGHLIGHTED, (entityIds) => {
        this.highlightZones(entityIds);
      }),

      bus.on<string>(BUS.ENTITY_SELECTED, (entityId) => {
        this.highlightZones([entityId]);
      }),

      bus.on<CanvasEntityClick>(BUS.CANVAS_ENTITY_CLICKED, ({ entityId }) => {
        this.highlightZones([entityId]);
      }),

      bus.on<void>(BUS.SCENARIO_RESET, () => {
        for (const [, obj] of this.zoneObjects) {
          // Guard against destroyed objects (e.g. during a resize-triggered restart)
          if (obj.entityLabel?.active) obj.entityLabel.setText('');
          if (obj.quantityLabel?.active) obj.quantityLabel.setText('');
          if (obj.bg.active) {
            const defaultBorder = ZONE_BORDER[obj.zone.kind] ?? 0x6b7280;
            obj.bg.setStrokeStyle(2, defaultBorder);
            obj.bg.setAlpha(1);
            obj.defaultStrokeColor = defaultBorder;
            obj.defaultStrokeWidth = 2;
          }
        }
        this.resetLiveCounters();
      }),
    );

    // Bootstrap: SNAPSHOT_LOADED may have fired before this scene was active
    const alreadyLoaded = contextStore.getAll();
    if (alreadyLoaded.length > 0) {
      document.getElementById('canvas-overlay')?.classList.add('hidden');
      for (const entity of alreadyLoaded) {
        this.applyEntity(entity, false);
      }
    }
  }

  // Dispatches one entity to every reactive system this scene cares about. `animate`
  // gates the moving flow-dot / flash effects — suppressed for bulk snapshot/bootstrap
  // loads (re-hydrating current state) and enabled only for live, one-at-a-time updates.
  private applyEntity(entity: NgsiLdEntity, animate: boolean): void {
    this.updateZoneForEntity(entity, animate);
    if (entity.type === 'WorkOrder') this.updateZoneForWorkOrder(entity);
    else if (entity.type === 'InventoryBalance') this.updateStockBalance(entity);
    else if (entity.type === 'QualityCheck') this.updateQualityStats(entity);
    else if (entity.type === 'StockMove') this.updateStockMoveFlow(entity, animate);
  }

  private renderZones(): void {
    const { width, height } = this.scale;

    for (const zone of this.snapshot.layout.zones) {
      const x = zone.xPct * width;
      const y = zone.yPct * height;
      const w = zone.wPct * width;
      const h = zone.hPct * height;

      const bound  = !!zone.entityId;
      const fill   = bound ? (ZONE_COLORS[zone.kind] ?? 0xffffff) : 0xf1f5f9;
      const border = bound ? (ZONE_BORDER[zone.kind] ?? 0x6b7280) : 0xd1d5db;

      const bg = this.add
        .rectangle(x + w / 2, y + h / 2, w, h, fill)
        .setStrokeStyle(bound ? 2 : 1, border)
        .setAlpha(bound ? 1 : 0.65)
        .setInteractive({ useHandCursor: bound });

      if (bound) {
        bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          bus.emit<CanvasEntityClick>(BUS.CANVAS_ENTITY_CLICKED, { entityId: zone.entityId!, x: pointer.x, y: pointer.y });
        });
        bg.on('pointerover', () => {
          bg.setStrokeStyle(4, HOVER_BORDER);
          this.tweens.add({ targets: bg, scaleX: 1.03, scaleY: 1.03, duration: 120, ease: 'Sine.easeOut' });
        });
        bg.on('pointerout', () => {
          const o = this.zoneObjects.get(zone.id);
          bg.setStrokeStyle(o?.defaultStrokeWidth ?? 2, o?.defaultStrokeColor ?? border);
          this.tweens.add({ targets: bg, scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.easeIn' });
        });
      }

      const labelColor = bound ? '#1e293b' : '#9ca3af';
      const label = this.add.text(x + 8, y + 8, zone.label, {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: labelColor,
        fontStyle: bound ? 'bold' : 'normal',
      }).setDepth(1);

      // Production Buffer and Quality/Inspection have no single entity to bind to (WIP is
      // "however many WorkOrders are in_progress right now"; quality is an aggregate of every
      // QualityCheck) — they used to render a permanent "—" placeholder that could never
      // change. Give them a live counter instead, driven by WorkOrder/QualityCheck events.
      if (zone.id === 'production-buffer') {
        this.bufferCounterText = this.add.text(x + w / 2, y + h / 2, 'No work in progress', {
          fontSize: '13px', fontFamily: 'monospace', color: '#92400e', align: 'center',
        }).setOrigin(0.5).setDepth(1);
      } else if (zone.id === 'quality-area') {
        this.qualityCounterText = this.add.text(x + w / 2, y + h / 2, '0 passed · 0 failed', {
          fontSize: '13px', fontFamily: 'monospace', color: '#991b1b', align: 'center',
        }).setOrigin(0.5).setDepth(1);
      } else if (!bound) {
        this.add.text(x + w / 2, y + h / 2, '—', {
          fontSize: '22px', fontFamily: 'monospace', color: '#d1d5db',
        }).setOrigin(0.5).setDepth(1);
      }

      // Entity name — filled in when context loads
      const entityLabel = bound
        ? this.add.text(x + 8, y + h - 20, '', {
            fontSize: '10px', fontFamily: 'monospace', color: '#475569',
          }).setDepth(1)
        : undefined;

      // Live on-hand quantity — only meaningful for the two stock zones, whose bound
      // entity is the StockLocation itself (which never changes); the actual quantity
      // lives on InventoryBalance entities tracked separately in `stockBalances`.
      const quantityLabel = (zone.kind === 'warehouse' || zone.kind === 'finishedGoods')
        ? this.add.text(x + 8, y + h - 34, '', {
            fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#166534',
          }).setDepth(1)
        : undefined;

      this.zoneObjects.set(zone.id, {
        zone, bg, label, entityLabel, quantityLabel,
        defaultStrokeColor: border,
        defaultStrokeWidth: bound ? 2 : 1,
      });
    }
  }

  private drawFlowArrows(): void {
    const { width, height } = this.scale;
    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0x64748b, 0.7);

    // Warehouse → Production Buffer
    this.drawArrow(gfx, 0.31 * width, 0.25 * height, 0.34 * width, 0.25 * height);
    // Production Buffer → Assembly (down)
    this.drawArrow(gfx, 0.50 * width, 0.45 * height, 0.50 * width, 0.50 * height);
    // Assembly → Leak Test
    this.drawArrow(gfx, 0.31 * width, 0.65 * height, 0.34 * width, 0.65 * height);
    // Leak Test → Packaging
    this.drawArrow(gfx, 0.66 * width, 0.65 * height, 0.69 * width, 0.65 * height);
    // Packaging → Finished Goods (up)
    this.drawArrow(gfx, 0.835 * width, 0.50 * height, 0.835 * width, 0.45 * height);
  }

  private drawArrow(
    gfx: Phaser.GameObjects.Graphics,
    x1: number, y1: number,
    x2: number, y2: number,
  ): void {
    gfx.lineBetween(x1, y1, x2, y2);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 8;
    gfx.lineBetween(x2, y2,
      x2 - headLen * Math.cos(angle - 0.4),
      y2 - headLen * Math.sin(angle - 0.4));
    gfx.lineBetween(x2, y2,
      x2 - headLen * Math.cos(angle + 0.4),
      y2 - headLen * Math.sin(angle + 0.4));
  }

  private highlightZones(entityIds: string[]): void {
    const idSet = new Set(entityIds);

    for (const [, obj] of this.zoneObjects) {
      const bound = obj.zone.entityId;
      if (!bound) continue;

      if (idSet.has(bound)) {
        // Pulse amber → white → default border
        obj.bg.setStrokeStyle(4, 0xfbbf24);
        this.tweens.add({
          targets: obj.bg,
          alpha: 0.7,
          duration: 350,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            obj.bg.setAlpha(1);
            // Restore the tracked resting stroke, not a recomputed default — otherwise
            // a WorkCenter's "inactive" red border would be lost after a pulse.
            obj.bg.setStrokeStyle(obj.defaultStrokeWidth, obj.defaultStrokeColor);
          },
        });
      }
    }
  }

  shutdown(): void {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.zoneObjects.clear();
  }

  private updateZoneForEntity(entity: NgsiLdEntity, flash = true): void {
    // Find zone bound to this entity
    const zone = this.snapshot.layout.zones.find((z) => z.entityId === entity.id);
    if (!zone) return;
    const obj = this.zoneObjects.get(zone.id);
    if (!obj) return;

    const wasEmpty = !obj.entityLabel?.text;

    // Show entity name in zone footer
    const name = propValue<string>(entity, 'name') ?? entity.id.split(':').pop() ?? entity.id;
    obj.entityLabel?.setText(name);

    // WorkCenter state → border color. Update the tracked resting stroke *before* the
    // flash below is queued, so its onComplete (and any later hover-out) restores this
    // state-dependent border instead of a stale one.
    if (entity.type === 'WorkCenter') {
      const state = propValue<string>(entity, 'state') ?? 'active';
      // Real enum (data-models/dataModel.MRP/WorkCenter/schema.json) is "inactive", not "unavailable".
      const border = state === 'inactive' ? 0xef4444 : ZONE_BORDER[zone.kind] ?? 0x6b7280;
      obj.defaultStrokeColor = border;
      obj.defaultStrokeWidth = 3;
      obj.bg.setStrokeStyle(3, border);
    }

    // Brief green flash when an entity first arrives in the zone (suppressed for bulk loads)
    if (wasEmpty && flash) this.flashZoneById(zone.id);
  }

  // WorkOrder.state (planned/in_progress/completed) is what actually moves during a
  // tutorial run — this recolors the WorkCenter zone the WorkOrder belongs to, since
  // updateZoneForEntity above only reacts to the (effectively static) WorkCenter entity.
  private updateZoneForWorkOrder(entity: NgsiLdEntity): void {
    const wcId = relObject(entity, 'workCenter');
    if (wcId) {
      const zone = this.snapshot.layout.zones.find((z) => z.entityId === wcId);
      const obj = zone ? this.zoneObjects.get(zone.id) : undefined;
      if (obj) {
        const state = propValue<string>(entity, 'state') ?? 'planned';
        const border = WO_STATE_TO_BORDER[state] ?? obj.defaultStrokeColor;
        obj.defaultStrokeColor = border;
        obj.defaultStrokeWidth = 3;
        obj.bg.setStrokeStyle(3, border);
      }
    }

    const state = propValue<string>(entity, 'state');
    if (state === 'in_progress') this.wipWorkOrders.add(entity.id);
    else this.wipWorkOrders.delete(entity.id);
    this.updateBufferCounter();
  }

  private updateBufferCounter(): void {
    const n = this.wipWorkOrders.size;
    this.bufferCounterText?.setText(
      n === 0 ? 'No work in progress' : `${n} work order${n === 1 ? '' : 's'} in progress`,
    );
  }

  // InventoryBalance carries the actual quantity; the zone is bound to the StockLocation,
  // which never changes its own attributes — so without this, the Warehouse/Finished Goods
  // zones could show an entity name but never a quantity, no matter how much stock moved.
  private updateStockBalance(entity: NgsiLdEntity): void {
    const locId = relObject(entity, 'location');
    const prodId = relObject(entity, 'product');
    if (!locId || !prodId) return;

    if (!this.stockBalances.has(locId)) this.stockBalances.set(locId, new Map());
    const qty = propValue<number>(entity, 'quantityOnHand') ?? 0;
    this.stockBalances.get(locId)!.set(prodId, qty);

    const zone = this.snapshot.layout.zones.find((z) => z.entityId === locId);
    const obj = zone ? this.zoneObjects.get(zone.id) : undefined;
    if (!obj?.quantityLabel) return;

    const balances = this.stockBalances.get(locId)!;
    const total = [...balances.values()].reduce((a, b) => a + b, 0);
    obj.quantityLabel.setText(`${total} EA on hand · ${balances.size} SKU${balances.size === 1 ? '' : 's'}`);
  }

  // QualityCheck entities are immutable and accumulate — count each one exactly once
  // (SNAPSHOT_LOADED replays the same entities every reconnect) rather than re-counting.
  private updateQualityStats(entity: NgsiLdEntity): void {
    if (this.seenQualityChecks.has(entity.id)) return;
    this.seenQualityChecks.add(entity.id);

    const result = propValue<string>(entity, 'result');
    if (result === 'pass') this.qualityStats.pass += 1;
    else if (result === 'fail') this.qualityStats.fail += 1;
    this.qualityCounterText?.setText(`${this.qualityStats.pass} passed · ${this.qualityStats.fail} failed`);
  }

  // Every StockMove this stack actually creates goes straight to state=done — no service
  // ever emits an "inTransit" phase — so a flow indicator gated on that state would never
  // fire. React to the real receipt instead: flash the destination zone, and for the
  // Packaging → Finished Goods handoff, animate a small dot along the same path the static
  // arrow already draws.
  private updateStockMoveFlow(entity: NgsiLdEntity, animate: boolean): void {
    const state = propValue<string>(entity, 'state');
    const moveType = propValue<string>(entity, 'moveType');
    if (state !== 'done' || moveType !== 'receipt') return;

    const toLoc = relObject(entity, 'toLocation');
    if (toLoc === 'urn:ngsi-ld:StockLocation:WH-FINISHED') {
      this.flashZoneById('finished-goods');
      if (animate) this.spawnFlowDot('packaging', 'finished-goods', 0x16a34a);
    } else if (toLoc === 'urn:ngsi-ld:StockLocation:WH-STOCK') {
      this.flashZoneById('warehouse');
    }
  }

  private flashZoneById(zoneId: string): void {
    const obj = this.zoneObjects.get(zoneId);
    if (!obj) return;
    obj.bg.setStrokeStyle(3, 0x22c55e);
    this.tweens.add({
      targets: obj.bg,
      alpha: { from: 0.6, to: 1 },
      duration: 400,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        obj.bg.setAlpha(1);
        obj.bg.setStrokeStyle(obj.defaultStrokeWidth, obj.defaultStrokeColor);
      },
    });
  }

  private spawnFlowDot(fromZoneId: string, toZoneId: string, color: number): void {
    const from = this.zoneObjects.get(fromZoneId)?.zone;
    const to = this.zoneObjects.get(toZoneId)?.zone;
    if (!from || !to) return;
    const { width, height } = this.scale;
    const fx = (from.xPct + from.wPct / 2) * width;
    const fy = (from.yPct + from.hPct / 2) * height;
    const tx = (to.xPct + to.wPct / 2) * width;
    const ty = (to.yPct + to.hPct / 2) * height;

    const dot = this.add.circle(fx, fy, 7, color).setDepth(10).setStrokeStyle(2, 0xffffff);
    this.tweens.add({
      targets: dot,
      x: tx, y: ty,
      duration: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => dot.destroy(),
    });
  }

  private resetLiveCounters(): void {
    this.stockBalances.clear();
    this.wipWorkOrders.clear();
    this.qualityStats = { pass: 0, fail: 0 };
    this.seenQualityChecks.clear();
    this.bufferCounterText?.setText('No work in progress');
    this.qualityCounterText?.setText('0 passed · 0 failed');
  }
}
