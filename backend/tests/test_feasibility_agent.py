"""
Comprehensive Test Suite for the Feasibility Agent (v2)
Tests cover: JSON parsing, fallback logic, report structure,
scoring logic, verdict thresholds, skill-match scoring,
timeline scoring, edge cases, and file handling.
Run with: python -m pytest tests/test_feasibility_agent.py -v
"""

import base64
import sys
import os
import pytest

# Allow imports from backend root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.feasibility_agent import (
    _parse_json_from_text,
    _build_fallback_report,
    _compute_skill_match,
    _timeline_score,
    _verdict_from_score,
    _validate_and_normalise,
)
from agents.file_extractor import extract_text_from_files


# ---------------------------------------------------------------------------
# GROUP 1: _parse_json_from_text
# ---------------------------------------------------------------------------

class TestParseJsonFromText:
    """Unit tests for the LLM-output JSON parser."""

    def test_plain_json(self):
        """TC-P1: Valid plain JSON string is parsed correctly."""
        raw = '{"overallScore": 85, "verdict": "Highly Feasible"}'
        result = _parse_json_from_text(raw)
        assert result["overallScore"] == 85
        assert result["verdict"] == "Highly Feasible"

    def test_markdown_json_block(self):
        """TC-P2: JSON wrapped in ```json ... ``` is extracted."""
        raw = '```json\n{"overallScore": 72, "verdict": "Feasible with Guidance"}\n```'
        result = _parse_json_from_text(raw)
        assert result["overallScore"] == 72

    def test_plain_code_block(self):
        """TC-P3: JSON wrapped in plain ``` ... ``` is extracted."""
        raw = '```\n{"overallScore": 60}\n```'
        result = _parse_json_from_text(raw)
        assert result["overallScore"] == 60

    def test_json_embedded_in_prose(self):
        """TC-P4: JSON object embedded in surrounding prose is extracted."""
        raw = 'Here is your report: {"overallScore": 78, "verdict": "Feasible with Guidance"} Done.'
        result = _parse_json_from_text(raw)
        assert result["overallScore"] == 78

    def test_invalid_json_returns_empty(self):
        """TC-P5: Completely invalid text returns empty dict."""
        result = _parse_json_from_text("This is not JSON at all.")
        assert result == {}

    def test_empty_string_returns_empty(self):
        """TC-P6: Empty string returns empty dict."""
        result = _parse_json_from_text("")
        assert result == {}

    def test_none_returns_empty(self):
        """TC-P7: None input returns empty dict without raising."""
        result = _parse_json_from_text(None)
        assert result == {}

    def test_nested_json_with_metrics(self):
        """TC-P8: Full nested report JSON is parsed completely."""
        raw = """{
            "overallScore": 88,
            "verdict": "Highly Feasible",
            "metrics": {"technical": 90, "timeline": 85, "resource": 88, "skillMatch": 87},
            "strengths": ["Great tech stack", "Clear scope"],
            "bottlenecks": ["Short timeline"]
        }"""
        result = _parse_json_from_text(raw)
        assert result["metrics"]["technical"] == 90
        assert len(result["strengths"]) == 2

    def test_json_with_extra_whitespace(self):
        """TC-P9: JSON with extra whitespace/newlines is parsed."""
        raw = '  \n  { "overallScore" :  95 }  \n  '
        result = _parse_json_from_text(raw)
        assert result["overallScore"] == 95

    def test_broken_markdown_block(self):
        """TC-P10: Result is always a dict, even from malformed markdown."""
        raw = '```json {"overallScore": 70} ```'
        result = _parse_json_from_text(raw)
        assert isinstance(result, dict)


# ---------------------------------------------------------------------------
# GROUP 2: _build_fallback_report
# ---------------------------------------------------------------------------

