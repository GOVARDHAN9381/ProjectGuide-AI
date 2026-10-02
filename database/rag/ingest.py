import os
import re
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from rag.config import (
    KNOWLEDGE_DIR,
    VECTOR_STORE_DIR,
    COLLECTION_NAME,
    EMBEDDING_MODEL,
)

CROP_KEYWORDS = {
    "rice": ["rice", "paddy", "oryza sativa", "khaira"],
    "wheat": ["wheat", "triticum", "yellow rust", "stripe rust", "karnal bunt"],
    "tomato": ["tomato", "lycopersicum", "early blight", "late blight", "leaf curl virus"],
    "cotton": ["cotton", "gossypium", "bollworm", "pink bollworm", "whitefly"],
    "maize": ["maize", "corn", "zea mays", "fall armyworm"],
    "groundnut": ["groundnut", "peanut", "tikka disease"],
    "mustard": ["mustard", "rapeseed", "brassica"],
    "pulses": ["gram", "chana", "chickpea", "moong", "urad", "tur", "arhar", "lentil", "masoor"],
}

CATEGORY_KEYWORDS = {
    "diseases": ["disease", "blight", "blast", "rust", "rot", "wilt", "canker", "virus", "symptom", "fungicide"],
    "pests": ["pest", "borer", "bollworm", "whitefly", "aphid", "hopper", "caterpillar", "insecticide", "trap"],
    "fertilizers": ["fertilizer", "npk", "urea", "dap", "mop", "nitrogen", "phosphorus", "potash", "zinc", "manure", "deficiency", "dose"],
    "irrigation": ["irrigation", "water", "drip", "sprinkler", "moisture", "drainage", "awd", "flooding"],
    "government": ["scheme", "pmfby", "pm-kisan", "insurance", "subsidy", "claim", "soil health card", "kcc"],
    "crops": ["season", "plant", "sow", "variety", "hybrid", "spacing", "harvest", "yield", "kharif", "rabi", "zaid"],
}

def infer_crop(text, file_path=""):
    combined = (str(file_path) + " " + text).lower()
    for crop, kws in CROP_KEYWORDS.items():
        if any(kw in combined for kw in kws):
            return crop
    return "general"

def infer_category(text, file_path=""):
    combined = (str(file_path) + " " + text).lower()
    for cat, kws in CATEGORY_KEYWORDS.items():
        if any(kw in combined for kw in kws):
            return cat
    return "general"

def chunk_document(file_path, content):
    """
    Fine-grained semantic chunker:
    - Splits by H1, H2, H3, and major list headings
    - Filters out useless title-only / header-only chunks (< 60 chars)
    - Injects document context & crop metadata into chunk text for maximum embedding precision
    """
    rel_path = str(file_path).replace("\\", "/")
    if "knowledge/" in rel_path:
        clean_source = "knowledge/" + rel_path.split("knowledge/")[1]
    else:
        clean_source = os.path.basename(file_path)

    # Split document by headers (# ## ###) or horizontal rules (---)
    raw_sections = re.split(r"(?=\n#{1,3}\s|\n---+\n)", content)
    chunks = []
    chunk_idx = 0

    doc_title = "Agricultural Guide"
    m_title = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if m_title:
        doc_title = m_title.group(1).strip()

    for section in raw_sections:
        trimmed = section.strip().lstrip("-").strip()
        if not trimmed:
            continue

        # Extract topic from header
        topic = doc_title
        header_match = re.search(r"^#{1,3}\s+(.+)$", trimmed, re.MULTILINE)
        if header_match:
            topic = header_match.group(1).strip()

        # Clean body text
        body_text = re.sub(r"^#{1,3}\s+.+$", "", trimmed, flags=re.MULTILINE).strip()

        # Check if section has sub-crops or sub-items (e.g. "1. **Paddy / Rice:** ... 2. **Wheat:**")
        sub_items = re.split(r"(?=\n\d+\.\s+\*\*|\n-\s+\*\*)", body_text)
        if len(sub_items) > 1 and len(body_text) > 250:
            for sub in sub_items:
                sub_clean = sub.strip()
                if len(sub_clean) < 40:
                    continue
                chunk_idx += 1
                
                sub_crop = infer_crop(sub_clean, file_path)
                sub_cat = infer_category(sub_clean, file_path)
                
                # Contextualized text with topic and crop for dense embedding
                enriched_text = f"[{doc_title} > {topic}] ({sub_crop.upper()} | {sub_cat.upper()}):\n{sub_clean}"
                
                chunks.append({
                    "id": f"{clean_source}#chunk_{chunk_idx}",
                    "source": clean_source,
                    "category": sub_cat,
                    "crop": sub_crop,
                    "topic": topic,
                    "text": enriched_text,
                })
            continue

        # Ignore tiny header-only snippets
        if len(body_text) < 40:
            continue

        chunk_idx += 1
        crop = infer_crop(trimmed, file_path)
        cat = infer_category(trimmed, file_path)
        
        enriched_text = f"[{doc_title} > {topic}] ({crop.upper()} | {cat.upper()}):\n{body_text}"

        chunks.append({
            "id": f"{clean_source}#chunk_{chunk_idx}",
            "source": clean_source,
            "category": cat,
            "crop": crop,
            "topic": topic,
            "text": enriched_text,
        })

    return chunks

