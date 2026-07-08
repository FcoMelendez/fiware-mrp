"""
Finished Goods Service — Tutorial 08 addition to the FIWARE MRP stack.
Implements receive-finished-goods command over NGSI-LD.
"""
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="FIWARE MRP Finished Goods Service",
    version="0.8.0",
    description="Finished-goods receipt commands on NGSI-LD",
)

ORION_URL = os.getenv("ORION_URL", "http://orion-ld:1026")
CONTEXT_URL = os.getenv(
    "CONTEXT_URL",
    "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
)
MRP_NS = "https://fiware-mrp.io/ontology/mrp#"
FINISHED_GOODS_LOCATION = os.getenv(
    "FINISHED_GOODS_LOCATION", "urn:ngsi-ld:StockLocation:WH-FINISHED"
)

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


def _rel_obj(entity: dict, attr: str) -> Optional[str]:
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                return v.get("object") or v.get("@id")
            return str(v) if v else None
    return None


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


class ReceiveFinishedGoodsRequest(BaseModel):
    manufacturing_order_id: str


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "finished-goods-service", "version": "0.8.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-finished-goods", "version": "0.8.0", "docs": "/docs"})


@app.post("/commands/receive-finished-goods", tags=["commands"])
async def receive_finished_goods(req: ReceiveFinishedGoodsRequest) -> dict:
    """
    Close out a ManufacturingOrder by receiving its finished product into stock.

    1. Validate all WorkOrders for the MO are completed.
    2. Patch the MO: state=completed, completedAt=now.
    3. Create a StockMove (moveType=receipt) into the finished-goods location.
    4. Create or update the InventoryBalance for the finished product there.
    """
    async with httpx.AsyncClient() as client:
        # 1. Fetch the ManufacturingOrder
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.manufacturing_order_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(
                status_code=404, detail=f"ManufacturingOrder not found: {req.manufacturing_order_id}"
            )
        mo = r.json()

        mo_state = _extract_str(mo, "state")
        if mo_state == "completed":
            raise HTTPException(status_code=422, detail="ManufacturingOrder is already completed")

        product_id = _rel_obj(mo, "product")
        if not product_id:
            raise HTTPException(status_code=422, detail="ManufacturingOrder has no product Relationship")
        mo_qty = _extract_qty(mo, "quantity")

        # 2. Fetch all WorkOrders and validate the ones for this MO are completed
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}WorkOrder", "limit": 100},
            headers=HEADERS_READ,
            timeout=10,
        )
        all_wos = r.json() if r.status_code == 200 and isinstance(r.json(), list) else []
        mo_wos = [wo for wo in all_wos if _rel_obj(wo, "manufacturingOrder") == req.manufacturing_order_id]

        if not mo_wos:
            raise HTTPException(
                status_code=404, detail=f"No WorkOrders found for {req.manufacturing_order_id}"
            )
        incomplete = [wo["id"] for wo in mo_wos if _extract_str(wo, "state") != "completed"]
        if incomplete:
            raise HTTPException(
                status_code=422,
                detail=f"WorkOrders not yet completed: {incomplete}",
            )

        now = _now_iso()

        # 3. Append ManufacturingOrder attrs: state=completed, completedAt=now
        # completedAt does not yet exist on this entity, so POST (append-or-overwrite)
        # is required — PATCH /attrs only updates attributes that already exist.
        patch_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.manufacturing_order_id}/attrs",
            json={
                "state":       {"type": "Property", "value": "completed"},
                "completedAt": {"type": "Property", "value": now},
                "@context": CONTEXT_URL,
            },
            headers=HEADERS_WRITE,
            timeout=10,
        )
        if patch_r.status_code not in (204, 207):
            raise HTTPException(
                status_code=502, detail=f"Broker patch failed: {patch_r.status_code}"
            )

        # 4. Create StockMove for the finished-goods receipt
        mo_code = req.manufacturing_order_id.split(":")[-1]
        sm_id = f"urn:ngsi-ld:StockMove:SM-{mo_code}-receipt"
        stock_move = {
            "id": sm_id,
            "type": "StockMove",
            "moveType": {"type": "Property", "value": "receipt"},
            "quantity": {"type": "Property", "value": mo_qty, "unitCode": "EA"},
            "state": {"type": "Property", "value": "done"},
            "actualDate": {"type": "Property", "value": now},
            "origin": {"type": "Property", "value": req.manufacturing_order_id},
            "product": {"type": "Relationship", "object": product_id},
            "toLocation": {"type": "Relationship", "object": FINISHED_GOODS_LOCATION},
            "@context": CONTEXT_URL,
        }
        sm_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
            json=[stock_move],
            headers=HEADERS_WRITE,
            timeout=10,
        )
        if sm_r.status_code not in (201, 204):
            raise HTTPException(status_code=502, detail=f"Failed to create StockMove: {sm_r.text}")

        # 5. Create or update the InventoryBalance for the finished product
        product_code = product_id.split(":")[-1]
        location_code = FINISHED_GOODS_LOCATION.split(":")[-1]
        ib_id = f"urn:ngsi-ld:InventoryBalance:IB-{product_code}-{location_code}"
        new_qty = await _receive_into_balance(client, ib_id, product_id, mo_qty, now)

        return {
            "status": "done",
            "manufacturing_order_id": req.manufacturing_order_id,
            "quantity_received": mo_qty,
            "stock_move_id": sm_id,
            "inventory_balance_id": ib_id,
            "quantity_on_hand": new_qty,
        }


