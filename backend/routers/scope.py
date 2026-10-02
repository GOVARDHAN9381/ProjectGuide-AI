"""
Scope Definition Agent API Router
Exposes the CrewAI scope definition agent as a REST endpoint and persists
the generated report to MongoDB Atlas (scope_reports collection).
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

import schemas
from agents.scope_agent import run_scope_agent
from database import get_scope_reports_collection, get_project_ideas_collection
from models import make_scope_report_doc

router = APIRouter()


@router.post("/api/scope-definition", response_model=schemas.ScopeResponse)
def define_scope(data: schemas.ScopeRequest):
    """
    Take a raw student project idea and produce a clearly bounded scope
    using the CrewAI scope definition agent. Optionally accepts uploaded
    files (base64) and the student's skill profile for richer context.
    The generated report is persisted to the 'scope_reports' collection.
    """
    try:
        idea_data = {
            "title": data.title,
            "desc": data.desc,
            "domain": data.domain,
            "teamSize": data.teamSize,
            "durationDays": data.durationDays,
            "techIdeas": data.techIdeas,
            "features": data.features,
        }

        student_skills = data.studentSkills or {}

        uploaded_files = [
            {
                "name": f.name,
                "contentBase64": f.contentBase64,
                "contentType": f.contentType,
            }
            for f in (data.uploadedFiles or [])
        ]

        report = run_scope_agent(
            idea_data=idea_data,
            student_skills=student_skills,
            uploaded_files=uploaded_files,
            feasibility_report=data.feasibilityReport or {},  # Agent chaining
        )

        # ------------------------------------------------------------------
        # Agent chaining: embed the full Feasibility Report (Agent 1 output)
        # inside the Scope Report response so the frontend and downstream
        # agents (e.g. Tech Stack Agent) always receive both in one object.
        # ------------------------------------------------------------------
        if data.feasibilityReport:
            report["feasibilityReport"] = data.feasibilityReport

        # ------------------------------------------------------------------
        # Persist the scope report to MongoDB
        # ------------------------------------------------------------------
        _persist_scope_report(data, report)

        return report

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Scope definition agent error: {str(e)}",
        )


def _persist_scope_report(data: schemas.ScopeRequest, report: dict) -> Optional[str]:
    """
    Save the scope report to MongoDB (scope_reports collection).

    Strategy:
      1. Look up the most-recent project_idea in MongoDB that matches by title
         to get its idea_id and student_id.
      2. Upsert on idea_id so re-runs overwrite the previous report
         rather than creating duplicates.

    Returns the inserted/updated report _id as a string, or None on failure.
    """
    try:
        scope_col = get_scope_reports_collection()
        ideas_col = get_project_ideas_collection()

        # Try to find the matching project idea by title for linkage
        idea_doc = ideas_col.find_one(
            {"title": data.title},
            sort=[("created_at", -1)],  # most recent match
        )
        idea_id   = str(idea_doc["_id"]) if idea_doc else None
        student_id = idea_doc.get("student_id") if idea_doc else None

        meta = {
            "title":       data.title,
            "desc":        data.desc,
            "domain":      data.domain,
            "teamSize":    data.teamSize,
            "durationDays": data.durationDays,
            "techIdeas":   data.techIdeas,
        }

        report_doc = make_scope_report_doc(
            idea_id=idea_id or "",
            student_id=student_id or "",
            report=report,
            meta=meta,
        )

        if idea_id:
            # Upsert: replace existing scope report for the same idea
            result = scope_col.update_one(
                {"idea_id": idea_id},
                {"$set": report_doc},
                upsert=True,
            )
            inserted_id = str(result.upserted_id) if result.upserted_id else idea_id

            # Also update the project_idea document with scopeReport
            try:
                ideas_col.update_one(
                    {"_id": idea_doc["_id"]},
                    {"$set": {"scopeReport": report}}
                )
            except Exception:
                pass
        else:
            # No linked idea found — insert a standalone scope report
            result = scope_col.insert_one(report_doc)
            inserted_id = str(result.inserted_id)

        print(
            f"[SCOPE] Report saved to MongoDB "
            f"(id={inserted_id}, ai_generated={report.get('aiGenerated')})"
        )

        # Also update local ideas.json if matching title or idea_id
        try:
            from routers.submission import _load_local_ideas, _save_local_ideas
            local_ideas = _load_local_ideas()
            for i_id, i_doc in local_ideas.items():
                if (data.idea_id and i_id == data.idea_id) or (i_doc.get("title") == data.title):
                    i_doc["scopeReport"] = report
                    break
            _save_local_ideas(local_ideas)
        except Exception as e:
            print(f"[SCOPE] Notice: could not update local ideas.json: {e}")

        return inserted_id

    except Exception as exc:
        # Persisting is non-critical — log and continue so the API still responds
        print(f"[SCOPE] WARNING: Could not persist scope report to MongoDB: {exc}")
        return None