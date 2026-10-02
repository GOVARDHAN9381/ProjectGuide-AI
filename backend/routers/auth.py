"""
Authentication router — Register, Login, and Profile verification.
Persists users to MongoDB Atlas (users collection) with seamless local JSON fallback
if MongoDB Atlas TLS connection is restricted by IP whitelist.
"""
import os
import json
import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Local persistent backup file path
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
USERS_FILE = DATA_DIR / "users.json"
STUDENTS_FILE = DATA_DIR / "students.json"

# Seed default demo accounts
DEFAULT_USERS = {
    "arjun.sharma@college.edu.in": {
        "email": "arjun.sharma@college.edu.in",
        "password": "password123",
        "name": "Arjun Sharma",
        "role": "student",
        "rollNo": "21CS101",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"python": 3, "opencv": 2, "react": 2, "flask": 2},
        "domains": ["aiml", "web"],
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    },
    "prof.verma@college.edu.in": {
        "email": "prof.verma@college.edu.in",
        "password": "faculty123",
        "name": "Prof. Rajesh Verma",
        "role": "faculty",
        "rollNo": "FAC001",
        "branch": "CSE",
        "year": "Faculty",
        "skills": {},
        "domains": [],
        "hasCompletedProfile": True,
        "createdAt": "2026-08-01T00:00:00Z"
    }
}


def _load_local_users() -> Dict[str, Any]:
    if not USERS_FILE.exists():
        USERS_FILE.write_text(json.dumps(DEFAULT_USERS, indent=2), encoding="utf-8")
        return DEFAULT_USERS.copy()
    try:
        data = json.loads(USERS_FILE.read_text(encoding="utf-8"))
        # Ensure default demo users are always present
        for k, v in DEFAULT_USERS.items():
            if k not in data:
                data[k] = v
        return data
    except Exception:
        return DEFAULT_USERS.copy()


def _save_local_users(users: Dict[str, Any]):
    try:
        USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"Warning: could not save local users: {e}")


def _get_mongo_users_col():
    try:
        from database import get_database
        db = get_database()
        return db["users"]
    except Exception:
        return None


def _get_mongo_students_col():
    try:
        from database import get_students_collection
        return get_students_collection()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[str] = "student"
    rollNo: Optional[str] = ""
    branch: Optional[str] = "Computer Science & Engineering"
    year: Optional[str] = "3rd Year"


class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "student"


class UpdateProfileRequest(BaseModel):
    email: str
    skills: Optional[Dict[str, int]] = {}
    domains: Optional[List[str]] = []
    aboutMe: Optional[str] = ""
    teamSize: Optional[str] = "3"
    branch: Optional[str] = ""
    year: Optional[str] = ""
    rollNo: Optional[str] = ""
    name: Optional[str] = ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register")
def register(req: RegisterRequest):
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    # 1. Check MongoDB first if available
    col = _get_mongo_users_col()
    if col is not None:
        try:
            existing = col.find_one({"email": email})
            if existing:
                raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")
        except HTTPException:
            raise
        except Exception:
            pass

    # 2. Check local users
    local_users = _load_local_users()
    if email in local_users:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")

    # Create user record
    new_user = {
        "email": email,
        "password": req.password,
        "name": req.name.strip() or email.split("@")[0].capitalize(),
        "role": req.role or "student",
        "rollNo": req.rollNo.strip() or ("FAC001" if req.role == "faculty" else "21CS101"),
        "branch": req.branch or "Computer Science & Engineering",
        "year": req.year or "3rd Year",
        "skills": {},
        "domains": [],
        "hasCompletedProfile": req.role == "faculty", # Faculty doesn't need student skills profile
        "createdAt": datetime.datetime.utcnow().isoformat()
    }

    # Save to MongoDB
    if col is not None:
        try:
            col.insert_one(new_user.copy())
        except Exception as e:
            print(f"MongoDB register write failed (using local backup): {e}")

    # Save locally
    local_users[email] = new_user
    _save_local_users(local_users)

    # Return safe user data without exposing raw password in response
    resp_user = {k: v for k, v in new_user.items() if k != "password" and k != "_id"}
    return {
        "status": "registered",
        "user": resp_user,
        "hasCompletedProfile": new_user["hasCompletedProfile"]
    }


