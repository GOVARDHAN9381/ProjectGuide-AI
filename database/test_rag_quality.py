import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from rag.retriever import VectorRetriever

r = VectorRetriever()

queries = [
    'Why are my rice leaves turning yellow?',
    'What should I plant this season?',
    'How to control pink bollworm in cotton?',
    'What is the subsidy for drip irrigation under PMKSY?',
    'How much urea and DAP should I apply for wheat crop?'
]

for q in queries:
    print('='*70)
    print(f'QUERY: {q}')
    results = r.search(q, top_k=3, threshold=0.1)
    for idx, res in enumerate(results, 1):
        print(f"  [{idx}] (Score: {res['score']:.3f}) {res['topic']} | {res['source']}")
        print(f"      Text: {res['text'][:120]}...")
