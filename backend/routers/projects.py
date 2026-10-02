from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException

import schemas
from database import (
    project_ideas_col,
    project_milestones_col,
    project_analyses_col
)

router = APIRouter()


def build_project_response(project: dict) -> dict:
    p_id = project["id"]
    
    milestones_cursor = project_milestones_col.find({"project_id": p_id}).sort("phase_index", 1)
    milestones = []
    for ms in milestones_cursor:
        milestones.append({
            "id": ms.get("id"),
            "phase_index": ms.get("phase_index", 1),
            "week": ms.get("week_label", ""),
            "title": ms.get("title", ""),
            "desc": ms.get("desc", ""),
            "deliverables": ms.get("deliverables", []),
            "is_completed": bool(ms.get("is_completed", False))
        })

    analysis_doc = project_analyses_col.find_one({"project_id": p_id})
    analysis_data = None
    if analysis_doc:
        analysis_data = {
            "executive_summary": analysis_doc.get("executive_summary", ""),
            "feasibility": analysis_doc.get("feasibility_data", {}),
            "scope": analysis_doc.get("scope_data", {}),
            "technology": analysis_doc.get("technology_data", {}),
            "timeline": analysis_doc.get("timeline_data", {}),
            "risk": analysis_doc.get("risk_data", {})
        }

    created_at = project.get("created_at")
    submitted_at_str = created_at.isoformat() if isinstance(created_at, datetime) else (created_at or datetime.utcnow().isoformat())

    return {
        "id": project["id"],
        "student_id": project["student_id"],
        "title": project["title"],
        "desc": project["desc"],
        "domain": project.get("domain", "web"),
        "teamSize": str(project.get("team_size", "3")),
        "durationDays": int(project.get("duration_days", 30)),
        "status": project.get("status", "pending_review"),
        "feasibility": int(project.get("feasibility_score", 85)),
        "techStack": project.get("tech_stack", []),
        "milestonesDone": int(project.get("milestones_done", 0)),
        "submittedAt": submitted_at_str,
        "milestones": milestones,
        "executive_summary": (analysis_doc and analysis_doc.get("executive_summary")) or "",
        "analysis": analysis_data
    }


@router.get("/projects/student/{student_id}", response_model=List[schemas.ProjectResponse])
def get_student_projects(student_id: int):
    projects = list(project_ideas_col.find({"student_id": int(student_id)}).sort("created_at", -1))
    return [build_project_response(p) for p in projects]


@router.get("/projects/{project_id}", response_model=schemas.ProjectResponse)
def get_project(project_id: int):
    project = project_ideas_col.find_one({"id": int(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return build_project_response(project)


@router.post("/projects/{project_id}/milestones/{milestone_id}/toggle", response_model=schemas.MilestoneToggleResponse)
def toggle_milestone(project_id: int, milestone_id: int, data: schemas.MilestoneToggleRequest):
    milestone = project_milestones_col.find_one({
        "id": int(milestone_id),
        "project_id": int(project_id)
    })
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    project_milestones_col.update_one(
        {"id": int(milestone_id), "project_id": int(project_id)},
        {"$set": {
            "is_completed": data.completed,
            "completed_at": datetime.utcnow() if data.completed else None
        }}
    )

    done_count = project_milestones_col.count_documents({
        "project_id": int(project_id),
        "is_completed": True
    })
    total_count = project_milestones_col.count_documents({"project_id": int(project_id)})

    new_status = "active"
    if done_count == total_count and total_count > 0:
        new_status = "submitted"
    elif done_count == 0:
        new_status = "pending_review"

    project_ideas_col.update_one(
        {"id": int(project_id)},
        {"$set": {
            "milestones_done": done_count,
            "status": new_status,
            "updated_at": datetime.utcnow()
        }}
    )

    pct = int((done_count / total_count * 100)) if total_count > 0 else 0

    return {
        "milestone_id": int(milestone_id),
        "is_completed": data.completed,
        "milestones_done": done_count,
        "total_milestones": total_count,
        "progress_pct": pct
    }
