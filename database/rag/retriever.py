import os
import re
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from rag.config import (
    VECTOR_STORE_DIR,
    COLLECTION_NAME,
    DEFAULT_TOP_K,
    SIMILARITY_THRESHOLD,
    DISTANCE_THRESHOLD,
    EMBEDDING_MODEL,
)

_embedding_model = None

def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        print(f"[VectorRetriever] Loading embedding model '{EMBEDDING_MODEL}' ...")
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        print("[VectorRetriever] Embedding model ready")
    return _embedding_model

CROPS_MAP = {
    "wheat": ["wheat", "gehun", "triticum", "yellow rust", "stripe rust", "karnal bunt"],
    "rice": ["rice", "paddy", "dhan", "oryza", "blast", "khaira"],
    "tomato": ["tomato", "tamatar", "lycopersicum", "early blight", "late blight", "curl virus"],
    "cotton": ["cotton", "kapas", "bollworm", "pink bollworm", "whitefly"],
    "maize": ["maize", "corn", "makka", "fall armyworm"],
    "groundnut": ["groundnut", "peanut", "mungfali", "tikka"],
    "mustard": ["mustard", "sarson", "rapeseed"],
    "pulses": ["gram", "chana", "chickpea", "moong", "urad", "tur", "arhar", "lentil", "dal"],
}

CATEGORY_MAP = {
    "diseases": ["disease", "symptom", "blight", "blast", "rust", "rot", "wilt", "canker", "virus", "fungus", "fungicide", "cure", "treat", "control", "yellowing"],
    "pests": ["pest", "insect", "borer", "bollworm", "whitefly", "aphid", "caterpillar", "bug", "spray", "trap"],
    "fertilizers": ["fertilizer", "npk", "urea", "dap", "mop", "nitrogen", "phosphorus", "potash", "zinc", "nutrient", "dose", "manure", "deficiency"],
    "irrigation": ["irrigation", "water", "drip", "sprinkler", "moisture", "drainage", "awd", "flood"],
    "government": ["scheme", "pmfby", "pm-kisan", "insurance", "subsidy", "claim", "soil health card", "kcc", "portal", "yojana"],
    "crops": ["season", "plant", "sow", "variety", "hybrid", "spacing", "kharif", "rabi", "zaid", "harvest", "grow"],
}

def extract_query_entities(query):
    q = query.lower()
    matched_crops = []
    for crop, synonyms in CROPS_MAP.items():
        if any(re.search(r'\b' + re.escape(syn) + r'\b', q) for syn in synonyms):
            matched_crops.append(crop)

    matched_cats = []
    for cat, synonyms in CATEGORY_MAP.items():
        if any(re.search(r'\b' + re.escape(syn) + r'\b', q) for syn in synonyms):
            matched_cats.append(cat)

    return matched_crops, matched_cats

