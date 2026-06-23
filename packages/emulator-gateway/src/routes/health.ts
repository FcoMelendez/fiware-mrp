import type { Request, Response } from 'express';
import type { NgsiLdClient } from '../ngsi/NgsiLdClient.js';
import { config } from '../config.js';

export function healthHandler(_req: Request, res: Response): void {
  res.json({ status: 'ok', service: 'emulator-gateway', version: '0.1.0', mode: config.mode });
}

export function readyHandlerFactory(ngsi: NgsiLdClient) {
  return async (_req: Request, res: Response): Promise<void> => {
    if (config.mode === 'mock') {
      res.json({ ready: true, mode: 'mock', broker: 'skipped' });
      return;
    }
    const brokerOk = await ngsi.isReady();
    if (brokerOk) {
      res.json({ ready: true, mode: 'live', broker: 'ok' });
    } else {
      res.status(503).json({ ready: false, mode: 'live', broker: 'unreachable' });
    }
  };
}
