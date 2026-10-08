"""
MongoDB document schema helpers for the AI Mentor Platform.

The application uses PyMongo directly (no ORM). This module provides:
  - Field-name constants so routers never hard-code string keys.
  - Factory functions that build well-structured MongoDB documents.
  - Utility functions for converting ObjectIds to strings.
"""

import datetime
from typing import Optional
from bson import ObjectId


# ---------------------------------------------------------------------------
# Collection names (single source of truth)
# ---------------------------------------------------------------------------

STUDENTS_COLLECTION = "students"
PROJECT_IDEAS_COLLECTION = "project_ideas"
FEASIBILITY_REPORTS_COLLECTION = "feasibility_reports"
SCOPE_REPORTS_COLLECTION = "scope_reports"


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def oid_str(doc: dict) -> str:
    """Return the _id of a MongoDB document as a plain string."""
    return str(doc["_id"])


def now_utc() -> datetime.datetime:
    """Return the current UTC datetime (timezone-naive, consistent with PyMongo)."""
    return datetime.datetime.utcnow()


# ---------------------------------------------------------------------------
# Document factories
# ---------------------------------------------------------------------------

def make_student_doc(data) -> dict:
    """
    Build a student document from an OnboardingRequest schema object
    with embedded profile and projects array.
    """
    return {
        "first_name": data.firstName,
        "last_name": data.lastName or "",
        "name": f"{data.firstName} {data.lastName or ''}".strip(),
        "email": data.email.strip().lower(),
        "roll_no": data.rollNo or "",
        "branch": data.branch or "",
        "year": data.year or "",
        "role": "student",
        "skills": data.skills or {},
        "other_skills": data.otherSkills or "",
        "domains": data.domains or [],
        "other_domains": data.otherDomains or "",
        "about_me": data.aboutMe or "",
        "team_size": data.teamSize or "3",
        "projects": [],
        "updated_at": now_utc(),
    }


def make_project_idea_doc(data) -> dict:
    """
    Build a project_idea document from an IdeaRequest schema object.
    Uses model_dump() for Pydantic v2 compatibility (falls back to dict()).
    """
    try:
        uploaded_files = [f.model_dump() for f in data.uploadedFiles]
    except AttributeError:
        uploaded_files = [f.dict() for f in data.uploadedFiles]

    student_email = getattr(data, 'student_email', '') or getattr(data, 'user_email', '') or ''
    return {
        "student_id": str(data.student_id),
        "student_email": str(student_email).strip().lower(),
        "title": data.title,
        "desc": data.desc,
        "domain": data.domain or "web",
        "team_size": data.teamSize or "3",
        "duration_days": data.durationDays or 30,
        "duration_unit": data.durationUnit or "days",
        "tech_ideas": data.techIdeas or "",
        "refLink": data.refLink or "",
        "features": data.features or [],
        "uploaded_files": uploaded_files,
        "status": "pending_review",
        "created_at": now_utc(),
    }


def make_feasibility_report_doc(idea_id: str, student_id: str, report: dict) -> dict:
    """
    Build a feasibility_report document ready for MongoDB insertion.

    Args:
        idea_id:    The _id string of the project_idea that was analysed.
        student_id: The _id string of the student who owns the idea.
        report:     The structured report dict returned by run_feasibility_agent().
    """
    return {
        "idea_id": idea_id,
        "student_id": student_id,
        "overall_score": report.get("overallScore"),
        "verdict": report.get("verdict"),
        "metrics": report.get("metrics", {}),
        "strengths": report.get("strengths", []),
        "bottlenecks": report.get("bottlenecks", []),
        "files_analyzed": report.get("filesAnalyzed", []),
        "ai_generated": report.get("aiGenerated", False),
        "created_at": now_utc(),
    }


def make_scope_report_doc(idea_id: str, student_id: str, report: dict, meta: dict = None) -> dict:
    """
    Build a scope_report document ready for MongoDB insertion.

    Args:
        idea_id:    The _id string of the project_idea that was analysed.
        student_id: The _id string of the student who owns the idea.
        report:     The structured report dict returned by run_scope_agent().
        meta:       Optional extra context (title, desc, domain, etc.) from the request.
    """
    meta = meta or {}
    return {
        "idea_id": idea_id,
        "student_id": student_id,
        # Scope content fields
        "problem_statement": report.get("problemStatement", ""),
        "objectives": report.get("objectives", []),
        "in_scope": report.get("inScope", []),
        "out_of_scope": report.get("outOfScope", []),
        "target_users": report.get("targetUsers", ""),
        "key_deliverables": report.get("keyDeliverables", []),
        "assumptions": report.get("assumptions", []),
        "constraints": report.get("constraints", []),
        "ai_generated": report.get("aiGenerated", False),
        # Request metadata for traceability
        "project_title": meta.get("title", ""),
        "project_desc": meta.get("desc", ""),
        "domain": meta.get("domain", ""),
        "team_size": meta.get("teamSize", ""),
        "duration_days": meta.get("durationDays", 0),
        "tech_ideas": meta.get("techIdeas", ""),
        "updated_at": now_utc(),
    }


def make_tech_stack_report_doc(idea_id: str, student_id: str, report: dict, meta: dict = None) -> dict:
    """Build a tech_stack_report document for MongoDB."""
    meta = meta or {}
    return {
        "idea_id": idea_id,
        "student_id": student_id,
        "recommended_stack": report.get("recommendedStack", {}),
        "reasoning": report.get("reasoning", []),
        "alternatives": report.get("alternatives", []),
        "justification": report.get("justification", ""),
        "learning_resources": report.get("learningResources", []),
        "ai_generated": report.get("aiGenerated", False),
        "updated_at": now_utc(),
    }


