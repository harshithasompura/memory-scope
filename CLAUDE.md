# MemoryScope — Claude Code Context

Plan: [docs/PLAN.md]
Cognee API reference notes: [docs/cognee-api-notes.md]

## Stack

React + Vite + TypeScript · Python + FastAPI · Cognee 1.2.2 (local SDK) ·
SQLite for the recommendation log · plain `fetch`.

LLM: Anthropic direct (`LLM_PROVIDER="anthropic"`, `LLM_MODEL="claude-haiku-4-5"`).

Embeddings: local Ollama (`EMBEDDING_PROVIDER="ollama"`,
`EMBEDDING_MODEL="nomic-embed-text:latest"`, `EMBEDDING_DIMENSIONS=768`,
`HUGGINGFACE_TOKENIZER="nomic-ai/nomic-embed-text-v1.5"`).

## Rules

- All four memory lifecycle ops (remember, recall, improve, forget) must be
  genuinely implemented. Do not fake or stub `improve()`.
- Keep the UI to 3 tabs (Ask / Memory Graph / Lifecycle), one screen each,
  no overloaded panels. Visual tokens: accent `#BC9AFF`, font `system-ui`,
  light grey background.
