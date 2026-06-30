import cognee
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.routes import ingest, query, forget, graph, traces, improve, logs, ingest_github

load_dotenv()

app = FastAPI(title="MemoryScope API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(forget.router)
app.include_router(graph.router)
app.include_router(traces.router)
app.include_router(improve.router)
app.include_router(logs.router)
app.include_router(ingest_github.router)


@app.get("/health")
async def health():
    return {"status": "ok", "cognee_version": cognee.__version__}
