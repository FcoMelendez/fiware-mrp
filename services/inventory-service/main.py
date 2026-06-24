"""
Inventory Service — Tutorial 02 addition to the FIWARE MRP stack.
Implements receive-material command and inventory balance queries over NGSI-LD.
"""
import os
import random
import string
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="FIWARE MRP Inventory Service",
    version="0.2.0",
    description="Inventory balance and stock move commands on NGSI-LD",
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


def _short_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"SM-{stamp}-{suffix}"


class ReceiveMaterialRequest(BaseModel):
    product_id: str
    location_id: str
    quantity: float
    unit: str = "EA"
    lot_code: Optional[str] = None
    reference: Optional[str] = None


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "inventory-service", "version": "0.2.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-inventory", "version": "0.2.0", "docs": "/docs"})


@app.post("/commands/receive-material", tags=["commands"])
async def receive_material(body: ReceiveMaterialRequest) -> dict:
    """
    Receive goods into a stock location.

    Creates a StockMove (moveType=receipt, state=done) and upserts the
    InventoryBalance for the product/location combination.
    If lot_code is provided, creates or reuses a Lot entity and creates
    a separate lot-level balance.
    """
    async with httpx.AsyncClient() as client:
        lot_id: Optional[str] = None
        if body.lot_code:
            lot_id = f"urn:ngsi-ld:Lot:{body.lot_code}"
            await _upsert_lot(client, lot_id, body.lot_code, body.product_id)

        sm_id = f"urn:ngsi-ld:StockMove:{_short_id()}"
        await _create_stock_move(client, sm_id, body, lot_id)

        product_code = body.product_id.split(":")[-1]
        location_code = body.location_id.split(":")[-1]
        lot_suffix = f"-{body.lot_code}" if body.lot_code else ""
        ib_id = f"urn:ngsi-ld:InventoryBalance:IB-{product_code}-{location_code}{lot_suffix}"
        qty_on_hand = await _update_balance(client, ib_id, body, lot_id)

    result: dict = {
        "status": "done",
        "stock_move_id": sm_id,
        "inventory_balance_id": ib_id,
        "quantity_on_hand": qty_on_hand,
    }
    if lot_id:
        result["lot_id"] = lot_id
    return result


@app.get("/inventory", tags=["query"])
async def query_inventory(
    product_id: Optional[str] = Query(None, description="Filter by product URN"),
    location_id: Optional[str] = Query(None, description="Filter by stock location URN"),
    lot_id: Optional[str] = Query(None, description="Filter by lot URN"),
) -> list:
    """
    List InventoryBalance entities. All filters are optional and cumulative.
    Results are fetched from Orion-LD and filtered in-process.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}InventoryBalance"},
            headers=HEADERS_READ,
            timeout=10,
        )

    if r.status_code != 200:
        return []

    entities = r.json()
    if not isinstance(entities, list):
        return []

    if product_id:
        entities = [e for e in entities if _rel_obj(e, "product") == product_id]
    if location_id:
        entities = [e for e in entities if _rel_obj(e, "location") == location_id]
    if lot_id:
        entities = [e for e in entities if _rel_obj(e, "lot") == lot_id]

    return entities


# ── Helpers ───────────────────────────────────────────────────────────────────

def _rel_obj(entity: dict, attr: str) -> Optional[str]:
    """Extract the object URN from a Relationship attribute (handles expanded IRIs)."""
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                return v.get("object") or v.get("@id")
            return str(v) if v else None
    return None


async def _upsert_lot(
    client: httpx.AsyncClient,
    lot_id: str,
    lot_code: str,
    product_id: str,
) -> None:
    entity = {
        "id": lot_id,
        "type": "Lot",
        "lotCode": {"type": "Property", "value": lot_code},
        "qualityStatus": {"type": "Property", "value": "approved"},
        "state": {"type": "Property", "value": "active"},
        "product": {"type": "Relationship", "object": product_id},
        "@context": CONTEXT_URL,
    }
    r = await client.post(
        f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
        json=[entity],
        headers=HEADERS_WRITE,
        timeout=10,
    )
    if r.status_code not in (201, 204):
        raise HTTPException(status_code=502, detail=f"Failed to upsert Lot: {r.text}")


async def _create_stock_move(
    client: httpx.AsyncClient,
    sm_id: str,
    body: ReceiveMaterialRequest,
    lot_id: Optional[str],
) -> None:
    entity: dict = {
        "id": sm_id,
        "type": "StockMove",
        "moveType": {"type": "Property", "value": "receipt"},
        "quantity": {"type": "Property", "value": body.quantity, "unitCode": body.unit},
        "state": {"type": "Property", "value": "done"},
        "actualDate": {"type": "Property", "value": _now_iso()},
        "product": {"type": "Relationship", "object": body.product_id},
        "toLocation": {"type": "Relationship", "object": body.location_id},
        "@context": CONTEXT_URL,
    }
    if body.reference:
        entity["origin"] = {"type": "Property", "value": body.reference}
    if lot_id:
        entity["lot"] = {"type": "Relationship", "object": lot_id}

    r = await client.post(
        f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
        json=[entity],
        headers=HEADERS_WRITE,
        timeout=10,
    )
    if r.status_code not in (201, 204):
        raise HTTPException(status_code=502, detail=f"Failed to create StockMove: {r.text}")


async def _update_balance(
    client: httpx.AsyncClient,
    ib_id: str,
    body: ReceiveMaterialRequest,
    lot_id: Optional[str],
) -> float:
    r = await client.get(
        f"{ORION_URL}/ngsi-ld/v1/entities/{ib_id}",
        headers=HEADERS_READ,
        timeout=10,
    )

    if r.status_code == 200:
        existing = r.json()
        current_qty = _extract_qty(existing, "quantityOnHand")
        new_qty = current_qty + body.quantity
        patch = {
            "quantityOnHand": {"type": "Property", "value": new_qty, "unitCode": body.unit},
            "availableQuantity": {"type": "Property", "value": new_qty, "unitCode": body.unit},
            "inventoryDate": {"type": "Property", "value": _now_iso()},
            "@context": CONTEXT_URL,
        }
        await client.patch(
            f"{ORION_URL}/ngsi-ld/v1/entities/{ib_id}/attrs",
            json=patch,
            headers=HEADERS_WRITE,
            timeout=10,
        )
        return new_qty

    # No existing balance — create it
    new_qty = body.quantity
    entity: dict = {
        "id": ib_id,
        "type": "InventoryBalance",
        "quantityOnHand": {"type": "Property", "value": new_qty, "unitCode": body.unit},
        "reservedQuantity": {"type": "Property", "value": 0.0, "unitCode": body.unit},
        "availableQuantity": {"type": "Property", "value": new_qty, "unitCode": body.unit},
        "inventoryDate": {"type": "Property", "value": _now_iso()},
        "state": {"type": "Property", "value": "active"},
        "product": {"type": "Relationship", "object": body.product_id},
        "location": {"type": "Relationship", "object": body.location_id},
        "@context": CONTEXT_URL,
    }
    if lot_id:
        entity["lot"] = {"type": "Relationship", "object": lot_id}

    r2 = await client.post(
        f"{ORION_URL}/ngsi-ld/v1/entities",
        json=entity,
        headers=HEADERS_WRITE,
        timeout=10,
    )
    if r2.status_code not in (201, 204):
        raise HTTPException(status_code=502, detail=f"Failed to create InventoryBalance: {r2.text}")
    return new_qty


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
