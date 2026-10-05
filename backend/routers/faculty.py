import csv
import io
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Response

import schemas
from database import (
    students_col,
    skill_profiles_col,
    project_ideas_col,
    project_milestones_col,
    faculty_reviews_col,
    announcements_col,
    get_next_id
)

router = APIRouter()


@router.get("/faculty/students")
def get_cohort_students():
    students = list(students_col.find().sort("id", 1))
    results = []

    for idx, s in enumerate(students, start=1):
        s_id = s.get("id") or idx
        profile = skill_profiles_col.find_one({"student_id": s_id}) or {}
        skills = profile.get("skills", {})

        s_query = []
        if isinstance(s_id, int) or (isinstance(s_id, str) and str(s_id).isdigit()):
            s_query.append({"student_id": int(s_id)})
        s_query.append({"student_id": str(s_id)})
        if "email" in s:
            s_query.append({"student_email": s["email"].lower()})

        projects_cursor = project_ideas_col.find({"$or": s_query}).sort("created_at", -1)
        projs = []
        for p in projects_cursor:
            p_id = p.get("id") or p.get("idea_id") or p.get("_id")
            
            p_ms_query = []
            if isinstance(p_id, int) or (isinstance(p_id, str) and str(p_id).isdigit()):
                p_ms_query.append({"project_id": int(p_id)})
            p_ms_query.append({"project_id": str(p_id)})

            ms_cursor = list(project_milestones_col.find({"$or": p_ms_query}).sort("phase_index", 1))
            p_milestones = []
            for ms in ms_cursor:
                p_milestones.append({
                    "id": ms.get("id"),
                    "phase_index": ms.get("phase_index", 1),
                    "week": ms.get("week_label", ""),
                    "title": ms.get("title", ""),
                    "desc": ms.get("desc", ""),
                    "deliverables": ms.get("deliverables", []),
                    "is_completed": bool(ms.get("is_completed", False))
                })

            p_created = p.get("created_at")
            p_created_str = p_created.isoformat() if isinstance(p_created, datetime) else (p_created or datetime.utcnow().isoformat())

            projs.append({
                "id": p.get("id", p_id),
                "title": p.get("title", "Project"),
                "desc": p.get("desc", ""),
                "domain": p.get("domain", "web"),
                "teamSize": str(p.get("team_size") or p.get("teamSize", "3")),
                "durationDays": int(p.get("duration_days") or p.get("durationDays", 30)),
                "status": p.get("status", "pending_review"),
                "feasibility": int(p.get("feasibility_score") or p.get("feasibility", 85)),
                "techStack": p.get("tech_stack") or p.get("techStack", []),
                "milestonesDone": int(p.get("milestones_done") or p.get("milestonesDone", 0)),
                "submittedAt": p_created_str,
                "milestones": p_milestones
            })

        main_project = projs[0] if projs else None
        student_status = main_project["status"] if main_project else "pending"

        s_created = s.get("created_at")
        s_created_str = s_created.isoformat() if isinstance(s_created, datetime) else (s_created or datetime.utcnow().isoformat())

        first_name = s.get("first_name") or s.get("firstName", "")
        last_name = s.get("last_name") or s.get("lastName", "")
        full_name = f"{first_name} {last_name}".strip() or s.get("name", f"Student {idx}")

        results.append({
            "id": s_id,
            "name": full_name,
            "roll": s.get("roll_no") or s.get("rollNo") or f"21CS{100+idx}",
            "branch": s.get("branch", "CSE"),
            "year": s.get("year", "3rd Year"),
            "email": s.get("email", ""),
            "skills": skills,
            "status": student_status,
            "lastActive": s_created_str,
            "project": main_project,
            "projects": projs
        })

    return results


