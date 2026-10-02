"""
Risk Assessment & Mitigation Agent API Router  (Agent 4 in the pipeline)

Exposes the CrewAI risk agent as a REST endpoint.
This endpoint REQUIRES the feasibility report (Agent 1), scope report (Agent 2),
and tech stack report (Agent 3) in the request body — enforcing the 4-agent chain.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

import schemas
from agents.risk_agent import run_risk_agent
from database import get_project_ideas_collection

router = APIRouter()


@router.post("/api/risk-assessment", response_model=schemas.RiskResponse)
def assess_risk(data: schemas.RiskRequest):
    """
    Assess risks and propose mitigations for a student project.

    Agent chaining (all required):
      - feasibilityReport  (from /api/feasibility-check)
      - scopeReport        (from /api/scope-definition)
      - techStackReport    (from /api/tech-stack)

    All three upstream reports are forwarded as context so the risk assessment
    is directly derived from the full 3-agent pipeline output.
    """
    try:
        # Validate chained inputs are present
        if not data.feasibilityReport:
            raise HTTPException(
                status_code=422,
                detail="feasibilityReport is required (run the Feasibility Agent first).",
            )
        if not data.scopeReport:
            raise HTTPException(
                status_code=422,
                detail="scopeReport is required (run the Scope Agent first).",
            )
        if not data.techStackReport:
            raise HTTPException(
                status_code=422,
                detail="techStackReport is required (run the Tech Stack Agent first).",
            )

        idea_data = {
            "title":        data.title,
            "desc":         data.desc,
            "domain":       data.domain,
            "teamSize":     data.teamSize,
            "durationDays": data.durationDays,
            "techIdeas":    data.techIdeas,
            "features":     data.features,
        }

        report = run_risk_agent(
            idea_data=idea_data,
            feasibility_report=data.feasibilityReport,
            scope_report=data.scopeReport,
            tech_stack_report=data.techStackReport,
        )

        # Best-effort: persist the risk report to MongoDB / local ideas.json
        _persist_risk_report(data, report)

        return report

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Risk Assessment agent error: {str(e)}",
        )


def _persist_risk_report(data: schemas.RiskRequest, report: dict) -> Optional[str]:
    """Save the risk report back to the project_idea document (best-effort)."""
    try:
        ideas_col = get_project_ideas_collection()

        idea_doc = ideas_col.find_one(
            {"title": data.title},
            sort=[("created_at", -1)],
        )
        if idea_doc:
            ideas_col.update_one(
                {"_id": idea_doc["_id"]},
                {"$set": {"riskReport": report}},
            )
            print(
                f"[RISK] Report saved to MongoDB "
                f"(idea={idea_doc['_id']}, ai_generated={report.get('aiGenerated')})"
            )
            return str(idea_doc["_id"])

        # Also update local ideas.json if available
        try:
            from routers.submission import _load_local_ideas, _save_local_ideas
            local_ideas = _load_local_ideas()
            for i_id, i_doc in local_ideas.items():
                if (data.idea_id and i_id == data.idea_id) or (i_doc.get("title") == data.title):
                    i_doc["riskReport"] = report
                    break
            _save_local_ideas(local_ideas)
        except Exception as e:
            print(f"[RISK] Notice: could not update local ideas.json: {e}")

    except Exception as exc:
        print(f"[RISK] WARNING: Could not persist report to MongoDB: {exc}")
    return None
