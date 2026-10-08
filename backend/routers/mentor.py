"""
Mentor Chat Router – Conversational AI Mentor (Milestone 3)

POST /mentor/chat          → Send a message, get an AI mentor reply
GET  /mentor/history/{sid} → Get conversation history for a student + project
"""
import os
import datetime
import traceback
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class MentorChatRequest(BaseModel):
    student_email: str
    project_id: str                        # idea_id of the selected project
    message: str
    history: Optional[List[Dict[str, str]]] = []   # [{role, content}]
    project_context: Optional[Dict[str, Any]] = None  # optional direct rich context from frontend


class MentorChatResponse(BaseModel):
    reply: str
    conversation_id: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_project_context(project_id: str, incoming: Optional[dict] = None) -> dict:
    """Fetch rich project context from MongoDB or local storage, merged with incoming frontend context."""
    try:
        from database import (
            get_project_ideas_collection,
            get_tracking_reports_collection,
            get_database,
            is_mongo_available,
            DATA_DIR,
        )
        import json
        from pathlib import Path

        db = None
        idea = None
        mongo_up = False
        try:
            mongo_up = is_mongo_available()
            if mongo_up:
                db = get_database()
        except Exception:
            mongo_up = False

        # 1. Try MongoDB if available
        if mongo_up and db is not None:
            try:
                from bson import ObjectId
                ideas_col = get_project_ideas_collection()
                query_conditions = [{"idea_id": project_id}, {"id": project_id}, {"_id": project_id}, {"title": project_id}]
                try:
                    if len(project_id) == 24:
                        query_conditions.append({"_id": ObjectId(project_id)})
                except Exception:
                    pass
                idea = ideas_col.find_one({"$or": query_conditions})
            except Exception as e:
                print(f"[MENTOR] Mongo idea query error: {e}")

        # 2. Local JSON fallback if not found in MongoDB
        if not idea:
            ideas_file = Path(DATA_DIR) / "ideas.json"
            if ideas_file.exists():
                try:
                    with open(ideas_file, "r", encoding="utf-8") as f:
                        ideas_dict = json.load(f)
                        idea = (
                            ideas_dict.get(project_id)
                            or next((v for v in ideas_dict.values() if v.get("idea_id") == project_id or v.get("id") == project_id or v.get("title", "").strip().lower() == project_id.strip().lower() or str(v.get("_id")) == project_id), None)
                        )
                except Exception as e:
                    print(f"[MENTOR] Local idea read error: {e}")

        # 3. Fallback to incoming frontend project context
        if not idea and incoming:
            idea = incoming

        if not idea:
            return {}

        # Merge incoming reports if idea lacks them
        if incoming:
            if "trackingReport" in incoming and "trackingReport" not in idea:
                idea["trackingReport"] = incoming["trackingReport"]
            if "riskReport" in incoming and "riskReport" not in idea:
                idea["riskReport"] = incoming["riskReport"]
            if "scopeReport" in incoming and "scopeReport" not in idea:
                idea["scopeReport"] = incoming["scopeReport"]
            if "techStackReport" in incoming and "techStackReport" not in idea:
                idea["techStackReport"] = incoming["techStackReport"]

        # Tracking report
        tracking = None
        if mongo_up and db is not None:
            try:
                tracking_col = get_tracking_reports_collection()
                tracking = tracking_col.find_one({"$or": [{"idea_id": project_id}, {"project_id": project_id}]})
            except Exception:
                pass
        if not tracking and "trackingReport" in idea:
            tracking = {"report": idea["trackingReport"]}

        # Risk report
        risk = None
        if mongo_up and db is not None:
            try:
                risk = db["risk_reports"].find_one({"$or": [{"idea_id": project_id}, {"project_id": project_id}]})
            except Exception:
                pass
        if not risk and "riskReport" in idea:
            risk = {"report": idea["riskReport"]}

        # Scope report
        scope = None
        if mongo_up and db is not None:
            try:
                scope = db["scope_reports"].find_one({"$or": [{"idea_id": project_id}, {"project_id": project_id}]})
            except Exception:
                pass
        if not scope and "scopeReport" in idea:
            scope = {"report": idea["scopeReport"]}

        # Tech stack report
        tech = None
        if mongo_up and db is not None:
            try:
                tech = db["tech_stack_reports"].find_one({"$or": [{"idea_id": project_id}, {"project_id": project_id}]})
            except Exception:
                pass
        if not tech and "techStackReport" in idea:
            tech = {"report": idea["techStackReport"]}

        # Recent Progress Updates / Check-ins
        recent_updates = []
        if mongo_up and db is not None:
            try:
                pu_col = db["progress_updates"]
                recent_updates = list(pu_col.find({"project_id": project_id}).sort("submitted_at", -1).limit(5))
            except Exception:
                pass
            if not recent_updates:
                try:
                    ci_col = db["mentor_checkins"]
                    recent_updates = list(ci_col.find({"$or": [{"idea_id": project_id}, {"project_id": project_id}]}).sort("submitted_at", -1).limit(5))
                except Exception:
                    pass

        # Also check local checkins.json and progress_updates.json
        if not recent_updates:
            pu_file = Path(DATA_DIR) / "progress_updates.json"
            if pu_file.exists():
                try:
                    with open(pu_file, "r", encoding="utf-8") as f:
                        pu_data = json.load(f)
                        if isinstance(pu_data, list):
                            recent_updates = [u for u in pu_data if u.get("project_id") == project_id]
                except Exception:
                    pass

        if not recent_updates:
            checkins_file = Path(DATA_DIR) / "checkins.json"
            if checkins_file.exists():
                try:
                    with open(checkins_file, "r", encoding="utf-8") as f:
                        c_data = json.load(f)
                        if isinstance(c_data, list):
                            recent_updates = [c for c in c_data if c.get("project_id") == project_id or c.get("idea_id") == project_id]
                except Exception:
                    pass

        # Current active plan (if adjusted)
        active_plan = None
        if mongo_up and db is not None:
            try:
                plan_col = db["project_plans"]
                active_plan = plan_col.find_one({"project_id": project_id})
            except Exception:
                pass
        if not active_plan:
            plan_file = Path(DATA_DIR) / "project_plans.json"
            if plan_file.exists():
                try:
                    with open(plan_file, "r", encoding="utf-8") as f:
                        p_data = json.load(f)
                        active_plan = p_data.get(project_id) or next((v for v in p_data.values() if v.get("project_id") == project_id), None)
                except Exception:
                    pass

        ctx: dict = {
            "title": idea.get("title", ""),
            "desc": idea.get("desc", ""),
            "domain": idea.get("domain", ""),
            "team_size": idea.get("teamSize") or idea.get("team_size", "3"),
            "duration_days": idea.get("durationDays") or idea.get("duration_days", 30),
            "tech_ideas": idea.get("techIdeas") or idea.get("tech_ideas", ""),
            "features": idea.get("features", []),
            "status": idea.get("status", ""),
            "completed_tasks": [],
            "pending_tasks": [],
            "tech_stack": [],
            "risks": [],
            "overall_progress": idea.get("overallProgress", 0),
            "current_milestone": "N/A",
        }

        # Technology stack
        if tech and tech.get("report"):
            recommended = tech["report"].get("recommendedStack") or tech["report"].get("recommended_stack", {})
            if isinstance(recommended, dict):
                ctx["tech_stack"] = list(recommended.keys())
            elif isinstance(recommended, list):
                ctx["tech_stack"] = [t.get("name", str(t)) if isinstance(t, dict) else str(t) for t in recommended]
        if not ctx["tech_stack"] and ctx["tech_ideas"]:
            ctx["tech_stack"] = [t.strip() for t in ctx["tech_ideas"].split(",") if t.strip()]

        # Scope / objectives
        if scope and scope.get("report"):
            ctx["problem_statement"] = scope["report"].get("problemStatement", "")
            ctx["objectives"] = scope["report"].get("objectives", [])

        # Milestones & Tasks from tracking report or active plan
        milestones = []
        if active_plan and active_plan.get("current_plan"):
            cp = active_plan["current_plan"]
            milestones = cp.get("updated_milestones", []) or cp.get("milestones", [])
            ctx["timeline_adjustment_note"] = cp.get("timeline_adjustment", "")

        if not milestones and tracking and tracking.get("report"):
            tr = tracking["report"]
            milestones = tr.get("milestones", [])
            ctx["overall_progress"] = tr.get("overallProgress", ctx["overall_progress"])

        if not milestones and idea.get("milestones"):
            milestones = idea.get("milestones", [])

        completed_m = []
        pending_m = []
        for m in milestones:
            is_comp = m.get("completed") or m.get("status") == "completed"
            title = m.get("title", "")
            if is_comp:
                completed_m.append(title)
                for d in m.get("deliverables", []) or m.get("tasks", []):
                    ctx["completed_tasks"].append(d)
            else:
                pending_m.append(title)
                for d in m.get("deliverables", []) or m.get("tasks", []):
                    ctx["pending_tasks"].append(d)

        ctx["completed_milestones"] = completed_m
        ctx["pending_milestones"] = pending_m
        ctx["current_milestone"] = next(
            (m.get("title") for m in milestones if m.get("status") == "in_progress"),
            pending_m[0] if pending_m else (milestones[0].get("title") if milestones else "Core Implementation")
        )

        # Incorporate Tasks from Recent Progress Updates
        if recent_updates:
            latest = recent_updates[0]
            ctx["latest_progress_pct"] = latest.get("progress_pct", ctx["overall_progress"])
            ctx["overall_progress"] = latest.get("progress_pct", ctx["overall_progress"])
            ctx["latest_blockers"] = latest.get("blockers", "")
            ctx["latest_mood"] = latest.get("mood", "")

            # Tasks submitted directly by student
            for t in latest.get("completed_tasks", []):
                if t and t not in ctx["completed_tasks"]:
                    ctx["completed_tasks"].append(t)
            for t in latest.get("pending_tasks", []):
                if t and t not in ctx["pending_tasks"]:
                    ctx["pending_tasks"].append(t)

        # Risks
        if risk and risk.get("report"):
            r_report = risk["report"]
            ctx["risk_level"] = r_report.get("risk_level", "Medium")
            ctx["top_blocker"] = r_report.get("top_blocker", "")
            for r in r_report.get("risks", [])[:4]:
                r_title = r.get("title", "")
                r_mitigation = r.get("mitigation", "")
                ctx["risks"].append(f"{r_title} (Mitigation: {r_mitigation})" if r_mitigation else r_title)

        return ctx
    except Exception as e:
        print(f"[MENTOR] Context fetch error: {e}")
        return incoming or {}


