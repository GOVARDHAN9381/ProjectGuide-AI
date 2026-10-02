"""
CrewAI Risk Assessment & Mitigation Agent  (v1)

This is Agent 4 in the pipeline.  It REQUIRES the outputs from:
  - Agent 1 : Feasibility Report  (overallScore, verdict, metrics, bottlenecks)
  - Agent 2 : Scope Report        (objectives, inScope, outOfScope, constraints)
  - Agent 3 : Tech Stack Report   (recommendedStack, reasoning, alternatives)

Using all three upstream reports as context it:
  1. Identifies project blockers (Technical, Timeline, Resource, Scope, External)
  2. Rates each risk by Likelihood and Impact (High / Medium / Low)
  3. Proposes concrete mitigation steps for every risk
  4. Surfaces a traffic-light overall risk rating (High / Medium / Low)
  5. Produces a step-by-step reasoning chain showing how risks were derived
     from the upstream agent outputs.
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
# Domain-specific default risk registers used in the fallback path
# ---------------------------------------------------------------------------

_DOMAIN_RISKS: dict[str, list[dict]] = {
    "web": [
        {
            "id": "R-01",
            "title": "Authentication & Session Security",
            "description": "Web apps are prime targets for session hijacking, XSS, and CSRF attacks if not hardened.",
            "category": "Technical",
            "likelihood": "Medium",
            "impact": "High",
            "mitigation": "Use JWT with short expiry + refresh tokens, enable HTTPS-only cookies, add CSRF protection via SameSite attribute, sanitise all user inputs.",
            "owner": "Student Team",
        },
        {
            "id": "R-02",
            "title": "Scope Creep from Feature Additions",
            "description": "Web projects often expand as stakeholders request additional pages, integrations, or user roles mid-sprint.",
            "category": "Scope",
            "likelihood": "High",
            "impact": "Medium",
            "mitigation": "Freeze MVP scope before development begins. Use a change-request process for any additions. Prioritise backlog items with faculty approval.",
            "owner": "Both",
        },
        {
            "id": "R-03",
            "title": "Database Performance Under Load",
            "description": "Without indexing and query optimisation, PostgreSQL/MongoDB can slow significantly with realistic data volumes.",
            "category": "Technical",
            "likelihood": "Medium",
            "impact": "Medium",
            "mitigation": "Add indexes on frequently queried fields. Use EXPLAIN ANALYZE. Implement pagination. Consider Redis caching for hot queries.",
            "owner": "Student Team",
        },
    ],
    "aiml": [
        {
            "id": "R-01",
            "title": "Model Accuracy Below Acceptable Threshold",
            "description": "AI/ML models may underperform if training data is insufficient, imbalanced, or improperly preprocessed.",
            "category": "Technical",
            "likelihood": "High",
            "impact": "High",
            "mitigation": "Start with a baseline model early. Use cross-validation, data augmentation, and hyperparameter tuning. Set minimum accuracy targets (e.g., F1 ≥ 0.75) before integration.",
            "owner": "Student Team",
        },
        {
            "id": "R-02",
            "title": "Compute Resource Constraints",
            "description": "Training large models locally or on free-tier cloud is time-consuming and may be infeasible within the project timeline.",
            "category": "Resource",
            "likelihood": "High",
            "impact": "High",
            "mitigation": "Use pre-trained models (HuggingFace Transformers) with fine-tuning rather than training from scratch. Apply model quantisation. Use Google Colab Pro or Kaggle kernels for GPU compute.",
            "owner": "Student Team",
        },
        {
            "id": "R-03",
            "title": "Data Privacy & Compliance Risk",
            "description": "Collecting or processing personal data raises GDPR/PDPA compliance requirements often overlooked in academic projects.",
            "category": "External",
            "likelihood": "Medium",
            "impact": "High",
            "mitigation": "Anonymise all personal data. Use synthetic datasets where possible. Add a privacy policy stub. Seek ethics clearance from faculty if human subjects data is used.",
            "owner": "Both",
        },
    ],
    "mobile": [
        {
            "id": "R-01",
            "title": "Cross-Platform UI Inconsistencies",
            "description": "Flutter widgets may behave differently on iOS vs Android (keyboard handling, permissions, deep links).",
            "category": "Technical",
            "likelihood": "Medium",
            "impact": "Medium",
            "mitigation": "Test on both platforms from sprint 1. Use platform-specific conditional code for edge cases. Follow Material Design + Cupertino guidelines.",
            "owner": "Student Team",
        },
        {
            "id": "R-02",
            "title": "App Store Rejection Risk",
            "description": "Google Play / Apple App Store reviews may reject the app for missing privacy policy, permission misuse, or UI quality issues.",
            "category": "External",
            "likelihood": "Medium",
            "impact": "High",
            "mitigation": "Follow store guidelines from day one. Add a privacy policy. Request only necessary permissions. Use TestFlight / Internal Testing for pre-submission review.",
            "owner": "Student Team",
        },
        {
            "id": "R-03",
            "title": "Offline Sync Complexity",
            "description": "Mobile apps with offline capability require complex conflict resolution between local SQLite and remote Firestore.",
            "category": "Technical",
            "likelihood": "Medium",
            "impact": "Medium",
            "mitigation": "Use Firestore's built-in offline persistence. Implement a simple last-write-wins strategy for MVP. Document sync edge cases for future sprints.",
            "owner": "Student Team",
        },
    ],
    "iot": [
        {
            "id": "R-01",
            "title": "Hardware Availability & Failure",
            "description": "IoT projects depend on physical components (sensors, microcontrollers) that may fail, be delayed, or be out of stock.",
            "category": "Resource",
            "likelihood": "High",
            "impact": "High",
            "mitigation": "Order components 2 weeks before development starts. Build a hardware emulation layer so software can be tested without physical devices. Keep spare units.",
            "owner": "Student Team",
        },
        {
            "id": "R-02",
            "title": "MQTT Broker Reliability",
            "description": "Message loss or broker downtime can cause data gaps in the IoT dashboard, affecting demo quality.",
            "category": "Technical",
            "likelihood": "Medium",
            "impact": "Medium",
            "mitigation": "Use QoS level 1 (at-least-once delivery). Implement heartbeat monitoring. Use a managed broker (HiveMQ Cloud free tier) rather than self-hosted for reliability.",
            "owner": "Student Team",
        },
        {
            "id": "R-03",
            "title": "Real-Time Data Volume Exceeds Dashboard Capacity",
            "description": "High-frequency sensor data may overwhelm InfluxDB/Grafana on free-tier resources.",
            "category": "Technical",
            "likelihood": "Medium",
            "impact": "Medium",
            "mitigation": "Implement data aggregation at the edge (downsample to 1-second averages). Configure Grafana refresh intervals to 5 seconds minimum. Use data retention policies.",
            "owner": "Student Team",
        },
    ],
    "blockchain": [
        {
            "id": "R-01",
            "title": "Smart Contract Vulnerabilities",
            "description": "Solidity smart contracts are susceptible to reentrancy attacks, integer overflow, and access control errors that can lead to fund loss.",
            "category": "Technical",
            "likelihood": "High",
            "impact": "High",
            "mitigation": "Run Slither static analyser before deployment. Use OpenZeppelin audited contract libraries. Deploy to testnet (Sepolia) and run Hardhat tests with 100% branch coverage.",
            "owner": "Student Team",
        },
        {
            "id": "R-02",
            "title": "Gas Cost Unpredictability",
            "description": "Ethereum gas costs fluctuate, making on-chain transactions expensive or unpredictable for demo scenarios.",
            "category": "External",
            "likelihood": "Medium",
            "impact": "Medium",
            "mitigation": "Use testnet for all demos. Minimise on-chain data — store only hashes. Consider Layer 2 solutions (Polygon Mumbai) for lower gas costs.",
            "owner": "Student Team",
        },
        {
            "id": "R-03",
            "title": "Team Skill Gap in Web3",
            "description": "Blockchain development has a steep learning curve; team members unfamiliar with Solidity/Hardhat may underestimate complexity.",
            "category": "Resource",
            "likelihood": "High",
            "impact": "High",
            "mitigation": "Dedicate first sprint to Solidity fundamentals and a Hello World contract. Assign one team member as blockchain lead. Use CryptoZombies / Alchemy tutorials.",
            "owner": "Both",
        },
    ],
    "data_science": [
        {
            "id": "R-01",
            "title": "Data Quality Issues",
            "description": "Real-world datasets often have missing values, outliers, inconsistent formatting, and duplicates that bias analysis.",
            "category": "Technical",
            "likelihood": "High",
            "impact": "High",
            "mitigation": "Run a data quality audit in sprint 1 using Great Expectations or Pandas profiling. Document assumptions about missing data. Apply imputation or removal strategies explicitly.",
            "owner": "Student Team",
        },
        {
            "id": "R-02",
            "title": "Overfitting & Generalisation Failure",
            "description": "Models trained on limited academic datasets may not generalise to real-world distributions, producing misleading results.",
            "category": "Technical",
            "likelihood": "High",
            "impact": "Medium",
            "mitigation": "Use stratified k-fold cross-validation. Report test-set metrics, not just training accuracy. Apply regularisation (L1/L2, dropout). Reserve a holdout test set from day one.",
            "owner": "Student Team",
        },
        {
            "id": "R-03",
            "title": "Data Source Access Revoked",
            "description": "External APIs or datasets (e.g., Kaggle, government portals) may change terms or go offline during the project.",
            "category": "External",
            "likelihood": "Medium",
            "impact": "High",
            "mitigation": "Download and cache all datasets locally on day 1. Have a fallback dataset identified. Avoid runtime API dependency for core analysis.",
            "owner": "Student Team",
        },
    ],
    "cloud": [
        {
            "id": "R-01",
            "title": "Unexpected Cloud Cost Overrun",
            "description": "Misconfigured auto-scaling, forgotten resources, or high egress costs can exceed free-tier limits unexpectedly.",
            "category": "Resource",
            "likelihood": "High",
            "impact": "High",
            "mitigation": r"Set billing alerts at $10 and $50. Use free-tier services only (AWS Educate, GCP $300 credit). Terminate all resources post-demo. Use Infracost to estimate costs before provisioning.",
            "owner": "Student Team",
        },
        {
            "id": "R-02",
            "title": "IaC Configuration Drift",
            "description": "Manual changes made to cloud resources outside of Terraform/Pulumi cause drift, making infrastructure unreproducible.",
            "category": "Technical",
            "likelihood": "Medium",
            "impact": "Medium",
            "mitigation": "Enforce 'infrastructure as code only' policy. Run terraform plan in CI before every deployment. Use git to version all infrastructure configs.",
            "owner": "Student Team",
        },
        {
            "id": "R-03",
            "title": "Service Vendor Lock-in",
            "description": "Heavy reliance on proprietary managed services (AWS RDS, Cloud Spanner) makes future migration costly.",
            "category": "External",
            "likelihood": "Low",
            "impact": "Medium",
            "mitigation": "Use open-standard interfaces where possible (JDBC, SQL). Abstract cloud-specific code behind adapter interfaces. Document service dependencies clearly.",
            "owner": "Both",
        },
    ],
}

_DEFAULT_RISKS = _DOMAIN_RISKS["web"]


# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------

def _get_llm():
    """Create the Groq-backed LLM for CrewAI."""
    api_key = os.getenv("GROQ_API_KEY_RISK") or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY_RISK (or GROQ_API_KEY) not found in environment variables")

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
    with httpx.Client(timeout=60.0) as client:
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
# Risk score helper
# ---------------------------------------------------------------------------

def _compute_risk_score(risks: list[dict]) -> int:
    """Compute a 0–100 composite risk score from a list of risk items."""
    if not risks:
        return 30
    weight_map = {"High": 3, "Medium": 2, "Low": 1}
    total_weight = 0
    max_weight = len(risks) * 9  # 3 (likelihood) * 3 (impact)
    for r in risks:
        l_w = weight_map.get(r.get("likelihood", "Low"), 1)
        i_w = weight_map.get(r.get("impact", "Low"), 1)
        total_weight += l_w * i_w
    score = int((total_weight / max_weight) * 100) if max_weight else 30
    return max(5, min(95, score))


def _overall_risk_label(score: int) -> str:
    if score >= 65:
        return "High"
    if score >= 35:
        return "Medium"
    return "Low"


# ---------------------------------------------------------------------------
# Fallback report
# ---------------------------------------------------------------------------

def _build_fallback_report(
    idea_data: dict,
    feasibility_report: dict,
    scope_report: dict,
    tech_stack_report: dict,
) -> dict:
    """Heuristic risk assessment when the LLM is unavailable."""
    domain = (idea_data.get("domain") or "web").lower()
    risks = _DOMAIN_RISKS.get(domain, _DEFAULT_RISKS)

    # Escalate likelihood if feasibility score is low
    feas_score = feasibility_report.get("overallScore", 70)
    if feas_score < 60:
        for r in risks:
            if r["likelihood"] == "Low":
                r = dict(r, likelihood="Medium")

    bottlenecks = feasibility_report.get("bottlenecks", [])
    constraints = scope_report.get("constraints", [])
    stack_reasoning = tech_stack_report.get("reasoning", [])
    verdict = feasibility_report.get("verdict", "Feasible with Guidance")

    risk_score = _compute_risk_score(risks)
    overall_label = _overall_risk_label(risk_score)

    top_blockers = [
        {
            "title": risks[0]["title"] if risks else "Undefined risk",
            "action": risks[0]["mitigation"].split(".")[0] + "." if risks else "Consult faculty.",
        },
        {
            "title": bottlenecks[0] if bottlenecks else (risks[1]["title"] if len(risks) > 1 else "Timeline overrun"),
            "action": "Break the deliverable into smaller milestones with bi-weekly demos.",
        },
        {
            "title": constraints[0] if constraints else "Team skill gaps",
            "action": "Schedule a 2-hour upskilling session per week aligned to the tech stack.",
        },
    ]

    reasoning = [
        f"Feasibility score is {feas_score}% ({verdict}), which sets the baseline risk tolerance for this project.",
        f"Domain is '{domain.upper()}' — standard risk patterns for this domain have been applied.",
        f"Scope constraints identified: {constraints[0] if constraints else 'limited timeline and team size'}.",
        f"Tech stack reasoning noted: {stack_reasoning[0][:80] if stack_reasoning else 'stack is appropriate for the domain.'}",
        "Mitigation strategies are calibrated to a student capstone timeline with typical 3–5 person teams.",
    ]

    return {
        "overallRisk": overall_label,
        "riskScore": risk_score,
        "summary": (
            f"This {domain.upper()} project carries {overall_label.lower()} overall risk based on the "
            f"feasibility score of {feas_score}% and {len(risks)} identified risk areas. "
            "The key concerns are technical complexity and timeline pressure, both of which are manageable "
            "with the mitigations described in the risk register below."
        ),
        "risks": risks,
        "topBlockers": top_blockers,
        "reasoning": reasoning,
        "aiGenerated": False,
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_risk_agent(
    idea_data: dict,
    feasibility_report: dict,
    scope_report: dict,
    tech_stack_report: dict,
) -> dict:
    """
    Run the Risk Assessment & Mitigation Agent.

    Args:
        idea_data:          dict with title, desc, domain, teamSize, durationDays, features.
        feasibility_report: Output dict from Agent 1 (Feasibility Agent).
        scope_report:       Output dict from Agent 2 (Scope Definition Agent).
        tech_stack_report:  Output dict from Agent 3 (Tech Stack Recommendation Agent).

    Returns:
        dict: Structured risk register with mitigations, reasoning chain, and traffic-light summary.
    """
    # ── Step 1: validate chained inputs ──────────────────────────────────────
    if not feasibility_report or not isinstance(feasibility_report, dict):
        print("[RISK AGENT] No feasibility report provided — using fallback.")
        return _build_fallback_report(idea_data, {}, scope_report or {}, tech_stack_report or {})

    if not scope_report or not isinstance(scope_report, dict):
        print("[RISK AGENT] No scope report provided — using fallback.")
        return _build_fallback_report(idea_data, feasibility_report, {}, tech_stack_report or {})

    if not tech_stack_report or not isinstance(tech_stack_report, dict):
        print("[RISK AGENT] No tech stack report provided — using fallback.")
        return _build_fallback_report(idea_data, feasibility_report, scope_report, {})

    # ── Step 2: check API key ────────────────────────────────────────────────
    api_key = os.getenv("GROQ_API_KEY_RISK") or os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[RISK AGENT] No GROQ API key found — using fallback.")
        return _build_fallback_report(idea_data, feasibility_report, scope_report, tech_stack_report)

    # ── Step 3: build prompt context from all upstream outputs ───────────────
    title        = idea_data.get("title", "Untitled Project")
    desc         = idea_data.get("desc", "No description provided")
    domain       = idea_data.get("domain", "web")
    team_size    = idea_data.get("teamSize", "3")
    duration_days = idea_data.get("durationDays", 30)
    features     = idea_data.get("features", [])

    features_text = (
        "\n".join(f"  - {f}" for f in features) if features else "Not specified"
    )

    # Serialize Agent 1 output
    feas_summary = (
        f"  Overall Score : {feasibility_report.get('overallScore', 'N/A')}%\n"
        f"  Verdict       : {feasibility_report.get('verdict', 'N/A')}\n"
        f"  Technical     : {feasibility_report.get('metrics', {}).get('technical', 'N/A')}%\n"
        f"  Timeline      : {feasibility_report.get('metrics', {}).get('timeline', 'N/A')}%\n"
        f"  Resource      : {feasibility_report.get('metrics', {}).get('resource', 'N/A')}%\n"
        f"  Skill Match   : {feasibility_report.get('metrics', {}).get('skillMatch', 'N/A')}%\n"
        f"  Bottlenecks   :\n" +
        "\n".join(f"    - {b}" for b in feasibility_report.get("bottlenecks", []))
    )

    # Serialize Agent 2 output
    scope_summary = (
        f"  Problem       : {scope_report.get('problemStatement', 'N/A')}\n"
        f"  Target Users  : {scope_report.get('targetUsers', 'N/A')}\n"
        f"  In Scope      :\n" +
        "\n".join(f"    - {s}" for s in scope_report.get("inScope", [])) + "\n"
        f"  Constraints   :\n" +
        "\n".join(f"    - {c}" for c in scope_report.get("constraints", [])) + "\n"
        f"  Assumptions   :\n" +
        "\n".join(f"    - {a}" for a in scope_report.get("assumptions", []))
    )

    # Serialize Agent 3 output
    stack = tech_stack_report.get("recommendedStack", {})
    stack_summary = (
        f"  Frontend  : {stack.get('frontend', 'N/A')}\n"
        f"  Backend   : {stack.get('backend', 'N/A')}\n"
        f"  Database  : {stack.get('database', 'N/A')}\n"
        f"  DevOps    : {stack.get('devops', 'N/A')}\n"
        f"  Tech Reasoning :\n" +
        "\n".join(f"    - {r}" for r in tech_stack_report.get("reasoning", []))
    )

    task_description = f"""