@router.post("/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    password = req.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    user_doc = None

    # 1. Check MongoDB
    col = _get_mongo_users_col()
    if col is not None:
        try:
            user_doc = col.find_one({"email": email})
        except Exception as e:
            print(f"MongoDB login query failed (checking local): {e}")

    # 2. Check local if not found in MongoDB
    if not user_doc:
        local_users = _load_local_users()
        user_doc = local_users.get(email)

    # If user does not exist at all -> DO NOT LOG IN!
    if not user_doc:
        raise HTTPException(
            status_code=404,
            detail="Account not found. Please click 'Create Account' to register first."
        )

    # Check password
    if user_doc.get("password") != password:
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")

    # Check if student has completed profile (either in user_doc, students.json, or students collection)
    has_skills = bool(user_doc.get("skills") and len(user_doc["skills"]) > 0)
    has_completed = bool(user_doc.get("hasCompletedProfile")) or has_skills or (user_doc.get("role") == "faculty")

    # If student doc exists in students.json or MongoDB students collection with skills, sync it
    if not has_skills and user_doc.get("role") == "student":
        # 1. Check local students.json (instant)
        try:
            if STUDENTS_FILE.exists():
                st_data = json.loads(STUDENTS_FILE.read_text(encoding="utf-8"))
                if email in st_data and st_data[email].get("skills"):
                    user_doc["skills"] = st_data[email]["skills"]
                    user_doc["domains"] = st_data[email].get("domains", [])
                    user_doc["branch"] = st_data[email].get("branch", user_doc.get("branch", ""))
                    user_doc["year"] = st_data[email].get("year", user_doc.get("year", ""))
                    user_doc["rollNo"] = st_data[email].get("rollNo", user_doc.get("rollNo", ""))
                    has_skills = True
                    has_completed = True
        except Exception:
            pass

        # 2. Check MongoDB students collection
        if not has_skills:
            st_col = _get_mongo_students_col()
            if st_col is not None:
                try:
                    st_doc = st_col.find_one({"email": email})
                    if st_doc and st_doc.get("skills"):
                        user_doc["skills"] = st_doc.get("skills", {})
                        user_doc["domains"] = st_doc.get("domains", [])
                        user_doc["branch"] = st_doc.get("branch", user_doc.get("branch", ""))
                        user_doc["year"] = st_doc.get("year", user_doc.get("year", ""))
                        user_doc["rollNo"] = st_doc.get("rollNo", user_doc.get("rollNo", ""))
                        has_skills = True
                        has_completed = True
                except Exception:
                    pass

    user_doc["hasCompletedProfile"] = has_completed

    # Persist updated user cache locally
    try:
        local_users = _load_local_users()
        local_users[email] = user_doc
        _save_local_users(local_users)
    except Exception:
        pass

    resp_user = {k: v for k, v in user_doc.items() if k not in ("password", "_id")}
    return {
        "status": "authenticated",
        "user": resp_user,
        "hasCompletedProfile": has_completed
    }


@router.get("/user")
def get_user(email: str = Query(...)):
    email = email.strip().lower()
    col = _get_mongo_users_col()
    user_doc = None
    if col is not None:
        try:
            user_doc = col.find_one({"email": email})
        except Exception:
            pass

    if not user_doc:
        local_users = _load_local_users()
        user_doc = local_users.get(email)

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    resp_user = {k: v for k, v in user_doc.items() if k not in ("password", "_id")}
    return resp_user


@router.post("/update-profile")
def update_profile(req: UpdateProfileRequest):
    email = req.email.strip().lower()
    local_users = _load_local_users()
    user_doc = local_users.get(email, {})

    update_fields = {}
    if req.skills:
        update_fields["skills"] = req.skills
    if req.domains:
        update_fields["domains"] = req.domains
    if req.aboutMe:
        update_fields["aboutMe"] = req.aboutMe
    if req.teamSize:
        update_fields["teamSize"] = req.teamSize
    if req.branch:
        update_fields["branch"] = req.branch
    if req.year:
        update_fields["year"] = req.year
    if req.rollNo:
        update_fields["rollNo"] = req.rollNo
    if req.name:
        update_fields["name"] = req.name

    has_skills = bool(req.skills and len(req.skills) > 0)
    update_fields["hasCompletedProfile"] = has_skills or (user_doc.get("role") == "faculty")

    # Update MongoDB users collection
    col = _get_mongo_users_col()
    if col is not None:
        try:
            col.update_one({"email": email}, {"$set": update_fields}, upsert=True)
        except Exception as e:
            print(f"MongoDB update profile failed: {e}")

    # Update local users.json
    user_doc.update(update_fields)
    local_users[email] = user_doc
    _save_local_users(local_users)

    # Also update students.json for fast multi-source synchronization
    try:
        st_data = {}
        if STUDENTS_FILE.exists():
            st_data = json.loads(STUDENTS_FILE.read_text(encoding="utf-8"))
        st_entry = st_data.get(email, {})
        st_entry.update({
            "email": email,
            "name": req.name or user_doc.get("name", ""),
            "skills": req.skills or user_doc.get("skills", {}),
            "domains": req.domains or user_doc.get("domains", []),
            "branch": req.branch or user_doc.get("branch", ""),
            "year": req.year or user_doc.get("year", ""),
            "rollNo": req.rollNo or user_doc.get("rollNo", ""),
            "aboutMe": req.aboutMe or user_doc.get("aboutMe", ""),
            "teamSize": req.teamSize or user_doc.get("teamSize", "3"),
            "updated_at": datetime.datetime.utcnow().isoformat()
        })
        st_data[email] = st_entry
        STUDENTS_FILE.write_text(json.dumps(st_data, indent=2), encoding="utf-8")
    except Exception as exc:
        print(f"Warning: could not sync to students.json: {exc}")

    return {"status": "updated", "hasCompletedProfile": update_fields["hasCompletedProfile"]}
