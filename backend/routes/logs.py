from fastapi import APIRouter, HTTPException

from backend import recommendation_log
from backend.recommendation_log import list_all
from backend.cognee_client import query as cognee_query

router = APIRouter()


@router.get("/logs")
async def logs_route():
    try:
        return list_all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs/{rec_id}")
async def get_log_route(rec_id: int):
    try:
        row = recommendation_log.get(rec_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if row is None:
        raise HTTPException(status_code=404, detail=f"Recommendation {rec_id} not found")
    return row


@router.post("/logs/{rec_id}/resolve")
async def resolve_log_route(rec_id: int):
    try:
        row = recommendation_log.get(rec_id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"Recommendation {rec_id} not found")
        recommendation_log.resolve(rec_id)
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logs/{rec_id}/reask")
async def reask_log_route(rec_id: int):
    try:
        row = recommendation_log.get(rec_id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"Recommendation {rec_id} not found")
        old_cited_data_ids = row["cited_data_ids"]
        result = await cognee_query(row["question"])
        new_cited_data_ids = result.get("cited_data_ids", [])
        new_answer = result["answer"]
        new_log_id = result.get("log_id")
        changed = set(old_cited_data_ids) != set(new_cited_data_ids)
        return {
            "old_cited_data_ids": old_cited_data_ids,
            "new_cited_data_ids": new_cited_data_ids,
            "new_answer": new_answer,
            "changed": changed,
            "new_log_id": new_log_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
