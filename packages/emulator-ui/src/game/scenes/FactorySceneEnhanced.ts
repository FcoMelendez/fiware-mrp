import Phaser from 'phaser';
import type { SceneSnapshot, ZoneLayout } from '../../domain/emulator.ts';
import type { NgsiLdEntity } from '../../domain/ngsi-ld.ts';
import { propValue, relObject } from '../../domain/ngsi-ld.ts';
import { bus, BUS } from '../../services/EventBus.ts';
import type { CanvasEntityClick } from '../../services/EventBus.ts';
import { contextStore } from '../../services/ContextStore.ts';

const HOVER_BORDER = 0x0ea5e9; // bright sky-blue — distinct from selection pulse and zone-kind borders

// ── Colour palette ─────────────────────────────────────────────────────────
const P = {
  floorBg:   0xdde3ec,
  floorGrid: 0xcbd5e1,
  zoneBg: {
    warehouse:    0xeff6ff,
    buffer:       0xfefce8,
    finishedGoods:0xf0fdf4,
    quality:      0xfff1f2,
    workCenter:   0xf1f5f9,
  } as Record<string, number>,
  zoneBorder: {
    warehouse:    0x2563eb,
    buffer:       0xca8a04,
    finishedGoods:0x16a34a,
    quality:      0xdc2626,
    workCenter:   0x475569,
  } as Record<string, number>,
  machineDark:  0x334155,
  machineMid:   0x475569,
  machineLight: 0x64748b,
  machineAccent:0x1d4ed8,
  conveyorBody: 0x475569,
  conveyorDot:  0x94a3b8,
  palletBrown:  0x92400e,
  palletSlat:   0xd97706,
  cartOrange:   0xea580c,
  cartWheel:    0x1e293b,
  opSkin:       0xf59e42,
  opHelmet:     0x1d4ed8,
  opBody:       0x7c3aed,
  opJeans:      0x1e3a5f,
  light: {
    available:    0x22c55e,
    busy:         0x3b82f6,
    waiting:      0xf59e0b,
    blocked:      0xef4444,
    maintenance:  0x9ca3af,
    off:          0x374151,
  } as Record<string, number>,
  badgeColor: {
    available:    0x16a34a,
    ready:        0x16a34a,
    inProgress:   0x2563eb,
    busy:         0x2563eb,
    waiting:      0xd97706,
    blocked:      0xdc2626,
    maintenance:  0x9ca3af,
    done:         0x15803d,
  } as Record<string, number>,
  badgeLabel: {
    available:    'READY',
    ready:        'READY',
    inProgress:   'IN PROGRESS',
    busy:         'WORKING',
    waiting:      'WAITING',
    blocked:      'BLOCKED',
    maintenance:  'MAINT',
    done:         'DONE',
  } as Record<string, string>,
};

// The broker's real state enums (data-models/dataModel.MRP/{WorkCenter,WorkOrder}/schema.json)
// use different strings than this scene's light/badge vocabulary above — map them explicitly
// rather than looking them up directly, so an unmapped state falls through to "off" instead of
// silently defaulting to green every time (which made the lights look stuck no matter what ran).
const WC_STATE_TO_LIGHT: Record<string, keyof typeof P.light> = {
  active:      'available',
  inactive:    'blocked',
  maintenance: 'maintenance',
};

const WO_STATE_TO_LIGHT: Record<string, keyof typeof P.light> = {
  planned:     'waiting',
  in_progress: 'busy',
  completed:   'available',
};

const WO_STATE_TO_BADGE: Record<string, keyof typeof P.badgeColor> = {
  planned:     'waiting',
  in_progress: 'inProgress',
  completed:   'done',
};

interface MachineObj {
  zoneId: string;
  entityId: string | undefined;
  lightGlow: Phaser.GameObjects.Arc;
  lightCircle: Phaser.GameObjects.Arc;
  badgeBg: Phaser.GameObjects.Rectangle;
  badgeText: Phaser.GameObjects.Text;
  progressBg: Phaser.GameObjects.Rectangle;
  progressFill: Phaser.GameObjects.Rectangle;
  alertContainer: Phaser.GameObjects.Container;
  entityLabel: Phaser.GameObjects.Text;
  zoneBg: Phaser.GameObjects.Rectangle;
  cx: number;
  cy: number;
  mw: number;
  mh: number;
}

interface ZoneObj {
  zone: ZoneLayout;
  bg: Phaser.GameObjects.Rectangle;
  quantityLabel?: Phaser.GameObjects.Text;
  counterLabel?: Phaser.GameObjects.Text;
}

interface ConveyorDot {
  circle: Phaser.GameObjects.Arc;
  tween: Phaser.Tweens.Tween;
}

