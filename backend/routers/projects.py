from datetime import datetime
from typing import List, Union
from fastapi import APIRouter, HTTPException
from bson import ObjectId

import schemas
from database import (
    project_ideas_col,
    project_milestones_col,
    project_analyses_col
)

router = APIRouter()


def build_project_response(project: dict) -> dict:
    p_id = project.get("id") or project.get("idea_id") or project.get("_id")
    
    # Check milestones in collection
    milestones_query = []
    if isinstance(p_id, int) or (isinstance(p_id, str) and str(p_id).isdigit()):
        milestones_query.append({"project_id": int(p_id)})
    milestones_query.append({"project_id": str(p_id)})
    
    milestones_cursor = list(project_milestones_col.find({"$or": milestones_query}).sort("phase_index", 1))
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

    # Fallback to embedded milestones if collection had none
    if not milestones and "milestones" in project:
        for idx, ms in enumerate(project["milestones"]):
            milestones.append({
                "id": ms.get("id", idx + 1),
                "phase_index": ms.get("phase_index", idx + 1),
                "week": ms.get("week_label") or ms.get("weekLabel", f"Week {idx*2+1}-{idx*2+2}"),
                "title": ms.get("title", f"Phase {idx+1}"),
                "desc": ms.get("desc") or ms.get("description", ""),
                "deliverables": ms.get("deliverables", []),
                "is_completed": bool(ms.get("is_completed") or ms.get("completed", False))
            })

    analysis_doc = project_analyses_col.find_one({"$or": milestones_query})
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
        "id": project.get("id", p_id),
        "student_id": project.get("student_id", 1),
        "title": project.get("title", "Project"),
        "desc": project.get("desc", ""),
        "domain": project.get("domain", "web"),
        "teamSize": str(project.get("team_size") or project.get("teamSize", "3")),
        "durationDays": int(project.get("duration_days") or project.get("durationDays", 30)),
        "status": project.get("status", "pending_review"),
        "feasibility": int(project.get("feasibility_score") or project.get("feasibility", 85)),
        "techStack": project.get("tech_stack") or project.get("techStack", []),
        "milestonesDone": int(project.get("milestones_done") or project.get("milestonesDone", 0)),
        "submittedAt": submitted_at_str,
        "milestones": milestones,
        "executive_summary": (analysis_doc and analysis_doc.get("executive_summary")) or "",
        "analysis": analysis_data
    }


@router.get("/projects/student/{student_id}", response_model=List[schemas.ProjectResponse])
def get_student_projects(student_id: str):
    sid_query = []
    if str(student_id).isdigit():
        sid_query.append({"student_id": int(student_id)})
        sid_query.append({"student_id": str(student_id)})
    else:
        sid_query.append({"student_id": str(student_id)})
        sid_query.append({"student_email": str(student_id).lower()})

    projects = list(project_ideas_col.find({"$or": sid_query}).sort("created_at", -1))
    return [build_project_response(p) for p in projects]


@router.get("/projects/{project_id}", response_model=schemas.ProjectResponse)
def get_project(project_id: str):
    query = []
    if str(project_id).isdigit():
        query.append({"id": int(project_id)})
    query.append({"id": str(project_id)})
    query.append({"idea_id": str(project_id)})
    if ObjectId.is_valid(project_id):
        query.append({"_id": ObjectId(project_id)})

    project = project_ideas_col.find_one({"$or": query})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return build_project_response(project)


@router.post("/projects/{project_id}/milestones/{milestone_id}/toggle", response_model=schemas.MilestoneToggleResponse)
def toggle_milestone(project_id: str, milestone_id: int, data: schemas.MilestoneToggleRequest):
    p_query = []
    if str(project_id).isdigit():
        p_query.append({"id": int(project_id)})
    p_query.append({"id": str(project_id)})
    p_query.append({"idea_id": str(project_id)})

    p_doc = project_ideas_col.find_one({"$or": p_query})
    actual_pid = p_doc.get("id", project_id) if p_doc else project_id

    ms_query = {
        "id": int(milestone_id),
        "$or": [{"project_id": actual_pid}, {"project_id": int(actual_pid) if str(actual_pid).isdigit() else str(actual_pid)}]
    }
    milestone = project_milestones_col.find_one(ms_query)
    
    if milestone:
        project_milestones_col.update_one(
            {"_id": milestone["_id"]},
            {"$set": {
                "is_completed": data.completed,
                "completed_at": datetime.utcnow() if data.completed else None
            }}
        )

    count_query = {"$or": [{"project_id": actual_pid}, {"project_id": int(actual_pid) if str(actual_pid).isdigit() else str(actual_pid)}]}
    done_count = project_milestones_col.count_documents({
        **count_query,
        "is_completed": True
    })
    total_count = project_milestones_col.count_documents(count_query)
    if total_count == 0:
        total_count = 4
        done_count = 1 if data.completed else 0

    new_status = "active"
    if done_count == total_count and total_count > 0:
        new_status = "submitted"
    elif done_count == 0:
        new_status = "pending_review"

    if p_doc:
        project_ideas_col.update_one(
            {"_id": p_doc["_id"]},
            {"$set": {
                "milestones_done": done_count,
                "status": new_status,
                "updated_at": datetime.utcnow()
            }}
        )

    pct = int((done_count / total_count * 100)) if total_count > 0 else 0

    return {
        "milestone_id": int(milestone_id),
        "completed": data.completed,
        "is_completed": data.completed,
        "milestonesDone": done_count,
        "milestones_done": done_count,
        "totalMilestones": total_count,
        "total_milestones": total_count,
        "overallProgress": pct,
        "progress_pct": pct
    }

