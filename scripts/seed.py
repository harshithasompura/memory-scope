"""Seed the engineering_decisions dataset from data/seed/*.md.

Repeatable, idempotent doc ingestion. Used to populate a fresh Cognee volume
(prod deploy) or reset a local graph. Run with the API server STOPPED — Cognee's
graph store (Ladybug) is single-writer, so a running `uvicorn backend.app` holds
the lock and this will hit a concurrency error.

    python scripts/seed.py            # skip if already seeded
    RESEED=1 python scripts/seed.py   # ingest even if docs exist

ponytail: idempotency is a doc-count check, not content hashing. Re-running
against a partially-seeded dataset with RESEED=1 can duplicate docs; for a clean
reload, delete the dataset first (POST /forget {"dataset": "engineering_decisions"}).
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import cognee_client as cc  # noqa: E402

DATASET = "engineering_decisions"
SEED_DIR = Path(__file__).resolve().parent.parent / "data" / "seed"


async def main() -> int:
    docs = sorted(SEED_DIR.glob("*.md"))
    if not docs:
        print(f"no seed docs in {SEED_DIR}")
        return 1

    existing = await cc.list_documents(DATASET)
    if existing and not os.getenv("RESEED"):
        print(f"{DATASET} already has {len(existing)} docs; skipping (RESEED=1 to force)")
        return 0

    for path in docs:
        text = path.read_text()
        result = await cc.ingest(text, DATASET)
        after = result["counts_after"]
        print(f"  ingested {path.name}: nodes={after['num_nodes']} edges={after['num_edges']}")

    print(f"seeded {len(docs)} docs into {DATASET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
