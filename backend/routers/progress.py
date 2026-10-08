"""
Progress Tracking & Automatic Plan Adjustment Router (Milestone 3 - Enhanced)

POST /progress/update             → Submit a weekly progress update
GET  /progress/{project_id}       → Get all progress updates for a project
POST /plan/adjust                 → Analyze progress and generate adjusted plan
GET  /plan/{project_id}/history   → Get full plan adjustment history
"""
import datetime
import traceback
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

router = APIRouter()

# ─── Schemas ─────────────────────────────────────────────────────────────────

class ProgressUpdateRequest(BaseModel):
    student_email: str
    project_id: str                        # idea_id
    project_title: str
    week_number: Optional[int] = None
    progress_pct: int                      # 0-100
    completed_tasks: Optional[List[str]] = []
    pending_tasks: Optional[List[str]] = []
    blockers: Optional[str] = "None reported"
    mood: Optional[str] = "good"           # great/good/okay/struggling
    comments: Optional[str] = ""
    # Context for AI
    idea_data: Optional[Dict[str, Any]] = {}
    scope_report: Optional[Dict[str, Any]] = {}


class PlanAdjustRequest(BaseModel):
    student_email: str
    project_id: str
    project_title: str
    idea_data: Optional[Dict[str, Any]] = {}
    scope_report: Optional[Dict[str, Any]] = {}
    tracking_report: Optional[Dict[str, Any]] = {}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_collection(name: str):
    from database import get_database, is_mongo_available
    if not is_mongo_available():
        return None
    return get_database()[name]


def _get_week_number(project_id: str) -> int:
    """Determine current week number from existing progress updates."""
    try:
        col = _get_collection("progress_updates")
        count = col.count_documents({"project_id": project_id})
        return count + 1
    except Exception:
        return 1


def _run_ai_adjustment(idea_data: dict, progress_update: dict, previous_updates: list, scope_report: dict) -> dict:
    """Call the existing progress agent for AI-driven plan adjustment."""
    try:
        from agents.progress_agent import analyze_progress_and_adjust
        return analyze_progress_and_adjust(
            idea_data=idea_data or {"title": progress_update.get("project_title", "Project")},
            check_in={
                "progress_pct": progress_update.get("progress_pct", 0),
                "mood": progress_update.get("mood", "okay"),
                "blockers": progress_update.get("blockers", "None reported"),
            },
            previous_check_ins=previous_updates,
            scope_report=scope_report,
        )
    except Exception as e:
        print(f"[PROGRESS] AI adjustment failed: {e}")
        pct = progress_update.get("progress_pct", 0)
        return {
            "status": "on_track" if pct >= 60 else "at_risk",
            "progress_gap": max(0, 60 - pct),
            "mentor_message": (
                "Keep up the good work! Make sure to resolve any blockers promptly."
                if pct >= 60 else
                "You are behind schedule. Focus on completing top-priority tasks this week."
            ),
            "plan_adjustments": ["Focus on completing current sprint tasks"],
            "next_week_goals": [f"Reach {min(100, pct + 15)}% completion"],
            "priority_task": "Complete top pending task on your board",
            "ai_generated": False,
        }


