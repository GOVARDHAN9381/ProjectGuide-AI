import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = os.environ.get("RAG_KNOWLEDGE_DIR", str(BASE_DIR / "knowledge"))
VECTOR_STORE_DIR = os.environ.get("RAG_VECTOR_STORE_DIR", str(BASE_DIR / "rag" / "vector_store"))

# ChromaDB settings
COLLECTION_NAME = os.environ.get("RAG_COLLECTION_NAME", "agrisight_knowledge")
EMBEDDING_MODEL = os.environ.get("RAG_EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# Retrieval settings
DEFAULT_TOP_K = int(os.environ.get("RAG_TOP_K", 3))
SIMILARITY_THRESHOLD = float(os.environ.get("RAG_SIMILARITY_THRESHOLD", 0.35)) # Minimum cosine similarity
DISTANCE_THRESHOLD = float(os.environ.get("RAG_DISTANCE_THRESHOLD", 0.70))    # Maximum distance

# Server settings
# Prefer platform-provided PORT (e.g., Render) but fall back to RAG_VECTOR_SERVER_PORT
VECTOR_SERVER_PORT = int(os.environ.get("PORT", os.environ.get("RAG_VECTOR_SERVER_PORT", 8001)))
# Listen on all interfaces in container environments
VECTOR_SERVER_HOST = os.environ.get("RAG_VECTOR_SERVER_HOST", "0.0.0.0")

# Ollama settings
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma3:4b")
