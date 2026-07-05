from uuid import UUID, uuid4
from datetime import datetime, timedelta, timezone
import os
import re

import anthropic
import cognee
import httpx
from cognee import enable_tracing, get_last_trace, get_all_traces, clear_traces
from cognee.modules.search.types import SearchType
from cognee.infrastructure.databases.graph import get_graph_engine
from dotenv import load_dotenv

from backend import contradiction_log, recommendation_log

load_dotenv()

enable_tracing()


def _parse_verdict(text: str) -> tuple[bool, str]:
    first_line, _, rest = text.strip().partition("\n")
    contradicts = first_line.strip().lower().startswith("yes")
    reason = rest.strip() or first_line.strip()
    return contradicts, reason


async def _judge_contradiction(existing_answer: str, new_claim: str) -> tuple[bool, str]:
    client = anthropic.Anthropic(api_key=os.environ["LLM_API_KEY"])
    prompt = (
        "You audit an engineering decision memory. Does the NEW CLAIM "
        "supersede or conflict with the EXISTING ANSWER — would acting on "
        "the existing answer today be a mistake? Reply with exactly two "
        "lines and nothing else. First line: the single word yes or no. "
        "Second line: one short sentence of reasoning.\n\n"
        f"EXISTING ANSWER:\n{existing_answer}\n\nNEW CLAIM:\n{new_claim}"
    )
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=100,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_verdict(response.content[0].text)

# ponytail: flat 1-hour cutoff so staleness is visible within a single demo
# session. A real product would decay per doc type (half-life scoring, see
# cognee issue #3700) instead of one global threshold.
STALE_THRESHOLD = timedelta(hours=1)


def _is_stale(created_at: datetime, now: datetime) -> bool:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return (now - created_at) > STALE_THRESHOLD


def _trace_summary() -> dict:
    trace = get_last_trace()
    if trace is None:
        return {"operation": None, "duration_ms": 0, "breakdown": {}, "errors": []}
    summary = trace.summary()
    return {
        "operation": summary.get("operation"),
        "duration_ms": summary.get("duration_ms", 0),
        "breakdown": summary.get("breakdown", {}),
        "errors": summary.get("errors", []),
    }


async def _graph_counts(dataset: str | None = None) -> dict:
    # Bare engine metrics reflect whatever dataset context is active on this
    # process — on a fresh process that's an empty graph, so before/after
    # deltas lie (e.g. forget appearing to ADD nodes). Scope to the dataset
    # whenever the caller knows it, same pattern as get_graph_data below.
    if dataset is not None:
        from cognee.modules.data.methods import get_authorized_existing_datasets
        from cognee.modules.users.methods import get_default_user
        from cognee.context_global_variables import set_database_global_context_variables

        user = await get_default_user()
        matches = await get_authorized_existing_datasets([dataset], "read", user)
        if not matches:
            return {"num_nodes": 0, "num_edges": 0}
        async with set_database_global_context_variables(matches[0].id, matches[0].owner_id):
            graph_engine = await get_graph_engine()
            metrics = await graph_engine.get_graph_metrics()
            return {"num_nodes": metrics["num_nodes"], "num_edges": metrics["num_edges"]}

    graph_engine = await get_graph_engine()
    metrics = await graph_engine.get_graph_metrics()
    return {"num_nodes": metrics["num_nodes"], "num_edges": metrics["num_edges"]}


async def _check_contradiction(text: str, counts_before: dict) -> dict | None:
    # Skip on an empty graph — recall() has nothing to compare against yet,
    # and its behavior on a dataset with zero nodes is undefined.
    if counts_before["num_nodes"] == 0:
        return None

    claim = text[:300]
    chunk_results = await cognee.recall(claim, query_type=SearchType.CHUNKS, top_k=1)
    if not chunk_results:
        return None

    r = chunk_results[0]
    metadata = r.metadata if hasattr(r, "metadata") else r.get("metadata", {})
    old_data_id = metadata.get("data_id")
    if not old_data_id:
        return None

    contradicts, reason = await _judge_contradiction(_chunk_text(r), claim)
    if not contradicts:
        return None

    contradiction_log.flag(old_data_id, reason)
    return {"data_id": old_data_id, "reason": reason}


async def ingest(text: str, dataset: str) -> dict:
    counts_before = await _graph_counts(dataset)
    contradiction = await _check_contradiction(text, counts_before)
    await cognee.add(text, dataset_name=dataset)
    await cognee.cognify()
    counts_after = await _graph_counts(dataset)
    return {
        "status": "ok",
        "dataset": dataset,
        "trace": _trace_summary(),
        "counts_before": counts_before,
        "counts_after": counts_after,
        "contradiction": contradiction,
    }


