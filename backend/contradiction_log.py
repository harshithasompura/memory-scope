import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "contradiction_log.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS contradictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    data_id TEXT NOT NULL,
    reason TEXT NOT NULL
);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(_SCHEMA)
    return conn


def flag(data_id: str, reason: str) -> int:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO contradictions (timestamp, data_id, reason) VALUES (?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), data_id, reason),
        )
        return cur.lastrowid


def is_flagged(data_id: str) -> bool:
    with _connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM contradictions WHERE data_id = ? LIMIT 1", (data_id,)
        ).fetchone()
    return row is not None
