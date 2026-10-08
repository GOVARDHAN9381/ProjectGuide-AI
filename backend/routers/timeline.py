"""
Timeline Agent API Router

Exposes the Universal AI Timeline Planning Agent endpoints in the main FastAPI backend.
- POST /api/timeline/create-timeline : Generate AI project timeline
- GET  /api/timeline/projects        : List all saved timelines
- POST /api/timeline/update-progress : Update task completion progress
"""

from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from bson import ObjectId

import schemas
from agents.timeline_agent import run_timeline_agent
from database import get_timeline_collection

router = APIRouter()


@router.post("/api/timeline/create-timeline")
def create_timeline(data: schemas.TimelineCreateRequest) -> Dict[str, Any]:
    """Generate an AI project timeline and store it in MongoDB."""
    if not data.project_name.strip():
        raise HTTPException(status_code=400, detail="Project name is required.")

    if data.deadline <= 0:
        raise HTTPException(status_code=400, detail="Deadline must be greater than 0.")

    timeline_data = run_timeline_agent(
        project_name=data.project_name,
        deadline_days=data.deadline,
        hours_per_day=data.hours_per_day or 4.0,
        completed_tasks=data.completed_tasks or "None"
    )

    try:
        col = get_timeline_collection()
        insert_res = col.insert_one(timeline_data)
        timeline_data["_id"] = str(insert_res.inserted_id)
    except Exception as e:
        timeline_data["_id"] = "local_temp_id"

    return timeline_data


@router.get("/api/timeline/projects")
def get_timeline_projects() -> List[Dict[str, Any]]:
    """Retrieve all saved project timelines from MongoDB."""
    projects = []
    try:
        col = get_timeline_collection()
        saved = col.find().sort("_id", -1)
        for p in saved:
            p["_id"] = str(p["_id"])
            projects.append(p)
    except Exception as e:
        print(f"[TIMELINE ROUTER] Error fetching projects: {e}")
    return projects


@router.post("/api/timeline/update-progress")
def update_task_progress(data: schemas.TimelineProgressUpdateRequest) -> Dict[str, Any]:
    """Update task progress and status within a saved project timeline."""
    if not (0 <= data.progress <= 100):
        raise HTTPException(status_code=400, detail="Progress must be between 0 and 100.")

    try:
        obj_id = ObjectId(data.project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project_id format.")

    col = get_timeline_collection()
    project = col.find_one({"_id": obj_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project timeline not found.")

    tasks = project.get("tasks", [])
    if data.task_index < 0 or data.task_index >= len(tasks):
        raise HTTPException(status_code=400, detail="Invalid task_index range.")

    status = "Completed" if data.progress == 100 else ("In Progress" if data.progress > 0 else "Not Started")

    col.update_one(
        {"_id": obj_id},
        {
            "$set": {
                f"tasks.{data.task_index}.progress": data.progress,
                f"tasks.{data.task_index}.status": status
            }
        }
    )

    return {
        "message": "Task progress updated successfully.",
        "project_id": data.project_id,
        "task_index": data.task_index,
        "progress": data.progress,
        "status": status
    }
