import json
import uuid
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId

import schemas
from database import get_project_ideas_collection
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
    idea_doc = make_project_idea_doc(data)
    idea_id = f"idea_{int(datetime.datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}"
    mongo_saved = False

    # 1. Try saving to MongoDB
    try:
        ideas_col = get_project_ideas_collection()
        res = ideas_col.insert_one(dict(idea_doc))
        idea_id = str(res.inserted_id)
        mongo_saved = True
    except Exception as e:
        print(f"[SUBMISSION] Notice: MongoDB write skipped (using local storage): {e}")

    # 2. Add id references and save to local ideas.json
    idea_doc["idea_id"] = idea_id
    idea_doc["id"] = idea_id
    idea_doc["student_email"] = email

    local_ideas = _load_local_ideas()
    local_ideas[idea_id] = _serialize_doc(idea_doc)
    _save_local_ideas(local_ideas)

    fire_trigger(idea_id)

    return {
        "idea_id": idea_id,
        "status": "pending_review",
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

    # 1. Query MongoDB if connected
    try:
        ideas_col = get_project_ideas_collection()
        query = {}
        if email:
            clean_email = email.strip().lower()
            query["student_email"] = {"$regex": f"^{clean_email}$", "$options": "i"}
        elif student_id:
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
    clean_sid = str(student_id) if student_id else None

    for i_id, doc in local_ideas.items():
        doc_email = str(doc.get("student_email") or "").strip().lower()
        doc_sid = str(doc.get("student_id") or "")

        if clean_email and doc_email != clean_email:
            continue
        if clean_sid and not clean_email and doc_sid != clean_sid:
            continue

        serialized = _serialize_doc(doc)
        if i_id not in results_map:
            results_map[i_id] = serialized
        else:
            # Merge local updates (e.g. reports)
            results_map[i_id].update(serialized)

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
    Delete a project idea from storage.
    """
    local_ideas = _load_local_ideas()
    if idea_id in local_ideas:
        del local_ideas[idea_id]
        _save_local_ideas(local_ideas)

    try:
        ideas_col = get_project_ideas_collection()
        query = {"_id": ObjectId(idea_id)} if ObjectId.is_valid(idea_id) else {"idea_id": idea_id}
        ideas_col.delete_one(query)
    except Exception:
        pass

    return {"status": "deleted", "idea_id": idea_id}


def fire_trigger(idea_id: str):
    """
    Milestone 1: keep the trigger simple — just log that the pipeline
    would be invoked here.
    """
    print(f"[TRIGGER] Project idea {idea_id} queued for agent pipeline")