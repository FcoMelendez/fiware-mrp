"""
Quality Service — Tutorial 09 addition to the FIWARE MRP stack.
Implements inspect-work-order (quality check, scrap, rework, alerting) over NGSI-LD.
"""
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="FIWARE MRP Quality Service",
    version="0.9.0",
    description="Quality inspection, scrap, rework, and alerting commands on NGSI-LD",
)

ORION_URL = os.getenv("ORION_URL", "http://orion-ld:1026")
CONTEXT_URL = os.getenv(
    "CONTEXT_URL",
    "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
)
MRP_NS = "https://fiware-mrp.io/ontology/mrp#"

FAILURE_RATE_ALERT_THRESHOLD = 0.2
FAILURE_RATE_CRITICAL_THRESHOLD = 0.5

HEADERS_READ = {
    "Accept": "application/ld+json",
    "Link": f'<{CONTEXT_URL}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
}
HEADERS_WRITE = {
    "Content-Type": "application/ld+json",
    "Accept": "application/json",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _extract_str(entity: dict, attr: str) -> Optional[str]:
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                return v.get("value")
            return str(v) if v else None
    return None


def _extract_qty(entity: dict, attr: str) -> float:
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                return float(v.get("value", 0))
            try:
                return float(v)
            except (TypeError, ValueError):
                return 0.0
    return 0.0


def _rel_obj(entity: dict, attr: str) -> Optional[str]:
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                return v.get("object") or v.get("@id")
            return str(v) if v else None
    return None


class InspectWorkOrderRequest(BaseModel):
    work_order_id: str
    check_type: str
    expected_value: float
    actual_value: float
    tolerance: float
    quantity_inspected: float
    quantity_failed: float = 0
    disposition: Optional[str] = None
    reason_code: Optional[str] = None


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "quality-service", "version": "0.9.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-quality", "version": "0.9.0", "docs": "/docs"})