def _build_system_prompt(ctx: dict) -> str:
    """Build a comprehensive academic mentor system prompt that answers ALL questions grounded in the selected project."""
    title = ctx.get("title", "this project")
    domain = ctx.get("domain", "Computer Science & Engineering").upper()
    tech_stack = ", ".join(ctx.get("tech_stack", [])) or ctx.get("tech_ideas", "Modern Web/AI Architecture")
    current_milestone = ctx.get("current_milestone", "Core Implementation")
    progress = ctx.get("overall_progress", 0)

    lines = [
        "You are ProjectGuide-AI, an expert Senior Academic Project Mentor, Faculty Guide, and Principal Architect.",
        f"You are actively mentoring the student team on their capstone project: '{title}'.",
        "",
        "MANDATORY BEHAVIORAL DIRECTIVES:",
        f"1. ANSWER EVERY QUESTION: You MUST answer ALL questions asked by the student. Never refuse or say 'I can only answer questions related to...'.",
        f"2. GROUND EVERY ANSWER IN '{title}': Whatever the student asks, connect your response and advice directly to their selected project '{title}' and its tech stack ({tech_stack}).",
        f"   - When student asks for code/debugging/implementation: Provide clear, working code snippets, endpoint patterns, and troubleshooting steps tailored to '{title}'.",
        f"   - When student reports delays/blockers (e.g. 'I couldn't finish the API development this week', 'Help me catch up'): Directly analyze their current milestone ('{current_milestone}'), current progress ({progress}%), identify downstream timeline risks, and give a clear, encouraging 3-step action plan to recover.",
        f"   - When student asks conceptual/academic questions (e.g. JWT vs Session, Docker, SQL vs NoSQL, ML architectures): Explain the concept thoroughly, then show specifically how they should apply it in '{title}'.",
        f"   - When student asks about faculty viva/presentations: Give them rigorous guide tips on how to defend and demonstrate their architecture during evaluation.",
        f"   - When student asks general/open-ended questions: Answer warmly and helpfully, and seamlessly tie the concept or analogy back to building '{title}'.",
        "3. FORMATTING: Use structured Markdown with bold titles, clean bullet points, and code blocks. Keep responses crisp, encouraging, and highly actionable (150-350 words).",
        "",
        f"=== SELECTED PROJECT DOSSIER: '{title}' ===",
        f"- Project Title: {title}",
        f"- Description: {ctx.get('desc', 'N/A')[:400]}",
        f"- Domain: {domain}",
        f"- Team Size: {ctx.get('team_size', '3')} members | Duration: {ctx.get('duration_days', '30')} days",
        f"- Technology Stack: {tech_stack}",
        f"- Current Milestone: {current_milestone}",
        f"- Overall Progress: {progress}%",
    ]

    if ctx.get("completed_tasks"):
        lines.append(f"- Completed Tasks: {'; '.join(ctx['completed_tasks'][:6])}")
    if ctx.get("pending_tasks"):
        lines.append(f"- Pending Tasks: {'; '.join(ctx['pending_tasks'][:6])}")
    if ctx.get("features"):
        lines.append(f"- Core Features: {', '.join(ctx['features'][:6])}")
    if ctx.get("latest_blockers") and ctx["latest_blockers"] != "None reported":
        lines.append(f"- Current Problem/Blocker Reported: {ctx['latest_blockers']}")
    if ctx.get("risks"):
        lines.append(f"- Identified Risks: {'; '.join(ctx['risks'][:3])}")
    if ctx.get("risk_level"):
        lines.append(f"- Risk Level: {ctx['risk_level']}")
    if ctx.get("timeline_adjustment_note"):
        lines.append(f"- Active Timeline Adjustment: {ctx['timeline_adjustment_note']}")

    return "\n".join(lines)


