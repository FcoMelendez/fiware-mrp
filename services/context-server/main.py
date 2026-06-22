"""
MRP Context Server — serves versioned JSON-LD @context files.
Contexts are mounted read-only from the host ./contexts directory.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

app = FastAPI(title="MRP Context Server", version="0.1.0", docs_url=None)

app.mount("/contexts", StaticFiles(directory="/app/contexts"), name="contexts")


@app.get("/health", include_in_schema=False)
def health() -> dict:
    return {"status": "ok", "service": "context-server"}


@app.get("/", include_in_schema=False)
def index() -> JSONResponse:
    return JSONResponse({
        "service": "fiware-mrp-context-server",
        "contexts": {
            "v0.1": "/contexts/mrp/v0.1/context.jsonld",
            "latest": "/contexts/mrp/latest/context.jsonld",
        },
    })