def _generate_adjusted_plan(idea_data: dict, tracking_report: dict, adjustment: dict, progress_update: dict = None) -> dict:
    """
    Generate an updated milestone plan when significant delay or blocker is detected.
    Preserves original plan and creates an updated plan with shifted weeks and notes.
    """
    try:
        from groq import Groq
        import json, os, re

        title = idea_data.get("title", "Project")
        duration = idea_data.get("durationDays") or idea_data.get("duration_days", 30)
        status = adjustment.get("status", "on_track")
        gap = adjustment.get("progress_gap", 0)
        plan_adjustments = adjustment.get("plan_adjustments", [])

        # Get existing milestones
        milestones = []
        if tracking_report:
            milestones = tracking_report.get("milestones", []) or tracking_report.get("report", {}).get("milestones", [])

        if not milestones:
            # Generate fallback standard milestones
            weeks = max(4, round(int(duration) / 7))
            milestones = [
                {"id": "m1", "title": "Requirements Analysis & Setup", "week": "Week 1", "weekLabel": "Week 1", "status": "completed", "completed": True},
                {"id": "m2", "title": "System Architecture & Database Schema", "week": "Week 2", "weekLabel": "Week 2", "status": "completed", "completed": True},
                {"id": "m3", "title": "Core Module Implementation", "week": "Week 3", "weekLabel": "Week 3", "status": "completed", "completed": True},
                {"id": "m4", "title": "API Development & Backend Services", "week": "Week 4", "weekLabel": "Week 4", "status": "in_progress", "completed": False},
                {"id": "m5", "title": "Frontend Integration & Authentication", "week": "Week 5", "weekLabel": "Week 5", "status": "pending", "completed": False},
                {"id": f"m{weeks}", "title": "Testing, Deployment & Capstone Defense", "week": f"Week {weeks}", "weekLabel": f"Week {weeks}", "status": "pending", "completed": False},
            ]

        # Determine pending and delayed tasks
        pu = progress_update or {}
        blockers = pu.get("blockers", "")
        pending_tasks = pu.get("pending_tasks", [])
        completed_tasks = pu.get("completed_tasks", [])

        current_in_progress = next((m for m in milestones if m.get("status") == "in_progress" or not m.get("completed")), milestones[0] if milestones else {})
        delayed_milestone_name = current_in_progress.get("title", "Current Development Milestone")
        delayed_week = current_in_progress.get("weekLabel") or current_in_progress.get("week", "Week 4")

        # Snapshot of previous plan before modification
        previous_plan_snapshot = [
            {
                "title": m.get("title", ""),
                "week": m.get("weekLabel") or m.get("week", f"Week {i+1}"),
                "status": "completed" if m.get("completed") or m.get("status") == "completed" else m.get("status", "pending"),
                "deliverables": m.get("deliverables", []) or m.get("tasks", []),
            }
            for i, m in enumerate(milestones)
        ]

        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            client = Groq(api_key=api_key)
            prompt = f"""You are an academic project planning and risk assessment agent.
A student submitted a weekly progress update for the project '{title}'.
Context:
- Project: {title} ({duration} days)
- Progress: {pu.get('progress_pct', 0)}%
- Completed Tasks: {', '.join(completed_tasks) if completed_tasks else 'None reported'}
- Pending Tasks: {', '.join(pending_tasks) if pending_tasks else 'API development and integration'}
- Blockers: {blockers}
- Active Milestone: {delayed_milestone_name} ({delayed_week})
- Current Milestones: {[m.get('title') for m in milestones]}

TASK:
Analyze the delay, assess the risk, and generate an adjusted milestone plan.
Requirements:
1. Identify if a risk exists (true).
2. Specify the affected milestone (e.g. "{delayed_milestone_name}").
3. Specify why the delay occurred based on student blockers.
4. Recommend a clear academic mitigation action.
5. Create an updated milestone schedule where the delayed task is shifted to the subsequent week, and subsequent dependencies are adjusted.
6. Provide a clear student notification message in the format:
   "Your {delayed_week} task ({delayed_milestone_name}) is delayed. The system has moved integration to next week and adjusted the following tasks."

Output JSON ONLY in this format:
{{
  "risk_exists": true,
  "affected_milestone": "{delayed_milestone_name}",
  "reason": "Clear explanation of the delay reason",
  "recommended_action": "Specific concrete action student should take",
  "timeline_adjusted": true,
  "adjustment_message": "Your {delayed_week} task is delayed. The system has moved it to the following week and adjusted subsequent milestones.",
  "updated_milestones": [
    {{"title": "Milestone title", "week": "Week X", "status": "completed|in_progress|pending", "change_note": "Unchanged | Shifted +1 Week | Adjusted target"}}
  ]
}}"""
            models = [
                os.getenv("GROQ_CHAT_MODEL", "qwen/qwen3.8-27b").replace("groq/", ""),
                "qwen/qwen3.8-27b",
                "openai/gpt-oss-120b",
                "openai/gpt-oss-20b",
            ]
            for model in models:
                try:
                    resp = client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.3,
                        max_tokens=650,
                    )
                    text = resp.choices[0].message.content.strip()
                    match = re.search(r'\{[\s\S]*\}', text)
                    if match:
                        parsed = json.loads(match.group(0))
                        parsed["previous_plan"] = previous_plan_snapshot
                        return parsed
                except Exception as ex:
                    print(f"[PROGRESS] Groq plan adjustment error with {model}: {ex}")
                    continue

    except Exception as e:
        print(f"[PROGRESS] Plan generation failed: {e}")

    # Robust academic fallback adjustment
    # Shift pending milestones by 1 week
    updated_milestones = []
    shift = 0
    for i, m in enumerate(milestones):
        is_comp = m.get("completed") or m.get("status") == "completed"
        orig_week = m.get("weekLabel") or m.get("week", f"Week {i+1}")
        if is_comp:
            updated_milestones.append({
                "title": m.get("title", ""),
                "week": orig_week,
                "status": "completed",
                "change_note": "Completed",
            })
        else:
            shift += 1
            week_num = i + 1 + 1  # moved forward by 1 week
            updated_milestones.append({
                "title": m.get("title", ""),
                "week": f"Week {week_num}",
                "status": "in_progress" if shift == 1 else "pending",
                "change_note": f"Shifted +1 Week (Originally {orig_week})",
            })

    delayed_name = current_in_progress.get("title", "API Development")
    msg = f"Your {delayed_week} task ({delayed_name}) is delayed. The system has moved it to the next week and adjusted subsequent tasks."

    return {
        "risk_exists": True,
        "affected_milestone": f"{delayed_week}: {delayed_name}",
        "reason": f"Progress ({pu.get('progress_pct', 0)}%) is behind expected timeline. Blockers reported: {blockers or 'Task integration delay'}.",
        "recommended_action": "Complete current core API/module endpoints first and shift authentication and secondary testing to the next sprint.",
        "timeline_adjusted": True,
        "adjustment_message": msg,
        "previous_plan": previous_plan_snapshot,
        "updated_milestones": updated_milestones,
    }


