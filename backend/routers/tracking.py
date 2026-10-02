"""
Milestone & Execution Tracking Agent API Router (Agent 4 in the pipeline)

Exposes the CrewAI tracking agent as a REST endpoint.
This endpoint chains outputs from:
  - Agent 1: Feasibility Report
  - Agent 2: Scope Report
  - Agent 3: Tech Stack Report

Also provides milestone progress toggle and live tracking endpoints.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException

import schemas
from agents.tracking_agent import run_tracking_agent
from database import (
    get_project_ideas_collection,
    get_tracking_reports_collection
)
from models import make_tracking_report_doc, now_utc

router = APIRouter()


@router.post("/api/tracking", response_model=schemas.TrackingResponse)
def generate_tracking_roadmap(data: schemas.TrackingRequest):
    """
    Generate an AI milestone & sprint tracking roadmap for a student project.
    Chains upstream outputs from Feasibility (Agent 1), Scope (Agent 2), and Tech Stack (Agent 3).
    """
    try:
        idea_data = {
            "title": data.title,
            "desc": data.desc,
            "domain": data.domain or "web",
            "teamSize": data.teamSize or "3",
            "durationDays": data.durationDays or 30,
            "techIdeas": data.techIdeas or "",
            "features": data.features or [],
        }

        student_skills = data.studentSkills or {}

        report = run_tracking_agent(
            idea_data=idea_data,
            feasibility_report=data.feasibilityReport,
            scope_report=data.scopeReport,
            tech_stack_report=data.techStackReport,
            student_skills=student_skills,
        )

        # Best-effort persistence to MongoDB & local storage
        _persist_tracking_report(data, report)

        return report

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Tracking agent error: {str(e)}",
        )


@router.post("/api/tracking/toggle-milestone", response_model=schemas.MilestoneToggleResponse)
def toggle_milestone(data: schemas.MilestoneToggleRequest):
    """
    Toggle milestone completion and recalculate overall progress.
    Updates MongoDB and local ideas storage.
    """
    try:
        milestone_id = data.milestone_id
        completed = data.completed
        updated_report = None

        # 1. Update MongoDB project_ideas collection if connected
        try:
            ideas_col = get_project_ideas_collection()
            query = {}
            if data.idea_id:
                from bson import ObjectId
                try:
                    query = {"_id": ObjectId(data.idea_id)}
                except Exception:
                    query = {"id": data.idea_id}
            elif data.title:
                query = {"title": data.title}

            if query:
                doc = ideas_col.find_one(query)
                if doc and "trackingReport" in doc:
                    report = doc["trackingReport"]
                    milestones = report.get("milestones", [])
                    for m in milestones:
                        if m.get("id") == milestone_id:
                            m["completed"] = completed
                            m["completedAt"] = datetime.utcnow().isoformat() if completed else None
                            m["status"] = "completed" if completed else "in_progress"
                            break

                    done = sum(1 for m in milestones if m.get("completed"))
                    tot = len(milestones)
                    pct = round((done / tot) * 100) if tot > 0 else 0

                    report["milestones"] = milestones
                    report["milestonesDone"] = done
                    report["overallProgress"] = pct

                    ideas_col.update_one(
                        {"_id": doc["_id"]},
                        {"$set": {
                            "trackingReport": report,
                            "milestonesDone": done,
                            "progress": pct,
                            "updated_at": now_utc()
                        }}
                    )
                    updated_report = report
        except Exception as db_err:
            print(f"[TRACKING] Notice: MongoDB update error: {db_err}")

        # 2. Update local ideas.json
        try:
            from routers.submission import _load_local_ideas, _save_local_ideas
            local_ideas = _load_local_ideas()
            for i_id, i_doc in local_ideas.items():
                match = (data.idea_id and (str(i_id) == str(data.idea_id) or str(i_doc.get("id")) == str(data.idea_id))) or \
                        (data.title and i_doc.get("title") == data.title)
                if match:
                    t_report = i_doc.get("trackingReport")
                    if t_report and "milestones" in t_report:
                        milestones = t_report.get("milestones", [])
                        for m in milestones:
                            if m.get("id") == milestone_id:
                                m["completed"] = completed
                                m["completedAt"] = datetime.utcnow().isoformat() if completed else None
                                m["status"] = "completed" if completed else "in_progress"
                                break

                        done = sum(1 for m in milestones if m.get("completed"))
                        tot = len(milestones)
                        pct = round((done / tot) * 100) if tot > 0 else 0

                        t_report["milestones"] = milestones
                        t_report["milestonesDone"] = done
                        t_report["overallProgress"] = pct
                        i_doc["trackingReport"] = t_report
                        i_doc["milestonesDone"] = done
                        i_doc["progress"] = pct
                        if not updated_report:
                            updated_report = t_report
                        break
            _save_local_ideas(local_ideas)
        except Exception as loc_err:
            print(f"[TRACKING] Notice: Local ideas update error: {loc_err}")

        if not updated_report:
            # Return baseline toggle response if record wasn't found
            return schemas.MilestoneToggleResponse(
                milestone_id=milestone_id,
                completed=completed,
                milestonesDone=1 if completed else 0,
                totalMilestones=4,
                overallProgress=25 if completed else 0
            )

        return schemas.MilestoneToggleResponse(
            milestone_id=milestone_id,
            completed=completed,
            milestonesDone=updated_report.get("milestonesDone", 0),
            totalMilestones=updated_report.get("totalMilestones", 4),
            overallProgress=updated_report.get("overallProgress", 0)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error toggling milestone: {str(e)}"
        )


@router.get("/api/tracking/{idea_id}", response_model=Optional[schemas.TrackingResponse])
def get_tracking_roadmap(idea_id: str):
    """Retrieve an existing tracking report by idea_id."""
    # Try MongoDB
    try:
        ideas_col = get_project_ideas_collection()
        from bson import ObjectId
        query = {}
        try:
            query = {"_id": ObjectId(idea_id)}
        except Exception:
            query = {"id": idea_id}
        doc = ideas_col.find_one(query)
        if doc and "trackingReport" in doc:
            return doc["trackingReport"]
    except Exception:
        pass

    # Try local ideas.json
    try:
        from routers.submission import _load_local_ideas
        local_ideas = _load_local_ideas()
        for i_id, i_doc in local_ideas.items():
            if str(i_id) == str(idea_id) or str(i_doc.get("id")) == str(idea_id):
                if "trackingReport" in i_doc:
                    return i_doc["trackingReport"]
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Tracking report not found")


def _persist_tracking_report(data: schemas.TrackingRequest, report: dict) -> Optional[str]:
    """Save tracking report to MongoDB Atlas and local ideas.json (best-effort)."""
    try:
        tracking_col = get_tracking_reports_collection()
        ideas_col = get_project_ideas_collection()

        idea_doc = ideas_col.find_one(
            {"title": data.title},
            sort=[("created_at", -1)],
        )
        idea_id = str(idea_doc["_id"]) if idea_doc else (data.idea_id or "")
        student_id = str(idea_doc.get("student_id", "")) if idea_doc else ""

        meta = {
            "title": data.title,
            "desc": data.desc,
            "domain": data.domain,
            "teamSize": data.teamSize,
            "durationDays": data.durationDays,
        }

        report_doc = make_tracking_report_doc(
            idea_id=idea_id,
            student_id=student_id,
            report=report,
            meta=meta,
        )

        if idea_id:
            tracking_col.update_one(
                {"idea_id": idea_id},
                {"$set": report_doc},
                upsert=True,
            )
            ideas_col.update_one(
                {"_id": idea_doc["_id"]} if idea_doc else {"id": idea_id},
                {"$set": {
                    "trackingReport": report,
                    "milestonesDone": report.get("milestonesDone", 0),
                    "totalMilestones": report.get("totalMilestones", len(report.get("milestones", []))),
                    "progress": report.get("overallProgress", 0),
                    "updated_at": now_utc(),
                }},
            )
            print(f"[TRACKING] Report persisted to MongoDB (idea={idea_id})")

        # Also update local ideas.json
        try:
            from routers.submission import _load_local_ideas, _save_local_ideas
            local_ideas = _load_local_ideas()
            for i_id, i_doc in local_ideas.items():
                if (data.idea_id and str(i_id) == str(data.idea_id)) or (i_doc.get("title") == data.title):
                    i_doc["trackingReport"] = report
                    i_doc["milestonesDone"] = report.get("milestonesDone", 0)
                    i_doc["totalMilestones"] = report.get("totalMilestones", len(report.get("milestones", [])))
                    i_doc["progress"] = report.get("overallProgress", 0)
                    break
            _save_local_ideas(local_ideas)
        except Exception as e:
            print(f"[TRACKING] Notice: could not update local ideas.json: {e}")

        return idea_id

    except Exception as exc:
        print(f"[TRACKING] Notice: MongoDB persistence skipped/failed: {exc}")
        return None
