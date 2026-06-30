import cognee
from cognee import enable_tracing, get_last_trace, get_all_traces, clear_traces
from dotenv import load_dotenv

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

    return {
        "answer": answer,
        "raw_count": len(results),
        "trace": trace,
    }


async def forget(dataset: str) -> dict:
    before_trace = _trace_summary()

    # Targeted deletion only. Never call cognee.prune here, it nukes
    # the whole system instead of one dataset.
    await cognee.forget(dataset=dataset)
    clear_traces()

    return {
        "status": "ok",
        "dataset": dataset,
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
