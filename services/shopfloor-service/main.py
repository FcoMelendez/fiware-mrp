"""
Shopfloor Service — Tutorial 07 addition to the FIWARE MRP stack.
Implements start-work-order and complete-work-order commands over NGSI-LD.
"""
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="FIWARE MRP Shopfloor Service",
    version="0.7.0",
    description="Shop-floor execution commands on NGSI-LD",
)

ORION_URL = os.getenv("ORION_URL", "http://orion-ld:1026")
CONTEXT_URL = os.getenv(
    "CONTEXT_URL",
    "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
)

HEADERS_READ = {
    "Accept": "application/ld+json",
    "Link": f'<{CONTEXT_URL}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _extract_str(entity: dict, attr: str) -> Optional[str]:
    for key, val in entity.items():
        if attr in key and isinstance(val, dict):
            return str(val.get("value", ""))
    return None


def _extract_rel(entity: dict, attr: str) -> Optional[str]:
    for key, val in entity.items():
        if attr in key and isinstance(val, dict):
            return val.get("object")
    return None


class StartWorkOrderRequest(BaseModel):
    work_order_id: str


class CompleteWorkOrderRequest(BaseModel):
    work_order_id: str
    quantity_produced: float


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "shopfloor-service", "version": "0.7.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-shopfloor", "version": "0.7.0", "docs": "/docs"})


