"""
Unit and integration tests for AI Tracking Agent (Agent 4 in pipeline)
"""

import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app
from agents.tracking_agent import run_tracking_agent, _build_fallback_report

client = TestClient(app)


def test_fallback_report_structure():
    """Verify that heuristic fallback generator returns complete, valid schema."""
    idea_data = {
        "title": "Smart Campus Shuttle Tracker",
        "desc": "Real-time bus tracking system with IoT GPS and mobile maps",
        "domain": "iot",
        "teamSize": "3",
        "durationDays": 45,
    }
    report = _build_fallback_report(idea_data)

    assert "milestones" in report
    assert len(report["milestones"]) >= 4
    assert report["overallProgress"] == 0
    assert report["totalMilestones"] == len(report["milestones"])
    assert len(report["immediateActionItems"]) >= 3
    assert len(report["facultyCheckpoints"]) >= 4
    assert "trackingMetrics" in report

    first_m = report["milestones"][0]
    assert "id" in first_m
    assert "phase" in first_m
    assert "title" in first_m
    assert "deliverables" in first_m
    assert len(first_m["deliverables"]) > 0
    assert "acceptanceCriteria" in first_m
    assert len(first_m["acceptanceCriteria"]) > 0


def test_tracking_agent_runner():
    """Verify run_tracking_agent executes and returns a valid tracking report."""
    idea_data = {
        "title": "Healthcare Patient Portal",
        "desc": "Telemedicine appointment scheduling with automated reminders",
        "domain": "web",
        "teamSize": "4",
        "durationDays": 30,
        "features": ["Appointment booking", "Video calling", "Prescription records"]
    }
    feasibility_report = {
        "overallScore": 88,
        "verdict": "Highly Feasible",
        "bottlenecks": ["WebRTC server setup complexity"]
    }
    scope_report = {
        "problemStatement": "Patients face long wait times for routine consultations.",
        "inScope": ["Patient auth", "Doctor booking", "Chat/Video room"],
        "outOfScope": ["Insurance claim processing"],
        "keyDeliverables": ["Web portal", "Notification service", "PostgreSQL database"]
    }
    tech_stack_report = {
        "recommendedStack": {
            "frontend": "React.js (Vite)",
            "backend": "FastAPI (Python)",
            "database": "PostgreSQL",
            "apis": "REST + Twilio WebRTC",
            "devops": "Docker",
            "testing": "Pytest"
        }
    }

    report = run_tracking_agent(
        idea_data=idea_data,
        feasibility_report=feasibility_report,
        scope_report=scope_report,
        tech_stack_report=tech_stack_report,
    )

    assert report is not None
    assert "milestones" in report
    assert len(report["milestones"]) >= 4
    assert report["totalMilestones"] == len(report["milestones"])
    assert report["overallProgress"] >= 0


def test_api_generate_tracking_endpoint():
    """Test POST /api/tracking endpoint."""
    payload = {
        "title": "AI Resume Scanner & Ranker",
        "desc": "NLP tool to parse resumes against job descriptions",
        "domain": "aiml",
        "teamSize": "2",
        "durationDays": 28,
        "features": ["PDF parsing", "BERT embeddings", "Match score"],
        "feasibilityReport": {
            "overallScore": 82,
            "verdict": "Feasible",
            "bottlenecks": ["BERT inference latency"]
        },
        "scopeReport": {
            "problemStatement": "Manual resume screening is slow and error-prone.",
            "inScope": ["PDF text extraction", "Skill matching", "Ranked dashboard"],
            "outOfScope": ["Video interview analysis"],
            "keyDeliverables": ["FastAPI inference service", "Streamlit UI"]
        },
        "techStackReport": {
            "recommendedStack": {
                "frontend": "Streamlit",
                "backend": "FastAPI",
                "database": "ChromaDB + SQLite",
                "apis": "HuggingFace Transformers",
                "devops": "Docker",
                "testing": "Pytest"
            }
        }
    }

    response = client.post("/api/tracking", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "milestones" in data
    assert len(data["milestones"]) >= 4
    assert data["totalMilestones"] == len(data["milestones"])
    assert "immediateActionItems" in data
    assert len(data["immediateActionItems"]) >= 3


def test_api_toggle_milestone_endpoint():
    """Test POST /api/tracking/toggle-milestone endpoint."""
    # Toggle milestone 1 as completed
    toggle_payload = {
        "title": "AI Resume Scanner & Ranker",
        "milestone_id": 1,
        "completed": True
    }
    res = client.post("/api/tracking/toggle-milestone", json=toggle_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["milestone_id"] == 1
    assert data["completed"] is True
    assert data["milestonesDone"] >= 1
    assert data["overallProgress"] > 0

    # Toggle milestone 1 back to incomplete
    toggle_payload["completed"] = False
    res2 = client.post("/api/tracking/toggle-milestone", json=toggle_payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["completed"] is False
