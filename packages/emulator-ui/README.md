# emulator-ui

Phaser 3 + TypeScript browser emulator for the FIWARE MRP reference implementation.
Served by Vite at `http://localhost:5173`.

---

## Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Top bar — tutorial selector · status badge (LIVE / MOCK / OFFLINE)     │
├─────────────────┬───────────────────────────┬───────────────────────────┤
│   Left panel    │     Center (canvas)        │    Right panel (tabbed)   │
│   Guided Tour   │   Phaser 3 factory scene   │  Query Inspector | Broker │
│   (310 px)      │   (flex 1)                 │  (290 px)                 │
├─────────────────┴───────────────────────────┴───────────────────────────┤
│  Bottom — Live event timeline (SSE cards, horizontal scroll)             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Left panel — Guided Tour

Six step cards per tutorial.  Each card has:

- **Step indicator** — numbered circle; grey (pending) → blue (active) → green (done) → red (failed)
- **Execute button** — sends the command or query through the gateway
- **↺ Retry** — re-runs the step without resetting the scenario
- **↺ Restart** (panel header) — resets the whole scenario and clears Orion-LD broker state

After a step executes, the card automatically reveals an **Under the hood** section:
a numbered narrative tracing the full call chain from emulator → microservice → Orion-LD,
plus the HTTP status and elapsed time.

A **Welcome banner** above the step list is visible before any step runs; it is hidden once
the first step executes.

---

## Center — Factory canvas

A Phaser 3 scene renders the factory floor layout.  After seed data is loaded, canvas zones
are bound to NGSI-LD entity IDs.  Clicking a zone opens the entity in the Entity Inspector.
Zones highlight in amber when a query step returns matching entities.

---

## Right panel — tabs

### Query Inspector (default tab)

Three stacked sections:

| Section | Colour | Purpose |
|---------|--------|---------|
| **REQUEST** | Orange | Outgoing NGSI-LD query or business command (method, URL, body) |
| **RESPONSE** | Blue | Raw JSON-LD reply from the gateway or microservice |
| **Entity Inspector** | — | Structured attribute view of the most recently selected entity |

Both consoles are **collapsible** — click the header bar to hide or show the body.
Each console has a copy button (Copy curl / Copy answer).

**Entity Inspector** displays:
- Type badge (coloured border) — click to navigate to the data model view
- Entity ID in monospace
- Attribute table — Properties in plain text, Relationships in italic purple
- Toggle for raw JSON-LD view

**Data model view** — opened by clicking any type badge anywhere in the UI:
- Readable table of all attributes, their NGSI-LD kind (Property / Relationship), value type, and description
- Toggle to show the raw NGSI-LD entity template
- **← Back** button returns to the previous view (entity detail, entity list, or broker list)

**Context freshness** — at the bottom of the Query Inspector pane shows the time since the
last SSE notification from the broker; colour-coded green (< 10 s) → amber (< 60 s) → red.

### Broker Explorer tab

Lists all entities currently in Orion-LD, grouped by type.

- Click a **type badge** to open the data model view for that type.
- Click an **entity row** to inspect its attributes in the Broker Explorer pane.
- **↻ Refresh** — re-fetches all entities from `/api/entities`.

The Broker Explorer fetches a fresh snapshot each time the tab is activated.

---

## Bottom bar — Live event timeline

Horizontal-scrolling row of cards, one per SSE event received from the gateway.

- Hover a card — tooltip shows what triggered the event, why, and what it means for system state.
- Click a card — expands the raw entity payload and shows a link to jump to the Entity Inspector.

---

## Tutorial selector

The dropdown in the top bar switches the guided tour between:

- **Tutorial 01 – Getting started** — master data (Company, Plant, WorkCenter, Product, StockLocation)
- **Tutorial 02 – Inventory** — inventory commands (InventoryBalance, StockMove, Lot)

Switching tutorials reloads the step definitions.  Reset the broker state first with
**↺ Restart** if Tutorial 01 data is already in Orion-LD.

---

## UI components (`src/ui/`)

| File | Class | Responsibility |
|------|-------|----------------|
| `TutorialChecklist.ts` | `TutorialChecklist` | Renders step cards, drives step execution, populates REQUEST/RESPONSE consoles, renders Under the Hood |
| `EntityInspector.ts` | `EntityInspector` | Manages the Entity Inspector pane; exports `renderDataModel()` shared by BrokerExplorer |
| `BrokerExplorer.ts` | `BrokerExplorer` | Fetches and renders the entity list from `/api/entities`; uses `renderDataModel()` |
| `EventTimeline.ts` | `EventTimeline` | Subscribes to the SSE stream; renders timeline cards |
| `CommandPanel.ts` | `CommandPanel` | Wires the context freshness indicator; listens for command and timeline events |

`renderDataModel(el, type, typeColor, backFn)` is a module-level export from `EntityInspector.ts`.
Both `EntityInspector` and `BrokerExplorer` call it, passing their own `backFn` so the **← Back**
button returns to the correct previous view in every context.

---

## Development

```bash
# Install deps (once)
npm install   # from repo root: make install-emulator

# Dev server (mock mode, no backend needed)
make start-mock

# Dev server (live mode, requires full stack)
make start-emulator

# Type-check
cd packages/emulator-ui && npx tsc --noEmit
```

The Vite dev server at `http://localhost:5173` hot-reloads on every save.
The emulator proxies `/api/*` and `/stream` to the gateway at `http://localhost:8090`.
