# Postman collection

`fiware-mrp.postman_collection.json` covers every business command and
query endpoint across all 12 tutorials, plus a few direct NGSI-LD entity
queries against Orion-LD and the emulator-gateway's scenario API.

## Use it

1. Import `fiware-mrp.postman_collection.json` into Postman (or any
   Postman-compatible client — Insomnia, Bruno, and the `newman` CLI all
   read this format).
2. Start the stack: `make start-emulator` (full stack, live mode).
3. Run requests folder by folder — each is named after the tutorial that
   introduced it (`T02 + T05 - inventory-service`, `T09 - quality-service`,
   etc.), in the same order the tutorials ship.
4. The **T12 - end-to-end** folder chains 19 requests in the exact
   sequence `tutorials/12-end-to-end/tests/test-12.sh` asserts — run it
   top to bottom against a freshly-seeded stack (`TUTORIAL=12 make seed`)
   for the full forecast-to-traceability walkthrough.

## Collection variables

Base URLs for every service are collection variables (`{{inventory}}`,
`{{bom}}`, etc.), defaulting to `localhost` with the ports from
`docker-compose.yml`. Override them in a Postman environment if you're
running the stack elsewhere.

## Note on ordering

Several requests depend on state created by an earlier one in the same
folder (e.g. `reserve-components` needs a `confirmed` ManufacturingOrder
from `confirm-manufacturing-order`). Run a folder in order, or reseed
(`TUTORIAL=NN make seed`) between out-of-order experiments — the same
caveat that applies to the shell test scripts under `tutorials/*/tests/`.
