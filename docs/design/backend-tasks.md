# Backend Tasks: Frontend Prerequisites

**Goal:** Build the 5 backend changes `docs/design/frontend-design.md` (Backend changes required, lines 116-149) marks as blocking before frontend work starts.

**Architecture:** Each new route is a thin FastAPI router (same pattern as existing `backend/routes/*.py`) calling a new function in `backend/cognee_client.py`. Graph-count tracking is a shared helper reused by `ingest`/`forget`/`improve`. No new files outside `backend/routes/` and `backend/cognee_client.py`.

**Tech Stack:** FastAPI, Pydantic, cognee 1.2.2 (direct/local SDK), httpx (new dependency), pytest for backend tests.

## Global Constraints

- Do not fake or stub any lifecycle op — every route must call the real `cognee` SDK function (CLAUDE.md).
- `forget()` targeted-deletion path must keep using `cognee.forget(data_id=UUID(...), dataset=...)` — never `cognee.prune` (see `backend/cognee_client.py:89-94` comment).
- Dataset default stays `"engineering_decisions"` as fallback wherever a dataset param is optional (matches existing routes).
- All new routes follow the existing try/except → `HTTPException(status_code=500, detail=str(e))` pattern used in every file under `backend/routes/`.

## Status check before starting

CORS is already implemented at `backend/app.py:11-16` (`CORSMiddleware`, `allow_origins=["*"]`). The frontend-design.md item #3 ("CORS — confirm CORSMiddleware is enabled") is **already satisfied**. No task needed; this plan covers items #1, #2, #5, #6 (`/logs`, graph counts, `/ingest/github`, `/datasets`). Item #4 (`VITE_API_BASE_URL` / dev proxy) is frontend-side config, out of scope for this backend plan.

---

### Task 1: `GET /logs` route

**Files:**
- Create: `backend/routes/logs.py`
- Modify: `backend/app.py` (register router)
- Test: `backend/tests/test_logs_route.py`

**Interfaces:**
- Consumes: `backend.recommendation_log.list_all() -> list[dict]` (already exists, `backend/recommendation_log.py:44-55`)
- Produces: `GET /logs` → `200` with JSON list of recommendation dicts (same shape as `recommendation_log.list_all()` return value: `id, timestamp, question, answer_text, cited_chunk_ids, cited_data_ids, suspect`)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_logs_route.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_logs_route.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'backend.routes.logs'` (or import error from `backend.app`, since route isn't registered yet)

- [ ] **Step 3: Write minimal implementation**

```python
# backend/routes/logs.py
from fastapi import APIRouter, HTTPException
from backend.recommendation_log import list_all

router = APIRouter()


@router.get("/logs")
async def logs_route():
    try:
        return list_all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Modify `backend/app.py`:

```python
from backend.routes import ingest, query, forget, graph, traces, improve, logs
```

and after `app.include_router(improve.router)` add:

```python
app.include_router(logs.router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_logs_route.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routes/logs.py backend/app.py backend/tests/test_logs_route.py
git commit -m "feat: add GET /logs route for recommendation history"
```

---

### Task 2: Graph node/edge count helper + wire into ingest/forget/improve

**Files:**
- Modify: `backend/cognee_client.py:28-117`
- Test: `backend/tests/test_graph_counts.py`

**Interfaces:**
- Consumes: `cognee.infrastructure.databases.graph.get_graph_engine` (corrected from an earlier draft that named `cognee.modules.engine.utils` — that path does not exist in installed cognee 1.2.2, verified live during Task 2 review): `graph_engine = await get_graph_engine(); metrics = await graph_engine.get_graph_metrics()`
- Produces: `backend.cognee_client._graph_counts() -> dict` with keys `num_nodes: int`, `num_edges: int`. `ingest()` response gains `counts_before`/`counts_after` keys; `forget()` response gains `counts_before`/`counts_after`; `improve()` response gains `counts_before`/`counts_after`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_graph_counts.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_graph_counts.py -v`
Expected: FAIL — `ImportError: cannot import name '_graph_counts' from 'backend.cognee_client'`

- [ ] **Step 3: Write minimal implementation**

In `backend/cognee_client.py`, add import near the top (after the `cognee` import block, line 1-6):

```python
from cognee.infrastructure.databases.graph import get_graph_engine
```

Add helper after `_trace_summary()` (after line 25):

```python
async def _graph_counts() -> dict:
    graph_engine = await get_graph_engine()
    metrics = await graph_engine.get_graph_metrics()
    return {"num_nodes": metrics["num_nodes"], "num_edges": metrics["num_edges"]}
