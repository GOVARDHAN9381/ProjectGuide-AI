"""
Agent Service for Backend
Connects FastAPI endpoints directly to the AI Agent Orchestrator.
"""
import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional

CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
AI_AGENT_DIR = PROJECT_ROOT / "AI-Agent"

if str(AI_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AI_AGENT_DIR))

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from agents.orchestrator import run_full_pipeline
except ImportError:
    try:
        from agents import run_full_pipeline
    except ImportError:
        # Direct file import fallback
        sys.path.insert(0, str(AI_AGENT_DIR / "agents"))
        from orchestrator import run_full_pipeline


def execute_agent_analysis(project_data: Dict[str, Any], student_skills: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    return run_full_pipeline(project_data, student_skills)
