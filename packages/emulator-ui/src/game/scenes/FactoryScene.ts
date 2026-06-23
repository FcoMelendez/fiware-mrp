import Phaser from 'phaser';
import type { SceneSnapshot, ZoneLayout } from '../../domain/emulator.ts';
import type { NgsiLdEntity } from '../../domain/ngsi-ld.ts';
import { propValue } from '../../domain/ngsi-ld.ts';
import { bus, BUS } from '../../services/EventBus.ts';

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
}

export class FactoryScene extends Phaser.Scene {
  private snapshot!: SceneSnapshot;
  private zoneObjects = new Map<string, ZoneObject>();

  constructor() {
    super({ key: 'Factory' });
  }

  create(): void {
    this.snapshot = this.registry.get('sceneSnapshot') as SceneSnapshot;
    this.cameras.main.setBackgroundColor('#f1f5f9');

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

    bus.on<NgsiLdEntity>(BUS.ENTITY_CHANGED, (entity) => {
      this.updateZoneForEntity(entity);
    });

    bus.on<NgsiLdEntity[]>(BUS.SNAPSHOT_LOADED, (entities) => {
      document.getElementById('canvas-overlay')?.classList.add('hidden');
      for (const entity of entities) {
        this.updateZoneForEntity(entity);
      }
    });

    bus.on<string[]>(BUS.ZONES_HIGHLIGHTED, (entityIds) => {
      this.highlightZones(entityIds);
    });

    bus.on<string>(BUS.ENTITY_SELECTED, (entityId) => {
      this.highlightZones([entityId]);
    });

    bus.on<void>(BUS.SCENARIO_RESET, () => {
      // Clear entity name labels from all zones
      for (const [, obj] of this.zoneObjects) {
        obj.entityLabel?.setText('');
        const defaultBorder = ZONE_BORDER[obj.zone.kind] ?? 0x6b7280;
        obj.bg.setStrokeStyle(2, defaultBorder);
        obj.bg.setAlpha(1);
      }
    });
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
        bg.on('pointerdown', () => bus.emit(BUS.ENTITY_SELECTED, zone.entityId!));
        bg.on('pointerover', () => bg.setStrokeStyle(3, border));
        bg.on('pointerout',  () => bg.setStrokeStyle(2, border));
      }

      const labelColor = bound ? '#1e293b' : '#9ca3af';
      const label = this.add.text(x + 8, y + 8, zone.label, {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: labelColor,
        fontStyle: bound ? 'bold' : 'normal',
      }).setDepth(1);

      // "no data" tag on unbound zones
      if (!bound) {
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

      this.zoneObjects.set(zone.id, { zone, bg, label, entityLabel });
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
            const defaultBorder = ZONE_BORDER[obj.zone.kind] ?? 0x6b7280;
            obj.bg.setStrokeStyle(2, defaultBorder);
          },
        });
      }
    }
  }

  private updateZoneForEntity(entity: NgsiLdEntity): void {
    // Find zone bound to this entity
    const zone = this.snapshot.layout.zones.find((z) => z.entityId === entity.id);
    if (!zone) return;
    const obj = this.zoneObjects.get(zone.id);
    if (!obj) return;

    // Show entity name in zone footer
    const name = propValue<string>(entity, 'name') ?? entity.id.split(':').pop() ?? entity.id;
    obj.entityLabel?.setText(name);

    // WorkCenter state → border color
    if (entity.type === 'WorkCenter') {
      const state = propValue<string>(entity, 'state') ?? 'active';
      const border = state === 'unavailable' ? 0xef4444 : ZONE_BORDER[zone.kind] ?? 0x6b7280;
      obj.bg.setStrokeStyle(3, border);
    }
  }
}
