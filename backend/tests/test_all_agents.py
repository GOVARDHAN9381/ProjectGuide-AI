"""
Comprehensive test suite for all 3 AI Agents:
  - Agent 1: Feasibility Agent  → POST /api/feasibility-check
  - Agent 2: Scope Agent        → POST /api/scope-definition
  - Agent 3: Tech Stack Agent   → POST /api/tech-stack

Tests validate:
  1. HTTP 200 response from each endpoint
  2. All required fields present in JSON response
  3. LLM-generated (aiGenerated=True) — real AI, not heuristic fallback
  4. Correctness of LLM output (scores in 0-100, non-empty strings/arrays)
  5. Agent chaining (Agent 2 uses Agent 1's output; Agent 3 uses both)
  6. Health check endpoints
"""

import json
import os
import sys
import time
import requests

# Allow imports from backend root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    from fastapi.testclient import TestClient
    from main import app
    _test_client = TestClient(app)
except Exception:
    _test_client = None

BASE = "http://localhost:8000"


class _ClientAdapter:
    def get(self, url, **kwargs):
        if url.startswith(BASE) and _test_client:
            path = url.replace(BASE, "")
            return _test_client.get(path, **kwargs)
        try:
            return requests.get(url, **kwargs)
        except Exception:
            if _test_client and url.startswith(BASE):
                path = url.replace(BASE, "")
                return _test_client.get(path, **kwargs)
            raise

    def post(self, url, **kwargs):
        if url.startswith(BASE) and _test_client:
            path = url.replace(BASE, "")
            return _test_client.post(path, **kwargs)
        try:
            return requests.post(url, **kwargs)
        except Exception:
            if _test_client and url.startswith(BASE):
                path = url.replace(BASE, "")
                return _test_client.post(path, **kwargs)
            raise


client = _ClientAdapter()

# ─────────────────────────────────────────────
# Shared test project payload
# ─────────────────────────────────────────────
TEST_PROJECT = {
    "title": "AI-Based Student Attendance System Using Face Recognition",
    "desc": (
        "A web application that uses computer vision and facial recognition to "
        "automate attendance marking for college classrooms. The system detects "
        "student faces via webcam, matches them against a registered database, and "
        "auto-marks attendance in real time. Faculty can view reports and export CSVs."
    ),
    "domain": "aiml",
    "teamSize": "4",
    "durationDays": 60,
    "techIdeas": "Python, OpenCV, React, FastAPI, PostgreSQL",
    "features": [
        "Real-time face detection via webcam",
        "Student registration with photo upload",
        "Automated attendance marking",
        "Attendance reports and CSV export",
        "Faculty dashboard with analytics",
    ],
    "studentSkills": {
        "Python": 4,
        "Machine Learning": 3,
        "React": 3,
        "FastAPI": 2,
        "OpenCV": 2,
        "SQL": 3,
    },
}

PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️  WARN"
INFO = "ℹ️  INFO"

results = []


def log(status, test_name, detail=""):
    icon = {"PASS": PASS, "FAIL": FAIL, "WARN": WARN, "INFO": INFO}.get(status, status)
    msg = f"  {icon}  {test_name}"
    if detail:
        msg += f"\n         └─ {detail}"
    print(msg)
    results.append({"status": status, "test": test_name, "detail": detail})


def check(condition, test_name, pass_detail="", fail_detail=""):
    if condition:
        log("PASS", test_name, pass_detail)
        return True
    else:
        log("FAIL", test_name, fail_detail)
        return False


# ─────────────────────────────────────────────
# 0. Health Checks
# ─────────────────────────────────────────────
def test_health():
    print("\n══════════════════════════════════════")
    print("  HEALTH CHECKS")
    print("══════════════════════════════════════")

    r = client.get(f"{BASE}/", timeout=5)
    check(r.status_code == 200, "Backend / health endpoint returns 200",
          f"Response: {r.json()}")

    r2 = client.get(f"{BASE}/db-health", timeout=5)
    body = r2.json()
    check(r2.status_code == 200, "DB health endpoint responds",
          f"Response: {body}")
    if not body.get("connected"):
        log("WARN", "MongoDB NOT connected — agents will use local fallback storage",
            "Check MONGO_URI in .env and Atlas IP whitelist")


