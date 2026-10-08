import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import check_db_connection, DB_NAME, students_col
from routers import (
    onboarding, submission, feasibility, scope, chat, auth, tech_stack,
    risk, tracking, projects, faculty, progress, documents, timeline, mentor
)

app = FastAPI(title="Agentic Mentoring System - Backend (Milestone 1 - MongoDB)")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(onboarding.router, tags=["onboarding"])
app.include_router(submission.router, tags=["submission"])
app.include_router(feasibility.router, tags=["agents"])
app.include_router(scope.router, tags=["agents"])
app.include_router(tech_stack.router, tags=["agents"])
app.include_router(risk.router, tags=["agents"])
app.include_router(tracking.router, tags=["agents"])
app.include_router(projects.router, tags=["projects"])
app.include_router(faculty.router, tags=["faculty"])
app.include_router(progress.router, tags=["progress"])
app.include_router(documents.router, tags=["documents"])
app.include_router(timeline.router, tags=["timeline"])
app.include_router(mentor.router, tags=["mentor"])
app.include_router(chat.router, tags=["chat"])


@app.on_event("startup")
def startup_db_check():
    status = check_db_connection()
    if status.get("connected"):
        print(f"[STARTUP SUCCESS] Connected to MongoDB Atlas ({status.get('database')})")
    else:
        print(f"[STARTUP WARNING] MongoDB Atlas connection status: {status.get('message')} - {status.get('error', '')}")


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "backend running",
        "database": "MongoDB",
        "db_name": DB_NAME
    }


@app.get("/student/{student_id}")
def get_student_by_id(student_id: str):
    """Retrieve a student by integer id or string id/email."""
    query = {}
    if student_id.isdigit():
        query = {"$or": [{"id": int(student_id)}, {"id": student_id}]}
    else:
        query = {"$or": [{"email": student_id.lower()}, {"id": student_id}]}

    st = students_col.find_one(query)
    if not st:
        # Check by 1-based index if seeded
        try:
            sid_num = int(student_id)
            all_st = list(students_col.find().sort("id", 1))
            if 0 < sid_num <= len(all_st):
                st = all_st[sid_num - 1]
        except Exception:
            pass

    if not st:
        raise HTTPException(status_code=404, detail="Student not found")

    first_name = st.get("first_name") or st.get("firstName") or ""
    last_name = st.get("last_name") or st.get("lastName") or ""
    full_name = f"{first_name} {last_name}".strip() or st.get("name", "Student")

    return {
        "id": st.get("id", 1),
        "name": full_name,
        "email": st.get("email", ""),
        "rollNo": st.get("roll_no") or st.get("rollNo", ""),
        "branch": st.get("branch", "CSE"),
        "year": st.get("year", "3rd Year")
    }


@app.get("/db-health")
def db_health_check():
    """Live check for MongoDB Atlas connectivity"""
    return check_db_connection()


# ─── Static Frontend Serving (Docker / Single-Deploy Full-Stack) ─────────────
FRONTEND_DIST = os.environ.get("FRONTEND_DIST")
if not FRONTEND_DIST:
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "frontend_dist"),
        "/app/frontend_dist",
        os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"),
    ]
    for p in possible_paths:
        if os.path.isdir(p) and os.path.isfile(os.path.join(p, "index.html")):
            FRONTEND_DIST = os.path.abspath(p)
            break

if FRONTEND_DIST and os.path.isfile(os.path.join(FRONTEND_DIST, "index.html")):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        # Do not hijack unresolved API calls
        if any(full_path.startswith(prefix) for prefix in [
            "api/", "auth/", "student/", "faculty/", "mentor/", "progress/", "documents/", "timeline/", "onboarding", "submit-idea"
        ]):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def root_health_fallback():
        return {
            "status": "backend running",
            "database": "MongoDB",
            "db_name": DB_NAME
        }

