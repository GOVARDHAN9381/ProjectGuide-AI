#!/usr/bin/env python3
"""
Smoke-check script for the RAG stack in this repository.

Checks performed:
 - Local Chroma fallback store (rag/vector_store/chroma.sqlite3) via rag.retriever.VectorRetriever
 - Qdrant health at http://localhost:6333/healthz
 - Trace service health at http://localhost:8001/health

Run from repo root:
  python check_rag_stack.py

"""
from pathlib import Path
import json
import urllib.request
import urllib.error
import sys

REPO_ROOT = Path(__file__).resolve().parent
RAG_DIR = REPO_ROOT / "rag"
VECTOR_STORE = RAG_DIR / "vector_store"
CHROMA_SQLITE = VECTOR_STORE / "chroma.sqlite3"

print("\n=== AgriSight RAG stack quickcheck ===\n")

# 1) Local Chroma fallback store
print("1) Chroma fallback store check:")
if CHROMA_SQLITE.exists():
    print(f"  - Found chroma.sqlite3 at {CHROMA_SQLITE}")
    try:
        # Import retriever and run a sample query
        sys.path.insert(0, str(REPO_ROOT))
        from rag.retriever import VectorRetriever

        retr = VectorRetriever()
        q = "Why are rice leaves turning yellow"
        print(f"  - Running fallback search for: '{q}' ...")
        results = retr.search(q, top_k=3)
        print(f"  - Retrieved {len(results)} items (showing up to 3):")
        for r in results[:3]:
            print(f"    • id={r.get('id')} source={r.get('source')} topic={r.get('topic')} score={r.get('score')}")
    except Exception as e:
        print(f"  - Error running retriever: {e}")
else:
    print("  - chroma.sqlite3 not found — local Chroma fallback not available.")
    print("    Check rag/ingest.py or run rag/vector_server.py to create the collection.")

# 2) Qdrant health
print("\n2) Qdrant health check (http://localhost:6333/healthz):")
try:
    resp = urllib.request.urlopen('http://localhost:6333/healthz', timeout=3)
    body = resp.read().decode('utf-8')
    print(f"  - Qdrant responded: {body}")
except Exception as e:
    print(f"  - Qdrant not reachable: {e}")
    print("    If you use Docker, run: docker-compose up --build qdrant")

# 3) Trace service health
print("\n3) Trace service health (http://localhost:8001/health):")
try:
    resp = urllib.request.urlopen('http://localhost:8001/health', timeout=3)
    js = json.loads(resp.read().decode('utf-8'))
    print(f"  - Trace service status: {js.get('status')} total_traces={js.get('total_traces')} avg_latency_ms={js.get('avg_latency_ms')}")
except Exception as e:
    print(f"  - Trace service not reachable: {e}")
    print("    If you use Docker, run: docker-compose up --build trace-service")

print('\n=== Quick advice ===')
print(" - If chroma.sqlite3 exists but retriever returns 0 results, re-run ingestion (see rag/ingest.py or use rag/vector_server.py /api/ingest)")
print(" - To run the Python vector server: python rag\\vector_server.py (will start on port 8001 by default — avoid port conflict with trace-service)")
print(" - To export scrubbed traces for Trace Commons use: http://localhost:8001/export-traces?scrub_level=redact")
print('\n')
