.PHONY: start stop reset seed logs lint \
        demo-01 test-01 \
        demo-02 test-02 \
        test-all \
        start-emulator start-mock stop-emulator \
        install-emulator \
        docs docs-live docs-clean \
        help

# Tutorial currently active (set by TUTORIAL=02 make seed, etc.)
TUTORIAL ?= 01

COMPOSE = docker compose
TUTORIAL ?= 01

# ── Stack lifecycle ────────────────────────────────────────────────────────────

start:
	$(COMPOSE) up -d --build mongo orion-ld context-server mrp-api
	./scripts/wait-for-orion.sh

stop:
	$(COMPOSE) down

reset:
	$(COMPOSE) down -v --remove-orphans
	@echo "Volumes removed — clean state ready."

logs:
	$(COMPOSE) logs -f

logs-ci:
	$(COMPOSE) logs --no-color

# ── Seed ───────────────────────────────────────────────────────────────────────

seed:
	TUTORIAL=$(TUTORIAL) $(COMPOSE) run --rm --build \
	  -e TUTORIAL=$(TUTORIAL) seed

# ── Emulator ──────────────────────────────────────────────────────────────────

install-emulator:
	cd packages/emulator-gateway && npm install
	cd packages/emulator-ui && npm install

start-emulator:
	EMULATOR_MODE=live $(COMPOSE) up -d --build mongo orion-ld context-server mrp-api inventory-service emulator-gateway emulator-ui
	@echo "Emulator UI      → http://localhost:5173"
	@echo "Gateway API      → http://localhost:8090/api/health"
	@echo "Inventory API    → http://localhost:8081/health"

start-mock:
	EMULATOR_MODE=mock $(COMPOSE) up -d --build emulator-gateway emulator-ui
	@echo "Mock mode — no backend required."
	@echo "Emulator UI → http://localhost:5173"

stop-emulator:
	$(COMPOSE) stop emulator-gateway emulator-ui

# ── Tutorial demos ────────────────────────────────────────────────────────────

demo-01:
	@echo "=== Tutorial 01: Getting started with the FIWARE MRP context ==="
	@bash tutorials/01-getting-started-context/tests/demo-01.sh

# ── Tutorial tests ────────────────────────────────────────────────────────────

test-01:
	@echo "=== Running Tutorial 01 tests ==="
	@bash tutorials/01-getting-started-context/tests/test-01.sh

test-02:
	@echo "=== Running Tutorial 02 tests ==="
	@bash tutorials/02-inventory/tests/test-02.sh

test-all: test-01 test-02
	@echo "=== All tests passed ==="

# ── Quality gates ─────────────────────────────────────────────────────────────

lint: lint-schemas lint-shell

lint-schemas:
	@echo "Validating JSON schemas..."
	python3 -c "\
	import json, pathlib, sys; \
	errors = []; \
	[errors.append(f) or print(f'  OK {f}') \
	 for f in pathlib.Path('data-models').rglob('schema.json') \
	 if not (lambda d: True)(json.loads(f.read_text()))]; \
	sys.exit(len(errors))"
	@echo "All schemas are valid JSON."

lint-shell:
	@which shellcheck > /dev/null 2>&1 && shellcheck scripts/*.sh tutorials/**/*.sh \
	  || echo "shellcheck not installed — skipping shell linting"

# ── Documentation ─────────────────────────────────────────────────────────────

docs:
	@cd docs && $(MAKE) html
	@echo "Open: docs/_build/html/index.html"

docs-live:
	@cd docs && $(MAKE) livehtml

docs-clean:
	@cd docs && $(MAKE) clean

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "FIWARE MRP Reference Implementation"
	@echo ""
	@echo "  make start        Start core stack (Orion-LD, context-server, mrp-api)"
	@echo "  make stop         Stop containers"
	@echo "  make reset        Stop and remove all volumes (clean slate)"
	@echo "  make seed         Load Tutorial 01 seed data (TUTORIAL=XX to override)"
	@echo "  make demo-01      Run Tutorial 01 demo script"
	@echo "  make test-01      Run Tutorial 01 automated assertions"
	@echo "  make test-all     Run all tutorial tests"
	@echo "  make start-emulator  Start full stack + Phaser emulator (http://localhost:5173)"
	@echo "  make start-mock      Start emulator in mock mode (no MRP backend needed)"
	@echo "  make stop-emulator   Stop emulator containers only"
	@echo "  make install-emulator  Install npm deps (run once before docker)"
	@echo "  make lint         Validate JSON schemas and shell scripts"
	@echo "  make logs         Follow container logs"
	@echo "  make docs         Build Sphinx HTML documentation"
	@echo "  make docs-live    Live-reload docs server on http://127.0.0.1:8000"
	@echo "  make docs-clean   Remove docs build directory"
	@echo ""
