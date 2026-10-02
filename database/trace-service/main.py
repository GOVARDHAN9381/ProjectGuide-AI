# ═══════════════════════════════════════════════════════
# AGRI VISION — Trace AI  |  main.py
# FastAPI microservice — receives trace events from PHP,
# stores them in SQLite, and serves a live dashboard.
#
# Endpoints:
#   POST /trace       — record one AI interaction
#   GET  /traces      — JSON list (newest first, paginated)
#   GET  /traces/{id} — single trace detail
#   GET  /traces-ui   — HTML live dashboard
#   GET  /health      — service + DB status
# ═══════════════════════════════════════════════════════

from __future__ import annotations

import json
import time
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

import tracing as db

# ── App init ───────────────────────────────────────────
app = FastAPI(
    title="AgriSight Trace AI",
    description="AI interaction tracer for AgriSight — stores every model call with latency and context.",
    version="1.0.0",
)


@app.on_event("startup")
def startup():
    db.init_db()


# ═══════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════

class TraceRequest(BaseModel):
    action: str = Field(..., description="chat | vision | bulletin | suit | explain")
    query: str = Field(..., description="User message or data sent to the AI")
    model: str = Field(..., description="Ollama model that answered")
    response: str = Field(..., description="AI reply text")
    latency_ms: float = Field(..., description="Wall-clock latency measured by PHP (ms)")

    # Optional — filled by RAG service if it exists in the stack
    retrieved_json: str = Field(default="[]", description="JSON list of retrieved RAG chunks")
    system_prompt: str = Field(default="", description="Full system prompt sent to the model")
    status: str = Field(default="ok", description="ok | error | fallback")


# ═══════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════

# ── POST /trace ────────────────────────────────────────
@app.post("/trace", status_code=201)
def record_trace(body: TraceRequest):
    """
    Receive one AI interaction from the PHP backend and persist it.
    PHP should call this fire-and-forget (1 s timeout) so it never
    blocks the user-facing response.
    """
    trace = db.Trace(
        action=body.action,
        query=body.query,
        model=body.model,
        response=body.response,
        latency_ms=body.latency_ms,
        retrieved_json=body.retrieved_json,
        system_prompt=body.system_prompt,
        status=body.status,
    )
    trace_id = db.save_trace(trace)
    return {"saved": True, "trace_id": trace_id}


# ── GET /traces ────────────────────────────────────────
@app.get("/traces")
def get_traces(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    action: Optional[str] = Query(default=None),
):
    """
    Return traces newest-first, optionally filtered by action.
    """
    traces = db.list_traces(limit=limit, offset=offset, action=action)
    stats = db.get_stats()
    return {"traces": traces, "stats": stats, "count": len(traces)}


# ── GET /traces/{id} ───────────────────────────────────
@app.get("/traces/{trace_id}")
def get_trace(trace_id: int):
    """Return a single trace record in full detail."""
    trace = db.get_trace(trace_id)
    if not trace:
        raise HTTPException(status_code=404, detail=f"Trace {trace_id} not found")
    # Parse stored JSON for nicer output
    try:
        trace["retrieved"] = json.loads(trace.get("retrieved_json", "[]"))
    except Exception:
        trace["retrieved"] = []
    return trace


# ── GET /health ────────────────────────────────────────
@app.get("/health")
def health():
    """Service + DB health check."""
    try:
        stats = db.get_stats()
        return {
            "status": "ok",
            "service": "agrisight-trace",
            "total_traces": stats["total_traces"],
            "avg_latency_ms": stats["avg_latency_ms"],
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detail": str(e)},
        )


