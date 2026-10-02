import json
import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException
import schemas
from models import make_student_doc, now_utc

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
STUDENTS_FILE = DATA_DIR / "students.json"
USERS_FILE = DATA_DIR / "users.json"


def _load_local_students() -> dict:
    if not STUDENTS_FILE.exists():
        return {}
    try:
        return json.loads(STUDENTS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_local_students(data: dict):
    try:
        STUDENTS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"Warning: could not save local students: {e}")


@router.post("/onboarding", response_model=schemas.OnboardingResponse)
def create_profile(data: schemas.OnboardingRequest):
    email = data.email.strip().lower()
    student_doc = make_student_doc(data)
    student_id = f"st_{int(datetime.datetime.utcnow().timestamp())}"
    mongo_saved = False

    # 1. Try saving to MongoDB
    try:
        from database import get_students_collection
        students = get_students_collection()
        existing = students.find_one({"email": email})
        if existing:
            students.update_one({"_id": existing["_id"]}, {"$set": student_doc})
            student_id = str(existing["_id"])
        else:
            student_doc["created_at"] = now_utc()
            result = students.insert_one(student_doc)
            student_id = str(result.inserted_id)
        mongo_saved = True
    except Exception as e:
        print(f"[ONBOARDING] Notice: MongoDB write skipped (using local storage): {e}")

    # 2. Save locally in students.json
    local_students = _load_local_students()
    local_students[email] = {
        **student_doc,
        "student_id": student_id,
        "updated_at": datetime.datetime.utcnow().isoformat()
    }
    _save_local_students(local_students)

    # 3. Sync skills, domains, and profile completion to user record in users.json
    try:
        has_skills = bool(data.skills and len(data.skills) > 0)
        if USERS_FILE.exists():
            users_data = json.loads(USERS_FILE.read_text(encoding="utf-8"))
            if email in users_data:
                users_data[email]["skills"] = data.skills or {}
                users_data[email]["domains"] = data.domains or []
                users_data[email]["branch"] = data.branch or users_data[email].get("branch", "")
                users_data[email]["year"] = data.year or users_data[email].get("year", "")
                users_data[email]["rollNo"] = data.rollNo or users_data[email].get("rollNo", "")
                users_data[email]["hasCompletedProfile"] = has_skills or (users_data[email].get("role") == "faculty")
                USERS_FILE.write_text(json.dumps(users_data, indent=2), encoding="utf-8")

        # Also update MongoDB users collection if connected
        if mongo_saved:
            try:
                from database import get_database
                db = get_database()
                db["users"].update_one(
                    {"email": email},
                    {
                        "$set": {
                            "skills": data.skills or {},
                            "domains": data.domains or [],
                            "branch": data.branch,
                            "year": data.year,
                            "rollNo": data.rollNo,
                            "hasCompletedProfile": has_skills,
                        }
                    },
                    upsert=True
                )
            except Exception:
                pass
    except Exception as exc:
        print(f"[ONBOARDING] Warning: error syncing to user record: {exc}")

    return {"student_id": student_id, "status": "onboarded"}


@router.get("/onboarding/student/{email}")
def get_student_profile(email: str):
    email = email.strip().lower()
    # 1. Check local students.json first (fastest)
    local = _load_local_students().get(email)
    if local:
        return local

    # 2. Check MongoDB
    try:
        from database import get_students_collection
        st = get_students_collection().find_one({"email": email})
        if st:
            st["_id"] = str(st["_id"])
            return st
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Student profile not found")