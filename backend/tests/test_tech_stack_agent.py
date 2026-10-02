"""
Comprehensive Test Suite for Tech Stack Agent (Agent 3) and Chaining Pipeline.
Tests cover:
- Agent 1 -> Agent 2 chaining (Feasibility passed to Scope, Scope embeds feasibilityReport)
- Agent 1 + Agent 2 -> Agent 3 chaining (Tech Stack requires both reports)
- Step-by-step reasoning chain output validation
- Validation / enforcement: 422 error when chained reports are missing
- Domain defaults and fallback stack generation
- Parsing LLM JSON outputs (plain, markdown codeblock, embedded)

Run with:
    python -m unittest tests/test_tech_stack_agent.py
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main
from agents.tech_stack_agent import (
    run_tech_stack_agent,
    _parse_json_from_text,
    _build_fallback_report,
    _DOMAIN_DEFAULTS,
)


class TestTechStackAgentAndChaining(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app)

        cls.sample_idea = {
            "title": "Smart Campus Attendance System",
            "desc": "An automated attendance tracking platform using facial recognition and web dashboard.",
            "domain": "aiml",
            "teamSize": "4",
            "durationDays": 45,
            "techIdeas": "Python, React, OpenCV",
            "features": ["Face verification", "Live dashboard", "Export CSV reports"],
        }

        cls.sample_feasibility_report = {
            "overallScore": 82,
            "verdict": "Feasible with Guidance",
            "metrics": {
                "technical": 80,
                "timeline": 78,
                "resource": 85,
                "skillMatch": 85,
            },
            "strengths": [
                "Clear real-world utility for campus automation",
                "Strong technical alignment with modern computer vision libraries",
            ],
            "bottlenecks": [
                "Lighting variation in classroom images could degrade facial recognition accuracy",
                "Processing video feeds in real-time requires GPU acceleration",
            ],
            "aiGenerated": False,
        }

        cls.sample_scope_report = {
            "problemStatement": "Manual attendance logging is time-consuming and error-prone.",
            "objectives": [
                "Deploy a working facial recognition demo for 50 registered students.",
                "Provide faculty with an intuitive attendance dashboard.",
            ],
            "inScope": [
                "Face capture and embedding matching",
                "Daily attendance log interface",
                "Admin dashboard for student registration",
            ],
            "outOfScope": [
                "Integration with university ERP databases",
                "Multi-camera RTSP stream clustering",
                "Automated push notifications via SMS",
            ],
            "targetUsers": "University faculty and department heads",
            "keyDeliverables": [
                "Working computer vision attendance prototype",
                "Frontend dashboard",
                "REST API service",
            ],
            "assumptions": ["Classroom has adequate ambient lighting."],
            "constraints": ["45-day deadline", "4-member student team"],
            "overallScore": 84,
            "feasibilityReport": cls.sample_feasibility_report,
            "aiGenerated": False,
        }

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Agent Chaining Pipeline Tests
    # ──────────────────────────────────────────────────────────────────────────

    def test_scope_endpoint_embeds_feasibility_report(self):
        """Verify Agent 2 embeds Agent 1 output in feasibilityReport field."""
        payload = {
            "title": self.sample_idea["title"],
            "desc": self.sample_idea["desc"],
            "domain": self.sample_idea["domain"],
            "teamSize": self.sample_idea["teamSize"],
            "durationDays": self.sample_idea["durationDays"],
            "feasibilityReport": self.sample_feasibility_report,
        }
        res = self.client.post("/api/scope-definition", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("problemStatement", data)
        self.assertIn("feasibilityReport", data)
        self.assertEqual(data["feasibilityReport"]["overallScore"], 82)
        self.assertEqual(data["feasibilityReport"]["verdict"], "Feasible with Guidance")

    def test_tech_stack_endpoint_success_with_chained_inputs(self):
        """Verify POST /api/tech-stack succeeds when both upstream reports are provided."""
        payload = {
            **self.sample_idea,
            "feasibilityReport": self.sample_feasibility_report,
            "scopeReport": self.sample_scope_report,
        }
        res = self.client.post("/api/tech-stack", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Check required stack layers
        self.assertIn("recommendedStack", data)
        stack = data["recommendedStack"]
        for layer in ["frontend", "backend", "database", "apis", "devops", "testing"]:
            self.assertIn(layer, stack)
            self.assertTrue(len(stack[layer]) > 0)

        # Check reasoning chain
        self.assertIn("reasoning", data)
        self.assertIsInstance(data["reasoning"], list)
        self.assertGreaterEqual(len(data["reasoning"]), 4, "Must have at least 4 reasoning steps")

        # Check alternatives and justification
        self.assertIn("alternatives", data)
        self.assertIsInstance(data["alternatives"], list)
        self.assertGreaterEqual(len(data["alternatives"]), 1)
        self.assertIn("justification", data)
        self.assertTrue(len(data["justification"]) > 10)
        self.assertIn("learningResources", data)

    def test_tech_stack_endpoint_enforces_feasibility_report(self):
        """Verify POST /api/tech-stack rejects missing feasibilityReport with 422."""
        payload = {
            **self.sample_idea,
            "scopeReport": self.sample_scope_report,
        }
        res = self.client.post("/api/tech-stack", json=payload)
        self.assertEqual(res.status_code, 422)

    def test_tech_stack_endpoint_enforces_scope_report(self):
        """Verify POST /api/tech-stack rejects missing scopeReport with 422."""
        payload = {
            **self.sample_idea,
            "feasibilityReport": self.sample_feasibility_report,
        }
        res = self.client.post("/api/tech-stack", json=payload)
        self.assertEqual(res.status_code, 422)

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Tech Stack Agent Unit Tests
    # ──────────────────────────────────────────────────────────────────────────

    def test_agent_generates_reasoning_referencing_upstream_reports(self):
        """Verify reasoning steps reference feasibility verdict and scope constraints."""
        report = run_tech_stack_agent(
            idea_data=self.sample_idea,
            feasibility_report=self.sample_feasibility_report,
            scope_report=self.sample_scope_report,
        )
        self.assertIn("recommendedStack", report)
        self.assertIn("reasoning", report)
        reasoning_text = " ".join(report["reasoning"]).lower()
        self.assertTrue(
            "aiml" in reasoning_text or "domain" in reasoning_text or "feasib" in reasoning_text
        )

    def test_agent_domain_defaults(self):
        """Verify fallback report produces domain-appropriate layers."""
        for domain, defaults in _DOMAIN_DEFAULTS.items():
            fallback = _build_fallback_report(
                {"domain": domain, "title": f"Project {domain}"},
                self.sample_feasibility_report,
                self.sample_scope_report,
            )
            stack = fallback["recommendedStack"]
            self.assertEqual(stack["frontend"], defaults["frontend"])
            self.assertEqual(stack["backend"], defaults["backend"])

    def test_parse_json_from_text_variants(self):
        """Verify JSON parsing handles raw, markdown-fenced, and noisy prose."""
        raw_json = '{"recommendedStack": {"frontend": "React"}, "reasoning": ["Step 1"]}'
        fenced_json = f'```json\n{raw_json}\n```'
        prose_json = f'Here is the result:\n{fenced_json}\nBest regards.'

        self.assertEqual(_parse_json_from_text(raw_json)["recommendedStack"]["frontend"], "React")
        self.assertEqual(_parse_json_from_text(fenced_json)["recommendedStack"]["frontend"], "React")
        self.assertEqual(_parse_json_from_text(prose_json)["recommendedStack"]["frontend"], "React")
        self.assertEqual(_parse_json_from_text("not json at all"), {})


if __name__ == "__main__":
    unittest.main()
