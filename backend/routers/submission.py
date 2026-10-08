import json
import uuid
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId

import schemas
from database import (
    get_project_ideas_collection,
    project_ideas_col,
    project_milestones_col,
    project_analyses_col,
    get_next_id
)
from models import make_project_idea_doc, now_utc

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
IDEAS_FILE = DATA_DIR / "ideas.json"


def _load_local_ideas() -> Dict[str, dict]:
    if not IDEAS_FILE.exists():
        return {}
    try:
        return json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_local_ideas(data: Dict[str, dict]):
    try:
        IDEAS_FILE.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    except Exception as e:
        print(f"Warning: could not save local ideas: {e}")


def _serialize_doc(doc: dict) -> dict:
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
        if "idea_id" not in d:
            d["idea_id"] = d["_id"]
        if "id" not in d:
            d["id"] = d["_id"]
    if "created_at" in d and isinstance(d["created_at"], (datetime.datetime, datetime.date)):
        d["created_at"] = d["created_at"].isoformat()
    if "updated_at" in d and isinstance(d["updated_at"], (datetime.datetime, datetime.date)):
        d["updated_at"] = d["updated_at"].isoformat()
    return d


@router.post("/submit-idea", response_model=schemas.IdeaResponse)
def submit_idea(data: schemas.IdeaRequest):
    email = (data.student_email or data.user_email or "").strip().lower()
    
    # Parse student_id
    raw_sid = data.student_id
    if isinstance(raw_sid, int) or (isinstance(raw_sid, str) and raw_sid.isdigit()):
        student_id = int(raw_sid)
    else:
        student_id = str(raw_sid)

    # Next integer project ID
    p_id = get_next_id("project_ideas")

    # Domain-specific smart blueprint defaults
    domain = (data.domain or "web").lower()
    if "aiml" in domain or "ai" in domain or "ml" in domain:
        tech_stack = ["Python", "FastAPI", "PyTorch", "OpenCV", "React"]
        feasibility_score = 88
    elif "iot" in domain:
        tech_stack = ["C++", "ESP32", "MQTT", "Node.js", "React"]
        feasibility_score = 82
    elif "app" in domain or "mobile" in domain:
        tech_stack = ["React Native", "Node.js", "Express", "MongoDB"]
        feasibility_score = 85
    else:
        tech_stack = ["React.js", "FastAPI", "PostgreSQL", "TailwindCSS"]
        feasibility_score = 90

    idea_doc = make_project_idea_doc(data)
    idea_doc["id"] = p_id
    idea_doc["idea_id"] = p_id
    idea_doc["student_id"] = student_id
    idea_doc["student_email"] = email
    idea_doc["feasibility_score"] = feasibility_score
    idea_doc["tech_stack"] = tech_stack
    idea_doc["milestones_done"] = 0
    idea_doc["status"] = "pending_review"

    # Blueprint Milestones
    milestones = [
        {
            "id": 1,
            "project_id": p_id,
            "phase_index": 1,
            "week_label": "Week 1-2",
            "title": "Phase 1: Architecture, Problem Framing & Setup",
            "desc": "System design, environment provisioning, dataset/API schema definition.",
            "deliverables": ["Architecture Diagram", "API Specification", "Git Repository Setup"],
            "is_completed": False
        },
        {
            "id": 2,
            "project_id": p_id,
            "phase_index": 2,
            "week_label": "Week 3-4",
            "title": "Phase 2: Core Algorithm / Backend Development",
            "desc": "Implement core algorithmic pipeline, data handlers, and REST API controllers.",
            "deliverables": ["Backend Endpoints", "Data Processing Engine", "Unit Test Suite"],
            "is_completed": False
        },
        {
            "id": 3,
            "project_id": p_id,
            "phase_index": 3,
            "week_label": "Week 5-6",
            "title": "Phase 3: Frontend Integration & Interactive Dashboard",
            "desc": "Connect user interface to backend services, implement reactive charts and analytics.",
            "deliverables": ["Responsive Web UI", "Real-time State Sync", "User Testing Report"],
            "is_completed": False
        },
        {
            "id": 4,
            "project_id": p_id,
            "phase_index": 4,
            "week_label": "Week 7-8",
            "title": "Phase 4: Optimization, Documentation & Viva Presentation",
            "desc": "End-to-end integration tests, load optimization, comprehensive report and presentation deck.",
            "deliverables": ["Project Report (IEEE format)", "Live Demo Deployment", "Viva Presentation Slides"],
            "is_completed": False
        }
    ]

    # Normalize MongoDB schema: store milestones in project_milestones collection, NOT nested in project_ideas
    db_idea_doc = dict(idea_doc)
    db_idea_doc.pop("milestones", None)
    db_idea_doc["milestones_done"] = 0
    db_idea_doc["total_milestones"] = len(milestones)
    db_idea_doc["progress"] = 0

    # 1. Save to MongoDB
    try:
        project_ideas_col.insert_one(db_idea_doc)
        project_milestones_col.insert_many([dict(m) for m in milestones])
        project_analyses_col.insert_one({
            "project_id": p_id,
            "student_id": student_id,
            "executive_summary": f"Automated AI Mentoring Analysis completed for '{data.title}'. Recommended stack: {', '.join(tech_stack[:3])}.",
            "feasibility_data": {"overallScore": feasibility_score, "verdict": "Feasible"},
            "scope_data": {"problemStatement": data.desc, "keyDeliverables": ["Source Code", "System Architecture", "Final Report"]},
            "technology_data": {"recommendedStack": tech_stack},
            "timeline_data": {"milestones": milestones},
            "risk_data": {"overallRisk": "Low", "riskScore": 25},
            "created_at": datetime.datetime.utcnow()
        })
    except Exception as e:
        print(f"[SUBMISSION] Notice: MongoDB write skipped: {e}")

    # 2. Save to local ideas.json
    local_ideas = _load_local_ideas()
    local_ideas[str(p_id)] = _serialize_doc(idea_doc)
    _save_local_ideas(local_ideas)

    fire_trigger(str(p_id))

    return {
        "idea_id": p_id,
        "status": "pending_review",
        "feasibility_score": feasibility_score,
        "tech_stack": tech_stack,
        "milestones": milestones,
        "idea": _serialize_doc(idea_doc)
    }



