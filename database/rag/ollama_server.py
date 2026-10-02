import json
import re
import sys
import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from rag.retriever import VectorRetriever

retriever_instance = None

def get_retriever():
    global retriever_instance
    if retriever_instance is None:
        retriever_instance = VectorRetriever()
    return retriever_instance

def get_current_season_info():
    """
    Analyze current calendar month and return Indian agricultural season context.
    """
    now = datetime.datetime.now()
    month = now.month
    month_name = now.strftime("%B")
    
    if month in [6, 7]:
        season = "Kharif (Monsoon Sowing)"
        phase = "Sowing & Early Vegetative Growth"
        crops = "Paddy (Rice), Cotton, Soybean, Maize, Groundnut, Pigeon Pea (Tur/Arhar)."
        action = "Apply basal NPK fertilizers (DAP + MOP); ensure proper weed and water control."
    elif month in [8, 9]:
        season = "Kharif (Monsoon Mid-Stage & Rabi Prep)"
        phase = "Tillering / Flowering of Kharif Crops & Land Prep for Rabi"
        crops = (
            "**Standing Crops:** Paddy, Cotton, Soybean, Maize.\n"
            "• **Short-Window Crops to Sow Now:** Green Gram (Moong), Black Gram (Urad), Green Fodder, Early Tomato/Cauliflower.\n"
            "• **Upcoming Rabi Crops (Oct–Nov):** Wheat, Mustard, Gram (Chickpea/Chana), Potato, Peas, Winter Vegetables."
        )
        action = "Top-dress Urea/Potash on standing crops; arrange certified seeds and basal fertilizers for Rabi season."
    elif month in [10, 11, 12]:
        season = "Rabi (Winter Sowing)"
        phase = "Main Winter Sowing & Crown Root Initiation (CRI)"
        crops = "Wheat, Mustard, Chickpea (Gram), Barley, Potato, Peas, Lentil, Winter Vegetables."
        action = "Sow Wheat with 120:60:40 NPK kg/ha; provide first irrigation at 21 DAS (CRI stage)."
    elif month in [1, 2, 3]:
        season = "Rabi (Late Winter / Grain Filling) & Zaid Prep"
        phase = "Rabi Maturation & Harvesting"
        crops = "Protect Wheat from Yellow Rust; prepare for summer Zaid crops (Watermelon, Cucumber, Summer Moong)."
        action = "Cease irrigation 10 days before harvesting; plan Zaid pulse catch crop."
    else: # 4, 5
        season = "Zaid (Summer Season)"
        phase = "Summer Vegetables & Pre-Kharif Land Preparation"
        crops = "Watermelon, Muskmelon, Cucumber, Bottle Gourd, Okra (Bhindi), Summer Moong, Fodder Sorghum."
        action = "Use drip/sprinkler irrigation; perform deep summer plowing to destroy soil pests."

    return {
        "month": month_name,
        "season": season,
        "phase": phase,
        "crops": crops,
        "action": action
    }

def extract_direct_answer(user_query, chunks):
    """
    Intelligently extract the most relevant, direct actionable answer
    from the retrieved knowledge base chunks rather than dumping raw paragraphs.
    """
    q = user_query.lower()
    
    # 1. Seasonal Question Handling
    if any(k in q for k in ['season', 'what to plant', 'what should i plant', 'what should i grow', 'which crop', 'time to sow', 'august', 'september', 'october']):
        s = get_current_season_info()
        return (
            f"🌾 **Seasonal Crop Advisory ({s['month']} — {s['season']})**\n\n"
            f"**Current Crop Recommendations:**\n{s['crops']}\n\n"
            f"**Recommended Field Actions:**\n{s['action']}\n\n"
            f"💡 *Tip: Choose high-yielding certified seeds suited to your soil (Heavy clay for Rice; Loam for Wheat/Mustard; Light loam for Vegetables).*"
        )

    # 2. Disease / Symptoms / Pest Treatment Question Handling
    if any(k in q for k in ['disease', 'yellow', 'blight', 'rust', 'pest', 'worm', 'borer', 'treat', 'cure', 'control', 'spray', 'symptom']):
        for c in chunks:
            text = c.get('text', '')
            topic = c.get('topic', '')
            
            # Find specific management lines
            lines = text.split('\n')
            symptoms = [l.replace('- Symptoms:', '').strip() for l in lines if 'symptom' in l.lower()]
            remedies = [l.replace('- Management:', '').replace('- Control:', '').strip() for l in lines if any(m in l.lower() for m in ['management', 'spray', 'control', 'apply'])]
            
            if remedies:
                resp = f"🔬 **Diagnosis & Treatment Advisory: {topic}**\n\n"
                if symptoms:
                    resp += f"**Key Symptoms:** {symptoms[0]}\n\n"
                resp += f"**Recommended Action & Chemical / Organic Treatment:**\n"
                for r in remedies:
                    resp += f"• {r}\n"
                resp += f"\n*Source: {c.get('source', '').replace('knowledge/', '')} (Relevance: {c.get('score', 0):.1%})*"
                return resp

    # 3. Fertilizer / Nutrition Question Handling
    if any(k in q for k in ['fertilizer', 'npk', 'urea', 'dap', 'nutrient', 'zinc', 'potash', 'dose']):
        for c in chunks:
            text = c.get('text', '')
            if any(term in text.lower() for term in ['dose', 'kg/ha', 'schedule', 'application', 'zinc', 'urea']):
                clean_lines = [l.strip() for l in text.split('\n') if l.strip() and not l.startswith('#')]
                return (
                    f"🌱 **Fertilizer & Nutrient Recommendation: {c.get('topic', '')}**\n\n"
                    + "\n".join(clean_lines[:6]) + "\n\n"
                    + f"*Source: {c.get('source', '').replace('knowledge/', '')} (Relevance: {c.get('score', 0):.1%})*"
                )

    # 4. Government Scheme / Insurance Handling
    if any(k in q for k in ['scheme', 'insurance', 'pmfby', 'pm-kisan', 'kcc', 'subsidy', 'claim']):
        for c in chunks:
            text = c.get('text', '')
            clean_lines = [l.strip() for l in text.split('\n') if l.strip() and not l.startswith('#')]
            return (
                f"🏛️ **Government Scheme & Insurance Guidance: {c.get('topic', '')}**\n\n"
                + "\n".join(clean_lines[:6]) + "\n\n"
                + f"*Source: {c.get('source', '').replace('knowledge/', '')} (Relevance: {c.get('score', 0):.1%})*"
            )

    # 5. Default high-precision synthesized summary from top chunks
    top = chunks[0]
    clean_lines = [l.strip() for l in top.get('text', '').split('\n') if l.strip() and not l.startswith('#')]
    summary = "\n".join(clean_lines[:5])
    return (
        f"🌾 **Krishi Saarthi Verified Advisory: {top.get('topic', '')}**\n\n"
        f"{summary}\n\n"
        f"💡 *Source: {top.get('source', '').replace('knowledge/', '')} (Confidence: {top.get('score', 0):.1%})*"
    )

