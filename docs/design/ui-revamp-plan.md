# UI Revamp: Implementation Plan

Executes `docs/design/ui-revamp.md` in full. Read that spec before starting
any phase — it has voice/copy rules, exact numbers (300ms debounce, 3 toast
max, 12px radius, etc.) this plan won't repeat.

## Phase 0: Facts confirmed against current code (no action needed)

Verified live against the repo on 2026-07-01, all spec assumptions hold:

- `forget()` — `backend/cognee_client.py:231-260` — matches spec exactly.
  Computes `blast_radius = recommendation_log.blast_radius(data_id)` at
  line 248, **after** deletion already ran.
- `recommendation_log.blast_radius(data_id)` — `backend/recommendation_log.py:87-100`
  — pure read against SQLite `recommendations` table, no side effects.
  Returns `{"count": int, "most_recent": str | None, "avg_confidence": float}`.
  Safe to call before deletion.
- `POST /forget` — `backend/routes/forget.py:1-19` — `ForgetRequest(dataset, data_id?)`.
  Untouched by this plan per spec scope boundary.
- `list_documents(dataset)` — `backend/cognee_client.py:285-302` — returns
  dicts with `created_at` (ISO string), `stale`, `contradiction`. Backs
  scrubber bounds.
- `backend/app.py:1-31` registers 8 routers. No `/forget/preview` route
  exists yet — net new.
- Frontend has Badge, Button, Card, ErrorState, Spinner, RecommendationRow
  (`frontend/src/components/`). **No Modal/Dialog, no Toast, no Accordion,
  no Scrubber exist yet** — all net new.
- `BlastRadiusSummary` is currently an inline function inside
  `frontend/src/pages/LifecyclePage.tsx:166-177`, not a standalone
  component. Extract it so the confirm dialog (Phase 4) and the post-forget
  toast (Phase 4) can both use it.
- Tailwind theme (`frontend/tailwind.config.ts`) only has `colors.accent`
  and `fontFamily.sans` today. `fontFamily.mono`, the dot-grid texture, the
  semantic badge colors, and the radius scale are all net new tokens.
- Logo: only `frontend/public/favicon.svg` exists (purple bolt mark,
  `#863bff`). No separate wordmark/lockup asset — confirm with user what
  the actual logo file is before Phase 2, or ask for one, don't invent a
  design.
- Must keep passing, unchanged: `AskPage.test.tsx`, `LifecyclePage.test.tsx`,
  `RecommendationRow.test.tsx`, `Badge.test.tsx`, `useAsync.test.ts` — these
  assert behavior/data, not markup, so a restyle shouldn't break them, but
  re-run after every phase.

**Anti-patterns to avoid:** don't add a gradient anywhere (spec is explicit
about this). Don't touch `POST /forget`'s request/response shape. Don't
call `cognee.prune`. Don't add an animation library for the count-up tween
or the scrubber. Don't add a component library (shadcn etc.) for the
modal — build it with a plain positioned `div` + `role="dialog"`.

---

## Phase 1: Design tokens

**Files:** `frontend/tailwind.config.ts`, `frontend/src/index.css`

- Add `fontFamily.mono`: `['ui-monospace', 'JetBrains Mono', 'SF Mono', 'monospace']`
- Add semantic colors: `stale` (amber), `suspect` (red), `resolved` (green),
  `contradiction` (red) — pick actual Tailwind shades (e.g. `amber-500`,
  `red-600`, `green-600`), keep `accent: '#BC9AFF'` untouched.
- Add `borderRadius`: confirm `12px` (cards), `full` (badges/buttons),
  `8px` (inputs) are expressible via existing Tailwind scale
  (`rounded-xl` ≈ 12px, `rounded-full`, `rounded-lg` ≈ 8px) — use those
  utility classes directly rather than inventing new radius tokens if the
  default scale already lines up. Check the actual computed px value with
  `preview_inspect` before assuming.
- Add a `bg-dot-grid` utility (CSS `background-image: radial-gradient(...)`
  repeating pattern — this is a repeating *pattern*, not a color gradient,
  so it doesn't violate the no-gradient rule, which is about smooth color
  blends. Tint with accent at low opacity.)

**Verification:** `pnpm build` compiles with no Tailwind errors.
`preview_inspect` a test element with each new class to confirm computed
styles match spec numbers.

**No commit yet** — tokens alone aren't visible; commit with Phase 2.

---

## Phase 2: Window chrome, nav, logo

**Files:** `frontend/src/components/Layout.tsx`, `frontend/src/App.tsx` (if breadcrumb needs route awareness)

- Wrap `Layout`'s current `<nav>` + `<main>` in a centered "window" frame:
  outer grey backdrop, inner white/bordered container.
