"""
MRP Business API — command layer above Orion-LD Context Broker.
Grows one tutorial at a time. Week 1: health endpoint only.
"""
import os
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(
    title="FIWARE MRP API",
    version="0.1.0",
    description="Manufacturing Resource Planning command API on NGSI-LD",
)

ORION_URL = os.getenv("ORION_URL", "http://orion-ld:1026")
CONTEXT_URL = os.getenv(
    "CONTEXT_URL",
    "http://context-server:3000/contexts/mrp/v0.1/context.jsonld",
)


@app.get("/health", tags=["system"])
def health() -> dict:
    return {
        "status": "ok",
        "service": "mrp-api",
        "version": "0.1.0",
        "orion_url": ORION_URL,
        "context_url": CONTEXT_URL,
    }


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({
        "service": "fiware-mrp-api",
        "version": "0.1.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
    })
