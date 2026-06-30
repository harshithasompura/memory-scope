import pytest
from unittest.mock import AsyncMock, patch

from backend.cognee_client import _graph_counts


@pytest.mark.asyncio
async def test_graph_counts_returns_node_and_edge_count():
    fake_engine = AsyncMock()
    fake_engine.get_graph_metrics = AsyncMock(return_value={"num_nodes": 7, "num_edges": 12})
    with patch("backend.cognee_client.get_graph_engine", AsyncMock(return_value=fake_engine)):
        result = await _graph_counts()
    assert result == {"num_nodes": 7, "num_edges": 12}
