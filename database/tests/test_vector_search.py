import sys
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def search_knowledge_vectors(query, top_k=3):
    print(f"\n[Search] Performing vector knowledge query: '{query}'")
    db_path = BASE_DIR / "rag" / "vector_store" / "chroma.sqlite3"
    
    if not db_path.exists():
        print(f"Error: Vector store not found at {db_path}")
        return []
    
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    
    # Query matching chunks from metadata & document text
    keywords = [w.lower() for w in query.split() if len(w) > 3]
    like_clauses = " OR ".join(["lower(string_value) LIKE ?" for _ in keywords])
    params = [f"%{k}%" for k in keywords]
    
    sql = f"""
    SELECT DISTINCT id, string_value 
    FROM embedding_metadata 
    WHERE key IN ('topic', 'crop', 'category') AND ({like_clauses})
    LIMIT ?
    """
    cur.execute(sql, (*params, top_k))
    rows = cur.fetchall()
    
    results = []
    print(f"\n[Results] Retrieved {len(rows)} matching vector chunks from ChromaDB:")
    for idx, (cid, topic) in enumerate(rows, 1):
        cur.execute("SELECT string_value FROM embedding_metadata WHERE id = ? AND key = 'source'", (cid,))
        src = cur.fetchone()
        source = src[0] if src else "knowledge_base"
        print(f"  {idx}. Topic: {topic}")
        print(f"     Source: {source}")
        print(f"     ID: {cid}\n")
        results.append({"id": cid, "topic": topic, "source": source})
        
    conn.close()
    return results

if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "rice disease yellow leaf management"
    search_knowledge_vectors(q)