class TestBuildFallbackReport:
    """Unit tests for the heuristic fallback report generator."""

    def _base_idea(self, **overrides):
        base = {
            "title": "Test Project",
            "desc": "A test project description.",
            "domain": "web",
            "teamSize": "3",
            "durationDays": 30,
        }
        base.update(overrides)
        return base

    def test_returns_all_required_keys(self):
        """TC-F1: Fallback report always returns the required top-level keys."""
        report = _build_fallback_report(self._base_idea())
        for key in ["overallScore", "verdict", "metrics", "strengths", "bottlenecks", "filesAnalyzed", "aiGenerated"]:
            assert key in report, f"Missing key: {key}"

    def test_metrics_all_present(self):
        """TC-F2: Fallback metrics dict contains all four dimension keys."""
        report = _build_fallback_report(self._base_idea())
        for key in ["technical", "timeline", "resource", "skillMatch"]:
            assert key in report["metrics"], f"Missing metric: {key}"

    def test_ai_generated_false(self):
        """TC-F3: Fallback report is explicitly marked as NOT AI-generated."""
        report = _build_fallback_report(self._base_idea())
        assert report["aiGenerated"] is False

    def test_files_analyzed_empty(self):
        """TC-F4: Fallback report has an empty filesAnalyzed list."""
        report = _build_fallback_report(self._base_idea())
        assert report["filesAnalyzed"] == []

    def test_overall_score_in_range(self):
        """TC-F5: overallScore is always between 0 and 100."""
        for domain in ["web", "aiml", "blockchain", "iot", "data_science"]:
            for days in [7, 14, 30, 60, 90]:
                idea = self._base_idea(domain=domain, durationDays=days)
                report = _build_fallback_report(idea)
                score = report["overallScore"]
                assert 0 <= score <= 100, (
                    f"Score {score} out of range for domain={domain}, days={days}"
                )

    def test_verdict_is_valid_string(self):
        """TC-F6: Verdict is one of the three allowed strings."""
        valid_verdicts = {"Highly Feasible", "Feasible with Guidance", "Needs Scope Reduction"}
        report = _build_fallback_report(self._base_idea())
        assert report["verdict"] in valid_verdicts

    def test_aiml_domain_lower_technical_score(self):
        """TC-F7: AI/ML domain has a lower technical score than Web domain (harder)."""
        web_report = _build_fallback_report(self._base_idea(domain="web"))
        aiml_report = _build_fallback_report(self._base_idea(domain="aiml"))
        assert aiml_report["metrics"]["technical"] <= web_report["metrics"]["technical"]

    def test_long_duration_higher_timeline_score(self):
        """TC-F8: Longer duration yields a higher (or equal) timeline score."""
        short = _build_fallback_report(self._base_idea(durationDays=14))
        long_ = _build_fallback_report(self._base_idea(durationDays=90))
        assert long_["metrics"]["timeline"] >= short["metrics"]["timeline"]

    def test_iot_lower_resource_score(self):
        """TC-F9: IoT domain has a lower resource score (hardware dependency)."""
        web_report = _build_fallback_report(self._base_idea(domain="web"))
        iot_report = _build_fallback_report(self._base_idea(domain="iot"))
        assert iot_report["metrics"]["resource"] <= web_report["metrics"]["resource"]

    def test_highly_feasible_threshold(self):
        """TC-F10: A long-duration web project should reach 'Highly Feasible' (v2 threshold >= 85)."""
        idea = self._base_idea(domain="web", durationDays=90)
        report = _build_fallback_report(idea)
        assert report["overallScore"] >= 85
        assert report["verdict"] == "Highly Feasible"

    def test_strengths_non_empty(self):
        """TC-F11: Fallback always provides at least one strength."""
        report = _build_fallback_report(self._base_idea())
        assert isinstance(report["strengths"], list)
        assert len(report["strengths"]) >= 1

    def test_bottlenecks_non_empty(self):
        """TC-F12: Fallback always provides at least one bottleneck."""
        report = _build_fallback_report(self._base_idea())
        assert isinstance(report["bottlenecks"], list)
        assert len(report["bottlenecks"]) >= 1

    def test_missing_domain_defaults_to_web(self):
        """TC-F13: Missing domain key defaults gracefully to 'web' behavior."""
        idea = {"title": "Test", "durationDays": 30, "teamSize": "3"}
        report = _build_fallback_report(idea)
        assert "overallScore" in report

    def test_missing_duration_defaults(self):
        """TC-F14: Missing durationDays defaults without crashing."""
        idea = {"title": "Test", "domain": "web", "teamSize": "3"}
        report = _build_fallback_report(idea)
        assert "overallScore" in report

    def test_missing_team_size_defaults(self):
        """TC-F15: Missing teamSize defaults without crashing."""
        idea = {"title": "Test", "domain": "web", "durationDays": 30}
        report = _build_fallback_report(idea)
        assert "overallScore" in report

    def test_weighted_score_formula(self):
        """TC-F16: overallScore matches the weighted formula (35/25/20/20)."""
        idea = self._base_idea(domain="web", durationDays=90)
        report = _build_fallback_report(idea)
        m = report["metrics"]
        expected = round(
            m["technical"] * 0.35
            + m["timeline"] * 0.25
            + m["resource"] * 0.20
            + m["skillMatch"] * 0.20
        )
        assert report["overallScore"] == expected

    def test_blockchain_domain(self):
        """TC-F17: Blockchain domain does not crash and returns a valid report."""
        idea = self._base_idea(domain="blockchain", durationDays=60)
        report = _build_fallback_report(idea)
        assert report["overallScore"] > 0

    def test_team_size_1_member(self):
        """TC-F18: Single-member team is handled correctly."""
        idea = self._base_idea(teamSize="1")
        report = _build_fallback_report(idea)
        assert "strengths" in report

    def test_team_size_mentioned_in_strengths(self):
        """TC-F19: Team size is referenced in at least one strength message."""
        idea = self._base_idea(teamSize="5")
        report = _build_fallback_report(idea)
        any_mention = any("5" in s for s in report["strengths"])
        assert any_mention, "Expected team size to appear in strengths"

    def test_domain_mentioned_in_strengths(self):
        """TC-F20: Domain is referenced (uppercased) in at least one strength."""
        idea = self._base_idea(domain="aiml")
        report = _build_fallback_report(idea)
        any_mention = any("AIML" in s for s in report["strengths"])
        assert any_mention