def _save_plan_to_history(project_id: str, original_plan: dict, updated_plan: dict, reason: str, message: str = ""):
    """Save plan adjustment history in MongoDB and local storage."""
    now = datetime.datetime.utcnow()
    doc = {
        "project_id": project_id,
        "original_plan_snapshot": original_plan,
        "updated_plan": updated_plan,
        "reason": reason,
        "message": message,
        "created_at": now,
    }

    # 1. MongoDB
    try:
        col = _get_collection("plan_history")
        col.insert_one(doc)
    except Exception as e:
        print(f"[PROGRESS] Mongo plan history save note: {e}")

    # 2. Local JSON fallback
    try:
        from database import DATA_DIR
        import json
        from pathlib import Path
        p_file = Path(DATA_DIR) / "plan_history.json"
        history_list = []
        if p_file.exists():
            with open(p_file, "r", encoding="utf-8") as f:
                history_list = json.load(f)
        doc_copy = {**doc, "created_at": now.isoformat()}
        history_list.append(doc_copy)
        with open(p_file, "w", encoding="utf-8") as f:
            json.dump(history_list, f, indent=2)
    except Exception as e:
        print(f"[PROGRESS] Local plan history save error: {e}")


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/progress/update")
def submit_progress_update(req: ProgressUpdateRequest):
    """
    Submit a weekly progress update.
    Stores in MongoDB/local storage, runs AI analysis, triggers plan adjustment if needed.
    """
    try:
        now = datetime.datetime.utcnow()
        col = None
        try:
            col = _get_collection("progress_updates")
        except Exception:
            pass

        # Get existing updates for this project
        previous_updates = []
        if col is not None:
            try:
                previous_updates = list(
                    col.find({"project_id": req.project_id}, {"_id": 0}).sort("submitted_at", 1)
                )
            except Exception:
                pass

        # Check local storage if empty
        from database import DATA_DIR
        import json
        from pathlib import Path
        local_pu_file = Path(DATA_DIR) / "progress_updates.json"
        if not previous_updates and local_pu_file.exists():
            try:
                with open(local_pu_file, "r", encoding="utf-8") as f:
                    all_local = json.load(f)
                    previous_updates = [u for u in all_local if u.get("project_id") == req.project_id]
            except Exception:
                pass

        week_num = req.week_number or (len(previous_updates) + 1)

        update_doc = {
            "student_email": req.student_email.strip().lower(),
            "project_id": req.project_id,
            "project_title": req.project_title,
            "week_number": week_num,
            "progress_pct": req.progress_pct,
            "completed_tasks": req.completed_tasks or [],
            "pending_tasks": req.pending_tasks or [],
            "blockers": req.blockers or "None reported",
            "mood": req.mood or "good",
            "comments": req.comments or "",
            "submitted_at": now,
        }

        # Run AI adjustment analysis
        adjustment = _run_ai_adjustment(
            idea_data=req.idea_data or {"title": req.project_title},
            progress_update=update_doc,
            previous_updates=previous_updates,
            scope_report=req.scope_report or {},
        )
        update_doc["adjustment"] = adjustment

        # Detect if delay or blocker requires plan adjustment
        status = adjustment.get("status", "on_track")
        gap = adjustment.get("progress_gap", 0)
        has_blocker = req.blockers and req.blockers.strip().lower() not in ("none", "none reported", "no", "nil", "")
        needs_adjustment = (
            status in ("at_risk", "critical")
            or gap >= 10
            or req.mood == "struggling"
            or has_blocker
        )

        plan_update = None
        student_notification = ""

        if needs_adjustment:
            # Fetch tracking report for current milestones
            tracking_report = {}
            try:
                from database import get_tracking_reports_collection
                tr_col = get_tracking_reports_collection()
                tr_doc = tr_col.find_one({"$or": [{"idea_id": req.project_id}, {"project_id": req.project_id}]})
                if tr_doc:
                    tracking_report = tr_doc.get("report", tr_doc)
            except Exception:
                pass

            # Also check local ideas.json for trackingReport
            if not tracking_report:
                ideas_file = Path(DATA_DIR) / "ideas.json"
                if ideas_file.exists():
                    try:
                        with open(ideas_file, "r", encoding="utf-8") as f:
                            i_dict = json.load(f)
                            matched = i_dict.get(req.project_id) or next((v for v in i_dict.values() if v.get("idea_id") == req.project_id or v.get("id") == req.project_id), None)
                            if matched and "trackingReport" in matched:
                                tracking_report = matched["trackingReport"]
                    except Exception:
                        pass

            # Fetch existing plan snapshot
            existing_plan = {}
            try:
                plan_col = _get_collection("project_plans")
                existing_plan = plan_col.find_one({"project_id": req.project_id}, {"_id": 0}) or {}
            except Exception:
                pass

            plan_update = _generate_adjusted_plan(
                idea_data=req.idea_data or {"title": req.project_title},
                tracking_report=tracking_report,
                adjustment=adjustment,
                progress_update=update_doc,
            )

            student_notification = plan_update.get(
                "adjustment_message",
                f"Your Week {week_num} progress shows a delay. The system has adjusted your timeline and shifted dependent tasks."
            )

            # Save plan history
            _save_plan_to_history(
                project_id=req.project_id,
                original_plan=plan_update.get("previous_plan") or existing_plan,
                updated_plan=plan_update,
                reason=plan_update.get("reason", "Weekly progress delay"),
                message=student_notification,
            )

            # Update current active plan
            try:
                plan_col = _get_collection("project_plans")
                plan_col.update_one(
                    {"project_id": req.project_id},
                    {"$set": {
                        "project_id": req.project_id,
                        "student_email": req.student_email.strip().lower(),
                        "current_plan": plan_update,
                        "updated_at": now,
                    }},
                    upsert=True,
                )
            except Exception as e:
                print(f"[PROGRESS] Mongo active plan save note: {e}")

            # Local project_plans.json fallback
            try:
                pp_file = Path(DATA_DIR) / "project_plans.json"
                pp_data = {}
                if pp_file.exists():
                    with open(pp_file, "r", encoding="utf-8") as f:
                        pp_data = json.load(f)
                pp_data[req.project_id] = {
                    "project_id": req.project_id,
                    "student_email": req.student_email.strip().lower(),
                    "current_plan": plan_update,
                    "updated_at": now.isoformat(),
                }
                with open(pp_file, "w", encoding="utf-8") as f:
                    json.dump(pp_data, f, indent=2)
            except Exception:
                pass

            update_doc["plan_adjusted"] = True
        else:
            update_doc["plan_adjusted"] = False
            student_notification = f"✅ Week {week_num} progress update saved! {adjustment.get('mentor_message', 'You are on track.')}"

        # Save progress update in MongoDB
        if col is not None:
            try:
                col.insert_one(update_doc)
            except Exception as e:
                print(f"[PROGRESS] Mongo progress update insert note: {e}")

        # Local progress_updates.json fallback
        try:
            local_list = []
            if local_pu_file.exists():
                with open(local_pu_file, "r", encoding="utf-8") as f:
                    local_list = json.load(f)
            doc_to_save = {**update_doc, "submitted_at": now.isoformat()}
            # Remove mongo _id if present
            doc_to_save.pop("_id", None)
            local_list.append(doc_to_save)
            with open(local_pu_file, "w", encoding="utf-8") as f:
                json.dump(local_list, f, indent=2)
        except Exception as e:
            print(f"[PROGRESS] Local progress update save note: {e}")

        return {
            "success": True,
            "week_number": week_num,
            "adjustment": adjustment,
            "plan_adjusted": needs_adjustment,
            "plan_update": plan_update,
            "student_notification": student_notification,
            "affected_milestone": plan_update.get("affected_milestone") if plan_update else None,
            "recommended_action": plan_update.get("recommended_action") if plan_update else adjustment.get("priority_task", ""),
            "previous_plan": plan_update.get("previous_plan") if plan_update else None,
            "updated_plan": plan_update.get("updated_milestones") if plan_update else None,
        }

    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.get("/progress/{project_id}")
