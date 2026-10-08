"""
Document Generation Router (Milestone 3 - Enhanced)

POST /documents/synopsis          → Generate project synopsis
POST /documents/methodology       → Generate methodology report
POST /documents/progress-report   → Generate progress report
GET  /documents/{project_id}      → List all generated documents for a project
POST /api/generate-doc            → Legacy endpoint (backward compatible)
"""
import traceback
import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class DocumentRequest(BaseModel):
    project_id: str
    student_email: Optional[str] = ""
    # Project data (auto-fetched from MongoDB if not provided)
    idea_data: Optional[Dict[str, Any]] = {}
    student_info: Optional[Dict[str, Any]] = {}
    feasibility_report: Optional[Dict[str, Any]] = {}
    scope_report: Optional[Dict[str, Any]] = {}
    tech_stack_report: Optional[Dict[str, Any]] = {}
    risk_report: Optional[Dict[str, Any]] = {}
    check_ins: Optional[List[Dict[str, Any]]] = []


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_col(name: str):
    from database import get_database
    return get_database()[name]


def _fetch_project_context(project_id: str, student_email: str = "", incoming: dict = None) -> dict:
    """Auto-fetch all 12 project data elements from MongoDB, local storage, or incoming payload."""
    ctx: dict = {
        "idea_data": {}, "student_info": {},
        "feasibility_report": {}, "scope_report": {},
        "tech_stack_report": {}, "risk_report": {},
        "check_ins": [], "milestones": [],
        "completed_tasks": [], "pending_tasks": [],
        "progress_updates": [], "identified_risks": [],
        "mitigation_actions": [], "project_modules": [],
        "tech_stack": [], "problem_statement": "", "objectives": [],
    }
    try:
        from database import (
            get_project_ideas_collection, get_feasibility_reports_collection,
            get_scope_reports_collection, get_tech_stack_reports_collection,
            get_tracking_reports_collection, get_students_collection, get_database,
            is_mongo_available, DATA_DIR,
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

        # 1. Try MongoDB if online
        if mongo_up:
            try:
                from bson import ObjectId
                query_cond = [{"idea_id": project_id}, {"id": project_id}, {"_id": project_id}, {"title": project_id}]
                try:
                    if len(project_id) == 24:
                        query_cond.append({"_id": ObjectId(project_id)})
                except Exception:
                    pass
                idea = get_project_ideas_collection().find_one({"$or": query_cond}, {"_id": 0})
            except Exception:
                pass

        # 2. Local fallback if not found
        if not idea:
            ideas_file = Path(DATA_DIR) / "ideas.json"
            if ideas_file.exists():
                try:
                    with open(ideas_file, "r", encoding="utf-8") as f:
                        all_i = json.load(f)
                        idea = all_i.get(project_id) or next((v for v in all_i.values() if v.get("idea_id") == project_id or v.get("id") == project_id or v.get("title", "").strip().lower() == project_id.strip().lower()), None)
                except Exception:
                    pass

        if idea:
            ctx["idea_data"] = {
                "title": idea.get("title", ""),
                "desc": idea.get("desc", ""),
                "domain": idea.get("domain", ""),
                "teamSize": idea.get("teamSize") or idea.get("team_size", "3"),
                "durationDays": idea.get("durationDays") or idea.get("duration_days", 30),
                "techIdeas": idea.get("techIdeas") or idea.get("tech_ideas", ""),
                "features": idea.get("features", []),
            }
            ctx["project_modules"] = idea.get("features", [])

            email = idea.get("student_email") or student_email
            if email:
                try:
                    student = get_students_collection().find_one({"email": email.strip().lower()}, {"_id": 0})
                    if student:
                        ctx["student_info"] = {
                            "firstName": student.get("first_name", ""),
                            "lastName": student.get("last_name", ""),
                            "branch": student.get("branch", ""),
                            "year": student.get("year", ""),
                            "rollNo": student.get("roll_no", ""),
                        }
                except Exception:
                    pass

        # Feasibility report
        try:
            feas = get_feasibility_reports_collection().find_one({"$or": [{"idea_id": project_id}, {"project_id": project_id}]}, {"_id": 0})
            if feas:
                ctx["feasibility_report"] = feas.get("report", feas)
        except Exception:
            pass
        if not ctx["feasibility_report"] and idea and "feasibilityReport" in idea:
            ctx["feasibility_report"] = idea["feasibilityReport"]

        # Scope report
        try:
            scope = get_scope_reports_collection().find_one({"$or": [{"idea_id": project_id}, {"project_id": project_id}]}, {"_id": 0})
            if scope:
                ctx["scope_report"] = scope.get("report", scope)
        except Exception:
            pass
        if not ctx["scope_report"] and idea and "scopeReport" in idea:
            ctx["scope_report"] = idea["scopeReport"]

        if ctx["scope_report"]:
            ctx["problem_statement"] = ctx["scope_report"].get("problemStatement", "")
            ctx["objectives"] = ctx["scope_report"].get("objectives", [])

        # Tech stack report
        try:
            tech = get_tech_stack_reports_collection().find_one({"$or": [{"idea_id": project_id}, {"project_id": project_id}]}, {"_id": 0})
            if tech:
                ctx["tech_stack_report"] = tech.get("report", tech)
        except Exception:
            pass
        if not ctx["tech_stack_report"] and idea and "techStackReport" in idea:
            ctx["tech_stack_report"] = idea["techStackReport"]

        if ctx["tech_stack_report"]:
            rec = ctx["tech_stack_report"].get("recommendedStack") or ctx["tech_stack_report"].get("recommended_stack", {})
            if isinstance(rec, dict):
                ctx["tech_stack"] = list(rec.keys())
            elif isinstance(rec, list):
                ctx["tech_stack"] = [t.get("name", str(t)) if isinstance(t, dict) else str(t) for t in rec]
        if not ctx["tech_stack"] and idea and idea.get("tech_ideas"):
            ctx["tech_stack"] = [t.strip() for t in idea["tech_ideas"].split(",") if t.strip()]

        # Milestones from tracking report or active plan
        try:
            plan_col = db["project_plans"]
            plan_doc = plan_col.find_one({"project_id": project_id})
            if plan_doc and plan_doc.get("current_plan"):
                ctx["milestones"] = plan_doc["current_plan"].get("updated_milestones", [])
        except Exception:
            pass

        if not ctx["milestones"]:
            try:
                tr_col = get_tracking_reports_collection()
                tr = tr_col.find_one({"$or": [{"idea_id": project_id}, {"project_id": project_id}]}, {"_id": 0})
                if tr:
                    ctx["milestones"] = (tr.get("report") or tr).get("milestones", [])
            except Exception:
                pass
        if not ctx["milestones"] and idea and "trackingReport" in idea:
            ctx["milestones"] = idea["trackingReport"].get("milestones", [])

        # Extract tasks from milestones
        for m in ctx["milestones"]:
            m_title = m.get("title", "")
            if not ctx["project_modules"] and m_title:
                ctx["project_modules"].append(m_title)
            is_comp = m.get("completed") or m.get("status") == "completed"
            for d in m.get("deliverables", []) or m.get("tasks", []):
                if is_comp:
                    ctx["completed_tasks"].append(d)
                else:
                    ctx["pending_tasks"].append(d)

        # Risk report & Mitigations
        try:
            risk = db["risk_reports"].find_one({"$or": [{"idea_id": project_id}, {"project_id": project_id}]}, {"_id": 0})
            if risk:
                ctx["risk_report"] = risk.get("report", risk)
        except Exception:
            pass
        if not ctx["risk_report"] and idea and "riskReport" in idea:
            ctx["risk_report"] = idea["riskReport"]

        if ctx["risk_report"]:
            for r in ctx["risk_report"].get("risks", []):
                r_title = r.get("title", "")
                r_mitigation = r.get("mitigation", "")
                if r_title:
                    ctx["identified_risks"].append(r_title)
                if r_mitigation:
                    ctx["mitigation_actions"].append(f"{r_title}: {r_mitigation}")

        # Progress Updates / Check-ins
        try:
            pu_col = db["progress_updates"]
            updates = list(pu_col.find({"project_id": project_id}, {"_id": 0}).sort("submitted_at", 1))
            for u in updates:
                for ct in u.get("completed_tasks", []):
                    if ct and ct not in ctx["completed_tasks"]:
                        ctx["completed_tasks"].append(ct)
                for pt in u.get("pending_tasks", []):
                    if pt and pt not in ctx["pending_tasks"]:
                        ctx["pending_tasks"].append(pt)
                if isinstance(u.get("submitted_at"), datetime.datetime):
                    u["submitted_at"] = u["submitted_at"].isoformat()
            ctx["progress_updates"] = updates
            ctx["check_ins"] = updates
        except Exception:
            pass

        if not ctx["check_ins"]:
            try:
                ci_col = db["mentor_checkins"]
                checkins = list(ci_col.find({"$or": [{"idea_id": project_id}, {"project_id": project_id}]}, {"_id": 0}).sort("submitted_at", 1))
                for c in checkins:
                    if isinstance(c.get("submitted_at"), datetime.datetime):
                        c["submitted_at"] = c["submitted_at"].isoformat()
                ctx["check_ins"] = checkins
                ctx["progress_updates"] = checkins
            except Exception:
                pass

    except Exception as e:
        print(f"[DOCUMENTS] Context fetch error: {e}")

    # Merge incoming frontend project context
    if incoming:
        if incoming.get("idea_data"):
            for k, v in incoming["idea_data"].items():
                if v:
                    ctx["idea_data"][k] = v
            if incoming["idea_data"].get("features"):
                ctx["project_modules"] = incoming["idea_data"]["features"]
            if incoming["idea_data"].get("milestones"):
                ctx["milestones"] = incoming["idea_data"]["milestones"]
        if incoming.get("scope_report"):
            ctx["scope_report"] = {**ctx["scope_report"], **incoming["scope_report"]}
            if ctx["scope_report"].get("problemStatement"):
                ctx["problem_statement"] = ctx["scope_report"]["problemStatement"]
            if ctx["scope_report"].get("objectives"):
                ctx["objectives"] = ctx["scope_report"]["objectives"]
        if incoming.get("tech_stack_report"):
            ctx["tech_stack_report"] = {**ctx["tech_stack_report"], **incoming["tech_stack_report"]}
            rec = ctx["tech_stack_report"].get("recommendedStack") or ctx["tech_stack_report"].get("recommended_stack", {})
            if isinstance(rec, dict):
                ctx["tech_stack"] = list(rec.keys())
            elif isinstance(rec, list):
                ctx["tech_stack"] = [t.get("name", str(t)) if isinstance(t, dict) else str(t) for t in rec]
        if incoming.get("risk_report"):
            ctx["risk_report"] = {**ctx["risk_report"], **incoming["risk_report"]}
            for r in ctx["risk_report"].get("risks", []):
                r_title = r.get("title", "")
                r_mitigation = r.get("mitigation", "")
                if r_title and r_title not in ctx["identified_risks"]:
                    ctx["identified_risks"].append(r_title)
                if r_mitigation and r_mitigation not in ctx["mitigation_actions"]:
                    ctx["mitigation_actions"].append(f"{r_title}: {r_mitigation}")
        if incoming.get("student_info"):
            ctx["student_info"] = {**ctx["student_info"], **incoming["student_info"]}

    ctx["title"] = ctx["idea_data"].get("title", "")
    ctx["desc"] = ctx["idea_data"].get("desc", "")
    ctx["domain"] = ctx["idea_data"].get("domain", "")

    return ctx


def _save_document(project_id: str, student_email: str, doc_type: str, doc: dict):
    """Persist generated document to MongoDB and local JSON fallback."""
    now = datetime.datetime.utcnow()
    # 1. MongoDB
    try:
        col = _get_col("generated_documents")
        col.update_one(
            {"project_id": project_id, "doc_type": doc_type},
            {
                "$set": {
                    "project_id": project_id,
                    "student_email": student_email.strip().lower(),
                    "doc_type": doc_type,
                    "document": doc,
                    "generated_at": now,
                },
                "$push": {
                    "history": {
                        "generated_at": now,
                        "snapshot": doc,
                    }
                },
            },
            upsert=True,
        )
    except Exception as e:
        print(f"[DOCUMENTS] Mongo save note: {e}")

    # 2. Local JSON fallback
    try:
        from database import DATA_DIR
        import json
        from pathlib import Path
        d_file = Path(DATA_DIR) / "generated_documents.json"
        docs = []
        if d_file.exists():
            with open(d_file, "r", encoding="utf-8") as f:
                docs = json.load(f)
        docs = [d for d in docs if not (d.get("project_id") == project_id and d.get("doc_type") == doc_type)]
        docs.append({
            "project_id": project_id,
            "student_email": student_email.strip().lower(),
            "doc_type": doc_type,
            "document": doc,
            "generated_at": now.isoformat(),
        })
        with open(d_file, "w", encoding="utf-8") as f:
            json.dump(docs, f, indent=2)
    except Exception as e:
        print(f"[DOCUMENTS] Local save error: {e}")


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/documents/synopsis")
def generate_synopsis(req: DocumentRequest):
    """Generate project synopsis, collecting all 12 project elements from MongoDB/storage."""
    try:
        ctx = _fetch_project_context(req.project_id, req.student_email or "", incoming=req.dict())
        idea = {**ctx["idea_data"], **(req.idea_data or {})}
        scope = {**ctx["scope_report"], **(req.scope_report or {})}
        tech = {**ctx["tech_stack_report"], **(req.tech_stack_report or {})}
        student = {**ctx["student_info"], **(req.student_info or {})}

        from agents.doc_generator_agent import generate_synopsis as _gen
        doc = _gen(
            idea_data=idea,
            student_info=student,
            scope_report=scope,
            tech_stack_report=tech,
            full_context=ctx,
        )

        _save_document(req.project_id, req.student_email or "", "synopsis", doc)
        return {"success": True, "document": doc}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.post("/documents/methodology")
def generate_methodology(req: DocumentRequest):
    """Generate methodology document, collecting all 12 project elements from MongoDB/storage."""
    try:
        ctx = _fetch_project_context(req.project_id, req.student_email or "", incoming=req.dict())
        idea = {**ctx["idea_data"], **(req.idea_data or {})}
        scope = {**ctx["scope_report"], **(req.scope_report or {})}
        tech = {**ctx["tech_stack_report"], **(req.tech_stack_report or {})}
        feas = {**ctx["feasibility_report"], **(req.feasibility_report or {})}

        from agents.doc_generator_agent import generate_methodology as _gen
        doc = _gen(
            idea_data=idea,
            scope_report=scope,
            tech_stack_report=tech,
            feasibility_report=feas,
            full_context=ctx,
        )

        _save_document(req.project_id, req.student_email or "", "methodology", doc)
        return {"success": True, "document": doc}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.post("/documents/progress-report")
def generate_progress_report(req: DocumentRequest):
    """Generate progress report, collecting all 12 project elements from MongoDB/storage."""
    try:
        ctx = _fetch_project_context(req.project_id, req.student_email or "", incoming=req.dict())
        idea = {**ctx["idea_data"], **(req.idea_data or {})}
        risk = {**ctx["risk_report"], **(req.risk_report or {})}
        check_ins = ctx["check_ins"] or req.check_ins or []

        from agents.doc_generator_agent import generate_progress_report as _gen
        doc = _gen(
            idea_data=idea,
            check_ins=check_ins,
            risk_report=risk,
            full_context=ctx,
        )

        _save_document(req.project_id, req.student_email or "", "progress_report", doc)
        return {"success": True, "document": doc}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.get("/documents/{project_id}")
def list_documents(project_id: str):
    """List all generated documents for a project from MongoDB or local storage."""
    docs = []
    # 1. MongoDB
    try:
        col = _get_col("generated_documents")
        docs = list(col.find({"project_id": project_id}, {"_id": 0, "history": 0}).sort("generated_at", -1))
    except Exception as e:
        print(f"[DOCUMENTS] Mongo list note: {e}")

    # 2. Local fallback
    if not docs:
        try:
            from database import DATA_DIR
            import json
            from pathlib import Path
            d_file = Path(DATA_DIR) / "generated_documents.json"
            if d_file.exists():
                with open(d_file, "r", encoding="utf-8") as f:
                    all_d = json.load(f)
                    docs = [d for d in all_d if d.get("project_id") == project_id]
        except Exception:
            pass

    for d in docs:
        if isinstance(d.get("generated_at"), datetime.datetime):
            d["generated_at"] = d["generated_at"].isoformat()

    return {"success": True, "documents": docs}


@router.delete("/documents/{project_id}")
def delete_documents(project_id: str):
    """Delete/reset generated documents for a project."""
    # 1. MongoDB
    try:
        col = _get_col("generated_documents")
        col.delete_many({"project_id": project_id})
    except Exception as e:
        print(f"[DOCUMENTS] Mongo delete note: {e}")

    # 2. Local fallback
    try:
        from database import DATA_DIR
        import json
        from pathlib import Path
        d_file = Path(DATA_DIR) / "generated_documents.json"
        if d_file.exists():
            with open(d_file, "r", encoding="utf-8") as f:
                docs = json.load(f)
            docs = [d for d in docs if d.get("project_id") != project_id]
            with open(d_file, "w", encoding="utf-8") as f:
                json.dump(docs, f, indent=2)
    except Exception as e:
        print(f"[DOCUMENTS] Local delete error: {e}")

    return {"success": True, "message": "Documents reset"}




# ─── Legacy endpoint (backward compatible with existing UI) ──────────────────

class LegacyDocGenRequest(BaseModel):
    doc_type: str
    idea_data: Dict[str, Any]
    student_info: Optional[Dict[str, Any]] = {}
    feasibility_report: Optional[Dict[str, Any]] = {}
    scope_report: Optional[Dict[str, Any]] = {}
    tech_stack_report: Optional[Dict[str, Any]] = {}
    risk_report: Optional[Dict[str, Any]] = {}
    check_ins: Optional[List[Dict[str, Any]]] = []
    project_id: Optional[str] = ""


@router.post("/api/generate-doc")
def legacy_generate_document(req: LegacyDocGenRequest):
    """Legacy document generation endpoint (keeps existing UI working)."""
    try:
        from agents.doc_generator_agent import (
            generate_synopsis,
            generate_methodology,
            generate_progress_report,
        )

        if req.doc_type == "synopsis":
            doc = generate_synopsis(
                idea_data=req.idea_data,
                student_info=req.student_info or {},
                scope_report=req.scope_report or {},
                tech_stack_report=req.tech_stack_report or {},
            )
        elif req.doc_type == "methodology":
            doc = generate_methodology(
                idea_data=req.idea_data,
                scope_report=req.scope_report or {},
                tech_stack_report=req.tech_stack_report or {},
                feasibility_report=req.feasibility_report or {},
            )
        elif req.doc_type == "progress_report":
            doc = generate_progress_report(
                idea_data=req.idea_data,
                check_ins=req.check_ins or [],
                risk_report=req.risk_report or {},
            )
        else:
            return {"error": f"Unknown doc_type: {req.doc_type}"}

        # Also save to MongoDB if project_id provided
        if req.project_id:
            _save_document(req.project_id, "", req.doc_type, doc)

        return doc

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e), "doc_type": req.doc_type}
