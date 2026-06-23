import { bus, BUS } from './EventBus.ts';

let cmdCounter = 0;

export interface CommandOptions {
  targetEntity?: string;
  sessionId?: string;
  scenarioId?: string;
  tutorialStepId?: string;
  payload?: unknown;
}

export async function sendCommand(commandName: string, opts: CommandOptions = {}): Promise<void> {
  const envelope = {
    correlationId: `corr-ui-${Date.now()}`,
    idempotencyKey: `idem-${commandName}-${++cmdCounter}`,
    ...opts,
  };

  bus.emit(BUS.COMMAND_SENT, { commandName, envelope });

  const res = await fetch(`/api/commands/mrp/${commandName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[CommandClient] command failed', commandName, err);
  }
}
