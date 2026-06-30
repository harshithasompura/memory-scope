import pytest
import httpx
from unittest.mock import AsyncMock, patch

from backend.cognee_client import ingest_github


@pytest.mark.asyncio
async def test_ingest_github_fetches_and_ingests():
    fake_issue = {
        "title": "Bug: crash on startup",
        "body": "Steps to reproduce...",
    }
    fake_comments = [{"body": "I can reproduce this too."}]

    async def fake_get(self, url, *args, **kwargs):
        if url.endswith("/issues/42"):
            return httpx.Response(200, json=fake_issue, request=httpx.Request("GET", url))
        return httpx.Response(200, json=fake_comments, request=httpx.Request("GET", url))

    with patch("httpx.AsyncClient.get", new=fake_get):
        with patch("backend.cognee_client.ingest", new=AsyncMock(return_value={"status": "ok"})) as mock_ingest:
            result = await ingest_github(
                "https://github.com/anthropics/claude-code/issues/42", "engineering_decisions"
            )

    assert result == {"status": "ok"}
    mock_ingest.assert_awaited_once()
    text_arg = mock_ingest.await_args.args[0]
    assert "Bug: crash on startup" in text_arg
    assert "Steps to reproduce" in text_arg
    assert "I can reproduce this too." in text_arg


@pytest.mark.asyncio
async def test_ingest_github_rejects_non_github_url():
    with pytest.raises(ValueError):
        await ingest_github("https://example.com/not/a/github/url", "engineering_decisions")
