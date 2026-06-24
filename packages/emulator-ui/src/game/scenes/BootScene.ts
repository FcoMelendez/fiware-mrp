import Phaser from 'phaser';
import { gatewayClient } from '../../services/GatewayClient.ts';
import { contextStore } from '../../services/ContextStore.ts';
import type { SceneSnapshot } from '../../domain/emulator.ts';
import type { ConnectionStatus } from '../../domain/emulator.ts';
import { bus, BUS } from '../../services/EventBus.ts';

export class BootScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1e293b);

    this.add.text(width / 2, height / 2 - 60, 'FIWARE MRP Emulator', {
      fontSize: '28px',
      color: '#f1f5f9',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.statusText = this.add.text(width / 2, height / 2, 'Connecting to gateway…', {
      fontSize: '14px',
      color: '#94a3b8',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    bus.on<ConnectionStatus>(BUS.CONNECTION_CHANGED, (status) => {
      this.onConnectionChanged(status);
    });

    // Connect to gateway SSE stream
    gatewayClient.connect();

    // Load initial snapshot after a short delay regardless of SSE status
    // (mock mode may not emit snapshot automatically)
    setTimeout(() => this.loadSnapshot(), 1500);
  }

  private onConnectionChanged(status: ConnectionStatus): void {
    const labels: Record<ConnectionStatus, string> = {
      connecting: 'Connecting to gateway…',
      live: 'Connected — loading scene…',
      mock: 'Mock mode — loading scene…',
      offline: 'Gateway offline — retrying…',
    };
    if (this.statusText) this.statusText.setText(labels[status] ?? status);
  }

  private async loadSnapshot(): Promise<void> {
    try {
      const res = await fetch('/api/scenes/mrp-demo-cell/snapshot');
      if (res.ok) {
        const snapshot = (await res.json()) as SceneSnapshot;
        // Dispatch snapshot to store
        contextStore.replaceSnapshot(snapshot.entities);
        // Store layout on game registry for FactoryScene
        this.registry.set('sceneSnapshot', snapshot);
        this.transitionToFactory();
      }
    } catch {
      this.statusText?.setText('Failed to load snapshot — retrying in mock mode');
    }
  }

  private transitionToFactory(): void {
    if (this.scene.isActive('Factory')) return;
    this.scene.start('Factory');
  }
}