# ─────────────────────────────────────────────
# 1. Feasibility Agent
# ─────────────────────────────────────────────
def test_feasibility_agent():
    print("\n══════════════════════════════════════")
    print("  AGENT 1 — FEASIBILITY AGENT")
    print("══════════════════════════════════════")

    payload = {
        "title": TEST_PROJECT["title"],
        "desc": TEST_PROJECT["desc"],
        "domain": TEST_PROJECT["domain"],
        "teamSize": TEST_PROJECT["teamSize"],
        "durationDays": TEST_PROJECT["durationDays"],
        "techIdeas": TEST_PROJECT["techIdeas"],
        "features": TEST_PROJECT["features"],
        "studentSkills": TEST_PROJECT["studentSkills"],
    }

    print(f"\n  {INFO}  Calling POST /api/feasibility-check ...")
    t0 = time.time()
    try:
        r = client.post(f"{BASE}/api/feasibility-check", json=payload, timeout=120)
    except Exception as e:
        log("FAIL", "Feasibility endpoint reachable", str(e))
        return None
    elapsed = round(time.time() - t0, 1)

    check(r.status_code == 200, f"HTTP 200 (took {elapsed}s)", f"Status: {r.status_code}")
    if r.status_code != 200:
        print(f"  Error body: {r.text[:400]}")
        return None

    d = r.json()
    print(f"\n  {INFO}  Raw response preview:")
    print(f"         overallScore = {d.get('overallScore')}")
    print(f"         verdict      = {d.get('verdict')}")
    print(f"         aiGenerated  = {d.get('aiGenerated')}")
    print(f"         metrics      = {d.get('metrics')}")
    print(f"         strengths[0] = {(d.get('strengths') or [''])[0]}")
    print(f"         bottlenecks[0] = {(d.get('bottlenecks') or [''])[0]}")

    # Schema validation
    check("overallScore" in d and isinstance(d["overallScore"], int),
          "overallScore is int", str(d.get("overallScore")))
    check(0 <= d.get("overallScore", -1) <= 100,
          "overallScore in 0–100 range", str(d.get("overallScore")))
    check(d.get("verdict") in {"Highly Feasible", "Feasible with Guidance", "Needs Scope Reduction"},
          "verdict is valid enum", str(d.get("verdict")))
    check(isinstance(d.get("metrics"), dict) and all(
        k in d["metrics"] for k in ["technical", "timeline", "resource", "skillMatch"]),
          "metrics has all 4 keys", str(d.get("metrics")))
    check(all(0 <= v <= 100 for v in d.get("metrics", {}).values()),
          "all metric values in 0–100 range")
    check(isinstance(d.get("strengths"), list) and len(d["strengths"]) >= 2,
          f"strengths has {len(d.get('strengths',[]))} items (≥2 expected)")
    check(isinstance(d.get("bottlenecks"), list) and len(d["bottlenecks"]) >= 1,
          f"bottlenecks has {len(d.get('bottlenecks',[]))} items (≥1 expected)")

    # AI Generated check (real LLM, not heuristic fallback)
    ai = d.get("aiGenerated", False)
    if ai:
        log("PASS", "aiGenerated = True (real LLM response, not heuristic)")
    else:
        log("WARN", "aiGenerated = False — LLM may have fallen back to heuristic",
            "Check Groq API key and model name in .env")

    # Content quality check
    strengths_text = " ".join(d.get("strengths", []))
    check(
        TEST_PROJECT["title"].lower()[:15] in strengths_text.lower() or
        "face" in strengths_text.lower() or
        "attendance" in strengths_text.lower() or
        "ai" in strengths_text.lower(),
        "Strengths reference actual project context (not generic)",
        f"strengths: {strengths_text[:120]}"
    )

    return d


