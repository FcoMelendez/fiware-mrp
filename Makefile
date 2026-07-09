.PHONY: start stop reset seed logs lint \
        demo-01 test-01 \
        demo-02 test-02 \
        test-03 \
        test-04 \
        test-05 \
        test-06 \
        test-07 \
        test-08 \
        test-09 \
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
	$(COMPOSE) down -v --remove-orphans
	EMULATOR_MODE=live $(COMPOSE) up -d --build mongo orion-ld context-server mrp-api inventory-service bom-service manufacturing-service scheduler-service shopfloor-service finished-goods-service quality-service emulator-gateway emulator-ui
	@echo "Emulator UI         → http://localhost:5173"
	@echo "Gateway API         → http://localhost:8090/api/health"
	@echo "Inventory API       → http://localhost:8081/health"
	@echo "BoM API             → http://localhost:8082/health"
	@echo "Manufacturing API   → http://localhost:8083/health"
	@echo "Scheduler API       → http://localhost:8084/health"
	@echo "Shopfloor API       → http://localhost:8085/health"
	@echo "Finished Goods API  → http://localhost:8086/health"
	@echo "Quality API         → http://localhost:8087/health"

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

test-03:
	@echo "=== Running Tutorial 03 tests ==="
	@bash tutorials/03-bom/tests/test-03.sh

test-04:
	@echo "=== Running Tutorial 04 tests ==="
	@bash tutorials/04-manufacturing-order/tests/test-04.sh

test-05:
	@echo "=== Running Tutorial 05 tests ==="
	@bash tutorials/05-component-reservation/tests/test-05.sh

test-06:
	@echo "=== Running Tutorial 06 tests ==="
	@bash tutorials/06-work-orders/tests/test-06.sh

test-07:
	@echo "=== Running Tutorial 07 tests ==="
	@bash tutorials/07-shop-floor/tests/test-07.sh

test-08:
	@echo "=== Running Tutorial 08 tests ==="
	@bash tutorials/08-finished-goods/tests/test-08.sh

test-09:
	@echo "=== Running Tutorial 09 tests ==="
	@bash tutorials/09-quality/tests/test-09.sh

test-all:
	@echo "=== Clean reset for full test suite ==="
	$(COMPOSE) down -v --remove-orphans
	$(COMPOSE) up -d mongo orion-ld context-server mrp-api inventory-service bom-service manufacturing-service scheduler-service shopfloor-service finished-goods-service quality-service
	./scripts/wait-for-orion.sh
	@echo "=== Tutorial 01 ===" && TUTORIAL=01 $(COMPOSE) run --rm --build -e TUTORIAL=01 seed && bash tutorials/01-getting-started-context/tests/test-01.sh
	@echo "=== Tutorial 02 ===" && TUTORIAL=02 $(COMPOSE) run --rm --build -e TUTORIAL=02 seed && bash tutorials/02-inventory/tests/test-02.sh
	@echo "=== Tutorial 03 ===" && TUTORIAL=03 $(COMPOSE) run --rm --build -e TUTORIAL=03 seed && bash tutorials/03-bom/tests/test-03.sh
	@echo "=== Tutorial 04 ===" && TUTORIAL=04 $(COMPOSE) run --rm --build -e TUTORIAL=04 seed && bash tutorials/04-manufacturing-order/tests/test-04.sh
	@echo "=== Tutorial 05 ===" && TUTORIAL=05 $(COMPOSE) run --rm --build -e TUTORIAL=05 seed && bash tutorials/05-component-reservation/tests/test-05.sh
	@echo "=== Tutorial 06 ===" && TUTORIAL=06 $(COMPOSE) run --rm --build -e TUTORIAL=06 seed && bash tutorials/06-work-orders/tests/test-06.sh
	@echo "=== Tutorial 07 ===" && TUTORIAL=07 $(COMPOSE) run --rm --build -e TUTORIAL=07 seed && bash tutorials/07-shop-floor/tests/test-07.sh
	@echo "=== Tutorial 08 ===" && TUTORIAL=08 $(COMPOSE) run --rm --build -e TUTORIAL=08 seed && bash tutorials/08-finished-goods/tests/test-08.sh
	@echo "=== Tutorial 09 ===" && TUTORIAL=09 $(COMPOSE) run --rm --build -e TUTORIAL=09 seed && bash tutorials/09-quality/tests/test-09.sh
	@echo ""
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
	@echo "  make test-02      Run Tutorial 02 automated assertions"
	@echo "  make test-03      Run Tutorial 03 automated assertions"
	@echo "  make test-04      Run Tutorial 04 automated assertions"
	@echo "  make test-05      Run Tutorial 05 automated assertions"
	@echo "  make test-06      Run Tutorial 06 automated assertions"
	@echo "  make test-07      Run Tutorial 07 automated assertions"
	@echo "  make test-08      Run Tutorial 08 automated assertions"
	@echo "  make test-09      Run Tutorial 09 automated assertions"
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
