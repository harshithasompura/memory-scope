from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.cognee_client import query

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    as_of: str | None = None


@router.post("/query")
async def query_route(req: QueryRequest):
    as_of_ms = None
    if req.as_of is not None:
        try:
            as_of_ms = int(datetime.fromisoformat(req.as_of.replace("Z", "+00:00")).timestamp() * 1000)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"invalid as_of timestamp: {req.as_of}")
    try:
        return await query(req.question, as_of_ms=as_of_ms)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