- Top strip: dot-grid texture (accent tint), 3 decorative dots top-left,
  a status dot that pulses during any in-flight request. The status dot
  needs some shared "is anything loading" signal — simplest approach:
  each page's own `useAsync` state doesn't cross pages, so scope the pulse
  to "this page has a pending request" via context, or simpler, skip
  cross-page and just pulse per-page where relevant. Decide in-phase, note
  the choice inline as a comment, don't over-build a global loading store.
- Breadcrumb below the strip, monospace, driven by `useLocation()`
  (`memoryscope / ask`, `/ graph`, `/ lifecycle`).
- Logo + wordmark replacing plain nav text, tabs get icons, active tab in
  accent + monospace (existing `text-accent` class from
  `Layout.tsx` line ~18 already does the color half).
- Keep tabs horizontal — spec explicitly rejected a sidebar.

**Verification:** existing `Layout` isn't unit-tested directly (no
`Layout.test.tsx` found), so verify visually: start dev server, screenshot
all 3 routes, confirm chrome/breadcrumb/tabs render and route correctly.
Run full frontend test suite — nothing should break since no test targets
Layout markup directly.

**Commit:** chrome + nav + logo.

---

## Phase 3: Semantic badges, legend, Accordion

**Files:** `frontend/src/components/Badge.tsx`, new `frontend/src/components/BadgeLegend.tsx`, `frontend/src/components/RecommendationRow.tsx`, `frontend/src/pages/LifecyclePage.tsx` (DocumentsList)

- `Badge.tsx` (currently `frontend/src/components/Badge.tsx:1-7`, hardcoded
  red): add a `variant: 'stale' | 'suspect' | 'resolved' | 'contradiction'`
  prop, map to the Phase 1 semantic colors. Check `Badge.test.tsx` current
  assertions first — extend, don't break, its existing case.
  `RecommendationRow.tsx` and `LifecyclePage.tsx`'s `DocumentsList` both
  already render badges for suspect/resolved/stale/contradiction — update
  their call sites to pass the right variant.