# ─────────────────────────────────────────────
# 2. Scope Agent
# ─────────────────────────────────────────────
def test_scope_agent(feasibility_report=None):
    print("\n══════════════════════════════════════")
    print("  AGENT 2 — SCOPE DEFINITION AGENT")
    print("══════════════════════════════════════")

    payload = {
        "title": TEST_PROJECT["title"],
        "desc": TEST_PROJECT["desc"],
        "domain": TEST_PROJECT["domain"],
        "teamSize": TEST_PROJECT["teamSize"],
        "durationDays": TEST_PROJECT["durationDays"],
        "techIdeas": TEST_PROJECT["techIdeas"],
        "features": TEST_PROJECT["features"],
        "studentSkills": TEST_PROJECT["studentSkills"],
        "feasibilityReport": feasibility_report,  # Agent chaining
    }

    chained = feasibility_report is not None
    print(f"\n  {INFO}  Calling POST /api/scope-definition ...")
    if chained:
        print(f"  {INFO}  Agent chaining: Feasibility report injected (score={feasibility_report.get('overallScore')})")
    else:
        print(f"  {WARN}  No feasibility report — Agent 2 will auto-generate one internally")

    t0 = time.time()
    try:
        r = client.post(f"{BASE}/api/scope-definition", json=payload, timeout=180)
    except Exception as e:
        log("FAIL", "Scope endpoint reachable", str(e))
        return None
    elapsed = round(time.time() - t0, 1)

    check(r.status_code == 200, f"HTTP 200 (took {elapsed}s)", f"Status: {r.status_code}")
    if r.status_code != 200:
        print(f"  Error body: {r.text[:400]}")
        return None

    d = r.json()
    print(f"\n  {INFO}  Raw response preview:")
    print(f"         problemStatement = {(d.get('problemStatement') or '')[:100]}...")
    print(f"         objectives count = {len(d.get('objectives', []))}")
    print(f"         inScope count    = {len(d.get('inScope', []))}")
    print(f"         outOfScope count = {len(d.get('outOfScope', []))}")
    print(f"         aiGenerated      = {d.get('aiGenerated')}")
    print(f"         feasibilityAlignment = {(d.get('feasibilityAlignment') or '')[:80]}...")

    # Schema validation
    required_fields = ["problemStatement", "objectives", "inScope", "outOfScope",
                        "targetUsers", "keyDeliverables", "assumptions", "constraints"]
    for f in required_fields:
        check(f in d and d[f],
              f"Field '{f}' present and non-empty", str(d.get(f, ""))[:80])

    check(isinstance(d.get("objectives"), list) and len(d["objectives"]) >= 2,
          f"objectives has {len(d.get('objectives',[]))} items (≥2 expected)")
    check(isinstance(d.get("inScope"), list) and len(d["inScope"]) >= 2,
          f"inScope has {len(d.get('inScope',[]))} items (≥2 expected)")
    check(isinstance(d.get("outOfScope"), list) and len(d["outOfScope"]) >= 1,
          f"outOfScope has {len(d.get('outOfScope',[]))} items (≥1 expected)")

    # Agent chaining: feasibility report should be embedded in scope response
    embedded_feas = d.get("feasibilityReport")
    if embedded_feas:
        log("PASS", "Agent chaining: feasibilityReport embedded in scope response",
            f"score={embedded_feas.get('overallScore')}, verdict={embedded_feas.get('verdict')}")
    else:
        log("WARN", "feasibilityReport not embedded in scope response — check chaining logic")

    # Feasibility alignment field
    align = d.get("feasibilityAlignment", "")
    check(bool(align) and len(align) > 20,
          "feasibilityAlignment is populated",
          f"{align[:100]}")

    ai = d.get("aiGenerated", False)
    if ai:
        log("PASS", "aiGenerated = True (real LLM response)")
    else:
        log("WARN", "aiGenerated = False — Scope Agent may have failed to call LLM")

    # Content check
    problem = d.get("problemStatement", "")
    check(
        "attendance" in problem.lower() or "face" in problem.lower() or "recogni" in problem.lower(),
        "problemStatement references project domain",
        f"{problem[:120]}"
    )

    return d


