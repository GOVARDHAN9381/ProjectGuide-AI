"""
CrewAI Feasibility Agent  (v2 — improved)
Uses Groq LLM (configurable model) to analyze student project ideas
and produce structured feasibility reports.

Key improvements over v1:
  - Per-domain skill-match scoring using student skills vs. domain requirements.
  - Richer heuristic scoring (5 tiers per dimension vs. 3).
  - Verdict thresholds now match the AI prompt (≥85 → Highly Feasible,
    ≥70 → Feasible with Guidance) — v1 used 88/78 which contradicted
    the prompt instructions.
  - Recommended tech stack injected per domain to help the LLM give
    better, more contextual guidance.
  - Structured JSON validation with clamp + type-coercion so a partially
    valid LLM response is never silently dropped.
  - Confidence flag (`aiGenerated`) now correctly reflects whether the
    LLM or the heuristic path produced the report.
  - _build_fallback_report accepts student_skills for skill-aware
    fallback scoring.
"""

import json
import os
import re
import traceback
from typing import Optional
from dotenv import load_dotenv

from agents.file_extractor import extract_text_from_files

load_dotenv()

try:
    from crewai import Agent, Crew, Task
    import crewai.llms.cache

    crewai.llms.cache.mark_cache_breakpoint = lambda message: message
    HAS_CREWAI = True
except Exception:
    HAS_CREWAI = False
    Agent = Crew = Task = None


# ---------------------------------------------------------------------------
# Domain metadata — used by both the fallback heuristic and the prompt
# ---------------------------------------------------------------------------

DOMAIN_META: dict[str, dict] = {
    "web": {
        "technical": 90,
        "resource": 92,
        "required_skills": ["JavaScript", "React", "HTML", "CSS", "Node", "Python", "SQL"],
        "tech_stack": "React / Next.js, FastAPI / Express, PostgreSQL / MongoDB",
    },
    "aiml": {
        "technical": 78,
        "resource": 82,
        "required_skills": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Data Science"],
        "tech_stack": "Python, scikit-learn / PyTorch / TensorFlow, Jupyter, HuggingFace",
    },
    "blockchain": {
        "technical": 76,
        "resource": 80,
        "required_skills": ["Solidity", "Web3", "Ethereum", "Smart Contracts", "Blockchain"],
        "tech_stack": "Solidity, Hardhat, ethers.js, MetaMask, IPFS",
    },
    "iot": {
        "technical": 80,
        "resource": 76,
        "required_skills": ["C", "C++", "Python", "MQTT", "Arduino", "Raspberry Pi", "IoT"],
        "tech_stack": "Arduino / Raspberry Pi, MQTT, InfluxDB, Grafana, AWS IoT",
    },
    "data_science": {
        "technical": 82,
        "resource": 86,
        "required_skills": ["Python", "R", "SQL", "Pandas", "Statistics", "Visualization"],
        "tech_stack": "Python, Pandas, Seaborn / Plotly, Spark, dbt",
    },
    "mobile": {
        "technical": 84,
        "resource": 88,
        "required_skills": ["React Native", "Flutter", "Dart", "Swift", "Kotlin", "Android", "iOS"],
        "tech_stack": "Flutter / React Native, Firebase, REST APIs",
    },
    "cloud": {
        "technical": 83,
        "resource": 87,
        "required_skills": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "DevOps", "Terraform"],
        "tech_stack": "AWS / GCP / Azure, Docker, Kubernetes, Terraform, CI/CD",
    },
}

_DEFAULT_DOMAIN_META = {
    "technical": 85,
    "resource": 84,
    "required_skills": [],
    "tech_stack": "Open-source tooling appropriate to the domain",
}

