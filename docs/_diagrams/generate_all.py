"""
Generate architecture diagrams for the FIWARE MRP documentation.
Output: docs/_static/architecture/*.png
Run from repo root: python3 docs/_diagrams/generate_all.py
"""
import os
from diagrams import Diagram, Cluster, Edge
from diagrams.onprem.database import MongoDB
from diagrams.programming.language import Python
from diagrams.onprem.client import User
from diagrams.onprem.network import Nginx
from diagrams.onprem.compute import Server

OUT = os.path.join(os.path.dirname(__file__), "..", "_static", "architecture")
os.makedirs(OUT, exist_ok=True)

GRAPH_ATTR = {
    "fontsize": "13",
    "bgcolor": "white",
    "pad": "0.5",
    "splines": "ortho",
    "nodesep": "0.6",
    "ranksep": "0.8",
}

NODE_ACTIVE  = {"style": "filled", "fillcolor": "#dbeafe", "fontcolor": "#1e3a5f", "fontsize": "11"}
NODE_FUTURE  = {"style": "filled,dashed", "fillcolor": "#f1f5f9", "fontcolor": "#94a3b8", "fontsize": "10"}
NODE_INFRA   = {"style": "filled", "fillcolor": "#dcfce7", "fontcolor": "#14532d", "fontsize": "11"}
NODE_EMUL    = {"style": "filled", "fillcolor": "#fef9c3", "fontcolor": "#713f12", "fontsize": "11"}
NODE_USER    = {"style": "filled", "fillcolor": "#ede9fe", "fontcolor": "#4c1d95", "fontsize": "11"}

EDGE_LIVE    = {"color": "#3b82f6", "style": "solid"}
EDGE_FUTURE  = {"color": "#cbd5e1", "style": "dashed"}
EDGE_DATA    = {"color": "#22c55e", "style": "solid"}

