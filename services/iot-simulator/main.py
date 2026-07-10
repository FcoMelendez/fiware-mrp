"""
IoT Simulator — Tutorial 11 addition to the FIWARE MRP stack.
Implements emit-signal, clock-in, and clock-out (IoT/MES signals) over NGSI-LD.
"""
import asyncio
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
    title="FIWARE MRP IoT Simulator",
    version="0.11.0",
    description="IoT/MES telemetry, derived machine state, and operator clock in/out on NGSI-LD",
)

ORION_URL = os.getenv("ORION_URL", "http://orion-ld:1026")
CONTEXT_URL = os.getenv(
    "CONTEXT_URL",
    "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
)
MRP_NS = "https://fiware-mrp.io/ontology/mrp#"

TEMPERATURE_FAULT_THRESHOLD = 80.0

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
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{stamp}-{suffix}"


def _extract_str(entity: dict, attr: str) -> Optional[str]:
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                return v.get("value")
            return str(v) if v else None
    return None


def _rel_obj(entity: dict, attr: str) -> Optional[str]:
    for k, v in entity.items():
        if k == attr or k.endswith(f"#{attr}"):
            if isinstance(v, dict):
                return v.get("object") or v.get("@id")
            return str(v) if v else None
    return None


class EmitSignalRequest(BaseModel):
    work_center_id: str
    signal_type: str
    actual_value: float
    unit_code: str = "C62"
    quality: str = "good"


class ClockInRequest(BaseModel):
    operator_id: str
    work_center_id: str


class ClockOutRequest(BaseModel):
    assignment_id: str


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "iot-simulator", "version": "0.11.0"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({"service": "fiware-mrp-iot-simulator", "version": "0.11.0", "docs": "/docs"})


def _derive_state(signal_type: str, actual_value: float, quality: str) -> str:
    if quality == "bad":
        return "fault"
    if signal_type == "temperature" and actual_value > TEMPERATURE_FAULT_THRESHOLD:
        return "fault"
    if quality == "uncertain":
        return "idle"
    return "running"


@app.post("/commands/emit-signal", tags=["commands"])
async def emit_signal(req: EmitSignalRequest) -> dict:
    """
    Record a MachineSignal reading for a WorkCenter and (re)compute its MachineState.

    MachineSignal is immutable (one entity per reading); MachineState is a single
    entity per WorkCenter that is overwritten on every signal — this is the entity
    an NGSI-LD subscription would watch to get live updates without polling.
    """
    async with httpx.AsyncClient() as client:
        wc_r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.work_center_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if wc_r.status_code != 200:
            raise HTTPException(status_code=404, detail=f"WorkCenter not found: {req.work_center_id}")

        now = _now_iso()
        wc_slug = req.work_center_id.split(":")[-1]
        signal_id = f"urn:ngsi-ld:MachineSignal:MS-{wc_slug}-{_short_id()}"

        signal: dict = {
            "id": signal_id,
            "type": "MachineSignal",
            "signalType":  {"type": "Property", "value": req.signal_type},
            "actualValue": {
                "type": "Property",
                "value": req.actual_value,
                "unitCode": req.unit_code,
                "observedAt": now,
            },
            "quality":    {"type": "Property", "value": req.quality},
            "workCenter": {"type": "Relationship", "object": req.work_center_id},
            "@context": CONTEXT_URL,
        }
        sig_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
            json=[signal],
            headers=HEADERS_WRITE,
            timeout=10,
        )
        if sig_r.status_code not in (201, 204):
            raise HTTPException(status_code=502, detail=f"Failed to create MachineSignal: {sig_r.text}")

        state = _derive_state(req.signal_type, req.actual_value, req.quality)

        state_id = f"urn:ngsi-ld:MachineState:MST-{wc_slug}"
        existing_r = await client.get(
            f"{ORION_URL}/ngsi-ld/v1/entities/{state_id}",
            headers=HEADERS_READ,
            timeout=10,
        )
        if existing_r.status_code == 200:
            state_r = await client.patch(
                f"{ORION_URL}/ngsi-ld/v1/entities/{state_id}/attrs",
                json={
                    "state":      {"type": "Property", "value": state},
                    "detectedAt": {"type": "Property", "value": now},
                    "lastSignal": {"type": "Relationship", "object": signal_id},
                    "@context": CONTEXT_URL,
                },
                headers=HEADERS_WRITE,
                timeout=10,
            )
        else:
            state_r = await client.post(
                f"{ORION_URL}/ngsi-ld/v1/entities",
                json={
                    "id": state_id,
                    "type": "MachineState",
                    "state":      {"type": "Property", "value": state},
                    "detectedAt": {"type": "Property", "value": now},
                    "workCenter": {"type": "Relationship", "object": req.work_center_id},
                    "lastSignal": {"type": "Relationship", "object": signal_id},
                    "@context": CONTEXT_URL,
                },
                headers=HEADERS_WRITE,
                timeout=10,
            )
        if state_r.status_code not in (201, 204, 207):
            raise HTTPException(status_code=502, detail=f"Failed to update MachineState: {state_r.text}")

        return {
            "status": "done",
            "machine_signal_id": signal_id,
            "machine_state_id": state_id,
            "work_center_id": req.work_center_id,
            "state": state,
        }