def get_progress_updates(project_id: str):
    """Retrieve all progress updates for a specific project."""
    updates = []
    # 1. MongoDB
    try:
        col = _get_collection("progress_updates")
        updates = list(
            col.find({"project_id": project_id}, {"_id": 0}).sort("submitted_at", 1)
        )
    except Exception as e:
        print(f"[PROGRESS] Mongo fetch updates note: {e}")

    # 2. Local fallback if empty
    if not updates:
        try:
            from database import DATA_DIR
            import json
            from pathlib import Path
            p_file = Path(DATA_DIR) / "progress_updates.json"
            if p_file.exists():
                with open(p_file, "r", encoding="utf-8") as f:
                    all_u = json.load(f)
                    updates = [u for u in all_u if u.get("project_id") == project_id or u.get("idea_id") == project_id]
        except Exception as e:
            print(f"[PROGRESS] Local fetch updates error: {e}")

    # Also check legacy checkins
    if not updates:
        try:
            ci_col = _get_collection("mentor_checkins")
            updates = list(ci_col.find({"$or": [{"idea_id": project_id}, {"project_id": project_id}]}, {"_id": 0}).sort("submitted_at", 1))
        except Exception:
            pass

    for u in updates:
        if isinstance(u.get("submitted_at"), datetime.datetime):
            u["submitted_at"] = u["submitted_at"].isoformat()

    return {"success": True, "updates": updates, "count": len(updates)}


