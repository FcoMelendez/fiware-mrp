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

Tutorial 01 ships a **Phaser 3 browser emulator** that lets you explore the same
12 NGSI-LD entities through an interactive factory floor canvas instead of curl.

```bash
# No backend required — mock mode runs entirely in Docker
make install-emulator   # once: installs npm deps
make start-mock         # starts emulator-gateway + emulator-ui in mock mode

# Open the guided tour
open http://localhost:5173
```

The guided tour walks through six steps (health check → seed entities → explore
the plant → query WorkCenters / Products / StockLocations) with live HTTP traces,
an entity inspector, a data model viewer, and an SSE event timeline.

To run against a live Orion-LD broker instead of fixtures:

```bash
make start-emulator     # starts the full stack + emulator
```

---

## Twelve-week tutorial roadmap

| Tag | Tutorial | Business capability |
|-----|----------|-------------------|
| v0.1 | [01 — Getting started](tutorials/01-getting-started-context/README.md) | NGSI-LD context, factory graph, master data |
| v0.2 | 02 — Inventory | Material receipts, inventory balances, lots |
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
