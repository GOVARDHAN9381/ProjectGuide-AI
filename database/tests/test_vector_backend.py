import os
import importlib


def test_vector_backend_config_prefers_actian(monkeypatch):
    import rag.config as config

    with monkeypatch.context() as scoped_env:
        scoped_env.setenv("RAG_VECTOR_DB_BACKEND", "actian")
        config = importlib.reload(config)
        assert config.VECTOR_DB_BACKEND == "actian"
    importlib.reload(config)