@router.post("/plan/adjust")
def manually_adjust_plan(req: PlanAdjustRequest):
    """
    Manually trigger plan adjustment analysis for a project.
    Fetches latest progress, runs AI, saves updated plan.
    """
    try:
        updates = []
        try:
            progress_col = _get_collection("progress_updates")
            updates = list(progress_col.find({"project_id": req.project_id}, {"_id": 0}).sort("submitted_at", -1).limit(5))
        except Exception:
            pass

        if not updates:
            from database import DATA_DIR
            import json
            from pathlib import Path
            p_file = Path(DATA_DIR) / "progress_updates.json"
            if p_file.exists():
                with open(p_file, "r", encoding="utf-8") as f:
                    all_u = json.load(f)
                    updates = [u for u in all_u if u.get("project_id") == req.project_id]

        latest = updates[0] if updates else {
            "progress_pct": 30,
            "mood": "struggling",
            "blockers": "API development delayed",
            "completed_tasks": [],
            "pending_tasks": ["API Development"],
        }

        adjustment = _run_ai_adjustment(
            idea_data=req.idea_data or {"title": req.project_title},
            progress_update=latest,
            previous_updates=updates[1:] if len(updates) > 1 else [],
            scope_report=req.scope_report or {},
        )

        plan_update = _generate_adjusted_plan(
            idea_data=req.idea_data or {"title": req.project_title},
            tracking_report=req.tracking_report or {},
            adjustment=adjustment,
            progress_update=latest,
        )

        now = datetime.datetime.utcnow()
        _save_plan_to_history(
            req.project_id,
            plan_update.get("previous_plan") or {},
            plan_update,
            "Manual adjustment requested",
            plan_update.get("adjustment_message", "Plan adjusted"),
        )

        try:
            plan_col = _get_collection("project_plans")
            plan_col.update_one(
                {"project_id": req.project_id},
                {"$set": {"current_plan": plan_update, "updated_at": now}},
                upsert=True,
            )
        except Exception:
            pass

        return {
            "success": True,
            "adjustment": adjustment,
            "plan_update": plan_update,
            "student_notification": plan_update.get("adjustment_message", "Plan adjusted successfully."),
            "previous_plan": plan_update.get("previous_plan"),
            "updated_plan": plan_update.get("updated_milestones"),
            "affected_milestone": plan_update.get("affected_milestone"),
            "recommended_action": plan_update.get("recommended_action"),
        }

    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.get("/plan/{project_id}/history")