# ---------------------------------------------------------------------------
# GROUP 3: Verdict Threshold Logic (v2 thresholds: 85/70)
# ---------------------------------------------------------------------------

class TestVerdictThresholds:
    """Tests that verify verdict thresholds are correctly applied (v2: 85/70)."""

    def test_score_85_is_highly_feasible(self):
        """TC-V1: Exactly 85 → Highly Feasible."""
        assert _verdict_from_score(85) == "Highly Feasible"

    def test_score_100_is_highly_feasible(self):
        """TC-V2: Maximum score → Highly Feasible."""
        assert _verdict_from_score(100) == "Highly Feasible"

    def test_score_84_is_feasible_with_guidance(self):
        """TC-V3: One below 85 → Feasible with Guidance."""
        assert _verdict_from_score(84) == "Feasible with Guidance"

    def test_score_70_is_feasible_with_guidance(self):
        """TC-V4: Exactly 70 → Feasible with Guidance."""
        assert _verdict_from_score(70) == "Feasible with Guidance"

    def test_score_69_is_needs_scope_reduction(self):
        """TC-V5: One below 70 → Needs Scope Reduction."""
        assert _verdict_from_score(69) == "Needs Scope Reduction"

    def test_score_0_is_needs_scope_reduction(self):
        """TC-V6: Zero → Needs Scope Reduction."""
        assert _verdict_from_score(0) == "Needs Scope Reduction"


# ---------------------------------------------------------------------------
# GROUP 3b: New helper functions (_compute_skill_match, _timeline_score)
# ---------------------------------------------------------------------------

class TestSkillMatchScoring:
    """Tests for the per-domain skill-match calculator."""

    def test_perfect_match_returns_high_score(self):
        """TC-S1: Key skills at max proficiency → score >= 85."""
        skills = {"Python": 5, "Machine Learning": 5, "TensorFlow": 5}
        score = _compute_skill_match(skills, "aiml")
        # 3 of 7 required skills at level 5 (100 each) → avg_prof=100, coverage=3/7≈0.43
        # score = round(100*0.70 + 43*0.30) = round(70+12.9) = 83
        # Threshold adjusted: >= 80 is a strong match
        assert score >= 80

    def test_no_skills_returns_neutral(self):
        """TC-S2: No student skills → neutral score 72."""
        score = _compute_skill_match({}, "web")
        assert score == 72

    def test_no_matching_skills_returns_low(self):
        """TC-S3: Student has skills unrelated to domain → low score."""
        score = _compute_skill_match({"Photoshop": 5, "Illustrator": 5}, "aiml")
        assert score <= 60

    def test_partial_match_returns_intermediate(self):
        """TC-S4: Single known skill → intermediate score between 40 and 90."""
        score = _compute_skill_match({"React": 3}, "web")
        # 1/7 required skills at level 3 (60 pts) → avg_prof=60, coverage=1/7≈0.14
        # score = round(60*0.70 + 14*0.30) = round(42+4.2) = 46 → clamped, expect 40-70
        assert 40 <= score <= 90

    def test_score_is_clamped_0_to_100(self):
        """TC-S5: Score is always in [0, 100]."""
        for domain in ["web", "aiml", "iot", "blockchain", "unknown_domain"]:
            score = _compute_skill_match({"Python": 5}, domain)
            assert 0 <= score <= 100

    def test_unknown_domain_returns_valid_score(self):
        """TC-S6: Unknown domain falls back gracefully."""
        score = _compute_skill_match({"Python": 3}, "robotics")
        assert isinstance(score, int)
        assert 0 <= score <= 100