@app.post("/commands/clock-in", tags=["commands"])
async def clock_in(req: ClockInRequest) -> dict:
    """Create an OperatorAssignment with timerStatus=clocked_in."""
    async with httpx.AsyncClient() as client:
        now = _now_iso()
        operator_slug = req.operator_id.split(":")[-1]
        wc_slug = req.work_center_id.split(":")[-1]
        assignment_id = f"urn:ngsi-ld:OperatorAssignment:OA-{operator_slug}-{wc_slug}-{_short_id()}"

        assignment: dict = {
            "id": assignment_id,
            "type": "OperatorAssignment",
            "timerStatus": {"type": "Property", "value": "clocked_in"},
            "actualStart": {"type": "Property", "value": now},
            "operator":    {"type": "Relationship", "object": req.operator_id},
            "workCenter":  {"type": "Relationship", "object": req.work_center_id},
            "@context": CONTEXT_URL,
        }
        r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entityOperations/upsert",
            json=[assignment],
            headers=HEADERS_WRITE,
            timeout=10,
        )
        if r.status_code not in (201, 204):
            raise HTTPException(status_code=502, detail=f"Failed to create OperatorAssignment: {r.text}")

        return {
            "status": "done",
            "assignment_id": assignment_id,
            "timer_status": "clocked_in",
            "actual_start": now,
        }


@app.post("/commands/clock-out", tags=["commands"])
async def clock_out(req: ClockOutRequest) -> dict:
    """
    Set timerStatus=clocked_out and compute actualDuration.

    actualEnd and actualDuration do not yet exist on this entity, so POST /attrs
    (append-or-overwrite) is required — PATCH /attrs only updates attributes that
    already exist.
    """
    async with httpx.AsyncClient() as client:
        # clock-in and clock-out are typically fired back-to-back in the same
        # tutorial script; a fresh OperatorAssignment can occasionally not be
        # visible yet on this read due to Orion-LD's eventual-consistency
        # window under load, so retry briefly before giving up.
        r = None
        for attempt in range(3):
            r = await client.get(
                f"{ORION_URL}/ngsi-ld/v1/entities/{req.assignment_id}",
                headers=HEADERS_READ,
                timeout=10,
            )
            if r.status_code == 200:
                break
            if attempt < 2:
                await asyncio.sleep(0.15)
        if r.status_code != 200:
            raise HTTPException(status_code=404, detail=f"OperatorAssignment not found: {req.assignment_id}")
        assignment = r.json()

        timer_status = _extract_str(assignment, "timerStatus")
        if timer_status != "clocked_in":
            raise HTTPException(
                status_code=422,
                detail=f"OperatorAssignment must be clocked_in, got: {timer_status}",
            )

        actual_start_str = _extract_str(assignment, "actualStart")
        now = _now_iso()
        actual_start = datetime.fromisoformat(actual_start_str.replace("Z", "+00:00"))
        actual_end = datetime.fromisoformat(now.replace("Z", "+00:00"))
        duration_hours = (actual_end - actual_start).total_seconds() / 3600.0

        patch_r = await client.post(
            f"{ORION_URL}/ngsi-ld/v1/entities/{req.assignment_id}/attrs",
            json={
                "timerStatus":    {"type": "Property", "value": "clocked_out"},
                "actualEnd":      {"type": "Property", "value": now},
                "actualDuration": {"type": "Property", "value": duration_hours},
                "@context": CONTEXT_URL,
            },
            headers=HEADERS_WRITE,
            timeout=10,
        )
        if patch_r.status_code not in (204, 207):
            raise HTTPException(status_code=502, detail=f"Broker patch failed: {patch_r.status_code}")

        return {
            "status": "done",
            "assignment_id": req.assignment_id,
            "timer_status": "clocked_out",
            "actual_duration_hours": duration_hours,
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


@app.get("/machine-signals", tags=["query"])
async def list_machine_signals(work_center_id: Optional[str] = Query(None)) -> list:
    return await _list_entities("MachineSignal", {"workCenter": work_center_id})


@app.get("/machine-states", tags=["query"])
async def list_machine_states(
    work_center_id: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
) -> list:
    return await _list_entities("MachineState", {"workCenter": work_center_id, "state": state})


@app.get("/operator-assignments", tags=["query"])
async def list_operator_assignments(
    operator_id: Optional[str] = Query(None),
    work_center_id: Optional[str] = Query(None),
    timer_status: Optional[str] = Query(None),
) -> list:
    return await _list_entities(
        "OperatorAssignment",
        {"operator": operator_id, "workCenter": work_center_id, "timerStatus": timer_status},
    )