@router.get("/api/ideas")
def get_ideas(
    email: Optional[str] = Query(None, description="Filter ideas by student email"),
    student_id: Optional[str] = Query(None, description="Filter ideas by student id")
):
    """
    Retrieve submitted project ideas.
    If email is provided, returns ONLY ideas belonging to that account.
    If no query params, returns all submitted ideas (for faculty cohort view).
    """
    results_map: Dict[str, dict] = {}

    govardhan_aliases = ["192411137.simats@saveetha.com", "ngovardhanreddy9381@gmail.com", "192411137"]

    # 1. Query MongoDB if connected
    try:
        ideas_col = get_project_ideas_collection()
        query = {}
        if email:
            clean_email = email.strip().lower()
            if clean_email in govardhan_aliases:
                query["$or"] = [
                    {"student_email": {"$in": govardhan_aliases}},
                    {"student_id": {"$in": govardhan_aliases}}
                ]
            else:
                query["student_email"] = {"$regex": f"^{clean_email}$", "$options": "i"}
        elif student_id:
            clean_sid = str(student_id).strip().lower()
            if clean_sid in govardhan_aliases:
                query["$or"] = [
                    {"student_email": {"$in": govardhan_aliases}},
                    {"student_id": {"$in": govardhan_aliases}}
                ]
            else:
                query["student_id"] = str(student_id)

        for doc in ideas_col.find(query).sort("created_at", -1):
            serialized = _serialize_doc(doc)
            key = serialized.get("idea_id") or serialized.get("_id")
            results_map[str(key)] = serialized
    except Exception as exc:
        print(f"[SUBMISSION] Notice: MongoDB read skipped: {exc}")

    # 2. Merge local ideas.json
    local_ideas = _load_local_ideas()
    clean_email = email.strip().lower() if email else None
    clean_sid = str(student_id).strip().lower() if student_id else None

    for i_id, doc in local_ideas.items():
        doc_email = str(doc.get("student_email") or "").strip().lower()
        doc_sid = str(doc.get("student_id") or "").strip().lower()

        if clean_email:
            if clean_email in govardhan_aliases:
                if doc_email not in govardhan_aliases and doc_sid not in govardhan_aliases:
                    continue
            elif doc_email != clean_email:
                continue
        if clean_sid and not clean_email:
            if clean_sid in govardhan_aliases:
                if doc_email not in govardhan_aliases and doc_sid not in govardhan_aliases:
                    continue
            elif doc_sid != clean_sid:
                continue

        serialized = _serialize_doc(doc)
        if i_id not in results_map:
            results_map[i_id] = serialized
        else:
            # Merge local updates (e.g. reports)
            results_map[i_id].update(serialized)

    # 3. Populate reports from normalized MongoDB collections
    try:
        from database import (
            get_feasibility_reports_collection,
            get_scope_reports_collection,
            get_tech_stack_reports_collection,
            get_risk_reports_collection,
            get_tracking_reports_collection,
            get_project_milestones_collection,
        )
        from models import (
            format_feasibility_report,
            format_scope_report,
            format_tech_stack_report,
            format_risk_report,
            format_tracking_report,
        )

        feas_col = get_feasibility_reports_collection()
        scope_col = get_scope_reports_collection()
        tech_col = get_tech_stack_reports_collection()
        risk_col = get_risk_reports_collection()
        track_col = get_tracking_reports_collection()
        ms_col = get_project_milestones_collection()

        for key, serialized in results_map.items():
            keys = [str(key)]
            if "_id" in serialized and serialized["_id"]:
                keys.append(str(serialized["_id"]))
            if "idea_id" in serialized and serialized["idea_id"]:
                keys.append(str(serialized["idea_id"]))
            if "id" in serialized and serialized["id"]:
                keys.append(str(serialized["id"]))
            keys = list(set(keys))

            # Feasibility
            if not serialized.get("feasibilityReport"):
                f_doc = feas_col.find_one({"idea_id": {"$in": keys}})
                if f_doc:
                    serialized["feasibilityReport"] = format_feasibility_report(f_doc)
                    if "overallScore" in serialized["feasibilityReport"]:
                        serialized["feasibility"] = serialized["feasibilityReport"]["overallScore"]
                        serialized["feasibility_score"] = serialized["feasibilityReport"]["overallScore"]

            # Scope
            if not serialized.get("scopeReport"):
                s_doc = scope_col.find_one({"idea_id": {"$in": keys}})
                if s_doc:
                    serialized["scopeReport"] = format_scope_report(s_doc)

            # Tech Stack
            if not serialized.get("techStackReport"):
                t_doc = tech_col.find_one({"idea_id": {"$in": keys}})
                if t_doc:
                    serialized["techStackReport"] = format_tech_stack_report(t_doc)

            # Risk
            if not serialized.get("riskReport"):
                r_doc = risk_col.find_one({"idea_id": {"$in": keys}})
                if r_doc:
                    serialized["riskReport"] = format_risk_report(r_doc)

            # Tracking
            if not serialized.get("trackingReport"):
                tr_doc = track_col.find_one({"idea_id": {"$in": keys}})
                if tr_doc:
                    serialized["trackingReport"] = format_tracking_report(tr_doc)

            # Milestones from dedicated project_milestones collection
            if not serialized.get("milestones"):
                int_keys = [int(k) for k in keys if str(k).isdigit()]
                all_pids = keys + int_keys
                ms_cursor = list(ms_col.find({"project_id": {"$in": all_pids}}).sort("phase_index", 1))
                if ms_cursor:
                    serialized["milestones"] = [
                        {
                            "id": m.get("id"),
                            "phase_index": m.get("phase_index", 1),
                            "week_label": m.get("week_label", ""),
                            "weekLabel": m.get("week_label", ""),
                            "title": m.get("title", ""),
                            "desc": m.get("desc", ""),
                            "description": m.get("desc", ""),
                            "deliverables": m.get("deliverables", []),
                            "is_completed": bool(m.get("is_completed", False)),
                            "completed": bool(m.get("is_completed", False)),
                        }
                        for m in ms_cursor
                    ]
    except Exception as enrich_err:
        print(f"[SUBMISSION] Notice: normalized collections enrichment notice: {enrich_err}")

    ideas_list = list(results_map.values())
    # Sort descending by created_at or submittedAt
    ideas_list.sort(key=lambda x: str(x.get("created_at") or x.get("submittedAt") or ""), reverse=True)
    return ideas_list


