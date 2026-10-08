import os
import sys
from dotenv import load_dotenv
load_dotenv()

import litellm

# Monkeypatch litellm completion to strip unsupported properties like cache_breakpoint
_orig_completion = litellm.completion

def _safe_completion(*args, **kwargs):
    if "messages" in kwargs and isinstance(kwargs["messages"], list):
        for msg in kwargs["messages"]:
            if isinstance(msg, dict):
                msg.pop("cache_breakpoint", None)
    return _orig_completion(*args, **kwargs)

litellm.completion = _safe_completion

from crewai import LLM, Agent, Task, Crew

print("PYTHON:", sys.executable)
api_key = os.getenv("GROQ_API_KEY")
api_key_scope = os.getenv("GROQ_API_KEY_SCOPE")
api_key_tech = os.getenv("GROQ_API_KEY_TECH_STACK")

print("KEY 1:", api_key[:8] if api_key else "NONE")
print("KEY 2:", api_key_scope[:8] if api_key_scope else "NONE")
print("KEY 3:", api_key_tech[:8] if api_key_tech else "NONE")

# Test CrewAI with Groq
try:
    llm = LLM(
        model="groq/qwen/qwen3.8-27b",
        api_key=api_key,
        temperature=0.3
    )
    agent = Agent(
        role="Tester",
        goal="Say hello and give creative feedback",
        backstory="A test agent",
        llm=llm,
        verbose=False
    )
    task = Task(
        description="Return a brief JSON object: {\"status\": \"ok\", \"message\": \"Hello from LLM\"}",
        expected_output="Valid JSON string only",
        agent=agent
    )
    crew = Crew(agents=[agent], tasks=[task], verbose=False)
    res = crew.kickoff()
    print("SUCCESS CREWAI RESULT:", res)
except Exception as e:
    import traceback
    print("CREWAI ERROR:")
    traceback.print_exc()


