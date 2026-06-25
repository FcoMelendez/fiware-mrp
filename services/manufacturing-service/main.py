"""
Manufacturing Service — Tutorial 04 addition to the FIWARE MRP stack.
Implements confirm-manufacturing-order command and ManufacturingOrder queries over NGSI-LD.
"""
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="FIWARE MRP Manufacturing Service",
    version="0.4.0",
    description="Manufacturing order management commands on NGSI-LD",
)

ORION_URL = os.getenv("ORION_URL", "http://orion-ld:1026")
CONTEXT_URL = os.getenv(
    "CONTEXT_URL",
    "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
)
MRP_NS = "https://fiware-mrp.io/ontology/mrp#"

HEADERS_READ = {
    "Accept": "application/ld+json",
    "Link": f'<{CONTEXT_URL}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class ConfirmOrderRequest(BaseModel):
    order_id: str


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "manufacturing-service", "version": "0.4.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-manufacturing", "version": "0.4.0", "docs": "/docs"})


@app.get("/manufacturing-orders", tags=["query"])
async def list_orders(
    state: Optional[str] = Query(None, description="Filter by state (draft, confirmed, in_progress, completed, cancelled)"),
    product_id: Optional[str] = Query(None, description="Filter by product URN"),
) -> list:
    """Return all ManufacturingOrder entities, optionally filtered by state or product."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            headers=HEADERS_READ,
            params={"type": f"{MRP_NS}ManufacturingOrder", "limit": 100},
            timeout=10,
        )
        if r.status_code == 404:
            return []
        r.raise_for_status()
        entities = r.json() if isinstance(r.json(), list) else []

    if state:
        filtered = []
        for e in entities:
            for k, v in e.items():
                if "state" in k and isinstance(v, dict):
                    if v.get("value") == state:
                        filtered.append(e)
                    break
        return filtered

    if product_id:
        filtered = []
        for e in entities:
            for k, v in e.items():
                if "product" in k and isinstance(v, dict):
                    if v.get("object") == product_id:
                        filtered.append(e)
                    break
        return filtered

    return entities


@app.get("/manufacturing-orders/{order_id:path}", tags=["query"])
async def get_order(order_id: str) -> dict:
    """Fetch a single ManufacturingOrder entity from Orion-LD."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{order_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code == 404:
            raise HTTPException(status_code=404, detail=f"ManufacturingOrder not found: {order_id}")
        r.raise_for_status()
        return r.json()


@app.post("/commands/confirm-manufacturing-order", tags=["commands"])
async def confirm_manufacturing_order(body: ConfirmOrderRequest) -> dict:
    """
    Confirm a ManufacturingOrder.

    Transitions state from draft → confirmed and records confirmedAt timestamp.
    A confirmed order is locked for scheduling and component reservation.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{body.order_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code == 404:
            raise HTTPException(status_code=404, detail=f"ManufacturingOrder not found: {body.order_id}")
        r.raise_for_status()
        entity = r.json()

        current_state = None
        for k, v in entity.items():
            if "state" in k and isinstance(v, dict):
                current_state = v.get("value")
                break

        if current_state != "draft":
            raise HTTPException(
                status_code=422,
                detail=f"ManufacturingOrder is in state '{current_state}', expected 'draft'",
            )

        now = _now_iso()
        patch = {
            "@context": CONTEXT_URL,
            "state": {"type": "Property", "value": "confirmed"},
            "confirmedAt": {"type": "Property", "value": now},
        }

        patch_r = await client.patch(
            f"{ORION_URL}/ngsi-ld/v1/entities/{body.order_id}/attrs",
            json=patch,
            headers={"Content-Type": "application/ld+json"},
            timeout=10,
        )
        if patch_r.status_code not in (204, 207):
            raise HTTPException(
                status_code=502,
                detail=f"Broker error: {patch_r.status_code} — {patch_r.text}",
            )

    return {
        "status": "confirmed",
        "order_id": body.order_id,
        "confirmed_at": now,
    }
