# Cognee API Notes (1.2.2, local SDK)

Initial Testing Notes with Cognee 1.2.2, local SDK.

## Notes

1. Use `add()` + `cognify()` over `remember()` — more stable in 1.2.2.
2. `recall()` returns `list[ResponseGraphEntry]` — access `.text` for the answer string.
3. `forget(dataset="name")` for targeted deletion. Never expose `prune` in the API surface.
4. Node/edge counts come from log output: `ID-filtered retrieval: 46 nodes and 84 edges` - parse these, no other source for the numbers currently.
5. `recall()` `.score` is `None`, `.metadata` is `{}` on the initial smoke-test data tried so far — **unverified whether this holds with richer ingested data**. Must retest before relying on metadata for the recommendation-log citation feature (open risk section, need to flag in Plan.md).
6. `visualize_graph()` returns an HTML string — embed in an iframe.
7. aiohttp unclosed-session warning is cosmetic, ignore.
8. Fresh test runs: call `prune_data()` + `prune_system(metadata=True)` first.

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
