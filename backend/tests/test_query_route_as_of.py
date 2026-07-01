from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from backend.app import app

client = TestClient(app)


def test_query_route_parses_as_of_iso_into_ms_epoch():
    fake_result = {"answer": "old answer", "cited_chunk_ids": [], "cited_data_ids": [], "as_of_ms": 1782864000000}
    with patch("backend.routes.query.query", AsyncMock(return_value=fake_result)) as mock_query:
        resp = client.post("/query", json={"question": "what auth?", "as_of": "2026-07-01T00:00:00Z"})

    assert resp.status_code == 200
    assert resp.json() == fake_result
    mock_query.assert_awaited_once()
    _, kwargs = mock_query.call_args
    assert kwargs["as_of_ms"] == 1782864000000


def test_query_route_rejects_invalid_as_of_format():
    resp = client.post("/query", json={"question": "what auth?", "as_of": "not-a-date"})
    assert resp.status_code == 400