async def ingest_github(url: str, dataset: str) -> dict:
    match = re.match(r"https://github\.com/([^/]+)/([^/]+)/(?:issues|pull)/(\d+)", url)
    if not match:
        raise ValueError(f"not a GitHub issue/PR URL: {url}")
    owner, repo, number = match.groups()
    api_base = f"https://api.github.com/repos/{owner}/{repo}/issues/{number}"
    # Anonymous GitHub API is capped at 60 req/hr and 403s under demo load.
    # A token (GITHUB_TOKEN) lifts it to 5000/hr. Optional: works without one.
    headers = {}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient() as client:
        issue_resp = await client.get(api_base, headers=headers)
        issue_resp.raise_for_status()
        issue = issue_resp.json()

        comments_resp = await client.get(f"{api_base}/comments", headers=headers)
        comments_resp.raise_for_status()
        comments = comments_resp.json()

    parts = [issue.get("title", ""), issue.get("body") or ""]
    parts.extend(c.get("body", "") for c in comments)
    text = "\n\n".join(p for p in parts if p)

    return await ingest(text, dataset)


async def _created_at_ms(data_id: str) -> int | None:
    graph_engine = await get_graph_engine()
    node = await graph_engine.get_node(data_id)
    if node is None:
        return None
    return node["created_at"] if isinstance(node, dict) else node.created_at


def _chunk_text(r) -> str:
    return r.text if hasattr(r, "text") else r.get("text", str(r))


async def query(question: str, as_of_ms: int | None = None) -> dict:
    # CHUNKS first: vector search only, populates real chunk_id/data_id
    # metadata. Must run before the GRAPH_COMPLETION call below — asking
    # cognee near-identical questions back-to-back triggers an internal
    # dedup ("you already asked this") that returns a canned stub instead
    # of real results for whichever call goes second. GRAPH_COMPLETION
    # going second is unaffected since it answers from the graph, not
    # from chunk text, so the ordering only matters for CHUNKS.
    chunk_results = await cognee.recall(question, query_type=SearchType.CHUNKS, top_k=5)

    if as_of_ms is not None:
        # No native way to scope GRAPH_COMPLETION to a point in time, so
        # as-of answers come from the CHUNKS results directly instead.
        for r in chunk_results:
            metadata = r.metadata if hasattr(r, "metadata") else r.get("metadata", {})
            data_id = metadata.get("data_id")
            if not data_id:
                continue
            created_at = await _created_at_ms(data_id)
            if created_at is not None and created_at <= as_of_ms:
                log_id = recommendation_log.record(
                    question=question,
                    answer_text=_chunk_text(r),
                    cited_chunk_ids=[metadata.get("chunk_id")] if metadata.get("chunk_id") else [],
                    cited_data_ids=[data_id],
                )
                return {
                    "answer": _chunk_text(r),
                    "cited_chunk_ids": [metadata.get("chunk_id")] if metadata.get("chunk_id") else [],
                    "cited_data_ids": [data_id],
                    "as_of_ms": as_of_ms,
                    "log_id": log_id,
                    "trace": _trace_summary(),
                }
        return {
            "answer": "no memory yet at this time",
            "cited_chunk_ids": [],
            "cited_data_ids": [],
            "as_of_ms": as_of_ms,
            "trace": _trace_summary(),
        }

    cited_chunk_ids = []
    cited_data_ids = []
    for r in chunk_results:
        metadata = r.metadata if hasattr(r, "metadata") else r.get("metadata", {})
        if metadata.get("chunk_id"):
            cited_chunk_ids.append(metadata["chunk_id"])
        if metadata.get("data_id"):
            cited_data_ids.append(metadata["data_id"])

    # Unique session per ask. Under a shared session (cognee's default),
    # re-asking a question the session already answered makes the LLM reply
    # "Acknowledged..." to its own prior answer instead of answering fresh —
    # which broke the whole re-ask → resolve loop.
    session_id = f"ask-{uuid4().hex[:12]}"
    results = await cognee.recall(question, session_id=session_id)
    trace = _trace_summary()

    if not results:
        return {
            "answer": "No results found in memory graph.",
            "trace": trace,
        }

    if isinstance(results[0], dict):
        answer = results[0].get("text", str(results[0]))
    else:
        answer = getattr(results[0], "text", str(results[0]))

    log_id = recommendation_log.record(
        question=question,
        answer_text=answer,
        cited_chunk_ids=cited_chunk_ids,
        cited_data_ids=cited_data_ids,
        session_id=session_id,
    )

    return {
        "answer": answer,
        "raw_count": len(results),
        "cited_chunk_ids": cited_chunk_ids,
        "cited_data_ids": cited_data_ids,
        "trace": trace,
        "log_id": log_id,
    }


