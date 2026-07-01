from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend import cognee_client, contradiction_log


@pytest.fixture(autouse=True)
def isolated_contradiction_db(tmp_path, monkeypatch):
    monkeypatch.setattr(contradiction_log, "DB_PATH", tmp_path / "test.db")


def _fake_data_item(item_id: str, name: str, created_at: datetime):
    item = MagicMock(id=item_id, created_at=created_at)
    item.name = name  # MagicMock(name=...) sets the mock's repr, not an attribute — set separately
    return item


@pytest.mark.asyncio
async def test_list_documents_flags_stale_and_fresh_docs():
    now = datetime.now(timezone.utc)
    old_doc = _fake_data_item("doc-old", "session-auth.md", now - timedelta(hours=2))
    new_doc = _fake_data_item("doc-new", "oauth.md", now - timedelta(minutes=5))

    fake_dataset = MagicMock(id="ds-1")
    fake_dataset.name = "engineering_decisions"

    with patch(
        "backend.cognee_client.cognee.datasets.list_datasets", AsyncMock(return_value=[fake_dataset])
    ), patch(
        "backend.cognee_client.cognee.datasets.list_data", AsyncMock(return_value=[old_doc, new_doc])
    ):
        result = await cognee_client.list_documents("engineering_decisions")

    by_id = {d["id"]: d for d in result}
    assert by_id["doc-old"]["stale"] is True
    assert by_id["doc-new"]["stale"] is False


@pytest.mark.asyncio
async def test_list_documents_returns_empty_for_unknown_dataset():
    with patch("backend.cognee_client.cognee.datasets.list_datasets", AsyncMock(return_value=[])):
        result = await cognee_client.list_documents("nonexistent")
    assert result == []


@pytest.mark.asyncio
async def test_list_documents_flags_contradiction_from_contradiction_log():
    now = datetime.now(timezone.utc)
    flagged_doc = _fake_data_item("doc-flagged", "session-auth.md", now - timedelta(minutes=5))
    clean_doc = _fake_data_item("doc-clean", "oauth.md", now - timedelta(minutes=5))

    fake_dataset = MagicMock(id="ds-1")
    fake_dataset.name = "engineering_decisions"

    with patch(
        "backend.cognee_client.cognee.datasets.list_datasets", AsyncMock(return_value=[fake_dataset])
    ), patch(
        "backend.cognee_client.cognee.datasets.list_data",
        AsyncMock(return_value=[flagged_doc, clean_doc]),
    ), patch(
        "backend.cognee_client.contradiction_log.is_flagged",
        side_effect=lambda data_id: data_id == "doc-flagged",
    ):
        result = await cognee_client.list_documents("engineering_decisions")

    by_id = {d["id"]: d for d in result}
    assert by_id["doc-flagged"]["contradiction"] is True
    assert by_id["doc-clean"]["contradiction"] is False
