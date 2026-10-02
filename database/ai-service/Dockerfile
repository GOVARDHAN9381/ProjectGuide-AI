# ═══════════════════════════════════════════════════════
# AGRI VISION — ai-service/Dockerfile
# Builds the knowledge ingestor image.
# Pre-downloads the sentence-transformers model at build
# time so the first run is fast and works offline.
# ═══════════════════════════════════════════════════════

FROM python:3.11-slim

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model at build time
# (avoids slow first-run download; works air-gapped)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy source and knowledge files
COPY . .

# Run the ingestor — exits when done (restart: no in compose)
CMD ["python", "ingest.py"]
