import type { Response } from 'express';
import type { EmulatorEvent } from '../types.js';

let eventCounter = 0;

export class ClientHub {
  private clients = new Set<Response>();

  addClient(res: Response): void {
    this.clients.add(res);
  }

  removeClient(res: Response): void {
    this.clients.delete(res);
  }

  broadcast(partial: Omit<EmulatorEvent, 'eventId' | 'observedAt'>): void {
    const event: EmulatorEvent = {
      eventId: `evt-${String(++eventCounter).padStart(6, '0')}`,
      observedAt: new Date().toISOString(),
      ...partial,
    };
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      client.write(data);
    }
  }

  get size(): number {
    return this.clients.size;
  }
}
