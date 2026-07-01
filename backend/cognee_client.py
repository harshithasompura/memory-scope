from uuid import UUID
from datetime import datetime, timedelta, timezone
import re

import cognee
import httpx
from cognee import enable_tracing, get_last_trace, get_all_traces, clear_traces
from cognee.modules.search.types import SearchType
from cognee.infrastructure.databases.graph import get_graph_engine
from dotenv import load_dotenv

from backend import recommendation_log

load_dotenv()

enable_tracing()

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


async def _graph_counts() -> dict:
    graph_engine = await get_graph_engine()
    metrics = await graph_engine.get_graph_metrics()
    return {"num_nodes": metrics["num_nodes"], "num_edges": metrics["num_edges"]}


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


async def ingest_github(url: str, dataset: str) -> dict:
    match = re.match(r"https://github\.com/([^/]+)/([^/]+)/(?:issues|pull)/(\d+)", url)
    if not match:
        raise ValueError(f"not a GitHub issue/PR URL: {url}")
    owner, repo, number = match.groups()
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

    results = await cognee.recall(question)
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
        }
        for item in items
    ]


async def get_graph_html(dataset: str = "engineering_decisions") -> str:
    try:
        html = await cognee.visualize_graph(dataset=dataset)
        return html if html else "<p>Graph empty. Ingest data first.</p>"
    except Exception as e:
        return f"<p>Graph unavailable: {e}</p>"
