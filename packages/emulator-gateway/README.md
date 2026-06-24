# emulator-gateway

Node.js + Express SSE gateway for the FIWARE MRP emulator.
Runs at `http://localhost:8090`.

It sits between the browser UI and the rest of the stack, providing:

- An NGSI-LD proxy so the UI does not talk to Orion-LD directly
- A scenario engine that executes guided-tour steps in mock or live mode
- An SSE stream that broadcasts broker notifications to all connected UI clients
- A command proxy that forwards business commands to the MRP microservices

---

## Modes

| Mode | How to start | Behaviour |
|------|-------------|-----------|
| `mock` | `make start-mock` | All scenario steps return in-memory fixture data; Orion-LD is not contacted |
| `live` | `make start-emulator` | Scenario steps hit the real Orion-LD broker; SSE notifications come from actual broker subscriptions |

The mode is set by the `EMULATOR_MODE` environment variable (`mock` or `live`).

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns `{ status: "ok" }` |
| `GET` | `/api/ready` | Probes Orion-LD; returns 200 when the broker is reachable |
| `GET` | `/stream` | Server-Sent Events stream — one event per broker notification or scenario action |
| `POST` | `/notify` | NGSI-LD notification receiver — broker calls this when a subscribed entity changes |
| `GET` | `/api/entities` | Returns all entities from Orion-LD (proxied, type-compacted via Link header) |
| `GET` | `/api/entities/:id` | Returns a single entity by ID |
| `GET` | `/api/scenes` | Returns the current Phaser scene snapshot (entity-to-zone bindings) |
| `POST` | `/api/commands/:name` | Forwards a business command to the target microservice and broadcasts the result |
| `GET` | `/api/scenarios` | Returns the current scenario state (step list, active step index) |
| `POST` | `/api/scenarios/step` | Executes the next scenario step; returns the step result |
| `POST` | `/api/scenarios/reset` | Resets the scenario to step 0 and clears broker state (live mode only) |

---

## Internal components

```
src/
  index.ts              Express app setup, route wiring
  config.ts             Env-var configuration (mode, ports, URLs)
  types.ts              Shared TypeScript interfaces (SceneSnapshot, GuidedStep, …)
  ngsi/
    NgsiLdClient.ts     NGSI-LD HTTP client — batch upsert, entity query, patch attrs
  stream/
    ClientHub.ts        SSE fan-out — maintains a list of connected response streams;
                        broadcasts events to all clients
  commands/
    CommandProxy.ts     HTTP proxy — forwards POST /commands/:name to the target service
  scenario/
    ScenarioEngine.ts   Stateful engine — tracks current step index, executes steps in
                        mock or live mode, broadcasts events via ClientHub
    fixtures.ts         In-memory entities and GuidedStep definitions for T01 and T02
  routes/
    health.ts           /api/health + /api/ready handlers
    entities.ts         /api/entities proxy handlers
    scenes.ts           /api/scenes handler
    commands.ts         /api/commands/:name handler
    scenarios.ts        /api/scenarios handlers (state, step, reset)
```

### ScenarioEngine

`ScenarioEngine` is the heart of the guided tour.  It holds:

- An array of `GuidedStep` definitions loaded from `fixtures.ts`
- A pointer to the current step index
- A reference to `ClientHub` for broadcasting events after each step

In **mock mode** each step returns fixture data directly, without making any network calls.
In **live mode** each step makes real NGSI-LD or business API calls through `NgsiLdClient`
or `CommandProxy`, then broadcasts the result.

A `GuidedStep` definition includes:

```typescript
{
  id: string;           // unique step slug
  title: string;        // displayed in the step card header
  description: string;  // shown in the expanded step body
  method: string;       // HTTP method label shown in the REQUEST console
  url: string;          // URL shown in the REQUEST console
  body?: object;        // request body shown in the REQUEST console
  workflow: string[];   // numbered narrative lines shown Under the hood after execution
}
```

### ClientHub

`ClientHub` maintains a `Set<Response>` of active SSE connections.  When `broadcast(event)`
is called, it serialises the event as `data: <json>\n\n` and writes it to every connected
client.  Clients that have disconnected are silently dropped.

### NgsiLdClient

Wraps `fetch` for common NGSI-LD operations:

- `batchUpsert(entities)` — `POST /ngsi-ld/v1/entityOperations/upsert`
- `queryByType(type)` — `GET /ngsi-ld/v1/entities?type=…` with the MRP Link header for type compaction
- `getEntity(id)` — `GET /ngsi-ld/v1/entities/:id`
- `patchAttrs(id, attrs)` — `PATCH /ngsi-ld/v1/entities/:id/attrs`

---

## Development

```bash
cd packages/emulator-gateway
npm install
npm run dev   # ts-node-esm watch mode on port 8090
```

Or use `make start-mock` / `make start-emulator` from the repo root to start the
gateway inside Docker alongside the UI.