@router.put("/api/ideas/{idea_id}")
def update_idea(idea_id: str, updates: Dict[str, Any]):
    """
    Update an existing project idea with analysis results or modifications.
    """
    updated = False
    # 1. Update in local ideas.json
    local_ideas = _load_local_ideas()
    if idea_id in local_ideas:
        local_ideas[idea_id].update(updates)
        local_ideas[idea_id]["updated_at"] = datetime.datetime.utcnow().isoformat()
        _save_local_ideas(local_ideas)
        updated = True

    # 2. Update in MongoDB
    try:
        ideas_col = get_project_ideas_collection()
        query = {"_id": ObjectId(idea_id)} if ObjectId.is_valid(idea_id) else {"idea_id": idea_id}
        mongo_updates = {k: v for k, v in updates.items() if k != "_id"}
        mongo_updates["updated_at"] = now_utc()
        res = ideas_col.update_one(query, {"$set": mongo_updates})
        if res.matched_count > 0:
            updated = True
    except Exception as e:
        print(f"[SUBMISSION] Notice: MongoDB update skipped: {e}")

    if not updated and idea_id not in local_ideas:
        # Create it in local ideas if it was requested
        local_ideas[idea_id] = updates
        local_ideas[idea_id]["idea_id"] = idea_id
        local_ideas[idea_id]["updated_at"] = datetime.datetime.utcnow().isoformat()
        _save_local_ideas(local_ideas)
        updated = True

    return {"status": "updated", "idea_id": idea_id}


