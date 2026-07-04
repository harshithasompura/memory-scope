from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_forget_preview_with_data_id_returns_blast_radius():
    fake_blast_radius = {"count": 3, "most_recent": "2026-06-30T12:00:00+00:00", "avg_confidence": 0.75}
    with patch(
        "backend.routes.forget_preview.blast_radius", return_value=fake_blast_radius
    ) as mock_blast_radius:
        resp = client.get("/forget/preview", params={"dataset": "engineering_decisions", "data_id": "d1"})

    assert resp.status_code == 200
    assert resp.json() == {
        "data_id": "d1",
        "dataset": "engineering_decisions",
        "count": 3,
        "most_recent": "2026-06-30T12:00:00+00:00",
        "avg_confidence": 0.75,
    }
    mock_blast_radius.assert_called_once_with("d1")


def test_forget_preview_without_data_id_returns_document_count():
    fake_documents = [
        {"id": "doc-1", "name": "a.md", "created_at": "2026-06-30T00:00:00Z", "stale": False, "contradiction": False},
        {"id": "doc-2", "name": "b.md", "created_at": "2026-06-30T00:00:00Z", "stale": True, "contradiction": False},
    ]
    with patch(
        "backend.routes.forget_preview.list_documents", AsyncMock(return_value=fake_documents)
    ) as mock_list_documents:
        resp = client.get("/forget/preview", params={"dataset": "engineering_decisions"})

    assert resp.status_code == 200
    assert resp.json() == {"dataset": "engineering_decisions", "document_count": 2}
    mock_list_documents.assert_called_once_with("engineering_decisions")