VALID_VERDICTS = frozenset(
    ["Highly Feasible", "Feasible with Guidance", "Needs Scope Reduction"]
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _clamp(value: int, lo: int = 0, hi: int = 100) -> int:
    """Clamp an integer to [lo, hi]."""
    return max(lo, min(hi, value))


def _compute_skill_match(student_skills: dict, domain: str) -> int:
    """
    Score how well the student's skill profile matches the domain requirements.

    Returns an integer 0–100.
    Normalises student proficiency (1–5) to a 20–100 scale, then combines:
      - 70% weight on average proficiency (quality of the skills the student knows)
      - 30% weight on coverage ratio (breadth of required skills covered)

    This weighting means a highly proficient student who covers even a few
    key skills scores well, while a student with no relevant skills scores low.
    """
    meta = DOMAIN_META.get(domain.lower(), _DEFAULT_DOMAIN_META)
    required = [s.lower() for s in meta["required_skills"]]

    if not required or not student_skills:
        return 72  # neutral fallback when no skill data is available

    student_lower = {k.lower(): v for k, v in student_skills.items()}

    total, matched = 0, 0
    for skill in required:
        proficiency = student_lower.get(skill)
        if proficiency is not None:
            # Normalise 1–5 → 20–100
            total += _clamp(int(proficiency) * 20, 20, 100)
            matched += 1

    if matched == 0:
        return 50  # student listed no skills relevant to this domain

    coverage = matched / len(required)   # fraction of required skills present
    avg_prof = total / matched           # average proficiency (20–100 scale)

    # 70% proficiency quality + 30% coverage breadth
    return _clamp(round(avg_prof * 0.70 + coverage * 100 * 0.30))


def _timeline_score(days: int) -> int:
    """Convert project duration in days to a timeline adequacy score."""
    weeks = days / 7
    if weeks >= 12:
        return 95
    elif weeks >= 8:
        return 90
    elif weeks >= 6:
        return 85
    elif weeks >= 4:
        return 78
    elif weeks >= 2:
        return 68
    else:
        return 55


def _verdict_from_score(score: int) -> str:
    """
    Determine verdict from overall score.
    Thresholds match the prompt instructions sent to the LLM.
    """
    if score >= 85:
        return "Highly Feasible"
    elif score >= 70:
        return "Feasible with Guidance"
    else:
        return "Needs Scope Reduction"


# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------

def _get_llm():
    """Create the Groq-backed LLM for CrewAI."""
    api_key = os.getenv("GROQ_API_KEY_FEASIBILITY") or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY_FEASIBILITY (or GROQ_API_KEY) not found in environment variables")

    from crewai import LLM

    model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
    return LLM(
        model=model_name,
        api_key=api_key,
        temperature=0.3,
    )


def _call_groq_direct(system_prompt: str, user_prompt: str, api_key: str, model: str = None) -> dict:
    """Directly invoke Groq chat completion API using httpx if CrewAI is unavailable."""
    import httpx
    if model and model.startswith("groq/"):
        model = model[5:]
    if not model:
        model = "llama-3.3-70b-versatile"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }
    with httpx.Client(timeout=45.0) as client:
        resp = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_json_from_text(content)


# ---------------------------------------------------------------------------
# JSON parsing
# ---------------------------------------------------------------------------

def _parse_json_from_text(text: str) -> dict:
    """
    Extract and parse JSON from LLM output text.
    Handles plain JSON, markdown code-fenced JSON, and JSON embedded in prose.
    Returns {} on any failure — never raises.
    """
    if not text:
        return {}

    text = str(text)

    # 1. Direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    # 2. Markdown-fenced blocks and bare {…} fallback
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
            except (json.JSONDecodeError, TypeError, IndexError):
                continue

    return {}


def _validate_and_normalise(parsed: dict) -> Optional[dict]:
    """
    Validate a parsed LLM report dict.  Coerces types and clamps values.
    Returns None if the minimum required fields are absent.
    """
    if "overallScore" not in parsed:
        return None

    metrics_raw = parsed.get("metrics", {})

    def _safe_int(val, default: int) -> int:
        try:
            return _clamp(int(val))
        except (TypeError, ValueError):
            return default

    metrics = {
        "technical": _safe_int(metrics_raw.get("technical"), 80),
        "timeline": _safe_int(metrics_raw.get("timeline"), 80),
        "resource": _safe_int(metrics_raw.get("resource"), 80),
        "skillMatch": _safe_int(metrics_raw.get("skillMatch"), 80),
    }

    overall = _safe_int(parsed.get("overallScore"), 80)
    verdict = parsed.get("verdict", "")
    if verdict not in VALID_VERDICTS:
        verdict = _verdict_from_score(overall)

    return {
        "overallScore": overall,
        "verdict": verdict,
        "metrics": metrics,
        "strengths": parsed.get("strengths") or [],
        "bottlenecks": parsed.get("bottlenecks") or [],
    }


