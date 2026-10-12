"""
CrewAI Risk Assessment & Mitigation Agent (Milestone 3 — Agent 4)

Identifies project blockers, risks, and suggests concrete resolutions
based on project context, feasibility report, scope, and tech stack.
"""

import json
import os
import re

from crewai import Agent, Crew, Task
from dotenv import load_dotenv

import agents.litellm_patch  # Groq compatibility patch

load_dotenv()

_DOMAIN_RISKS = {
    "web": {
        "category": "Technical",
        "title": "Web application integration delays",
        "likelihood": "Medium",
        "impact": "Medium",
        "mitigation": "Define and test API contracts before integrating frontend and backend.",
    },
    "aiml": {
        "category": "Technical",
        "title": "Model quality depends on representative data",
        "likelihood": "High",
        "impact": "High",
        "mitigation": "Validate a small representative dataset and baseline model early.",
    },
    "mobile": {
        "category": "Technical",
        "title": "Device and operating-system compatibility",
        "likelihood": "Medium",
        "impact": "Medium",
        "mitigation": "Choose a supported device matrix and test core screens on each platform.",
    },
    "iot": {
        "category": "Resource",
        "title": "Hardware availability may delay integration",
        "likelihood": "Medium",
        "impact": "High",
        "mitigation": "Prototype sensor interfaces with simulators while hardware is unavailable.",
    },
    "blockchain": {
        "category": "External",
        "title": "Network or test-chain availability",
        "likelihood": "Medium",
        "impact": "Medium",
        "mitigation": "Keep a local development chain available and test contract behavior offline.",
    },
    "data": {
        "category": "Technical",
        "title": "Incomplete or inconsistent source data",
        "likelihood": "Medium",
        "impact": "High",
        "mitigation": "Profile sample data early and document validation and missing-value rules.",
    },
    "cybersecurity": {
        "category": "Technical",
        "title": "Security gaps in threat coverage",
        "likelihood": "Medium",
        "impact": "High",
        "mitigation": "Create a scoped threat model and add security tests for each critical flow.",
    },
    "cloud": {
        "category": "External",
        "title": "Cloud quota or configuration constraints",
        "likelihood": "Low",
        "impact": "High",
        "mitigation": "Verify quotas and deployment configuration before the final integration sprint.",
    },
    "other": {
        "category": "Scope",
        "title": "Unclear acceptance criteria",
        "likelihood": "Medium",
        "impact": "Medium",
        "mitigation": "Agree on measurable acceptance criteria with stakeholders before implementation.",
    },
}


def _compute_risk_score(risks: list) -> int:
    """Return the mean normalized likelihood-impact score on a 0–100 scale."""
    level = {"low": 1, "medium": 2, "high": 3}
    scores = []
    for risk in risks:
        likelihood = level.get(str(risk.get("likelihood", risk.get("probability", "Medium"))).lower(), 2)
        impact = level.get(str(risk.get("impact", "Medium")).lower(), 2)
        scores.append(round(likelihood * impact * 100 / 9))
    return round(sum(scores) / len(scores)) if scores else 0


def _overall_risk_label(score: int) -> str:
    if score >= 65:
        return "High"
    if score >= 35:
        return "Medium"
    return "Low"