def load_and_chunk_all_documents(knowledge_dir):
    all_chunks = []
    doc_count = 0

    knowledge_path = Path(knowledge_dir)
    if not knowledge_path.exists():
        print(f"Error: Knowledge directory does not exist at {knowledge_dir}")
        return doc_count, all_chunks

    for file_path in sorted(knowledge_path.glob("**/*")):
        if file_path.is_file() and file_path.suffix.lower() in [".md", ".txt"]:
            try:
                content = file_path.read_text(encoding="utf-8")
                if content.strip():
                    doc_count += 1
                    doc_chunks = chunk_document(file_path, content)
                    all_chunks.extend(doc_chunks)
            except Exception as e:
                print(f"Warning: Failed to read {file_path}: {e}")

    return doc_count, all_chunks

class _LocalSentenceTransformerEF:
    """
    Offline embedding function wrapper around the locally-cached
    sentence-transformers all-MiniLM-L6-v2 model.
    """
    def __init__(self, model_name=EMBEDDING_MODEL):
        from sentence_transformers import SentenceTransformer
        print(f"[Ingestor] Loading local embedding model: '{model_name}' ...")
        self._model = SentenceTransformer(model_name)
        print("[Ingestor] Embedding model ready")

    def __call__(self, input):  # noqa: A002
        embeddings = self._model.encode(
            list(input),
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return embeddings.tolist()

def ingest_to_chromadb(documents_count, chunks):
    import chromadb

    os.makedirs(VECTOR_STORE_DIR, exist_ok=True)
    print(f"Initializing ChromaDB persistent client at: {VECTOR_STORE_DIR}")

    client = chromadb.PersistentClient(path=VECTOR_STORE_DIR)
    local_ef = _LocalSentenceTransformerEF(EMBEDDING_MODEL)

    try:
        client.delete_collection(name=COLLECTION_NAME)
        print(f"Cleared existing collection: '{COLLECTION_NAME}'")
    except Exception:
        pass

    collection = client.create_collection(
        name=COLLECTION_NAME,
        embedding_function=local_ef,
        metadata={"hnsw:space": "cosine"},
    )

    if not chunks:
        print("No chunks found to ingest.")
        return 0

    ids = [c["id"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "source": c["source"],
            "category": c["category"],
            "crop": c["crop"],
            "topic": c["topic"],
        }
        for c in chunks
    ]

    print(f"Generating embeddings and indexing {len(chunks)} fine-grained chunks into ChromaDB...")
    
    # Batch add
    batch_size = 50
    for i in range(0, len(chunks), batch_size):
        collection.add(
            ids=ids[i:i+batch_size],
            documents=documents[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size],
        )

    stored_count = collection.count()

    print("\n==================================================")
    print("  AGRISIGHT VECTOR DB INGESTION SUCCESSFUL")
    print("==================================================")
    print(f"Documents processed:      {documents_count}")
    print(f"Fine-grained chunks:      {len(chunks)}")
    print(f"Vectors stored in Chroma: {stored_count}")
    print("==================================================\n")

    return stored_count

def main():
    print("Starting Agrisight Knowledge Ingestion Pipeline...")
    doc_count, chunks = load_and_chunk_all_documents(KNOWLEDGE_DIR)
    ingest_to_chromadb(doc_count, chunks)

if __name__ == "__main__":
    main()
