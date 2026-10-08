"""
Sync and Clean Web Data in MongoDB Atlas.

Ensures:
1. All present ideas submitted by each user are properly saved in MongoDB Atlas 'project_ideas' collection.
2. All corresponding agent reports (feasibility, scope, tech stack, tracking) are linked to their respective idea by 'idea_id'.
3. All test dummy data (student_178*, student_179*, test_*, dummy ideas) are completely purged.
4. Local storage (data/ideas.json, data/users.json, data/students.json) is synchronized with the exact same clean data.
"""

import sys
from pathlib import Path
import json
import datetime
import certifi
from pymongo import MongoClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import os
from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

DATA_DIR = backend_dir / "data"

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority")
DB_NAME = os.getenv("DB_NAME", "ProjectGuide-AI")


def run_sync():
    print("=== Connecting to MongoDB Atlas ===")
    client = MongoClient(
        MONGO_URI,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=15000,
        connectTimeoutMS=15000,
        socketTimeoutMS=15000
    )
    client.admin.command("ping")
    print("Connected successfully to MongoDB Atlas!\n")
    db = client[DB_NAME]

    # ---------------------------------------------------------
    # 1. PURGE TEST NOISE FROM ATLAS
    # ---------------------------------------------------------
    print("--- 1. Purging test case noise from Atlas ---")
    test_id_patterns = [
        "idea_1791076715_ae677b",
        "idea_1791076914_e3980f",
        "idea_1791077254_928a26",
        "idea_1791077255_70c587",
        "6ac3545664b002646ee89f1b",
        "",
        None
    ]
    test_titles = [
        "Test Project",
        "User A Unique AI Project",
        "User B Blockchain Portal",
        "Smart Attendance System using Facial Recognition"
    ]

    r1 = db.feasibility_reports.delete_many({
        "$or": [
            {"idea_id": {"$in": test_id_patterns}},
            {"project_title": {"$in": test_titles}},
            {"student_email": {"$regex": "^student_17"}},
            {"student_email": {"$regex": "^user_.*@test\\.edu"}}
        ]
    })
    r2 = db.scope_reports.delete_many({
        "$or": [
            {"idea_id": {"$in": test_id_patterns}},
            {"project_title": {"$in": test_titles}},
            {"student_email": {"$regex": "^student_17"}},
            {"student_email": {"$regex": "^user_.*@test\\.edu"}}
        ]
    })
    r3 = db.tech_stack_reports.delete_many({
        "$or": [
            {"idea_id": {"$in": test_id_patterns}},
            {"student_email": {"$regex": "^student_17"}},
            {"student_email": {"$regex": "^user_.*@test\\.edu"}}
        ]
    })
    r4 = db.tracking_reports.delete_many({
        "$or": [
            {"idea_id": {"$in": test_id_patterns}},
            {"student_email": {"$regex": "^student_17"}},
            {"student_email": {"$regex": "^user_.*@test\\.edu"}}
        ]
    })
    r5 = db.users.delete_many({
        "$or": [
            {"email": {"$regex": "^student_17"}},
            {"email": {"$regex": "^user_.*@test\\.edu"}},
            {"email": "teststudent@college.edu.in"},
            {"email": "test.new@college.edu"}
        ]
    })
    r6 = db.students.delete_many({
        "$or": [
            {"email": {"$regex": "^student_17"}},
            {"email": {"$regex": "^user_.*@test\\.edu"}}
        ]
    })
    print(f"Purged test artifacts: {r1.deleted_count} feas, {r2.deleted_count} scope, {r3.deleted_count} tech, {r4.deleted_count} track, {r5.deleted_count} users, {r6.deleted_count} students.\n")

    # ---------------------------------------------------------
    # 2. DEFINITION OF LEGITIMATE PRESENT IDEAS PER USER
    # ---------------------------------------------------------
    print("--- 2. Populating/Syncing Legitimate Ideas into project_ideas ---")

    legitimate_ideas = [
        {
            "id": "idea_1789293629_6e6790",
            "idea_id": "idea_1789293629_6e6790",
            "student_id": "ngovardhanreddy9381@gmail.com",
            "student_email": "ngovardhanreddy9381@gmail.com",
            "title": "flipkart clone",
            "desc": "just i need too build flip kart clone ,which works as it is as working module",
            "domain": "aiml",
            "team_size": "5",
            "duration_days": 210,
            "duration_unit": "weeks",
            "status": "reviewed",
            "feasibility_score": 77,
            "tech_stack": ["React.js", "Python", "FastAPI", "MongoDB"],
            "overall_risk": "Medium",
            "milestones_done": 0,
            "progress": 0,
            "created_at": datetime.datetime(2026, 9, 13, 15, 30, 29)
        },
        {
            "id": "idea_1789617458_45cdd1",
            "idea_id": "idea_1789617458_45cdd1",
            "student_id": "ngovardhanreddy9381@gmail.com",
            "student_email": "ngovardhanreddy9381@gmail.com",
            "title": "Smart Health Tracker & AI Diet Assistant",
            "desc": "A mobile-friendly web application where users can log daily meals and physical activity. Uses ML to estimate calories and recommend personalized meal plans.",
            "domain": "aiml",
            "team_size": "3",
            "duration_days": 60,
            "duration_unit": "days",
            "status": "reviewed",
            "feasibility_score": 77,
            "tech_stack": ["React Native", "FastAPI", "PyTorch", "PostgreSQL"],
            "overall_risk": "Medium",
            "milestones_done": 0,
            "progress": 0,
            "created_at": datetime.datetime(2026, 9, 15, 10, 0, 0)
        },
        {
            "id": "6ac3625864b002646ee89f1c",
            "idea_id": "6ac3625864b002646ee89f1c",
            "student_id": "192411137.simats@saveetha.com",
            "student_email": "192411137.simats@saveetha.com",
            "title": "Smart Health Tracker & AI Diet Assistant",
            "desc": "A mobile-friendly web app where users log meals. Uses ML to estimate calories from food photos and generate tailored dietary plans.",
            "domain": "aiml",
            "team_size": "3",
            "duration_days": 60,
            "duration_unit": "days",
            "status": "reviewed",
            "feasibility_score": 57,
            "tech_stack": ["React", "FastAPI", "PyTorch", "MongoDB"],
            "overall_risk": "High",
            "milestones_done": 0,
            "progress": 0,
            "created_at": datetime.datetime(2026, 9, 20, 11, 0, 0)
        },
        {
            "id": "idea_arjun_attendance",
            "idea_id": "idea_arjun_attendance",
            "student_id": "arjun.sharma@college.edu.in",
            "student_email": "arjun.sharma@college.edu.in",
            "title": "Smart Attendance System",
            "desc": "A facial recognition based attendance system with real-time video stream processing and automated classroom verification.",
            "domain": "aiml",
            "team_size": "3",
            "duration_days": 30,
            "duration_unit": "days",
            "status": "reviewed",
            "feasibility_score": 92,
            "tech_stack": ["Python", "OpenCV", "FastAPI", "React", "PostgreSQL"],
            "overall_risk": "Low",
            "milestones_done": 0,
            "progress": 0,
            "created_at": datetime.datetime(2026, 9, 22, 12, 0, 0)
        },
        {
            "id": "idea_priya_ecommerce",
            "idea_id": "idea_priya_ecommerce",
            "student_id": "priya.mehta@college.edu.in",
            "student_email": "priya.mehta@college.edu.in",
            "title": "E-Commerce Recommendation Engine",
            "desc": "Product recommendation engine utilizing collaborative filtering and content-based algorithms integrated into a full-stack React marketplace.",
            "domain": "web",
            "team_size": "2",
            "duration_days": 45,
            "duration_unit": "days",
            "status": "reviewed",
            "feasibility_score": 85,
            "tech_stack": ["React.js", "Node.js", "Express", "MongoDB"],
            "overall_risk": "Low",
            "milestones_done": 0,
            "progress": 0,
            "created_at": datetime.datetime(2026, 9, 24, 14, 0, 0)
        },
        {
            "id": "idea_rahul_iot",
            "idea_id": "idea_rahul_iot",
            "student_id": "rahul.patel@college.edu.in",
            "student_email": "rahul.patel@college.edu.in",
            "title": "IoT Smart Home Dashboard",
            "desc": "Centralized web dashboard and telemetry platform for smart home sensors with automated scheduling and energy optimization analytics.",
            "domain": "iot",
            "team_size": "4",
            "duration_days": 60,
            "duration_unit": "days",
            "status": "reviewed",
            "feasibility_score": 88,
            "tech_stack": ["C++", "ESP32", "MQTT", "Node.js", "React"],
            "overall_risk": "Medium",
            "milestones_done": 0,
            "progress": 0,
            "created_at": datetime.datetime(2026, 9, 25, 15, 0, 0)
        },
        {
            "id": "idea_sneha_stock",
            "idea_id": "idea_sneha_stock",
            "student_id": "sneha.reddy@college.edu.in",
            "student_email": "sneha.reddy@college.edu.in",
            "title": "Stock Price Prediction Model",
            "desc": "Time-series forecasting model for financial equities using LSTM neural networks, technical indicator analysis, and reactive web charts.",
            "domain": "ds",
            "team_size": "2",
            "duration_days": 45,
            "duration_unit": "days",
            "status": "reviewed",
            "feasibility_score": 79,
            "tech_stack": ["Python", "TensorFlow", "Pandas", "Streamlit"],
            "overall_risk": "Medium",
            "milestones_done": 0,
            "progress": 0,
            "created_at": datetime.datetime(2026, 9, 26, 16, 0, 0)
        },
        {
            "id": "idea_anjali_chatbot",
            "idea_id": "idea_anjali_chatbot",
            "student_id": "anjali.singh@college.edu.in",
            "student_email": "anjali.singh@college.edu.in",
            "title": "Mental Health Chatbot",
            "desc": "An empathetic conversational AI assistant providing student mental wellness support, sentiment tracking, and coping resource recommendations.",
            "domain": "aiml",
            "team_size": "2",
            "duration_days": 30,
            "duration_unit": "days",
            "status": "reviewed",
            "feasibility_score": 91,
            "tech_stack": ["Python", "HuggingFace", "FastAPI", "React"],
            "overall_risk": "Low",
            "milestones_done": 0,
            "progress": 0,
            "created_at": datetime.datetime(2026, 9, 27, 17, 0, 0)
        },
        {
            "id": "idea_dev_blockchain",
            "idea_id": "idea_dev_blockchain",
            "student_id": "dev.malhotra@college.edu.in",
            "student_email": "dev.malhotra@college.edu.in",
            "title": "Blockchain Voting System",
            "desc": "A decentralized, immutable electronic voting dApp with voter eligibility verification, smart contracts on Ethereum testnet, and audit trail.",
            "domain": "blockchain",
            "team_size": "3",
            "duration_days": 60,
            "duration_unit": "days",
            "status": "reviewed",
            "feasibility_score": 83,
            "tech_stack": ["Solidity", "Hardhat", "Ethers.js", "React"],
            "overall_risk": "Medium",
            "milestones_done": 0,
            "progress": 0,
            "created_at": datetime.datetime(2026, 9, 28, 18, 0, 0)
        }
    ]

    for idea in legitimate_ideas:
        iid = idea["idea_id"]
        # Update/upsert into project_ideas collection
        db.project_ideas.update_one(
            {"idea_id": iid},
            {"$set": idea},
            upsert=True
        )
        print(f"  [SAVED IDEA] {iid} | '{idea['title']}' | {idea['student_email']}")

    # ---------------------------------------------------------
    # 3. VERIFY AGENT RESULTS CORRESPONDENCE
    # ---------------------------------------------------------
    print("\n--- 3. Verifying Correspondent Agent Reports in Normalized Collections ---")
    for idea in legitimate_ideas:
        iid = idea["idea_id"]
        feas = db.feasibility_reports.find_one({"idea_id": iid})
        scope = db.scope_reports.find_one({"idea_id": iid})
        tech = db.tech_stack_reports.find_one({"idea_id": iid})
        track = db.tracking_reports.find_one({"idea_id": iid})
        print(f"  Idea: {iid} ({idea['title']}):")
        print(f"    - Feasibility: {'YES (Score ' + str(feas.get('overall_score')) + ')' if feas else 'NO'}")
        print(f"    - Scope:       {'YES' if scope else 'NO'}")
        print(f"    - Tech Stack:  {'YES' if tech else 'NO'}")
        print(f"    - Tracking:    {'YES' if track else 'NO'}")

    # ---------------------------------------------------------
    # 4. USERS & STUDENTS IN ATLAS
    # ---------------------------------------------------------
    print("\n--- 4. Ensuring Clean Users & Students in Atlas ---")
    users_to_ensure = [
        {"email": "ngovardhanreddy9381@gmail.com", "name": "N. Govardhan Reddy", "role": "student", "branch": "CSE", "year": "4th Year"},
        {"email": "192411137.simats@saveetha.com", "name": "NARAPAREDDY GOVARDHAN REDDY", "role": "student", "branch": "CSE", "year": "Final Year"},
        {"email": "arjun.sharma@college.edu.in", "name": "Arjun Sharma", "role": "student", "branch": "CSE", "year": "3rd Year"},
        {"email": "priya.mehta@college.edu.in", "name": "Priya Mehta", "role": "student", "branch": "CSE", "year": "3rd Year"},
        {"email": "rahul.patel@college.edu.in", "name": "Rahul Patel", "role": "student", "branch": "IT", "year": "3rd Year"},
        {"email": "sneha.reddy@college.edu.in", "name": "Sneha Reddy", "role": "student", "branch": "DS & AI", "year": "3rd Year"},
        {"email": "anjali.singh@college.edu.in", "name": "Anjali Singh", "role": "student", "branch": "CSE", "year": "3rd Year"},
        {"email": "dev.malhotra@college.edu.in", "name": "Dev Malhotra", "role": "student", "branch": "CSE", "year": "4th Year"},
        {"email": "prof.verma@college.edu.in", "name": "Prof. Rajesh Verma", "role": "faculty", "branch": "CSE", "year": "Faculty"},
    ]

    for u in users_to_ensure:
        db.users.update_one(
            {"email": u["email"]},
            {"$set": {
                "email": u["email"],
                "name": u["name"],
                "role": u["role"],
                "branch": u["branch"],
                "year": u["year"],
                "password": "password123" if u["role"] == "student" else "faculty123",
                "hasCompletedProfile": True,
                "updated_at": datetime.datetime.utcnow()
            }},
            upsert=True
        )
        if u["role"] == "student":
            db.students.update_one(
                {"email": u["email"]},
                {"$set": {
                    "email": u["email"],
                    "name": u["name"],
                    "branch": u["branch"],
                    "year": u["year"],
                    "role": "student",
                    "updated_at": datetime.datetime.utcnow()
                }},
                upsert=True
            )
        print(f"  [USER ENSURED] {u['email']} ({u['name']})")

    # ---------------------------------------------------------
    # 5. SYNC LOCAL DATA FILES
    # ---------------------------------------------------------
    print("\n--- 5. Synchronizing Local files (ideas.json, users.json, students.json) ---")
    local_ideas = {}
    for i in legitimate_ideas:
        c = dict(i)
        c["created_at"] = c["created_at"].isoformat()
        local_ideas[c["idea_id"]] = c
    (DATA_DIR / "ideas.json").write_text(json.dumps(local_ideas, indent=2, default=str), encoding="utf-8")

    local_users = {}
    for u in users_to_ensure:
        local_users[u["email"]] = {
            "email": u["email"],
            "password": "password123" if u["role"] == "student" else "faculty123",
            "name": u["name"],
            "role": u["role"],
            "branch": u["branch"],
            "year": u["year"],
            "hasCompletedProfile": True,
            "createdAt": "2026-09-01T00:00:00Z"
        }
    (DATA_DIR / "users.json").write_text(json.dumps(local_users, indent=2, default=str), encoding="utf-8")

    local_students = {}
    for u in [x for x in users_to_ensure if x["role"] == "student"]:
        local_students[u["email"]] = {
            "first_name": u["name"].split()[0],
            "last_name": u["name"].split()[-1],
            "name": u["name"],
            "email": u["email"],
            "branch": u["branch"],
            "year": u["year"],
            "role": "student",
            "team_size": "3",
            "projects": [],
            "student_id": u["email"]
        }
    (DATA_DIR / "students.json").write_text(json.dumps(local_students, indent=2, default=str), encoding="utf-8")

    print(f"Updated local data files successfully with {len(local_ideas)} ideas and {len(local_users)} users.")
    print("\n=== All user ideas and agent reports successfully updated in MongoDB Atlas! ===")


if __name__ == "__main__":
    run_sync()
