"""
Feasibility Agent API Router
Exposes the CrewAI feasibility agent as a REST endpoint and persists
the generated report to MongoDB Atlas.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

import schemas
from agents.feasibility_agent import run_feasibility_agent
from database import get_feasibility_reports_collection, get_project_ideas_collection
from models import make_feasibility_report_doc

router = APIRouter()


@router.post("/api/feasibility-check", response_model=schemas.FeasibilityResponse)
def check_feasibility(data: schemas.FeasibilityRequest):
    """
    Analyze a student project idea for feasibility using the CrewAI agent.
    Optionally accepts uploaded files (base64) for richer context.
    The generated report is persisted to the 'feasibility_reports' collection.
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

        report = run_feasibility_agent(
            idea_data=idea_data,
            student_skills=student_skills,
            uploaded_files=uploaded_files,
        )

        # ------------------------------------------------------------------
        # Persist the feasibility report to MongoDB
        # ------------------------------------------------------------------
        _persist_report(data, report)

        return report

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Feasibility agent error: {str(e)}",
        )


def _persist_report(data: schemas.FeasibilityRequest, report: dict) -> Optional[str]:
    """
    Save the feasibility report to MongoDB.

    Strategy:
      1. Look up the most-recent project_idea in MongoDB that matches by title
         to get its idea_id and student_id (best-effort — both are optional).
      2. Upsert on (idea_id OR title) so re-runs overwrite the previous report
         rather than creating duplicates.

    Returns the inserted/updated report _id as a string, or None on failure.
    """
    try:
        reports_col = get_feasibility_reports_collection()
        ideas_col = get_project_ideas_collection()

        # Try to find the matching project idea by title for linkage
        idea_doc = ideas_col.find_one(
            {"title": data.title},
            sort=[("created_at", -1)],  # most recent match
        )
        idea_id = str(idea_doc["_id"]) if idea_doc else None
        student_id = idea_doc.get("student_id") if idea_doc else None

        report_doc = make_feasibility_report_doc(
            idea_id=idea_id or "",
            student_id=student_id or "",
            report=report,
        )
        # Also persist the raw request context for future reference
        report_doc["project_title"] = data.title
        report_doc["project_desc"] = data.desc
        report_doc["domain"] = data.domain
        report_doc["team_size"] = data.teamSize
        report_doc["duration_days"] = data.durationDays
        report_doc["tech_ideas"] = data.techIdeas

        if idea_id:
            # Upsert: replace existing report for the same idea
            result = reports_col.update_one(
                {"idea_id": idea_id},
                {"$set": report_doc},
                upsert=True,
            )
            inserted_id = str(result.upserted_id) if result.upserted_id else idea_id
            
            # Also update the project_idea document with feasibility results
            try:
                ideas_col.update_one(
                    {"_id": idea_doc["_id"]},
                    {"$set": {
                        "feasibility": report.get("overallScore"),
                        "feasibilityReport": report,
                        "status": "reviewed",
                    }}
                )
            except Exception:
                pass
        else:
            # No linked idea — insert a standalone report
            result = reports_col.insert_one(report_doc)
            inserted_id = str(result.inserted_id)

        print(f"[FEASIBILITY] Report saved to MongoDB (id={inserted_id}, score={report.get('overallScore')})")

        # Also update local ideas.json if matching title or idea_id
        try:
            from routers.submission import _load_local_ideas, _save_local_ideas
            local_ideas = _load_local_ideas()
            for i_id, i_doc in local_ideas.items():
                if (data.idea_id and i_id == data.idea_id) or (i_doc.get("title") == data.title):
                    i_doc["feasibility"] = report.get("overallScore")
                    i_doc["feasibilityReport"] = report
                    i_doc["status"] = "reviewed"
                    break
            _save_local_ideas(local_ideas)
        except Exception as e:
            print(f"[FEASIBILITY] Notice: could not update local ideas.json: {e}")

        return inserted_id

    except Exception as exc:
        # Persisting is non-critical — log and continue so the API still responds
        print(f"[FEASIBILITY] WARNING: Could not persist report to MongoDB: {exc}")
        return None
