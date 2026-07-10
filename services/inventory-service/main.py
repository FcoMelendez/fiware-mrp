"""
Inventory Service — Tutorial 02/05 addition to the FIWARE MRP stack.
Implements receive-material, reserve-components commands and inventory queries over NGSI-LD.
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
    version="0.5.0",
    description="Inventory balance, stock move, and component reservation commands on NGSI-LD",
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
    return {"status": "ok", "service": "inventory-service", "version": "0.5.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-inventory", "version": "0.5.0", "docs": "/docs"})


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


class ReserveComponentsRequest(BaseModel):
    order_id: str
    location_id: str = "urn:ngsi-ld:StockLocation:WH-STOCK"


@app.post("/commands/reserve-components", tags=["commands"])
async def reserve_components(body: ReserveComponentsRequest) -> dict:
    """
    Reserve components for a confirmed ManufacturingOrder.

    Fetches the order → its BOM → all BOM lines → current InventoryBalance per component.
    For each component:
      - available >= required  → state=reserved, reservedQuantity=required, shortageQuantity=0
      - 0 < available < required → state=partial
      - available == 0           → state=shortage
    Creates one InventoryReservation entity per BOM line and patches the corresponding
    InventoryBalance (reservedQuantity +=, availableQuantity -=).
    """
    async with httpx.AsyncClient() as client:
        # 1. Fetch the ManufacturingOrder
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{body.order_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=404, detail=f"Order not found: {body.order_id}")
        order = r.json()

        order_state = _extract_str(order, "state")
        if order_state != "confirmed":
            raise HTTPException(
                status_code=409,
                detail=f"Order must be in state=confirmed, current state={order_state}",
            )

        bom_id = _rel_obj(order, "bom")
        if not bom_id:
            raise HTTPException(status_code=422, detail="Order has no bom Relationship")

        # 2. Fetch all BOM lines for this BOM
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}BillOfMaterialsLine"},
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to query BOM lines")
        all_lines = r.json() if isinstance(r.json(), list) else []
        bom_lines = [ln for ln in all_lines if _rel_obj(ln, "bom") == bom_id]

        if not bom_lines:
            raise HTTPException(status_code=404, detail=f"No BOM lines found for {bom_id}")

        order_qty_raw = None
        for k, v in order.items():
            if k == "quantity" or k.endswith("#quantity"):
                if isinstance(v, dict):
                    order_qty_raw = v.get("value")
                break
        order_qty = float(order_qty_raw or 1)

        # 3. Fetch all InventoryBalance entities (filter by location in-process)
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}InventoryBalance"},
            headers=HEADERS_READ,
            timeout=10,
        )
        balances = r.json() if r.status_code == 200 and isinstance(r.json(), list) else []
        balance_by_product: dict = {}
        for bal in balances:
            prod_id = _rel_obj(bal, "product")
            loc_id = _rel_obj(bal, "location")
            if prod_id and loc_id == body.location_id:
                balance_by_product[prod_id] = bal

        # 4. Create reservations
        reservations = []
        now = _now_iso()
        order_code = body.order_id.split(":")[-1]

        for line in bom_lines:
            component_id = _rel_obj(line, "component")
            if not component_id:
                continue
            component_code = component_id.split(":")[-1]
            line_qty = _extract_qty(line, "quantity")
            required_qty = line_qty * order_qty

            bal = balance_by_product.get(component_id)
            available = _extract_qty(bal, "availableQuantity") if bal else 0.0
            bal_id = bal.get("id") if bal else None

            reserved_qty = min(available, required_qty)
            shortage_qty = max(0.0, required_qty - available)

            if shortage_qty == 0:
                state = "reserved"
            elif reserved_qty == 0:
                state = "shortage"
            else:
                state = "partial"

            ir_id = f"urn:ngsi-ld:InventoryReservation:IR-{order_code}-{component_code}"
            ir_entity: dict = {
                "id": ir_id,
                "type": "InventoryReservation",
                "reservationCode": {"type": "Property", "value": f"IR-{order_code}-{component_code}"},
                "requiredQuantity": {"type": "Property", "value": required_qty, "unitCode": "EA"},
                "reservedQuantity": {"type": "Property", "value": reserved_qty, "unitCode": "EA"},
                "shortageQuantity": {"type": "Property", "value": shortage_qty, "unitCode": "EA"},
                "state": {"type": "Property", "value": state},
                "reservedAt": {"type": "Property", "value": now},
                "manufacturingOrder": {"type": "Relationship", "object": body.order_id},
                "product": {"type": "Relationship", "object": component_id},
                "stockLocation": {"type": "Relationship", "object": body.location_id},
                "@context": CONTEXT_URL,
            }
            if bal_id:
                ir_entity["inventoryBalance"] = {"type": "Relationship", "object": bal_id}

            r2 = await client.post(
                f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
                json=[ir_entity],
                headers=HEADERS_WRITE,
                timeout=10,
            )
            if r2.status_code not in (201, 204):
                raise HTTPException(status_code=502, detail=f"Failed to create InventoryReservation: {r2.text}")

            # Patch the InventoryBalance
            if bal_id and reserved_qty > 0:
                current_reserved = _extract_qty(bal, "reservedQuantity")
                new_reserved = current_reserved + reserved_qty
                new_available = max(0.0, available - reserved_qty)
                patch = {
                    "reservedQuantity": {"type": "Property", "value": new_reserved, "unitCode": "EA"},
                    "availableQuantity": {"type": "Property", "value": new_available, "unitCode": "EA"},
                    "@context": CONTEXT_URL,
                }
                await client.patch(
                    f"{ORION_URL}/ngsi-ld/v1/entities/{bal_id}/attrs",
                    json=patch,
                    headers=HEADERS_WRITE,
                    timeout=10,
                )

            reservations.append({
                "reservation_id": ir_id,
                "component_id": component_id,
                "required_quantity": required_qty,
                "reserved_quantity": reserved_qty,
                "shortage_quantity": shortage_qty,
                "state": state,
            })

    reserved_count = sum(1 for r2 in reservations if r2["state"] == "reserved")
    partial_count = sum(1 for r2 in reservations if r2["state"] == "partial")
    shortage_count = sum(1 for r2 in reservations if r2["state"] == "shortage")

    return {
        "status": "done",
        "order_id": body.order_id,
        "reservations_created": len(reservations),
        "summary": {
            "reserved": reserved_count,
            "partial": partial_count,
            "shortage": shortage_count,
        },
        "reservations": reservations,
    }


class ResolveShortagesRequest(BaseModel):
    order_id: str


@app.post("/commands/resolve-shortages", tags=["commands"])
async def resolve_shortages(body: ResolveShortagesRequest) -> dict:
    """
    Re-check an order's InventoryReservations left in shortage/partial state
    and top up reservedQuantity from stock that has arrived since.

    Unlike reserve-components (which creates reservations from scratch),
    this only ever moves the *delta* between shortageQuantity and current
    availableQuantity — it never re-adds the quantity a prior
    reserve-components call already reserved, so it is safe to call
    repeatedly as more stock arrives. Because reservedQuantity,
    shortageQuantity and state already exist on these entities (set by the
    original reserve-components call), this uses PATCH, not POST.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}InventoryReservation"},
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to query InventoryReservations")
        all_reservations = r.json() if isinstance(r.json(), list) else []
        reservations = [
            res for res in all_reservations
            if _rel_obj(res, "manufacturingOrder") == body.order_id
            and _extract_str(res, "state") in ("shortage", "partial")
        ]

        # Fetch current balances up front, indexed by (product, location) — a
        # shortaged reservation may predate any InventoryBalance for that
        # component ever existing, so it won't have an inventoryBalance
        # Relationship yet. Look the balance up fresh instead of trusting it.
        br = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}InventoryBalance"},
            headers=HEADERS_READ,
            timeout=10,
        )
        balances = br.json() if br.status_code == 200 and isinstance(br.json(), list) else []
        balance_by_key = {
            (_rel_obj(b, "product"), _rel_obj(b, "location")): b for b in balances
        }

        resolved = []
        for res in reservations:
            ir_id = res["id"]
            component_id = _rel_obj(res, "product")
            location_id = _rel_obj(res, "stockLocation")
            bal = balance_by_key.get((component_id, location_id))
            if not bal:
                continue
            bal_id = bal["id"]
            available = _extract_qty(bal, "availableQuantity")

            shortage_qty = _extract_qty(res, "shortageQuantity")
            reserved_qty = _extract_qty(res, "reservedQuantity")
            delta = min(shortage_qty, available)
            if delta <= 0:
                continue

            new_reserved_qty = reserved_qty + delta
            new_shortage_qty = shortage_qty - delta
            new_state = "reserved" if new_shortage_qty == 0 else "partial"

            patch_ir = {
                "reservedQuantity": {"type": "Property", "value": new_reserved_qty, "unitCode": "EA"},
                "shortageQuantity": {"type": "Property", "value": new_shortage_qty, "unitCode": "EA"},
                "state": {"type": "Property", "value": new_state},
                "@context": CONTEXT_URL,
            }
            await client.patch(
                f"{ORION_URL}/ngsi-ld/v1/entities/{ir_id}/attrs",
                json=patch_ir,
                headers=HEADERS_WRITE,
                timeout=10,
            )

            new_available = max(0.0, available - delta)
            current_bal_reserved = _extract_qty(bal, "reservedQuantity")
            patch_bal = {
                "availableQuantity": {"type": "Property", "value": new_available, "unitCode": "EA"},
                "reservedQuantity": {"type": "Property", "value": current_bal_reserved + delta, "unitCode": "EA"},
                "@context": CONTEXT_URL,
            }
            await client.patch(
                f"{ORION_URL}/ngsi-ld/v1/entities/{bal_id}/attrs",
                json=patch_bal,
                headers=HEADERS_WRITE,
                timeout=10,
            )

            resolved.append({
                "reservation_id": ir_id,
                "topped_up_quantity": delta,
                "reserved_quantity": new_reserved_qty,
                "shortage_quantity": new_shortage_qty,
                "state": new_state,
            })

    return {
        "status": "done",
        "order_id": body.order_id,
        "resolved_count": len(resolved),
        "reservations": resolved,
    }


@app.get("/inventory-reservations", tags=["query"])
async def query_reservations(
    order_id: Optional[str] = Query(None, description="Filter by ManufacturingOrder URN"),
    state: Optional[str] = Query(None, description="Filter by state (reserved/partial/shortage)"),
) -> list:
    """
    List InventoryReservation entities. All filters are optional and cumulative.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}InventoryReservation"},
            headers=HEADERS_READ,
            timeout=10,
        )

    if r.status_code != 200:
        return []

    entities = r.json()
    if not isinstance(entities, list):
        return []

    if order_id:
        entities = [e for e in entities if _rel_obj(e, "manufacturingOrder") == order_id]
    if state:
        entities = [e for e in entities if _extract_str(e, "state") == state]

    return entities


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