```

Update `ingest()` (lines 28-35):

```python
async def ingest(text: str, dataset: str) -> dict:
    counts_before = await _graph_counts()
    await cognee.add(text, dataset_name=dataset)
    await cognee.cognify()
    counts_after = await _graph_counts()
    return {
        "status": "ok",
        "dataset": dataset,
        "trace": _trace_summary(),
        "counts_before": counts_before,
        "counts_after": counts_after,
    }
```

Update `forget()` (lines 86-107):

```python
async def forget(dataset: str, data_id: str | None = None) -> dict:
    before_trace = _trace_summary()
    counts_before = await _graph_counts()

    # Targeted deletion only. Never call cognee.prune here, it nukes
    # the whole system instead of one dataset.
    if data_id:
        await cognee.forget(data_id=UUID(data_id), dataset=dataset)
    else:
        await cognee.forget(dataset=dataset)
    clear_traces()

    counts_after = await _graph_counts()

    flagged_count = 0
    if data_id:
        flagged_count = recommendation_log.flag_suspect_by_data_id(data_id)

    return {
        "status": "ok",
        "dataset": dataset,
        "data_id": data_id,
        "flagged_count": flagged_count,
        "trace_before": before_trace,
        "counts_before": counts_before,
        "counts_after": counts_after,
    }
