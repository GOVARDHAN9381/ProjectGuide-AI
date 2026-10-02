"""
CrewAI Project Milestone & Execution Tracking Agent (Agent 4 in the pipeline)

This agent completes the 4-agent academic mentoring pipeline:
  - Agent 1: Feasibility Agent (technical, timeline, resource, skill evaluation)
  - Agent 2: Scope Agent       (problem statement, in-scope, out-of-scope, deliverables)
  - Agent 3: Tech Stack Agent   (recommended stack, reasoning chain, tradeoffs)
  - Agent 4: Tracking Agent    (milestone decomposition, sprint planning, deliverables,
                               acceptance criteria, faculty review checkpoints, and progress metrics)

Inputs:
  - idea_data: title, desc, domain, teamSize, durationDays, techIdeas, features
  - student_skills: mapping of skill names -> proficiency (1-5)
  - feasibility_report: upstream output from Agent 1
  - scope_report: upstream output from Agent 2
  - tech_stack_report: upstream output from Agent 3
"""

import json
import os
import re
import traceback
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Groq compatibility patch
# ---------------------------------------------------------------------------
try:
    import crewai.llms.cache
    crewai.llms.cache.mark_cache_breakpoint = lambda message: message
except Exception:
    pass


# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------
def _get_llm():
    """Create Groq-backed LLM for CrewAI."""
    api_key = (
        os.getenv("GROQ_API_KEY_TRACKING")
        or os.getenv("GROQ_API_KEY_TECH_STACK")
        or os.getenv("GROQ_API_KEY_SCOPE")
        or os.getenv("GROQ_API_KEY")
    )
    if not api_key:
        raise ValueError("No Groq API key found in environment variables")

    from crewai import LLM
    model_name = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
    return LLM(
        model=model_name,
        api_key=api_key,
        temperature=0.3,
    )


