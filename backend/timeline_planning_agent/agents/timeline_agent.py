"""
Compatibility shim redirecting to unified backend/agents/timeline_agent.py
"""
from agents.timeline_agent import timeline_agent, llm

__all__ = ["timeline_agent", "llm"]