async def forget(dataset: str, data_id: str | None = None) -> dict:
    before_trace = _trace_summary()
    counts_before = await _graph_counts(dataset)

    # Targeted deletion only. Never call cognee.prune here, it nukes
    # the whole system instead of one dataset.
    if data_id:
        await cognee.forget(data_id=UUID(data_id), dataset=dataset)
    else:
        await cognee.forget(dataset=dataset)
    clear_traces()

    counts_after = await _graph_counts(dataset)

    flagged_count = 0
    blast_radius = {"count": 0, "most_recent": None, "avg_confidence": 0.0}
    if data_id:
        blast_radius = recommendation_log.blast_radius(data_id)
        flagged_count = recommendation_log.flag_suspect_by_data_id(data_id)

    return {
        "status": "ok",
        "dataset": dataset,
        "data_id": data_id,
        "flagged_count": flagged_count,
        "blast_radius": blast_radius,
        "trace_before": before_trace,
        "counts_before": counts_before,
        "counts_after": counts_after,
    }


async def improve(dataset: str) -> dict:
    counts_before = await _graph_counts(dataset)
    # Bridge the Q&A sessions this app logged into the permanent graph
    # (feedback weights + session persistence + distillation). Without
    # session_ids, cognee.improve only re-indexes triplet embeddings —
    # no node/edge change, which reads as a silent no-op in the UI.
    session_ids = recommendation_log.recent_session_ids()
    await cognee.improve(dataset=dataset, session_ids=session_ids or None)
    counts_after = await _graph_counts(dataset)
    return {
        "status": "ok",
        "dataset": dataset,
        "sessions_bridged": session_ids,
        "trace": _trace_summary(),
        "counts_before": counts_before,
        "counts_after": counts_after,
    }


async def purge_default_session(dataset: str) -> bool:
    """Delete the shared 'default_session' QA cache and its vectors.

    Queries recorded before per-ask sessions all wrote Q&A into
    default_session, and CHUNKS recall (which passes no session) resolves to
    default_session — so a stale cached answer outranks real chunks whenever
    the exact same question is asked again, breaking citations and re-ask."""
    from cognee.infrastructure.session.get_session_manager import get_session_manager
    from cognee.modules.data.methods import get_authorized_existing_datasets
    from cognee.modules.users.methods import get_default_user
    from cognee.context_global_variables import set_database_global_context_variables

    user = await get_default_user()
    matches = await get_authorized_existing_datasets([dataset], "read", user)
    if not matches:
        return False
    async with set_database_global_context_variables(matches[0].id, matches[0].owner_id):
        sm = get_session_manager()
        return await sm.delete_session(user_id=str(user.id), session_id="default_session")


async def list_traces() -> list[dict]:
    traces = get_all_traces()
    return [t.summary() for t in traces]


async def list_datasets() -> list[dict]:
    return await cognee.datasets.list_datasets()


async def list_documents(dataset: str) -> list[dict]:
    all_datasets = await cognee.datasets.list_datasets()
    match = next((d for d in all_datasets if d.name == dataset), None)
    if match is None:
        return []

    items = await cognee.datasets.list_data(match.id)
    now = datetime.now(timezone.utc)
    return [
        {
            "id": str(item.id),
            "name": item.name,
            "created_at": item.created_at.isoformat(),
            "stale": _is_stale(item.created_at, now),
            "contradiction": contradiction_log.is_flagged(str(item.id)),
        }
        for item in items
    ]


async def get_graph_html(dataset: str = "engineering_decisions") -> str:
    try:
        html = await cognee.visualize_graph(dataset=dataset)
        return html if html else "<p>Graph empty. Ingest data first.</p>"
    except Exception as e:
        return f"<p>Graph unavailable: {e}</p>"


_KIND_MAP = {
    "TextDocument": "document",
    "DocumentChunk": "chunk",
    "TextSummary": "summary",
    "EntityType": "type",
    "Entity": "entity",
}


async def get_graph_data(dataset: str = "engineering_decisions") -> dict:
    """Extract raw nodes/edges for the dataset, shaped for a custom force-graph
    render. Uses the same dataset-scoping context as cognee.visualize_graph so
    multi-tenant graphs resolve to the owning user (a bare get_graph_data() call
    outside this context sees an empty graph)."""
    from cognee.modules.data.methods import get_authorized_existing_datasets
    from cognee.modules.users.methods import get_default_user
    from cognee.context_global_variables import set_database_global_context_variables

    user = await get_default_user()
    datasets = await get_authorized_existing_datasets([dataset], "read", user)
    if not datasets:
        return {"nodes": [], "edges": [], "suspect_ids": []}

    async with set_database_global_context_variables(datasets[0].id, datasets[0].owner_id):
        engine = await get_graph_engine()
        raw_nodes, raw_edges = await engine.get_graph_data()

    nodes = []
    for nid, props in raw_nodes:
        ntype = props.get("type") or "Entity"
        label = props.get("name") or (props.get("text") or "")[:40] or ntype
        nodes.append(
            {
                "id": str(nid),
                "label": label,
                "kind": _KIND_MAP.get(ntype, "entity"),
                "truth": props.get("truth_alignment"),
            }
        )
    edges = [
        {"source": str(s), "target": str(t), "label": rel}
        for (s, t, rel, *_rest) in raw_edges
    ]
    return {
        "nodes": nodes,
        "edges": edges,
        "suspect_ids": recommendation_log.suspect_data_ids(),
    }