@router.post("/faculty/review", response_model=schemas.FacultyReviewResponse)
def submit_faculty_review(data: schemas.FacultyReviewRequest):
    p_id = data.project_id
    query = []
    if str(p_id).isdigit():
        query.append({"id": int(p_id)})
    query.append({"id": str(p_id)})
    query.append({"idea_id": str(p_id)})
    from bson import ObjectId
    if ObjectId.is_valid(str(p_id)):
        query.append({"_id": ObjectId(str(p_id))})

    project = project_ideas_col.find_one({"$or": query})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    review_id = get_next_id("faculty_reviews")
    actual_pid = project.get("id", p_id)
    review_doc = {
        "id": review_id,
        "project_id": actual_pid,
        "faculty_name": data.faculty_name or "Prof. Verma",
        "feedback": data.feedback,
        "status_action": data.status or "active",
        "created_at": datetime.utcnow()
    }
    faculty_reviews_col.insert_one(review_doc)

    new_status = data.status or "active"
    project_ideas_col.update_one(
        {"_id": project["_id"]},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )

    return {
        "review_id": review_id,
        "project_id": actual_pid,
        "status": new_status,
        "message": f"Review recorded. Project status set to '{new_status}'."
    }


@router.post("/faculty/broadcast", response_model=schemas.AnnouncementResponse)
def broadcast_announcement(data: schemas.AnnouncementRequest):
    announcement_id = get_next_id("announcements")
    announcement_doc = {
        "id": announcement_id,
        "author_name": data.author_name or "Prof. Verma",
        "title": data.title or "Academic Project Update",
        "message": data.message,
        "created_at": datetime.utcnow()
    }
    announcements_col.insert_one(announcement_doc)

    return {
        "id": announcement_id,
        "title": announcement_doc["title"],
        "message": announcement_doc["message"],
        "created_at": announcement_doc["created_at"].isoformat()
    }


@router.get("/faculty/announcements", response_model=List[schemas.AnnouncementResponse])
def list_announcements():
    items = list(announcements_col.find().sort("created_at", -1).limit(10))
    res = []
    for a in items:
        c_at = a.get("created_at")
        c_at_str = c_at.isoformat() if isinstance(c_at, datetime) else (c_at or datetime.utcnow().isoformat())
        res.append({
            "id": a.get("id", 1),
            "title": a.get("title", "Announcement"),
            "message": a.get("message", ""),
            "created_at": c_at_str
        })
    return res


@router.get("/faculty/export")
def export_csv_report():
    students = list(students_col.find().sort("id", 1))
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["ID", "Name", "Roll No", "Branch", "Year", "Email", "Status", "Project Title", "Domain", "Feasibility", "Milestones Completed"])

    for idx, s in enumerate(students, start=1):
        s_id = s.get("id") or idx
        s_query = [{"student_id": s_id}]
        if isinstance(s_id, int) or str(s_id).isdigit():
            s_query.append({"student_id": int(s_id)})
            s_query.append({"student_id": str(s_id)})
        p = project_ideas_col.find_one({"$or": s_query})
        p_title = p["title"] if p else "No Submission"
        p_domain = p.get("domain", "—") if p else "—"
        p_feas = f"{p.get('feasibility_score', 0)}%" if p else "—"
        
        p_id = p.get("id") if p else None
        ms_count = project_milestones_col.count_documents({"$or": [{"project_id": p_id}, {"project_id": str(p_id)}]}) if p_id else 4
        p_ms = f"{p.get('milestones_done', 0)}/{ms_count}" if p else "0/4"
        p_status = p.get("status", "pending") if p else "pending"

        first_name = s.get("first_name") or s.get("firstName", "")
        last_name = s.get("last_name") or s.get("lastName", "")
        full_name = f"{first_name} {last_name}".strip() or s.get("name", f"Student {idx}")

        writer.writerow([
            s_id,
            full_name,
            s.get("roll_no") or s.get("rollNo", ""),
            s.get("branch", "CSE"),
            s.get("year", "3rd Year"),
            s.get("email", ""),
            p_status,
            p_title,
            p_domain,
            p_feas,
            p_ms
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=Faculty_Cohort_Report_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
    )

