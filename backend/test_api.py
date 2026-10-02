from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_api():
    print("Running ProjectGuide-AI Backend API Tests on MongoDB...")

    # 1. Health check
    res = client.get("/")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["database"] == "MongoDB"
    print(f"  [PASS] Health check: {data['status']} | Database: {data['database']} (DB: {data['db_name']})")

    # 2. Get student
    res = client.get("/student/1")
    assert res.status_code == 200, res.text
    student = res.json()
    print("  [PASS] Get student 1:", student["name"], f"({student['email']})")

    # 3. Initial check: Student 1 has no default project submitted
    res = client.get("/projects/student/1")
    assert res.status_code == 200, res.text
    projs = res.json()
    assert len(projs) == 0, f"Expected 0 default projects, got {len(projs)}"
    print("  [PASS] Clean Slate: Student 1 starts with 0 default project submissions (Blank state).")

    # 4. Submit new idea with multi-agent pipeline
    res = client.post("/submit-idea", json={
        "student_id": 1,
        "title": "Smart Attendance System using Facial Recognition",
        "desc": "Automated classroom attendance platform utilizing MTCNN and FaceNet for high-accuracy real-time facial verification.",
        "domain": "aiml",
        "teamSize": "3",
        "durationDays": 30
    })
    assert res.status_code == 200, res.text
    new_idea = res.json()
    print(f"  [PASS] Student 1 submits idea -> AI Blueprint Generated: ID={new_idea['idea_id']} | Feasibility={new_idea['feasibility_score']}% | Stack={new_idea['tech_stack'][:3]} | Milestones={len(new_idea['milestones'])}")

    # 5. Get projects for student 1 after submission
    res = client.get("/projects/student/1")
    assert res.status_code == 200, res.text
    projs = res.json()
    assert len(projs) == 1, "Expected 1 project after submission"
    main_p = projs[0]
    print(f"  [PASS] Student 1 project now populated: '{main_p['title']}' | Feasibility: {main_p['feasibility']}%")

    # 6. Toggle milestone
    if main_p["milestones"]:
        target_ms = main_p["milestones"][0]
        res = client.post(f"/projects/{main_p['id']}/milestones/{target_ms['id']}/toggle", json={"completed": True})
        assert res.status_code == 200, res.text
        toggle_res = res.json()
        print(f"  [PASS] Toggle milestone {target_ms['id']}: {toggle_res['milestones_done']}/{toggle_res['total_milestones']} done ({toggle_res['progress_pct']}%)")

    # 7. Faculty students list
    res = client.get("/faculty/students")
    assert res.status_code == 200, res.text
    cohort = res.json()
    print("  [PASS] Faculty student cohort count:", len(cohort))

    # 8. Faculty review & approve
    res = client.post("/faculty/review", json={
        "project_id": main_p["id"],
        "faculty_name": "Prof. Verma",
        "feedback": "Excellent architecture and clear milestone roadmap. Approved.",
        "status": "active"
    })
    assert res.status_code == 200, res.text
    print("  [PASS] Faculty review & approve:", res.json()["message"])

    # 9. Faculty broadcast announcement
    res = client.post("/faculty/broadcast", json={
        "author_name": "Prof. Verma",
        "title": "Viva Presentation Deck Guidelines",
        "message": "Please include system architecture and demo recording in slide 5."
    })
    assert res.status_code == 200, res.text
    print("  [PASS] Faculty broadcast:", res.json()["title"])

    # 10. AI Chat Mentor
    res = client.post("/chat", json={
        "message": "What is the recommended tech stack for my project and what is my next milestone?",
        "student_id": 1
    })
    assert res.status_code == 200, res.text
    chat_reply = res.json()
    print("  [PASS] AI Chat Mentor response:", chat_reply["text"][:80] + "...")

    # 11. Faculty CSV export
    res = client.get("/faculty/export")
    assert res.status_code == 200, res.text
    assert "ID,Name,Roll No" in res.text
    print("  [PASS] Faculty CSV export verified successfully!")

    print("\nSUCCESS: ALL 11 MONGODB TESTS PASSED WITH ZERO DEFAULT PROJECT SUBMISSIONS!")

if __name__ == "__main__":
    test_api()