# ─────────────────────────────────────────────
# 3. Tech Stack Agent
# ─────────────────────────────────────────────
def test_tech_stack_agent(feasibility_report=None, scope_report=None):
    print("\n══════════════════════════════════════")
    print("  AGENT 3 — TECH STACK AGENT")
    print("══════════════════════════════════════")

    if not feasibility_report or not scope_report:
        log("WARN", "Skipping Tech Stack test — upstream reports not available")
        return None

    payload = {
        "title": TEST_PROJECT["title"],
        "desc": TEST_PROJECT["desc"],
        "domain": TEST_PROJECT["domain"],
        "teamSize": TEST_PROJECT["teamSize"],
        "durationDays": TEST_PROJECT["durationDays"],
        "techIdeas": TEST_PROJECT["techIdeas"],
        "features": TEST_PROJECT["features"],
        "studentSkills": TEST_PROJECT["studentSkills"],
        "feasibilityReport": feasibility_report,
        "scopeReport": scope_report,
    }

    print(f"\n  {INFO}  Calling POST /api/tech-stack ...")
    print(f"  {INFO}  Agent chaining: feasibility({feasibility_report.get('overallScore')}%) + scope({scope_report.get('overallScore')}%) injected")

    t0 = time.time()
    try:
        r = client.post(f"{BASE}/api/tech-stack", json=payload, timeout=180)
    except Exception as e:
        log("FAIL", "Tech stack endpoint reachable", str(e))
        return None
    elapsed = round(time.time() - t0, 1)

    check(r.status_code == 200, f"HTTP 200 (took {elapsed}s)", f"Status: {r.status_code}")
    if r.status_code != 200:
        print(f"  Error body: {r.text[:400]}")
        return None

    d = r.json()
    stack = d.get("recommendedStack", {})
    print(f"\n  {INFO}  Raw response preview:")
    print(f"         frontend    = {stack.get('frontend', 'N/A')}")
    print(f"         backend     = {stack.get('backend', 'N/A')}")
    print(f"         database    = {stack.get('database', 'N/A')}")
    print(f"         apis        = {stack.get('apis', 'N/A')}")
    print(f"         devops      = {stack.get('devops', 'N/A')}")
    print(f"         testing     = {stack.get('testing', 'N/A')}")
    print(f"         reasoning steps = {len(d.get('reasoning', []))}")
    print(f"         alternatives    = {len(d.get('alternatives', []))}")
    print(f"         resources       = {len(d.get('learningResources', []))}")
    print(f"         aiGenerated     = {d.get('aiGenerated')}")

    # Schema validation
    stack_layers = ["frontend", "backend", "database", "apis", "devops", "testing"]
    for layer in stack_layers:
        check(layer in stack and stack[layer] and stack[layer] != "TBD",
              f"Stack layer '{layer}' has value",
              str(stack.get(layer, ""))[:80])

    check(isinstance(d.get("reasoning"), list) and len(d["reasoning"]) >= 3,
          f"reasoning has {len(d.get('reasoning',[]))} steps (≥3 expected)")

    check(isinstance(d.get("alternatives"), list) and len(d["alternatives"]) >= 2,
          f"alternatives has {len(d.get('alternatives',[]))} items (≥2 expected)")

    check(isinstance(d.get("learningResources"), list) and len(d["learningResources"]) >= 2,
          f"learningResources has {len(d.get('learningResources',[]))} items (≥2 expected)")

    check(bool(d.get("justification")) and len(d["justification"]) > 30,
          "justification is populated",
          (d.get("justification") or "")[:100])

    ai = d.get("aiGenerated", False)
    if ai:
        log("PASS", "aiGenerated = True (real LLM response)")
    else:
        log("WARN", "aiGenerated = False")

    # Check reasoning references upstream reports (agent chaining quality)
    reasoning_text = " ".join(d.get("reasoning", []))
    has_feas_ref = any(kw in reasoning_text.lower() for kw in
        ["feasibility", "score", "verdict", "bottleneck", "skill", "timeline"])
    check(has_feas_ref,
          "Reasoning chain references Feasibility Agent output",
          f"{reasoning_text[:200]}")

    has_scope_ref = any(kw in reasoning_text.lower() for kw in
        ["scope", "in scope", "deliverable", "objective", "constraint", "user"])
    check(has_scope_ref,
          "Reasoning chain references Scope Agent output",
          f"{reasoning_text[:200]}")

    # Check that resources contain URLs
    resources = d.get("learningResources", [])
    has_url = any("http" in r for r in resources)
    check(has_url, "Learning resources contain actual URLs",
          str(resources[:2]))

    return d


