"""
Database Seeder for MongoDB in ProjectGuide-AI
Populates student accounts WITHOUT any default project idea submissions,
ensuring all student dashboards start blank until an idea is actively submitted.
"""
from datetime import datetime, timedelta

from database import (
    students_col,
    skill_profiles_col,
    project_ideas_col,
    project_analyses_col,
    project_milestones_col,
    faculty_reviews_col,
    announcements_col,
    get_next_id
)

COHORT_STUDENTS = [
    {
        "firstName": "Arjun",
        "lastName": "Sharma",
        "email": "arjun.sharma@college.edu.in",
        "rollNo": "21CS101",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"python": 4, "ml": 4, "webdev": 3, "cv": 4, "dbms": 3},
        "domains": ["aiml", "web"],
        "teamSize": "3"
    },
    {
        "firstName": "Priya",
        "lastName": "Mehta",
        "email": "priya.mehta@college.edu.in",
        "rollNo": "21CS102",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"webdev": 5, "javascript": 5, "react": 4, "nodejs": 4, "mongodb": 4},
        "domains": ["web", "aiml"],
        "teamSize": "2"
    },
    {
        "firstName": "Rahul",
        "lastName": "Patel",
        "email": "rahul.patel@college.edu.in",
        "rollNo": "21IT103",
        "branch": "Information Technology",
        "year": "3rd Year",
        "skills": {"iot": 5, "c_cpp": 4, "python": 3, "webdev": 3},
        "domains": ["iot", "cloud"],
        "teamSize": "4"
    },
    {
        "firstName": "Sneha",
        "lastName": "Reddy",
        "email": "sneha.reddy@college.edu.in",
        "rollNo": "21DS104",
        "branch": "Data Science & AI",
        "year": "3rd Year",
        "skills": {"python": 5, "ds": 5, "ml": 4, "dl": 3},
        "domains": ["ds", "aiml"],
        "teamSize": "2"
    },
    {
        "firstName": "Anjali",
        "lastName": "Singh",
        "email": "anjali.singh@college.edu.in",
        "rollNo": "21CS106",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"python": 4, "nlp": 5, "webdev": 3, "react": 3},
        "domains": ["nlp", "aiml"],
        "teamSize": "3"
    }
]


def seed_database(force_clean=False):
    if force_clean:
        students_col.delete_many({})
        skill_profiles_col.delete_many({})
        project_ideas_col.delete_many({})
        project_analyses_col.delete_many({})
        project_milestones_col.delete_many({})
        faculty_reviews_col.delete_many({})
        announcements_col.delete_many({})

    # Check if student accounts already exist
    if students_col.count_documents({}) > 0:
        # Also clean up any lingering old default project submissions if present
        if project_ideas_col.count_documents({}) > 0 and force_clean:
            project_ideas_col.delete_many({})
            project_analyses_col.delete_many({})
            project_milestones_col.delete_many({})
        return

    print("[SEED] Initializing clean student cohort accounts (No default project submissions)...")

    for item in COHORT_STUDENTS:
        student_id = get_next_id("students")
        student_doc = {
            "id": student_id,
            "first_name": item["firstName"],
            "last_name": item["lastName"],
            "email": item["email"],
            "roll_no": item["rollNo"],
            "branch": item["branch"],
            "year": item["year"],
            "role": "student",
            "created_at": datetime.utcnow() - timedelta(days=5)
        }
        students_col.insert_one(student_doc)

        skill_profiles_col.insert_one({
            "student_id": student_id,
            "skills": item["skills"],
            "domains": item["domains"],
            "other_skills": "",
            "other_domains": "",
            "about_me": "Dedicated computer engineering student aiming to build high-impact capstone projects.",
            "team_size": item["teamSize"],
            "updated_at": datetime.utcnow()
        })

    # Faculty announcements
    announcements = [
        {
            "id": get_next_id("announcements"),
            "author_name": "Prof. Verma (HOD CSE)",
            "title": "Welcome to ProjectGuide-AI",
            "message": "Welcome students! Please submit your capstone project idea using the Submit Idea button to generate your AI roadmap.",
            "created_at": datetime.utcnow() - timedelta(hours=1)
        }
    ]
    announcements_col.insert_many(announcements)
    print("[SEED] Successfully seeded clean student accounts with zero default project submissions!")


if __name__ == "__main__":
    seed_database(force_clean=True)
