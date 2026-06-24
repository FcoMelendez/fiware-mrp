import { createPhaserGame } from './game/PhaserGame.ts';
import { TutorialChecklist } from './ui/TutorialChecklist.ts';
import { EventTimeline } from './ui/EventTimeline.ts';
import { EntityInspector } from './ui/EntityInspector.ts';
import { CommandPanel } from './ui/CommandPanel.ts';
import { BrokerExplorer } from './ui/BrokerExplorer.ts';
import { bus, BUS } from './services/EventBus.ts';
import type { ConnectionStatus } from './domain/emulator.ts';

// ── Console collapse/expand ────────────────────────────────────────────────
['request-console', 'response-console'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const header  = el.querySelector<HTMLElement>('.console-header')!;
  const body    = el.querySelector<HTMLElement>('.console-body')!;
  const chevron = el.querySelector<HTMLElement>('.console-chevron')!;
  header.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const collapsed = body.classList.toggle('collapsed');
    chevron.style.transform = collapsed ? 'rotate(-90deg)' : '';
  });
});

// Boot DOM panels
new TutorialChecklist('tutorial-steps');
new EventTimeline('timeline-events');
new EntityInspector('inspector-content');
new CommandPanel('command-panel-actions');
const explorer = new BrokerExplorer('broker-explorer-content');

// ── Right-panel tab switching ──────────────────────────────────────────────
function switchToTab(tab: 'inspector' | 'explorer'): void {
  document.querySelectorAll<HTMLButtonElement>('.rp-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset['tab'] === tab);
  });
  document.getElementById('rp-pane-inspector')?.classList.toggle('hidden', tab !== 'inspector');
  document.getElementById('rp-pane-explorer')?.classList.toggle('hidden', tab !== 'explorer');
}

document.querySelectorAll<HTMLButtonElement>('.rp-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset['tab'] as 'inspector' | 'explorer';
    switchToTab(tab);
    if (tab === 'explorer') explorer.activate();
  });
});

// Auto-switch to inspector on any entity selection or step completion
bus.on(BUS.ENTITY_SELECTED,  () => switchToTab('inspector'));
bus.on(BUS.ENTITIES_LISTED,  () => switchToTab('inspector'));
bus.on(BUS.STEP_COMPLETED,   () => switchToTab('inspector'));

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