# ---------------------------------------------------------------------------
# JSON parsing helper
# ---------------------------------------------------------------------------
def _parse_json_from_text(text: str) -> dict:
    """Extract and parse JSON from LLM output text safely."""
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
# Domain-specific milestone blueprints for fallback generation
# ---------------------------------------------------------------------------
_DOMAIN_MILESTONE_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
    "web": [
        {
            "phase": "Phase 1: Architecture & Data Modeling",
            "title": "System Architecture & Database Schema Design",
            "description": "Establish the project repository, set up database schemas, and define API contracts.",
            "deliverables": [
                "Entity Relationship (ER) diagram & MongoDB/SQL schemas",
                "Project repository scaffold with linting & environment config",
                "API contract specification (OpenAPI / Swagger)"
            ],
            "acceptanceCriteria": [
                "Database connects successfully with seeded initial schemas",
                "Repository is initialized with clear README and branching guidelines",
                "API endpoints documented with request/response models"
            ],
            "estimatedEffortHours": 24,
        },
        {
            "phase": "Phase 2: Authentication & Core Backend Services",
            "title": "Authentication Flow & Core Business Logic Implementation",
            "description": "Develop secure user authentication, role-based access control, and core database CRUD services.",
            "deliverables": [
                "JWT/OAuth authentication endpoints (Register, Login, Token Refresh)",
                "Core CRUD API endpoints for primary project entities",
                "Unit test suite for backend services with >= 70% coverage"
            ],
            "acceptanceCriteria": [
                "User registration and login return signed tokens with validation",
                "All primary entity endpoints return appropriate HTTP status codes",
                "Automated tests pass successfully in CI/CD pipeline"
            ],
            "estimatedEffortHours": 32,
        },
        {
            "phase": "Phase 3: Frontend UI & State Integration",
            "title": "Responsive Client Application & Full-Stack API Integration",
            "description": "Build the user interface components, implement state management, and integrate with backend APIs.",
            "deliverables": [
                "Responsive dashboard and user workflow interfaces",
                "API client integration with error handling & loading states",
                "Interactive data presentation and form validation"
            ],
            "acceptanceCriteria": [
                "UI operates smoothly across desktop and mobile screen viewports",
                "Frontend correctly displays server responses and handles error states gracefully",
                "Zero unhandled console errors during standard user journeys"
            ],
            "estimatedEffortHours": 36,
        },
        {
            "phase": "Phase 4: Optimization, Security & Faculty Review",
            "title": "End-to-End Testing, Documentation & Project Defense Prep",
            "description": "Conduct integration testing, optimize performance, draft the academic report, and prepare demo.",
            "deliverables": [
                "End-to-end user journey test suite",
                "Comprehensive academic project report (IEEE/College format)",
                "Live demo video / deployment URL and presentation slides"
            ],
            "acceptanceCriteria": [
                "System is deployed or runs locally with single command",
                "Project report includes methodology, results, and faculty sign-off sections",
                "Demo workflow successfully runs through all primary user scenarios"
            ],
            "estimatedEffortHours": 20,
        },
    ],
    "aiml": [
        {
            "phase": "Phase 1: Dataset Acquisition & Exploratory Analysis",
            "title": "Data Collection, Preprocessing & Baseline Exploration",
            "description": "Source and clean the training dataset, conduct exploratory data analysis, and establish evaluation benchmarks.",
            "deliverables": [
                "Cleaned and curated dataset with preprocessing pipeline",
                "Exploratory Data Analysis (EDA) notebook with visual distributions",
                "Benchmark metrics definition (F1-score, MAE, Accuracy, Precision/Recall)"
            ],
            "acceptanceCriteria": [
                "Missing values, duplicates, and outliers handled systematically",
                "Train/validation/test splits constructed with zero data leakage",
                "Clear documentation of data source licenses and sample counts"
            ],
            "estimatedEffortHours": 26,
        },
        {
            "phase": "Phase 2: Model Architecture & Training Pipeline",
            "title": "Model Training, Hyperparameter Tuning & Evaluation",
            "description": "Design the neural network / ML model pipeline, run training experiments, and track validation loss.",
            "deliverables": [
                "Reproducible training pipeline script or notebook",
                "Tuned model weights / serialized artifacts (.onnx, .pt, .pkl)",
                "Comparative performance evaluation table against baseline models"
            ],
            "acceptanceCriteria": [
                "Model achieves target accuracy/F1 benchmark defined in project scope",
                "Overfitting mitigated using regularization and cross-validation",
                "Experiment logs track loss curves across training epochs"
            ],
            "estimatedEffortHours": 38,
        },
        {
            "phase": "Phase 3: Inference Service & Interactive Demo Interface",
            "title": "Model Serving API & Web-Based Inference Demo",
            "description": "Wrap the trained model inside a fast inference REST/gRPC service and connect to a web interface.",
            "deliverables": [
                "Low-latency model inference endpoint (FastAPI / Flask)",
                "Interactive UI (Streamlit / React) for live predictions and file uploads",
                "Batch processing and model caching optimization"
            ],
            "acceptanceCriteria": [
                "Single-sample inference responds within acceptable latency (< 500ms)",
                "User interface allows uploading test inputs and visualizes predictions with confidence scores",
                "Input sanitization validates shape and type before feeding model"
            ],
            "estimatedEffortHours": 30,
        },
        {
            "phase": "Phase 4: Final Validation, Documentation & Capstone Defense",
            "title": "Model Explainability, Project Report & Final Presentation",
            "description": "Implement interpretability techniques (SHAP/Grad-CAM), compile capstone report, and prepare defense.",
            "deliverables": [
                "Model explainability visualizations (SHAP, feature importance, or saliency maps)",
                "Academic project dissertation report with literature review and results",
                "Capstone defense slide deck and demonstration script"
            ],
            "acceptanceCriteria": [
                "Model decisions explained with visual evidence in the report",
                "Report adheres to faculty formatting guidelines",
                "Live demo works smoothly on unseen test samples during presentation"
            ],
            "estimatedEffortHours": 22,
        },
    ],
    "mobile": [
        {
            "phase": "Phase 1: Wireframing & App Architecture Setup",
            "title": "UI/UX Flow, App State Structure & Client Scaffold",
            "description": "Design screens and user journeys, configure Flutter/React Native setup, and design offline storage.",
            "deliverables": [
                "High-fidelity UI mockups and navigational flow diagrams",
                "Mobile app repository initialized with modular folder architecture",
                "Local persistence schema (SQLite / Hive / Room)"
            ],
            "acceptanceCriteria": [
                "Mobile scaffold compiles on both target platforms (Android/iOS emulator)",
                "Navigation hierarchy and theme configurations established",
                "Local database operations verified with simple read/write tests"
            ],
            "estimatedEffortHours": 24,
        },
        {
            "phase": "Phase 2: Core Screens & API Connectivity",
            "title": "Screen Implementation & Cloud Backend Synchronization",
            "description": "Build primary application screens, integrate REST/Firebase backend, and handle network states.",
            "deliverables": [
                "Primary user journey screens with input validation",
                "REST/GraphQL service integration with offline caching layer",
                "Push notification or background sync handler"
            ],
            "acceptanceCriteria": [
                "Data synchronizes between mobile client and remote server",
                "App handles offline mode gracefully without crashing",
                "Smooth transitions and animations running at 60 FPS"
            ],
            "estimatedEffortHours": 36,
        },
        {
            "phase": "Phase 3: Device Features & Polish",
            "title": "Hardware Integration, Edge Cases & UI Optimization",
            "description": "Integrate camera/location/sensors, conduct device compatibility testing, and polish UI feedback.",
            "deliverables": [
                "Native hardware capability integrations (camera, GPS, biometrics)",
                "Error boundary handling and informative toast/dialog alerts",
                "Release APK / TestFlight bundle build"
            ],
            "acceptanceCriteria": [
                "Hardware permissions requested with clear rationale dialogs",
                "App tested on multiple screen sizes and densities",
                "No critical memory leaks or battery drain during extended usage"
            ],
            "estimatedEffortHours": 28,
        },
        {
            "phase": "Phase 4: Release Build, Documentation & Viva Presentation",
            "title": "Production Packaging, Capstone Report & Faculty Sign-Off",
            "description": "Generate signed binary builds, write user guide and project documentation, and present to faculty.",
            "deliverables": [
                "Signed release APK / App Bundle ready for faculty installation",
                "Complete capstone documentation with architecture and API appendices",
                "Slide deck and project walkthrough video"
            ],
            "acceptanceCriteria": [
                "Faculty can install and execute the app without developer intervention",
                "All major features documented with user screenshots",
                "Final presentation approved by academic project guide"
            ],
            "estimatedEffortHours": 20,
        },
    ],
    "iot": [
        {
            "phase": "Phase 1: Hardware Selection & Sensor Circuit Prototyping",
            "title": "Microcontroller Setup, Sensor Wiring & Circuit Simulation",
            "description": "Wire up sensors and microcontrollers, calibrate readings, and verify local serial output.",
            "deliverables": [
                "Hardware pinout diagram and circuit schematic (Fritzing/KiCad)",
                "Embedded firmware for sensor data acquisition and filtering",
                "BOM (Bill of Materials) and power consumption audit"
            ],
            "acceptanceCriteria": [
                "Sensors produce stable, calibrated readings across test intervals",
                "Firmware handles transient hardware disconnects without hanging",
                "Power requirements confirmed to match intended power source"
            ],
            "estimatedEffortHours": 28,
        },
        {
            "phase": "Phase 2: IoT Gateway & Cloud Telemetry Ingestion",
            "title": "MQTT / HTTP Communication & Time-Series Data Pipeline",
            "description": "Transmit telemetry over MQTT/HTTP to cloud broker, store in time-series database, and handle packet drops.",
            "deliverables": [
                "Lightweight telemetry publish script with retry and backoff",
                "MQTT broker configuration (Mosquitto / AWS IoT Core)",
                "Time-series database ingestion pipeline (InfluxDB / TimescaleDB)"
            ],
            "acceptanceCriteria": [
                "Sensor data packets successfully ingested with timestamps and device IDs",
                "Network interruption handled with local buffer and burst sync on reconnect",
                "End-to-end transmission latency below 2 seconds"
            ],
            "estimatedEffortHours": 32,
        },
        {
            "phase": "Phase 3: Real-Time Monitoring Dashboard & Alerts",
            "title": "Telemetry Visualization, Threshold Triggers & Remote Control",
            "description": "Build web dashboard for real-time telemetry graphs, trigger alert notifications, and support remote actuations.",
            "deliverables": [
                "Real-time sensor telemetry dashboard with charting",
                "Automated rule engine for anomaly detection and alert notifications (SMS/Email)",
                "Two-way actuation command protocol to toggle hardware states"
            ],
            "acceptanceCriteria": [
                "Dashboard live-updates via WebSockets or polling without lag",
                "Threshold breach triggers notification within 5 seconds",
                "Remote actuation command reliably reaches microcontroller"
            ],
            "estimatedEffortHours": 30,
        },
        {
            "phase": "Phase 4: Physical Enclosure, Stress Testing & Project Defense",
            "title": "Hardware Packaging, Reliability Testing & Final Report",
            "description": "Assemble physical prototype enclosure, run 48-hour continuous stress test, and draft academic report.",
            "deliverables": [
                "Assembled physical prototype enclosure / casing",
                "48-hour continuous reliability test report with zero dropped telemetry",
                "Academic project report and live hardware demonstration"
            ],
            "acceptanceCriteria": [
                "Hardware operates stably under continuous testing",
                "Wiring is clean, insulated, and secured inside protective casing",
                "Live demonstration runs successfully for faculty review committee"
            ],
            "estimatedEffortHours": 22,
        },
    ],
}

