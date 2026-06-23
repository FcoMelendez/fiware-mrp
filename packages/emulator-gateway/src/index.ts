import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ClientHub } from './stream/ClientHub.js';
import { NgsiLdClient } from './ngsi/NgsiLdClient.js';
import { CommandProxy } from './commands/CommandProxy.js';
import { ScenarioEngine } from './scenario/ScenarioEngine.js';
import { healthHandler, readyHandlerFactory } from './routes/health.js';
import { scenesRouter } from './routes/scenes.js';
import { entitiesRouter } from './routes/entities.js';
import { commandsRouter } from './routes/commands.js';
import { scenariosRouter } from './routes/scenarios.js';
import type { Request, Response } from 'express';

const app = express();
app.use(cors());
app.use(express.json());

const hub = new ClientHub();
const ngsi = new NgsiLdClient(config.orionUrl, config.contextUrl);
const proxy = new CommandProxy(config.mrpApiUrl);
const engine = new ScenarioEngine(hub, ngsi, config.mode);

// ── System endpoints ──────────────────────────────────────────────────────────
app.get('/api/health', healthHandler);
app.get('/api/ready', readyHandlerFactory(ngsi));

// ── SSE stream ────────────────────────────────────────────────────────────────
app.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  // Send a keepalive comment every 25s to prevent proxy timeouts
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 25_000);
  hub.addClient(res);
  req.on('close', () => {
    clearInterval(keepalive);
    hub.removeClient(res);
  });
});

// ── NGSI-LD notification receiver ─────────────────────────────────────────────
app.post('/notify', (req: Request, res: Response) => {
  const notification = req.body as { data?: Array<Record<string, unknown>> };
  const entities = notification.data ?? [];
  for (const entity of entities) {
    const entityId = entity['id'] as string | undefined;
    const entityType = entity['type'] as string | undefined;
    if (!entityId) continue;
    const attrs = Object.fromEntries(
      Object.entries(entity).filter(([k]) => k !== 'id' && k !== 'type' && k !== '@context'),
    );
    hub.broadcast({
      eventType: 'entityChanged',
      entityId,
      entityType,
      changedAttributes: Object.keys(attrs),
      payload: attrs,
    });
  }
  res.status(204).send();
});

// ── Business routes ───────────────────────────────────────────────────────────
app.use('/api/scenes', scenesRouter(ngsi, hub));
app.use('/api/entities', entitiesRouter(ngsi));
app.use('/api/commands', commandsRouter(hub, proxy));
app.use('/api/scenarios', scenariosRouter(engine));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`[emulator-gateway] mode=${config.mode} port=${config.port}`);
  console.log(`  health  → http://localhost:${config.port}/api/health`);
  console.log(`  ready   → http://localhost:${config.port}/api/ready`);
  console.log(`  stream  → http://localhost:${config.port}/stream`);
});
