FROM python:3.11-slim

WORKDIR /app

# Install system deps for chromadb and onnxruntime
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY rag/requirements.txt /app/rag-requirements.txt
RUN pip install --no-cache-dir -r /app/rag-requirements.txt

# Copy project
COPY . /app

ENV PYTHONUNBUFFERED=1
ENV RAG_VECTOR_SERVER_PORT=8002
ENV RAG_KNOWLEDGE_DIR=/app/knowledge
ENV RAG_VECTOR_STORE_DIR=/app/rag/vector_store

EXPOSE 8002

CMD ["python", "rag/vector_server.py"]
