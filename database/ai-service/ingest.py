# ═══════════════════════════════════════════════════════
# AGRI VISION — ai-service/ingest.py
# One-shot knowledge ingestor.
# Reads KNOWLEDGE_DIR, chunks each .txt file, embeds with
# sentence-transformers, and upserts into Qdrant.
# Runs automatically on `docker compose up` via the
# ai-service container (restart: no).
# ═══════════════════════════════════════════════════════

import os
import sys
import time
from pathlib import Path
from uuid import uuid4

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    VectorParams,
)
from sentence_transformers import SentenceTransformer

# ── Configuration (overridden by docker-compose env vars) ──
QDRANT_URL      = os.getenv("QDRANT_URL",      "http://localhost:6333")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "agrisight_knowledge")
MODEL_NAME      = "sentence-transformers/all-MiniLM-L6-v2"
VECTOR_DIM      = 384          # all-MiniLM-L6-v2 output dimension
KNOWLEDGE_DIR   = Path(__file__).parent / "knowledge"


# ── Helpers ────────────────────────────────────────────────
def chunk_text(text: str) -> list[str]:
    """
    Split on blank lines — each paragraph = one chunk.
    Falls back to 300-word sliding windows for very long paragraphs.
    """
    raw = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    for para in raw:
        words = para.split()
        if len(words) <= 300:
            chunks.append(para)
        else:
            # sliding window: 300 words, stride 150
            for start in range(0, len(words), 150):
                chunk = " ".join(words[start:start + 300])
                if chunk:
                    chunks.append(chunk)
    return chunks


def wait_for_qdrant(client: QdrantClient, retries: int = 10, delay: int = 3) -> None:
    """Block until Qdrant is healthy."""
    for i in range(retries):
        try:
            client.get_collections()
            print("[Qdrant] Connected")
            return
        except Exception as e:
            print(f"[Qdrant] Not ready yet ({i+1}/{retries}): {e}")
            time.sleep(delay)
    print("[Qdrant] Could not connect after retries — exiting")
    sys.exit(1)


def ensure_collection(client: QdrantClient) -> None:
    """Create collection if it doesn't already exist."""
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION_NAME in existing:
        print(f"[Qdrant] Collection '{COLLECTION_NAME}' already exists — skipping creation")
        return
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
    )
    print(f"[Qdrant] Created collection '{COLLECTION_NAME}'")


# ── Main ───────────────────────────────────────────────────
def main() -> None:
    print(f"[Ingestor] Qdrant URL : {QDRANT_URL}")
    print(f"[Ingestor] Collection : {COLLECTION_NAME}")
    print(f"[Ingestor] Knowledge  : {KNOWLEDGE_DIR}")

    # 1. Connect
    client = QdrantClient(url=QDRANT_URL)
    wait_for_qdrant(client)
    ensure_collection(client)

    # 2. Load embedding model
    print(f"[Ingestor] Loading model '{MODEL_NAME}' ...")
    model = SentenceTransformer(MODEL_NAME)
    print("[Ingestor] Model loaded")

    # 3. Ingest every .txt file in knowledge/
    txt_files = sorted(KNOWLEDGE_DIR.glob("*.txt"))
    if not txt_files:
        print(f"[Ingestor] No .txt files found in {KNOWLEDGE_DIR} — nothing to ingest")
        return

    total_points = 0
    for txt_file in txt_files:
        print(f"[Ingestor] Processing {txt_file.name} ...")
        text   = txt_file.read_text(encoding="utf-8")
        chunks = chunk_text(text)
        print(f"[Ingestor]   -> {len(chunks)} chunks")

        vectors = model.encode(chunks, normalize_embeddings=True, show_progress_bar=False)

        points = [
            PointStruct(
                id=str(uuid4()),
                vector=vec.tolist(),
                payload={"text": chunk, "source": txt_file.name},
            )
            for chunk, vec in zip(chunks, vectors)
        ]

        # Upsert in batches of 100 to avoid payload size limits
        batch_size = 100
        for i in range(0, len(points), batch_size):
            client.upsert(
                collection_name=COLLECTION_NAME,
                points=points[i:i + batch_size],
            )

        print(f"[Ingestor]   -> Uploaded {len(points)} vectors from {txt_file.name}")
        total_points += len(points)

    print(f"[Ingestor] Done — {total_points} total vectors in '{COLLECTION_NAME}'")


if __name__ == "__main__":
    main()
