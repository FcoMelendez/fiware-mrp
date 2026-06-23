import { Router } from 'express';
import type { ClientHub } from '../stream/ClientHub.js';
import type { CommandProxy } from '../commands/CommandProxy.js';
import { config } from '../config.js';

let cmdCounter = 0;

export function commandsRouter(hub: ClientHub, proxy: CommandProxy): Router {
  const router = Router();

  router.post('/mrp/:commandName', async (req, res) => {
    const { commandName } = req.params;
    const body = req.body as Record<string, unknown>;

    const envelope = {
      commandId: `cmd-${String(++cmdCounter).padStart(6, '0')}`,
      correlationId: (body['correlationId'] as string) || `corr-${Date.now()}`,
      idempotencyKey:
        (body['idempotencyKey'] as string) || `idem-${commandName}-${Date.now()}`,
      sessionId: body['sessionId'] as string | undefined,
      scenarioId: body['scenarioId'] as string | undefined,
      tutorialStepId: body['tutorialStepId'] as string | undefined,
      targetEntity: body['targetEntity'] as string | undefined,
      payload: body['payload'],
    };

    if (config.mode === 'live') {
      const result = await proxy.execute(commandName, envelope);
      if (result.status >= 400) {
        hub.broadcast({
          eventType: 'commandFailed',
          correlationId: envelope.correlationId,
          payload: { commandName, ...result },
        });
        res.status(result.status).json(result.body);
        return;
      }
      hub.broadcast({
        eventType: 'commandAccepted',
        correlationId: envelope.correlationId,
        payload: { commandName, commandId: envelope.commandId, response: result.body },
      });
      res.status(202).json({ ...envelope, accepted: true });
      return;
    }

    // Mock mode: simulate command acceptance and emit a mock entity update
    hub.broadcast({
      eventType: 'commandAccepted',
      correlationId: envelope.correlationId,
      payload: { commandName, commandId: envelope.commandId },
    });

    // Emit a plausible entityChanged for known commands
    const mockUpdates: Record<string, { entityId: string; attrs: Record<string, unknown>; animation: string }> = {
      'work-orders.start': {
        entityId: envelope.targetEntity || 'urn:ngsi-ld:WorkOrder:WO-0001-assembly',
        attrs: { state: { type: 'Property', value: 'inProgress' } },
        animation: 'workOrderStarted',
      },
      'work-orders.finish': {
        entityId: envelope.targetEntity || 'urn:ngsi-ld:WorkOrder:WO-0001-assembly',
        attrs: { state: { type: 'Property', value: 'done' } },
        animation: 'workOrderFinished',
      },
      'manufacturing-orders.confirm': {
        entityId: envelope.targetEntity || 'urn:ngsi-ld:ManufacturingOrder:MO-0001',
        attrs: { state: { type: 'Property', value: 'confirmed' } },
        animation: 'moConfirmed',
      },
      'inventory.reserve-components': {
        entityId: envelope.targetEntity || 'urn:ngsi-ld:InventoryBalance:ElectricMotor-WH-Stock',
        attrs: { reservedQuantity: { type: 'Property', value: 10 } },
        animation: 'reservationCompleted',
      },
    };

    const update = mockUpdates[commandName];
    if (update) {
      setTimeout(() => {
        hub.broadcast({
          eventType: 'entityChanged',
          entityId: update.entityId,
          entityType: update.entityId.split(':')[2],
          changedAttributes: Object.keys(update.attrs),
          payload: update.attrs,
          visualHint: { animation: update.animation },
          correlationId: envelope.correlationId,
        });
      }, 600);
    }

    res.status(202).json({ ...envelope, accepted: true, mode: 'mock' });
  });

  return router;
}