```

Update `improve()` (lines 110-116):

```python
async def improve(dataset: str) -> dict:
    counts_before = await _graph_counts()
    await cognee.improve(dataset=dataset)
    counts_after = await _graph_counts()
    return {
        "status": "ok",
        "dataset": dataset,
        "trace": _trace_summary(),
        "counts_before": counts_before,
        "counts_after": counts_after,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_graph_counts.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/cognee_client.py backend/tests/test_graph_counts.py
git commit -m "feat: add graph node/edge count deltas to ingest/forget/improve"
```

---

### Task 3: `httpx` dependency + `POST /ingest/github` route

**Files:**
- Modify: `requirements.txt`
- Modify: `backend/cognee_client.py` (add `ingest_github`)
- Create: `backend/routes/ingest_github.py`
- Modify: `backend/app.py` (register router)
- Test: `backend/tests/test_ingest_github.py`

**Interfaces:**
- Consumes: `backend.cognee_client.ingest(text: str, dataset: str) -> dict` (existing, Task 2 updates its return shape but not its signature)
- Produces: `backend.cognee_client.ingest_github(url: str, dataset: str) -> dict` (parses GitHub issue/PR URL, fetches via GitHub REST API, calls `ingest()`); `POST /ingest/github` route accepting `{url: str, dataset: str = "engineering_decisions"}`

- [ ] **Step 1: Add httpx to requirements.txt**

```
fastapi
uvicorn[standard]
cognee[tracing]
python-dotenv
anthropic
transformers
httpx
```

Run: `pip show httpx` after `pip install -r requirements.txt` to confirm it lands (it was not present as a direct or transitive dependency in this environment as of 2026-06-30 — `ModuleNotFoundError: No module named 'httpx'` before this change).

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_ingest_github.py
import pytest
import httpx
from unittest.mock import AsyncMock, patch

from backend.cognee_client import ingest_github, parse_github_issue_url


def test_parse_github_issue_url():
    owner, repo, number = parse_github_issue_url(
        "https://github.com/anthropics/claude-code/issues/42"
    )
    assert (owner, repo, number) == ("anthropics", "claude-code", 42)


def test_parse_github_pull_url():
    owner, repo, number = parse_github_issue_url(
        "https://github.com/anthropics/claude-code/pull/7"
    )
    assert (owner, repo, number) == ("anthropics", "claude-code", 7)


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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest backend/tests/test_ingest_github.py -v`
Expected: FAIL — `ImportError: cannot import name 'ingest_github' from 'backend.cognee_client'`

- [ ] **Step 4: Write minimal implementation**

In `backend/cognee_client.py`, add import (top of file, alongside existing imports):

```python
import re
import httpx
```

Add after `ingest()` (after line 35, before `query()`):

```python
def parse_github_issue_url(url: str) -> tuple[str, str, int]:
    match = re.match(r"https://github\.com/([^/]+)/([^/]+)/(?:issues|pull)/(\d+)", url)
    if not match:
        raise ValueError(f"not a GitHub issue/PR URL: {url}")
    owner, repo, number = match.groups()
    return owner, repo, int(number)


async def ingest_github(url: str, dataset: str) -> dict:
    owner, repo, number = parse_github_issue_url(url)
    api_base = f"https://api.github.com/repos/{owner}/{repo}/issues/{number}"
    async with httpx.AsyncClient() as client:
        issue_resp = await client.get(api_base)
        issue_resp.raise_for_status()
        issue = issue_resp.json()

        comments_resp = await client.get(f"{api_base}/comments")
        comments_resp.raise_for_status()
        comments = comments_resp.json()

    parts = [issue.get("title", ""), issue.get("body") or ""]
    parts.extend(c.get("body", "") for c in comments)
    text = "\n\n".join(p for p in parts if p)

    return await ingest(text, dataset)
```

Create `backend/routes/ingest_github.py`:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.cognee_client import ingest_github

router = APIRouter()


class IngestGithubRequest(BaseModel):
    url: str
    dataset: str = "engineering_decisions"


@router.post("/ingest/github")
async def ingest_github_route(req: IngestGithubRequest):
    try:
        return await ingest_github(req.url, req.dataset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Modify `backend/app.py`:

```python
from backend.routes import ingest, query, forget, graph, traces, improve, logs, ingest_github
```

and add:

```python
app.include_router(ingest_github.router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest backend/tests/test_ingest_github.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add requirements.txt backend/cognee_client.py backend/routes/ingest_github.py backend/app.py backend/tests/test_ingest_github.py
git commit -m "feat: add POST /ingest/github route for GitHub issue/PR ingestion"
```

---

### Task 4: `GET /datasets` route

**Files:**
- Modify: `backend/cognee_client.py` (add `list_datasets`)
- Create: `backend/routes/datasets.py`
- Modify: `backend/app.py` (register router)
- Test: `backend/tests/test_datasets_route.py`

**Interfaces:**
- Consumes: `cognee.datasets.list_datasets()` (confirmed direct-mode call per spec line 143-146)
- Produces: `backend.cognee_client.list_datasets() -> list[dict]`; `GET /datasets` → `200` with that list

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_datasets_route.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_datasets_route.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'backend.routes.datasets'`

- [ ] **Step 3: Write minimal implementation**

In `backend/cognee_client.py`, add after `list_traces()`:

```python
async def list_datasets() -> list[dict]:
    return await cognee.datasets.list_datasets()
```

Create `backend/routes/datasets.py`:

```python
from fastapi import APIRouter, HTTPException
from backend.cognee_client import list_datasets

router = APIRouter()


@router.get("/datasets")
async def datasets_route():
    try:
        return await list_datasets()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Modify `backend/app.py`:

```python
from backend.routes import ingest, query, forget, graph, traces, improve, logs, ingest_github, datasets
```

and add:

```python
app.include_router(datasets.router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_datasets_route.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/cognee_client.py backend/routes/datasets.py backend/app.py backend/tests/test_datasets_route.py
git commit -m "feat: add GET /datasets route for dataset picker"
```

---

### Task 5: Full backend test suite + manual smoke check

**Files:**
- None created/modified — verification only.

**Interfaces:**
- Consumes: all routes registered in `backend/app.py` after Tasks 1-4.

- [ ] **Step 1: Run full backend test suite**

Run: `pytest backend/tests/ -v`
Expected: all tests PASS, including pre-existing tests plus `test_logs_route.py`, `test_graph_counts.py`, `test_ingest_github.py`, `test_datasets_route.py`

- [ ] **Step 2: Start the server and hit each new route manually**

Run: `uvicorn backend.app:app --reload` (separate terminal), then:

```bash
curl -s http://localhost:8000/logs
curl -s http://localhost:8000/datasets
curl -s -X POST http://localhost:8000/ingest -H "Content-Type: application/json" -d '{"text": "test doc", "dataset": "engineering_decisions"}'
```

Expected: `/logs` and `/datasets` return `200` with JSON arrays (empty arrays are fine if no data ingested yet); `/ingest` response now includes `counts_before` and `counts_after` keys.

- [ ] **Step 3: Commit (if any fixes were needed during smoke check)**

```bash
git add -A
git commit -m "fix: address issues found during backend smoke check"
```

(Skip this step if no fixes were needed.)
