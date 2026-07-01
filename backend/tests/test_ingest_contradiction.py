import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend import cognee_client


@pytest.mark.asyncio
async def test_ingest_skips_contradiction_check_on_empty_graph():
    counts = {"num_nodes": 0, "num_edges": 0}

    with patch("backend.cognee_client._graph_counts", AsyncMock(return_value=counts)), \
         patch("backend.cognee_client.cognee.add", AsyncMock()), \
         patch("backend.cognee_client.cognee.cognify", AsyncMock()), \
         patch("backend.cognee_client.cognee.recall", AsyncMock()) as recall_mock, \
         patch("backend.cognee_client.contradiction_log.flag") as flag_mock:
        result = await cognee_client.ingest("first doc ever", "engineering_decisions")

    recall_mock.assert_not_called()
    flag_mock.assert_not_called()
    assert result["contradiction"] is None


@pytest.mark.asyncio
async def test_ingest_flags_contradiction_when_judge_says_yes():
    counts = {"num_nodes": 10, "num_edges": 20}
    chunk = MagicMock()
    chunk.metadata = {"chunk_id": "c1", "data_id": "old-doc"}
    chunk.text = "we use HS256 for token signing"

    with patch("backend.cognee_client._graph_counts", AsyncMock(return_value=counts)), \
         patch("backend.cognee_client.cognee.add", AsyncMock()), \
         patch("backend.cognee_client.cognee.cognify", AsyncMock()), \
         patch("backend.cognee_client.cognee.recall", AsyncMock(return_value=[chunk])), \
         patch(
             "backend.cognee_client._judge_contradiction",
             AsyncMock(return_value=(True, "HS256 vs RS256 conflict")),
         ), \
         patch("backend.cognee_client.contradiction_log.flag") as flag_mock:
        result = await cognee_client.ingest("we now use RS256 for token signing", "engineering_decisions")

    flag_mock.assert_called_once_with("old-doc", "HS256 vs RS256 conflict")
    assert result["contradiction"] == {"data_id": "old-doc", "reason": "HS256 vs RS256 conflict"}


@pytest.mark.asyncio
async def test_ingest_does_not_flag_when_judge_says_no():
    counts = {"num_nodes": 10, "num_edges": 20}
    chunk = MagicMock()
    chunk.metadata = {"chunk_id": "c1", "data_id": "old-doc"}
    chunk.text = "we use OAuth for third-party auth"

    with patch("backend.cognee_client._graph_counts", AsyncMock(return_value=counts)), \
         patch("backend.cognee_client.cognee.add", AsyncMock()), \
         patch("backend.cognee_client.cognee.cognify", AsyncMock()), \
         patch("backend.cognee_client.cognee.recall", AsyncMock(return_value=[chunk])), \
         patch(
             "backend.cognee_client._judge_contradiction",
             AsyncMock(return_value=(False, "refinement, not a conflict")),
         ), \
         patch("backend.cognee_client.contradiction_log.flag") as flag_mock:
        result = await cognee_client.ingest("we now also support refresh tokens via OAuth", "engineering_decisions")

    flag_mock.assert_not_called()
    assert result["contradiction"] is None