# ---------------------------------------------------------------------------
# Fallback heuristic report
# ---------------------------------------------------------------------------

def _build_fallback_report(idea_data: dict, student_skills: Optional[dict] = None) -> dict:
    """
    Generate a heuristic feasibility report when the AI agent call fails.

    Improvements vs v1:
      - Five timeline tiers instead of three.
      - Per-domain skill-match calculation using student_skills.
      - Verdict thresholds aligned with the AI prompt (85/70 not 88/78).
      - More specific bottleneck messages.
    """
    student_skills = student_skills or {}
    domain = (idea_data.get("domain") or "web").lower()
    days = int(idea_data.get("durationDays") or 30)
    team_size = int(idea_data.get("teamSize") or 3)

    meta = DOMAIN_META.get(domain, _DEFAULT_DOMAIN_META)

    technical = meta["technical"]
    resource = meta["resource"]
    timeline = _timeline_score(days)
    skill_match = _compute_skill_match(student_skills, domain)

    overall = _clamp(
        round(technical * 0.35 + timeline * 0.25 + resource * 0.20 + skill_match * 0.20)
    )
    verdict = _verdict_from_score(overall)

    weeks = round(days / 7)
    if days >= 42:
        bottleneck = "Integration testing between system components needs early milestone validation."
    elif days >= 14:
        bottleneck = "Compressed timeline requires strict sprint adherence and daily standups."
    else:
        bottleneck = "Very short window — strongly recommend reducing scope to a focused MVP."

    return {
        "overallScore": overall,
        "verdict": verdict,
        "metrics": {
            "technical": technical,
            "timeline": timeline,
            "resource": resource,
            "skillMatch": skill_match,
        },
        "strengths": [
            f"Project aligns with current {domain.upper()} academic research trends.",
            f"Team of {team_size} enables parallel development across modules.",
            "Rich open-source ecosystem and community resources are available.",
        ],
        "bottlenecks": [
            bottleneck,
            "Clear scope definition and feature prioritisation are critical to prevent overruns.",
        ],
        "filesAnalyzed": [],
        "aiGenerated": False,
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_feasibility_agent(
    idea_data: dict,
    student_skills: Optional[dict] = None,
    uploaded_files: Optional[list] = None,
) -> dict:
    """
    Run the CrewAI feasibility agent.

    Args:
        idea_data:       dict with keys title, desc, domain, teamSize,
                         durationDays, techIdeas, features.
        student_skills:  dict mapping skill names → proficiency (1–5).
        uploaded_files:  list of dicts with name, contentBase64, contentType.

    Returns:
        dict: Structured feasibility report matching the FeasibilityResponse schema.
    """
    student_skills = student_skills or {}
    uploaded_files = uploaded_files or []

    # Step 1 — extract uploaded file text
    file_context = extract_text_from_files(uploaded_files)
    files_analyzed = [
        f.get("name", "unknown") for f in uploaded_files if f.get("contentBase64")
    ]

    # Step 2 — initialise the LLM (may fall back if unavailable)
    api_key = os.getenv("GROQ_API_KEY_FEASIBILITY") or os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[FEASIBILITY AGENT] No GROQ API key found — using fallback.")
        fallback = _build_fallback_report(idea_data, student_skills)
        fallback["filesAnalyzed"] = files_analyzed
        return fallback

    # Step 3 — assemble prompt context
    title = idea_data.get("title", "Untitled Project")
    desc = idea_data.get("desc", "No description provided")
    domain = idea_data.get("domain", "web")
    team_size = idea_data.get("teamSize", "3")
    duration_days = idea_data.get("durationDays", 30)
    tech_ideas = idea_data.get("techIdeas", "")
    features = idea_data.get("features", [])

    domain_meta = DOMAIN_META.get(domain.lower(), _DEFAULT_DOMAIN_META)
    recommended_stack = domain_meta["tech_stack"]

    skills_text = (
        ", ".join(f"{k}: {v}/5" for k, v in student_skills.items())
        if student_skills
        else "Not provided"
    )
    features_text = (
        "\n".join(f"  - {f}" for f in features) if features else "Not specified"
    )
    file_section = (
        f"\n\nUPLOADED REFERENCE DOCUMENTS (extracted text):\n{file_context}"
        if file_context
        else "\n\nNo reference documents uploaded."
    )

    task_description = f"""
Analyze the following student academic project idea for feasibility.

PROJECT DETAILS:
- Title: {title}
- Description: {desc}
- Domain: {domain}
- Team Size: {team_size} members
- Duration: {duration_days} days ({round(int(duration_days) / 7)} weeks approx.)
- Proposed Technologies: {tech_ideas if tech_ideas else 'Not specified'}
- Commonly Used Tech for {domain.upper()}: {recommended_stack}
- Key Features:
{features_text}

STUDENT SKILL PROFILE:
{skills_text}
{file_section}

INSTRUCTIONS:
You MUST respond with ONLY a valid JSON object (no extra text, no markdown) with exactly this structure:
{{
  "overallScore": <integer 0-100>,
  "verdict": "<one of: 'Highly Feasible', 'Feasible with Guidance', 'Needs Scope Reduction'>",
  "metrics": {{
    "technical": <integer 0-100>,
    "timeline": <integer 0-100>,
    "resource": <integer 0-100>,
    "skillMatch": <integer 0-100>
  }},
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "bottlenecks": ["<bottleneck 1>", "<bottleneck 2>"]
}}

SCORING GUIDELINES:
- technical: How complex is the project technically? Higher = more feasible (simpler / well-supported tools exist).
- timeline: Is the duration adequate for the scope? Higher = sufficient time.
- resource: Are tools, datasets, APIs, hardware freely available? Higher = readily accessible.
- skillMatch: Do the student's skills match the domain requirements? Higher = strong match.
- overallScore: Weighted average — technical(35%) + timeline(25%) + resource(20%) + skillMatch(20%).
- verdict: "Highly Feasible" if overall >= 85, "Feasible with Guidance" if >= 70, else "Needs Scope Reduction".

Be specific and contextual in strengths and bottlenecks — reference the actual project title,
domain challenges, proposed technology stack, and any insights from uploaded documents.
"""

    parsed = None
    if HAS_CREWAI:
        try:
            llm = _get_llm()
            feasibility_agent = Agent(
                role="Senior Academic Project Feasibility Analyst",
                goal=(
                    "Evaluate the technical viability, timeline adequacy, resource availability, "
                    "and skill-match of student academic project ideas. Provide rigorous, "
                    "actionable feasibility scores and recommendations."
                ),
                backstory=(
                    "You are an expert academic mentor and project evaluator with 15+ years of "
                    "experience guiding Computer Science & Engineering capstone projects. You have "
                    "supervised hundreds of student teams across domains like AI/ML, Web Development, "
                    "IoT, Blockchain, and Data Science. You analyse project descriptions, uploaded "
                    "reference documents, student skill profiles, and timeline constraints to produce "
                    "precise feasibility assessments that help students succeed."
                ),
                llm=llm,
                verbose=False,
                allow_delegation=False,
            )

            feasibility_task = Task(
                description=task_description,
                expected_output=(
                    "A valid JSON object containing the feasibility report with "
                    "overallScore, verdict, metrics, strengths, and bottlenecks."
                ),
                agent=feasibility_agent,
            )

            crew = Crew(
                agents=[feasibility_agent],
                tasks=[feasibility_task],
                verbose=False,
            )
            result = crew.kickoff()
            parsed = _parse_json_from_text(str(result))
        except Exception as e:
            print(f"[FEASIBILITY AGENT] Crew execution failed: {e}")
            traceback.print_exc()

    if not parsed and api_key:
        try:
            sys_prompt = (
                "You are an expert academic mentor and project evaluator with 15+ years of "
                "experience evaluating student project ideas. Produce rigorous feasibility reports "
                "with overallScore, verdict, metrics, strengths, and bottlenecks."
            )
            model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
            parsed = _call_groq_direct(sys_prompt, task_description, api_key, model_name)
        except Exception as e:
            print(f"[FEASIBILITY AGENT] Groq direct API call failed: {e}")
            traceback.print_exc()

    if parsed:
        normalised = _validate_and_normalise(parsed)
        if normalised:
            normalised["filesAnalyzed"] = files_analyzed
            normalised["aiGenerated"] = True
            return normalised

    # Step 5 — graceful fallback
    fallback = _build_fallback_report(idea_data, student_skills)
    fallback["filesAnalyzed"] = files_analyzed
    return fallback
