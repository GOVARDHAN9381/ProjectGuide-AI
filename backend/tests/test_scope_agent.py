"""
Tests for the Scope Agent (no-fallback version).
All scope and tech-stack output must come from the LLM — no predefined answers.
"""

import sys
import os
import pytest

# Allow imports from backend root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.scope_agent import _parse_json_from_text, run_scope_agent


class TestScopeAgentJsonParser:
    def test_parse_json_from_code_block(self):
        sample = '```json\n{"problemStatement": "Test problem", "objectives": ["Obj 1"]}\n```'
        parsed = _parse_json_from_text(sample)
        assert parsed.get("problemStatement") == "Test problem"
        assert parsed.get("objectives") == ["Obj 1"]

    def test_parse_plain_json(self):
        sample = '{"problemStatement": "Plain JSON", "inScope": ["Feature A"]}'
        parsed = _parse_json_from_text(sample)
        assert parsed.get("problemStatement") == "Plain JSON"

    def test_parse_empty_returns_empty_dict(self):
        assert _parse_json_from_text("") == {}
        assert _parse_json_from_text("no json here") == {}


class TestScopeAgentLiveIntegration:
    """Live end-to-end test: calls the real Groq LLM and asserts LLM-generated output."""

    IDEA_DATA = {
        "title": "Smart Attendance System",
        "desc": "A facial recognition based automated attendance system for college classrooms.",
        "domain": "aiml",
        "teamSize": "3",
        "durationDays": 60,
        "techIdeas": "OpenCV, FastAPI",
        "features": ["Face detection", "Attendance logging", "Report export"],
    }

    FEASIBILITY_REPORT = {
        "overallScore": 78,
        "verdict": "Feasible with Guidance",
        "metrics": {"technical": 75, "timeline": 80, "resource": 78, "skillMatch": 79},
        "strengths": ["Clear domain focus", "Manageable feature set"],
        "bottlenecks": ["Dataset collection may delay training", "GPU access needed for training"],
    }

    def test_run_scope_agent_returns_llm_output(self):
        report = run_scope_agent(
            idea_data=self.IDEA_DATA,
            student_skills={"Python": 4, "OpenCV": 3, "FastAPI": 3},
            feasibility_report=self.FEASIBILITY_REPORT,
        )

        # Must be marked as AI-generated — no predefined fallback allowed
        assert report.get("aiGenerated") is True, "Report must be LLM-generated (aiGenerated=True)"

        # Core fields must be populated by the LLM
        assert report.get("problemStatement"), "problemStatement must not be empty"
        assert isinstance(report.get("objectives"), list) and len(report["objectives"]) > 0
        assert isinstance(report.get("inScope"), list) and len(report["inScope"]) > 0
        assert isinstance(report.get("outOfScope"), list) and len(report["outOfScope"]) > 0
        assert report.get("targetUsers"), "targetUsers must not be empty"

        # Scores must be LLM-computed (not heuristic)
        assert "overallScore" in report
        assert 0 <= report["overallScore"] <= 100
        metrics = report.get("metrics", {})
        for key in ["clarity", "scopeControl", "achievability", "completeness"]:
            assert key in metrics, f"Missing metric: {key}"
            assert 0 <= metrics[key] <= 100

        def safe(s): return str(s).encode("ascii", "replace").decode("ascii")
        print(f"\n[SCOPE] overallScore={report['overallScore']}")
        print(f"[SCOPE] problemStatement={safe(report['problemStatement'][:120])}...")
        print(f"[SCOPE] inScope={[safe(x) for x in report['inScope']]}")
