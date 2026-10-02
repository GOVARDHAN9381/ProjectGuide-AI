"""
CrewAI Technology Stack Recommendation Agent  (v1)

This is Agent 3 in the pipeline.  It REQUIRES the outputs from:
  - Agent 1 : Feasibility Report  (overallScore, verdict, metrics, strengths, bottlenecks)
  - Agent 2 : Scope Report        (problemStatement, objectives, inScope, targetUsers,
                                   keyDeliverables, constraints)

Using those upstream reports as context, it recommends a concrete, justified
technology stack — frontend, backend, database, APIs/services, DevOps, testing —
and surfaces a step-by-step reasoning chain so the faculty can see HOW the
recommendation was derived.
"""

import json
import os
import re
import traceback
from typing import Optional
from dotenv import load_dotenv

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
# Domain → sensible defaults used in the fallback path
# ---------------------------------------------------------------------------
_DOMAIN_DEFAULTS: dict[str, dict] = {
    "web": {
        "frontend": "React.js (Vite)",
        "backend": "FastAPI (Python) or Express.js (Node.js)",
        "database": "PostgreSQL (relational) + Redis (cache)",
        "apis": "REST API with JWT authentication",
        "devops": "Docker, GitHub Actions CI/CD",
        "testing": "Pytest (backend), Vitest / React Testing Library (frontend)",
    },
    "aiml": {
        "frontend": "Streamlit or React.js",
        "backend": "FastAPI (Python)",
        "database": "PostgreSQL + Vector DB (FAISS / Chroma for embeddings)",
        "apis": "HuggingFace Inference API, OpenAI API (optional)",
        "devops": "Docker, Weights & Biases (experiment tracking)",
        "testing": "Pytest, model evaluation metrics (F1, accuracy, BLEU)",
    },
    "mobile": {
        "frontend": "Flutter (Dart) — cross-platform iOS + Android",
        "backend": "FastAPI or Firebase Cloud Functions",
        "database": "Firebase Firestore + SQLite (on-device)",
        "apis": "Firebase Auth, Push Notifications (FCM)",
        "devops": "GitHub Actions, Google Play / App Store CI",
        "testing": "Flutter Test, Integration Test",
    },
    "iot": {
        "frontend": "React.js dashboard or Grafana",
        "backend": "FastAPI or Node.js (MQTT broker)",
        "database": "InfluxDB (time-series) + PostgreSQL",
        "apis": "MQTT, AWS IoT Core or Mosquitto",
        "devops": "Docker on Raspberry Pi, GitHub Actions",
        "testing": "Pytest, hardware-in-the-loop test",
    },
    "blockchain": {
        "frontend": "React.js + ethers.js",
        "backend": "Node.js + Hardhat (smart contract dev)",
        "database": "IPFS (decentralized storage) + PostgreSQL (off-chain data)",
        "apis": "MetaMask wallet, Alchemy / Infura RPC",
        "devops": "Hardhat CI, Vercel for frontend",
        "testing": "Hardhat tests (Mocha/Chai), Slither (static analysis)",
    },
    "data_science": {
        "frontend": "Streamlit or Plotly Dash",
        "backend": "FastAPI (Python)",
        "database": "PostgreSQL + Pandas (in-memory) + DuckDB",
        "apis": "REST API for data ingestion",
        "devops": "Docker, GitHub Actions, MLflow",
        "testing": "Pytest, Great Expectations (data quality)",
    },
    "cloud": {
        "frontend": "React.js (served via CDN / S3)",
        "backend": "AWS Lambda / GCP Cloud Run (serverless)",
        "database": "AWS RDS or Cloud Spanner",
        "apis": "REST + gRPC, API Gateway",
        "devops": "Terraform, Kubernetes, GitHub Actions",
        "testing": "Pytest, Terratest, cloud integration tests",
    },
}

_DEFAULT_STACK = {
    "frontend": "React.js (Vite)",
    "backend": "FastAPI (Python)",
    "database": "PostgreSQL",
    "apis": "REST API",
    "devops": "Docker, GitHub Actions",
    "testing": "Pytest",
}


# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------