@router.delete("/api/ideas/{idea_id}")
def delete_idea(idea_id: str):
    """
    Delete a project idea from storage and all normalized collections.
    """
    local_ideas = _load_local_ideas()
    for k in list(local_ideas.keys()):
        if str(k) == str(idea_id) or str(local_ideas[k].get("id")) == str(idea_id) or str(local_ideas[k].get("idea_id")) == str(idea_id):
            del local_ideas[k]
    _save_local_ideas(local_ideas)

    try:
        from database import (
            get_project_ideas_collection,
            get_feasibility_reports_collection,
            get_scope_reports_collection,
            get_tech_stack_reports_collection,
            get_risk_reports_collection,
            get_tracking_reports_collection,
            get_project_milestones_collection
        )
        ideas_col = get_project_ideas_collection()
        del_queries = [{"idea_id": str(idea_id)}, {"id": str(idea_id)}]
        if str(idea_id).isdigit():
            del_queries.append({"id": int(idea_id)})
            del_queries.append({"idea_id": int(idea_id)})
        if ObjectId.is_valid(idea_id):
            del_queries.append({"_id": ObjectId(idea_id)})

        q = {"$or": del_queries}
        ideas_col.delete_many(q)

        # Clean associated normalized reports & milestones
        p_ids = [str(idea_id)]
        if str(idea_id).isdigit():
            p_ids.append(int(idea_id))

        get_feasibility_reports_collection().delete_many({"idea_id": {"$in": p_ids}})
        get_scope_reports_collection().delete_many({"idea_id": {"$in": p_ids}})
        get_tech_stack_reports_collection().delete_many({"idea_id": {"$in": p_ids}})
        get_risk_reports_collection().delete_many({"idea_id": {"$in": p_ids}})
        get_tracking_reports_collection().delete_many({"idea_id": {"$in": p_ids}})
        get_project_milestones_collection().delete_many({"project_id": {"$in": p_ids}})
    except Exception as e:
        print(f"[SUBMISSION] Delete notice: {e}")

    return {"status": "deleted", "idea_id": idea_id}


def fire_trigger(idea_id: str):
    """
    Milestone 1: keep the trigger simple — just log that the pipeline
    would be invoked here.
    """
    print(f"[TRIGGER] Project idea {idea_id} queued for agent pipeline")