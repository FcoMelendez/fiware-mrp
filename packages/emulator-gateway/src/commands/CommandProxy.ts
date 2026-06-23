import type { CommandEnvelope } from '../types.js';

export class CommandProxy {
  constructor(private readonly mrpApiUrl: string) {}

  async execute(
    commandName: string,
    envelope: CommandEnvelope,
  ): Promise<{ status: number; body: unknown }> {
    try {
      const res = await fetch(
        `${this.mrpApiUrl}/commands/${commandName}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(envelope),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const body = await res.json().catch(() => ({}));
      return { status: res.status, body };
    } catch (err) {
      return {
        status: 503,
        body: {
          error: 'MRP API unreachable',
          detail: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }
}
