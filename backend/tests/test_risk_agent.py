"""
Tests for Agent 4: Risk Assessment & Mitigation Agent

Covers:
  1. /api/risk-assessment enforces feasibilityReport (422 when missing)
  2. /api/risk-assessment enforces scopeReport (422 when missing)
  3. /api/risk-assessment enforces techStackReport (422 when missing)
  4. /api/risk-assessment succeeds with all chained inputs
  5. Fallback report has correct structure and keys
  6. Reasoning chain references upstream reports
  7. _parse_json_from_text handles raw JSON, fenced, and invalid text
  8. Risk score is clamped to 0–100
"""

import json
import pytest
from fastapi.testclient import TestClient

from main import app
from agents.risk_agent import (
    run_risk_agent,
    _build_fallback_report,
    _parse_json_from_text,
    _compute_risk_score,
    _overall_risk_label,
    _DOMAIN_RISKS,
)

client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared test fixtures
# ---------------------------------------------------------------------------

SAMPLE_FEASIBILITY = {
    "overallScore": 72,
    "verdict": "Feasible with Guidance",
    "metrics": {"technical": 70, "timeline": 68, "resource": 75, "skillMatch": 74},
    "strengths": ["Clear problem statement", "Motivated team"],
    "bottlenecks": ["Limited ML experience", "Tight 8-week timeline"],
    "aiGenerated": False,
}

SAMPLE_SCOPE = {
    "problemStatement": "Students lack a unified platform to track academic project progress.",
    "objectives": ["Build MVP within 8 weeks", "Support 3 concurrent users"],
    "inScope": ["User authentication", "Project idea submission", "AI feasibility check"],
    "outOfScope": ["Mobile app", "Payment gateway"],
    "targetUsers": "Undergraduate students and faculty",
    "keyDeliverables": ["Working web app", "3 agent pipeline", "Deployed on Render"],
    "assumptions": ["Team has basic Python knowledge"],
    "constraints": ["No paid APIs", "Team of 3, 8 weeks"],
    "aiGenerated": False,
    "feasibilityReport": SAMPLE_FEASIBILITY,
}

SAMPLE_TECH_STACK = {
    "recommendedStack": {
        "frontend": "React.js (Vite)",
        "backend": "FastAPI (Python)",
        "database": "PostgreSQL",
        "apis": "Groq API via httpx",
        "devops": "Docker, GitHub Actions",
        "testing": "Pytest",
    },
    "reasoning": [
        "Feasibility score is 72% so we should prefer well-documented frameworks.",
        "Scope constraints (8 weeks, 3 devs) favour FastAPI's low setup overhead.",
    ],
    "alternatives": [],
    "justification": "Stack chosen for developer productivity within the academic timeline.",
    "learningResources": ["https://fastapi.tiangolo.com", "https://react.dev"],
    "aiGenerated": False,
}

MINIMAL_IDEA = {
    "title": "AI Project Guide",
    "desc": "A platform for guiding student capstone projects using AI agents.",
    "domain": "web",
    "teamSize": "3",
    "durationDays": 56,
}

FULL_PAYLOAD = {
    **MINIMAL_IDEA,
    "idea_id": "",
    "student_email": "test@example.com",
    "techIdeas": "React, FastAPI, CrewAI",
    "features": ["auth", "idea submission", "feasibility check"],
    "studentSkills": {"Python": 3, "React": 2},
    "feasibilityReport": SAMPLE_FEASIBILITY,
    "scopeReport": SAMPLE_SCOPE,
    "techStackReport": SAMPLE_TECH_STACK,
}


# ---------------------------------------------------------------------------
# 1. Endpoint enforces feasibilityReport
# ---------------------------------------------------------------------------

def test_risk_endpoint_enforces_feasibility_report():
    payload = {
        **MINIMAL_IDEA,
        "feasibilityReport": {},   # empty dict — should be rejected
        "scopeReport": SAMPLE_SCOPE,
        "techStackReport": SAMPLE_TECH_STACK,
    }
    response = client.post("/api/risk-assessment", json=payload)
    # Empty dict is falsy → backend raises 422
    assert response.status_code == 422


