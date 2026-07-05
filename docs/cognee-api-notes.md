# Cognee API Notes (1.2.2, local SDK)

Initial Testing Notes with Cognee 1.2.2, local SDK.

## Notes

1. Use `add()` + `cognify()` over `remember()` — more stable in 1.2.2.
2. `recall()` returns `list[ResponseGraphEntry]` — access `.text` for the answer string.
3. `forget(dataset="name")` for targeted deletion. Never expose `prune` in the API surface.
4. Node/edge counts come from log output: `ID-filtered retrieval: 46 nodes and 84 edges` - parse these, no other source for the numbers currently.
5. ~~`recall()` metadata unverified~~ **Resolved (Jul 5):** with real ingested docs, CHUNKS results carry `metadata.chunk_id`/`metadata.data_id`. Exception: results that are echoed session-QA entries (`SessionQAVector`) have `metadata == {}` — see note 9.
6. `visualize_graph()` returns an HTML string — embed in an iframe.
7. aiohttp unclosed-session warning is cosmetic, ignore.
8. Fresh test runs: call `prune_data()` + `prune_system(metadata=True)` first.
9. **Sessions (found Jul 5):** every `recall()` Q&A is cached per session; with no
   `session_id`, everything lands in `default_session`. Two consequences:
   (a) re-asking a question the session already answered makes the LLM reply
   "Acknowledged..." to itself instead of answering; (b) session QAs are embedded
   into `SessionQAVector` per dataset, and a CHUNKS recall for the *exact same
   question text* returns the cached QA (metadata `{}`) instead of real chunks.
   Fix used in `cognee_client.query()`: unique `session_id` per ask
   (`ask-<hex>`), and `purge_default_session()` clears the legacy cache
   (wired into `FRESH=1` seeding).
10. `improve(dataset)` without `session_ids` only re-indexes triplet embeddings —
    zero node/edge delta, looks like a no-op. Pass `session_ids=[...]` (we feed the
    per-ask session ids from the recommendation log) to bridge Q&A into the graph:
    feedback weights + persist + distill, with a real, visible count delta.
11. Graph engine metrics/context are dataset-scoped: `get_graph_metrics()` outside
    a dataset context (fresh process) sees an **empty graph** — counts must be read
    inside `set_database_global_context_variables(...)` (see `_graph_counts`).

## improve() signature (confirmed via `inspect.signature`, installed 1.2.2)

```python
improve(
    dataset: str | uuid.UUID = 'main_dataset',
    *,
    run_in_background: bool = False,
    node_name: List[str] | None = None,
    session_ids: List[str] | None = None,
    build_global_context_index: bool = False,
    build_truth_subspace: bool = False,
    **kwargs: Unpack[ImproveKwargs],
)
```
Source: `cognee/api/v1/improve/improve.py` in the installed package.

The self-improvement loop pattern:

1. Ingest skills as markdown files via `remember()`.
2. Run the agent, score the result yourself.
3. Record a `SkillRunEntry` with feedback.
4. Cognee returns a proposal.
5. Explicitly apply with `improve_skill(proposal_id, apply=True)`.

Known bug: `remember()` against the local backend may return a plain `dict`
instead of a `RememberResult` instance — read defensively from
`result["items"]` or `result.items`.
