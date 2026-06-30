from fastapi import APIRouter, HTTPException
from backend.recommendation_log import list_all

router = APIRouter()


@router.get("/logs")
async def logs_route():
    try:
        return list_all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
