import os


def test_vector_backend_config_prefers_actian():
    os.environ["RAG_VECTOR_DB_BACKEND"] = "actian"
    from rag.config import VECTOR_DB_BACKEND

    assert VECTOR_DB_BACKEND == "actian"
