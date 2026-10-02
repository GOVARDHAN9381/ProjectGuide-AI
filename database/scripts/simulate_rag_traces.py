import time
import json
import urllib.request
import urllib.error

VECTOR_SERVER = "http://127.0.0.1:8002/retrieve"
TRACE_SERVICE = "http://127.0.0.1:8003/trace"
EXPORT_ENDPOINT = "http://127.0.0.1:8003/export-traces?scrub_level=redact"

queries = [
    "Why are my rice leaves turning yellow?",
    "How to treat tomato late blight?",
    "What N-P-K fertilizer ratio for rice?",
    "When should I irrigate rice during tillering?",
    "What's the current market price trend for rice in nearby mandis?",
    "How do I compute NDVI from drone imagery and what thresholds indicate stress?",
    "How many hours of light do tomato seedlings need in a greenhouse?",
]

headers = {"Content-Type": "application/json"}

def post_json(url, payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))


def get_json(url):
    with urllib.request.urlopen(url, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))


import hashlib


def synthesize_response(query, chunks):
    # Fallback synthesis (used only if Ollama is unavailable)
    texts = [c.get('text','') for c in chunks[:2]]
    joined = "\n\n".join(texts).strip()
    if not joined:
        joined = "No context found. Provide general advice: consult local extension office."
    resp = f"Advice for query: '{query}'\n\n{joined}\n\n(Disclaimer: simulated response for testing)"
    return resp


def call_ollama_with_context(system_prompt, query, model=None, timeout=25):
    """Call Ollama API (try frontend proxy then direct) with messages including retrieved context.
    Returns (response_text, used_model) or (None, None) on failure.
    """
    body = {
        'model': model or '',
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': query},
        ],
        'stream': False,
        'options': {
            'num_predict': 150,
            'temperature': 0.5,
        }
    }

    # Try common local proxies in order: Vite dev server proxy, Ollama direct HTTP API
    candidates = [
        'http://127.0.0.1:5174/ollama/api/chat',
        'http://127.0.0.1:11434/api/chat'
    ]

    data = json.dumps(body).encode('utf-8')
    for endpoint in candidates:
        try:
            req = urllib.request.Request(endpoint, data=data, headers={'Content-Type': 'application/json'}, method='POST')
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                j = json.loads(resp.read().decode('utf-8'))
                # Ollama returns { message: { content: '...' } } in many versions
                content = None
                used_model = None
                if isinstance(j, dict):
                    if 'message' in j and isinstance(j['message'], dict):
                        content = j['message'].get('content') or j['message'].get('thinking')
                    # Some Ollama variants return 'text' or 'response'
                    if not content:
                        content = j.get('text') or j.get('response')
                    # model name may be echoed back
                    used_model = j.get('model') or (j.get('message') or {}).get('model')
                if isinstance(content, str) and content.strip():
                    # strip internal thinking
                    content = content.replace('<think>', '').replace('</think>', '').strip()
                    return content, used_model
        except Exception as e:
            # Try next endpoint
            # print is intentional for local debugging
            print(f"Ollama call to {endpoint} failed: {e}")
            continue
    return None, None


if __name__ == '__main__':
    recorded = []
    for q in queries:
        payload = {'query': q}
        try:
            start = time.time()
            with urllib.request.urlopen(urllib.request.Request(VECTOR_SERVER, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST'), timeout=10) as r:
                vec = json.loads(r.read().decode('utf-8'))
            retrieved = vec.get('retrieved_chunks', [])
            # Build a system prompt including retrieved context for RAG-aware model call
            retrieved_texts = [c.get('text','') for c in retrieved[:4]]
            retrieved_joined = "\n\n".join(retrieved_texts).strip()
            system_prompt = 'You are Krishi Saarthi, an expert Indian farm advisor. Use the retrieved context to answer concisely.'
            if retrieved_joined:
                system_prompt += '\nRetrieved context:\n' + retrieved_joined

            # Try calling Ollama (frontend proxy or direct). Fallback to local synthesis if unavailable
            model_start = time.time()
            response_text, used_model = call_ollama_with_context(system_prompt, q)
            model_latency = (time.time() - model_start) * 1000.0
            total_latency = (time.time() - start) * 1000.0

            if not response_text:
                response_text = synthesize_response(q, retrieved)
                used_model = 'simulated-fallback'

            trace = {
                'action': 'chat',
                'query': q,
                'model': used_model or 'ollama-unknown',
                'response': response_text,
                'latency_ms': round(total_latency, 2),
                'retrieved_json': json.dumps(retrieved, ensure_ascii=False),
                'system_prompt': system_prompt,
                'status': 'ok',
            }

            resp = post_json(TRACE_SERVICE, trace)
            recorded.append(resp)
            print(f"Posted trace for query '{q}' -> {resp}")
        except Exception as e:
            print(f"Error for query '{q}': {e}")

    # Fetch exported scrubbed traces
    try:
        exported = get_json(EXPORT_ENDPOINT)
        open('export_traces_redact.json', 'w', encoding='utf-8').write(json.dumps(exported, indent=2, ensure_ascii=False))
        print('\nExported scrubbed traces saved to export_traces_redact.json')
        print('Export summary:', exported.get('count'))
    except Exception as e:
        print('Failed to fetch export-traces:', e)