def get_plan_history(project_id: str):
    """Get the full plan adjustment history for a project (Previous Plan → Updated Plan)."""
    history = []
    # 1. MongoDB
    try:
        col = _get_collection("plan_history")
        history = list(col.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).limit(10))
    except Exception as e:
        print(f"[PROGRESS] Mongo fetch plan history note: {e}")

    # 2. Local fallback
    if not history:
        try:
            from database import DATA_DIR
            import json
            from pathlib import Path
            p_file = Path(DATA_DIR) / "plan_history.json"
            if p_file.exists():
                with open(p_file, "r", encoding="utf-8") as f:
                    all_h = json.load(f)
                    history = [h for h in all_h if h.get("project_id") == project_id]
                    history.reverse()
        except Exception:
            pass

    for h in history:
        if isinstance(h.get("created_at"), datetime.datetime):
            h["created_at"] = h["created_at"].isoformat()

    return {"success": True, "history": history}


@router.get("/plan/{project_id}/current")
def get_current_plan(project_id: str):
    """Get the currently active plan for a project."""
    doc = None
    # 1. MongoDB
    try:
        col = _get_collection("project_plans")
        doc = col.find_one({"project_id": project_id}, {"_id": 0})
    except Exception:
        pass

    # 2. Local fallback
    if not doc:
        try:
            from database import DATA_DIR
            import json
            from pathlib import Path
            pp_file = Path(DATA_DIR) / "project_plans.json"
            if pp_file.exists():
                with open(pp_file, "r", encoding="utf-8") as f:
                    pp_data = json.load(f)
                    doc = pp_data.get(project_id)
        except Exception:
            pass

    if not doc:
        return {"success": True, "plan": None}

    if isinstance(doc.get("updated_at"), datetime.datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()

    return {"success": True, "plan": doc}



# ─── Legacy compatibility: keep the old /api/checkin endpoints working ─────────

class LegacyCheckInRequest(BaseModel):
    student_email: str
    idea_id: str
    project_title: str
    week_number: Optional[int] = None
    progress_pct: int
    mood: str
    blockers: Optional[str] = "None reported"
    summary: Optional[str] = ""
    idea_data: Optional[Dict[str, Any]] = {}
    scope_report: Optional[Dict[str, Any]] = {}


@router.post("/api/checkin")
def legacy_submit_checkin(req: LegacyCheckInRequest):
    """Legacy check-in endpoint (for backward compatibility with existing UI)."""
    try:
        col = _get_collection("mentor_checkins")
        now = datetime.datetime.utcnow()
        email = req.student_email.strip().lower()

        idea_checkins = list(col.find({"idea_id": req.idea_id}, {"_id": 0}).sort("submitted_at", 1))
        week_num = req.week_number or (len(idea_checkins) + 1)

        new_checkin = {
            "student_email": email,
            "idea_id": req.idea_id,
            "project_id": req.idea_id,
            "project_title": req.project_title,
            "week_number": week_num,
            "progress_pct": req.progress_pct,
            "mood": req.mood,
            "blockers": req.blockers or "None reported",
            "summary": req.summary or "",
            "submitted_at": now,
        }

        adjustment = _run_ai_adjustment(
            idea_data=req.idea_data or {"title": req.project_title},
            progress_update=new_checkin,
            previous_updates=idea_checkins,
            scope_report=req.scope_report or {},
        )
        new_checkin["adjustment"] = adjustment

        col.insert_one(new_checkin)
        new_checkin["submitted_at"] = now.isoformat()

        return {"success": True, "checkin": new_checkin, "adjustment": adjustment}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.get("/api/checkins/{email}")
def legacy_get_checkins(email: str):
    """Legacy: Get all check-ins for a student email."""
    try:
        col = _get_collection("mentor_checkins")
        items = list(col.find({"student_email": email.strip().lower()}, {"_id": 0}).sort("submitted_at", 1))
        for i in items:
            if isinstance(i.get("submitted_at"), datetime.datetime):
                i["submitted_at"] = i["submitted_at"].isoformat()
        return items
    except Exception:
        return []


@router.get("/api/checkins/{email}/{idea_id}")
def legacy_get_idea_checkins(email: str, idea_id: str):
    """Legacy: Get check-ins for a specific project."""
    try:
        col = _get_collection("mentor_checkins")
        items = list(col.find({"student_email": email.strip().lower(), "idea_id": idea_id}, {"_id": 0}).sort("submitted_at", 1))
        for i in items:
            if isinstance(i.get("submitted_at"), datetime.datetime):
                i["submitted_at"] = i["submitted_at"].isoformat()
        return items
    except Exception:
        return []
