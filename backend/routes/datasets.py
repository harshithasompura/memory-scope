from fastapi import APIRouter, HTTPException

from backend.cognee_client import list_datasets

router = APIRouter()


@router.get("/datasets")
async def datasets_route():
    try:
        return await list_datasets()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