def _call_groq(system_prompt: str, history: list, user_message: str, ctx: dict = None) -> str:
    """Call Groq LLM with full conversation context and robust error fallback."""
    from groq import Groq

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    client = Groq(api_key=api_key)

    messages = [{"role": "system", "content": system_prompt}]
    for h in (history or [])[-10:]:   # keep last 10 turns
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    chat_model_env = os.getenv("GROQ_CHAT_MODEL", "qwen/qwen3.8-27b").replace("groq/", "")
    models_to_try = [
        chat_model_env,
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
    ]
    seen = set()
    models = [m for m in models_to_try if not (m in seen or seen.add(m))]

    last_err = None
    for model in models:
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.4,
                max_tokens=750,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            last_err = e

    # If all models fail, provide a smart, project-grounded fallback based on the prompt
    print(f"[MENTOR] LLM call fallback due to: {last_err}")
    title = (ctx or {}).get("title", "your project")
    cur_m = (ctx or {}).get("current_milestone", "Core Implementation")
    return (
        f"**Mentor Guidance for '{title}'**\n\n"
        f"I reviewed your question regarding your current milestone (**{cur_m}**). "
        f"When tackling this, focus on building the foundational modules and database schema first before adding secondary features. "
        f"Break down your pending deliverables into daily tasks, test each endpoint with unit tests, and keep your faculty guide updated on your progress.\n\n"
        f"Let me know if you would like specific code snippets or debugging assistance for your tech stack!"
    )


