"""
Faculty Dashboard API Router

Endpoints:
  GET  /faculty/cohort              → All students + projects + AI reports (for Faculty Dashboard)
  GET  /faculty/activity            → Recent activity feed (submissions, milestones, check-ins)
  GET  /faculty/analytics           → Cohort-level stats (avg feasibility, domain distribution, etc.)
  POST /faculty/review              → Save faculty feedback + approve/request-revision on a project
  POST /faculty/milestone/signoff   → Faculty sign-off on a specific student milestone
  POST /faculty/broadcast           → Broadcast an announcement (persisted to MongoDB)
  GET  /faculty/announcements       → Fetch latest announcements
  GET  /faculty/export              → Download cohort CSV report
"""

import csv
import io
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from database import (
    get_database,
    is_mongo_available,
    get_project_ideas_collection,
    get_tracking_reports_collection,
    get_students_collection,
)

router = APIRouter(prefix="/faculty", tags=["faculty"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class FacultyReviewRequest(BaseModel):
    project_id: str
    faculty_name: Optional[str] = "Prof. Verma"
    faculty_email: Optional[str] = ""
    feedback: str
    status: Optional[str] = "active"          # active | pending_revision | approved | rejected


class MilestoneSignoffRequest(BaseModel):
    idea_id: str
    milestone_id: int
    faculty_name: Optional[str] = "Prof. Verma"
    notes: Optional[str] = ""


class BroadcastRequest(BaseModel):
    author_name: Optional[str] = "Prof. Verma"
    author_email: Optional[str] = ""
    title: Optional[str] = "Academic Project Update"
    message: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_col(name: str):
    if not is_mongo_available():
        return None
    return get_database()[name]


def _safe_int(v, default: int = 0) -> int:
    try:
        return int(v)
    except Exception:
        return default


def _fmt_project(p: dict, tracking_doc: dict = None) -> dict:
    """Normalise a project_ideas document for the faculty dashboard."""
    feas_report = p.get("feasibilityReport") or {}
    scope_report = p.get("scopeReport") or {}
    tech_report  = p.get("techStackReport") or {}
    risk_report  = p.get("riskReport") or {}

    # Milestones from tracking report
    milestones = []
    tracking_report = {}
    if tracking_doc and tracking_doc.get("report"):
        tracking_report = tracking_doc["report"]
        raw_ms = tracking_report.get("milestones", [])
        for idx, ms in enumerate(raw_ms):
            milestones.append({
                "id": ms.get("id", idx + 1),
                "phase": ms.get("phase", f"Phase {idx + 1}"),
                "weekLabel": ms.get("weekLabel", ms.get("week", "")),
                "title": ms.get("title", ""),
                "description": ms.get("description", ms.get("desc", "")),
                "deliverables": ms.get("deliverables", []),
                "acceptanceCriteria": ms.get("acceptanceCriteria", []),
                "estimatedEffortHours": ms.get("estimatedEffortHours", 24),
                "status": ms.get("status", "pending"),
                "completed": bool(ms.get("completed", ms.get("is_completed", False))),
                "completedAt": ms.get("completedAt"),
                "facultySignoff": ms.get("facultySignoff", False),
                "facultyNotes": ms.get("facultyNotes", ""),
            })

    milestones_done = sum(1 for m in milestones if m.get("completed"))
    total_milestones = len(milestones)
    overall_progress = tracking_report.get("overallProgress", 0)

    # Tech stack: support both formats
    tech_stack_rec = tech_report.get("recommendedStack") or tech_report.get("recommended") or {}
    tech_list = []
    if isinstance(tech_stack_rec, dict):
        tech_list = [v for v in tech_stack_rec.values() if isinstance(v, str) and v]
    elif isinstance(tech_stack_rec, list):
        tech_list = tech_stack_rec

    # Fall back to raw techIdeas field
    if not tech_list and p.get("techIdeas"):
        tech_list = [t.strip() for t in str(p["techIdeas"]).split(",") if t.strip()]

    created_at = p.get("created_at") or p.get("submittedAt")
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()
    else:
        created_at = created_at or _utcnow_str()

    return {
        "id": p.get("idea_id") or str(p.get("_id", "")),
        "title": p.get("title", ""),
        "desc": p.get("desc", ""),
        "domain": p.get("domain", "web"),
        "teamSize": str(p.get("teamSize", p.get("team_size", "3"))),
        "durationDays": _safe_int(p.get("durationDays", p.get("duration_days", 30)), 30),
        "status": p.get("status", "pending_review"),
        "submittedAt": created_at,
        "feasibility": _safe_int(
            (feas_report.get("overallScore") or p.get("feasibility") or p.get("feasibility_score") or 0), 0
        ),
        "feasibilityVerdict": feas_report.get("verdict", ""),
        "techStack": tech_list,
        "milestones": milestones,
        "milestonesDone": milestones_done,
        "totalMilestones": total_milestones,
        "overallProgress": overall_progress,
        "analysis": {
            "feasibility": feas_report,
            "scope": scope_report,
            "technology": tech_report,
            "tracking": tracking_report,
            "risk": risk_report,
        },
        "facultyFeedback": p.get("facultyFeedback", ""),
        "facultyStatus": p.get("facultyStatus", ""),
    }


# ─── GET /faculty/cohort & /faculty/students ───────────────────────────────────

@router.get("/cohort")
@router.get("/students")
def get_cohort():
    """
    Returns all registered student users with their projects, AI reports,
    milestones, and progress for the Faculty Dashboard.
    Falls back to ideas.json if MongoDB is offline.
    """
    results = []

    # --- Try MongoDB path ---
    if is_mongo_available():
        try:
            db = get_database()
            users_col  = db["users"]
            ideas_col  = get_project_ideas_collection()
            tracking_col = get_tracking_reports_collection()

            # Fetch all student users
            all_users = list(users_col.find({"role": "student"}).sort("createdAt", -1))

            # Build a map: email -> list of ideas
            all_ideas = list(ideas_col.find().sort("created_at", -1))
            ideas_by_email: Dict[str, list] = {}
            for idea in all_ideas:
                email = (idea.get("student_email") or idea.get("student_id") or "").strip().lower()
                if email:
                    ideas_by_email.setdefault(email, []).append(idea)

            for u in all_users:
                email = (u.get("email") or "").strip().lower()
                user_ideas = ideas_by_email.get(email, [])

                projects = []
                for idea in user_ideas:
                    idea_id = idea.get("idea_id") or str(idea.get("_id", ""))
                    tracking_doc = tracking_col.find_one({"idea_id": idea_id}) if idea_id else None
                    projects.append(_fmt_project(idea, tracking_doc))

                # Derive student status from projects
                statuses = [p["status"] for p in projects]
                if "active" in statuses:
                    student_status = "active"
                elif "pending_review" in statuses or "review" in statuses:
                    student_status = "review"
                elif projects:
                    student_status = "active"
                else:
                    student_status = "pending"

                last_active = u.get("lastActive") or u.get("createdAt") or _utcnow_str()
                if isinstance(last_active, datetime):
                    last_active = last_active.isoformat()

                results.append({
                    "id": str(u.get("_id", email)),
                    "email": email,
                    "name": u.get("name", email.split("@")[0].replace(".", " ").title()),
                    "firstName": u.get("firstName", ""),
                    "lastName": u.get("lastName", ""),
                    "roll": u.get("rollNo", u.get("roll_no", "")),
                    "branch": u.get("branch", "CSE"),
                    "year": u.get("year", ""),
                    "skills": u.get("skills", {}),
                    "status": student_status,
                    "lastActive": last_active,
                    "projects": projects,
                    "project": projects[0] if projects else None,
                })

            return results

        except Exception as e:
            print(f"[FACULTY/COHORT] MongoDB error: {e}. Falling back to local data.")

    # --- Fallback: read ideas.json locally ---
    try:
        import json
        from pathlib import Path
        ideas_file = Path(__file__).resolve().parent.parent / "data" / "ideas.json"
        users_file  = Path(__file__).resolve().parent.parent / "data" / "users.json"

        ideas_data: dict = {}
        if ideas_file.exists():
            ideas_data = json.loads(ideas_file.read_text(encoding="utf-8"))

        users_data: dict = {}
        if users_file.exists():
            users_data = json.loads(users_file.read_text(encoding="utf-8"))

        # Group ideas by student email
        ideas_by_email: Dict[str, list] = {}
        for _id, idea in ideas_data.items():
            email = (idea.get("student_email") or idea.get("student_id") or "").strip().lower()
            if email:
                ideas_by_email.setdefault(email, []).append({**idea, "idea_id": _id})

        for email, udata in users_data.items():
            if udata.get("role") == "faculty":
                continue
            user_ideas = ideas_by_email.get(email.strip().lower(), [])
            projects = [_fmt_project(i) for i in user_ideas]

            statuses = [p["status"] for p in projects]
            student_status = (
                "active" if "active" in statuses
                else "review" if ("pending_review" in statuses or "review" in statuses)
                else ("active" if projects else "pending")
            )

            results.append({
                "id": email,
                "email": email,
                "name": udata.get("name", email.split("@")[0].title()),
                "firstName": udata.get("firstName", udata.get("name", "").split(" ")[0]),
                "lastName": udata.get("lastName", ""),
                "roll": udata.get("rollNo", ""),
                "branch": udata.get("branch", "CSE"),
                "year": udata.get("year", ""),
                "skills": udata.get("skills", {}),
                "status": student_status,
                "lastActive": udata.get("lastActive", udata.get("createdAt", _utcnow_str())),
                "projects": projects,
                "project": projects[0] if projects else None,
            })

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load cohort data: {e}")


# ─── GET /faculty/activity ─────────────────────────────────────────────────────

@router.get("/activity")
def get_activity_feed(limit: int = 20):
    """Recent activity: project submissions, milestone completions, check-ins."""
    events = []

    if not is_mongo_available():
        return {"events": events}

    try:
        db = get_database()

        # Latest project submissions
        for idea in db["project_ideas"].find().sort("created_at", -1).limit(10):
            ts = idea.get("created_at")
            ts_str = ts.isoformat() if isinstance(ts, datetime) else (ts or _utcnow_str())
            events.append({
                "type": "submission",
                "icon": "📋",
                "color": "blue",
                "email": idea.get("student_email", ""),
                "message": f"submitted project \"{idea.get('title', 'Untitled')}\"",
                "timestamp": ts_str,
            })

        # Latest tracking reports (milestones done)
        for tr in db["tracking_reports"].find().sort("updated_at", -1).limit(8):
            ts = tr.get("updated_at")
            ts_str = ts.isoformat() if isinstance(ts, datetime) else (ts or _utcnow_str())
            milestones_done = 0
            if tr.get("report"):
                milestones_done = sum(1 for m in tr["report"].get("milestones", []) if m.get("completed"))
            events.append({
                "type": "milestone",
                "icon": "🏁",
                "color": "green",
                "email": tr.get("student_email", ""),
                "message": f"completed {milestones_done} milestone(s) on \"{tr.get('project_title', 'project')}\"",
                "timestamp": ts_str,
            })

        # Latest progress check-ins
        for pu in db["progress_updates"].find().sort("submitted_at", -1).limit(8):
            ts = pu.get("submitted_at")
            ts_str = ts.isoformat() if isinstance(ts, datetime) else (ts or _utcnow_str())
            events.append({
                "type": "checkin",
                "icon": "📈",
                "color": "purple",
                "email": pu.get("student_email", ""),
                "message": f"submitted weekly check-in — {pu.get('progress_pct', 0)}% progress",
                "timestamp": ts_str,
            })

        # Sort all events by timestamp descending
        events.sort(key=lambda x: x["timestamp"], reverse=True)
        return {"events": events[:limit]}

    except Exception as e:
        print(f"[FACULTY/ACTIVITY] Error: {e}")
        return {"events": []}


# ─── GET /faculty/analytics ────────────────────────────────────────────────────

@router.get("/analytics")
def get_cohort_analytics():
    """Aggregated cohort-level analytics for faculty overview."""
    if not is_mongo_available():
        return {}

    try:
        db = get_database()
        ideas = list(db["project_ideas"].find())

        total = len(ideas)
        domain_counts: Dict[str, int] = {}
        feasibility_scores = []
        status_counts: Dict[str, int] = {}

        for idea in ideas:
            domain = idea.get("domain", "web")
            domain_counts[domain] = domain_counts.get(domain, 0) + 1

            feas = idea.get("feasibilityReport", {}) or {}
            score = feas.get("overallScore") or idea.get("feasibility") or idea.get("feasibility_score")
            if score is not None:
                try:
                    feasibility_scores.append(int(score))
                except Exception:
                    pass

            status = idea.get("status", "pending")
            status_counts[status] = status_counts.get(status, 0) + 1

        avg_feas = round(sum(feasibility_scores) / len(feasibility_scores)) if feasibility_scores else 0

        # Avg milestones done from tracking reports
        tracking_docs = list(db["tracking_reports"].find())
        total_ms_done = 0
        tracking_count = 0
        for td in tracking_docs:
            if td.get("report") and td["report"].get("milestones"):
                done = sum(1 for m in td["report"]["milestones"] if m.get("completed"))
                total_ms_done += done
                tracking_count += 1
        avg_ms = round(total_ms_done / tracking_count, 1) if tracking_count else 0

        return {
            "totalProjects": total,
            "avgFeasibility": avg_feas,
            "avgMilestonesDone": avg_ms,
            "domainDistribution": domain_counts,
            "statusDistribution": status_counts,
        }

    except Exception as e:
        print(f"[FACULTY/ANALYTICS] Error: {e}")
        return {}


# ─── POST /faculty/review ──────────────────────────────────────────────────────

@router.post("/review")
def submit_faculty_review(data: FacultyReviewRequest):
    """Save faculty feedback and update project status."""
    # 1. Update local ideas.json
    try:
        import json
        from pathlib import Path
        ideas_file = Path(__file__).resolve().parent.parent / "data" / "ideas.json"
        if ideas_file.exists():
            ideas_data = json.loads(ideas_file.read_text(encoding="utf-8"))
            for pid, idoc in ideas_data.items():
                if pid == data.project_id or idoc.get("idea_id") == data.project_id or idoc.get("id") == data.project_id:
                    idoc["facultyFeedback"] = data.feedback
                    idoc["facultyStatus"] = data.status
                    idoc["status"] = data.status
                    ideas_file.write_text(json.dumps(ideas_data, indent=2), encoding="utf-8")
                    break
    except Exception as e:
        print(f"[FACULTY/REVIEW] Local save error: {e}")

    # 2. Try MongoDB if available
    if is_mongo_available():
        try:
            ideas_col = get_project_ideas_collection()
            if ideas_col is not None:
                ideas_col.update_one(
                    {"$or": [{"idea_id": data.project_id}, {"id": data.project_id}]},
                    {"$set": {
                        "facultyFeedback": data.feedback,
                        "facultyStatus": data.status,
                        "status": data.status,
                        "updatedAt": _utcnow_str(),
                    }}
                )
                db = get_database()
                db["faculty_reviews"].insert_one({
                    "idea_id": data.project_id,
                    "faculty_name": data.faculty_name,
                    "faculty_email": data.faculty_email,
                    "feedback": data.feedback,
                    "status": data.status,
                    "reviewed_at": _utcnow_str(),
                })
        except Exception as e:
            print(f"[FACULTY/REVIEW] MongoDB update error: {e}")

    return {"success": True, "message": f"Review saved. Project status -> '{data.status}'."}


# ─── POST /faculty/milestone/signoff ──────────────────────────────────────────

@router.post("/milestone/signoff")
def milestone_signoff(data: MilestoneSignoffRequest):
    """Faculty sign-off on a student milestone inside the tracking report."""
    if not is_mongo_available():
        return {"success": False, "message": "Database offline — sign-off cannot be persisted."}

    tracking_col = get_tracking_reports_collection()
    tracking_doc = tracking_col.find_one({"idea_id": data.idea_id})
    if not tracking_doc:
        raise HTTPException(status_code=404, detail="Tracking report not found for this project.")

    report = tracking_doc.get("report", {})
    milestones = report.get("milestones", [])
    updated = False
    for ms in milestones:
        if ms.get("id") == data.milestone_id:
            ms["facultySignoff"] = True
            ms["facultyNotes"] = data.notes
            ms["facultySignoffAt"] = _utcnow_str()
            ms["facultyName"] = data.faculty_name
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail=f"Milestone {data.milestone_id} not found.")

    report["milestones"] = milestones
    tracking_col.update_one(
        {"_id": tracking_doc["_id"]},
        {"$set": {"report": report, "updated_at": _utcnow_str()}}
    )

    return {"success": True, "message": f"Milestone {data.milestone_id} signed off by {data.faculty_name}."}


# ─── POST /faculty/broadcast ──────────────────────────────────────────────────

@router.post("/broadcast")
def broadcast_announcement(data: BroadcastRequest):
    """Save a broadcast announcement to MongoDB."""
    doc = {
        "author_name": data.author_name,
        "author_email": data.author_email,
        "title": data.title,
        "message": data.message,
        "created_at": _utcnow_str(),
    }
    if is_mongo_available():
        try:
            get_database()["announcements"].insert_one(doc)
        except Exception as e:
            print(f"[FACULTY/BROADCAST] DB error: {e}")

    return {"success": True, "title": data.title, "message": data.message, "created_at": doc["created_at"]}


# ─── GET /faculty/announcements ───────────────────────────────────────────────

@router.get("/announcements")
def list_announcements(limit: int = 10):
    """Fetch recent broadcast announcements."""
    if not is_mongo_available():
        return {"announcements": []}
    try:
        items = list(
            get_database()["announcements"].find().sort("created_at", -1).limit(limit)
        )
        return {
            "announcements": [
                {
                    "id": str(a.get("_id", "")),
                    "author_name": a.get("author_name", "Faculty"),
                    "title": a.get("title", "Announcement"),
                    "message": a.get("message", ""),
                    "created_at": a.get("created_at", _utcnow_str()),
                }
                for a in items
            ]
        }
    except Exception as e:
        print(f"[FACULTY/ANNOUNCEMENTS] Error: {e}")
        return {"announcements": []}


# ─── GET /faculty/export ───────────────────────────────────────────────────────

@router.get("/export")
def export_csv_report():
    """Download cohort CSV report."""
    try:
        cohort = get_cohort()  # Reuse the cohort endpoint logic
    except Exception:
        cohort = []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Name", "Roll No", "Branch", "Year", "Email",
        "Status", "Project Title", "Domain",
        "Feasibility %", "Milestones Done", "Total Milestones", "Overall Progress %",
        "Faculty Feedback",
    ])

    for s in cohort:
        projs = s.get("projects") or ([s["project"]] if s.get("project") else [])
        if not projs:
            writer.writerow([
                s.get("id", ""), s["name"], s["roll"], s["branch"], s["year"], s["email"],
                s["status"], "No Submission", "—", "—", 0, 0, 0, "",
            ])
            continue
        for p in projs:
            writer.writerow([
                s.get("id", ""), s["name"], s["roll"], s["branch"], s["year"], s["email"],
                p.get("status", "—"), p["title"], p.get("domain", "—"),
                f"{p.get('feasibility', 0)}%",
                p.get("milestonesDone", 0),
                p.get("totalMilestones", 0),
                f"{p.get('overallProgress', 0)}%",
                p.get("facultyFeedback", ""),
            ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=Faculty_Cohort_Report_{datetime.now().strftime('%Y%m%d')}.csv"
        },
    )