def test_risk_endpoint_rejects_missing_feasibility_report():
    """Omitting feasibilityReport from the body causes Pydantic 422."""
    payload = {
        **MINIMAL_IDEA,
        "scopeReport": SAMPLE_SCOPE,
        "techStackReport": SAMPLE_TECH_STACK,
        # feasibilityReport deliberately omitted
    }
    response = client.post("/api/risk-assessment", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 2. Endpoint enforces scopeReport
# ---------------------------------------------------------------------------

def test_risk_endpoint_enforces_scope_report():
    payload = {
        **MINIMAL_IDEA,
        "feasibilityReport": SAMPLE_FEASIBILITY,
        "scopeReport": {},       # empty dict → 422
        "techStackReport": SAMPLE_TECH_STACK,
    }
    response = client.post("/api/risk-assessment", json=payload)
    assert response.status_code == 422


def test_risk_endpoint_rejects_missing_scope_report():
    """Omitting scopeReport causes Pydantic 422."""
    payload = {
        **MINIMAL_IDEA,
        "feasibilityReport": SAMPLE_FEASIBILITY,
        "techStackReport": SAMPLE_TECH_STACK,
    }
    response = client.post("/api/risk-assessment", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 3. Endpoint enforces techStackReport
# ---------------------------------------------------------------------------

def test_risk_endpoint_enforces_tech_stack_report():
    payload = {
        **MINIMAL_IDEA,
        "feasibilityReport": SAMPLE_FEASIBILITY,
        "scopeReport": SAMPLE_SCOPE,
        "techStackReport": {},   # empty dict → 422
    }
    response = client.post("/api/risk-assessment", json=payload)
    assert response.status_code == 422


def test_risk_endpoint_rejects_missing_tech_stack_report():
    """Omitting techStackReport causes Pydantic 422."""
    payload = {
        **MINIMAL_IDEA,
        "feasibilityReport": SAMPLE_FEASIBILITY,
        "scopeReport": SAMPLE_SCOPE,
    }
    response = client.post("/api/risk-assessment", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 4. Endpoint succeeds with all chained inputs (fallback path)
# ---------------------------------------------------------------------------

def test_risk_endpoint_success_with_all_chained_inputs():
    """
    With all three upstream reports provided and no API key set,
    the agent uses the heuristic fallback and returns a valid RiskResponse.
    """
    response = client.post("/api/risk-assessment", json=FULL_PAYLOAD)
    assert response.status_code == 200, response.text

    data = response.json()

    # Required top-level fields
    assert "overallRisk" in data
    assert data["overallRisk"] in ("High", "Medium", "Low")
    assert "riskScore" in data
    assert 0 <= data["riskScore"] <= 100
    assert "summary" in data and len(data["summary"]) > 10
    assert "risks" in data and isinstance(data["risks"], list)
    assert "topBlockers" in data and isinstance(data["topBlockers"], list)
    assert "reasoning" in data and isinstance(data["reasoning"], list)

    # Each risk item must have all required keys
    for risk in data["risks"]:
        for key in ("id", "title", "description", "category", "likelihood", "impact", "mitigation", "owner"):
            assert key in risk, f"Risk item missing key: {key}"
        assert risk["likelihood"] in ("High", "Medium", "Low")
        assert risk["impact"] in ("High", "Medium", "Low")

    # Each top blocker must have title and action
    for blocker in data["topBlockers"]:
        assert "title" in blocker and "action" in blocker


# ---------------------------------------------------------------------------
# 5. Fallback report structure
# ---------------------------------------------------------------------------

def test_fallback_report_has_correct_structure():
    report = _build_fallback_report(
        idea_data=MINIMAL_IDEA,
        feasibility_report=SAMPLE_FEASIBILITY,
        scope_report=SAMPLE_SCOPE,
        tech_stack_report=SAMPLE_TECH_STACK,
    )

    required_keys = ("overallRisk", "riskScore", "summary", "risks", "topBlockers", "reasoning", "aiGenerated")
    for key in required_keys:
        assert key in report, f"Fallback report missing key: {key}"

    assert report["aiGenerated"] is False
    assert report["overallRisk"] in ("High", "Medium", "Low")
    assert 0 <= report["riskScore"] <= 100
    assert len(report["risks"]) >= 1
    assert len(report["topBlockers"]) >= 1
    assert len(report["reasoning"]) >= 1


def test_fallback_report_domain_defaults_coverage():
    """Every domain in _DOMAIN_RISKS must return a valid fallback report."""
    from agents.risk_agent import _DOMAIN_RISKS
    for domain in _DOMAIN_RISKS.keys():
        idea = {**MINIMAL_IDEA, "domain": domain}
        report = _build_fallback_report(idea, SAMPLE_FEASIBILITY, SAMPLE_SCOPE, SAMPLE_TECH_STACK)
        assert report["overallRisk"] in ("High", "Medium", "Low"), f"Invalid risk label for domain {domain}"
        assert len(report["risks"]) >= 1, f"No risks for domain {domain}"


# ---------------------------------------------------------------------------
# 6. Reasoning chain references upstream reports
# ---------------------------------------------------------------------------

def test_fallback_reasoning_references_feasibility():
    """The reasoning chain should mention the feasibility score."""
    report = _build_fallback_report(
        idea_data=MINIMAL_IDEA,
        feasibility_report=SAMPLE_FEASIBILITY,
        scope_report=SAMPLE_SCOPE,
        tech_stack_report=SAMPLE_TECH_STACK,
    )
    reasoning_text = " ".join(report["reasoning"]).lower()
    # Should contain either the score number or 'feasib'
    assert "72" in reasoning_text or "feasib" in reasoning_text, \
        "Reasoning does not reference feasibility score"


def test_fallback_reasoning_references_domain():
    """The reasoning chain should mention the project domain."""
    report = _build_fallback_report(
        idea_data={**MINIMAL_IDEA, "domain": "aiml"},
        feasibility_report=SAMPLE_FEASIBILITY,
        scope_report=SAMPLE_SCOPE,
        tech_stack_report=SAMPLE_TECH_STACK,
    )
    reasoning_text = " ".join(report["reasoning"]).lower()
    assert "aiml" in reasoning_text or "ai" in reasoning_text or "domain" in reasoning_text


# ---------------------------------------------------------------------------
# 7. _parse_json_from_text variants
# ---------------------------------------------------------------------------

def test_parse_json_raw():
    text = '{"overallRisk": "High", "riskScore": 75}'
    result = _parse_json_from_text(text)
    assert result == {"overallRisk": "High", "riskScore": 75}


def test_parse_json_fenced_block():
    text = '```json\n{"overallRisk": "Medium", "riskScore": 50}\n```'
    result = _parse_json_from_text(text)
    assert result["overallRisk"] == "Medium"


def test_parse_json_embedded_in_prose():
    text = 'Here is the assessment: {"overallRisk": "Low", "riskScore": 20} Hope that helps.'
    result = _parse_json_from_text(text)
    assert result["overallRisk"] == "Low"


def test_parse_json_invalid_returns_empty():
    result = _parse_json_from_text("This is not JSON at all.")
    assert result == {}


def test_parse_json_empty_string():
    result = _parse_json_from_text("")
    assert result == {}


# ---------------------------------------------------------------------------
# 8. Risk score helpers
# ---------------------------------------------------------------------------

def test_compute_risk_score_all_high():
    risks = [
        {"likelihood": "High", "impact": "High"},
        {"likelihood": "High", "impact": "High"},
    ]
    score = _compute_risk_score(risks)
    assert score >= 65  # should be High territory


def test_compute_risk_score_all_low():
    risks = [
        {"likelihood": "Low", "impact": "Low"},
        {"likelihood": "Low", "impact": "Low"},
    ]
    score = _compute_risk_score(risks)
    assert score < 50  # should be lower territory


def test_risk_score_clamped():
    """Score must always stay within 0–100."""
    risks = [{"likelihood": "High", "impact": "High"}] * 20
    score = _compute_risk_score(risks)
    assert 0 <= score <= 100


def test_overall_risk_label_high():
    assert _overall_risk_label(70) == "High"


def test_overall_risk_label_medium():
    assert _overall_risk_label(50) == "Medium"


def test_overall_risk_label_low():
    assert _overall_risk_label(20) == "Low"
