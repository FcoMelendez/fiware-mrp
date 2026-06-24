# FIWARE-based MRP Reference Implementation

[![Documentation Status](https://readthedocs.org/projects/fiware-mrp/badge/?version=latest)](https://fiware-mrp.readthedocs.io/en/latest/)

A tutorial-driven Proof of Concept for a **Manufacturing Resource Planning (MRP) module** built on
[NGSI-LD](https://ngsi-ld.org/) and the [Orion-LD Context Broker](https://github.com/FIWARE/context.Orion-LD).

The module exposes manufacturing orders, BoMs, inventory, work orders, quality events and
traceability records through an interoperable NGSI-LD graph. Business logic lives in
Python/FastAPI microservices above the broker; the broker is the shared context layer, not
the transaction engine.

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/FcoMelendez/fiware-mrp.git
cd fiware-mrp

# 2. Start the stack
make start

# 3. Load seed data
make seed

# 4. Run the demo
make demo-01

# 5. Run automated tests
make test-01
```

Everything runs from a **single `docker compose`** — no extra tooling required beyond Docker.

---

## Visual factory emulator

The interactive emulator (`http://localhost:5173`) lets you explore NGSI-LD entities
and business commands through a browser UI — without writing curl.  It works in
**mock mode** (no backend needed) or **live mode** (against a running stack).

```bash
make install-emulator   # one-time: install npm deps
make start-mock         # mock mode — no backend required
# or
make start-emulator     # live mode — full stack + inventory-service
```

### Layout

The emulator uses a three-column layout:

| Panel | Content |
|-------|---------|
| **Left** | **Guided Tour** — step cards with execute / retry controls and ↺ Restart |
| **Center** | **Factory canvas** — Phaser 3 scene; canvas zones highlight when entities are queried; click any zone to inspect its NGSI-LD entity |
| **Right** | **Tabbed panel** — Query Inspector and Broker Explorer |

**Query Inspector tab** (default) contains three stacked sections:

- **REQUEST** console (orange) — the outgoing NGSI-LD query or business command, with a Copy curl button; collapsible
- **RESPONSE** console (blue) — the raw JSON-LD reply with a Copy answer button; collapsible
- **Entity Inspector** — structured attribute table for the selected entity; click any type badge to open its data model with field definitions and NGSI-LD template

**Broker Explorer tab** — lists all entities currently in Orion-LD grouped by type.
Click a type badge to read its data model; click an entity row to inspect its attributes.

A **Live event timeline** along the bottom shows every SSE notification broadcast
from the broker.  Hover a card to read what triggered the event; click to expand the raw payload.

### Under the hood

After a step executes, the step card automatically reveals a numbered **Under the hood**
narrative that traces the full call chain — from the emulator through each microservice
to the final Orion-LD write — alongside the HTTP status and timing.

### Tutorial selector

The top-bar dropdown switches between Tutorial 01 (master data) and Tutorial 02 (inventory).
Tutorial 02 requires `inventory-service`; use `make start-emulator` to include it.

---

## Twelve-week tutorial roadmap

| Tag | Tutorial | Business capability |
|-----|----------|-------------------|
| v0.1 | [01 — Getting started](tutorials/01-getting-started-context/README.md) | NGSI-LD context, factory graph, master data |
| v0.2 | [02 — Inventory](tutorials/02-inventory/README.md) | Material receipts, inventory balances, lots |
| v0.3 | 03 — BoM | Bill of Materials, BoM explosion, material requirements |
| v0.4 | 04 — Manufacturing order | MO confirmation, stock moves, state machine |
| v0.5 | 05 — Reservations | Component reservations, shortages, procurement |
| v0.6 | 06 — Scheduling | Work orders, routing dependencies, finite capacity |
| v0.7 | 07 — Shop floor | Operator execution, material consumption, events |
| v0.8 | 08 — Traceability | Finished goods, lot genealogy, basic costing |
| v0.9 | 09 — Quality | Checks, alerts, scrap, rework, backorders |
| v0.10 | 10 — MPS | Demand forecast, projected inventory, suggested MOs |
| v0.11 | 11 — IoT/MES | Machine signals, subscriptions, temporal data |
| v0.12 | 12 — End-to-end | Full forecast-to-traceability demo, v1.0 release |

---

## Repository structure

```
fiware-mrp/
  contexts/mrp/v0.1/       JSON-LD @context (versioned, immutable after release)
  data-models/dataModel.MRP/<Type>/
                            JSON Schema + NGSI-LD examples per entity type
  packages/
    emulator-gateway/       Node.js + Express SSE gateway (scenario engine, NGSI-LD proxy)
    emulator-ui/            Phaser 3 + TypeScript interactive factory emulator
  services/
    context-server/         Serves JSON-LD context files (FastAPI)
    mrp-api/                Business command API (FastAPI, grows each week)
    seed-loader/            Deterministic seed data for each tutorial
    inventory-service/      Added in Tutorial 02
    bom-service/            Added in Tutorial 03
    scheduler-service/      Added in Tutorial 06
    shopfloor-service/      Added in Tutorial 07
    quality-service/        Added in Tutorial 09
    mps-service/            Added in Tutorial 10
    iot-simulator/          Added in Tutorial 11
  tutorials/01-…12-/        Self-contained tutorial README + tests
  scripts/                  wait-for-orion.sh and helpers
  docs/                     Sphinx RST documentation (published on ReadTheDocs)
  postman/                  Postman collection (complete in Week 12)
```

---

## Make targets

| Target | Description |
|--------|-------------|
| `make start` | Build and start the core stack |
| `make stop` | Stop containers |
| `make reset` | Stop + remove volumes (clean state) |
| `make seed` | Load Tutorial 01 seed data |
| `make demo-01` | Run Tutorial 01 demo walkthrough |
| `make test-01` | Run Tutorial 01 automated assertions |
| `make test-02` | Run Tutorial 02 automated assertions |
| `make test-all` | Run all tutorial tests |
| `make lint` | Validate JSON schemas and shell scripts |
| `make install-emulator` | Install npm dependencies for the emulator packages (run once) |
| `make start-emulator` | Start the full stack + Phaser visual emulator (`http://localhost:5173`) |
| `make start-mock` | Start the emulator in mock mode — no MRP backend required |
| `make stop-emulator` | Stop emulator containers only |
| `make docs` | Build Sphinx HTML documentation |
| `make docs-live` | Live-reload docs server on `http://127.0.0.1:8000` |

---

## Architecture principles

- **Context-first interoperability** — systems integrate through NGSI-LD entities and relationships.
- **Command-controlled state changes** — business services validate state transitions before writing context.
- **Tutorial-driven delivery** — every weekly increment is runnable from a clean checkout.
- **One model, many adoption levels** — adopters may use only the data model, selected services, or the full stack.

---

## Documentation

| Document | Purpose |
|---|---|
| [Reference Architecture and Spec](FIWARE_MRP_Reference_Architecture_and_Spec.docx) | Architecture, data models, APIs, execution pipelines |
| [Adopter Guide](FIWARE_MRP_Adopter_Guide.docx) | Value proposition, use cases, adoption patterns |
| [GitHub Workplan and Tutorial Guide](FIWARE_MRP_GitHub_Workplan_and_Tutorial.docx) | 12-week plan, engineering standards |

---

## License

[Apache 2.0](LICENSE.md)
