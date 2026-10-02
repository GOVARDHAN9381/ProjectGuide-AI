from pathlib import Path
from uuid import uuid4

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from sentence_transformers import SentenceTransformer


QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "agrisight_knowledge"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

KNOWLEDGE_FILE = (
    Path(__file__).parent / "knowledge" / "crop_diseases.txt"
)


print("Connecting to Qdrant...")

client = QdrantClient(url=QDRANT_URL)

print("Loading embedding model...")

model = SentenceTransformer(MODEL_NAME)

print("Reading knowledge file...")

text = KNOWLEDGE_FILE.read_text(encoding="utf-8")

chunks = [
    chunk.strip()
    for chunk in text.split("\n\n")
    if chunk.strip()
]

print(f"Found {len(chunks)} knowledge chunks")

print("Creating embeddings...")

vectors = model.encode(
    chunks,
    normalize_embeddings=True
)

points = []

for chunk, vector in zip(chunks, vectors):
    points.append(
        PointStruct(
            id=str(uuid4()),
            vector=vector.tolist(),
            payload={
                "text": chunk,
                "source": "crop_diseases.txt"
            }
        )
    )

print("Uploading vectors to Qdrant...")

client.upsert(
    collection_name=COLLECTION_NAME,
    points=points
)

print(f"SUCCESS: Uploaded {len(points)} vectors to Qdrant")