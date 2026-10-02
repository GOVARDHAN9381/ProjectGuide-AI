Developer Portfolio — RAG + Qdrant + Trace AI

Overview

This document describes how the local RAG stack for AgriSight is wired and how to run it locally for development and demos.

Components

- Qdrant vector DB (docker-compose service `qdrant`) — REST on http://localhost:6333
- ai-service — knowledge ingestor (builds from ./ai-service, uploads vectors to Qdrant)
- trace-service — FastAPI service that stores model traces and serves a small live dashboard on http://localhost:8001/traces-ui
- rag/ — Python helpers (ingest.py, retriever.py, vector_server.py) used for RAG operations

Running (quickstart)

1. Install Docker & Docker Compose
2. From the repository root run:

   docker-compose up --build qdrant trace-service ai-service

3. Wait for qdrant to become healthy. ai-service runs once to ingest example knowledge and then exits. trace-service remains running.
4. Visit the Trace dashboard at http://localhost:8001/traces-ui to inspect recorded AI calls.

Files of interest

- rag/ingest.py — ingestion and embedding pipeline examples
- rag/retriever.py — simple retriever that talks to the vector store
- ai-service/ingest.py — example Dockerized ingestor that writes to Qdrant
- trace-service/main.py — FastAPI endpoints for recording and viewing traces

Useful commands

- Re-run ingestion: docker-compose up --build --force-recreate ai-service
- Start only trace and qdrant: docker-compose up --build qdrant trace-service

Notes

- The repository uses Ollama locally for LLM inference; pull the necessary models using Ollama before running end-to-end demos.
- If you prefer a managed vector DB, update docker-compose and rag/ code to point to your provider (Pinecone, Milvus, Weaviate, etc.).

Contact / Next steps

If you'd like, the next changes available are:
- Add a small UI button to trigger ingestion from the frontend
- Add an authenticated traces viewer scoped to developers
- Wire Trace events into per-user dashboards in the frontend

