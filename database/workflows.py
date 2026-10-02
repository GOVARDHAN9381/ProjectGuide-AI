from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from render import TaskContext, Workflows

app = Workflows()
BASE_DIR = Path(__file__).resolve().parent


@app.task(name="ingest_knowledge")
def ingest_knowledge(ctx: TaskContext) -> dict:
    """Rebuild the Chroma vector store from project knowledge files."""
    script = BASE_DIR / "rag" / "ingest.py"
    if not script.exists():
        raise FileNotFoundError(f"Missing ingestion script: {script}")

    subprocess.run([sys.executable, str(script)], check=True)
    return {
        "status": "ok",
        "script": str(script),
        "collection": "agrisight_knowledge",
        "knowledge_dir": str(BASE_DIR / "knowledge"),
    }


@app.task(name="health_check")
def health_check(ctx: TaskContext) -> dict:
    """Quick sanity check for the RAG stack."""
    env = os.environ.copy()
    env.setdefault("PYTHONPATH", str(BASE_DIR))

    result = subprocess.run(
        [sys.executable, "-c", "from rag.retriever import VectorRetriever; r=VectorRetriever(); print(r.collection.count() if r.collection else 0)"] ,
        cwd=str(BASE_DIR),
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    count = 0
    if result.returncode == 0:
        cleaned = result.stdout.strip()
        if cleaned:
            try:
                count = int(cleaned)
            except ValueError:
                pass

    return {
        "status": "ok" if result.returncode == 0 else "warning",
        "vector_count": count,
        "stdout": result.stdout.strip(),
        "stderr": result.stderr.strip(),
    }


if __name__ == "__main__":
    app.start()
