import { createPhaserGame } from './game/PhaserGame.ts';
import { TutorialChecklist } from './ui/TutorialChecklist.ts';
import { EventTimeline } from './ui/EventTimeline.ts';
import { EntityInspector } from './ui/EntityInspector.ts';
import { CommandPanel } from './ui/CommandPanel.ts';
import { bus, BUS } from './services/EventBus.ts';
import type { ConnectionStatus } from './domain/emulator.ts';

// Boot DOM panels
new TutorialChecklist('tutorial-steps');
new EventTimeline('timeline-events');
new EntityInspector('inspector-content');
new CommandPanel('command-panel-actions');

// Connection status badge
const statusBadge = document.getElementById('status-badge');
const statusDot = document.getElementById('status-dot');

bus.on<ConnectionStatus>(BUS.CONNECTION_CHANGED, (status) => {
  if (!statusBadge || !statusDot) return;
  const labels: Record<ConnectionStatus, string> = {
    connecting: 'CONNECTING',
    live: 'LIVE',
    mock: 'MOCK',
    offline: 'OFFLINE',
  };
  const colors: Record<ConnectionStatus, string> = {
    connecting: '#f59e0b',
    live: '#22c55e',
    mock: '#3b82f6',
    offline: '#ef4444',
  };
  statusBadge.textContent = labels[status] ?? status.toUpperCase();
  statusDot.style.backgroundColor = colors[status] ?? '#9ca3af';
});

// Start the Phaser game inside #game-container
createPhaserGame('game-container');
