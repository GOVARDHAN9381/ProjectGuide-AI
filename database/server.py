# ═══════════════════════════════════════════════════════
# AGRISIGHT — Production Unified Server for Render
# Combines:
#   1. React SPA Static File Serving (/dist)
#   2. ChromaDB Semantic Vector RAG (/api/retrieve)
#   3. Edge AI / Ollama Mock API (/ollama/api/chat, /api/chat)
#   4. Health Checks (/health)
# ═══════════════════════════════════════════════════════

import os
import json
import mimetypes
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"

from rag.retriever import VectorRetriever
from rag.ollama_server import synthesize_rag_response

retriever_instance = None

def get_retriever():
    global retriever_instance
    if retriever_instance is None:
        retriever_instance = VectorRetriever()
    return retriever_instance

class ProductionHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR) if DIST_DIR.exists() else str(BASE_DIR), **kwargs)

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
        # Health checks
        if self.path in ['/health', '/api/health', '/ollama/api/health']:
            r = get_retriever()
            count = r.collection.count() if r.collection else 0
            return self._send_json({
                'status': 'READY',
                'service': 'Agrisight Production RAG Service',
                'vectors_indexed': count,
            })

        # Ollama tags discovery
        if self.path in ['/ollama/api/tags', '/api/tags']:
            return self._send_json({
                'models': [
                    {
                        'name': 'gemma3:4b',
                        'model': 'gemma3:4b',
                        'size': 3300000000,
                        'details': {'family': 'gemma3', 'parameter_size': '4B'}
                    },
                    {
                        'name': 'llava:7b',
                        'model': 'llava:7b',
                        'size': 4100000000,
                        'details': {'family': 'llava', 'parameter_size': '7B'}
                    }
                ]
            })

        # Static File Serving (React SPA)
        req_path = self.path.split('?')[0].lstrip('/')
        target_file = DIST_DIR / req_path if req_path else DIST_DIR / "index.html"

        if target_file.exists() and target_file.is_file():
            mime_type, _ = mimetypes.guess_type(str(target_file))
            self.send_response(200)
            self.send_header('Content-Type', mime_type or 'application/octet-stream')
            self.send_header('Content-Length', str(target_file.stat().st_size))
            self.end_headers()
            with open(target_file, 'rb') as f:
                self.wfile.write(f.read())
            return

        # Fallback to index.html for React SPA Routing (HTML5 History API)
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(index_file.stat().st_size))
            self.end_headers()
            with open(index_file, 'rb') as f:
                self.wfile.write(f.read())
            return

        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            body = json.loads(post_data.decode('utf-8'))
        except Exception:
            body = {}

        # 1. RAG Retrieve endpoint
        if self.path in ['/api/retrieve', '/retrieve']:
            query = body.get('query', '')
            top_k = body.get('top_k', 3)
            r = get_retriever()
            results = r.search(query, top_k=top_k)
            return self._send_json({
                'query': query,
                'retrieved_chunks': results,
                'has_context': len(results) > 0,
                'count': len(results),
            })

        # 2. Chat / Advisory endpoint
        if self.path in ['/ollama/api/chat', '/api/chat', '/chat']:
            messages = body.get('messages', [])
            model = body.get('model', 'gemma3:4b')

            user_msg = ''
            for m in reversed(messages):
                if m.get('role') == 'user':
                    user_msg = m.get('content', '')
                    break

            has_images = any('images' in m for m in messages) or 'llava' in model.lower()

            if has_images:
                reply_content = json.dumps({
                    "crop": "Paddy / Rice",
                    "disease": "Nitrogen Deficiency & Early Leaf Blight",
                    "confidence": 92,
                    "severity": "Moderate",
                    "organic_treatment": "Apply Vermicompost @ 2 tonnes/acre and Neem Seed Kernel Extract (NSKE 5%).",
                    "chemical_treatment": "Top dress Urea (46% N) @ 25-30 kg/acre under moist soil conditions; spray Mancozeb 75 WP @ 2.5 g/L if fungal spots persist.",
                    "summary": "Plant leaf analysis indicates chlorosis (yellowing) due to nitrogen deficiency along with early fungal leaf spot lesions."
                }, ensure_ascii=False)
            else:
                r = get_retriever()
                results = r.search(user_msg, top_k=3, threshold=0.25)
                reply_content = synthesize_rag_response(user_msg, results)

            return self._send_json({
                'model': model,
                'message': {
                    'role': 'assistant',
                    'content': reply_content.strip()
                },
                'done': True
            })

        self._send_json({'error': 'Not Found'}, 404)

def run():
    port = int(os.environ.get("PORT", 10000))
    server = HTTPServer(("0.0.0.0", port), ProductionHandler)
    print("=" * 50)
    print(f"  AGRISIGHT PRODUCTION SERVER RUNNING ON PORT {port}")
    print("=" * 50)
    server.serve_forever()

if __name__ == '__main__':
    run()
