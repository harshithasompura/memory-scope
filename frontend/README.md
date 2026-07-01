# MemoryScope Frontend

React + Vite + TypeScript UI for MemoryScope: Ask / Memory Graph / Lifecycle
tabs over the FastAPI + Cognee backend. See
[docs/design/frontend-design.md](../docs/design/frontend-design.md) for the
full design spec.

## Setup

```bash
pnpm install
```

## Dev server

Backend must be running on `http://localhost:8000` (see `backend/`). The
Vite dev server proxies `/api/*` to it (config in `vite.config.ts`):

```bash
pnpm dev
```

To point at a different backend, set `VITE_API_BASE_URL` instead of relying
on the proxy:

```bash
VITE_API_BASE_URL=http://localhost:8000 pnpm dev
```

## Test

```bash
pnpm test
```

Vitest + React Testing Library, `api.ts` mocked via `vi.mock`. Requires
Node 22+ (jsdom/pnpm build tooling breaks on Node 20).

## Build

```bash
pnpm build
```

## Routes

- `/ask` (default) — question form, answer, recommendation log
- `/graph` — Cognee graph viewer (iframe)
- `/lifecycle` — remember / forget / improve forms
