import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from models import (
    format_feasibility_report,
    format_scope_report,
    format_tech_stack_report,
    format_risk_report,
    format_tracking_report,
    make_feasibility_report_doc,
    make_scope_report_doc,
    make_tech_stack_report_doc,
    make_risk_report_doc,
    make_tracking_report_doc,
)


def test_feasibility_report_doc_and_formatting():
    raw_report = {
        "overallScore": 85,
        "verdict": "Feasible",
        "metrics": {"technical": 80, "timeline": 90, "resource": 85, "skillMatch": 85},
        "strengths": ["Strong tech stack"],
        "bottlenecks": ["Tight deadline"],
        "filesAnalyzed": [],
        "aiGenerated": True,
    }
    doc = make_feasibility_report_doc("idea_123", "student_456", raw_report)
    assert doc["idea_id"] == "idea_123"
    assert doc["student_id"] == "student_456"
    assert doc["overall_score"] == 85

    formatted = format_feasibility_report(doc)
    assert formatted["overallScore"] == 85
    assert formatted["verdict"] == "Feasible"
    assert formatted["aiGenerated"] is True


def test_scope_report_doc_and_formatting():
    raw_report = {
        "problemStatement": "Build a portal",
        "objectives": ["Obj 1"],
        "inScope": ["Scope 1"],
        "outOfScope": ["Out 1"],
        "targetUsers": "Students",
        "keyDeliverables": ["Web app"],
        "assumptions": ["Assump 1"],
        "constraints": ["Const 1"],
        "aiGenerated": True,
    }
    doc = make_scope_report_doc("idea_123", "student_456", raw_report)
    assert doc["idea_id"] == "idea_123"
    assert doc["problem_statement"] == "Build a portal"

    formatted = format_scope_report(doc)
    assert formatted["problemStatement"] == "Build a portal"
    assert formatted["targetUsers"] == "Students"


def test_tech_stack_report_doc_and_formatting():
    raw_report = {
        "recommendedStack": {"frontend": "React", "backend": "FastAPI", "database": "MongoDB"},
        "reasoning": ["Fast and scalable"],
        "alternatives": [],
        "justification": "Best match",
        "learningResources": ["docs.python.org"],
        "aiGenerated": True,
    }
    doc = make_tech_stack_report_doc("idea_123", "student_456", raw_report)
    assert doc["idea_id"] == "idea_123"
    assert doc["recommended_stack"]["frontend"] == "React"

    formatted = format_tech_stack_report(doc)
    assert formatted["recommendedStack"]["backend"] == "FastAPI"


def test_risk_report_doc_and_formatting():
    raw_report = {
        "overallRisk": "Low",
        "riskScore": 25,
        "summary": "Low overall risk profile.",
        "risks": [{"id": "R-01", "title": "Scope creep"}],
        "topBlockers": [],
        "reasoning": ["Solid plan"],
        "aiGenerated": True,
    }
    doc = make_risk_report_doc("idea_123", "student_456", raw_report)
    assert doc["idea_id"] == "idea_123"
    assert doc["overall_risk"] == "Low"

    formatted = format_risk_report(doc)
    assert formatted["overallRisk"] == "Low"
    assert formatted["riskScore"] == 25


def test_tracking_report_doc_and_formatting():
    raw_report = {
        "milestones": [{"id": 1, "title": "Setup", "completed": True}],
        "overallProgress": 50,
        "milestonesDone": 1,
        "totalMilestones": 2,
        "immediateActionItems": ["Start Phase 2"],
        "facultyCheckpoints": ["Week 4"],
        "trackingMetrics": {"velocity": "high"},
        "sprintMethodology": "Agile Scrum",
        "aiGenerated": True,
    }
    doc = make_tracking_report_doc("idea_123", "student_456", raw_report)
    assert doc["idea_id"] == "idea_123"
    assert doc["overall_progress"] == 50

    formatted = format_tracking_report(doc)
    assert formatted["overallProgress"] == 50
    assert formatted["milestonesDone"] == 1
