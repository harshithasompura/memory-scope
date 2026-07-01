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


def test_dataset_documents_route_returns_list_with_stale_flags():
    fake_documents = [
        {"id": "doc-old", "name": "session-auth.md", "created_at": "2026-06-01T00:00:00Z", "stale": True},
        {"id": "doc-new", "name": "oauth.md", "created_at": "2026-06-30T23:00:00Z", "stale": False},
    ]
    with patch("backend.routes.datasets.list_documents", return_value=fake_documents):
        resp = client.get("/datasets/engineering_decisions/documents")
    assert resp.status_code == 200
    assert resp.json() == fake_documents