def _normalise_risk_report(
    report: dict,
    idea_data: dict,
    feasibility_report: dict = None,
    scope_report: dict = None,
    tech_stack_report: dict = None,
    ai_generated: bool = False,
) -> dict:
    risks = []
    for index, source in enumerate(report.get("risks") or []):
        risk = dict(source)
        likelihood = risk.get("likelihood") or risk.get("probability") or "Medium"
        impact = risk.get("impact") or "Medium"
        risk.setdefault("id", f"R{index + 1:03d}")
        risk.setdefault("category", "Technical")
        risk.setdefault("owner", "Project team")
        risk.setdefault("mitigation", "Review the risk with the project team and assign an owner.")
        risk.setdefault("description", risk.get("title", "Project risk"))
        risk["likelihood"] = likelihood
        risk["probability"] = likelihood
        risk["impact"] = impact
        risks.append(risk)

    score = max(0, min(100, int(
        report.get("riskScore", report.get("overall_risk_score", _compute_risk_score(risks)))
    )))
    level = report.get("overallRisk", report.get("risk_level", _overall_risk_label(score)))
    if level not in {"High", "Medium", "Low"}:
        level = _overall_risk_label(score)

    top_blockers = report.get("topBlockers") or [
        {"title": risk["title"], "action": risk["mitigation"]}
        for risk in sorted(risks, key=lambda item: int(item.get("severity_score", 0)), reverse=True)[:3]
    ]
    actions = report.get("immediate_actions") or [
        blocker["action"] for blocker in top_blockers[:3]
    ]
    reasoning = report.get("reasoning") or [
        f"Project domain is {idea_data.get('domain', 'web')}.",
    ]
    if feasibility_report:
        reasoning.append(
            f"Feasibility report score is {feasibility_report.get('overallScore', 'not available')}."
        )
    if scope_report:
        reasoning.append(
            f"Scope includes {len(scope_report.get('inScope') or [])} in-scope deliverables."
        )
    if tech_stack_report:
        reasoning.append("The recommended technology stack was considered.")

    title = idea_data.get("title", "This project")
    summary = report.get("summary") or (
        f"{title} has a {level.lower()} risk profile with a composite score of {score}/100."
    )
    top_blocker = report.get("top_blocker") or (
        top_blockers[0]["title"] if top_blockers else "No blocking risk identified"
    )

    return {
        **report,
        "overallRisk": level,
        "riskScore": score,
        "summary": summary,
        "risks": risks,
        "topBlockers": top_blockers,
        "reasoning": reasoning,
        "aiGenerated": bool(report.get("aiGenerated", ai_generated)),
        "overall_risk_score": score,
        "risk_level": level,
        "top_blocker": top_blocker,
        "immediate_actions": actions,
        "ai_generated": bool(report.get("ai_generated", ai_generated)),
    }


def _build_fallback_report(
    idea_data: dict,
    feasibility_report: dict = None,
    scope_report: dict = None,
    tech_stack_report: dict = None,
) -> dict:
    """Build the frontend report shape while retaining legacy API field names."""
    report = _build_fallback_risk(idea_data)
    domain = str(idea_data.get("domain", "web")).lower()
    domain_risk = _DOMAIN_RISKS.get(domain, _DOMAIN_RISKS["other"])
    report["risks"].append({
        "id": f"R{len(report['risks']) + 1:03d}",
        "category": domain_risk["category"],
        "title": domain_risk["title"],
        "description": f"This risk is specific to the {domain} project domain.",
        "impact": domain_risk["impact"],
        "probability": domain_risk["likelihood"],
        "likelihood": domain_risk["likelihood"],
        "severity_score": round(
            {"Low": 1, "Medium": 2, "High": 3}[domain_risk["impact"]]
            * {"Low": 1, "Medium": 2, "High": 3}[domain_risk["likelihood"]]
            * 100 / 9
        ),
        "mitigation": domain_risk["mitigation"],
        "owner": "Project team",
        "status": "open",
    })
    return _normalise_risk_report(
        report,
        idea_data,
        feasibility_report,
        scope_report,
        tech_stack_report,
    )


def _get_llm():
    api_key = os.getenv("GROQ_API_KEY_RISK") or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found in environment variables")
    from crewai import LLM
    model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
    return LLM(model=model_name, api_key=api_key, temperature=0.35)