You are a senior project risk analyst specialising in student software engineering capstone projects.
You have already received outputs from three upstream AI agents — use them as your PRIMARY evidence base.

═══════════════════════════════════════════════════════════
PROJECT DETAILS
═══════════════════════════════════════════════════════════
- Title        : {title}
- Description  : {desc}
- Domain       : {domain}
- Team Size    : {team_size} members
- Duration     : {duration_days} days ({round(int(duration_days) / 7)} weeks approx.)
- Key Features :
{features_text}

═══════════════════════════════════════════════════════════
AGENT 1 OUTPUT — FEASIBILITY REPORT
═══════════════════════════════════════════════════════════
{feas_summary}

═══════════════════════════════════════════════════════════
AGENT 2 OUTPUT — SCOPE DEFINITION REPORT
═══════════════════════════════════════════════════════════
{scope_summary}

═══════════════════════════════════════════════════════════
AGENT 3 OUTPUT — TECH STACK REPORT
═══════════════════════════════════════════════════════════
{stack_summary}

═══════════════════════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════════════════════
Based on ALL the context above, produce a comprehensive risk assessment.

RISK CATEGORIES: Technical | Timeline | Resource | Scope | External

GUIDELINES:
- Identify 5–8 specific risks directly traceable to the upstream agent outputs.
- Every risk MUST have a concrete, actionable mitigation (not generic advice).
- Your reasoning MUST explicitly cite facts from Feasibility, Scope, or Tech Stack reports.
- topBlockers: the 3 most critical risks needing IMMEDIATE action.
- riskScore: 0–100 composite score (High ≥ 65, Medium 35–64, Low < 35).
- Prefer open-source, free-tier mitigation tools suitable for student teams.

