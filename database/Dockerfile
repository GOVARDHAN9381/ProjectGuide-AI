# ═══════════════════════════════════════════════════════
# AGRISIGHT — Production Dockerfile for Render Deployment
# Multi-stage build:
#   Stage 1: Build Vite React Frontend
#   Stage 2: Python 3.11 Backend (ChromaDB Vector RAG + API + Static Web Server)
# ═══════════════════════════════════════════════════════

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Python Backend + Static File Server
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-cache SentenceTransformer model into image so startup is fast & offline
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy backend files and knowledge base
COPY . .

# Copy compiled frontend from Stage 1 into static public directory
COPY --from=frontend-builder /app/dist /app/dist

# Ingest all markdown knowledge documents into ChromaDB at build time
RUN python -m rag.ingest

# Render exposes PORT environment variable (default 10000)
ENV PORT=10000
EXPOSE 10000

# Start unified production server
CMD ["python", "server.py"]