# ─── GET /faculty/mentor-summary/{project_id} ─────────────────────────────────

@router.get("/mentor-summary/{project_id}")
def get_mentor_summary(project_id: str):
    """
    Generate an AI Mentor Summary (executive summary) for the faculty dashboard.
    This gives the faculty member a quick overview of project health, blockers, and progress.
    """
    import os
    try:
        # Load project data
        project_doc = None
        if is_mongo_available():
            ideas_col = get_project_ideas_collection()
            if ideas_col is not None:
                from bson import ObjectId
                query_conditions = [{"idea_id": project_id}, {"id": project_id}]
                try:
                    if len(project_id) == 24:
                        query_conditions.append({"_id": ObjectId(project_id)})
                except Exception:
                    pass
                project_doc = ideas_col.find_one({"$or": query_conditions})
        
        # Local fallback
        if not project_doc:
            from database import DATA_DIR
            import json
            from pathlib import Path
            ideas_file = Path(DATA_DIR) / "ideas.json"
            if ideas_file.exists():
                ideas_data = json.loads(ideas_file.read_text(encoding="utf-8"))
                project_doc = (
                    ideas_data.get(project_id)
                    or next((v for v in ideas_data.values() if v.get("idea_id") == project_id or v.get("id") == project_id), None)
                )
                
        if not project_doc:
            raise HTTPException(status_code=404, detail="Project not found.")

        # Build context
        title = project_doc.get("title", "Untitled")
        status = project_doc.get("status", "unknown")
        
        tracking = None
        if is_mongo_available():
            tracking = get_database()["tracking_reports"].find_one({"idea_id": project_doc.get("idea_id") or project_id})
        
        progress = tracking.get("report", {}).get("overallProgress", 0) if tracking else 0
        milestones = tracking.get("report", {}).get("milestones", []) if tracking else []
        milestones_done = sum(1 for m in milestones if m.get("completed"))
        total_milestones = len(milestones) if milestones else 4

        # Generate via LLM
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        summary = ""
        ai_generated = False

        if api_key:
            client = Groq(api_key=api_key)
            prompt = (
                f"You are a project management AI assistant for faculty. "
                f"Write a concise, 3-sentence executive summary about the following student project:\n"
                f"Title: {title}\n"
                f"Status: {status}\n"
                f"Progress: {progress}% ({milestones_done}/{total_milestones} milestones completed)\n\n"
                f"Focus on the health of the project, their progress, and any immediate action the faculty might need to take. Keep it professional."
            )
            
            try:
                resp = client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=200,
                )
                summary = resp.choices[0].message.content.strip()
                ai_generated = True
            except Exception as e:
                print(f"[FACULTY/MENTOR_SUMMARY] LLM Error: {e}")
                
        if not summary:
            # Fallback heuristic
            health = "On Track" if progress >= 50 else "Needs Attention" if progress > 0 else "Not Started"
            summary = (
                f"The project '{title}' is currently {status} with an overall progress of {progress}%. "
                f"The team has completed {milestones_done} out of {total_milestones} milestones. "
                f"Project health is estimated as: {health}."
            )

        return {
            "project_id": project_id,
            "summary": summary,
            "aiGenerated": ai_generated
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[FACULTY/MENTOR_SUMMARY] Error: {e}")
        return {"error": str(e), "summary": "Failed to generate summary."}