def _save_conversation(student_email: str, project_id: str, user_msg: str, ai_reply: str) -> str:
    """Append the turn to MongoDB mentor_conversations collection and local storage."""
    now = datetime.datetime.utcnow()
    turn = {
        "role_user": user_msg,
        "role_assistant": ai_reply,
        "timestamp": now.isoformat(),
    }

    # 1. MongoDB
    try:
        from database import is_mongo_available, get_database
        if is_mongo_available():
            db = get_database()
            col = db["mentor_conversations"]
            col.update_one(
                {"student_email": student_email.lower(), "project_id": project_id},
                {
                    "$push": {"turns": turn},
                    "$set": {"updated_at": now},
                    "$setOnInsert": {"created_at": now},
                },
                upsert=True,
            )
            doc = col.find_one({"student_email": student_email.lower(), "project_id": project_id})
            if doc:
                return str(doc["_id"])
    except Exception as e:
        print(f"[MENTOR] Mongo save conversation note: {e}")

    # 2. Local JSON fallback
    try:
        from database import DATA_DIR
        import json
        from pathlib import Path
        conv_file = Path(DATA_DIR) / "mentor_conversations.json"
        data = {}
        if conv_file.exists():
            with open(conv_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        key = f"{student_email.lower()}_{project_id}"
        if key not in data:
            data[key] = {"student_email": student_email.lower(), "project_id": project_id, "turns": [], "created_at": now.isoformat()}
        data[key]["turns"].append(turn)
        data[key]["updated_at"] = now.isoformat()
        with open(conv_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return key
    except Exception as e:
        print(f"[MENTOR] Local save conversation error: {e}")
        return "local_saved"


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/mentor/chat", response_model=MentorChatResponse)
def mentor_chat(req: MentorChatRequest):
    """
    Project-aware mentor chat endpoint.
    Fetches rich project context from MongoDB/storage/request, answers all questions grounded in the project.
    """
    try:
        ctx = _get_project_context(req.project_id, req.project_context)
        system_prompt = _build_system_prompt(ctx)
        reply = _call_groq(system_prompt, req.history, req.message, ctx)
        conv_id = _save_conversation(req.student_email, req.project_id, req.message, reply)
        return {"reply": reply, "conversation_id": conv_id}
    except Exception as e:
        traceback.print_exc()
        return {
            "reply": (
                "I am your academic mentor. I'm reviewing your project's current milestone and technical architecture. "
                "Let me know which specific module or question you'd like to dive into next!"
            ),
            "conversation_id": "error",
        }


@router.delete("/mentor/history/{student_email}/{project_id}")
def clear_mentor_history(student_email: str, project_id: str):
    """Clear conversation history for a student + project so they can start fresh."""
    email = student_email.strip().lower()
    try:
        from database import is_mongo_available, get_database, DATA_DIR
        import json
        from pathlib import Path

        # 1. MongoDB
        if is_mongo_available():
            db = get_database()
            col = db["mentor_conversations"]
            col.delete_one({"student_email": email, "project_id": project_id})

        # 2. Local JSON
        conv_file = Path(DATA_DIR) / "mentor_conversations.json"
        if conv_file.exists():
            with open(conv_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            key = f"{email}_{project_id}"
            if key in data:
                del data[key]
                with open(conv_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)

        return {"success": True, "message": "Chat history cleared"}
    except Exception as e:
        print(f"[MENTOR] Error clearing history: {e}")
        return {"success": False, "error": str(e)}


@router.get("/mentor/history/{student_email}/{project_id}")
def get_mentor_history(student_email: str, project_id: str):
    """Return the full saved conversation for a student + project."""
    email = student_email.strip().lower()

    # 1. MongoDB
    try:
        from database import is_mongo_available, get_database
        if is_mongo_available():
            db = get_database()
            col = db["mentor_conversations"]
            doc = col.find_one(
                {"student_email": email, "project_id": project_id},
                {"_id": 0},
            )
            if doc and doc.get("turns"):
                return {"turns": doc.get("turns", []), "updated_at": str(doc.get("updated_at", ""))}
    except Exception as e:
        print(f"[MENTOR] History Mongo fetch note: {e}")

    # 2. Local fallback
    try:
        from database import DATA_DIR
        import json
        from pathlib import Path
        conv_file = Path(DATA_DIR) / "mentor_conversations.json"
        if conv_file.exists():
            with open(conv_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            key = f"{email}_{project_id}"
            if key in data:
                doc = data[key]
                return {"turns": doc.get("turns", []), "updated_at": doc.get("updated_at", "")}
    except Exception as e:
        print(f"[MENTOR] Local history read error: {e}")

    return {"turns": []}

