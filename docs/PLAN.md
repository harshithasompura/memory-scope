# MemoryScope: Spec

Cognee gives engineers persistent AI memory. MemoryScope makes that memory's
mistakes traceable when a remembered fact turns out wrong and gets
corrected, MemoryScope tells you which past recommendations relied on it and
are now suspect.

## Problem

AI coding assistants are starting to ship with persistent memory of past
incidents, postmortems, and architecture decisions. When a postmortem's
root-cause assumption is later found wrong and corrected, every past
recommendation that relied on the old (wrong) assumption is now suspect —
but nothing tracks this. This is the same problem dependency managers solve
for code (`npm audit`, breaking-change alerts) applied to AI memory instead.

## Mechanism (the real engineering piece)

A recommendation log, stored outside Cognee (SQLite), records every time the
app answers a question via `recall()`:

- timestamp
- question asked
- answer given
- which memory node IDs / source documents the answer cited

When `forget()` removes a document and `remember()` ingests its correction,
MemoryScope walks the recommendation log and flags every past entry that
cited the now-removed node as **suspect**. Re-asking the same question shows
the corrected answer.

This backward-trace index is MemoryScope's actual contribution — Cognee
does not provide "what depends on this fact" queries natively.

## Data source

A real GitHub repo's issues, PR discussions, and postmortem/ADR-style docs,
ingested as flat text via `remember()`. Ingestion is custom, pulling file/issue content and
feeding it in as text, same effort as the markdown-ADR approach already
proven to work.

Seed content: 3 previous docs tested already exist (session-auth -> JWT -> OAuth
supersession chain) and proved the forget() loop end to end (46->28 nodes,
84->50 edges, answer changes). These get extended with 1-2 postmortem docs
specifically about a technical recommendation (e.g. "use connection pattern
X because of incident Y") that later gets corrected. Also need to work on seeding GitHub Data.

## UI
Single-screen-per-tab, three tabs, no side-by-side panel overload:

- **Ask** (default): question input, current answer with its citation,
  a flat list of past recommendations below with suspect badges. Clicking
  a row expands inline to show what it cited and why it's suspect — no
  permanent side panel.
- **Memory Graph**: Cognee's `visualize_graph()` output, node inspector,
  search/zoom — reuse Cognee's built-in capability rather than rebuilding it.
- **Lifecycle**: where `forget()` / `remember()` / `improve()` are
  triggered, with before/after node/edge counts and confidence-score deltas
  shown as concrete numbers.

Visual tokens:
accent `#BC9AFF` (Cognee purple), font `system-ui`, light grey background,
monospace for code/citations.

## Stack

- Backend: Python + FastAPI + Cognee 1.2.2 (local SDK, Ladybug + LanceDB).
  LLM: Anthropic direct (`claude-haiku-4-5`). Embeddings: local Ollama
  (`nomic-embed-text`, 768 dims).
- Recommendation log: SQLite (stdlib `sqlite3`, no new dependency). Rejected
  Supabase — realtime/hosted Postgres is unneeded infra cost when a local
  poll-on-action refresh covers the UI's needs. Rejected storing the log
  inside Cognee itself (querying "which rows cite node X" is a SQL filter,
  not a knowledge-graph query — wrong tool).
- Frontend: React + Vite + TypeScript, plain `fetch` + `useState`/`useEffect`
  for data fetching (rejected TanStack Query — overkill for ~5 endpoints
  with no complex cache graph; native fetch covers it in code an order of
  magnitude smaller).

## Explicitly out of scope

- New verticals beyond this devtools/GitHub framing.
- Cognee features beyond remember/recall/improve/forget (no session_ids,
  multi-user access control, build_global_context_index).
- Deployment/hosting — local dev only.
- Multi-user auth.

## Open risk to verify before building further

Whether `recall()`'s returned metadata (`ResponseGraphEntry.metadata`,
`.score`) is populated richly enough in practice to extract *which specific
nodes* an answer cited, or whether citation must be approximated from
`source` and `text` content matching. This determines how precise the
suspect-flagging can be. Must be tested with real ingested data (not the
empty-metadata smoke test run earlier) before the recommendation-log schema
is finalized.

Look into Cloud integrations for Cognee once access is available later.
