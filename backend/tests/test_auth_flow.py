import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from main import app

client = TestClient(app)


def test_unregistered_user_rejected():
    """Unregistered users must receive 404 and NOT be authenticated."""
    res = client.post("/api/auth/login", json={
        "email": "unregistered.ghost.user@college.edu.in",
        "password": "password123",
        "role": "student"
    })
    assert res.status_code == 404
    data = res.json()
    assert "Account not found" in data["detail"]


def test_wrong_password_rejected():
    """Valid user with wrong password must receive 401."""
    res = client.post("/api/auth/login", json={
        "email": "arjun.sharma@college.edu.in",
        "password": "wrongpassword999",
        "role": "student"
    })
    assert res.status_code == 401
    assert "Incorrect password" in res.json()["detail"]


def test_demo_user_login_has_completed_profile():
    """Arjun Sharma demo user should have completed profile and skills."""
    res = client.post("/api/auth/login", json={
        "email": "arjun.sharma@college.edu.in",
        "password": "password123",
        "role": "student"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "authenticated"
    assert data["hasCompletedProfile"] is True
    assert "python" in data["user"]["skills"]


def test_new_registration_and_skills_persistence():
    """
    Test full flow:
    1. Register new student -> hasCompletedProfile is False
    2. Try logging in before skills -> hasCompletedProfile is False
    3. Save skills & domains via /onboarding and /api/auth/update-profile
    4. Log in again -> hasCompletedProfile is True, skills are present!
    """
    import time
    test_email = f"student_{int(time.time())}@college.edu.in"
    
    # 1. Register
    reg_res = client.post("/api/auth/register", json={
        "email": test_email,
        "password": "mypassword123",
        "name": "Kiran Rao",
        "role": "student",
        "rollNo": "22CS555",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year"
    })
    assert reg_res.status_code == 200
    assert reg_res.json()["hasCompletedProfile"] is False

    # 2. Login before skills
    login1_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "mypassword123",
        "role": "student"
    })
    assert login1_res.status_code == 200
    assert login1_res.json()["hasCompletedProfile"] is False
    assert len(login1_res.json()["user"]["skills"]) == 0

    # 3. Complete onboarding / profile with skills & interests
    onboard_res = client.post("/onboarding", json={
        "firstName": "Kiran",
        "lastName": "Rao",
        "email": test_email,
        "rollNo": "22CS555",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "skills": {"python": 4, "react": 3, "fastapi": 4},
        "domains": ["Artificial Intelligence", "Web Development"],
        "teamSize": "3",
        "aboutMe": "Full stack builder"
    })
    assert onboard_res.status_code == 200
    assert onboard_res.json()["status"] == "onboarded"

    # 4. Log in again: must now return hasCompletedProfile = True with skills!
    login2_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "mypassword123",
        "role": "student"
    })
    assert login2_res.status_code == 200
    data2 = login2_res.json()
    assert data2["hasCompletedProfile"] is True
    assert data2["user"]["skills"]["python"] == 4
    assert "Artificial Intelligence" in data2["user"]["domains"]
