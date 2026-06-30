from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.cognee_client import query

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/query")
async def query_route(req: QueryRequest):
    try:
        return await query(req.question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