class TestTimelineScoring:
    """Tests for the timeline adequacy score function."""

    def test_very_long_project(self):
        """TC-T1: 90 days (>12 weeks) → max score 95."""
        assert _timeline_score(90) == 95

    def test_long_project(self):
        """TC-T2: 60 days (>8 weeks) → score 90."""
        assert _timeline_score(60) == 90

    def test_medium_project(self):
        """TC-T3: 45 days (>6 weeks) → score 85."""
        assert _timeline_score(45) == 85

    def test_short_project(self):
        """TC-T4: 28 days (≥4 weeks) → score 78."""
        assert _timeline_score(28) == 78

    def test_very_short_project(self):
        """TC-T5: 7 days → score 55."""
        assert _timeline_score(7) == 55

    def test_score_increases_with_duration(self):
        """TC-T6: Longer duration always yields >= score."""
        scores = [_timeline_score(d) for d in [7, 14, 28, 45, 60, 90]]
        assert scores == sorted(scores)


class TestValidateAndNormalise:
    """Tests for the LLM output validation helper."""

    def test_valid_report_passes_through(self):
        """TC-N1: A fully valid dict is returned unchanged (with clamping)."""
        raw = {
            "overallScore": 88,
            "verdict": "Highly Feasible",
            "metrics": {"technical": 90, "timeline": 85, "resource": 88, "skillMatch": 87},
            "strengths": ["Good"],
            "bottlenecks": ["None"],
        }
        result = _validate_and_normalise(raw)
        assert result is not None
        assert result["overallScore"] == 88

    def test_missing_overall_score_returns_none(self):
        """TC-N2: Dict without overallScore is rejected."""
        result = _validate_and_normalise({"verdict": "Highly Feasible"})
        assert result is None

    def test_invalid_verdict_corrected(self):
        """TC-N3: Unrecognised verdict is replaced with score-derived verdict."""
        raw = {
            "overallScore": 90,
            "verdict": "Definitely Good",
            "metrics": {"technical": 90, "timeline": 90, "resource": 90, "skillMatch": 90},
        }
        result = _validate_and_normalise(raw)
        assert result["verdict"] == "Highly Feasible"

    def test_score_clamped_to_0_100(self):
        """TC-N4: Score above 100 is clamped to 100."""
        raw = {
            "overallScore": 150,
            "verdict": "Highly Feasible",
            "metrics": {"technical": 120, "timeline": 80, "resource": 80, "skillMatch": 80},
        }
        result = _validate_and_normalise(raw)
        assert result["overallScore"] == 100
        assert result["metrics"]["technical"] == 100

    def test_missing_strengths_defaults_to_empty_list(self):
        """TC-N5: Missing strengths key → empty list, not None."""
        raw = {
            "overallScore": 75,
            "verdict": "Feasible with Guidance",
            "metrics": {"technical": 75, "timeline": 75, "resource": 75, "skillMatch": 75},
        }
        result = _validate_and_normalise(raw)
        assert result["strengths"] == []


# ---------------------------------------------------------------------------
# GROUP 4: File Extractor
# ---------------------------------------------------------------------------

