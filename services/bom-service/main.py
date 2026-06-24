"""
BoM Service — Tutorial 03 addition to the FIWARE MRP stack.
Implements the explode-bom command and Bill of Materials queries over NGSI-LD.
"""
import os
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="FIWARE MRP BoM Service",
    version="0.3.0",
    description="Bill of Materials queries and BoM explosion on NGSI-LD",
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


class ExplodeBomRequest(BaseModel):
    product_id: str
    quantity: float


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "bom-service", "version": "0.3.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-bom", "version": "0.3.0", "docs": "/docs"})


@app.get("/boms", tags=["query"])
async def list_boms(
    product_id: Optional[str] = Query(None, description="Filter by product URN"),
) -> list:
    """List BillOfMaterials entities, optionally filtered by product."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}BillOfMaterials"},
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
    return entities


@app.get("/boms/{bom_id}/lines", tags=["query"])
async def list_bom_lines(bom_id: str) -> list:
    """List all BillOfMaterialsLine entities for a given BOM id."""
    full_id = bom_id if bom_id.startswith("urn:") else f"urn:ngsi-ld:BillOfMaterials:{bom_id}"
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}BillOfMaterialsLine"},
            headers=HEADERS_READ,
            timeout=10,
        )
    if r.status_code != 200:
        return []
    entities = r.json()
    if not isinstance(entities, list):
        return []
    return [e for e in entities if _rel_obj(e, "bom") == full_id]


@app.post("/commands/explode-bom", tags=["commands"])
async def explode_bom(body: ExplodeBomRequest) -> dict:
    """
    Explode a Bill of Materials for the given product and quantity.

    Fetches the active BOM for the product, then computes the net material
    requirements for each component line: required_quantity = line_quantity × order_quantity.
    The scrapFactor is included informatively but not applied to required_quantity
    (gross requirements are a Tutorial 10 MRP planning concern).
    """
    async with httpx.AsyncClient() as client:
        # 1. Find active BOM for this product
        r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}BillOfMaterials"},
            headers=HEADERS_READ,
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to query Orion-LD for BOM")

        boms = r.json()
        if not isinstance(boms, list):
            raise HTTPException(status_code=502, detail="Unexpected response from Orion-LD")

        bom = next(
            (b for b in boms
             if _rel_obj(b, "product") == body.product_id and _prop_val(b, "state") == "active"),
            None,
        )
        if bom is None:
            raise HTTPException(
                status_code=404,
                detail=f"No active BillOfMaterials found for product: {body.product_id}",
            )

        bom_id = bom["id"]

        # 2. Fetch all BOM lines for this BOM
        r2 = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities",
            params={"type": f"{MRP_NS}BillOfMaterialsLine"},
            headers=HEADERS_READ,
            timeout=10,
        )
        if r2.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to query Orion-LD for BOM lines")

        all_lines = r2.json()
        if not isinstance(all_lines, list):
            raise HTTPException(status_code=502, detail="Unexpected response from Orion-LD")

        lines = [ln for ln in all_lines if _rel_obj(ln, "bom") == bom_id]
        lines.sort(key=lambda ln: int(_prop_val(ln, "sequence") or 0))

    components = []
    for ln in lines:
        line_qty = float(_prop_val(ln, "quantity") or 0)
        scrap = float(_prop_val(ln, "scrapFactor") or 0)
        unit = _prop_unit(ln, "quantity") or "EA"
        component_id = _rel_obj(ln, "component") or ""
        components.append({
            "line_id": ln["id"],
            "component_id": component_id,
            "component_code": component_id.split(":")[-1],
            "sequence": int(_prop_val(ln, "sequence") or 0),
            "required_quantity": round(line_qty * body.quantity, 6),
            "unit": unit,
            "scrap_factor": scrap,
        })

    return {
        "product_id": body.product_id,
        "quantity": body.quantity,
        "bom_id": bom_id,
        "bom_code": _prop_val(bom, "bomCode") or "",
        "bom_version": _prop_val(bom, "version") or "",
        "components": components,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _rel_obj(entity: dict, attr: str) -> Optional[str]:
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                return v.get("object") or v.get("@id")
            return str(v) if v else None
    return None


def _prop_val(entity: dict, attr: str) -> Optional[str]:
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                val = v.get("value")
                return str(val) if val is not None else None
            return str(v) if v is not None else None
    return None


def _prop_unit(entity: dict, attr: str) -> Optional[str]:
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                return v.get("unitCode")
    return None
