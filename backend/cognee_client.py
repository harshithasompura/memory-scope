import cognee
from cognee import enable_tracing, get_last_trace, get_all_traces, clear_traces
from cognee.modules.search.types import SearchType
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


async def ingest(text: str, dataset: str) -> dict:
    await cognee.add(text, dataset_name=dataset)
    await cognee.cognify()
    return {
        "status": "ok",
        "dataset": dataset,
        "trace": _trace_summary(),
    }


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

    # Targeted deletion only. Never call cognee.prune here, it nukes
    # the whole system instead of one dataset.
    if data_id:
        await cognee.forget(data_id=data_id, dataset=dataset)
    else:
        await cognee.forget(dataset=dataset)
    clear_traces()

    flagged_count = 0
    if data_id:
        flagged_count = recommendation_log.flag_suspect_by_data_id(data_id)

    return {
        "status": "ok",
        "dataset": dataset,
        "data_id": data_id,
        "flagged_count": flagged_count,
        "trace_before": before_trace,
    }


async def improve(dataset: str) -> dict:
    await cognee.improve(dataset=dataset)
    return {
        "status": "ok",
        "dataset": dataset,
        "trace": _trace_summary(),
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
