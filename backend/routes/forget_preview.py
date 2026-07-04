from fastapi import APIRouter, HTTPException

from backend.cognee_client import list_documents
from backend.recommendation_log import blast_radius

router = APIRouter()


@router.get("/forget/preview")
async def forget_preview_route(dataset: str, data_id: str | None = None):
    try:
        if data_id is not None:
            result = blast_radius(data_id)
            return {"data_id": data_id, "dataset": dataset, **result}
        documents = await list_documents(dataset)
        return {"dataset": dataset, "document_count": len(documents)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
