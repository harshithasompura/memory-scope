from fastapi import APIRouter, HTTPException
from backend.cognee_client import get_graph_html

router = APIRouter()


@router.get("/graph")
async def graph_route():
    try:
        html = await get_graph_html()
        return {"html": html}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
