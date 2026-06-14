#!/usr/bin/env python3
"""Hermes G2 — standalone API server.
Reads Hermes state.db (full conversation content) + cron outputs."""

import json, os, sqlite3
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

HERMES_HOME = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
STATE_DB = HERMES_HOME / "state.db"
CRON_JOBS = HERMES_HOME / "cron" / "jobs.json"
CRON_OUTPUT = HERMES_HOME / "cron" / "output"
GATEWAY_PID = HERMES_HOME / "gateway.pid"

PORT = 8765
MAX_MESSAGES = 100
MAX_BODY = 5000

def get_db():
    try:
        db = sqlite3.connect(f"file:{STATE_DB}?mode=ro", uri=True)
        db.row_factory = sqlite3.Row
        return db
    except Exception:
        return None

def check_gateway():
    try:
        pid = int(GATEWAY_PID.read_text().strip())
        os.kill(pid, 0)
        return True
    except Exception:
        return False

def load_cron_messages():
    messages = []
    try:
        with open(CRON_JOBS) as f:
            data = json.load(f)
        jobs = data.get("jobs", []) if isinstance(data, dict) else data
    except (FileNotFoundError, json.JSONDecodeError):
        return messages

    for job in jobs:
        if not isinstance(job, dict):
            continue
        job_id = job.get("id", "")
        name = job.get("name", job_id)
        output_dir = CRON_OUTPUT / job_id
        if not output_dir.is_dir():
            continue
        files = sorted(output_dir.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not files:
            continue
        try:
            body = files[0].read_text()[:MAX_BODY]
        except Exception:
            continue
        # Try to extract just the actual output (after "## Response" marker)
        marker = "## Response"
        idx = body.find(marker)
        if idx != -1:
            body = body[idx + len(marker):].strip()
        messages.append({
            "ts": int(files[0].stat().st_mtime * 1000),
            "source": "cron",
            "label": name,
            "body": body,
        })
    return messages

def load_session_messages():
    """Read real conversation content from state.db messages table."""
    messages = []
    db = get_db()
    if not db:
        return messages
    try:
        # Get recent sessions with their messages
        rows = db.execute(
            """SELECT s.id, s.title, s.started_at,
                      m.role, m.content, m.timestamp
               FROM sessions s
               LEFT JOIN messages m ON m.session_id = s.id
               WHERE s.title IS NOT NULL AND s.title != ''
                 AND (m.content IS NULL OR m.content != '')
               ORDER BY s.started_at DESC, m.timestamp ASC
               LIMIT 2000"""
        ).fetchall()
    except Exception:
        return messages

    # Group messages by session
    sessions = {}
    for row in rows:
        sid = row["id"]
        if sid not in sessions:
            sessions[sid] = {"title": row["title"], "ts": row["started_at"], "msgs": []}
        role = row["role"]
        content = row["content"]
        if not content:
            continue

        # Skip system prompt noise (cron job instructions etc.)
        if content.startswith("[IMPORTANT:") or content.startswith("[SYSTEM:"):
            continue

        if role == "user":
            # Show first line of user message
            first_line = content.split("\n")[0][:150]
            sessions[sid]["msgs"].append(f"▸ {first_line}")
        elif role == "assistant":
            # Show first meaningful paragraph of assistant response
            # Skip thinking/analysis noise
            para = content.split("\n\n")[0] if "\n\n" in content else content[:200]
            sessions[sid]["msgs"].append(f"  {para[:250]}")
        elif role == "tool":
            pass  # skip tool output

    for sid, s in sessions.items():
        ts = int(s["ts"] * 1000) if s["ts"] else 0
        body = "\n".join(s["msgs"][:15])  # first 15 messages max
        if len(s["msgs"]) > 15:
            body += f"\n... ({len(s['msgs'])} total messages)"
        if not body:
            body = f"Session: {s['title']}"
        messages.append({
            "ts": ts,
            "source": "session",
            "label": s["title"],
            "body": body[:MAX_BODY],
        })

    return messages

def build_sources(messages):
    from collections import Counter
    counts = Counter()
    for m in messages:
        counts[(m["source"], m["label"])] += 1
    return sorted(
        [{"type": t, "label": l, "count": c} for (t, l), c in counts.items()],
        key=lambda s: s["count"], reverse=True
    )

def get_inbox():
    messages = load_cron_messages() + load_session_messages()
    messages.sort(key=lambda m: m["ts"], reverse=True)
    messages = messages[:MAX_MESSAGES]
    return {
        "messages": messages,
        "sources": build_sources(messages),
        "gateway_online": check_gateway(),
    }

def get_health():
    cron_total = 0
    cron_active = 0
    last_run = None
    try:
        with open(CRON_JOBS) as f:
            data = json.load(f)
        jobs = data.get("jobs", []) if isinstance(data, dict) else data
        cron_total = len(jobs)
        cron_active = sum(1 for j in jobs if isinstance(j, dict) and not j.get("paused"))
        latest_ts = 0
        for job in jobs:
            if not isinstance(job, dict):
                continue
            out_dir = CRON_OUTPUT / job.get("id", "")
            if out_dir.is_dir():
                for f in out_dir.glob("*"):
                    if f.stat().st_mtime > latest_ts:
                        latest_ts = f.stat().st_mtime
        if latest_ts > 0:
            from datetime import datetime, timezone
            last_run = datetime.fromtimestamp(latest_ts, tz=timezone.utc).isoformat()
    except Exception:
        pass
    return {
        "status": "ok",
        "gateway_online": check_gateway(),
        "cron_jobs_total": cron_total,
        "cron_jobs_active": cron_active,
        "last_cron_run": last_run,
    }

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def _json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/plugins/hermes-g2/inbox":
            self._json(get_inbox())
        elif self.path == "/api/plugins/hermes-g2/health":
            self._json(get_health())
        elif self.path == "/health" or self.path == "/":
            self._json({"status": "ok", "service": "hermes-g2-api"})
        else:
            self._json({"error": "not found"}, 404)

def main():
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Hermes G2 API on http://0.0.0.0:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()

if __name__ == "__main__":
    main()
