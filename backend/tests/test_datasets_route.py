from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.app import app

client = TestClient(app)


def test_datasets_route_returns_list_from_cognee_client():
    fake_datasets = [{"id": "abc", "name": "engineering_decisions", "created_at": "2026-06-30T00:00:00Z"}]
    with patch("backend.routes.datasets.list_datasets", return_value=fake_datasets):
        resp = client.get("/datasets")
    assert resp.status_code == 200
    assert resp.json() == fake_datasets
