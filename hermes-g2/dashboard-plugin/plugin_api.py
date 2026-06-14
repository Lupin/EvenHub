"""Hermes G2 Dashboard Plugin

Exposes inbox and health endpoints for the Hermes G2 companion app
on Even Realities G2 glasses.
"""

import json
import os
import sqlite3
import subprocess
import time
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()
HERMES_HOME = Path.home() / ".hermes"
STATE_DB = HERMES_HOME / "state.db"
CRON_JOBS_FILE = HERMES_HOME / "cron" / "jobs.json"
CRON_OUTPUT_DIR = HERMES_HOME / "cron" / "output"
GATEWAY_PID_FILE = HERMES_HOME / "gateway.pid"

MAX_MESSAGES = 100
MAX_BODY_CHARS = 5000


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_gateway_status() -> bool:
    """Return True if the Hermes gateway is running."""
    # Strategy 1: check PID file
    try:
        pid = int(GATEWAY_PID_FILE.read_text().strip())
        os.kill(pid, 0)  # signal 0 checks existence
        return True
    except (FileNotFoundError, ValueError, ProcessLookupError, PermissionError):
        pass

    # Strategy 2: `hermes gateway status` CLI
    try:
        result = subprocess.run(
            ["hermes", "gateway", "status"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return False


def _load_cron_jobs() -> list[dict]:
    """Load cron jobs from jobs.json, returning an empty list on failure."""
    try:
        raw = CRON_JOBS_FILE.read_text()
        jobs = json.loads(raw)
        if not isinstance(jobs, list):
            return []
        return jobs
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _latest_cron_output(job_id: str) -> str | None:
    """Return the latest output file contents for a cron job, or None."""
    job_dir = CRON_OUTPUT_DIR / job_id
    if not job_dir.is_dir():
        return None

    try:
        files = sorted(job_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
        for f in files:
            if f.is_file():
                text = f.read_text()
                return text[:MAX_BODY_CHARS]
    except (OSError, PermissionError):
        pass

    return None


def _load_sessions() -> list[dict]:
    """Load recent sessions from the SQLite state DB."""
    if not STATE_DB.exists():
        return []

    conn = None
    try:
        conn = sqlite3.connect(f"file:{STATE_DB}?mode=ro", uri=True)
        conn.execute("PRAGMA journal_mode=WAL")
        cur = conn.cursor()

        # Try to discover the sessions table schema dynamically
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]

        sessions = []
        candidates = ["sessions", "conversations", "messages"]

        for table in candidates:
            if table not in tables:
                continue

            cur.execute(f"PRAGMA table_info({table})")
            cols = {r[1] for r in cur.fetchall()}

            query_cols = []
            if "id" in cols:
                query_cols.append("id")
            if "created_at" in cols:
                query_cols.append("created_at")
            elif "timestamp" in cols:
                query_cols.append("timestamp")
            if "title" in cols:
                query_cols.append("title")
            elif "summary" in cols:
                query_cols.append("summary")
            if "last_message" in cols:
                query_cols.append("last_message")
            elif "content" in cols:
                query_cols.append("content")

            if not query_cols:
                continue

            col_str = ", ".join(query_cols)
            order_col = "created_at" if "created_at" in cols else "timestamp" if "timestamp" in cols else query_cols[0]
            cur.execute(f"SELECT {col_str} FROM {table} ORDER BY {order_col} DESC LIMIT 50")

            col_names = [d[0] for d in cur.description]
            for row in cur.fetchall():
                session = dict(zip(col_names, row))
                sessions.append(session)

        conn.close()
        return sessions

    except (sqlite3.OperationalError, sqlite3.DatabaseError):
        if conn:
            conn.close()
        return []
    except Exception:
        if conn:
            conn.close()
        return []


def _compile_messages() -> tuple[list[dict], list[dict], bool]:
    """Compile messages and source summaries from all data sources."""
    messages: list[dict] = []
    sources: list[dict] = []
    now_ms = int(time.time() * 1000)
    gateway_online = _check_gateway_status()

    # --- Cron messages ---
    cron_jobs = _load_cron_jobs()
    cron_count = 0
    for job in cron_jobs:
        job_id = job.get("id", "")
        output = _latest_cron_output(job_id)
        if output:
            cron_count += 1
            messages.append({
                "ts": now_ms,
                "source": "cron",
                "label": job.get("label", job_id),
                "body": output,
            })

    if cron_count:
        sources.append({"type": "cron", "label": "Cron Outputs", "count": cron_count})

    # --- Session messages ---
    sessions = _load_sessions()
    for s in sessions:
        ts = s.get("created_at") or s.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = int(time.mktime(time.strptime(ts, "%Y-%m-%dT%H:%M:%S")) * 1000)
            except ValueError:
                ts = now_ms
        elif isinstance(ts, (int, float)):
            ts = int(ts * 1000) if ts < 1e12 else int(ts)  # seconds → ms if needed
        else:
            ts = now_ms

        title = s.get("title") or s.get("summary") or s.get("id", "Session")
        body = s.get("last_message") or s.get("content") or ""
        if body and isinstance(body, str):
            body = body[:MAX_BODY_CHARS]

        messages.append({
            "ts": ts,
            "source": "session",
            "label": str(title),
            "body": body,
        })

    if sessions:
        sources.append({"type": "session", "label": "Sessions", "count": len(sessions)})

    # --- Gateway status (always a source) ---
    sources.append({
        "type": "direct",
        "label": "Gateway",
        "count": 1 if gateway_online else 0,
    })

    # Sort newest first, cap at MAX_MESSAGES
    messages.sort(key=lambda m: m["ts"], reverse=True)
    messages = messages[:MAX_MESSAGES]

    return messages, sources, gateway_online


def _cron_summary(cron_jobs: list[dict]) -> tuple[int, int, str | None]:
    """Return (total_jobs, active_jobs, last_run_iso)."""
    total = len(cron_jobs)
    active = sum(1 for j in cron_jobs if j.get("enabled", True))
    last_run = None

    # Walk output dirs for most recent file timestamp
    if CRON_OUTPUT_DIR.is_dir():
        newest_ts = 0.0
        for job_dir in CRON_OUTPUT_DIR.iterdir():
            if not job_dir.is_dir():
                continue
            try:
                for f in job_dir.iterdir():
                    if f.is_file():
                        newest_ts = max(newest_ts, f.stat().st_mtime)
            except (OSError, PermissionError):
                pass
        if newest_ts > 0:
            import datetime
            last_run = datetime.datetime.fromtimestamp(newest_ts).isoformat()

    return total, active, last_run


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/inbox")
async def inbox():
    messages, sources, gateway_online = _compile_messages()
    return {
        "messages": messages,
        "sources": sources,
        "gateway_online": gateway_online,
    }


@router.get("/health")
async def health():
    gateway_online = _check_gateway_status()
    cron_jobs = _load_cron_jobs()
    total, active, last_run = _cron_summary(cron_jobs)

    return {
        "status": "ok",
        "gateway_online": gateway_online,
        "cron_jobs_total": total,
        "cron_jobs_active": active,
        "last_cron_run": last_run,
    }