# ── GET /export-traces ──────────────────────────────────
@app.get("/export-traces")
def export_traces(
    limit: int = Query(default=500, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    action: Optional[str] = Query(default=None),
    scrub_level: str = Query(default="redact"),  # redact | hash
):
    """
    Export traces for submission (Trace Commons / audits).

    scrub_level:
      - redact => replace potentially sensitive fields with "[REDACTED]"
      - hash   => return SHA256 hex of sensitive fields (non-reversible but allows integrity checks)

    Returns a JSON array of scrubbed trace objects.
    """
    import hashlib

    def _hash(s: str) -> str:
        return hashlib.sha256(s.encode('utf-8')).hexdigest()

    def _scrub_text(text: str) -> str:
        if not text:
            return text
        if scrub_level == 'hash':
            return _hash(text)
        # default: redact
        return "[REDACTED]"

    traces = db.list_traces(limit=limit, offset=offset, action=action)
    scrubbed = []
    for t in traces:
        scrubbed.append({
            "id": t.get("id"),
            "created_at": t.get("created_at"),
            "action": t.get("action"),
            "model": t.get("model"),
            "latency_ms": t.get("latency_ms"),
            "status": t.get("status"),
            # Sensitive fields are either redacted or hashed
            "query": _scrub_text(t.get("query", "")),
            "response": _scrub_text(t.get("response", "")),
            "system_prompt": _scrub_text(t.get("system_prompt", "")),
            "retrieved_json": _scrub_text(t.get("retrieved_json", "")),
        })

    return {"count": len(scrubbed), "traces": scrubbed}


# ═══════════════════════════════════════════════════════
# LIVE DASHBOARD — GET /traces-ui
# ═══════════════════════════════════════════════════════

@app.get("/traces-ui", response_class=HTMLResponse)
def traces_dashboard():
    """
    Live HTML dashboard — auto-refreshes every 15 s.
    Shows latency sparkline, action breakdown, and a full trace table.
    """
    return HTMLResponse(content=_build_dashboard_html())


def _build_dashboard_html() -> str:
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AgriSight — Trace AI Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    /* ── Reset & base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d1117;
      --surface:   #161b22;
      --surface2:  #1c2128;
      --border:    #30363d;
      --text:      #e6edf3;
      --muted:     #8b949e;
      --accent:    #3fb950;
      --accent2:   #58a6ff;
      --warn:      #d29922;
      --err:       #f85149;
      --chat:      #388bfd;
      --vision:    #a371f7;
      --bulletin:  #3fb950;
      --suit:      #ffa657;
      --explain:   #79c0ff;
      --radius:    10px;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 0 0 60px;
    }

    /* ── Header ── */
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 18px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon {
      width: 36px; height: 36px; border-radius: 8px;
      background: linear-gradient(135deg, #3fb950, #388bfd);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .logo h1 { font-size: 18px; font-weight: 600; }
    .logo span { font-size: 13px; color: var(--muted); }
    #refresh-badge {
      font-size: 12px; color: var(--muted);
      display: flex; align-items: center; gap: 6px;
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent); animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:.4; transform:scale(1.3); }
    }

    /* ── Layout ── */
    main { max-width: 1280px; margin: 0 auto; padding: 28px 24px; }

    /* ── Stat cards ── */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
      transition: border-color .2s;
    }
    .card:hover { border-color: var(--accent2); }
    .card-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; }
    .card-value { font-size: 32px; font-weight: 700; margin-top: 4px; }
    .card-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .green { color: var(--accent); }
    .blue  { color: var(--accent2); }
    .warn  { color: var(--warn); }
    .err   { color: var(--err); }

    /* ── Action breakdown ── */
    .section-title {
      font-size: 14px; font-weight: 600; color: var(--muted);
      text-transform: uppercase; letter-spacing: .6px;
      margin-bottom: 14px;
    }
    .breakdown { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
    .badge {
      padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;
      border: 1px solid transparent;
    }
    .badge.chat     { background: rgba(56,139,253,.15); color: var(--chat);    border-color: rgba(56,139,253,.3); }
    .badge.vision   { background: rgba(163,113,247,.15); color: var(--vision); border-color: rgba(163,113,247,.3); }
    .badge.bulletin { background: rgba(63,185,80,.15);  color: var(--bulletin);border-color: rgba(63,185,80,.3); }
    .badge.suit     { background: rgba(255,166,87,.15); color: var(--suit);    border-color: rgba(255,166,87,.3); }
    .badge.explain  { background: rgba(121,192,255,.15);color: var(--explain); border-color: rgba(121,192,255,.3); }

    /* ── Filters ── */
    .filters {
      display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;
    }
    .filters label { font-size: 13px; color: var(--muted); }
    .filters select, .filters input {
      background: var(--surface2); border: 1px solid var(--border);
      color: var(--text); border-radius: 6px; padding: 6px 10px; font-size: 13px;
      outline: none; font-family: inherit;
    }
    .filters select:focus, .filters input:focus { border-color: var(--accent2); }
    button#refresh-btn {
      margin-left: auto; background: var(--accent2);
      color: #fff; border: none; border-radius: 6px; padding: 7px 16px;
      font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity .15s;
    }
    button#refresh-btn:hover { opacity: .85; }

    /* ── Table ── */
    .table-wrap {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead { background: var(--surface2); }
    th {
      padding: 12px 16px; font-size: 12px; font-weight: 600;
      color: var(--muted); text-align: left; text-transform: uppercase;
      letter-spacing: .5px; border-bottom: 1px solid var(--border);
    }
    td {
      padding: 12px 16px; font-size: 13px;
      border-bottom: 1px solid rgba(48,54,61,.6);
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,.02); }

    .cell-query  { max-width: 260px; }
    .cell-response { max-width: 300px; }
    .cell-text   { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cell-full   { max-width: 260px; word-break: break-word; }

    .latency { font-variant-numeric: tabular-nums; }
    .latency.fast  { color: var(--accent); }
    .latency.mid   { color: var(--warn); }
    .latency.slow  { color: var(--err); }

    .status-ok       { color: var(--accent); }
    .status-error    { color: var(--err); }
    .status-fallback { color: var(--warn); }

    .action-pill {
      display: inline-block; padding: 2px 8px; border-radius: 12px;
      font-size: 11px; font-weight: 600; text-transform: uppercase;
    }

    .detail-btn {
      background: transparent; border: 1px solid var(--border); color: var(--accent2);
      border-radius: 6px; padding: 3px 10px; font-size: 12px;
      cursor: pointer; transition: background .15s;
    }
    .detail-btn:hover { background: rgba(88,166,255,.1); }

    /* ── Detail modal ── */
    .modal-backdrop {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,.65); z-index: 200;
      align-items: center; justify-content: center;
    }
    .modal-backdrop.open { display: flex; }
    .modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; max-width: 760px; width: 95%;
      max-height: 85vh; overflow-y: auto; padding: 28px;
      position: relative;
    }
    .modal h2 { font-size: 16px; margin-bottom: 20px; }
    .modal-close {
      position: absolute; top: 16px; right: 16px;
      background: none; border: none; color: var(--muted);
      font-size: 20px; cursor: pointer; line-height: 1;
    }
    .field-label { font-size: 11px; color: var(--muted); text-transform: uppercase;
                   letter-spacing: .5px; margin-bottom: 4px; margin-top: 14px; }
    .field-value {
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 6px; padding: 10px 12px; font-size: 13px;
      white-space: pre-wrap; word-break: break-word; max-height: 160px;
      overflow-y: auto;
    }

    /* ── Empty state ── */
    .empty { padding: 60px; text-align: center; color: var(--muted); }
    .empty .icon { font-size: 48px; margin-bottom: 12px; }
    .empty p { font-size: 14px; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  </style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-icon">🌾</div>
    <div>
      <h1>AgriSight — Trace AI</h1>
      <span>AI Interaction Observability Dashboard</span>
    </div>
  </div>
  <div id="refresh-badge">
    <div class="dot"></div>
    <span id="refresh-label">Auto-refresh every 15 s</span>
  </div>
</header>

<main>
  <!-- Stat cards -->
  <div class="cards" id="cards">
    <div class="card"><div class="card-label">Total Traces</div>
      <div class="card-value green" id="stat-total">—</div></div>
    <div class="card"><div class="card-label">Avg Latency</div>
      <div class="card-value blue" id="stat-latency">—</div>
      <div class="card-sub">ms per request</div></div>
    <div class="card"><div class="card-label">Errors</div>
      <div class="card-value" id="stat-errors">—</div></div>
    <div class="card"><div class="card-label">Last Updated</div>
      <div class="card-value" style="font-size:14px;padding-top:8px" id="stat-ts">—</div></div>
  </div>

  <!-- Action breakdown -->
  <div class="section-title">Actions</div>
  <div class="breakdown" id="breakdown"></div>

  <!-- Filters -->
  <div class="filters">
    <label>Action</label>
    <select id="filter-action">
      <option value="">All</option>
      <option value="chat">chat</option>
      <option value="vision">vision</option>
      <option value="bulletin">bulletin</option>
      <option value="suit">suit</option>
      <option value="explain">explain</option>
    </select>
    <label>Search</label>
    <input type="text" id="filter-query" placeholder="Filter query…" style="width:200px"/>
    <button id="refresh-btn" onclick="loadTraces()">↻ Refresh</button>
  </div>

  <!-- Table -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Time</th>
          <th>Action</th>
          <th>Query</th>
          <th>Model</th>
          <th>Response</th>
          <th>Latency</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="trace-body">
        <tr><td colspan="9" class="empty">
          <div class="icon">📡</div>
          <p>Loading traces…</p>
        </td></tr>
      </tbody>
    </table>
  </div>
</main>

<!-- Detail modal -->
<div class="modal-backdrop" id="modal-backdrop" onclick="closeModal(event)">
  <div class="modal" id="modal-box">
    <button class="modal-close" onclick="document.getElementById('modal-backdrop').classList.remove('open')">✕</button>
    <h2>Trace Detail — <span id="modal-id"></span></h2>
    <div id="modal-body"></div>
  </div>
</div>

<script>
  let allTraces = [];

  // ── Fetch traces from API ──
  async function loadTraces() {
    const action = document.getElementById('filter-action').value;
    const url = '/traces?limit=200' + (action ? '&action=' + action : '');
    try {
      const res = await fetch(url);
      const data = await res.json();
      allTraces = data.traces || [];
      renderStats(data.stats || {});
      renderBreakdown(data.stats?.by_action || {});
      renderTable(allTraces);
      document.getElementById('stat-ts').textContent = new Date().toLocaleTimeString();
    } catch(e) {
      console.error('Failed to load traces:', e);
    }
  }

  // ── Stats ──
  function renderStats(stats) {
    document.getElementById('stat-total').textContent = stats.total_traces ?? '—';
    const lat = stats.avg_latency_ms;
    const latEl = document.getElementById('stat-latency');
    latEl.textContent = lat ? lat.toFixed(0) : '—';
    latEl.className = 'card-value ' + (lat < 1000 ? 'green' : lat < 3000 ? 'warn' : 'err');
    const errEl = document.getElementById('stat-errors');
    errEl.textContent = stats.error_count ?? '—';
    errEl.className = 'card-value ' + ((stats.error_count || 0) > 0 ? 'err' : 'green');
  }

  // ── Breakdown badges ──
  function renderBreakdown(byAction) {
    const el = document.getElementById('breakdown');
    el.innerHTML = Object.entries(byAction)
      .map(([a, n]) => `<span class="badge ${a}">${a} <strong>${n}</strong></span>`)
      .join('') || '<span style="color:var(--muted);font-size:13px">No traces yet</span>';
  }

  // ── Table rows ──
  function renderTable(traces) {
    const q = document.getElementById('filter-query').value.toLowerCase();
    const filtered = q ? traces.filter(t => t.query.toLowerCase().includes(q)) : traces;
    const tbody = document.getElementById('trace-body');
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty"><div class="icon">🔍</div><p>No traces found</p></td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(t => {
      const lat = t.latency_ms;
      const latClass = lat < 1000 ? 'fast' : lat < 3000 ? 'mid' : 'slow';
      const statusClass = t.status === 'ok' ? 'status-ok' : t.status === 'fallback' ? 'status-fallback' : 'status-error';
      const ts = new Date(t.created_at + (t.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString();
      return `
        <tr>
          <td style="color:var(--muted);font-size:12px">#${t.id}</td>
          <td style="color:var(--muted);font-size:12px;white-space:nowrap">${ts}</td>
          <td><span class="action-pill badge ${t.action}">${t.action}</span></td>
          <td class="cell-query"><div class="cell-text" title="${esc(t.query)}">${esc(t.query)}</div></td>
          <td style="font-size:12px;color:var(--muted)">${esc(t.model)}</td>
          <td class="cell-response"><div class="cell-text" title="${esc(t.response)}">${esc(t.response)}</div></td>
          <td class="latency ${latClass}">${lat.toFixed(0)} ms</td>
          <td class="${statusClass}">${t.status}</td>
          <td><button class="detail-btn" onclick="showDetail(${t.id})">View</button></td>
        </tr>`;
    }).join('');
  }

  // ── Detail modal ──
  async function showDetail(id) {
    const res = await fetch('/traces/' + id);
    if (!res.ok) return;
    const t = await res.json();
    document.getElementById('modal-id').textContent = '#' + t.id;
    document.getElementById('modal-body').innerHTML = `
      <div class="field-label">Action</div>
      <div class="field-value"><span class="action-pill badge ${t.action}">${t.action}</span></div>
      <div class="field-label">Timestamp</div>
      <div class="field-value">${t.created_at}</div>
      <div class="field-label">Model</div>
      <div class="field-value">${esc(t.model)}</div>
      <div class="field-label">Latency</div>
      <div class="field-value">${t.latency_ms.toFixed(2)} ms</div>
      <div class="field-label">Status</div>
      <div class="field-value">${t.status}</div>
      <div class="field-label">Query</div>
      <div class="field-value">${esc(t.query)}</div>
      <div class="field-label">System Prompt</div>
      <div class="field-value">${esc(t.system_prompt) || '<em style="color:var(--muted)">not captured</em>'}</div>
      <div class="field-label">RAG Retrieved Chunks</div>
      <div class="field-value">${esc(JSON.stringify(t.retrieved, null, 2)) || '[]'}</div>
      <div class="field-label">Response</div>
      <div class="field-value">${esc(t.response)}</div>
    `;
    document.getElementById('modal-backdrop').classList.add('open');
  }

  function closeModal(e) {
    if (e.target === document.getElementById('modal-backdrop'))
      document.getElementById('modal-backdrop').classList.remove('open');
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Auto-refresh every 15 s ──
  loadTraces();
  setInterval(loadTraces, 15000);

  // Live filter on query input
  document.getElementById('filter-query').addEventListener('input', () => renderTable(allTraces));
  document.getElementById('filter-action').addEventListener('change', loadTraces);
</script>
</body>
</html>"""