class VectorRetriever:
    def __init__(self, vector_store_dir=VECTOR_STORE_DIR, collection_name=COLLECTION_NAME):
        self.vector_store_dir = vector_store_dir
        self.collection_name = collection_name
        self.client = None
        self.collection = None
        self._initialize()

    def _initialize(self):
        try:
            import chromadb
            if not os.path.exists(self.vector_store_dir):
                print(f"[VectorRetriever] Store directory does not exist yet: {self.vector_store_dir}")
                return

            self.client = chromadb.PersistentClient(path=self.vector_store_dir)
            self.collection = self.client.get_collection(name=self.collection_name)
            count = self.collection.count()
            print(f"[VectorRetriever] Connected to ChromaDB collection '{self.collection_name}' ({count} vectors)")
        except Exception as e:
            print(f"[VectorRetriever] Initialization note: {e}")
            self.collection = None

    def search(self, query, top_k=None, threshold=None):
        """
        Hybrid Semantic Search with Keyword Re-ranking & Entity Boosting:
        1. Queries ChromaDB for top 12 semantic candidates.
        2. Re-ranks candidates based on exact crop matching, category matching, and keyword coverage.
        3. Returns top_k highest precision chunks.
        """
        top_k = top_k or DEFAULT_TOP_K
        threshold = threshold if threshold is not None else 0.20

        if not query or not query.strip():
            return []

        if self.collection is not None:
            return self._hybrid_semantic_search(query, top_k, threshold)

        return self._sqlite_keyword_fallback(query, top_k)

    def _hybrid_semantic_search(self, query, top_k, similarity_threshold):
        try:
            model = _get_embedding_model()
            query_embedding = model.encode(
                [query],
                normalize_embeddings=True,
                show_progress_bar=False,
            ).tolist()

            # Retrieve larger candidate pool (top 15) for re-ranking
            n_candidates = min(15, self.collection.count() or 15)
            results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=n_candidates,
                include=["documents", "metadatas", "distances"],
            )

            documents  = results.get("documents",  [[]])[0]
            metadatas  = results.get("metadatas",  [[]])[0]
            distances  = results.get("distances",  [[]])[0]
            ids        = results.get("ids",        [[]])[0]

            query_crops, query_cats = extract_query_entities(query)
            query_keywords = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', query) if w.lower() not in [
                "what", "when", "where", "which", "how", "should", "could", "would", "about", "your", "with", "this", "that"
            ]]

            scored_candidates = []
            for doc, meta, dist, cid in zip(documents, metadatas, distances, ids):
                # 1. Cosine similarity score [0, 1]
                dense_similarity = max(0.0, 1.0 - dist / 2.0)

                doc_lower = doc.lower()
                chunk_crop = meta.get("crop", "general").lower()
                chunk_cat = meta.get("category", "general").lower()
                topic_lower = meta.get("topic", "").lower()

                # 2. Keyword Match Ratio
                matched_kw_count = sum(1 for kw in query_keywords if kw in doc_lower or kw in topic_lower)
                keyword_score = matched_kw_count / max(1, len(query_keywords))

                # 3. Entity & Crop Matching Boost
                crop_boost = 0.0
                if query_crops:
                    if chunk_crop in query_crops:
                        crop_boost = 0.25  # Big boost for exact crop match
                    elif chunk_crop != "general" and not any(qc in chunk_crop for qc in query_crops):
                        crop_boost = -0.30 # Penalize mismatched specific crops (e.g. rice when asking about wheat)

                # 4. Category Match Boost
                cat_boost = 0.0
                if query_cats and chunk_cat in query_cats:
                    cat_boost = 0.15

                # 5. Composite Final Score
                final_score = (0.50 * dense_similarity) + (0.25 * keyword_score) + crop_boost + cat_boost
                final_score = round(max(0.0, min(1.0, final_score)), 4)

                if final_score < similarity_threshold:
                    continue

                scored_candidates.append({
                    "id":       str(cid),
                    "source":   meta.get("source",   "knowledge_base"),
                    "category": chunk_cat,
                    "crop":     chunk_crop,
                    "topic":    meta.get("topic",     "General"),
                    "text":     doc,
                    "score":    final_score,
                    "dense_score": round(dense_similarity, 4),
                    "distance": round(dist, 4),
                })

            # Sort by re-ranked composite score
            scored_candidates.sort(key=lambda x: x["score"], reverse=True)

            # Deduplicate similar chunks from same document section
            unique_results = []
            seen_topics = set()
            for cand in scored_candidates:
                key = f"{cand['source']}::{cand['topic']}"
                if key not in seen_topics or len(unique_results) < top_k:
                    seen_topics.add(key)
                    unique_results.append(cand)
                if len(unique_results) >= top_k:
                    break

            return unique_results

        except Exception as e:
            print(f"[VectorRetriever] Hybrid search error: {e}")
            return []

    def _sqlite_keyword_fallback(self, query, top_k=3):
        import sqlite3
        db_path = os.path.join(self.vector_store_dir, "chroma.sqlite3")
        if not os.path.exists(db_path):
            return []
        try:
            conn = sqlite3.connect(db_path)
            cur  = conn.cursor()
            keywords = [w.lower() for w in query.split() if len(w) > 2]
            if not keywords:
                conn.close()
                return []

            like_clauses = " OR ".join(["lower(string_value) LIKE ?" for _ in keywords])
            params       = [f"%{k}%" for k in keywords]
            cur.execute(
                f"SELECT DISTINCT id, string_value "
                f"FROM embedding_metadata "
                f"WHERE key IN ('topic', 'crop', 'category') "
                f"AND ({like_clauses}) LIMIT ?",
                (*params, top_k),
            )
            rows = cur.fetchall()

            retrieved = []
            for cid, topic in rows:
                cur.execute(
                    "SELECT string_value FROM embedding_metadata WHERE id = ? AND key = 'source'",
                    (cid,),
                )
                src    = cur.fetchone()
                source = src[0] if src else "knowledge_base"
                retrieved.append({
                    "id":       str(cid),
                    "source":   source,
                    "category": "general",
                    "crop":     "general",
                    "topic":    topic,
                    "text":     f"Topic: {topic} from {source}",
                    "score":    0.50,
                    "distance": 1.00,
                })
            conn.close()
            return retrieved

        except Exception as e:
            print(f"[VectorRetriever] SQLite keyword fallback error: {e}")
            return []

def main():
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = "How much urea and DAP should I apply for wheat crop?"

    print(f"\nQuerying ChromaDB for: '{query}'")
    retriever = VectorRetriever()
    results   = retriever.search(query, top_k=3)

    print(f"\nRetrieved {len(results)} high-precision chunks:\n")
    for r in results:
        print(f"  [Score: {r['score']} | Dense: {r.get('dense_score', 0):.3f}] "
              f"{r['source']} ({r['crop']}) -> \"{r['topic']}\"")
        print(f"  Text: {r['text'][:140]}...\n")

if __name__ == "__main__":
    main()
