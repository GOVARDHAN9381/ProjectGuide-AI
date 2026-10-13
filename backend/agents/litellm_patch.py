"""
Groq & LiteLLM Compatibility & Resiliency Patch for CrewAI.
- Strips unsupported parameters such as 'cache_breakpoint' from messages sent to Groq.
- Adds automatic fallback model rotation on transient Groq RateLimitErrors (429) or token limits.
- Automatically replaces deprecated models (like llama-3.3-70b-versatile) with confirmed active models.
"""
import os
import time

# Confirmed active Groq models for this organization:
# 1. groq/qwen/qwen3.8-27b
# 2. groq/openai/gpt-oss-120b
_PRIMARY_MODEL = "groq/qwen/qwen3.8-27b"
_FALLBACK_MODELS = [
    "groq/qwen/qwen3.8-27b",
    "groq/openai/gpt-oss-120b",
]

# Ensure environment variable never holds a decommissioned model
env_model = os.getenv("GROQ_MODEL", "")
if not env_model or "llama" in env_model.lower() or "mixtral" in env_model.lower():
    os.environ["GROQ_MODEL"] = _PRIMARY_MODEL

def _sanitize_model_name(model_name: str) -> str:
    if not model_name:
        return _PRIMARY_MODEL
    m_lower = model_name.lower()
    if "llama" in m_lower or "mixtral" in m_lower:
        return _PRIMARY_MODEL
    return model_name

try:
    import litellm

    _orig_completion = litellm.completion

    def _safe_litellm_completion(*args, **kwargs):
        # Sanitize messages payload
        if "messages" in kwargs and isinstance(kwargs["messages"], list):
            for msg in kwargs["messages"]:
                if isinstance(msg, dict):
                    msg.pop("cache_breakpoint", None)

        requested_model = _sanitize_model_name(kwargs.get("model", ""))
        models_to_try = [requested_model] if requested_model else []
        for alt in _FALLBACK_MODELS:
            if alt not in models_to_try:
                models_to_try.append(alt)

        last_error = None
        for model_candidate in models_to_try:
            kwargs["model"] = model_candidate
            for attempt in range(2):
                try:
                    return _orig_completion(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    err_str = str(e).lower()
                    if "rate limit" in err_str or "ratelimit" in err_str or "429" in err_str or "tokens" in err_str:
                        print(f"[LITELLM PATCH] Rate limit on {model_candidate}, switching to next model candidate or retrying...")
                        if attempt == 0:
                            time.sleep(1.0)
                        else:
                            # Break to next model in fallback list on second rate limit
                            break
                    else:
                        print(f"[LITELLM PATCH] Error on {model_candidate} ({e}), switching to next model candidate...")
                        break

        # If all candidates failed, raise the last exception
        if last_error:
            raise last_error

    litellm.completion = _safe_litellm_completion
except Exception:
    pass

try:
    import crewai.llms.cache

    crewai.llms.cache.mark_cache_breakpoint = lambda message: message
except Exception:
    pass