@app.get("/production-events", tags=["query"])
async def list_production_events(
    work_order_id: Optional[str] = Query(None, description="Filter by WorkOrder URN"),
    manufacturing_order_id: Optional[str] = Query(None, description="Filter by ManufacturingOrder URN"),
) -> list:
    """Return all ProductionEvent entities, optionally filtered."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            headers=HEADERS_READ,
            params={"type": "ProductionEvent", "limit": 100},
            timeout=10,
        )
        if r.status_code not in (200, 206):
            return []
        data = r.json()
        entities = data if isinstance(data, list) else []

    results = []
    for e in entities:
        if work_order_id:
            wo_rel = _extract_rel(e, "workOrder")
            if wo_rel != work_order_id:
                continue
        if manufacturing_order_id:
            mo_rel = _extract_rel(e, "manufacturingOrder")
            if mo_rel != manufacturing_order_id:
                continue
        results.append(e)
    return results


@app.post("/commands/start-work-order", tags=["commands"])
async def start_work_order(req: StartWorkOrderRequest) -> dict:
    """
    Transition a WorkOrder from planned → in_progress.
    Sets actualStart and creates a work_order_started ProductionEvent.
    """
    async with httpx.AsyncClient() as client:
        # 1. Fetch WorkOrder
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.work_order_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=404, detail=f"WorkOrder not found: {req.work_order_id}")
        wo = r.json()

        # 2. Validate state=planned
        state = _extract_str(wo, "state")
        if state != "planned":
            raise HTTPException(
                status_code=422,
                detail=f"WorkOrder must be in planned state, got: {state}",
            )

        wc_id = _extract_rel(wo, "workCenter")
        mo_id = _extract_rel(wo, "manufacturingOrder")
        product_id = _extract_rel(wo, "product")
        actual_start = _now_iso()

        # 3. Append WorkOrder attrs: planned → in_progress
        # actualStart does not yet exist on this entity, so POST (append-or-overwrite)
        # is required — PATCH /attrs only updates attributes that already exist.
        patch_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.work_order_id}/attrs",
            json={
                "@context": CONTEXT_URL,
                "state":       {"type": "Property", "value": "in_progress"},
                "actualStart": {"type": "Property", "value": actual_start},
            },
            headers={"Content-Type": "application/ld+json"},
            timeout=10,
        )
        if patch_r.status_code not in (204, 207):
            raise HTTPException(
                status_code=502,
                detail=f"Broker patch failed: {patch_r.status_code}",
            )

        # 4. Create ProductionEvent: work_order_started
        wo_slug = req.work_order_id.split(":")[-1]
        pe_id = f"urn:ngsi-ld:ProductionEvent:PE-{wo_slug}-started"
        pe: dict = {
            "id": pe_id,
            "type": "ProductionEvent",
            "@context": CONTEXT_URL,
            "eventType": {"type": "Property", "value": "work_order_started"},
            "eventTime": {"type": "Property", "value": actual_start},
            "workOrder": {"type": "Relationship", "object": req.work_order_id},
        }
        if wc_id:
            pe["workCenter"] = {"type": "Relationship", "object": wc_id}
        if mo_id:
            pe["manufacturingOrder"] = {"type": "Relationship", "object": mo_id}
        if product_id:
            pe["product"] = {"type": "Relationship", "object": product_id}

        pe_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            json=pe,
            headers={"Content-Type": "application/ld+json", "Accept": "application/json"},
            timeout=10,
        )
        if pe_r.status_code not in (201, 204):
            raise HTTPException(
                status_code=502,
                detail=f"Failed to create ProductionEvent: {pe_r.status_code}",
            )

        return {
            "status": "done",
            "work_order_id": req.work_order_id,
            "state": "in_progress",
            "actual_start": actual_start,
            "production_event_id": pe_id,
        }


@app.post("/commands/complete-work-order", tags=["commands"])
async def complete_work_order(req: CompleteWorkOrderRequest) -> dict:
    """
    Transition a WorkOrder from in_progress → completed.
    Sets actualEnd and creates a work_order_completed ProductionEvent with quantity_produced.
    """
    async with httpx.AsyncClient() as client:
        # 1. Fetch WorkOrder
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.work_order_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=404, detail=f"WorkOrder not found: {req.work_order_id}")
        wo = r.json()

        # 2. Validate state=in_progress
        state = _extract_str(wo, "state")
        if state != "in_progress":
            raise HTTPException(
                status_code=422,
                detail=f"WorkOrder must be in in_progress state, got: {state}",
            )

        wc_id = _extract_rel(wo, "workCenter")
        mo_id = _extract_rel(wo, "manufacturingOrder")
        product_id = _extract_rel(wo, "product")
        actual_end = _now_iso()

        # 3. Append WorkOrder attrs: in_progress → completed
        # actualEnd does not yet exist on this entity, so POST (append-or-overwrite)
        # is required — PATCH /attrs only updates attributes that already exist.
        patch_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.work_order_id}/attrs",
            json={
                "@context": CONTEXT_URL,
                "state":     {"type": "Property", "value": "completed"},
                "actualEnd": {"type": "Property", "value": actual_end},
            },
            headers={"Content-Type": "application/ld+json"},
            timeout=10,
        )
        if patch_r.status_code not in (204, 207):
            raise HTTPException(
                status_code=502,
                detail=f"Broker patch failed: {patch_r.status_code}",
            )

        # 4. Create ProductionEvent: work_order_completed
        wo_slug = req.work_order_id.split(":")[-1]
        pe_id = f"urn:ngsi-ld:ProductionEvent:PE-{wo_slug}-completed"
        pe: dict = {
            "id": pe_id,
            "type": "ProductionEvent",
            "@context": CONTEXT_URL,
            "eventType": {"type": "Property", "value": "work_order_completed"},
            "eventTime": {"type": "Property", "value": actual_end},
            "quantity":  {"type": "Property", "value": req.quantity_produced, "unitCode": "EA"},
            "workOrder": {"type": "Relationship", "object": req.work_order_id},
        }
        if wc_id:
            pe["workCenter"] = {"type": "Relationship", "object": wc_id}
        if mo_id:
            pe["manufacturingOrder"] = {"type": "Relationship", "object": mo_id}
        if product_id:
            pe["product"] = {"type": "Relationship", "object": product_id}

        pe_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            json=pe,
            headers={"Content-Type": "application/ld+json", "Accept": "application/json"},
            timeout=10,
        )
        if pe_r.status_code not in (201, 204):
            raise HTTPException(
                status_code=502,
                detail=f"Failed to create ProductionEvent: {pe_r.status_code}",
            )

        return {
            "status": "done",
            "work_order_id": req.work_order_id,
            "state": "completed",
            "actual_end": actual_end,
            "quantity_produced": req.quantity_produced,
            "production_event_id": pe_id,
        }