export class FactorySceneEnhanced extends Phaser.Scene {
  private snapshot!: SceneSnapshot;
  private zoneObjs    = new Map<string, ZoneObj>();
  private machineObjs = new Map<string, MachineObj>();
  private operatorLabel!: Phaser.GameObjects.Text;
  private lightTweens = new Map<string, Phaser.Tweens.Tween>();
  private conveyorDots: ConveyorDot[] = [];
  private unsubs: Array<() => void> = [];
  // Cart animation
  private cartContainer: Phaser.GameObjects.Container | null = null;
  private cartLabel: Phaser.GameObjects.Text | null = null;
  // Live counters for zones with no single bound entity (Production Buffer, Quality) and
  // for stock zones, whose bound StockLocation entity never changes — the real quantity
  // lives on InventoryBalance entities tracked here by location.
  private stockBalances = new Map<string, Map<string, number>>();
  private wipWorkOrders = new Set<string>();
  private qualityStats = { pass: 0, fail: 0 };
  private seenQualityChecks = new Set<string>();

  constructor() {
    super({ key: 'FactoryEnhanced' });
  }

  create(): void {
    // Phaser does NOT auto-invoke a method just because it's named `shutdown` — that
    // only applies to init/preload/create/update. Without this, switching away from
    // this scene (or a resize-triggered restart) never unsubscribes its bus listeners,
    // which keep firing against destroyed GameObjects on every future entity update.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.snapshot = this.registry.get('sceneSnapshot') as SceneSnapshot;
    if (!this.snapshot) {
      this.add.text(10, 10, 'No scene data — run a tutorial step first.', {
        fontSize: '13px', fontFamily: 'monospace', color: '#64748b',
      });
      return;
    }

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#dde3ec');
    this.drawFloorGrid(width, height);

    // Draw zones (stock zones first, work centers on top for z-order)
    for (const zone of this.snapshot.layout.zones) {
      if (zone.kind !== 'workCenter') this.drawStockZone(zone, width, height);
    }
    for (const zone of this.snapshot.layout.zones) {
      if (zone.kind === 'workCenter') this.drawWorkCenterZone(zone, width, height);
    }

    // Conveyors between work centers
    this.drawConveyors(width, height);

    // Operator figure (in assembly zone)
    this.drawOperator(width, height);

    // Listen for entity / scenario events
    this.unsubs.push(
      bus.on<NgsiLdEntity>(BUS.ENTITY_CHANGED, (e) => this.onEntityChanged(e)),
      bus.on<NgsiLdEntity[]>(BUS.SNAPSHOT_LOADED, (es) => {
        for (const e of es) this.onEntityChanged(e);
        document.getElementById('canvas-overlay')?.classList.add('hidden');
      }),
      bus.on<string>(BUS.ENTITY_SELECTED, (id) => this.pulseZone(id)),
      bus.on<CanvasEntityClick>(BUS.CANVAS_ENTITY_CLICKED, ({ entityId }) => this.pulseZone(entityId)),
      bus.on<string[]>(BUS.ZONES_HIGHLIGHTED, (ids) => ids.forEach((id) => this.pulseZone(id))),
      bus.on<void>(BUS.SCENARIO_RESET, () => this.onReset()),
    );

    let resizeTimer: ReturnType<typeof setTimeout>;
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.scene.isActive('FactoryEnhanced')) this.scene.restart();
      }, 250);
    });

    // Bootstrap: SNAPSHOT_LOADED may have fired before this scene was active
    const alreadyLoaded = contextStore.getAll();
    if (alreadyLoaded.length > 0) {
      document.getElementById('canvas-overlay')?.classList.add('hidden');
      for (const entity of alreadyLoaded) this.onEntityChanged(entity);
    }
  }

  // ── Floor ────────────────────────────────────────────────────────────────

  private drawFloorGrid(width: number, height: number): void {
    const gfx = this.add.graphics();
    const step = 36;
    gfx.lineStyle(1, P.floorGrid, 0.5);
    for (let x = 0; x < width; x += step)  gfx.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += step) gfx.lineBetween(0, y, width, y);
  }

  // ── Stock zones (warehouse, buffer, finished, quality) ────────────────────

  private drawStockZone(zone: ZoneLayout, width: number, height: number): void {
    const x  = zone.xPct * width;
    const y  = zone.yPct * height;
    const w  = zone.wPct * width;
    const h  = zone.hPct * height;
    const fill   = P.zoneBg[zone.kind]   ?? 0xf8fafc;
    const border = P.zoneBorder[zone.kind] ?? 0x64748b;
    const bound  = !!zone.entityId;

    // Background
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, fill)
      .setStrokeStyle(bound ? 2 : 1, border)
      .setAlpha(bound ? 0.92 : 0.55)
      .setInteractive({ useHandCursor: bound });

    if (bound) {
      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        bus.emit<CanvasEntityClick>(BUS.CANVAS_ENTITY_CLICKED, { entityId: zone.entityId!, x: pointer.x, y: pointer.y });
      });
      bg.on('pointerover', () => {
        bg.setStrokeStyle(4, HOVER_BORDER);
        this.tweens.add({ targets: bg, scaleX: 1.02, scaleY: 1.02, duration: 120, ease: 'Sine.easeOut' });
      });
      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, border);
        this.tweens.add({ targets: bg, scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.easeIn' });
      });
    }
    const zoneObj: ZoneObj = { zone, bg };
    this.zoneObjs.set(zone.id, zoneObj);

    // Zone label
    this.add.text(x + 10, y + 8, zone.label, {
      fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold',
      color: bound ? '#1e293b' : '#9ca3af',
    }).setDepth(2);

    // Production Buffer (WIP) and Quality (pass/fail) have no single bound entity — they
    // used to render a static "—" that could never change even as WorkOrders/QualityChecks
    // streamed in constantly during a tutorial run. Give them a live counter instead.
    if (zone.id === 'production-buffer') {
      zoneObj.counterLabel = this.add.text(x + w / 2, y + h / 2, 'No work in progress', {
        fontSize: '12px', fontFamily: 'monospace', color: '#92400e', align: 'center',
      }).setOrigin(0.5).setDepth(2);
    } else if (zone.id === 'quality-area') {
      zoneObj.counterLabel = this.add.text(x + w / 2, y + h / 2 - 4, '0 passed · 0 failed', {
        fontSize: '11px', fontFamily: 'monospace', color: '#991b1b', align: 'center',
      }).setOrigin(0.5).setDepth(2);
    } else if (!bound) {
      this.add.text(x + w / 2, y + h / 2, '—', {
        fontSize: '20px', fontFamily: 'monospace', color: '#d1d5db',
      }).setOrigin(0.5).setDepth(2);
    }

    // Pallet stacks decoration (for stock zones) — only meaningful when bound
    if (bound && (zone.kind === 'warehouse' || zone.kind === 'finishedGoods')) {
      this.drawPalletRack(x + 12, y + 32, w - 24, h - 44);
      // Live on-hand quantity — the bound StockLocation entity itself never changes;
      // the real number lives on InventoryBalance entities tracked in `stockBalances`.
      zoneObj.quantityLabel = this.add.text(x + w / 2, y + h - 14, '', {
        fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#166534',
      }).setOrigin(0.5).setDepth(2);
    } else if (zone.kind === 'quality') {
      // Unbound (no entityId) but still gets the inspection-table decoration + counter above
      this.drawInspectionTable(x + w / 2, y + h / 2 + 8, w * 0.6, h * 0.4);
    }
  }

  private drawPalletRack(rx: number, ry: number, rw: number, rh: number): void {
    const gfx = this.add.graphics().setDepth(1);
    // Shelf lines
    const shelves = 2;
    const shelfH = rh / (shelves + 1);
    gfx.lineStyle(1.5, P.palletBrown, 0.4);
    for (let i = 1; i <= shelves; i++) {
      gfx.lineBetween(rx, ry + i * shelfH, rx + rw, ry + i * shelfH);
    }
    // Small pallet blocks on each shelf
    const palletW = Math.min(44, rw / 2.5);
    const palletH = 14;
    for (let i = 0; i < shelves; i++) {
      const sy = ry + (i + 1) * shelfH - palletH - 2;
      const cols = Math.floor(rw / (palletW + 6));
      for (let c = 0; c < Math.min(cols, 2); c++) {
        const px = rx + c * (palletW + 8);
        gfx.fillStyle(P.palletBrown, 0.7);
        gfx.fillRect(px, sy, palletW, palletH);
        gfx.fillStyle(P.palletSlat, 0.5);
        gfx.fillRect(px + 2, sy + 2, palletW - 4, 3);
        gfx.fillRect(px + 2, sy + 7, palletW - 4, 3);
      }
    }
  }

  private drawInspectionTable(cx: number, cy: number, tw: number, th: number): void {
    const gfx = this.add.graphics().setDepth(1);
    gfx.fillStyle(0xfca5a5, 0.4);
    gfx.fillRect(cx - tw / 2, cy - th / 2, tw, th);
    gfx.lineStyle(1.5, 0xef4444, 0.5);
    gfx.strokeRect(cx - tw / 2, cy - th / 2, tw, th);
    // Cross lines
    gfx.lineStyle(1, 0xef4444, 0.3);
    gfx.lineBetween(cx - tw / 2, cy - th / 2, cx + tw / 2, cy + th / 2);
    gfx.lineBetween(cx + tw / 2, cy - th / 2, cx - tw / 2, cy + th / 2);
  }

  // ── Work centre (machine) zone ─────────────────────────────────────────

  private drawWorkCenterZone(zone: ZoneLayout, width: number, height: number): void {
    const x  = zone.xPct * width;
    const y  = zone.yPct * height;
    const w  = zone.wPct * width;
    const h  = zone.hPct * height;
    const bound = !!zone.entityId;

    // Zone background — subtle floor patch
    const zoneBg = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xe8edf5)
      .setStrokeStyle(1.5, 0x94a3b8)
      .setAlpha(0.6)
      .setDepth(0);
    this.zoneObjs.set(zone.id, { zone, bg: zoneBg });

    // Zone label (top)
    this.add.text(x + 8, y + 6, zone.label, {
      fontSize: '10px', fontFamily: 'monospace', color: '#64748b',
    }).setDepth(4);

    // Machine dimensions
    const mw  = Math.min(w * 0.72, 200);
    const mh  = Math.min(h * 0.42, 90);
    const cx  = x + w / 2;
    const cy  = y + h * 0.46;

    this.drawMachineBody(zone, cx, cy, mw, mh, bound, width, height);
  }

  private drawMachineBody(
    zone: ZoneLayout,
    cx: number, cy: number, mw: number, mh: number,
    bound: boolean,
    _width: number, _height: number,
  ): void {
    const gfx = this.add.graphics().setDepth(3);

    // Conveyor arms (horizontal rails left and right)
    const armLen = (mw * 0.32);
    const armY   = cy + 2;
    const armH   = 14;

    gfx.fillStyle(P.conveyorBody, 0.85);
    gfx.fillRect(cx - mw / 2 - armLen, armY - armH / 2, armLen, armH);
    gfx.fillRect(cx + mw / 2,           armY - armH / 2, armLen, armH);
    // Arm lines (conveyor slots)
    gfx.lineStyle(1, P.conveyorDot, 0.5);
    for (let i = 6; i < armLen; i += 8) {
      gfx.lineBetween(cx - mw / 2 - armLen + i, armY - armH / 2 + 2,
                       cx - mw / 2 - armLen + i, armY + armH / 2 - 2);
      gfx.lineBetween(cx + mw / 2 + i, armY - armH / 2 + 2,
                       cx + mw / 2 + i, armY + armH / 2 - 2);
    }

    // Machine base (feet)
    gfx.fillStyle(P.machineDark, 1);
    gfx.fillRect(cx - mw / 2 + 8, cy + mh / 2 - 2, 16, 8);
    gfx.fillRect(cx + mw / 2 - 24, cy + mh / 2 - 2, 16, 8);

    // Main body
    gfx.fillStyle(bound ? P.machineMid : 0x9ca3af, 1);
    gfx.fillRect(cx - mw / 2, cy - mh / 2, mw, mh);
    gfx.lineStyle(2, P.machineDark, 1);
    gfx.strokeRect(cx - mw / 2, cy - mh / 2, mw, mh);

    // Inner panel
    const px = 8, py = 8;
    gfx.fillStyle(P.machineDark, 0.5);
    gfx.fillRect(cx - mw / 2 + px, cy - mh / 2 + py, mw - px * 2, mh - py * 2);

    // Panel circle accent (industrial drum look)
    const circleR = Math.min(mh * 0.28, mw * 0.18);
    gfx.fillStyle(P.machineLight, 0.6);
    gfx.fillCircle(cx, cy, circleR);
    gfx.lineStyle(2, P.machineDark, 1);
    gfx.strokeCircle(cx, cy, circleR);
    gfx.lineStyle(1.5, P.machineLight, 0.4);
    gfx.strokeCircle(cx, cy, circleR * 0.6);

    // Chimneys (pipes at top)
    gfx.fillStyle(P.machineLight, 1);
    gfx.fillRect(cx - mw * 0.22, cy - mh / 2 - 18, 10, 18);
    gfx.fillRect(cx + mw * 0.10, cy - mh / 2 - 13, 8,  13);
    gfx.lineStyle(1, P.machineDark, 0.7);
    gfx.strokeRect(cx - mw * 0.22, cy - mh / 2 - 18, 10, 18);
    gfx.strokeRect(cx + mw * 0.10, cy - mh / 2 - 13, 8, 13);

    // ── Status light (top-right of body) ────────────────────────────────────
    const lx = cx + mw / 2 - 14;
    const ly = cy - mh / 2 + 14;
    const lightGlow   = this.add.arc(lx, ly, 16, 0, 360, false, P.light.off, 0.25).setDepth(4);
    const lightCircle = this.add.arc(lx, ly, 9,  0, 360, false, P.light.off, 1).setDepth(4);
    this.add.arc(lx, ly, 4, 0, 360, false, 0xffffff, 0.5).setDepth(5);

    // ── Status badge (below machine) ────────────────────────────────────────
    const badgeW  = 82;
    const badgeH  = 20;
    const badgeBg = this.add.rectangle(cx, cy + mh / 2 + 14, badgeW, badgeH, 0x94a3b8)
      .setDepth(4).setVisible(false);
    const badgeText = this.add.text(cx, cy + mh / 2 + 14, '', {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5).setVisible(false);

    // ── Progress bar (bottom of body) ───────────────────────────────────────
    const pbY  = cy + mh / 2 - 7;
    const pbW  = mw - 16;
    const progressBg = this.add.rectangle(cx, pbY, pbW, 6, 0x1e293b).setDepth(4).setVisible(false);
    const progressFill = this.add.rectangle(cx - pbW / 2, pbY, 0, 6, 0x3b82f6)
      .setOrigin(0, 0.5).setDepth(5).setVisible(false);

    // ── Alert icon (above machine body, hidden by default) ─────────────────
    const alertContainer = this.buildAlertIcon(cx, cy - mh / 2 - 36);

    // ── Entity label (bottom) ────────────────────────────────────────────────
    const entityLabel = this.add.text(cx, cy + mh / 2 + 30, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#475569',
    }).setOrigin(0.5).setDepth(4);

    const obj: MachineObj = {
      zoneId: zone.id,
      entityId: zone.entityId,
      lightGlow, lightCircle,
      badgeBg, badgeText,
      progressBg, progressFill,
      alertContainer, entityLabel,
      zoneBg: this.zoneObjs.get(zone.id)!.bg,
      cx, cy, mw, mh,
    };
    this.machineObjs.set(zone.id, obj);

    if (bound) {
      // Highlight outline shown only on hover — gfx is raw Graphics, not itself
      // strokeable via setStrokeStyle, so this is a separate overlay rectangle.
      const hoverOutline = this.add.rectangle(cx, cy, mw + 8, mh + 8, 0x000000, 0)
        .setStrokeStyle(3, HOVER_BORDER)
        .setVisible(false)
        .setDepth(7);

      // Make the main body interactive (use the gfx bounding rect approach via a transparent hit area)
      const hitZone = this.add.rectangle(cx, cy, mw, mh, 0x000000, 0)
        .setInteractive({ useHandCursor: true }).setDepth(6);
      hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        bus.emit<CanvasEntityClick>(BUS.CANVAS_ENTITY_CLICKED, { entityId: zone.entityId!, x: pointer.x, y: pointer.y });
      });
      hitZone.on('pointerover', () => { gfx.alpha = 1.15; hoverOutline.setVisible(true); });
      hitZone.on('pointerout',  () => { gfx.alpha = 1; hoverOutline.setVisible(false); });
    }
  }

  private buildAlertIcon(cx: number, cy: number): Phaser.GameObjects.Container {
    const gfx  = this.add.graphics();
    const size = 24;
    // Red triangle
    gfx.fillStyle(0xef4444, 1);
    gfx.fillTriangle(
      cx, cy - size,
      cx - size * 0.86, cy + size * 0.5,
      cx + size * 0.86, cy + size * 0.5,
    );
    gfx.lineStyle(2, 0xfca5a5, 0.6);
    gfx.strokeTriangle(
      cx, cy - size,
      cx - size * 0.86, cy + size * 0.5,
      cx + size * 0.86, cy + size * 0.5,
    );
    const excl = this.add.text(cx, cy + 4, '!', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(7);
    const c = this.add.container(0, 0, [gfx, excl]).setDepth(7).setVisible(false);
    return c;
  }

  // ── Conveyors between work centres ────────────────────────────────────────

  private drawConveyors(width: number, height: number): void {
    // Find work-center zones in order
    const wcs = (this.snapshot?.layout.zones ?? []).filter((z) => z.kind === 'workCenter');
    if (wcs.length < 2) return;

    // Horizontal conveyor at approx mid-machine y
    for (let i = 0; i < wcs.length - 1; i++) {
      const a = wcs[i];
      const b = wcs[i + 1];
      const ax = (a.xPct + a.wPct) * width;
      const ay = (a.yPct + a.hPct * 0.46) * height;
      const bx = b.xPct * width;
      const by = (b.yPct + b.hPct * 0.46) * height;
      this.spawnConveyorDots(ax, ay, bx, by, i);
    }
  }

  private spawnConveyorDots(x1: number, y1: number, x2: number, y2: number, idx: number): void {
    // Draw conveyor body line
    const gfx = this.add.graphics().setDepth(2);
    gfx.lineStyle(14, P.conveyorBody, 0.8);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.lineStyle(12, 0x334155, 0.9);
    gfx.lineBetween(x1, y1, x2, y2);

    // Edge borders
    gfx.lineStyle(2, P.machineLight, 0.6);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = (-dy / len) * 7;
    const ny = ( dx / len) * 7;
    gfx.lineBetween(x1 + nx, y1 + ny, x2 + nx, y2 + ny);
    gfx.lineBetween(x1 - nx, y1 - ny, x2 - nx, y2 - ny);

    // Animated dots
    const dotCount = 4;
    const dur = 1400;
    for (let d = 0; d < dotCount; d++) {
      const dot = this.add.arc(x1, y1, 4, 0, 360, false, P.conveyorDot, 0.9).setDepth(3);
      const delay = (d / dotCount) * dur + idx * 170;
      const tween = this.tweens.add({
        targets: dot,
        x: x2, y: y2,
        duration: dur,
        delay,
        ease: 'Linear',
        repeat: -1,
        onRepeat: () => { dot.setPosition(x1, y1); },
      });
      this.conveyorDots.push({ circle: dot, tween });
    }
  }

  // ── Operator figure ────────────────────────────────────────────────────────

  private drawOperator(width: number, height: number): void {
    const asmZone = this.snapshot?.layout.zones.find((z) => z.id === 'assembly');
    if (!asmZone) return;

    const zx = asmZone.xPct * width;
    const zy = asmZone.yPct * height;
    const zw = asmZone.wPct * width;
    const zh = asmZone.hPct * height;
    const ox = zx + zw * 0.55;
    const oy = zy + zh * 0.75;

    const gfx = this.add.graphics().setDepth(5);
    const s = Math.max(1, Math.min(width, height) * 0.028);

    // Legs
    gfx.lineStyle(s * 0.55, P.opJeans, 1);
    gfx.lineBetween(ox, oy + s * 2.2, ox - s * 0.8, oy + s * 4.5);
    gfx.lineBetween(ox, oy + s * 2.2, ox + s * 0.8, oy + s * 4.5);

    // Body
    gfx.fillStyle(P.opBody, 1);
    gfx.fillRect(ox - s * 0.85, oy - s * 0.3, s * 1.7, s * 2.6);
    gfx.lineStyle(1, P.machineDark, 0.5);
    gfx.strokeRect(ox - s * 0.85, oy - s * 0.3, s * 1.7, s * 2.6);

    // Hi-vis stripe
    gfx.fillStyle(0xfbbf24, 0.85);
    gfx.fillRect(ox - s * 0.85, oy + s * 0.6, s * 1.7, s * 0.45);

    // Arms (idle — hanging down)
    gfx.lineStyle(s * 0.5, P.opBody, 1);
    gfx.lineBetween(ox - s * 0.85, oy + s * 0.2, ox - s * 1.7, oy + s * 2.2);
    gfx.lineBetween(ox + s * 0.85, oy + s * 0.2, ox + s * 1.7, oy + s * 2.2);

    // Head
    gfx.fillStyle(P.opSkin, 1);
    gfx.fillCircle(ox, oy - s * 1.1, s * 1.05);
    gfx.lineStyle(1, 0xd97706, 0.4);
    gfx.strokeCircle(ox, oy - s * 1.1, s * 1.05);

    // Helmet
    gfx.fillStyle(P.opHelmet, 1);
    gfx.fillRect(ox - s * 1.05, oy - s * 2.1, s * 2.1, s * 0.9);
    gfx.fillStyle(P.opHelmet, 0.85);
    gfx.fillCircle(ox, oy - s * 1.65, s * 1.05);

    const labelText = this.add.text(ox, oy + s * 5.2, 'OP-001 assigned', {
      fontSize: Math.max(9, s * 0.85) + 'px',
      fontFamily: 'monospace',
      color: '#475569',
    }).setOrigin(0.5).setDepth(5);

    // Keep gfx alive inside a container so Phaser tracks it
    this.add.container(0, 0, [gfx]).setDepth(5);
    this.operatorLabel = labelText;
  }

  // ── Material cart animation ───────────────────────────────────────────────

  private spawnCart(fromZoneId: string, toZoneId: string, label: string, width: number, height: number): void {
    this.killCart();

    const fromZone = this.snapshot?.layout.zones.find((z) => z.id === fromZoneId);
    const toZone   = this.snapshot?.layout.zones.find((z) => z.id === toZoneId);
    if (!fromZone || !toZone) return;

    const sx = (fromZone.xPct + fromZone.wPct) * width;
    const sy = (fromZone.yPct + fromZone.hPct * 0.5) * height;
    const ex = toZone.xPct * width;
    const ey = (toZone.yPct + toZone.hPct * 0.5) * height;

    const gfx = this.add.graphics().setDepth(8);
    const cw = 46, ch = 24;
    gfx.fillStyle(P.cartOrange, 1);
    gfx.fillRect(-cw / 2, -ch / 2, cw, ch);
    gfx.lineStyle(2, 0x9a3412, 1);
    gfx.strokeRect(-cw / 2, -ch / 2, cw, ch);
    gfx.lineStyle(1.5, 0xfed7aa, 0.6);
    gfx.lineBetween(-cw / 2 + 4, -2, cw / 2 - 4, -2);
    gfx.lineBetween(-cw / 2 + 4,  3, cw / 2 - 4,  3);
    // Wheels
    [[-cw / 2 + 7, ch / 2], [cw / 2 - 7, ch / 2]].forEach(([wx, wy]) => {
      gfx.fillStyle(P.cartWheel, 1);
      gfx.fillCircle(wx, wy, 5);
      gfx.fillStyle(0x475569, 0.7);
      gfx.fillCircle(wx, wy, 2);
    });

    const txt = this.add.text(0, -1, label, {
      fontSize: '9px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5).setDepth(9);

    this.cartContainer = this.add.container(sx, sy, [gfx]).setDepth(8);
    this.cartLabel = txt;
    txt.setPosition(sx, sy - 20);

    this.tweens.add({
      targets: [this.cartContainer, txt],
      x: ex,
      y: { from: sy, to: ey, duration: 2800 },
      ease: 'Sine.easeInOut',
      duration: 2800,
      onComplete: () => {
        this.killCart();
      },
    });
  }

  private killCart(): void {
    this.cartContainer?.destroy();
    this.cartLabel?.destroy();
    this.cartContainer = null;
    this.cartLabel = null;
  }

  // ── Entity state reactions ────────────────────────────────────────────────

  private onEntityChanged(entity: NgsiLdEntity): void {
    if (entity.type === 'WorkCenter')      this.updateWorkCenter(entity);
    if (entity.type === 'WorkOrder')       this.updateWorkOrder(entity);
    if (entity.type === 'StockMove')       this.updateStockMove(entity);
    if (entity.type === 'InventoryBalance') this.updateStockBalance(entity);
    if (entity.type === 'QualityCheck')    this.updateQualityStats(entity);
  }

  // InventoryBalance carries the actual quantity; the zone is bound to the StockLocation,
  // which never changes its own attributes — without this, Warehouse/Finished Goods could
  // show a static name but never a number, no matter how much stock moved.
  private updateStockBalance(entity: NgsiLdEntity): void {
    const locId = relObject(entity, 'location');
    const prodId = relObject(entity, 'product');
    if (!locId || !prodId) return;

    if (!this.stockBalances.has(locId)) this.stockBalances.set(locId, new Map());
    const qty = propValue<number>(entity, 'quantityOnHand') ?? 0;
    this.stockBalances.get(locId)!.set(prodId, qty);

    const zoneObj = [...this.zoneObjs.values()].find((z) => z.zone.entityId === locId);
    if (!zoneObj?.quantityLabel) return;
    const balances = this.stockBalances.get(locId)!;
    const total = [...balances.values()].reduce((a, b) => a + b, 0);
    zoneObj.quantityLabel.setText(`${total} EA · ${balances.size} SKU${balances.size === 1 ? '' : 's'}`);
  }

  // QualityCheck entities are immutable and accumulate — count each one exactly once
  // (SNAPSHOT_LOADED replays the same entities every reconnect) rather than re-counting.
  private updateQualityStats(entity: NgsiLdEntity): void {
    if (this.seenQualityChecks.has(entity.id)) return;
    this.seenQualityChecks.add(entity.id);

    const result = propValue<string>(entity, 'result');
    if (result === 'pass') this.qualityStats.pass += 1;
    else if (result === 'fail') this.qualityStats.fail += 1;

    const zoneObj = this.zoneObjs.get('quality-area');
    zoneObj?.counterLabel?.setText(`${this.qualityStats.pass} passed · ${this.qualityStats.fail} failed`);
  }

  private updateBufferCounter(): void {
    const zoneObj = this.zoneObjs.get('production-buffer');
    if (!zoneObj?.counterLabel) return;
    const n = this.wipWorkOrders.size;
    zoneObj.counterLabel.setText(n === 0 ? 'No work in progress' : `${n} work order${n === 1 ? '' : 's'} in progress`);
  }

  private updateWorkCenter(entity: NgsiLdEntity): void {
    const obj = this.findMachineForEntity(entity.id);
    if (!obj) return;

    const firstLoad = obj.entityLabel.text === '';
    const state = propValue<string>(entity, 'state') ?? 'active';
    const lightKey = WC_STATE_TO_LIGHT[state] ?? 'off';
    const color = P.light[lightKey];

    // Animate the status light turning on for the first time
    if (firstLoad) {
      obj.lightCircle.setFillStyle(P.light.off, 1);
      obj.lightGlow.setFillStyle(P.light.off, 0.1);
      this.tweens.add({
        targets: obj.lightGlow,
        alpha: { from: 0, to: 0.5 },
        duration: 600,
        ease: 'Sine.easeOut',
        onComplete: () => {
          obj.lightCircle.setFillStyle(color, 1);
          obj.lightGlow.setFillStyle(color, 0.3);
        },
      });
    } else {
      obj.lightCircle.setFillStyle(color, 1);
      obj.lightGlow.setFillStyle(color, 0.3);
    }

    // Kill existing tween
    this.lightTweens.get(entity.id)?.stop();
    if (lightKey === 'busy' || lightKey === 'blocked') {
      const t = this.tweens.add({
        targets: obj.lightGlow,
        alpha: { from: 0.1, to: 0.55 },
        duration: lightKey === 'blocked' ? 350 : 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.lightTweens.set(entity.id, t);
    }

    // Zone border pulse
    if (lightKey === 'blocked') {
      obj.zoneBg.setStrokeStyle(3, 0xef4444);
    } else {
      obj.zoneBg.setStrokeStyle(1.5, 0x94a3b8);
    }

    // Entity label
    const name = propValue<string>(entity, 'name') ?? entity.id.split(':').pop() ?? '';
    obj.entityLabel.setText(name);
  }

  private updateWorkOrder(entity: NgsiLdEntity): void {
    const state0 = propValue<string>(entity, 'state') ?? '';
    if (state0 === 'in_progress') this.wipWorkOrders.add(entity.id);
    else this.wipWorkOrders.delete(entity.id);
    this.updateBufferCounter();

    const wcRel = (entity['workCenter'] as { type: string; object: string } | undefined)?.object;
    const obj   = wcRel ? this.findMachineForEntity(wcRel) : undefined;
    if (!obj) return;

    const state    = propValue<string>(entity, 'state') ?? '';
    const badgeKey = WO_STATE_TO_BADGE[state];
    const col      = badgeKey ? P.badgeColor[badgeKey] : undefined;
    const lbl      = badgeKey ? P.badgeLabel[badgeKey] : state.toUpperCase();

    if (col !== undefined) {
      obj.badgeBg.setFillStyle(col, 1).setVisible(true);
      obj.badgeText.setText(lbl).setVisible(true);
      obj.alertContainer.setVisible(state === 'cancelled');
    } else {
      obj.badgeBg.setVisible(false);
      obj.badgeText.setVisible(false);
      obj.alertContainer.setVisible(false);
    }

    // Progress bar (in_progress only — fake 60%)
    const inProg = state === 'in_progress';
    obj.progressBg.setVisible(inProg);
    obj.progressFill.setVisible(inProg);
    if (inProg) {
      const pbW = obj.mw - 16;
      const pct = 0.62;
      obj.progressFill.setSize(pbW * pct, 6);
    }

    // Operator label
    if (this.operatorLabel) {
      const op = propValue<string>(entity, 'operator');
      const shortOp = op ? op.split(':').pop() : 'OP-001';
      const stateLabel: Record<string, string> = {
        planned: 'assigned', in_progress: 'working', completed: 'done', cancelled: 'cancelled',
      };
      this.operatorLabel.setText(`${shortOp} ${stateLabel[state] ?? ''}`);
    }

    // Machine status light mirrors WO state too — falls through to "off" (not a
    // false-green "available") for any state this scene doesn't have a light for.
    const lightKey = WO_STATE_TO_LIGHT[state];
    const lightColor = lightKey ? P.light[lightKey] : P.light.off;
    obj.lightCircle.setFillStyle(lightColor, 1);
    obj.lightGlow.setFillStyle(lightColor, 0.3);
  }

  // Every StockMove this stack actually creates goes straight to state=done — no service
  // ever emits an "inTransit" phase, so gating on that (as this used to) meant the cart
  // animation could never fire. React to the real receipt instead: the Packaging →
  // Finished Goods handoff gets the moving cart; a Warehouse receipt (no natural
  // "from" zone — goods arrive from an external supplier) gets a flash instead.
  private updateStockMove(entity: NgsiLdEntity): void {
    const state = propValue<string>(entity, 'state') ?? '';
    const moveType = propValue<string>(entity, 'moveType') ?? '';
    if (state !== 'done' || moveType !== 'receipt') return;

    const toLoc = relObject(entity, 'toLocation');
    const product = relObject(entity, 'product')?.split(':').pop() ?? 'parts';
    const { width, height } = this.scale;

    if (toLoc === 'urn:ngsi-ld:StockLocation:WH-FINISHED') {
      this.spawnCart('packaging', 'finished-goods', product, width, height);
      this.flashZoneById('finished-goods');
    } else if (toLoc === 'urn:ngsi-ld:StockLocation:WH-STOCK') {
      this.flashZoneById('warehouse');
    }
  }

  private flashZoneById(zoneId: string): void {
    const zoneObj = this.zoneObjs.get(zoneId);
    if (!zoneObj) return;
    this.tweens.add({
      targets: zoneObj.bg,
      alpha: { from: 0.5, to: 1 },
      duration: 300, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
      onComplete: () => zoneObj.bg.setAlpha(0.92),
    });
  }

  // ── Highlight / selection ─────────────────────────────────────────────────

  private pulseZone(entityId: string): void {
    const obj = this.findMachineForEntity(entityId);
    if (obj) {
      this.tweens.add({
        targets: obj.zoneBg,
        alpha: { from: 0.4, to: 0.9 },
        duration: 300,
        yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
        onComplete: () => obj.zoneBg.setAlpha(0.6),
      });
      return;
    }
    // Stock zones
    for (const [, zo] of this.zoneObjs) {
      if (zo.zone.entityId === entityId) {
        this.tweens.add({
          targets: zo.bg,
          alpha: { from: 0.5, to: 1 },
          duration: 300, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
          onComplete: () => zo.bg.setAlpha(0.92),
        });
      }
    }
  }

  private onReset(): void {
    this.killCart();
    for (const [, obj] of this.machineObjs) {
      obj.lightCircle.setFillStyle(P.light.off, 1);
      obj.lightGlow.setFillStyle(P.light.off, 0.15);
      obj.badgeBg.setVisible(false);
      obj.badgeText.setVisible(false);
      obj.alertContainer.setVisible(false);
      obj.progressBg.setVisible(false);
      obj.progressFill.setVisible(false);
      obj.entityLabel.setText('');
      obj.zoneBg.setStrokeStyle(1.5, 0x94a3b8);
    }
    this.lightTweens.forEach((t) => t.stop());
    this.lightTweens.clear();
    if (this.operatorLabel) this.operatorLabel.setText('OP-001 assigned');

    this.stockBalances.clear();
    this.wipWorkOrders.clear();
    this.qualityStats = { pass: 0, fail: 0 };
    this.seenQualityChecks.clear();
    for (const [, zoneObj] of this.zoneObjs) {
      zoneObj.quantityLabel?.setText('');
    }
    this.zoneObjs.get('production-buffer')?.counterLabel?.setText('No work in progress');
    this.zoneObjs.get('quality-area')?.counterLabel?.setText('0 passed · 0 failed');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private findMachineForEntity(entityId: string): MachineObj | undefined {
    for (const [, obj] of this.machineObjs) {
      if (obj.entityId === entityId) return obj;
    }
    return undefined;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  shutdown(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.lightTweens.forEach((t) => t.stop());
    this.lightTweens.clear();
    this.conveyorDots.forEach((d) => d.tween.stop());
    this.conveyorDots = [];
    this.killCart();
    this.machineObjs.clear();
    this.zoneObjs.clear();
  }
}