# ─────────────────────────────────────────────────────────────────────────────
# FULL ARCHITECTURE — all tutorials complete
# ─────────────────────────────────────────────────────────────────────────────
def full_architecture():
    path = os.path.join(OUT, "arch-full")
    with Diagram(
        "FIWARE MRP — Complete Reference Architecture",
        filename=path,
        outformat="png",
        show=False,
        graph_attr=GRAPH_ATTR,
        direction="TB",
    ):
        with Cluster("Clients"):
            user = User("Browser / User", **NODE_USER)

        with Cluster("Emulator Layer"):
            ui  = Server("emulator-ui\n:5173", **NODE_EMUL)
            gw  = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services  (Python / FastAPI)"):
            with Cluster("Master Data & Inventory  (T01–T02)"):
                api = Python("mrp-api\n:8080", **NODE_ACTIVE)
                inv = Python("inventory-service\n:8081", **NODE_ACTIVE)
            with Cluster("Planning  (T03–T06)"):
                bom  = Python("bom-service\n:8082", **NODE_ACTIVE)
                mfg  = Python("manufacturing-service\n:8083", **NODE_ACTIVE)
                sched = Python("scheduler-service\n:8084", **NODE_ACTIVE)
            with Cluster("Execution  (T07–T08)"):
                sf = Python("shopfloor-service\n:8085", **NODE_ACTIVE)
                fg = Python("finished-goods-service\n:8086", **NODE_ACTIVE)
            with Cluster("Future  (T09–T12)"):
                qual = Server("quality-service\n:8087  [T09]", **NODE_FUTURE)
                mps  = Server("mps-service\n:8088  [T10]", **NODE_FUTURE)
                iot  = Server("iot-simulator\n:8089  [T11]", **NODE_FUTURE)

        with Cluster("NGSI-LD Platform"):
            orion = Server("Orion-LD 1.6.0\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data Store"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        # User → Emulator
        user >> Edge(**EDGE_LIVE) >> ui
        ui   >> Edge(**EDGE_LIVE) >> gw

        # Emulator → MRP Services
        gw >> Edge(**EDGE_LIVE) >> [api, inv, bom, mfg, sched, sf, fg]

        # MRP Services → Orion-LD
        api   >> Edge(**EDGE_DATA) >> orion
        inv   >> Edge(**EDGE_DATA) >> orion
        bom   >> Edge(**EDGE_DATA) >> orion
        mfg   >> Edge(**EDGE_DATA) >> orion
        sched >> Edge(**EDGE_DATA) >> orion
        sf    >> Edge(**EDGE_DATA) >> orion
        fg    >> Edge(**EDGE_DATA) >> orion

        # Future services → Orion-LD (dashed)
        qual >> Edge(**EDGE_FUTURE) >> orion
        mps  >> Edge(**EDGE_FUTURE) >> orion
        iot  >> Edge(**EDGE_FUTURE) >> orion

        # Context resolution
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx

        # Orion-LD → MongoDB
        orion >> Edge(**EDGE_DATA) >> mongo

    print(f"  ✓ arch-full.png")


# ─────────────────────────────────────────────────────────────────────────────
# Helper: generate a per-tutorial diagram
# ─────────────────────────────────────────────────────────────────────────────
def tutorial_diagram(name, filename, active_services, title):
    """
    active_services: list of (label, port, style) tuples
    """
    path = os.path.join(OUT, filename)

    with Diagram(
        title,
        filename=path,
        outformat="png",
        show=False,
        graph_attr={**GRAPH_ATTR, "ranksep": "0.6"},
        direction="TB",
    ):
        with Cluster("Emulator"):
            gw = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services"):
            nodes = [
                Python(f"{svc}\n:{port}", **style)
                for svc, port, style in active_services
            ]

        with Cluster("NGSI-LD"):
            orion = Server("Orion-LD\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        gw >> Edge(**EDGE_LIVE) >> nodes
        for n in nodes:
            n >> Edge(**EDGE_DATA) >> orion
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx
        orion >> Edge(**EDGE_DATA) >> mongo

    print(f"  ✓ {filename}.png")


# ─────────────────────────────────────────────────────────────────────────────
# Per-tutorial diagrams
# ─────────────────────────────────────────────────────────────────────────────
ACTIVE  = NODE_ACTIVE
PREV    = {"style": "filled", "fillcolor": "#e0e7ff", "fontcolor": "#3730a3", "fontsize": "11"}
FUTURE_ = NODE_FUTURE


def t01():
    path = os.path.join(OUT, "arch-t01")
    with Diagram(
        "Tutorial 01 — Factory Master Data",
        filename=path, outformat="png", show=False,
        graph_attr={**GRAPH_ATTR, "ranksep": "0.6"}, direction="TB",
    ):
        with Cluster("Emulator"):
            gw = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services — NEW"):
            api = Python("mrp-api\n:8080", **ACTIVE)

        with Cluster("NGSI-LD"):
            orion = Server("Orion-LD\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        gw    >> Edge(**EDGE_LIVE) >> api
        api   >> Edge(**EDGE_DATA) >> orion
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx
        orion >> Edge(**EDGE_DATA) >> mongo
    print("  ✓ arch-t01.png")


def t02():
    path = os.path.join(OUT, "arch-t02")
    with Diagram(
        "Tutorial 02 — Inventory Balances",
        filename=path, outformat="png", show=False,
        graph_attr={**GRAPH_ATTR, "ranksep": "0.6"}, direction="TB",
    ):
        with Cluster("Emulator"):
            gw = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services"):
            with Cluster("Previous"):
                api = Python("mrp-api\n:8080", **PREV)
            with Cluster("NEW"):
                inv = Python("inventory-service\n:8081", **ACTIVE)

        with Cluster("NGSI-LD"):
            orion = Server("Orion-LD\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        gw    >> Edge(**EDGE_LIVE) >> [api, inv]
        api   >> Edge(**EDGE_DATA) >> orion
        inv   >> Edge(**EDGE_DATA) >> orion
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx
        orion >> Edge(**EDGE_DATA) >> mongo
    print("  ✓ arch-t02.png")


def t03():
    path = os.path.join(OUT, "arch-t03")
    with Diagram(
        "Tutorial 03 — Bill of Materials",
        filename=path, outformat="png", show=False,
        graph_attr={**GRAPH_ATTR, "ranksep": "0.6"}, direction="TB",
    ):
        with Cluster("Emulator"):
            gw = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services"):
            with Cluster("Previous"):
                api = Python("mrp-api\n:8080", **PREV)
                inv = Python("inventory-service\n:8081", **PREV)
            with Cluster("NEW"):
                bom = Python("bom-service\n:8082", **ACTIVE)

        with Cluster("NGSI-LD"):
            orion = Server("Orion-LD\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        gw    >> Edge(**EDGE_LIVE) >> [api, inv, bom]
        for n in [api, inv, bom]:
            n >> Edge(**EDGE_DATA) >> orion
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx
        orion >> Edge(**EDGE_DATA) >> mongo
    print("  ✓ arch-t03.png")


def t04():
    path = os.path.join(OUT, "arch-t04")
    with Diagram(
        "Tutorial 04 — Manufacturing Orders",
        filename=path, outformat="png", show=False,
        graph_attr={**GRAPH_ATTR, "ranksep": "0.6"}, direction="TB",
    ):
        with Cluster("Emulator"):
            gw = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services"):
            with Cluster("Previous"):
                api = Python("mrp-api\n:8080", **PREV)
                inv = Python("inventory-service\n:8081", **PREV)
                bom = Python("bom-service\n:8082", **PREV)
            with Cluster("NEW"):
                mfg = Python("manufacturing-service\n:8083", **ACTIVE)

        with Cluster("NGSI-LD"):
            orion = Server("Orion-LD\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        gw >> Edge(**EDGE_LIVE) >> [api, inv, bom, mfg]
        for n in [api, inv, bom, mfg]:
            n >> Edge(**EDGE_DATA) >> orion
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx
        orion >> Edge(**EDGE_DATA) >> mongo
    print("  ✓ arch-t04.png")


def t05():
    path = os.path.join(OUT, "arch-t05")
    with Diagram(
        "Tutorial 05 — Component Reservations",
        filename=path, outformat="png", show=False,
        graph_attr={**GRAPH_ATTR, "ranksep": "0.6"}, direction="TB",
    ):
        with Cluster("Emulator"):
            gw = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services"):
            with Cluster("Previous"):
                api  = Python("mrp-api\n:8080", **PREV)
                bom  = Python("bom-service\n:8082", **PREV)
                mfg  = Python("manufacturing-service\n:8083", **PREV)
            with Cluster("Extended (NEW entities)"):
                inv  = Python("inventory-service\n:8081\n+reserve-components", **ACTIVE)

        with Cluster("NGSI-LD"):
            orion = Server("Orion-LD\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        gw >> Edge(**EDGE_LIVE) >> [api, inv, bom, mfg]
        for n in [api, inv, bom, mfg]:
            n >> Edge(**EDGE_DATA) >> orion
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx
        orion >> Edge(**EDGE_DATA) >> mongo
    print("  ✓ arch-t05.png")


def t06():
    path = os.path.join(OUT, "arch-t06")
    with Diagram(
        "Tutorial 06 — Work Order Scheduling",
        filename=path, outformat="png", show=False,
        graph_attr={**GRAPH_ATTR, "ranksep": "0.6"}, direction="TB",
    ):
        with Cluster("Emulator"):
            gw = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services"):
            with Cluster("Previous"):
                api  = Python("mrp-api\n:8080", **PREV)
                inv  = Python("inventory-service\n:8081", **PREV)
                bom  = Python("bom-service\n:8082", **PREV)
                mfg  = Python("manufacturing-service\n:8083", **PREV)
            with Cluster("NEW"):
                sched = Python("scheduler-service\n:8084", **ACTIVE)

        with Cluster("NGSI-LD"):
            orion = Server("Orion-LD\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        gw >> Edge(**EDGE_LIVE) >> [api, inv, bom, mfg, sched]
        for n in [api, inv, bom, mfg, sched]:
            n >> Edge(**EDGE_DATA) >> orion
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx
        orion >> Edge(**EDGE_DATA) >> mongo
    print("  ✓ arch-t06.png")


def t07():
    path = os.path.join(OUT, "arch-t07")
    with Diagram(
        "Tutorial 07 — Shop-floor Execution",
        filename=path, outformat="png", show=False,
        graph_attr={**GRAPH_ATTR, "ranksep": "0.6"}, direction="TB",
    ):
        with Cluster("Emulator"):
            gw = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services"):
            with Cluster("Previous"):
                api   = Python("mrp-api\n:8080", **PREV)
                inv   = Python("inventory-service\n:8081", **PREV)
                bom   = Python("bom-service\n:8082", **PREV)
                mfg   = Python("manufacturing-service\n:8083", **PREV)
                sched = Python("scheduler-service\n:8084", **PREV)
            with Cluster("NEW"):
                sf = Python("shopfloor-service\n:8085", **ACTIVE)

        with Cluster("NGSI-LD"):
            orion = Server("Orion-LD\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        gw >> Edge(**EDGE_LIVE) >> [api, inv, bom, mfg, sched, sf]
        for n in [api, inv, bom, mfg, sched, sf]:
            n >> Edge(**EDGE_DATA) >> orion
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx
        orion >> Edge(**EDGE_DATA) >> mongo
    print("  ✓ arch-t07.png")


def t08():
    path = os.path.join(OUT, "arch-t08")
    with Diagram(
        "Tutorial 08 — Finished Goods Receipt",
        filename=path, outformat="png", show=False,
        graph_attr={**GRAPH_ATTR, "ranksep": "0.6"}, direction="TB",
    ):
        with Cluster("Emulator"):
            gw = Python("emulator-gateway\n:8090", **NODE_EMUL)

        with Cluster("MRP Services"):
            with Cluster("Previous"):
                api   = Python("mrp-api\n:8080", **PREV)
                inv   = Python("inventory-service\n:8081", **PREV)
                bom   = Python("bom-service\n:8082", **PREV)
                mfg   = Python("manufacturing-service\n:8083", **PREV)
                sched = Python("scheduler-service\n:8084", **PREV)
                sf    = Python("shopfloor-service\n:8085", **PREV)
            with Cluster("NEW"):
                fg = Python("finished-goods-service\n:8086", **ACTIVE)

        with Cluster("NGSI-LD"):
            orion = Server("Orion-LD\n:1026", **NODE_INFRA)
            ctx   = Nginx("context-server\n:3000", **NODE_INFRA)

        with Cluster("Data"):
            mongo = MongoDB("MongoDB 5.0", **NODE_INFRA)

        gw >> Edge(**EDGE_LIVE) >> [api, inv, bom, mfg, sched, sf, fg]
        for n in [api, inv, bom, mfg, sched, sf, fg]:
            n >> Edge(**EDGE_DATA) >> orion
        orion >> Edge(color="#94a3b8", style="dotted") >> ctx
        orion >> Edge(**EDGE_DATA) >> mongo
    print("  ✓ arch-t08.png")


if __name__ == "__main__":
    print("Generating architecture diagrams...")
    full_architecture()
    t01()
    t02()
    t03()
    t04()
    t05()
    t06()
    t07()
    t08()
    print("Done — PNGs written to docs/_static/architecture/")
