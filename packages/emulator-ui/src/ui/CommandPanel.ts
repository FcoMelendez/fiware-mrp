import { bus, BUS } from '../services/EventBus.ts';

export class CommandPanel {
  private el: HTMLElement;
  private freshnessEl: HTMLElement | null;
  private lastEventAt: number | null = null;
  private freshnessTimer: ReturnType<typeof setInterval> | null = null;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`CommandPanel: #${containerId} not found`);
    this.el = el;
    this.freshnessEl = document.getElementById('context-freshness');

    bus.on(BUS.COMMAND_SENT, () => {
      this.setLoading(true);
      setTimeout(() => this.setLoading(false), 2000);
    });

    bus.on(BUS.TIMELINE_EVENT, () => {
      this.lastEventAt = Date.now();
    });

    this.startFreshnessTimer();
  }

  private setLoading(loading: boolean): void {
    const buttons = this.el.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach((b) => (b.disabled = loading));
  }

  private startFreshnessTimer(): void {
    if (this.freshnessTimer) clearInterval(this.freshnessTimer);
    this.freshnessTimer = setInterval(() => {
      if (!this.freshnessEl) return;
      if (!this.lastEventAt) {
        this.freshnessEl.textContent = 'No broker notification yet';
        this.freshnessEl.style.color = '#9ca3af';
        return;
      }
      const secs = Math.round((Date.now() - this.lastEventAt) / 1000);
      this.freshnessEl.textContent = `Last broker notification: ${secs}s ago`;
      this.freshnessEl.style.color = secs < 10 ? '#22c55e' : secs < 60 ? '#f59e0b' : '#ef4444';
    }, 1000);
  }
}
