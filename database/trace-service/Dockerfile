# ═══════════════════════════════════════════════════════
# AGRI VISION — Trace AI  |  Dockerfile
# python:3.11-slim base keeps the image under 200 MB.
# SQLite is stdlib — no extra DB service needed.
# ═══════════════════════════════════════════════════════

FROM python:3.11-slim

# System deps (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# /data is where SQLite DB lives — mount a volume here
RUN mkdir -p /data

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fs http://localhost:${PORT:-8001}/health || exit 1

# Use shell form so we can respect the runtime $PORT env variable provided by Render
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