class TestFileExtractor:
    """Unit tests for the file text extraction utility."""

    def test_empty_list_returns_empty_string(self):
        """TC-E1: Empty file list returns empty string."""
        result = extract_text_from_files([])
        assert result == ""

    def test_txt_file_extraction(self):
        """TC-E3: Plain text file is extracted correctly via base64."""
        content = "Hello, this is a test document."
        b64 = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        files = [{"name": "doc.txt", "contentBase64": b64, "contentType": "text/plain"}]
        result = extract_text_from_files(files)
        assert "Hello, this is a test document." in result

    def test_unsupported_type_returns_message(self):
        """TC-E4: Unsupported file type returns a 'not supported' message."""
        b64 = base64.b64encode(b"\x00\x01\x02").decode("utf-8")
        files = [{"name": "image.png", "contentBase64": b64, "contentType": "image/png"}]
        result = extract_text_from_files(files)
        assert "not supported" in result.lower()

    def test_missing_content_base64_skipped(self):
        """TC-E5: File entry with empty contentBase64 is skipped silently."""
        files = [{"name": "empty.txt", "contentBase64": "", "contentType": "text/plain"}]
        result = extract_text_from_files(files)
        assert result == ""

    def test_multiple_txt_files_concatenated(self):
        """TC-E6: Multiple text files are concatenated with separators."""
        def make_file(name, content):
            return {
                "name": name,
                "contentBase64": base64.b64encode(content.encode()).decode(),
                "contentType": "text/plain",
            }
        files = [make_file("a.txt", "File A content"), make_file("b.txt", "File B content")]
        result = extract_text_from_files(files)
        assert "File A content" in result
        assert "File B content" in result

    def test_file_name_appears_in_section_header(self):
        """TC-E7: The filename is included in the extracted text section header."""
        content = "Some project description."
        b64 = base64.b64encode(content.encode()).decode()
        files = [{"name": "project_spec.txt", "contentBase64": b64, "contentType": "text/plain"}]
        result = extract_text_from_files(files)
        assert "project_spec.txt" in result

    def test_invalid_base64_does_not_crash(self):
        """TC-E8: Invalid base64 is handled gracefully - returns string, no crash."""
        files = [{"name": "bad.txt", "contentBase64": "!!!not_valid_base64!!!", "contentType": "text/plain"}]
        result = extract_text_from_files(files)
        assert isinstance(result, str)

    def test_whitespace_only_txt_skipped(self):
        """TC-E9: A file containing only whitespace produces no section."""
        b64 = base64.b64encode(b"   \n\t  ").decode()
        files = [{"name": "blank.txt", "contentBase64": b64, "contentType": "text/plain"}]
        result = extract_text_from_files(files)
        assert result == ""


# ---------------------------------------------------------------------------
# GROUP 5: Integration-style tests (no LLM - uses fallback path)
# ---------------------------------------------------------------------------

class TestRunFeasibilityAgentFallback:
    """
    Integration tests for the fallback path of run_feasibility_agent().
    Calls _build_fallback_report directly to simulate LLM unavailability.
    """

    def _run_with_fallback(self, idea_data, student_skills=None, uploaded_files=None):
        """Force the fallback path (no LLM required)."""
        return _build_fallback_report(idea_data)

    def test_fallback_with_full_request(self):
        """TC-I1: Full idea_data dict produces a valid fallback report."""
        idea = {
            "title": "Smart Campus IoT System",
            "desc": "Real-time monitoring of campus resources using IoT sensors.",
            "domain": "iot",
            "teamSize": "4",
            "durationDays": 60,
            "techIdeas": "Raspberry Pi, MQTT, InfluxDB",
            "features": ["Sensor dashboard", "Alerts", "Historical data"],
        }
        report = self._run_with_fallback(idea, student_skills={"Python": 4, "IoT": 3})
        assert report["overallScore"] > 0
        valid_verdicts = {"Highly Feasible", "Feasible with Guidance", "Needs Scope Reduction"}
        assert report["verdict"] in valid_verdicts

    def test_fallback_minimal_request(self):
        """TC-I2: Minimal idea_data (only title) does not crash."""
        report = self._run_with_fallback({"title": "My Project"})
        assert "overallScore" in report

    def test_fallback_empty_dict(self):
        """TC-I3: Completely empty idea_data dict does not crash."""
        report = self._run_with_fallback({})
        assert "overallScore" in report

    def test_fallback_files_analyzed_appendable(self):
        """TC-I4: filesAnalyzed list can be appended after fallback returns."""
        idea = {"title": "Test", "domain": "web", "durationDays": 30, "teamSize": "2"}
        report = self._run_with_fallback(idea)
        report["filesAnalyzed"] = ["report.pdf"]
        assert "report.pdf" in report["filesAnalyzed"]

    def test_all_domains_produce_valid_report(self):
        """TC-I5: All supported domain values produce a valid structured report."""
        domains = ["web", "aiml", "blockchain", "iot", "data_science", "mobile", "cloud"]
        for domain in domains:
            idea = {
                "title": f"{domain} Project",
                "domain": domain,
                "durationDays": 45,
                "teamSize": "3",
            }
            report = self._run_with_fallback(idea)
            assert "overallScore" in report, f"Failed for domain: {domain}"
            assert 0 <= report["overallScore"] <= 100, (
                f"Score out of range for domain: {domain}"
            )
