import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend import cognee_client
from cognee.modules.search.types import SearchType


@pytest.mark.asyncio
async def test_query_as_of_excludes_chunks_created_after_cutoff():
    early_chunk = MagicMock()
    early_chunk.metadata = {"chunk_id": "c-early", "data_id": "d-early"}
    early_chunk.text = "early answer"

    late_chunk = MagicMock()
    late_chunk.metadata = {"chunk_id": "c-late", "data_id": "d-late"}
    late_chunk.text = "late answer"

    fake_engine = AsyncMock()

    async def fake_get_node(node_id):
        return {"created_at": 1000} if node_id == "d-early" else {"created_at": 5000}

    fake_engine.get_node = fake_get_node
    recall_mock = AsyncMock(return_value=[late_chunk, early_chunk])

    with patch("backend.cognee_client.cognee.recall", recall_mock), \
         patch("backend.cognee_client.get_graph_engine", AsyncMock(return_value=fake_engine)):
        result = await cognee_client.query("what auth method?", as_of_ms=2000)

    assert result["answer"] == "early answer"
    assert result["cited_data_ids"] == ["d-early"]
    assert recall_mock.call_count == 1
    assert recall_mock.call_args.kwargs["query_type"] == SearchType.CHUNKS


@pytest.mark.asyncio
async def test_query_as_of_returns_no_memory_message_when_all_chunks_too_new():
    chunk = MagicMock()
    chunk.metadata = {"chunk_id": "c1", "data_id": "d1"}
    chunk.text = "answer"

    fake_engine = AsyncMock()

    async def fake_get_node(node_id):
        return {"created_at": 9000}

    fake_engine.get_node = fake_get_node

    with patch("backend.cognee_client.cognee.recall", AsyncMock(return_value=[chunk])), \
         patch("backend.cognee_client.get_graph_engine", AsyncMock(return_value=fake_engine)):
        result = await cognee_client.query("what auth method?", as_of_ms=1000)

    assert result["answer"] == "no memory yet at this time"
    assert result["cited_data_ids"] == []