@app.post("/commands/inspect-work-order", tags=["commands"])
async def inspect_work_order(req: InspectWorkOrderRequest) -> dict:
    """
    Record a quality inspection on a completed WorkOrder.

    - result is derived from |actual_value - expected_value| vs tolerance.
    - If quantity_failed > 0, a disposition (scrap | rework | use_as_is) is required
      and drives creation of a ScrapEvent or ReworkOrder.
    - If the failure rate (quantity_failed / quantity_inspected) reaches 20%,
      a QualityAlert is raised automatically.
    """
    if req.quantity_failed > 0:
        if req.disposition not in ("scrap", "rework", "use_as_is"):
            raise HTTPException(
                status_code=400,
                detail="disposition (scrap | rework | use_as_is) is required when quantity_failed > 0",
            )
        if req.disposition in ("scrap", "rework") and not req.reason_code:
            raise HTTPException(
                status_code=400,
                detail="reason_code is required when disposition is scrap or rework",
            )

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.work_order_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=404, detail=f"WorkOrder not found: {req.work_order_id}")
        wo = r.json()

        wo_state = _extract_str(wo, "state")
        if wo_state != "completed":
            raise HTTPException(
                status_code=422,
                detail=f"WorkOrder must be in completed state to inspect, got: {wo_state}",
            )

        mo_id = _rel_obj(wo, "manufacturingOrder")
        product_id = _rel_obj(wo, "product")

        result = "pass" if abs(req.actual_value - req.expected_value) <= req.tolerance else "fail"
        now = _now_iso()
        wo_slug = req.work_order_id.split(":")[-1]

        # 1. Create the QualityCheck
        qc_id = f"urn:ngsi-ld:QualityCheck:QC-{wo_slug}"
        qc: dict = {
            "id": qc_id,
            "type": "QualityCheck",
            "checkType":         {"type": "Property", "value": req.check_type},
            "result":            {"type": "Property", "value": result},
            "expectedValue":     {"type": "Property", "value": req.expected_value},
            "actualValue":       {"type": "Property", "value": req.actual_value},
            "tolerance":         {"type": "Property", "value": req.tolerance},
            "required":          {"type": "Property", "value": True},
            "quantityInspected": {"type": "Property", "value": req.quantity_inspected, "unitCode": "EA"},
            "quantityFailed":    {"type": "Property", "value": req.quantity_failed, "unitCode": "EA"},
            "eventTime":         {"type": "Property", "value": now},
            "workOrder":         {"type": "Relationship", "object": req.work_order_id},
            "@context": CONTEXT_URL,
        }
        if req.quantity_failed > 0:
            qc["disposition"] = {"type": "Property", "value": req.disposition}
        if mo_id:
            qc["manufacturingOrder"] = {"type": "Relationship", "object": mo_id}
        if product_id:
            qc["product"] = {"type": "Relationship", "object": product_id}

        qc_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
            json=[qc],
            headers=HEADERS_WRITE,
            timeout=10,
        )
        if qc_r.status_code not in (201, 204):
            raise HTTPException(status_code=502, detail=f"Failed to create QualityCheck: {qc_r.text}")

        response: dict = {
            "status": "done",
            "work_order_id": req.work_order_id,
            "quality_check_id": qc_id,
            "result": result,
        }

        # 2. Disposition: scrap or rework
        if req.quantity_failed > 0 and req.disposition == "scrap":
            scrap_cost = req.quantity_failed
            if product_id:
                pr = await client.get(f"{ORION_URL}/ngsi-ld/v1/entities/{product_id}", headers=HEADERS_READ, timeout=10)
                if pr.status_code == 200:
                    unit_cost = _extract_qty(pr.json(), "standardCost")
                    scrap_cost = req.quantity_failed * unit_cost

            se_id = f"urn:ngsi-ld:ScrapEvent:SE-{wo_slug}"
            se: dict = {
                "id": se_id,
                "type": "ScrapEvent",
                "quantity":   {"type": "Property", "value": req.quantity_failed, "unitCode": "EA"},
                "reasonCode": {"type": "Property", "value": req.reason_code},
                "scrapCost":  {"type": "Property", "value": scrap_cost, "unitCode": "EUR"},
                "eventTime":  {"type": "Property", "value": now},
                "workOrder":     {"type": "Relationship", "object": req.work_order_id},
                "qualityCheck":  {"type": "Relationship", "object": qc_id},
                "@context": CONTEXT_URL,
            }
            if product_id:
                se["product"] = {"type": "Relationship", "object": product_id}
            se_r = await client.post(
                f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
                json=[se],
                headers=HEADERS_WRITE,
                timeout=10,
            )
            if se_r.status_code not in (201, 204):
                raise HTTPException(status_code=502, detail=f"Failed to create ScrapEvent: {se_r.text}")
            response["scrap_event_id"] = se_id

        elif req.quantity_failed > 0 and req.disposition == "rework":
            rw_id = f"urn:ngsi-ld:ReworkOrder:RW-{wo_slug}"
            rw: dict = {
                "id": rw_id,
                "type": "ReworkOrder",
                "quantity":   {"type": "Property", "value": req.quantity_failed, "unitCode": "EA"},
                "state":      {"type": "Property", "value": "planned"},
                "reasonCode": {"type": "Property", "value": req.reason_code},
                "createdAt":  {"type": "Property", "value": now},
                "originWorkOrder": {"type": "Relationship", "object": req.work_order_id},
                "qualityCheck":     {"type": "Relationship", "object": qc_id},
                "@context": CONTEXT_URL,
            }
            if mo_id:
                rw["manufacturingOrder"] = {"type": "Relationship", "object": mo_id}
            if product_id:
                rw["product"] = {"type": "Relationship", "object": product_id}
            rw_r = await client.post(
                f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
                json=[rw],
                headers=HEADERS_WRITE,
                timeout=10,
            )
            if rw_r.status_code not in (201, 204):
                raise HTTPException(status_code=502, detail=f"Failed to create ReworkOrder: {rw_r.text}")
            response["rework_order_id"] = rw_id

        # 3. Alerting: failure rate threshold
        failure_rate = (req.quantity_failed / req.quantity_inspected) if req.quantity_inspected > 0 else 0.0
        if failure_rate >= FAILURE_RATE_ALERT_THRESHOLD:
            severity = "critical" if failure_rate >= FAILURE_RATE_CRITICAL_THRESHOLD else "high"
            qa_id = f"urn:ngsi-ld:QualityAlert:QA-{wo_slug}"
            qa: dict = {
                "id": qa_id,
                "type": "QualityAlert",
                "severity":   {"type": "Property", "value": severity},
                "detectedAt": {"type": "Property", "value": now},
                "comment": {
                    "type": "Property",
                    "value": f"{failure_rate * 100:.0f}% failure rate on {req.check_type} inspection "
                             f"({req.quantity_failed:g} of {req.quantity_inspected:g} units)",
                },
                "workOrder":    {"type": "Relationship", "object": req.work_order_id},
                "qualityCheck": {"type": "Relationship", "object": qc_id},
                "@context": CONTEXT_URL,
            }
            if mo_id:
                qa["manufacturingOrder"] = {"type": "Relationship", "object": mo_id}
            if product_id:
                qa["product"] = {"type": "Relationship", "object": product_id}
            qa_r = await client.post(
                f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
                json=[qa],
                headers=HEADERS_WRITE,
                timeout=10,
            )
            if qa_r.status_code not in (201, 204):
                raise HTTPException(status_code=502, detail=f"Failed to create QualityAlert: {qa_r.text}")
            response["quality_alert_id"] = qa_id
            response["severity"] = severity

        return response


async def _list_entities(entity_type: str, filters: dict) -> list:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}{entity_type}", "limit": 100},
            headers=HEADERS_READ,
            timeout=10,
        )
    if r.status_code != 200:
        return []
    entities = r.json() if isinstance(r.json(), list) else []
    for attr, value in filters.items():
        if value is not None:
            entities = [e for e in entities if _rel_obj(e, attr) == value or _extract_str(e, attr) == value]
    return entities


@app.get("/quality-checks", tags=["query"])
async def list_quality_checks(
    work_order_id: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
) -> list:
    return await _list_entities("QualityCheck", {"workOrder": work_order_id, "result": result})


@app.get("/scrap-events", tags=["query"])
async def list_scrap_events(work_order_id: Optional[str] = Query(None)) -> list:
    return await _list_entities("ScrapEvent", {"workOrder": work_order_id})


@app.get("/rework-orders", tags=["query"])
async def list_rework_orders(state: Optional[str] = Query(None)) -> list:
    return await _list_entities("ReworkOrder", {"state": state})


@app.get("/quality-alerts", tags=["query"])
async def list_quality_alerts(severity: Optional[str] = Query(None)) -> list:
    return await _list_entities("QualityAlert", {"severity": severity})