def _parse_json_from_text(text: str) -> dict:
    if not text:
        return {}
    text = str(text).strip()
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass
    patterns = [
        r"```json\s*\n?(.*?)\n?\s*```",
        r"```\s*\n?(.*?)\n?\s*```",
        r"\{[\s\S]*\}",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                candidate = match.group(1) if match.lastindex else match.group(0)
                return json.loads(candidate)
            except Exception:
                pass
    return {}


def _build_fallback_risk(idea_data: dict, check_in_data: dict = None) -> dict:
    title = idea_data.get("title", "this project")
    duration_days = idea_data.get("durationDays", 30)
    team_size = idea_data.get("teamSize", "3")

    risks = [
        {
            "id": "R001",
            "category": "Timeline",
            "title": "Delivery deadline pressure",
            "description": f"With {duration_days} days and a team of {team_size}, timeline slippage is a common risk.",
            "impact": "High",
            "probability": "Medium",
            "severity_score": 72,
            "mitigation": "Break into weekly sprints with buffer days. Use a Kanban board to track daily progress.",
            "status": "open",
        },
        {
            "id": "R002",
            "category": "Technical",
            "title": "Integration complexity",
            "description": "Integrating multiple modules or third-party APIs can cause unexpected delays.",
            "impact": "Medium",
            "probability": "Medium",
            "severity_score": 60,
            "mitigation": "Define clear API contracts early. Mock dependencies during development.",
            "status": "open",
        },
        {
            "id": "R003",
            "category": "Resource",
            "title": "Team skill gaps",
            "description": "Team members may lack expertise in specific technologies required for implementation.",
            "impact": "Medium",
            "probability": "Low",
            "severity_score": 45,
            "mitigation": "Allocate 2-3 hours per week for skill-building. Pair experienced members with beginners.",
            "status": "open",
        },
        {
            "id": "R004",
            "category": "Scope",
            "title": "Scope creep risk",
            "description": "New feature requests may expand scope beyond what is deliverable.",
            "impact": "High",
            "probability": "Medium",
            "severity_score": 68,
            "mitigation": "Enforce strict change control. Document and defer any scope changes post-MVP.",
            "status": "open",
        },
    ]

    return {
        "overall_risk_score": 58,
        "risk_level": "Medium",
        "risks": risks,
        "top_blocker": risks[0]["title"],
        "immediate_actions": [
            "Set up weekly sprint reviews with the team",
            "Create a risk register and assign owners for each risk",
            "Define a minimum viable product (MVP) and protect it from scope expansion",
        ],
        "ai_generated": False,
    }


def run_risk_agent(
    idea_data: dict,
    student_skills: dict = None,
    feasibility_report: dict = None,
    scope_report: dict = None,
    tech_stack_report: dict = None,
    check_in_data: dict = None,
) -> dict:
    """
    Agent 4: Risk Assessment & Mitigation.
    Accepts all upstream agent outputs (chaining) and optional latest check-in data.
    """
    student_skills = student_skills or {}
    feasibility_report = feasibility_report or {}
    scope_report = scope_report or {}
    tech_stack_report = tech_stack_report or {}
    check_in_data = check_in_data or {}

    try:
        llm = _get_llm()
    except Exception as e:
        print(f"[RISK AGENT] LLM init failed: {e}")
        report = _build_fallback_report(
            idea_data,
            feasibility_report,
            scope_report,
            tech_stack_report,
        )
        report["immediate_actions"] = _build_fallback_risk(idea_data, check_in_data)["immediate_actions"]
        return report

    risk_agent = Agent(
        role="Senior Academic Project Risk Assessment Specialist",
        goal=(
            "Identify all concrete risks, blockers, and failure modes for the student project. "
            "For each risk provide a specific, actionable mitigation strategy that the student team can execute."
        ),
        backstory=(
            "You are a veteran project manager who has mentored hundreds of engineering capstone projects. "
            "You excel at spotting risks before they become blockers and turning vague worries into "
            "clear, executable mitigation plans with ownership and timelines."
        ),
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    title = idea_data.get("title", "Untitled Project")
    desc = idea_data.get("desc", "")
    domain = idea_data.get("domain", "web")
    team_size = idea_data.get("teamSize", "3")
    duration_days = idea_data.get("durationDays", 30)

    skills_text = (
        ", ".join(f"{k}: {v}/5" for k, v in student_skills.items())
        if student_skills else "Not provided"
    )

    feas_section = ""
    if feasibility_report:
        feas_section = (
            f"\nFEASIBILITY REPORT SUMMARY:\n"
            f"  Score: {feasibility_report.get('overallScore', 'N/A')}%, "
            f"Verdict: {feasibility_report.get('verdict', 'N/A')}\n"
            f"  Bottlenecks: {'; '.join(feasibility_report.get('bottlenecks', []) or [])}\n"
        )

    scope_section = ""
    if scope_report:
        scope_section = (
            f"\nSCOPE REPORT SUMMARY:\n"
            f"  In-Scope: {'; '.join((scope_report.get('inScope') or [])[:3])}\n"
            f"  Out-of-Scope: {'; '.join((scope_report.get('outOfScope') or [])[:2])}\n"
            f"  Assumptions: {'; '.join((scope_report.get('assumptions') or [])[:2])}\n"
        )

    tech_section = ""
    if tech_stack_report:
        tech_section = (
            f"\nTECH STACK SUMMARY:\n"
            f"  Recommended: {'; '.join((tech_stack_report.get('recommended_stack') or {}).keys())}\n"
        )

    checkin_section = ""
    if check_in_data:
        checkin_section = (
            f"\nLATEST STUDENT CHECK-IN:\n"
            f"  Progress: {check_in_data.get('progress_pct', 'N/A')}%\n"
            f"  Blockers Reported: {check_in_data.get('blockers', 'None')}\n"
            f"  Mood: {check_in_data.get('mood', 'N/A')}\n"
        )

    task_description = f"""
Perform a comprehensive risk assessment for this student academic project.

PROJECT DETAILS:
- Title: {title}
- Description: {desc}
- Domain: {domain}
- Team Size: {team_size} members
- Duration: {duration_days} days
- Student Skills: {skills_text}
{feas_section}{scope_section}{tech_section}{checkin_section}

INSTRUCTIONS:
1. Identify 4-6 specific, concrete risks for THIS project (not generic).
2. For each risk assign: category (Timeline/Technical/Resource/Scope/External), impact (High/Medium/Low), probability (High/Medium/Low).
3. Compute a severity_score 0-100 based on impact × probability.
4. Write a specific mitigation strategy the student team can execute in 1-2 weeks.
5. Determine overall_risk_score (0-100) and risk_level (Low/Medium/High/Critical).
6. Provide 3 immediate_actions the team should take in the next 48 hours.

Respond ONLY with a valid JSON object:
{{
  "overall_risk_score": <integer 0-100>,
  "risk_level": "Medium",
  "top_blocker": "The single most critical risk title",
  "risks": [
    {{
      "id": "R001",
      "category": "Timeline",
      "title": "Specific risk title for {title}",
      "description": "1-2 sentences specific to this project",
      "impact": "High",
      "probability": "Medium",
      "severity_score": <integer 0-100>,
      "mitigation": "Specific actionable step the team can take now",
      "status": "open"
    }}
  ],
  "immediate_actions": [
    "Specific action 1 for the team to do today",
    "Specific action 2",
    "Specific action 3"
  ]
}}
"""

    risk_task = Task(
        description=task_description,
        expected_output="A valid JSON object with overall_risk_score, risk_level, top_blocker, risks array, and immediate_actions array.",
        agent=risk_agent,
    )

    crew = Crew(agents=[risk_agent], tasks=[risk_task], verbose=False)

    try:
        result = crew.kickoff()
        parsed = _parse_json_from_text(str(result))
        if not parsed or "risks" not in parsed:
            raise ValueError("Invalid response structure")

        # Sanitize
        risks = parsed.get("risks", [])
        for i, r in enumerate(risks):
            r.setdefault("id", f"R{str(i+1).zfill(3)}")
            r.setdefault("status", "open")
            try:
                r["severity_score"] = max(0, min(100, int(r.get("severity_score", 50))))
            except Exception:
                r["severity_score"] = 50

        return _normalise_risk_report({
            "overall_risk_score": max(0, min(100, int(parsed.get("overall_risk_score", 60)))),
            "risk_level": parsed.get("risk_level", "Medium"),
            "top_blocker": parsed.get("top_blocker", risks[0]["title"] if risks else "Unknown"),
            "risks": risks,
            "immediate_actions": parsed.get("immediate_actions", []),
            "ai_generated": True,
        }, idea_data, feasibility_report, scope_report, tech_stack_report, ai_generated=True)
    except Exception as e:
        print(f"[RISK AGENT] Execution failed, using fallback: {e}")
        report = _build_fallback_report(
            idea_data,
            feasibility_report,
            scope_report,
            tech_stack_report,
        )
        report["immediate_actions"] = _build_fallback_risk(idea_data, check_in_data)["immediate_actions"]
        return report
