"""
CrewAI Scope Definition Agent
Uses Groq LLM (via CrewAI) to take a raw, often vague, student project idea
and produce a clearly bounded project scope: problem statement, objectives,
in-scope / out-of-scope items, target users, deliverables, assumptions,
and constraints.
"""

import json
import os
import re
import traceback
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


def _get_llm():
    """Create the Groq-backed LLM for CrewAI using native LLM class."""
    api_key = os.getenv("GROQ_API_KEY_SCOPE") or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY_SCOPE (or GROQ_API_KEY) not found in environment variables")

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


def _parse_json_from_text(text: str) -> dict:
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
        match = re.search(pattern, str(text), re.DOTALL)
        if match:
            try:
                candidate = match.group(1) if match.lastindex else match.group(0)
                return json.loads(candidate)
            except (json.JSONDecodeError, TypeError, IndexError):
                continue

    return {}


def _heuristic_scope_score(idea_data: dict) -> dict:
    """Compute a simple heuristic scope score when LLM is unavailable."""
    duration = int(idea_data.get("durationDays") or 30)
    team = int(idea_data.get("teamSize") or 3)
    desc = idea_data.get("desc") or ""
    features = idea_data.get("features") or []

    clarity       = min(100, 50 + len(desc) // 10)
    scope_control = min(100, 55 + min(len(features), 5) * 5)
    achievability = min(100, 40 + min(duration // 10, 30) + min(team * 5, 20))
    completeness  = 60  # fallback: generic content

    overall = round((clarity + scope_control + achievability + completeness) / 4)
    return {
        "overallScore": overall,
        "metrics": {
            "clarity": clarity,
            "scopeControl": scope_control,
            "achievability": achievability,
            "completeness": completeness,
        },
    }


def _build_fallback_report(idea_data: dict) -> dict:
    title = idea_data.get("title") or "Untitled Project"
    domain = (idea_data.get("domain") or "web").lower()
    desc = idea_data.get("desc") or ""
    scores = _heuristic_scope_score(idea_data)

    return {
        **scores,
        "problemStatement": (
            f"{title} aims to address common challenges faced by users in the "
            f"{domain.upper()} space, based on the submitted description: "
            f"\"{desc[:200]}\""
        ),
        "objectives": [
            "Deliver a working prototype that demonstrates the core idea end-to-end.",
            "Validate the concept with a small, well-defined set of features.",
            "Produce documentation sufficient for faculty evaluation.",
        ],
        "inScope": [
            "Core feature set directly described in the submitted idea.",
            "A basic user interface to demonstrate functionality.",
            "Minimal viable data handling required to support the core feature.",
        ],
        "outOfScope": [
            "Advanced features not explicitly mentioned in the idea (e.g. scaling, analytics dashboards).",
            "Production-grade security, performance optimization, and deployment infrastructure.",
            "Integrations with third-party systems not required for the core demonstration.",
        ],
        "targetUsers": "Students, faculty, or the general audience implied by the project domain.",
        "keyDeliverables": [
            "Working prototype / demo",
            "Source code repository",
            "Short project report or presentation",
        ],
        "assumptions": [
            "The team has access to standard development tools for the chosen domain.",
            "Requirements will not change significantly during the project timeline.",
        ],
        "constraints": [
            "Limited to the team size and timeline specified in the submission.",
            "Scope kept intentionally narrow to fit an academic project timeframe.",
        ],
        "aiGenerated": False,
    }


def run_scope_agent(
    idea_data: dict,
    student_skills: dict = None,
    uploaded_files: list = None,
    feasibility_report: dict = None,  # Agent chaining: output from Feasibility Agent (Agent 1)
) -> dict:
    student_skills = student_skills or {}
    uploaded_files = uploaded_files or []
    feasibility_report = feasibility_report or {}

    file_context = extract_text_from_files(uploaded_files)

    api_key = os.getenv("GROQ_API_KEY_SCOPE") or os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[SCOPE AGENT] No GROQ API key found — using fallback.")
        return _build_fallback_report(idea_data)

    title = idea_data.get("title", "Untitled Project")
    desc = idea_data.get("desc", "No description provided")
    domain = idea_data.get("domain", "web")
    team_size = idea_data.get("teamSize", "3")
    duration_days = idea_data.get("durationDays", 30)
    tech_ideas = idea_data.get("techIdeas", "")
    features = idea_data.get("features", [])

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

    # Agent chaining: inject Feasibility Report from Agent 1 into this prompt
    if feasibility_report and feasibility_report.get("overallScore") is not None:
        feas_chain_section = (
            f"\n\nAGENT 1 OUTPUT — FEASIBILITY REPORT (use this to refine scope boundaries):\n"
            f"  Overall Score : {feasibility_report.get('overallScore')}%\n"
            f"  Verdict       : {feasibility_report.get('verdict', 'N/A')}\n"
            f"  Technical     : {feasibility_report.get('metrics', {}).get('technical', 'N/A')}%\n"
            f"  Timeline      : {feasibility_report.get('metrics', {}).get('timeline', 'N/A')}%\n"
            f"  Skill Match   : {feasibility_report.get('metrics', {}).get('skillMatch', 'N/A')}%\n"
            f"  Bottlenecks   :\n" +
            "\n".join(f"    - {b}" for b in feasibility_report.get("bottlenecks", [])) + "\n"
            f"  Key Guidance  : Ensure the scope you define directly addresses the "
            f"feasibility bottlenecks listed above."
        )
    else:
        feas_chain_section = "\n\nAGENT 1 OUTPUT — FEASIBILITY REPORT: Not yet available."

    task_description = f"""
Define a clear, bounded scope for the following student academic project idea.

PROJECT DETAILS:
- Title: {title}
- Description: {desc}
- Domain: {domain}
- Team Size: {team_size} members
- Duration: {duration_days} days ({round(int(duration_days) / 7)} weeks approx.)
- Proposed Technologies: {tech_ideas if tech_ideas else 'Not specified'}
- Key Features Mentioned:
{features_text}

STUDENT SKILL PROFILE:
{skills_text}
{file_section}
{feas_chain_section}

INSTRUCTIONS:
You MUST respond with ONLY a valid JSON object (no extra text, no markdown) with exactly this structure:
{{
  "problemStatement": "<one clear paragraph stating the specific problem this project solves>",
  "objectives": ["<objective 1>", "<objective 2>", "<objective 3>"],
  "inScope": ["<in-scope item 1>", "<in-scope item 2>", "<in-scope item 3>"],
  "outOfScope": ["<explicitly excluded item 1>", "<explicitly excluded item 2>"],
  "targetUsers": "<who this project is built for>",
  "keyDeliverables": ["<deliverable 1>", "<deliverable 2>"],
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "constraints": ["<constraint 1>", "<constraint 2>"],
  "metrics": {{
    "clarity": <integer 0-100: how precisely the problem statement is defined>,
    "scopeControl": <integer 0-100: how well scope creep is prevented by the out-of-scope list>,
    "achievability": <integer 0-100: how realistic this scope is for {team_size} students in {duration_days} days>,
    "completeness": <integer 0-100: how complete and specific all sections are>
  }}
}}

GUIDELINES:
- The scope MUST be realistic for a team of {team_size} students within {duration_days} days.
- "inScope" should list only what can genuinely be built in that time.
- "outOfScope" must explicitly call out tempting features/extensions that should be deferred, so the team doesn't drift into scope creep.
- If Agent 1 Feasibility Report is provided, ensure the scope directly addresses those bottlenecks.
- Be specific and reference the actual project details — avoid generic filler.
- If uploaded reference documents were provided, incorporate relevant details from them.
"""


    parsed = None
    if HAS_CREWAI:
        try:
            llm = _get_llm()
            scope_agent = Agent(
                role="Senior Academic Project Scope Definition Specialist",
                goal=(
                    "Take a raw, sometimes vague, student project idea and convert it into "
                    "a clearly bounded project scope — with a precise problem statement, "
                    "explicit objectives, and a firm line between what is in scope and what "
                    "is out of scope — so the project stays achievable within the given "
                    "timeline and team size."
                ),
                backstory=(
                    "You are an experienced academic project mentor who has guided hundreds "
                    "of Computer Science & Engineering capstone teams. You are known for "
                    "stopping scope creep before it starts: you take an ambitious or vague "
                    "idea and narrow it into something a small student team can realistically "
                    "finish, without losing the core value of the idea."
                ),
                llm=llm,
                verbose=False,
                allow_delegation=False,
            )

            scope_task = Task(
                description=task_description,
                expected_output=(
                    "A valid JSON object containing problemStatement, objectives, inScope, "
                    "outOfScope, targetUsers, keyDeliverables, assumptions, and constraints."
                ),
                agent=scope_agent,
            )

            crew = Crew(
                agents=[scope_agent],
                tasks=[scope_task],
                verbose=False,
            )

            result = crew.kickoff()
            parsed = _parse_json_from_text(str(result))
        except Exception as e:
            print(f"[SCOPE AGENT] Crew execution failed: {e}")
            traceback.print_exc()

    if not parsed and api_key:
        try:
            sys_prompt = (
                "You are a Senior Academic Project Scope Definition Specialist. "
                "You take raw student project ideas and define crisp, achievable project scopes "
                "with clear in-scope, out-of-scope, objectives, and deliverables."
            )
            model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
            parsed = _call_groq_direct(sys_prompt, task_description, api_key, model_name)
        except Exception as e:
            print(f"[SCOPE AGENT] Groq direct API call failed: {e}")
            traceback.print_exc()

    if parsed and "problemStatement" in parsed:
        raw_metrics = parsed.get("metrics") or {}
        clarity       = int(raw_metrics.get("clarity",       75))
        scope_control = int(raw_metrics.get("scopeControl",  75))
        achievability = int(raw_metrics.get("achievability", 75))
        completeness  = int(raw_metrics.get("completeness",  75))
        overall_score = round((clarity + scope_control + achievability + completeness) / 4)

        report = {
            "overallScore": overall_score,
            "metrics": {
                "clarity":       clarity,
                "scopeControl":  scope_control,
                "achievability": achievability,
                "completeness":  completeness,
            },
            "problemStatement": parsed.get("problemStatement", ""),
            "objectives": parsed.get("objectives", []),
            "inScope": parsed.get("inScope", []),
            "outOfScope": parsed.get("outOfScope", []),
            "targetUsers": parsed.get("targetUsers", ""),
            "keyDeliverables": parsed.get("keyDeliverables", []),
            "assumptions": parsed.get("assumptions", []),
            "constraints": parsed.get("constraints", []),
            "aiGenerated": True,
        }
        return report

    return _build_fallback_report(idea_data)