_DEFAULT_DOMAIN_TEMPLATE = _DOMAIN_MILESTONE_TEMPLATES["web"]


def _coerce_positive_int(value: Any, default: int) -> int:
    """Convert UI/LLM values to a safe positive integer."""
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return number if number > 0 else default


def _coerce_string_list(value: Any) -> List[str]:
    """Normalize list-like LLM values without leaking invalid schema data."""
    if isinstance(value, str):
        return [value] if value.strip() else []
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


# ---------------------------------------------------------------------------
# Fallback report generator
# ---------------------------------------------------------------------------
def _build_fallback_report(
    idea_data: dict,
    feasibility_report: Optional[dict] = None,
    scope_report: Optional[dict] = None,
    tech_stack_report: Optional[dict] = None,
) -> dict:
    """Intelligent heuristic tracking report when LLM is offline or unavailable."""
    title = idea_data.get("title") or "Academic Project"
    domain = (idea_data.get("domain") or "web").lower()
    duration_days = _coerce_positive_int(idea_data.get("durationDays"), 30)
    team_size = _coerce_positive_int(idea_data.get("teamSize"), 3)
    
    # Select template by domain
    base_template = _DOMAIN_MILESTONE_TEMPLATES.get(domain, _DEFAULT_DOMAIN_TEMPLATE)
    
    # Calculate timeframes per phase
    total_phases = len(base_template)
    days_per_phase = max(7, duration_days // total_phases)
    
    milestones: List[Dict[str, Any]] = []
    current_day = 1
    
    for idx, tpl in enumerate(base_template, start=1):
        end_day = min(duration_days, current_day + days_per_phase - 1)
        if idx == total_phases:
            end_day = duration_days
            
        start_week = max(1, (current_day + 6) // 7)
        end_week = max(start_week, (end_day + 6) // 7)
        
        week_label = f"Weeks {start_week}–{end_week}" if start_week != end_week else f"Week {start_week}"
        
        # Incorporate scope deliverables if available in phase 3 or 4
        deliverables = list(tpl["deliverables"])
        if scope_report and scope_report.get("keyDeliverables") and idx in (3, 4):
            custom_delivs = scope_report.get("keyDeliverables")[:2]
            for cd in custom_delivs:
                if cd not in deliverables:
                    deliverables.append(cd)
                    
        # Incorporate tech stack hints if available
        desc = tpl["description"]
        if tech_stack_report and tech_stack_report.get("recommendedStack") and idx in (1, 2):
            rec = tech_stack_report["recommendedStack"]
            if idx == 1 and rec.get("database"):
                desc += f" Primary database: {rec.get('database')}."
            elif idx == 2 and rec.get("backend"):
                desc += f" Backend services powered by {rec.get('backend')}."

        milestones.append({
            "id": idx,
            "phase": tpl["phase"],
            "weekLabel": week_label,
            "title": tpl["title"],
            "description": desc,
            "deliverables": deliverables,
            "acceptanceCriteria": list(tpl["acceptanceCriteria"]),
            "dependencies": [f"Milestone {idx-1}"] if idx > 1 else ["Project Kickoff & Git Repository"],
            "estimatedEffortHours": tpl.get("estimatedEffortHours", 25),
            "status": "in_progress" if idx == 1 else "pending",
            "completed": False,
            "completedAt": None,
        })
        current_day = end_day + 1

    total_weeks = max(4, round(duration_days / 7))
    hrs_per_student = round(sum(m["estimatedEffortHours"] for m in milestones) / (team_size * total_weeks), 1)

    faculty_checkpoints = [
        f"Checkpoint 1 (Week 1): Project Scope & Architecture Sign-Off with Guide",
        f"Checkpoint 2 (Week {max(2, total_weeks // 2)}): Mid-Term Working Prototype & Schema Review",
        f"Checkpoint 3 (Week {max(3, int(total_weeks * 0.8))}): Code Audit, Unit Tests & Security Evaluation",
        f"Checkpoint 4 (Week {total_weeks}): Final Capstone Defense, IEEE Paper / Project Report & Live Demo"
    ]

    immediate_actions = [
        f"Set up Git repository with main and development branches and invite all {team_size} team members.",
        f"Review the approved Scope and Tech Stack documents with your project guide.",
        f"Complete database schema modeling for Phase 1 and draft OpenAPI endpoint definitions."
    ]

    methodology = (
        f"Two-week Agile Sprints tailored for a {team_size}-student capstone over a {duration_days}-day "
        f"timeline. Includes weekly internal standup syncs and structured faculty demonstration checkpoints."
    )

    return {
        "overallProgress": 0,
        "totalMilestones": len(milestones),
        "milestonesDone": 0,
        "milestones": milestones,
        "sprintMethodology": methodology,
        "immediateActionItems": immediate_actions,
        "facultyCheckpoints": faculty_checkpoints,
        "trackingMetrics": {
            "pace": "Planning / On Schedule",
            "estimatedCompletionWeeks": total_weeks,
            "weeklyWorkloadPerStudent": f"{hrs_per_student} hrs/week",
            "targetEndDateDays": duration_days
        },
        "aiGenerated": False,
    }


# ---------------------------------------------------------------------------
# Main Agent Runner
# ---------------------------------------------------------------------------
def run_tracking_agent(
    idea_data: dict,
    feasibility_report: Optional[dict] = None,
    scope_report: Optional[dict] = None,
    tech_stack_report: Optional[dict] = None,
    student_skills: Optional[dict] = None,
) -> dict:
    """
    Run CrewAI Tracking Agent (Agent 4 in the pipeline).
    Chains upstream outputs from Feasibility (Agent 1), Scope (Agent 2), and Tech Stack (Agent 3).
    """
    student_skills = student_skills or {}
    feasibility_report = feasibility_report or {}
    scope_report = scope_report or {}
    tech_stack_report = tech_stack_report or {}

    try:
        llm = _get_llm()
    except Exception as e:
        print(f"[TRACKING AGENT] LLM init failed ({e}) — utilizing robust fallback generator.")
        return _build_fallback_report(idea_data, feasibility_report, scope_report, tech_stack_report)

    from crewai import Agent, Crew, Task

    tracking_agent = Agent(
        role="Senior Academic Project Agile Coach & Milestone Tracking Specialist",
        goal=(
            "Deconstruct student capstone project requirements, scope boundaries, and recommended tech stack "
            "into a realistic, chronological sprint roadmap with actionable milestones, concrete deliverables, "
            "faculty acceptance criteria, and progress monitoring metrics."
        ),
        backstory=(
            "You are a seasoned technical project director and academic mentor who has guided hundreds of engineering "
            "teams through successful project execution. You specialize in translating ambiguous scopes and technology choices "
            "into structured, time-boxed milestones, ensuring students stay on track and meet faculty evaluation milestones."
        ),
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    title = idea_data.get("title", "Academic Capstone Project")
    desc = idea_data.get("desc", "No description provided")
    domain = idea_data.get("domain", "web")
    team_size = idea_data.get("teamSize", "3")
    duration_days = _coerce_positive_int(idea_data.get("durationDays"), 30)
    features = _coerce_string_list(idea_data.get("features"))

    # Format upstream context
    feas_info = ""
    if feasibility_report and feasibility_report.get("overallScore") is not None:
        feas_info = (
            f"\nUPSTREAM AGENT 1 (Feasibility):\n"
            f"  - Score: {feasibility_report.get('overallScore')}%\n"
            f"  - Verdict: {feasibility_report.get('verdict')}\n"
            f"  - Bottlenecks: {', '.join(feasibility_report.get('bottlenecks', [])[:3])}"
        )

    scope_info = ""
    if scope_report and scope_report.get("problemStatement"):
        scope_info = (
            f"\nUPSTREAM AGENT 2 (Scope Definition):\n"
            f"  - Problem: {scope_report.get('problemStatement')}\n"
            f"  - In-Scope: {', '.join(scope_report.get('inScope', [])[:4])}\n"
            f"  - Out-of-Scope: {', '.join(scope_report.get('outOfScope', [])[:3])}\n"
            f"  - Key Deliverables: {', '.join(scope_report.get('keyDeliverables', [])[:3])}"
        )

    stack_info = ""
    if tech_stack_report and tech_stack_report.get("recommendedStack"):
        stk = tech_stack_report["recommendedStack"]
        stack_info = (
            f"\nUPSTREAM AGENT 3 (Technology Stack):\n"
            f"  - Frontend: {stk.get('frontend')}\n"
            f"  - Backend: {stk.get('backend')}\n"
            f"  - Database: {stk.get('database')}\n"
            f"  - APIs/Services: {stk.get('apis')}\n"
            f"  - DevOps/Testing: {stk.get('devops')}, {stk.get('testing')}"
        )

    task_prompt = f"""
Create a comprehensive milestone tracking and sprint execution roadmap for this engineering capstone project:

PROJECT DETAILS:
- Title: {title}
- Domain: {domain}
- Team Size: {team_size} students
- Timeline: {duration_days} days (approx. {round(int(duration_days) / 7)} weeks)
- Description: {desc}
- Key Features: {', '.join(features) if features else 'Standard domain features'}
{feas_info}
{scope_info}
{stack_info}

REQUIREMENTS:
1. Divide the project into 4 to 5 sequential, realistic milestone phases covering setup, core backend, frontend/integration, and final testing/documentation.
2. Align milestones with the recommended technology stack and in-scope deliverables.
3. Define 3-4 concrete deliverables per milestone that a faculty guide can inspect.
4. Provide specific acceptance criteria so students know when each milestone is complete.
5. Provide faculty review checkpoints and 3 immediate action items for week 1.

Return ONLY a valid JSON object matching this exact structure:
{{
  "sprintMethodology": "<1-2 sentence description of the agile methodology tailored to this project>",
  "milestones": [
    {{
      "id": 1,
      "phase": "Phase 1: <Phase Title>",
      "weekLabel": "Weeks 1–2",
      "title": "<Milestone Title>",
      "description": "<Detailed scope and engineering goals for this phase>",
      "deliverables": ["<Deliverable 1>", "<Deliverable 2>", "<Deliverable 3>"],
      "acceptanceCriteria": ["<Criterion 1>", "<Criterion 2>"],
      "dependencies": ["<Dependency or 'Project Kickoff'>"],
      "estimatedEffortHours": 24,
      "status": "in_progress",
      "completed": false
    }}
  ],
  "immediateActionItems": ["<Action 1>", "<Action 2>", "<Action 3>"],
  "facultyCheckpoints": [
    "Checkpoint 1: <Description & Week>",
    "Checkpoint 2: <Description & Week>",
    "Checkpoint 3: <Description & Week>",
    "Checkpoint 4: <Description & Week>"
  ],
  "trackingMetrics": {{
    "pace": "On Schedule",
    "estimatedCompletionWeeks": {round(int(duration_days) / 7)},
    "weeklyWorkloadPerStudent": "8–12 hrs/week",
    "targetEndDateDays": {duration_days}
  }}
}}
"""

    tracking_task = Task(
        description=task_prompt,
        expected_output="A valid JSON object containing milestones, sprintMethodology, immediateActionItems, facultyCheckpoints, and trackingMetrics.",
        agent=tracking_agent,
    )

    try:
        crew = Crew(
            agents=[tracking_agent],
            tasks=[tracking_task],
            verbose=False,
        )
        result = crew.kickoff()
        parsed = _parse_json_from_text(str(result))

        if parsed and parsed.get("milestones") and isinstance(parsed["milestones"], list):
            # Normalize milestones
            raw_milestones = parsed.get("milestones", [])
            normalized_milestones = []
            for idx, m in enumerate(raw_milestones, start=1):
                if not isinstance(m, dict):
                    m = {}
                normalized_milestones.append({
                    "id": _coerce_positive_int(m.get("id"), idx),
                    "phase": m.get("phase", f"Phase {idx}"),
                    "weekLabel": m.get("weekLabel", f"Week {idx}"),
                    "title": m.get("title", f"Milestone {idx}"),
                    "description": m.get("description", ""),
                    "deliverables": _coerce_string_list(m.get("deliverables")),
                    "acceptanceCriteria": _coerce_string_list(m.get("acceptanceCriteria")),
                    "dependencies": _coerce_string_list(m.get("dependencies")),
                    "estimatedEffortHours": _coerce_positive_int(m.get("estimatedEffortHours"), 24),
                    "status": "in_progress" if idx == 1 else "pending",
                    "completed": False,
                    "completedAt": None,
                })

            done_count = sum(1 for m in normalized_milestones if m.get("completed"))
            total_count = len(normalized_milestones)
            pct = round((done_count / total_count) * 100) if total_count > 0 else 0

            return {
                "overallProgress": pct,
                "totalMilestones": total_count,
                "milestonesDone": done_count,
                "milestones": normalized_milestones,
                "sprintMethodology": parsed.get("sprintMethodology", "Agile Sprints with faculty milestone checkpoints."),
                "immediateActionItems": parsed.get("immediateActionItems", []),
                "facultyCheckpoints": parsed.get("facultyCheckpoints", []),
                "trackingMetrics": parsed.get("trackingMetrics", {
                    "pace": "On Schedule",
                    "estimatedCompletionWeeks": round(duration_days / 7),
                    "weeklyWorkloadPerStudent": "10 hrs/week",
                    "targetEndDateDays": duration_days
                }),
                "aiGenerated": True,
            }
        else:
            print("[TRACKING AGENT] Parsing LLM output failed — falling back to domain template.")
            return _build_fallback_report(idea_data, feasibility_report, scope_report, tech_stack_report)

    except Exception as e:
        print(f"[TRACKING AGENT] Crew kickoff exception: {e}")
        traceback.print_exc()
        return _build_fallback_report(idea_data, feasibility_report, scope_report, tech_stack_report)