async def _receive_into_balance(
    client: httpx.AsyncClient, ib_id: str, product_id: str, quantity: float, now: str
) -> float:
    r = await client.get(f"{ORION_URL}/ngsi-ld/v1/entities/{ib_id}", headers=HEADERS_READ, timeout=10)

    if r.status_code == 200:
        existing = r.json()
        current_qty = _extract_qty(existing, "quantityOnHand")
        current_reserved = _extract_qty(existing, "reservedQuantity")
        new_qty = current_qty + quantity
        patch = {
            "quantityOnHand":    {"type": "Property", "value": new_qty, "unitCode": "EA"},
            "availableQuantity": {"type": "Property", "value": new_qty - current_reserved, "unitCode": "EA"},
            "inventoryDate":     {"type": "Property", "value": now},
            "@context": CONTEXT_URL,
        }
        await client.patch(
            f"{ORION_URL}/ngsi-ld/v1/entities/{ib_id}/attrs",
            json=patch,
            headers=HEADERS_WRITE,
            timeout=10,
        )
        return new_qty

    entity = {
        "id": ib_id,
        "type": "InventoryBalance",
        "quantityOnHand":    {"type": "Property", "value": quantity, "unitCode": "EA"},
        "reservedQuantity":  {"type": "Property", "value": 0.0, "unitCode": "EA"},
        "availableQuantity": {"type": "Property", "value": quantity, "unitCode": "EA"},
        "inventoryDate":     {"type": "Property", "value": now},
        "state":             {"type": "Property", "value": "active"},
        "product":           {"type": "Relationship", "object": product_id},
        "location":          {"type": "Relationship", "object": FINISHED_GOODS_LOCATION},
        "@context": CONTEXT_URL,
    }
    r2 = await client.post(
        f"{ORION_URL}/ngsi-ld/v1/entities",
        json=entity,
        headers=HEADERS_WRITE,
        timeout=10,
    )
    if r2.status_code not in (201, 204):
        raise HTTPException(status_code=502, detail=f"Failed to create InventoryBalance: {r2.text}")
    return quantity


@app.get("/production-receipts", tags=["query"])
async def list_production_receipts() -> list:
    """Return all StockMove entities that are finished-goods receipts."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}StockMove", "limit": 100},
            headers=HEADERS_READ,
            timeout=10,
        )
    if r.status_code != 200:
        return []
    entities = r.json() if isinstance(r.json(), list) else []
    return [
        e
        for e in entities
        if _extract_str(e, "moveType") == "receipt"
        and _rel_obj(e, "toLocation") == FINISHED_GOODS_LOCATION
    ]
