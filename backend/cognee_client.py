from uuid import UUID
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


async def query(question: str) -> dict:
    # CHUNKS first: vector search only, populates real chunk_id/data_id
    # metadata. Must run before the GRAPH_COMPLETION call below — asking
    # cognee near-identical questions back-to-back triggers an internal
    # dedup ("you already asked this") that returns a canned stub instead
    # of real results for whichever call goes second. GRAPH_COMPLETION
    # going second is unaffected since it answers from the graph, not
    # from chunk text, so the ordering only matters for CHUNKS.
    chunk_results = await cognee.recall(question, query_type=SearchType.CHUNKS, top_k=5)
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

    recommendation_log.record(
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


async def get_graph_html() -> str:
    try:
        html = await cognee.visualize_graph()
        return html if html else "<p>Graph empty. Ingest data first.</p>"
    except Exception as e:
        return f"<p>Graph unavailable: {e}</p>"
