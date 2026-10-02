import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from rag.config import (
    VECTOR_SERVER_HOST,
    VECTOR_SERVER_PORT,
    COLLECTION_NAME,
    DEFAULT_TOP_K,
    SIMILARITY_THRESHOLD,
    KNOWLEDGE_DIR,
)
from rag.retriever import VectorRetriever
from rag.ingest import load_and_chunk_all_documents, ingest_to_chromadb

# Global retriever instance
retriever_instance = None

def get_retriever():
    global retriever_instance
    if retriever_instance is None or retriever_instance.collection is None:
        retriever_instance = VectorRetriever()
    return retriever_instance

class VectorRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path in ['/', '/health', '/api/health']:
            retriever = get_retriever()
            count = retriever.collection.count() if retriever.collection else 0
            self._send_json({
                'status': 'READY' if count > 0 else 'EMPTY',
                'service': 'Agrisight ChromaDB Vector RAG Server',
                'collection': COLLECTION_NAME,
                'vector_count': count,
            })
        else:
            self._send_json({'error': 'Not Found'}, 404)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'

        try:
            body = json.loads(post_data.decode('utf-8'))
        except Exception:
            body = {}

        if self.path in ['/api/retrieve', '/retrieve']:
            query = body.get('query', '')
            top_k = body.get('top_k', DEFAULT_TOP_K)
            threshold = body.get('threshold', SIMILARITY_THRESHOLD)

            if not query or not query.strip():
                return self._send_json({'error': 'Query parameter required', 'retrieved_chunks': []}, 400)

            retriever = get_retriever()
            results = retriever.search(query, top_k=top_k, threshold=threshold)

            self._send_json({
                'query': query,
                'retrieved_chunks': results,
                'has_context': len(results) > 0,
                'count': len(results),
            })

        elif self.path in ['/api/ingest', '/ingest']:
            doc_count, chunks = load_and_chunk_all_documents(KNOWLEDGE_DIR)
            stored_count = ingest_to_chromadb(doc_count, chunks)

            global retriever_instance
            retriever_instance = None # Force refresh

            self._send_json({
                'message': 'Ingestion successful',
                'documents_processed': doc_count,
                'chunks_created': len(chunks),
                'vectors_stored': stored_count,
            })

        else:
            self._send_json({'error': 'Not Found'}, 404)

def run_server(host=VECTOR_SERVER_HOST, port=VECTOR_SERVER_PORT):
    server_address = (host, port)
    httpd = HTTPServer(server_address, VectorRequestHandler)
    print(f"==================================================")
    print(f"  AGRISIGHT CHROMADB VECTOR SERVER STARTED")
    print(f"  Listening on http://{host}:{port}/")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Vector Server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
