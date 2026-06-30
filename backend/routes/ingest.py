from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.cognee_client import ingest

router = APIRouter()


class IngestRequest(BaseModel):
    text: str
    dataset: str = "engineering_decisions"


@router.post("/ingest")
async def ingest_route(req: IngestRequest):
    try:
        return await ingest(req.text, req.dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