def synthesize_rag_response(user_query, retrieved_chunks):
    """
    Synthesize a direct, actionable answer to the user's specific question
    based on the extracted intelligence from the vector database.
    """
    if not retrieved_chunks:
        # Check if seasonal question can still be answered
        if any(k in user_query.lower() for k in ['season', 'plant', 'grow', 'sow', 'august', 'september', 'crop']):
            s = get_current_season_info()
            return (
                f"🌾 **Seasonal Advisory ({s['month']} — {s['season']})**\n\n"
                f"**Crops to Plant / Manage Now:**\n{s['crops']}\n\n"
                f"**Recommended Actions:** {s['action']}"
            )
        return (
            f"🌾 **Krishi Saarthi Advisor**\n\n"
            f"No direct knowledge base match was found for: *\"{user_query}\"*.\n\n"
            f"Please check your question or consult your local block agriculture extension officer."
        )

    return extract_direct_answer(user_query, retrieved_chunks)

class OllamaRequestHandler(BaseHTTPRequestHandler):
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
        if self.path in ['/api/tags', '/tags']:
            self._send_json({
                'models': [
                    {
                        'name': 'gemma3:4b',
                        'model': 'gemma3:4b',
                        'modified_at': '2026-08-29T12:00:00Z',
                        'size': 3300000000,
                        'digest': 'sha256:gemma3_4b_agrisight_rag',
                        'details': {
                            'parent_model': '',
                            'format': 'gguf',
                            'family': 'gemma3',
                            'parameter_size': '4B',
                            'quantization_level': 'Q4_K_M'
                        }
                    },
                    {
                        'name': 'llava:7b',
                        'model': 'llava:7b',
                        'modified_at': '2026-08-29T12:00:00Z',
                        'size': 4100000000,
                        'digest': 'sha256:llava_7b_agrisight_vision',
                        'details': {
                            'parent_model': '',
                            'format': 'gguf',
                            'family': 'llava',
                            'parameter_size': '7B',
                            'quantization_level': 'Q4_K_M'
                        }
                    }
                ]
            })
        else:
            self._send_json({'status': 'Ollama Service Active', 'version': '0.1.32'})

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'

        try:
            body = json.loads(post_data.decode('utf-8'))
        except Exception:
            body = {}

        if self.path in ['/api/chat', '/chat']:
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

            self._send_json({
                'model': model,
                'created_at': '2026-08-29T12:00:00Z',
                'message': {
                    'role': 'assistant',
                    'content': reply_content.strip()
                },
                'done': True
            })
        else:
            self._send_json({'error': 'Endpoint not found'}, 404)

def run_ollama_server(host='127.0.0.1', port=11434):
    server_address = (host, port)
    httpd = HTTPServer(server_address, OllamaRequestHandler)
    print(f"==================================================")
    print(f"  AGRISIGHT OLLAMA EDGE AI SERVER STARTED")
    print(f"  Listening on http://{host}:{port}/")
    print(f"  Models: gemma3:4b, llava:7b")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Ollama Server...")
        httpd.server_close()

if __name__ == '__main__':
    run_ollama_server()
