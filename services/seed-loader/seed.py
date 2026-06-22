"""
Seed loader — posts tutorial entities to Orion-LD via NGSI-LD batch upsert.
TUTORIAL env var selects which tutorial's seed data to load (default: "01").
"""
import json
import os
import sys
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_fixed, before_log
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

ORION_URL = os.getenv("ORION_URL", "http://orion-ld:1026")
CONTEXT_URL = os.getenv(
    "CONTEXT_URL",
    "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
)
TUTORIAL = os.getenv("TUTORIAL", "01")

SEED_FILE = Path(__file__).parent / "data" / f"tutorial-{TUTORIAL}.json"


@retry(stop=stop_after_attempt(10), wait=wait_fixed(3), before=before_log(log, logging.INFO))
def wait_for_orion(client: httpx.Client) -> None:
    r = client.get(f"{ORION_URL}/ngsi-ld/ex/v1/version", timeout=5)
    r.raise_for_status()
    log.info("Orion-LD is ready.")


def load_entities(client: httpx.Client, entities: list) -> None:
    log.info("Upserting %d entities via batch API ...", len(entities))
    r = client.post(
        f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
        json=entities,
        headers={
            "Content-Type": "application/ld+json",
            "Accept": "application/json",
        },
        timeout=30,
    )
    if r.status_code not in (201, 204):
        log.error("Batch upsert failed: %s — %s", r.status_code, r.text)
        sys.exit(1)
    log.info("Batch upsert completed (HTTP %d).", r.status_code)


def main() -> None:
    if not SEED_FILE.exists():
        log.error("Seed file not found: %s", SEED_FILE)
        sys.exit(1)

    log.info("Loading Tutorial %s seed data from %s", TUTORIAL, SEED_FILE)
    entities = json.loads(SEED_FILE.read_text())

    # Inject context URL into every entity if not already set
    for entity in entities:
        if "@context" not in entity:
            entity["@context"] = CONTEXT_URL

    with httpx.Client() as client:
        wait_for_orion(client)
        load_entities(client, entities)

    log.info("Seed complete — %d entities loaded for Tutorial %s.", len(entities), TUTORIAL)


if __name__ == "__main__":
    main()