def make_risk_report_doc(idea_id: str, student_id: str, report: dict, meta: dict = None) -> dict:
    """Build a risk_report document for MongoDB."""
    meta = meta or {}
    return {
        "idea_id": idea_id,
        "student_id": student_id,
        "overall_risk": report.get("overallRisk", "Low"),
        "risk_score": report.get("riskScore", 0),
        "summary": report.get("summary", ""),
        "risks": report.get("risks", []),
        "top_blockers": report.get("topBlockers", []),
        "reasoning": report.get("reasoning", []),
        "ai_generated": report.get("aiGenerated", False),
        "updated_at": now_utc(),
    }


def make_tracking_report_doc(idea_id: str, student_id: str, report: dict, meta: dict = None) -> dict:
    """Build a tracking_report document for MongoDB."""
    meta = meta or {}
    return {
        "idea_id": idea_id,
        "student_id": student_id,
        "milestones": report.get("milestones", []),
        "overall_progress": report.get("overallProgress", 0),
        "milestones_done": report.get("milestonesDone", 0),
        "total_milestones": report.get("totalMilestones", len(report.get("milestones", []))),
        "immediate_action_items": report.get("immediateActionItems", []),
        "faculty_checkpoints": report.get("facultyCheckpoints", []),
        "tracking_metrics": report.get("trackingMetrics", {}),
        "sprint_methodology": report.get("sprintMethodology", ""),
        "ai_generated": report.get("aiGenerated", False),
        "updated_at": now_utc(),
    }


# ---------------------------------------------------------------------------
# Report Deserializers / Normalization Formatters
# Converts MongoDB normalized documents to standard frontend API response shape
# ---------------------------------------------------------------------------

def format_feasibility_report(doc: dict) -> Optional[dict]:
    """Convert a feasibility_reports MongoDB doc into the API schema shape."""
    if not doc:
        return None
    return {
        "overallScore": doc.get("overall_score") if doc.get("overall_score") is not None else doc.get("overallScore", 0),
        "verdict": doc.get("verdict", "Feasible"),
        "metrics": doc.get("metrics", {}),
        "strengths": doc.get("strengths", []),
        "bottlenecks": doc.get("bottlenecks", []),
        "filesAnalyzed": doc.get("files_analyzed") or doc.get("filesAnalyzed", []),
        "aiGenerated": doc.get("ai_generated") or doc.get("aiGenerated", False),
    }


def format_scope_report(doc: dict) -> Optional[dict]:
    """Convert a scope_reports MongoDB doc into the API schema shape."""
    if not doc:
        return None
    return {
        "problemStatement": doc.get("problem_statement") or doc.get("problemStatement", ""),
        "objectives": doc.get("objectives", []),
        "inScope": doc.get("in_scope") or doc.get("inScope", []),
        "outOfScope": doc.get("out_of_scope") or doc.get("outOfScope", []),
        "targetUsers": doc.get("target_users") or doc.get("targetUsers", ""),
        "keyDeliverables": doc.get("key_deliverables") or doc.get("keyDeliverables", []),
        "assumptions": doc.get("assumptions", []),
        "constraints": doc.get("constraints", []),
        "aiGenerated": doc.get("ai_generated") or doc.get("aiGenerated", False),
    }


def format_tech_stack_report(doc: dict) -> Optional[dict]:
    """Convert a tech_stack_reports MongoDB doc into the API schema shape."""
    if not doc:
        return None
    return {
        "recommendedStack": doc.get("recommended_stack") or doc.get("recommendedStack", {}),
        "reasoning": doc.get("reasoning", []),
        "alternatives": doc.get("alternatives", []),
        "justification": doc.get("justification", ""),
        "learningResources": doc.get("learning_resources") or doc.get("learningResources", []),
        "aiGenerated": doc.get("ai_generated") or doc.get("aiGenerated", False),
    }


def format_risk_report(doc: dict) -> Optional[dict]:
    """Convert a risk_reports MongoDB doc into the API schema shape."""
    if not doc:
        return None
    return {
        "overallRisk": doc.get("overall_risk") or doc.get("overallRisk", "Low"),
        "riskScore": doc.get("risk_score") if doc.get("risk_score") is not None else doc.get("riskScore", 0),
        "summary": doc.get("summary", ""),
        "risks": doc.get("risks", []),
        "topBlockers": doc.get("top_blockers") or doc.get("topBlockers", []),
        "reasoning": doc.get("reasoning", []),
        "aiGenerated": doc.get("ai_generated") or doc.get("aiGenerated", False),
    }


def format_tracking_report(doc: dict) -> Optional[dict]:
    """Convert a tracking_reports MongoDB doc into the API schema shape."""
    if not doc:
        return None
    return {
        "milestones": doc.get("milestones", []),
        "overallProgress": doc.get("overall_progress") if doc.get("overall_progress") is not None else doc.get("overallProgress", 0),
        "milestonesDone": doc.get("milestones_done") if doc.get("milestones_done") is not None else doc.get("milestonesDone", 0),
        "totalMilestones": doc.get("total_milestones") if doc.get("total_milestones") is not None else doc.get("totalMilestones", 0),
        "immediateActionItems": doc.get("immediate_action_items") or doc.get("immediateActionItems", []),
        "facultyCheckpoints": doc.get("faculty_checkpoints") or doc.get("facultyCheckpoints", []),
        "trackingMetrics": doc.get("tracking_metrics") or doc.get("trackingMetrics", {}),
        "sprintMethodology": doc.get("sprint_methodology") or doc.get("sprintMethodology", ""),
        "aiGenerated": doc.get("ai_generated") or doc.get("aiGenerated", False),
    }
