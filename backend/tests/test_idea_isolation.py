import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_account_idea_isolation():
    # Submit idea for User A
    res_a = client.post("/submit-idea", json={
        "student_id": "std_a_123",
        "student_email": "user_a@test.edu",
        "user_email": "user_a@test.edu",
        "title": "User A Unique AI Project",
        "desc": "Deep learning system for robotics",
        "domain": "aiml",
        "teamSize": "2",
        "durationDays": 45,
        "durationUnit": "days"
    })
    assert res_a.status_code == 200
    idea_a_id = res_a.json()["idea_id"]

    # Submit idea for User B
    res_b = client.post("/submit-idea", json={
        "student_id": "std_b_456",
        "student_email": "user_b@test.edu",
        "user_email": "user_b@test.edu",
        "title": "User B Blockchain Portal",
        "desc": "Decentralized credential store",
        "domain": "web",
        "teamSize": "3",
        "durationDays": 30,
        "durationUnit": "days"
    })
    assert res_b.status_code == 200
    idea_b_id = res_b.json()["idea_id"]

    # Query ideas for User A only
    res_get_a = client.get("/api/ideas?email=user_a@test.edu")
    assert res_get_a.status_code == 200
    ideas_a = res_get_a.json()
    titles_a = [i["title"] for i in ideas_a]
    assert "User A Unique AI Project" in titles_a
    assert "User B Blockchain Portal" not in titles_a

    # Query ideas for User B only
    res_get_b = client.get("/api/ideas?email=user_b@test.edu")
    assert res_get_b.status_code == 200
    ideas_b = res_get_b.json()
    titles_b = [i["title"] for i in ideas_b]
    assert "User B Blockchain Portal" in titles_b
    assert "User A Unique AI Project" not in titles_b

    # Clean up test ideas
    client.delete(f"/api/ideas/{idea_a_id}")
    client.delete(f"/api/ideas/{idea_b_id}")
