from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.cognee_client import forget

router = APIRouter()


class ForgetRequest(BaseModel):
    dataset: str = "engineering_decisions"


@router.post("/forget")
async def forget_route(req: ForgetRequest):
    try:
        return await forget(req.dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
