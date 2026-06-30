# MemoryScope Frontend: Design

## Stack

React + Vite + TypeScript, react-router (real routes per tab), Tailwind CSS
(styling only, theme tokens from CLAUDE.md/PLAN.md), Vitest + React Testing
Library for tests. Package manager: pnpm. No TanStack Query, no global state
library, no animation library, no component-library deps (shadcn etc).

## Structure

```
frontend/
  src/
    App.tsx                    # router shell + Layout, ~routes only
    api.ts                     # fetch wrappers for all backend endpoints
    types.ts                   # response/request types shared across pages
    hooks/
      useAsync.ts               # generic useReducer hook: idle/loading/success/error
    components/
      Layout.tsx                 # nav (3 tabs) + page frame
      Card.tsx                   # bordered container
      Button.tsx                 # primary/secondary, spinner state
      Spinner.tsx                 # shared loading indicator (Tailwind animate-spin)
      Badge.tsx                    # suspect status pill
      ErrorState.tsx                # inline error banner
      RecommendationRow.tsx          # one log entry, click-to-expand
      # TraceSummary/CountDelta NOT extracted yet — inline JSX in the
      # pages that use them (AskPage, LifecyclePage) until a second
      # distinct rendering need shows up. Extract then, not before.
    pages/
      AskPage.tsx                      # question form + answer + log list
      GraphPage.tsx                      # iframe srcDoc graph viewer
      LifecyclePage.tsx                   # forget/remember/improve forms
  index.css                              # tailwind import + theme tokens
  tailwind.config.ts
  vite.config.ts                          # dev proxy to backend, or VITE_API_BASE_URL
  pnpm-lock.yaml
```

Pages compose shared components; logic lives in `useAsync` + `api.ts`, not
in page bodies. No global Context — pages don't share state (Ask's log list
is not needed in Lifecycle; doing a forget/remember in Lifecycle does NOT
auto-refresh Ask's log, user must navigate back to refetch).

## Visual tokens (from CLAUDE.md/PLAN.md)

Accent `#BC9AFF`, font `system-ui`, light grey background, monospace for
code/citations. Configured as Tailwind theme extension, not hand-copied
across files.

## Routes

- `/ask` (default redirect from `/`) — Ask tab
- `/graph` — Memory Graph tab
- `/lifecycle` — Lifecycle tab

## Pages

### AskPage

Question input + submit button → calls `POST /query`, renders answer +
`TraceSummary`. Below: flat list of past recommendations (`GET /logs`,
fetched on mount via `useEffect`), each row a `RecommendationRow` —
click toggles inline expand showing cited chunk/data IDs and suspect
reason. Suspect rows get a `Badge`; non-suspect rows get no badge (absence
is default, avoids visual noise).

States: empty ("No recommendations yet — ask a question to get started."),
loading (button spinner + "Thinking...", log list stays visible), error
(banner above form, question text retained for retry).

### GraphPage

`GET /graph` on mount → renders returned HTML via `<iframe srcDoc={html}>`
(isolates Cognee's bundled JS/CSS from app styles). Backend's own
"Graph empty. Ingest data first." string renders as-is inside the iframe,
no separate frontend empty state needed.

States: loading (skeleton box matching iframe dimensions + "Loading
graph..."), error (banner above iframe, iframe hidden).

### LifecyclePage

Dataset picker (`<select>`, fetched from `GET /datasets` on mount)
shared above all three forms — selecting a dataset sets the `dataset`
field for whichever form is submitted.

Three independent forms, each with its own `useAsync` reducer:

- **Remember**: two input modes, both feeding the same ingestion pipeline:
  - textarea (text) + dataset field → `POST /ingest` (existing, manual paste)
  - GitHub URL field (issue/PR link) + dataset field → `POST /ingest/github`
    (new backend route — see below)
- **Forget**: dataset field + optional data_id field (full-dataset wipe
  vs single-doc forget — both supported per backend's optional param)
  → `POST /forget`
- **Improve**: dataset field → `POST /improve`

Each form shows before/after node/edge counts inline on success (extract
to a shared component once a second page needs the same display). States:
idle → submitting (spinner, fields disabled) → success (count delta) →
error (banner, fields re-enabled). No fetch on initial mount — counts only
appear after an action runs.

## Animations

CSS-only via Tailwind, no JS animation library:
- Row expand/collapse: `transition-all duration-200`
- Buttons: `transition-colors` on hover/active
- Spinner: `animate-spin`
- Success flash: `transition-opacity` fade-in
- Error/success banners: slide-down `transition-transform` on mount
- Tab switch: instant, no transition (avoid nav jank)

## Backend changes required (blocking)

1. **`GET /logs`** — new route wrapping `recommendation_log.list_all()`.
   Required for AskPage's recommendation list.
2. **Graph node/edge counts** — confirmed: `graph_engine =
   await get_graph_engine(); metrics = await
   graph_engine.get_graph_metrics(); metrics["num_nodes"],
   metrics["num_edges"]`. Add `_graph_counts()` helper in
   `cognee_client.py` calling this, captured before and after each
   `ingest`/`forget`/`improve` call, returned in those responses for
   `CountDelta` on LifecyclePage.
3. **CORS** — confirm `CORSMiddleware` is enabled in `backend/app.py`
   before frontend dev server can call the API cross-origin. Add if
   missing.
4. **API base URL** — frontend needs `VITE_API_BASE_URL` env var or a
   Vite dev-server proxy to the backend; do not hardcode
   `localhost:8000` in `api.ts`.
5. **`POST /ingest/github`** — new route. Takes `{url, dataset}`, parses
   owner/repo/issue-or-PR-number from a GitHub URL, fetches title + body
   + comments via the GitHub REST API (`https://api.github.com/repos/
   {owner}/{repo}/issues/{n}` — works for both issues and PRs, public
   repos need no auth token), joins into flat text, and feeds it through
   the same `cognee.add()` + `cognee.cognify()` pipeline as `/ingest`.
   Requires adding `httpx` to `requirements.txt` (not currently a direct
   dependency — confirm it isn't already pulled in transitively before
   adding). This realizes PLAN.md's "real GitHub repo" data-source
   description, which until now had no live ingestion path from the UI.
6. **`GET /datasets`** — new route wrapping `cognee.datasets.list_datasets()`
   (confirmed available, direct-mode call: `await
   cognee.datasets.list_datasets()`, returns dataset metadata with
   `id`/`name`/`created_at`). Backs the dataset picker in Lifecycle's
   forms — replaces the hardcoded `engineering_decisions` default with a
   `<select>` populated from this list (falls back to the hardcoded
   default if only one dataset exists).

## Known limitations (explicit, out of scope for this spec)

- No optimistic cross-page refresh (see "Structure" above).
- No mobile-responsive layout — local single-user devtool, desktop only.
- No file upload for `remember` — textarea only, matches backend's
  existing manual-text ingestion design.

## Testing

Vitest + React Testing Library, `api.ts` mocked via `vi.mock` (no MSW —
extra dep, overkill for ~6 endpoints):

- `hooks/useAsync.test.ts` — reducer transitions: idle→loading→success/error
- `components/Badge.test.tsx` — suspect vs default variant
- `components/RecommendationRow.test.tsx` — click expands/collapses
- `pages/AskPage.test.tsx` — mocked api, submit → renders answer
- `pages/LifecyclePage.test.tsx` — mocked api, forget → shows count delta