def _get_llm():
    """Create the Groq-backed LLM for CrewAI."""
    # Use dedicated tech-stack agent key if available, fall back to shared key
    api_key = os.getenv("GROQ_API_KEY_TECH_STACK") or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY_TECH_STACK (or GROQ_API_KEY) not found in environment variables")

    from crewai import LLM

    model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
    return LLM(
        model=model_name,
        api_key=api_key,
        temperature=0.35,
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
        "temperature": 0.35,
        "response_format": {"type": "json_object"},
    }
    with httpx.Client(timeout=45.0) as client:
        resp = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_json_from_text(content)


# ---------------------------------------------------------------------------
# JSON parsing helper
# ---------------------------------------------------------------------------

def _parse_json_from_text(text: str) -> dict:
    """Extract and parse JSON from LLM output text.  Never raises."""
    if not text:
        return {}
    text = str(text)

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
            except (json.JSONDecodeError, TypeError, IndexError):
                continue

    return {}


# ---------------------------------------------------------------------------
# Fallback report
# ---------------------------------------------------------------------------

def _build_fallback_report(
    idea_data: dict,
    feasibility_report: dict,
    scope_report: dict,
) -> dict:
    """Heuristic tech-stack recommendation when the LLM is unavailable."""
    domain = (idea_data.get("domain") or "web").lower()
    stack = _DOMAIN_DEFAULTS.get(domain, _DEFAULT_STACK)
    verdict = feasibility_report.get("verdict", "Feasible with Guidance")
    in_scope = scope_report.get("inScope", [])
    constraints = scope_report.get("constraints", [])

    return {
        "recommendedStack": stack,
        "reasoning": [
            f"Domain is '{domain.upper()}', so the default stack for this domain was applied.",
            f"Feasibility verdict is '{verdict}', indicating the stack should favour simplicity and quick setup.",
            "Scope constraints were considered: " + (constraints[0] if constraints else "limited team size and timeline."),
            "In-scope features influenced database choice and API layer selection.",
        ],
        "alternatives": [
            {
                "layer": "Frontend",
                "alternative": "Next.js (Server-side rendering for SEO-heavy apps)",
                "tradeoff": "Higher initial complexity; better for production-grade apps."
            },
            {
                "layer": "Backend",
                "alternative": "Django REST Framework",
                "tradeoff": "Batteries-included but heavier than FastAPI for simple APIs."
            },
            {
                "layer": "Database",
                "alternative": "MongoDB",
                "tradeoff": "Schema-flexible but weaker transactional guarantees."
            },
        ],
        "justification": (
            f"This stack was selected based on the project domain ({domain.upper()}), "
            f"the feasibility verdict ({verdict}), and the team's likely skill profile. "
            "The choices prioritise developer productivity and ecosystem support for "
            "academic capstone timelines."
        ),
        "learningResources": [
            "FastAPI official docs: https://fastapi.tiangolo.com",
            "React.js official docs: https://react.dev",
            "PostgreSQL tutorial: https://www.postgresqltutorial.com",
        ],
        "aiGenerated": False,
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_tech_stack_agent(
    idea_data: dict,
    feasibility_report: dict,
    scope_report: dict,
    student_skills: Optional[dict] = None,
) -> dict:
    """
    Run the Tech Stack Recommendation Agent.

    Args:
        idea_data:          dict with title, desc, domain, teamSize, durationDays,
                            techIdeas, features.
        feasibility_report: Output dict from Agent 1 (Feasibility Agent).
        scope_report:       Output dict from Agent 2 (Scope Definition Agent).
        student_skills:     dict mapping skill names → proficiency (1–5).

    Returns:
        dict: Structured tech-stack recommendation with reasoning chain.
    """
    student_skills = student_skills or {}

    # ── Step 1: validate chained inputs ──────────────────────────────────────
    if not feasibility_report or not isinstance(feasibility_report, dict):
        print("[TECH STACK AGENT] No feasibility report provided — using fallback.")
        return _build_fallback_report(idea_data, {}, scope_report or {})

    if not scope_report or not isinstance(scope_report, dict):
        print("[TECH STACK AGENT] No scope report provided — using fallback.")
        return _build_fallback_report(idea_data, feasibility_report, {})

    # ── Step 2: check API key ────────────────────────────────────────────────
    api_key = os.getenv("GROQ_API_KEY_TECH_STACK") or os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[TECH STACK AGENT] No GROQ API key found — using fallback.")
        return _build_fallback_report(idea_data, feasibility_report, scope_report)

    # ── Step 3: build prompt context from chained outputs ────────────────────
    title        = idea_data.get("title", "Untitled Project")
    desc         = idea_data.get("desc", "No description provided")
    domain       = idea_data.get("domain", "web")
    team_size    = idea_data.get("teamSize", "3")
    duration_days = idea_data.get("durationDays", 30)
    tech_ideas   = idea_data.get("techIdeas", "")
    features     = idea_data.get("features", [])

    skills_text = (
        ", ".join(f"{k}: {v}/5" for k, v in student_skills.items())
        if student_skills
        else "Not provided"
    )

    features_text = (
        "\n".join(f"  - {f}" for f in features) if features else "Not specified"
    )

    # ── Serialize chained upstream outputs into the prompt ───────────────────
    feas_summary = (
        f"  Overall Score : {feasibility_report.get('overallScore', 'N/A')}%\n"
        f"  Verdict       : {feasibility_report.get('verdict', 'N/A')}\n"
        f"  Technical     : {feasibility_report.get('metrics', {}).get('technical', 'N/A')}%\n"
        f"  Timeline      : {feasibility_report.get('metrics', {}).get('timeline', 'N/A')}%\n"
        f"  Resource      : {feasibility_report.get('metrics', {}).get('resource', 'N/A')}%\n"
        f"  Skill Match   : {feasibility_report.get('metrics', {}).get('skillMatch', 'N/A')}%\n"
        f"  Strengths     :\n" +
        "\n".join(f"    - {s}" for s in feasibility_report.get("strengths", [])) + "\n"
        f"  Bottlenecks   :\n" +
        "\n".join(f"    - {b}" for b in feasibility_report.get("bottlenecks", []))
    )

    scope_summary = (
        f"  Problem       : {scope_report.get('problemStatement', 'N/A')}\n"
        f"  Target Users  : {scope_report.get('targetUsers', 'N/A')}\n"
        f"  In Scope      :\n" +
        "\n".join(f"    - {s}" for s in scope_report.get("inScope", [])) + "\n"
        f"  Out of Scope  :\n" +
        "\n".join(f"    - {s}" for s in scope_report.get("outOfScope", [])) + "\n"
        f"  Constraints   :\n" +
        "\n".join(f"    - {c}" for c in scope_report.get("constraints", [])) + "\n"
        f"  Objectives    :\n" +
        "\n".join(f"    - {o}" for o in scope_report.get("objectives", []))
    )

    task_description = f"""
You are recommending a technology stack for a student capstone project.
You have already received the outputs of two upstream AI agents — use them as the
primary basis for your recommendation.

═══════════════════════════════════════════════════════════
PROJECT DETAILS
═══════════════════════════════════════════════════════════
- Title        : {title}
- Description  : {desc}
- Domain       : {domain}
- Team Size    : {team_size} members
- Duration     : {duration_days} days ({round(int(duration_days) / 7)} weeks approx.)
- Student Tech Ideas : {tech_ideas if tech_ideas else 'Not specified'}
- Key Features :
{features_text}

STUDENT SKILL PROFILE:
{skills_text}

═══════════════════════════════════════════════════════════
AGENT 1 OUTPUT — FEASIBILITY REPORT
═══════════════════════════════════════════════════════════
{feas_summary}

═══════════════════════════════════════════════════════════
AGENT 2 OUTPUT — SCOPE DEFINITION REPORT
═══════════════════════════════════════════════════════════
{scope_summary}

═══════════════════════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════════════════════
Based on ALL the above context, recommend a concrete technology stack.

Your reasoning MUST be step-by-step (minimum 4 reasoning steps) and MUST
explicitly reference facts from the Feasibility Report and Scope Report to justify
each technology choice.

You MUST respond with ONLY a valid JSON object (no extra text, no markdown) with
exactly this structure:
{{
  "recommendedStack": {{
    "frontend"  : "<specific framework/library with version hint>",
    "backend"   : "<specific framework/language with justification>",
    "database"  : "<primary DB choice and reason>",
    "apis"      : "<external APIs or services to use>",
    "devops"    : "<CI/CD, containerization, hosting>",
    "testing"   : "<testing frameworks and strategies>"
  }},
  "reasoning": [
    "<Step 1: reference feasibility score/verdict and explain its impact on stack complexity>",
    "<Step 2: reference scope constraints (team size, timeline) and justify simplicity choices>",
    "<Step 3: reference in-scope features and explain how the frontend choice supports them>",
    "<Step 4: reference student skills and explain how the backend choice aligns with their profile>",
    "<Step 5 (optional): reference bottlenecks from feasibility and explain mitigation via tooling>"
  ],
  "alternatives": [
    {{
      "layer"      : "<Frontend | Backend | Database | DevOps>",
      "alternative": "<alternative technology>",
      "tradeoff"   : "<when to pick this instead and what you give up>"
    }}
  ],
  "justification": "<2-3 sentence overall justification referencing the upstream reports>",
  "learningResources": [
    "<Resource 1: name + URL>",
    "<Resource 2: name + URL>",
    "<Resource 3: name + URL>"
  ]
}}

GUIDELINES:
- Be specific — name actual frameworks, versions, and cloud services.
- Every reasoning step MUST cite something from the Feasibility or Scope report.
- Recommend technologies the student team can realistically learn and use in {duration_days} days.
- Prefer open-source, free-tier tools for student projects.
- Provide at least 3 alternatives covering different layers.
- Provide at least 3 learning resources with real URLs.
"""

    # ── Step 4 & 5: Execute via CrewAI or direct Groq API ────────────────────
    parsed = None

    if HAS_CREWAI:
        try:
            llm = _get_llm()
            tech_stack_agent = Agent(
                role="Senior Software Architect & Technology Stack Advisor",
                goal=(
                    "Recommend the optimal, concrete technology stack for a student academic "
                    "project by carefully analysing the upstream Feasibility and Scope reports, "
                    "then providing a step-by-step reasoning chain that justifies every "
                    "technology choice based on the project's constraints and student skills."
                ),
                backstory=(
                    "You are an experienced software architect who has advised hundreds of "
                    "engineering capstone teams. You are known for your practical, no-nonsense "
                    "stack recommendations that balance modern best practices with the realistic "
                    "constraints of student projects (short timelines, limited budgets, varied "
                    "skill levels). You always read the feasibility and scope reports first, "
                    "then derive your technology choices from that evidence — never in a vacuum."
                ),
                llm=llm,
                verbose=False,
                allow_delegation=False,
            )

            tech_stack_task = Task(
                description=task_description,
                expected_output=(
                    "A valid JSON object containing recommendedStack, a step-by-step reasoning "
                    "array, alternatives, justification, and learningResources — all derived "
                    "from the upstream Feasibility and Scope reports."
                ),
                agent=tech_stack_agent,
            )

            crew = Crew(
                agents=[tech_stack_agent],
                tasks=[tech_stack_task],
                verbose=False,
            )
            result = crew.kickoff()
            parsed = _parse_json_from_text(str(result))
        except Exception as e:
            print(f"[TECH STACK AGENT] Crew execution failed: {e}")
            traceback.print_exc()

    if not parsed and api_key:
        try:
            sys_prompt = (
                "You are a Senior Software Architect & Technology Stack Advisor. "
                "You recommend concrete technology stacks for student engineering capstones "
                "strictly derived from upstream Feasibility and Scope reports with step-by-step reasoning."
            )
            model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
            parsed = _call_groq_direct(sys_prompt, task_description, api_key, model_name)
        except Exception as e:
            print(f"[TECH STACK AGENT] Groq direct API call failed: {e}")
            traceback.print_exc()

    # Validate minimum structure
    if parsed and "recommendedStack" in parsed and "reasoning" in parsed:
        parsed["aiGenerated"] = True
        stack = parsed.get("recommendedStack", {})
        for key in ["frontend", "backend", "database", "apis", "devops", "testing"]:
            if key not in stack:
                stack[key] = _DOMAIN_DEFAULTS.get(
                    domain.lower(), _DEFAULT_STACK
                ).get(key, "TBD")
        parsed["recommendedStack"] = stack
        return parsed

    return _build_fallback_report(idea_data, feasibility_report, scope_report)
