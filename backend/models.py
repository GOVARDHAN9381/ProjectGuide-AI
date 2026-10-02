"""
MongoDB document schema helpers for the AI Mentor Platform.

The application uses PyMongo directly (no ORM). This module provides:
  - Field-name constants so routers never hard-code string keys.
  - Factory functions that build well-structured MongoDB documents.
  - Utility functions for converting ObjectIds to strings.
"""

import datetime
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
    Build a student document from an OnboardingRequest schema object.

    The 'created_at' field is intentionally omitted here; callers should
    add it only on *insert* (not on upsert/update).
    """
    return {
        "first_name": data.firstName,
        "last_name": data.lastName or "",
        "email": data.email,
        "roll_no": data.rollNo or "",
        "branch": data.branch or "",
        "year": data.year or "",
        "skills": data.skills or {},
        "other_skills": data.otherSkills or "",
        "domains": data.domains or [],
        "other_domains": data.otherDomains or "",
        "about_me": data.aboutMe or "",
        "team_size": data.teamSize or "3",
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