- `BadgeLegend.tsx`: small persistent legend (footer or chrome), one line
  per state, plain-language copy per spec's example
  ("suspect, this answer may be wrong because a source it relied on
  changed."). Write the other three lines in the same voice.
- Accordion: `RecommendationRow.tsx` already has click-to-expand
  (confirmed lines 1-117, provenance chain at 46-61) — only the visual
  chevron changes, not the toggle logic. `DocumentsList` in
  `LifecyclePage.tsx:72-92` gets the same collapse-by-default-past-10
  treatment with a "show all" control.

**Verification:** `Badge.test.tsx`, `RecommendationRow.test.tsx` still pass
(re-run — these assert behavior, e.g. expand/collapse, re-ask, resolve
flows at lines 130/153/180, not exact class names, so should be safe).
Add a new test only if Accordion's behavior actually diverges from what
`RecommendationRow.test.tsx` already covers (spec says this explicitly —
don't add a redundant test).

**Commit:** semantic badges + legend + accordion styling.

---

## Phase 4: Backend — `GET /forget/preview`, TDD

**Files:** create `backend/routes/forget_preview.py`, modify `backend/app.py`, create `backend/tests/test_forget_preview_route.py`

Follow the exact TDD shape already used in `docs/design/backend-tasks.md`
(red → green → commit) — this codebase's established pattern for new
routes.

- [ ] **Step 1: failing test** — `test_forget_preview_route.py`: two cases.
  (a) `data_id` given → route calls `recommendation_log.blast_radius(data_id)`
  directly (mock it) and returns those numbers, asserts the mock is called
  and **`cognee.forget` is never called** (nothing destructive happens on
  a GET). (b) no `data_id` → dataset-wide wipe preview: return dataset name
  + document count (call `list_documents(dataset)` and return `len(...)`,
  per spec lines 221-224).
- [ ] **Step 2: run, confirm fails** — `ModuleNotFoundError` for the new
  module.
- [ ] **Step 3: minimal implementation** — thin router, same
  try/except → `HTTPException(500)` pattern as every other file in
  `backend/routes/` (see `backend/routes/forget.py:1-19` for the exact
  shape to copy). Query param `data_id: str | None = None`, `dataset: str`.
  Calls `recommendation_log.blast_radius` and/or `cognee_client.list_documents`
  directly — no new business logic, spec is explicit this is a ~10-15 line
  route reusing existing functions.
- [ ] **Step 4: register in `app.py`** next to the existing `forget.router`
  include.
- [ ] **Step 5: run, confirm passes.**
- [ ] **Step 6: commit** — `feat: add GET /forget/preview route for confirm-before-forget`

**Anti-pattern guard:** the whole point of this route is that it must
NOT delete anything. The test in step 1 must assert no deletion call
happens — that's the one thing to get right.

---

## Phase 5: Time-travel scrubber (Ask page)

**Files:** new `frontend/src/components/TimeScrubber.tsx`, `frontend/src/pages/AskPage.tsx`

- Replace the current `datetime-local` input (`AskPage.tsx` lines ~31-54)
  with `TimeScrubber`: native `<input type="range">` (gets keyboard
  arrow/Home/End behavior for free — spec's accessibility requirement is
  satisfied by the native element, don't hand-roll ARIA slider semantics
  unless the native range can't be styled enough).
- Bounds: min = oldest `list_documents(dataset)` `created_at` for the
  selected dataset, max = `Date.now()`. Fetch via existing
  `getDatasetDocuments` (`api.ts` — already implemented, calls
  `GET /datasets/{dataset}/documents`). Recompute bounds on dataset change.
  Empty dataset → render disabled, not hidden.
- Debounce: 300ms after drag stops before firing `postQuery` with the new
  `as_of_ms`. Note `postQuery` currently takes an ISO string (`api.ts`,
  `as_of: asOf || null`) — confirm whether the query route wants
  milliseconds or ISO (`backend/routes/query.py` per discovery converts
  ISO → ms internally at line 20), so keep sending ISO from the frontend,
  just derive it from the scrubber's ms value with `new Date(ms).toISOString()`.
  Don't change the wire format `AskPage.test.tsx` already asserts
  (line 41 checks the exact string passed to `postQuery`).
- While in flight: keep showing the previous answer, dim it, keep
  `Spinner` visible — don't blank the answer area.

**Verification:** new test — dragging triggers exactly one debounced call,
not one per pixel (fake timers), keyboard step works, disabled state on
empty dataset. Re-run `AskPage.test.tsx` — the as-of assertion at line 41
must still pass since the wire format is unchanged.

**Commit:** time-travel scrubber.

---

## Phase 6: Blast-radius reveal + confirm-before-forget

**Files:** new `frontend/src/components/ConfirmDialog.tsx`, new `frontend/src/components/Toast.tsx`, extract `BlastRadiusSummary` out of `LifecyclePage.tsx:166-177` into its own component, modify `LifecyclePage.tsx` ForgetForm (lines ~179-216), `frontend/src/api.ts` (add `getForgetPreview`)

- `api.ts`: add `getForgetPreview(dataset, dataId?)` → `GET /forget/preview`
  (Phase 4's route).
- `ConfirmDialog.tsx`: plain overlay + `role="dialog"`, shows the preview
  numbers (reuses extracted `BlastRadiusSummary`), Cancel/Confirm buttons.
  No new dependency.
- `ForgetForm` flow: submit → call `getForgetPreview` → open `ConfirmDialog`
  with those numbers → on Confirm, call existing `postForget` → on success,
  count-up tween from 0 to the real `blast_radius.count` (plain
  `setInterval`/`requestAnimationFrame` loop, no library), skip the
  animation entirely if `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
  Fire a `Toast` on success ("forget completed, N recommendations now
  flagged suspect").
- `Toast.tsx`: top-right/top-center, auto-dismiss timer, stacks up to 3
  newest-on-top, 4th+ drops. Independent timers per toast (don't reset
  others when a new one arrives).

**Verification:** extend `LifecyclePage.test.tsx` — confirm dialog blocks
the real `postForget` call until Confirm is clicked (this is the one
behavior change the spec calls out as a real gap, not just visual — test
it explicitly). New `Toast.test.tsx`: appears on success, self-dismisses,
stacks correctly, caps at 3.

**Commit:** blast-radius reveal + confirm-before-forget + toast.

---

## Phase 7: Graph page chrome

**Files:** `frontend/src/pages/GraphPage.tsx`

Wrap existing iframe render in the same chrome/breadcrumb frame from
Phase 2. No change to the iframe/`getGraph()` logic itself
(`GraphPage.tsx` lines 1-31, untouched per spec — graph interactivity is
explicitly out of scope).

**Verification:** visual check only, no test file exists for this page
today and none is needed — pure frame wrap.

**Commit:** graph page chrome restyle.

---

## Phase 8: Final verification

- [ ] Run full frontend suite: `pnpm test` (or repo's actual test command
  — confirm from `package.json`) — every listed test file passes,
  including new ones from Phases 5-6.
- [ ] Run full backend suite: `pytest backend/tests/ -v` — Phase 4's new
  test plus everything pre-existing.
- [ ] `pnpm build` — no TypeScript errors.
- [ ] Grep for anti-patterns: `grep -rn "gradient" frontend/src` should
  only match the dot-grid comment/utility, not an actual color gradient.
  Grep copy for banned words per spec voice section: "elevate", "seamless",
  "unleash", "next-gen", em dashes.
- [ ] Manual smoke pass in browser across all 3 routes: scrubber drags and
  updates staleness badges, forget confirm dialog blocks then completes
  with count-up, toast stacks, accordion expands, badge legend readable.
- [ ] Commit any final fixes found during smoke check.