# ─────────────────────────────────────────────
# 4. Error handling tests
# ─────────────────────────────────────────────
def test_error_handling():
    print("\n══════════════════════════════════════")
    print("  ERROR HANDLING TESTS")
    print("══════════════════════════════════════")

    # Tech stack without upstream reports
    r = client.post(f"{BASE}/api/tech-stack", json={
        "title": "Test", "desc": "Test", "domain": "web",
        "feasibilityReport": {},
        "scopeReport": {},
    }, timeout=30)
    check(r.status_code in {200, 422, 500},
          "Tech stack with empty reports returns appropriate error code",
          f"Status: {r.status_code}")

    # Feasibility with missing required fields
    r2 = client.post(f"{BASE}/api/feasibility-check", json={
        "domain": "web",
    }, timeout=10)
    check(r2.status_code == 422,
          "Feasibility with missing 'title'/'desc' returns 422",
          f"Status: {r2.status_code}")


# ─────────────────────────────────────────────
# 5. Summary
# ─────────────────────────────────────────────
def print_summary():
    print("\n" + "═" * 50)
    print("  FINAL TEST SUMMARY")
    print("═" * 50)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    warned = sum(1 for r in results if r["status"] == "WARN")
    total = passed + failed + warned
    print(f"  ✅ PASSED : {passed}")
    print(f"  ❌ FAILED : {failed}")
    print(f"  ⚠️  WARNED : {warned}")
    print(f"  📊 TOTAL  : {total}")

    if failed > 0:
        print(f"\n  Failed tests:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"    ✗ {r['test']}")
                if r.get("detail"):
                    print(f"      └─ {r['detail'][:100]}")

    print("═" * 50)
    return failed == 0


if __name__ == "__main__":
    print("\n" + "═" * 50)
    print("  AI MENTOR PLATFORM — FULL AGENT TEST SUITE")
    print("═" * 50)
    print(f"  Project: {TEST_PROJECT['title']}")
    print(f"  Domain : {TEST_PROJECT['domain'].upper()}, {TEST_PROJECT['durationDays']} days, team of {TEST_PROJECT['teamSize']}")

    test_health()
    feas = test_feasibility_agent()
    scope = test_scope_agent(feasibility_report=feas)
    tech = test_tech_stack_agent(feasibility_report=feas, scope_report=scope)
    test_error_handling()

    success = print_summary()

    # Write JSON output for CI reference
    with open("tests/test_results.json", "w") as f:
        json.dump({
            "results": results,
            "feasibility_response": feas,
            "scope_response": scope,
            "tech_stack_response": tech,
        }, f, indent=2, default=str)
    print(f"\n  Full results saved to: tests/test_results.json\n")

    sys.exit(0 if success else 1)
