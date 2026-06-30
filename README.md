# MemoryScope - The Hangover Part AI (Cognee x WeMakeDevs)

*Yesterday's truth should stop influencing today's decisions.*

MemoryScope is an observability and correctness tool for built on top of [Cognee](https://github.com/topoteretes/cognee). A backward-trace tool for AI memory. When a remembered fact gets corrected via `forget()`, MemoryScope flags every past recommendation that relied on the now-invalidated fact as suspect.

## Why

AI Coding assistants with persistent memory of past incidents and decisions will
keep recommending based on an assumption even after that assumption is
found wrong. Nothing currently tracks which past outputs are now suspect
once the underlying fact changes. The same idea as (`npm audit`) applied to AI memory.

## How it works

1. Ingest postmortems, ADRs, or decision docs from a GitHub repo (issues,
   PR discussions, markdown files) into Cognee.
2. Ask a question. The answer is logged along with which memory it cited.
3. When the cited fact is corrected (`forget()` the old version,
   `remember()` the new one), MemoryScope flags the earlier answer as
   suspect.
4. Re-asking the same question returns the corrected answer.

## Stack

React + Vite + TypeScript, Python + FastAPI, Cognee 1.2.2 (local SDK),
SQLite for the recommendation log.

LLM: Anthropic.

Embeddings: local Ollama (`nomic-embed-text`).

## Docs

- [Plan](docs/PLAN.md)
- [Cognee API notes from first iteration local setup](docs/cognee-api-notes.md)

## Setup

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in LLM_API_KEY, run Ollama locally with nomic-embed-text pulled
uvicorn backend.app:app --reload
```

```bash
cd frontend
npm install
npm run dev
```
