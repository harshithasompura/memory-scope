from fastapi import APIRouter, HTTPException
from backend.cognee_client import get_graph_html, get_graph_data

router = APIRouter()


@router.get("/graph")
async def graph_route():
    try:
        html = await get_graph_html()
        return {"html": html}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/data")
async def graph_data_route(dataset: str = "engineering_decisions"):
    try:
        return await get_graph_data(dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
