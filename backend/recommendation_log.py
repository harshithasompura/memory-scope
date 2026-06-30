import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "recommendation_log.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    question TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    cited_chunk_ids TEXT NOT NULL,
    cited_data_ids TEXT NOT NULL,
    suspect INTEGER NOT NULL DEFAULT 0
);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(_SCHEMA)
    return conn


def record(question: str, answer_text: str, cited_chunk_ids: list[str], cited_data_ids: list[str]) -> int:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO recommendations (timestamp, question, answer_text, cited_chunk_ids, cited_data_ids) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                datetime.now(timezone.utc).isoformat(),
                question,
                answer_text,
                json.dumps(cited_chunk_ids),
                json.dumps(cited_data_ids),
            ),
        )
        return cur.lastrowid


def list_all() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM recommendations ORDER BY id DESC").fetchall()
    return [
        {
            **dict(r),
            "cited_chunk_ids": json.loads(r["cited_chunk_ids"]),
            "cited_data_ids": json.loads(r["cited_data_ids"]),
            "suspect": bool(r["suspect"]),
        }
        for r in rows
    ]


def flag_suspect_by_data_id(data_id: str) -> int:
    """Mark every logged recommendation that cited data_id as suspect. Returns count flagged."""
    with _connect() as conn:
        rows = conn.execute("SELECT id, cited_data_ids FROM recommendations WHERE suspect = 0").fetchall()
        ids_to_flag = [r["id"] for r in rows if data_id in json.loads(r["cited_data_ids"])]
        if ids_to_flag:
            conn.executemany(
                "UPDATE recommendations SET suspect = 1 WHERE id = ?",
                [(i,) for i in ids_to_flag],
            )
        return len(ids_to_flag)
