from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import check_db_connection, DB_NAME, students_col
from routers import onboarding, submission, feasibility, scope, chat, auth, tech_stack, risk, tracking, projects, faculty

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
app.include_router(chat.router, tags=["chat"])


@app.get("/")
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

