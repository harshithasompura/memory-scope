from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.cognee_client import improve

router = APIRouter()


class ImproveRequest(BaseModel):
    dataset: str = "engineering_decisions"


@router.post("/improve")
async def improve_route(req: ImproveRequest):
    try:
        return await improve(req.dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
