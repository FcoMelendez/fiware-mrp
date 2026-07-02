"""
Scheduler Service — Tutorial 06 addition to the FIWARE MRP stack.
Implements create-work-orders command and WorkOrder queries over NGSI-LD.
"""
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="FIWARE MRP Scheduler Service",
    version="0.6.0",
    description="Work order scheduling commands on NGSI-LD",
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

# Hardcoded routing for Tutorial 06: (operationName, workCenter URN, hours-per-unit)
ROUTING = [
    ("Assembly",  "urn:ngsi-ld:WorkCenter:WC-Assembly", 1.0),
    ("LeakTest",  "urn:ngsi-ld:WorkCenter:WC-LeakTest", 0.5),
    ("Packaging", "urn:ngsi-ld:WorkCenter:WC-Packaging", 0.25),
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _extract_str(entity: dict, attr: str) -> Optional[str]:
    for key, val in entity.items():
        if attr in key and isinstance(val, dict):
            return str(val.get("value", ""))
    return None


def _extract_float(entity: dict, attr: str) -> Optional[float]:
    for key, val in entity.items():
        if attr in key and isinstance(val, dict):
            v = val.get("value")
            if v is not None:
                return float(v)
    return None


def _extract_rel(entity: dict, attr: str) -> Optional[str]:
    for key, val in entity.items():
        if attr in key and isinstance(val, dict):
            return val.get("object")
    return None


class CreateWorkOrdersRequest(BaseModel):
    order_id: str
    planned_start: Optional[str] = None  # ISO 8601; defaults to MO.plannedStart


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "scheduler-service", "version": "0.6.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-scheduler", "version": "0.6.0", "docs": "/docs"})


@app.get("/work-orders", tags=["query"])
async def list_work_orders(
    order_id: Optional[str] = Query(None, description="Filter by ManufacturingOrder URN"),
    work_center_id: Optional[str] = Query(None, description="Filter by WorkCenter URN"),
) -> list:
    """Return all WorkOrder entities, optionally filtered by manufacturing order or work center."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            headers=HEADERS_READ,
            params={"type": "WorkOrder", "limit": 100},
            timeout=10,
        )
        if r.status_code not in (200, 206):
            return []
        data = r.json()
        entities = data if isinstance(data, list) else []

    results = []
    for e in entities:
        if order_id:
            mo_rel = _extract_rel(e, "manufacturingOrder")
            if mo_rel != order_id:
                continue
        if work_center_id:
            wc_rel = _extract_rel(e, "workCenter")
            if wc_rel != work_center_id:
                continue
        results.append(e)
    return results


@app.post("/commands/create-work-orders", tags=["commands"])
async def create_work_orders(req: CreateWorkOrdersRequest) -> dict:
    """
    Generate WorkOrder entities (Assembly → LeakTest → Packaging) for a confirmed ManufacturingOrder.
    Routing is hardcoded; scheduling is sequential with no shift-calendar constraints.
    """
    async with httpx.AsyncClient() as client:
        # 1. Fetch the ManufacturingOrder
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.order_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(
                status_code=404, detail=f"ManufacturingOrder not found: {req.order_id}"
            )
        mo = r.json()

        # 2. Validate state
        state = _extract_str(mo, "state")
        if state not in ("confirmed", "in_progress"):
            raise HTTPException(
                status_code=422,
                detail=f"ManufacturingOrder must be in confirmed state, got: {state}",
            )

        # 3. Gather scheduling inputs
        quantity = _extract_float(mo, "quantity") or 1.0
        product_id = _extract_rel(mo, "product")
        mo_planned_start = _extract_str(mo, "plannedStart") or _now_iso()
        start_iso = req.planned_start or mo_planned_start

        try:
            start_dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid planned_start: {start_iso}")

        # 4. Build WorkOrder entities following the hardcoded routing
        wo_entities = []
        wo_summary = []
        cursor = start_dt
        order_slug = req.order_id.split(":")[-1]

        for seq, (op_name, wc_id, h_per_unit) in enumerate(ROUTING, start=1):
            duration_h = quantity * h_per_unit
            wo_start = cursor
            wo_end = cursor + timedelta(hours=duration_h)
            cursor = wo_end

            op_slug = op_name.replace(" ", "")
            wo_id = f"urn:ngsi-ld:WorkOrder:WO-{order_slug}-{op_slug}"
            wo_code = f"WO-{order_slug}-{op_slug}"

            entity: dict = {
                "id": wo_id,
                "type": "WorkOrder",
                "@context": CONTEXT_URL,
                "workOrderCode":  {"type": "Property", "value": wo_code},
                "operationName":  {"type": "Property", "value": op_name},
                "sequence":       {"type": "Property", "value": seq},
                "plannedStart":   {"type": "Property", "value": wo_start.isoformat().replace("+00:00", "Z")},
                "plannedEnd":     {"type": "Property", "value": wo_end.isoformat().replace("+00:00", "Z")},
                "durationHours":  {"type": "Property", "value": round(duration_h, 2)},
                "state":          {"type": "Property", "value": "planned"},
                "manufacturingOrder": {"type": "Relationship", "object": req.order_id},
                "workCenter":     {"type": "Relationship", "object": wc_id},
            }
            if product_id:
                entity["product"] = {"type": "Relationship", "object": product_id}

            wo_entities.append(entity)
            wo_summary.append({
                "work_order_id":  wo_id,
                "operation":      op_name,
                "sequence":       seq,
                "work_center_id": wc_id,
                "planned_start":  wo_start.isoformat().replace("+00:00", "Z"),
                "planned_end":    wo_end.isoformat().replace("+00:00", "Z"),
                "duration_hours": round(duration_h, 2),
                "state":          "planned",
            })

        # 5. Upsert WorkOrder entities to Orion-LD
        r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
            json=wo_entities,
            headers={"Content-Type": "application/ld+json", "Accept": "application/json"},
            timeout=15,
        )
        if r.status_code not in (201, 204, 207):
            raise HTTPException(status_code=502, detail=f"Broker upsert failed: {r.status_code}")

        return {
            "status": "done",
            "order_id": req.order_id,
            "work_orders_created": len(wo_entities),
            "work_orders": wo_summary,
        }
