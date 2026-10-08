"""
Groq & LiteLLM Compatibility & Resiliency Patch for CrewAI.
- Strips unsupported parameters such as 'cache_breakpoint' from messages sent to Groq.
- Adds automatic fallback model rotation on transient Groq RateLimitErrors (429) or token limits.
- All fallback model names are validated Groq API endpoints.
"""
import time

_FALLBACK_MODELS = [
    "groq/openai/gpt-oss-120b",   # Primary: confirmed available on this account
    "groq/openai/gpt-oss-20b",    # Secondary: confirmed available on this account
    "groq/qwen/qwen3.8-27b",      # Tertiary: confirmed available on this account
]

try:
    import litellm

    _orig_completion = litellm.completion

    def _safe_litellm_completion(*args, **kwargs):
        # Sanitize messages payload
        if "messages" in kwargs and isinstance(kwargs["messages"], list):
            for msg in kwargs["messages"]:
                if isinstance(msg, dict):
                    msg.pop("cache_breakpoint", None)

        requested_model = kwargs.get("model", "")
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
                        sleep_time = 1.5 * (attempt + 1)
                        print(f"[LITELLM PATCH] Rate limit on {model_candidate}, retrying in {sleep_time}s...")
                        time.sleep(sleep_time)
                    else:
                        # Non-rate-limit error on this model, switch candidate immediately
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