You MUST respond with ONLY a valid JSON object (no extra text, no markdown) with exactly this structure:
{{
  "overallRisk": "High | Medium | Low",
  "riskScore": <integer 0-100>,
  "summary": "<2-3 sentence executive summary citing feasibility score and top risk area>",
  "risks": [
    {{
      "id": "R-01",
      "title": "<concise risk title>",
      "description": "<specific description referencing upstream report facts>",
      "category": "Technical | Timeline | Resource | Scope | External",
      "likelihood": "High | Medium | Low",
      "impact": "High | Medium | Low",
      "mitigation": "<specific, actionable steps with tools and timelines>",
      "owner": "Student Team | Faculty | Both"
    }}
  ],
  "topBlockers": [
    {{
      "title": "<blocker title>",
      "action": "<immediate first action to take this week>"
    }}
  ],
  "reasoning": [
    "<Step 1: cite feasibility score/bottlenecks and explain impact on risk profile>",
    "<Step 2: cite scope constraints and explain how they create timeline or resource risk>",
    "<Step 3: cite tech stack choices and explain technical risks introduced>",
    "<Step 4: synthesise overall risk rating with justification>",
    "<Step 5 (optional): explain how mitigations reduce the composite risk score>"
  ]
}}
"""

    # ── Step 4 & 5: Execute via CrewAI or direct Groq API ────────────────────
    parsed = None

    if HAS_CREWAI:
        try:
            llm = _get_llm()
            risk_agent = Agent(
                role="Senior Project Risk Analyst & Mitigation Strategist",
                goal=(
                    "Identify all significant risks in a student capstone project by carefully "
                    "analysing the upstream Feasibility, Scope, and Tech Stack reports, then "
                    "provide concrete mitigations and a step-by-step reasoning chain that "
                    "justifies each risk rating based on evidence from prior agents."
                ),
                backstory=(
                    "You are an experienced software project manager and risk analyst who has "
                    "guided hundreds of engineering capstone teams through project delivery. "
                    "You specialise in identifying blockers early and proposing practical, "
                    "low-cost mitigations that student teams can realistically implement. "
                    "You never issue vague risk warnings — every risk comes with an actionable "
                    "mitigation plan backed by evidence from the project's own analysis reports."
                ),
                llm=llm,
                verbose=False,
                allow_delegation=False,
            )

            risk_task = Task(
                description=task_description,
                expected_output=(
                    "A valid JSON object containing overallRisk, riskScore, summary, a risks array "
                    "(5–8 items with mitigations), topBlockers (3 items), and a reasoning chain — "
                    "all derived from the upstream Feasibility, Scope, and Tech Stack reports."
                ),
                agent=risk_agent,
            )

            crew = Crew(
                agents=[risk_agent],
                tasks=[risk_task],
                verbose=False,
            )
            result = crew.kickoff()
            parsed = _parse_json_from_text(str(result))
        except Exception as e:
            print(f"[RISK AGENT] Crew execution failed: {e}")
            traceback.print_exc()

    if not parsed and api_key:
        try:
            sys_prompt = (
                "You are a Senior Project Risk Analyst & Mitigation Strategist. "
                "You identify blockers in student engineering capstone projects and propose "
                "concrete mitigations strictly derived from upstream Feasibility, Scope, and "
                "Tech Stack agent reports. Your output is always structured JSON."
            )
            model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
            parsed = _call_groq_direct(sys_prompt, task_description, api_key, model_name)
        except Exception as e:
            print(f"[RISK AGENT] Groq direct API call failed: {e}")
            traceback.print_exc()

    # ── Validate minimum structure and normalise ─────────────────────────────
    if parsed and "risks" in parsed and "reasoning" in parsed:
        parsed["aiGenerated"] = True

        # Ensure riskScore is present and clamped
        if "riskScore" not in parsed:
            parsed["riskScore"] = _compute_risk_score(parsed.get("risks", []))
        parsed["riskScore"] = max(0, min(100, int(parsed["riskScore"])))

        # Ensure overallRisk is consistent with score
        if "overallRisk" not in parsed:
            parsed["overallRisk"] = _overall_risk_label(parsed["riskScore"])

        # Ensure topBlockers
        if "topBlockers" not in parsed or not parsed["topBlockers"]:
            risks = parsed.get("risks", [])
            parsed["topBlockers"] = [
                {"title": r.get("title", "Unknown"), "action": r.get("mitigation", "").split(".")[0] + "."}
                for r in risks[:3]
            ]

        # Ensure summary
        if "summary" not in parsed or not parsed["summary"]:
            parsed["summary"] = (
                f"This project carries {parsed['overallRisk'].lower()} overall risk "
                f"(score: {parsed['riskScore']}/100). "
                "Review the risk register below for specific mitigations."
            )

        # Normalise each risk item — ensure all required keys
        normalised_risks = []
        for i, r in enumerate(parsed.get("risks", []), start=1):
            normalised_risks.append({
                "id": r.get("id", f"R-{i:02d}"),
                "title": r.get("title", "Unspecified Risk"),
                "description": r.get("description", ""),
                "category": r.get("category", "Technical"),
                "likelihood": r.get("likelihood", "Medium"),
                "impact": r.get("impact", "Medium"),
                "mitigation": r.get("mitigation", "Consult faculty for guidance."),
                "owner": r.get("owner", "Student Team"),
            })
        parsed["risks"] = normalised_risks

        return parsed

    return _build_fallback_report(idea_data, feasibility_report, scope_report, tech_stack_report)
