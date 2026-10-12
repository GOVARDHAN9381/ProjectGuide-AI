"""
Risk Assessment Router (Milestone 3 — Agent 4)
POST /api/risk-assessment  →  Run Risk Agent
"""
import traceback
from fastapi import APIRouter
from pydantic import BaseModel, field_validator
from typing import Dict, Any

router = APIRouter()


class RiskRequest(BaseModel):
    title: str
    desc: str = ""
    domain: str = "web"
    teamSize: str = "3"
    durationDays: int = 30
    techIdeas: str = ""
    features: list = []
    studentSkills: Dict[str, Any] = {}
    feasibilityReport: Dict[str, Any]
    scopeReport: Dict[str, Any]
    techStackReport: Dict[str, Any]
    checkInData: Dict[str, Any] = {}

    @field_validator("feasibilityReport", "scopeReport", "techStackReport")
    @classmethod
    def require_upstream_report(cls, value):
        if not value:
            raise ValueError("Upstream report must not be empty")
        return value


@router.post("/api/risk-assessment")
def run_risk_assessment(req: RiskRequest):
    try:
        from agents.risk_agent import run_risk_agent
        idea_data = {
            "title": req.title,
            "desc": req.desc,
            "domain": req.domain,
            "teamSize": req.teamSize,
            "durationDays": req.durationDays,
            "techIdeas": req.techIdeas,
            "features": req.features,
        }
        report = run_risk_agent(
            idea_data=idea_data,
            student_skills=req.studentSkills or {},
            feasibility_report=req.feasibilityReport,
            scope_report=req.scopeReport,
            tech_stack_report=req.techStackReport,
            check_in_data=req.checkInData,
        )
        return report
    except Exception as e:
        traceback.print_exc()
        return {
            "overall_risk_score": 55,
            "risk_level": "Medium",
            "top_blocker": "Risk agent temporarily unavailable",
            "risks": [],
            "immediate_actions": ["Please try again in a moment."],
            "ai_generated": False,
            "error": str(e),
        }
