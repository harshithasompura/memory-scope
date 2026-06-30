from fastapi import APIRouter, HTTPException
from backend.cognee_client import list_traces

router = APIRouter()


@router.get("/traces")
async def traces_route():
    try:
        return await list_traces()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
