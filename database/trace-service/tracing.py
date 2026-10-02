# ═══════════════════════════════════════════════════════
# AGRI VISION — Trace AI  |  tracing.py
# SQLite persistence layer for AI interaction traces.
# Every chat/vision/bulletin/suit/explain call in PHP
# fires a POST /trace here; this module stores & queries it.
# ═══════════════════════════════════════════════════════

from __future__ import annotations

import os
import json
import sqlite3
import time
from contextlib import contextmanager
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Optional

# ── Storage path (mounted Docker volume at /data) ──────
DB_PATH = Path(os.environ.get('TRACE_DB_PATH', '/data/traces.db'))


# ── Data model ─────────────────────────────────────────
@dataclass
class Trace:
    """One recorded AI interaction."""
    action: str                          # chat | vision | bulletin | suit | explain
    query: str                           # the raw user message / data blob
    model: str                           # ollama model that answered
    response: str                        # the AI reply text
    latency_ms: float                    # wall-clock ms measured by PHP

    # optional / RAG-facing fields (populated by RAG service if present)
    retrieved_json: str = "[]"           # JSON-serialised list of retrieved chunks
    system_prompt: str = ""              # final system prompt sent to the model
    status: str = "ok"                   # ok | error | fallback

    # set by the DB on insert
    id: Optional[int] = field(default=None)
    created_at: Optional[str] = field(default=None)


# ── Schema ─────────────────────────────────────────────
_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS traces (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at    DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    action        TEXT    NOT NULL,
    query         TEXT    NOT NULL,
    retrieved_json TEXT   NOT NULL DEFAULT '[]',
    system_prompt TEXT    NOT NULL DEFAULT '',
    model         TEXT    NOT NULL,
    response      TEXT    NOT NULL,
    latency_ms    REAL    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'ok'
);
"""

_CREATE_INDEX = """
CREATE INDEX IF NOT EXISTS idx_traces_created_at ON traces(created_at DESC);
"""


# ── Internal helpers ───────────────────────────────────
@contextmanager
def _get_conn():
    """Context manager: open → yield → close (thread-safe WAL mode)."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create the traces table and index if they don't exist."""
    with _get_conn() as conn:
        conn.execute(_CREATE_TABLE)
        conn.execute(_CREATE_INDEX)


# ── Public API ─────────────────────────────────────────
def save_trace(trace: Trace) -> int:
    """
    Persist a Trace to SQLite.
    Returns the auto-assigned row id.
    """
    with _get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO traces
                (action, query, retrieved_json, system_prompt, model, response, latency_ms, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                trace.action,
                trace.query,
                trace.retrieved_json,
                trace.system_prompt,
                trace.model,
                trace.response,
                trace.latency_ms,
                trace.status,
            ),
        )
        return cur.lastrowid


def list_traces(
    limit: int = 100,
    offset: int = 0,
    action: Optional[str] = None,
) -> list[dict[str, Any]]:
    """
    Return traces newest-first.
    Optionally filter by action (chat | vision | bulletin | suit | explain).
    """
    with _get_conn() as conn:
        if action:
            rows = conn.execute(
                """
                SELECT * FROM traces
                WHERE action = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                (action, limit, offset),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT * FROM traces
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            ).fetchall()

        return [dict(r) for r in rows]


def get_trace(trace_id: int) -> Optional[dict[str, Any]]:
    """Fetch a single trace by id. Returns None if not found."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM traces WHERE id = ?", (trace_id,)
        ).fetchone()
        return dict(row) if row else None


def get_stats() -> dict[str, Any]:
    """Aggregate stats used by the /health and /traces-ui endpoints."""
    with _get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM traces").fetchone()[0]
        avg_latency = conn.execute(
            "SELECT AVG(latency_ms) FROM traces WHERE status = 'ok'"
        ).fetchone()[0]
        by_action = conn.execute(
            "SELECT action, COUNT(*) as cnt FROM traces GROUP BY action"
        ).fetchall()
        error_count = conn.execute(
            "SELECT COUNT(*) FROM traces WHERE status != 'ok'"
        ).fetchone()[0]

        return {
            "total_traces": total,
            "error_count": error_count,
            "avg_latency_ms": round(avg_latency, 2) if avg_latency else 0,
            "by_action": {r["action"]: r["cnt"] for r in by_action},
        }
