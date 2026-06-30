from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.cognee_client import ingest_github

router = APIRouter()


class IngestGithubRequest(BaseModel):
    url: str
    dataset: str = "engineering_decisions"


@router.post("/ingest/github")
async def ingest_github_route(req: IngestGithubRequest):
    try:
        return await ingest_github(req.url, req.dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
