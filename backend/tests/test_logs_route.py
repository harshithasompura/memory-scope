from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.app import app

client = TestClient(app)


def test_logs_route_returns_list_from_recommendation_log():
    fake_rows = [
        {
            "id": 1,
            "timestamp": "2026-06-30T00:00:00+00:00",
            "question": "what is ADR-001?",
            "answer_text": "Server-side sessions.",
            "cited_chunk_ids": ["c1"],
            "cited_data_ids": ["d1"],
            "suspect": False,
        }
    ]
    with patch("backend.routes.logs.list_all", return_value=fake_rows):
        resp = client.get("/logs")
    assert resp.status_code == 200
    assert resp.json() == fake_rows
