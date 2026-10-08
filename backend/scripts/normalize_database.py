"""
MongoDB Database Normalization Migration Script.

This script normalizes the MongoDB database structure:
1. Moves all nested reports (feasibilityReport, scopeReport, techStackReport, riskReport, trackingReport)
   out of 'project_ideas' and into their dedicated collections:
     - feasibility_reports
     - scope_reports
     - tech_stack_reports
     - risk_reports
     - tracking_reports
2. Moves nested 'milestones' arrays into the 'project_milestones' collection.
3. Cleans 'project_ideas' so each document contains only clean top-level metadata
   (id, student_id, student_email, title, desc, domain, team_size, duration_days,
    status, feasibility_score, overall_risk, milestones_done, progress, created_at, updated_at).
4. Cleans 'backend/data/ideas.json' similarly.
"""

import sys
from pathlib import Path
import json

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from database import (
    get_database,
    project_ideas_col,
    feasibility_reports_col,
    scope_reports_col,
    tech_stack_reports_col,
    risk_reports_col,
    tracking_reports_col,
    project_milestones_col,
)
from models import (
    make_feasibility_report_doc,
    make_scope_report_doc,
    make_tech_stack_report_doc,
    make_risk_report_doc,
    make_tracking_report_doc,
    now_utc,
)


def normalize_mongodb():
    print("\n--- Starting MongoDB Schema Normalization ---")
    try:
        db = get_database()
        db.command("ping")
        print("[DB] Connected to MongoDB Atlas successfully.")
    except Exception as e:
        print(f"[DB] Notice: Could not connect to MongoDB Atlas ({e}). Skipping remote MongoDB.")
        return

    ideas = list(project_ideas_col.find({}))
    print(f"[DB] Found {len(ideas)} project idea(s) in MongoDB project_ideas collection.")

    for idea in ideas:
        doc_id = idea["_id"]
        idea_id = str(idea.get("id") or idea.get("idea_id") or doc_id)
        student_id = str(idea.get("student_id") or "")
        title = idea.get("title", "")

        unset_fields = {}
        set_fields = {"updated_at": now_utc()}

        # 1. Feasibility Report
        feas_report = idea.get("feasibilityReport") or idea.get("feasibility_report")
        if feas_report and isinstance(feas_report, dict):
            print(f"  -> Migrating feasibility report for idea: '{title}' ({idea_id})")
            f_doc = make_feasibility_report_doc(idea_id=idea_id, student_id=student_id, report=feas_report)
            feasibility_reports_col.update_one({"idea_id": idea_id}, {"$set": f_doc}, upsert=True)
            unset_fields["feasibilityReport"] = ""
            unset_fields["feasibility_report"] = ""
            set_fields["feasibility_score"] = feas_report.get("overallScore", idea.get("feasibility_score", 85))

        # 2. Scope Report
        scope_report = idea.get("scopeReport") or idea.get("scope_report")
        if scope_report and isinstance(scope_report, dict):
            print(f"  -> Migrating scope report for idea: '{title}' ({idea_id})")
            s_doc = make_scope_report_doc(idea_id=idea_id, student_id=student_id, report=scope_report, meta=idea)
            scope_reports_col.update_one({"idea_id": idea_id}, {"$set": s_doc}, upsert=True)
            unset_fields["scopeReport"] = ""
            unset_fields["scope_report"] = ""

        # 3. Tech Stack Report
        tech_report = idea.get("techStackReport") or idea.get("tech_stack_report")
        if tech_report and isinstance(tech_report, dict):
            print(f"  -> Migrating tech stack report for idea: '{title}' ({idea_id})")
            t_doc = make_tech_stack_report_doc(idea_id=idea_id, student_id=student_id, report=tech_report, meta=idea)
            tech_stack_reports_col.update_one({"idea_id": idea_id}, {"$set": t_doc}, upsert=True)
            unset_fields["techStackReport"] = ""
            unset_fields["tech_stack_report"] = ""
            rec = tech_report.get("recommendedStack", {})
            if isinstance(rec, dict):
                set_fields["tech_stack"] = [v for v in rec.values() if isinstance(v, str)]

        # 4. Risk Report
        risk_report = idea.get("riskReport") or idea.get("risk_report")
        if risk_report and isinstance(risk_report, dict):
            print(f"  -> Migrating risk report for idea: '{title}' ({idea_id})")
            r_doc = make_risk_report_doc(idea_id=idea_id, student_id=student_id, report=risk_report, meta=idea)
            risk_reports_col.update_one({"idea_id": idea_id}, {"$set": r_doc}, upsert=True)
            unset_fields["riskReport"] = ""
            unset_fields["risk_report"] = ""
            set_fields["overall_risk"] = risk_report.get("overallRisk", "Low")
            set_fields["risk_score"] = risk_report.get("riskScore", 0)

        # 5. Tracking Report
        track_report = idea.get("trackingReport") or idea.get("tracking_report")
        if track_report and isinstance(track_report, dict):
            print(f"  -> Migrating tracking report for idea: '{title}' ({idea_id})")
            tr_doc = make_tracking_report_doc(idea_id=idea_id, student_id=student_id, report=track_report, meta=idea)
            tracking_reports_col.update_one({"idea_id": idea_id}, {"$set": tr_doc}, upsert=True)
            unset_fields["trackingReport"] = ""
            unset_fields["tracking_report"] = ""
            set_fields["milestones_done"] = track_report.get("milestonesDone", 0)
            set_fields["progress"] = track_report.get("overallProgress", 0)

        # 6. Milestones
        milestones = idea.get("milestones")
        if milestones and isinstance(milestones, list):
            print(f"  -> Migrating {len(milestones)} milestone(s) for idea: '{title}' ({idea_id})")
            for m in milestones:
                project_milestones_col.update_one(
                    {"project_id": idea_id, "id": m.get("id")},
                    {"$set": {
                        "project_id": idea_id,
                        "id": m.get("id"),
                        "phase_index": m.get("phase_index") or m.get("id", 1),
                        "week_label": m.get("week_label") or m.get("weekLabel", ""),
                        "title": m.get("title", ""),
                        "desc": m.get("desc") or m.get("description", ""),
                        "deliverables": m.get("deliverables", []),
                        "is_completed": bool(m.get("is_completed") or m.get("completed", False))
                    }},
                    upsert=True
                )
            unset_fields["milestones"] = ""

        # Apply cleanup update to project_ideas
        update_op = {"$set": set_fields}
        if unset_fields:
            update_op["$unset"] = unset_fields

        project_ideas_col.update_one({"_id": doc_id}, update_op)
        print(f"  [OK] Idea '{title}' ({idea_id}) normalized.")

    print("--- MongoDB Schema Normalization Completed ---")


def normalize_local_ideas_json():
    print("\n--- Normalizing local data/ideas.json ---")
    ideas_file = backend_dir / "data" / "ideas.json"
    if not ideas_file.exists():
        print("No local ideas.json found.")
        return

    try:
        data = json.loads(ideas_file.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Error reading ideas.json: {e}")
        return

    cleaned_count = 0
    for key, doc in data.items():
        removed = []
        for f in ["feasibilityReport", "scopeReport", "techStackReport", "riskReport", "trackingReport", "milestones"]:
            if f in doc:
                doc.pop(f, None)
                removed.append(f)
        if removed:
            cleaned_count += 1
            print(f"  -> Cleaned nested fields {removed} from local idea '{key}'")

    ideas_file.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    print(f"--- Local ideas.json Normalized ({cleaned_count} ideas cleaned) ---")


if __name__ == "__main__":
    normalize_mongodb()
    normalize_local_ideas_json()
