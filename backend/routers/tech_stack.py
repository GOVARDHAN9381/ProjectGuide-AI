"""
Tech Stack Recommendation Agent API Router  (Agent 3 in the pipeline)

Exposes the CrewAI tech-stack agent as a REST endpoint.
This endpoint REQUIRES the feasibility report (Agent 1 output) and the
scope report (Agent 2 output) in the request body — enforcing the agent
chaining that the faculty requested.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

import schemas
from agents.tech_stack_agent import run_tech_stack_agent
from database import get_project_ideas_collection

router = APIRouter()


@router.post("/api/tech-stack", response_model=schemas.TechStackResponse)
def recommend_tech_stack(data: schemas.TechStackRequest):
    """
    Recommend a technology stack for a student project.

    Agent chaining:
      - Requires `feasibilityReport` (from /api/feasibility-check)
      - Requires `scopeReport`       (from /api/scope-definition)

    Both upstream reports are forwarded as context to the LLM so the
    recommendation is directly derived from the prior agent outputs.
    """
    try:
        idea_data = {
            "title":        data.title,
            "desc":         data.desc,
            "domain":       data.domain,
            "teamSize":     data.teamSize,
            "durationDays": data.durationDays,
            "techIdeas":    data.techIdeas,
            "features":     data.features,
        }

        student_skills = data.studentSkills or {}

        # Validate chained inputs are present
        if not data.feasibilityReport:
            raise HTTPException(
                status_code=422,
                detail="feasibilityReport is required (run the Feasibility Agent first)."
            )
        if not data.scopeReport:
            raise HTTPException(
                status_code=422,
                detail="scopeReport is required (run the Scope Agent first)."
            )

        report = run_tech_stack_agent(
            idea_data=idea_data,
            feasibility_report=data.feasibilityReport,
            scope_report=data.scopeReport,
            student_skills=student_skills,
        )

        # Best-effort: update the project_idea in MongoDB with the tech stack report
        _persist_tech_stack(data, report)

        return report

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Tech Stack agent error: {str(e)}",
        )


def _persist_tech_stack(data: schemas.TechStackRequest, report: dict) -> Optional[str]:
    """Save the tech stack report back to the project_idea document (best-effort)."""
    try:
        ideas_col = get_project_ideas_collection()

        idea_doc = ideas_col.find_one(
            {"title": data.title},
            sort=[("created_at", -1)],
        )
        if idea_doc:
            ideas_col.update_one(
                {"_id": idea_doc["_id"]},
                {"$set": {"techStackReport": report}},
            )
            print(
                f"[TECH STACK] Report saved to MongoDB "
                f"(idea={idea_doc['_id']}, ai_generated={report.get('aiGenerated')})"
            )
            return str(idea_doc["_id"])

        # Also update local ideas.json if available
        try:
            from routers.submission import _load_local_ideas, _save_local_ideas
            local_ideas = _load_local_ideas()
            for i_id, i_doc in local_ideas.items():
                if (data.idea_id and i_id == data.idea_id) or (i_doc.get("title") == data.title):
                    i_doc["techStackReport"] = report
                    break
            _save_local_ideas(local_ideas)
        except Exception as e:
            print(f"[TECH STACK] Notice: could not update local ideas.json: {e}")

    except Exception as exc:
        print(f"[TECH STACK] WARNING: Could not persist report to MongoDB: {exc}")
    return None
