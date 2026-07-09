"""
MPS Service — Tutorial 10 addition to the FIWARE MRP stack.
Implements generate-mps and confirm-mps-line (MPS-lite demand planning) over NGSI-LD.
"""
import math
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="FIWARE MRP MPS Service",
    version="0.10.0",
    description="MPS-lite demand planning commands on NGSI-LD",
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


class GenerateMpsRequest(BaseModel):
    demand_forecast_id: str


class ConfirmMpsLineRequest(BaseModel):
    mps_line_id: str
    confirmed_quantity: Optional[float] = None


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "mps-service", "version": "0.10.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-mps", "version": "0.10.0", "docs": "/docs"})


@app.post("/commands/generate-mps", tags=["commands"])
async def generate_mps(req: GenerateMpsRequest) -> dict:
    """
    Compute a MasterProductionScheduleLine from a DemandForecast.

    projectedInventory = current on-hand (summed across locations) - forecastQuantity
    If projectedInventory < safetyStock, suggestedProductionQuantity is the shortfall
    rounded up to the ReorderingRule's lotSize; otherwise 0.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.demand_forecast_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=404, detail=f"DemandForecast not found: {req.demand_forecast_id}")
        forecast = r.json()

        product_id = _rel_obj(forecast, "product")
        if not product_id:
            raise HTTPException(status_code=422, detail="DemandForecast has no product Relationship")
        forecast_qty = _extract_qty(forecast, "forecastQuantity")
        bucket_start = _extract_str(forecast, "bucketStart")
        bucket_end = _extract_str(forecast, "bucketEnd")

        rr_r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}ReorderingRule", "limit": 100},
            headers=HEADERS_READ,
            timeout=10,
        )
        all_rules = rr_r.json() if rr_r.status_code == 200 and isinstance(rr_r.json(), list) else []
        rule = next((rr for rr in all_rules if _rel_obj(rr, "product") == product_id), None)
        if not rule:
            raise HTTPException(status_code=404, detail=f"No ReorderingRule found for product: {product_id}")

        safety_stock = _extract_qty(rule, "safetyStock")
        lot_size = _extract_qty(rule, "lotSize") or 1

        ib_r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}InventoryBalance", "limit": 100},
            headers=HEADERS_READ,
            timeout=10,
        )
        all_balances = ib_r.json() if ib_r.status_code == 200 and isinstance(ib_r.json(), list) else []
        on_hand = sum(
            _extract_qty(b, "quantityOnHand") for b in all_balances if _rel_obj(b, "product") == product_id
        )

        projected_inventory = on_hand - forecast_qty
        if projected_inventory < safety_stock:
            shortfall = safety_stock - projected_inventory
            suggested_qty = math.ceil(shortfall / lot_size) * lot_size
        else:
            suggested_qty = 0.0

        df_slug = req.demand_forecast_id.split(":")[-1]
        base_slug = df_slug[3:] if df_slug.startswith("DF-") else df_slug
        mpsl_id = f"urn:ngsi-ld:MasterProductionScheduleLine:MPSL-{base_slug}"

        mpsl: dict = {
            "id": mpsl_id,
            "type": "MasterProductionScheduleLine",
            "projectedInventory":          {"type": "Property", "value": projected_inventory, "unitCode": "EA"},
            "suggestedProductionQuantity": {"type": "Property", "value": suggested_qty, "unitCode": "EA"},
            "state":           {"type": "Property", "value": "suggested"},
            "product":         {"type": "Relationship", "object": product_id},
            "demandForecast":  {"type": "Relationship", "object": req.demand_forecast_id},
            "reorderingRule":  {"type": "Relationship", "object": rule["id"]},
            "@context": CONTEXT_URL,
        }
        if bucket_start:
            mpsl["bucketStart"] = {"type": "Property", "value": bucket_start}
        if bucket_end:
            mpsl["bucketEnd"] = {"type": "Property", "value": bucket_end}

        mpsl_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
            json=[mpsl],
            headers=HEADERS_WRITE,
            timeout=10,
        )
        if mpsl_r.status_code not in (201, 204):
            raise HTTPException(status_code=502, detail=f"Failed to create MasterProductionScheduleLine: {mpsl_r.text}")

        return {
            "status": "done",
            "mps_line_id": mpsl_id,
            "product_id": product_id,
            "projected_inventory": projected_inventory,
            "suggested_production_quantity": suggested_qty,
            "state": "suggested",
        }


@app.post("/commands/confirm-mps-line", tags=["commands"])
async def confirm_mps_line(req: ConfirmMpsLineRequest) -> dict:
    """
    Confirm a suggested MasterProductionScheduleLine.

    Sets confirmedProductionQuantity (defaulting to suggestedProductionQuantity)
    and state=confirmed. This is advisory only — mps-service does not create a
    ManufacturingOrder; that remains manufacturing-service's responsibility.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.mps_line_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=404, detail=f"MasterProductionScheduleLine not found: {req.mps_line_id}")
        mpsl = r.json()

        state = _extract_str(mpsl, "state")
        if state != "suggested":
            raise HTTPException(
                status_code=422,
                detail=f"MasterProductionScheduleLine must be in suggested state, got: {state}",
            )

        confirmed_qty = req.confirmed_quantity
        if confirmed_qty is None:
            confirmed_qty = _extract_qty(mpsl, "suggestedProductionQuantity")

        # confirmedProductionQuantity does not yet exist on this entity, so POST
        # (append-or-overwrite) is required — PATCH /attrs only updates attributes
        # that already exist.
        patch_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.mps_line_id}/attrs",
            json={
                "state":                      {"type": "Property", "value": "confirmed"},
                "confirmedProductionQuantity": {"type": "Property", "value": confirmed_qty, "unitCode": "EA"},
                "@context": CONTEXT_URL,
            },
            headers=HEADERS_WRITE,
            timeout=10,
        )
        if patch_r.status_code not in (204, 207):
            raise HTTPException(status_code=502, detail=f"Broker patch failed: {patch_r.status_code}")

        return {
            "status": "done",
            "mps_line_id": req.mps_line_id,
            "state": "confirmed",
            "confirmed_production_quantity": confirmed_qty,
        }


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


@app.get("/demand-forecasts", tags=["query"])
async def list_demand_forecasts(product_id: Optional[str] = Query(None)) -> list:
    return await _list_entities("DemandForecast", {"product": product_id})


@app.get("/reordering-rules", tags=["query"])
async def list_reordering_rules(product_id: Optional[str] = Query(None)) -> list:
    return await _list_entities("ReorderingRule", {"product": product_id})


@app.get("/mps-lines", tags=["query"])
async def list_mps_lines(
    product_id: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
) -> list:
    return await _list_entities("MasterProductionScheduleLine", {"product": product_id, "state": state})
