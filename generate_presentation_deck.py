#!/usr/bin/env python3
"""
Generate a professional, high-aesthetic 16:9 widescreen PowerPoint presentation
for ProjectGuide-AI Capstone Project Defense (Infosys Springboard).
"""

import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# ─────────────────────────────────────────────
# Color Palette Constants (OLED Dark Theme)
# ─────────────────────────────────────────────
BG_COLOR = RGBColor(11, 15, 25)         # Deep slate/dark background
CARD_BG = RGBColor(24, 32, 54)          # Card container fill
CARD_BORDER = RGBColor(51, 65, 85)      # Slate border
ACCENT_PURPLE = RGBColor(99, 102, 241)  # Electric Indigo
ACCENT_CYAN = RGBColor(6, 182, 212)     # Cyan
ACCENT_GREEN = RGBColor(16, 185, 129)   # Emerald
ACCENT_AMBER = RGBColor(245, 158, 11)   # Amber
TEXT_WHITE = RGBColor(248, 250, 252)    # Crisp White
TEXT_MUTED = RGBColor(148, 163, 184)    # Slate Muted
TEXT_DIM = RGBColor(100, 116, 139)      # Dim Slate

FONT_TITLE = "Calibri"
FONT_BODY = "Calibri"


def create_blank_slide(prs):
    """Create a slide with blank layout and dark background."""
    blank_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank_layout)
    bg_shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height
    )
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = BG_COLOR
    bg_shape.line.color.rgb = BG_COLOR
    return slide


def add_header(slide, title_text, category_text="INFOSYS SPRINGBOARD CAPSTONE PROJECT"):
    """Add standardized category banner and slide title."""
    # Category tag
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
    tf_cat = cat_box.text_frame
    tf_cat.word_wrap = True
    p_cat = tf_cat.paragraphs[0]
    p_cat.text = category_text.upper()
    p_cat.font.name = FONT_BODY
    p_cat.font.size = Pt(10)
    p_cat.font.bold = True
    p_cat.font.color.rgb = ACCENT_CYAN

    # Main slide title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.7))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.name = FONT_TITLE
    p_title.font.size = Pt(24)
    p_title.font.bold = True
    p_title.font.color.rgb = TEXT_WHITE


def add_card(slide, left, top, width, height, title, content_items, accent_color=ACCENT_PURPLE):
    """Add a glassmorphic card container with structured text items."""
    # Outer box
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = CARD_BG
    shape.line.color.rgb = accent_color
    shape.line.width = Pt(1.5)

    # Text inside card
    pad = Inches(0.2)
    tbox = slide.shapes.add_textbox(left + pad, top + pad, width - (pad * 2), height - (pad * 2))
    tf = tbox.text_frame
    tf.word_wrap = True

    # Card Title
    p_title = tf.paragraphs[0]
    p_title.text = title
    p_title.font.name = FONT_TITLE
    p_title.font.size = Pt(15)
    p_title.font.bold = True
    p_title.font.color.rgb = accent_color
    p_title.space_after = Pt(8)

    # Content items
    for item in content_items:
        p = tf.add_paragraph()
        p.space_after = Pt(5)
        p.font.name = FONT_BODY
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE

        if isinstance(item, tuple):
            prefix, text = item
            run_p = p.add_run()
            run_p.text = "• " + prefix + ": "
            run_p.font.bold = True
            run_p.font.color.rgb = ACCENT_CYAN
            run_t = p.add_run()
            run_t.text = text
            run_t.font.color.rgb = TEXT_WHITE
        else:
            run = p.add_run()
            run.text = "• " + item
            run.font.color.rgb = TEXT_WHITE


def build_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # ─────────────────────────────────────────────
    # SLIDE 1: Title Slide
    # ─────────────────────────────────────────────
    slide1 = create_blank_slide(prs)

    # Central card container
    center_box = slide1.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.2), Inches(10.333), Inches(5.1)
    )
    center_box.fill.solid()
    center_box.fill.fore_color.rgb = CARD_BG
    center_box.line.color.rgb = ACCENT_PURPLE
    center_box.line.width = Pt(2)

    tb = slide1.shapes.add_textbox(Inches(2.0), Inches(1.5), Inches(9.333), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "INFOSYS SPRINGBOARD CAPSTONE PROJECT DEFENSE"
    p0.font.name = FONT_BODY
    p0.font.size = Pt(12)
    p0.font.bold = True
    p0.font.color.rgb = ACCENT_CYAN
    p0.space_after = Pt(14)

    p1 = tf.add_paragraph()
    p1.text = "ProjectGuide-AI"
    p1.font.name = FONT_TITLE
    p1.font.size = Pt(38)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.space_after = Pt(8)

    p2 = tf.add_paragraph()
    p2.text = "Autonomous Multi-Agent Academic Mentoring, Project Tracking & Faculty Governance Platform"
    p2.font.name = FONT_BODY
    p2.font.size = Pt(16)
    p2.font.color.rgb = ACCENT_PURPLE
    p2.space_after = Pt(24)

    p3 = tf.add_paragraph()
    p3.text = "• Domain: Agentic Artificial Intelligence & Full-Stack Cloud Architecture\n" \
              "• Core AI: Groq LLMs (LLaMA-3.3-70B), CrewAI Multi-Agent Sequential Pipelines\n" \
              "• Tech Stack: FastAPI, React 19, MongoDB Atlas, Docker Containerization\n" \
              "• Agile Framework: 8-Week Hybrid Scrumban (4 Sprints, 146 Story Points Delivered)"
    p3.font.name = FONT_BODY
    p3.font.size = Pt(12)
    p3.font.color.rgb = TEXT_MUTED

    # ─────────────────────────────────────────────
    # SLIDE 2: Problem Statement
    # ─────────────────────────────────────────────
    slide2 = create_blank_slide(prs)
    add_header(slide2, "The Academic Mentoring Dilemma: Problem Statement & Motivation")

    add_card(slide2, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "1. Student Ambiguity & Creep",
             [
                 ("Vague Scopes", "Students propose vague or overly ambitious projects without boundary definitions."),
                 ("Scope Creep", "Features multiply uncontrolled mid-semester, causing abandoned architectures."),
                 ("Stack Mismatch", "Students select frameworks mismatched with their skill proficiencies."),
                 ("Impact", "High failure rates and rushed, low-quality final year submissions.")
             ], ACCENT_AMBER)

    add_card(slide2, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "2. Faculty Supervision Bottleneck",
             [
                 ("High Ratio", "Faculty guides supervise 10–25 student teams simultaneously."),
                 ("Feedback Latency", "Manual proposal and report reviews experience 2–3 weeks delay."),
                 ("Zero Real-Time Visibility", "Guides discover team blockers only during mid-term or viva reviews."),
                 ("Administrative Drag", "Supervisors spend 70% of time verifying basic formatting over pedagogy.")
             ], ACCENT_PURPLE)

    add_card(slide2, Inches(8.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "3. The Institutional Gap",
             [
                 ("Fragmented Tools", "Projects tracked across disjoint WhatsApp groups, spreadsheets, and emails."),
                 ("No Audit Trail", "Absence of structured milestone sign-offs or versioned deliverables."),
                 ("Subjective Scoring", "Evaluations vary widely due to lack of objective feasibility benchmarks."),
                 ("Our Vision", "A centralized autonomous AI mentor that bridges students, guides, and departments.")
             ], ACCENT_CYAN)

    # ─────────────────────────────────────────────
    # SLIDE 3: Proposed Solution
    # ─────────────────────────────────────────────
    slide3 = create_blank_slide(prs)
    add_header(slide3, "The Innovation: Autonomous Multi-Agent Mentoring Ecosystem")

    add_card(slide3, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.3),
             "Autonomous Sequential AI Agent Chain",
             [
                 "Transforms raw 1-paragraph student ideas into structured engineering roadmaps in <10 seconds.",
                 "Sequential Chain-of-Thought: Feasibility ➔ Scope ➔ Tech Stack ➔ Risk Matrix ➔ Tracking."
             ], ACCENT_PURPLE)

    add_card(slide3, Inches(6.8), Inches(1.8), Inches(5.6), Inches(2.3),
             "Context-Aware AI Mentor & Voice Chat",
             [
                 "Interactive RAG chatbot with complete project state awareness (tech stack, scope, and tasks).",
                 "Hands-free voice query input powered by Web Speech API for seamless student interaction."
             ], ACCENT_CYAN)

    add_card(slide3, Inches(0.8), Inches(4.4), Inches(5.6), Inches(2.3),
             "Dynamic Re-Planning & Velocity Engine",
             [
                 "Tracks task completions and computes real-time milestone velocity and project health score.",
                 "Autonomous Re-Planner dynamically shifts downstream deadlines when students face roadblocks."
             ], ACCENT_GREEN)

    add_card(slide3, Inches(6.8), Inches(4.4), Inches(5.6), Inches(2.3),
             "Faculty Cohort Governance Hub",
             [
                 "Real-time cohort health analytics, at-risk student flags, and departmental broadcast alerts.",
                 "Official milestone review, timestamped sign-offs, and 1-click Academic Document drafting."
             ], ACCENT_AMBER)

    # ─────────────────────────────────────────────
    # SLIDE 4: System Architecture
    # ─────────────────────────────────────────────
    slide4 = create_blank_slide(prs)
    add_header(slide4, "System Architecture: Multi-Tier Cloud & Agent Infrastructure")

    add_card(slide4, Inches(0.8), Inches(1.8), Inches(2.7), Inches(4.8),
             "Tier 1: Presentation",
             [
                 ("Framework", "React 19 + Vite SPA"),
                 ("Design System", "Custom OLED Dark Theme"),
                 ("Components", "Tailored Modals, Risk Heatmaps, Milestone Roadmaps"),
                 ("Voice Engine", "Web Speech API (`webkitSpeechRecognition`)"),
                 ("Client Hosting", "Vercel / Render Static Site")
             ], ACCENT_CYAN)

    add_card(slide4, Inches(3.8), Inches(1.8), Inches(2.7), Inches(4.8),
             "Tier 2: API Gateway",
             [
                 ("Engine", "FastAPI (Python 3.11)"),
                 ("Data Validation", "Pydantic v2 strict schemas"),
                 ("Security", "JWT Tokens, Role-Based Access Control (RBAC)"),
                 ("Async Processing", "FastAPI BackgroundTasks"),
                 ("Diagnostics", "Startup DB Health & Heartbeat Endpoints")
             ], ACCENT_PURPLE)

    add_card(slide4, Inches(6.8), Inches(1.8), Inches(2.7), Inches(4.8),
             "Tier 3: Multi-Agent Swarm",
             [
                 ("Orchestration", "CrewAI + LangChain"),
                 ("Inference", "Groq API (LLaMA-3.3-70B)"),
                 ("Latency", "Sub-second token throughput"),
                 ("Chaining", "Sequential state propagation across all agents"),
                 ("Fault Tolerance", "Heuristic fallbacks on quota exhaustion")
             ], ACCENT_GREEN)

    add_card(slide4, Inches(9.8), Inches(1.8), Inches(2.7), Inches(4.8),
             "Tier 4: Persistence",
             [
                 ("Database", "MongoDB Atlas (Cloud Cluster)"),
                 ("Normalization", "Normalized schemas for projects, reports, milestones"),
                 ("Dual Sync", "Seamless fallback to local JSON persistence if offline"),
                 ("Indexing", "Optimized queries on student_id, faculty_id, project_id")
             ], ACCENT_AMBER)

    # ─────────────────────────────────────────────
    # SLIDE 5: Multi-Agent Pipeline
    # ─────────────────────────────────────────────
    slide5 = create_blank_slide(prs)
    add_header(slide5, "The Autonomous Multi-Agent Pipeline: Sequential Reasoning")

    add_card(slide5, Inches(0.8), Inches(1.8), Inches(11.7), Inches(4.8),
             "Autonomous Agent Chain-of-Thought Flow",
             [
                 ("Input Trigger", "Student submits project title, description, team size, duration, and self-assessed skill levels."),
                 ("Agent 1 (Feasibility Check)", "Analyzes technical viability, timeline feasibility, and skill match; outputs 0-100 score and bottlenecks."),
                 ("Agent 2 (Scope Governance)", "Ingests Feasibility output; formulates explicit In-Scope, Out-of-Scope boundaries to eliminate scope creep."),
                 ("Agent 3 (Tech Stack Recommender)", "Ingests Scope and Skills; recommends optimal frontend, backend, DB, and tools with trade-offs."),
                 ("Agent 4 (Risk Matrix Agent)", "Ingests Tech Stack and Scope; computes multi-vector risks across Technical, Deadline, and Operational vectors."),
                 ("Agent 5 (Milestone Tracking Agent)", "Synthesizes all reports into a 5-Phase structured execution roadmap with task-level acceptance criteria."),
                 ("Agent 6 (Dynamic Re-Planner)", "Monitors task completion velocity; dynamically recalculates schedules when milestones fall behind."),
                 ("Agent 7 (Academic Document Generator)", "Transforms verified project metadata into university-standard Project Synopsis and Methodology drafts."),
                 ("Agent 8 (Context-Aware AI Mentor)", "Answers ad-hoc technical queries with full context awareness of the student's project scope and stack.")
             ], ACCENT_CYAN)

    # ─────────────────────────────────────────────
    # SLIDE 6: Agent 1 & Agent 2 Deep Dive
    # ─────────────────────────────────────────────
    slide6 = create_blank_slide(prs)
    add_header(slide6, "Deep Dive: Agent 1 (Feasibility) & Agent 2 (Scope Definition)")

    add_card(slide6, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Agent 1: Feasibility Check Agent",
             [
                 ("Role", "Senior Academic Research & Technical Reviewer"),
                 ("Input", "Project title, domain, team size, duration, self-rated student skills (1-5)"),
                 ("Metrics Evaluated", "Technical complexity, timeline viability, resource availability, skill readiness"),
                 ("Outputs", "Overall Score (0-100), Verdict (Highly Feasible / Feasible with Guidance / Needs Scope Reduction)"),
                 ("Actionable Feedback", "Explicit list of identified project strengths, critical bottlenecks, and skill gaps"),
                 ("Resiliency", "Calculates deterministic baseline heuristics if Groq API hits rate limits")
             ], ACCENT_PURPLE)

    add_card(slide6, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Agent 2: Scope Definition Agent",
             [
                 ("Role", "Software Architect & Agile Product Manager"),
                 ("Input", "Project metadata + Upstream Agent 1 Feasibility Report"),
                 ("Anti-Creep Boundaries", "Explicitly delineates In-Scope requirements vs Out-of-Scope non-goals"),
                 ("Core Deliverables", "Problem statement, primary objectives, target user personas, key deliverables"),
                 ("Assumptions & Constraints", "Documented technical prerequisites, runtime limits, and team availability"),
                 ("Agent Chaining", "References Agent 1 bottlenecks to ensure risky features are flagged Out-of-Scope")
             ], ACCENT_CYAN)

    # ─────────────────────────────────────────────
    # SLIDE 7: Agent 3 & Agent 4 Deep Dive
    # ─────────────────────────────────────────────
    slide7 = create_blank_slide(prs)
    add_header(slide7, "Deep Dive: Agent 3 (Tech Stack) & Agent 4 (Risk Assessment)")

    add_card(slide7, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Agent 3: Tech Stack Recommender Agent",
             [
                 ("Role", "Full-Stack Technology Strategist"),
                 ("Input", "Scope boundaries + student team skill proficiencies"),
                 ("Recommendations", "Frontend, Backend, Database, Hosting, and DevOps tooling"),
                 ("Skill Match Analysis", "Evaluates team ramp-up time and provides learning curves per technology"),
                 ("Trade-Off Analysis", "Compares primary choices with alternatives (e.g. MongoDB vs PostgreSQL)"),
                 ("Learning Resources", "Curates targeted documentation and tutorials for student skill gaps")
             ], ACCENT_GREEN)

    add_card(slide7, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Agent 4: Multi-Vector Risk Assessment Agent",
             [
                 ("Role", "Cybersecurity, Infrastructure & Project Risk Analyst"),
                 ("Input", "Scope + Tech Stack + Team Profile"),
                 ("Risk Vectors", "Technical, Deadline/Timeline, Operational, Resource Dependencies"),
                 ("Scoring Matrix", "Probability (1-5) × Impact (1-5) ➔ Overall Risk Level (Low / Medium / High)"),
                 ("Mitigation Strategies", "Step-by-step preventative actions and early warning indicators"),
                 ("Contingency Plans", "Emergency fallback architectures if primary implementation hits a dead end")
             ], ACCENT_AMBER)

    # ─────────────────────────────────────────────
    # SLIDE 8: Agent 5 & Agent 6 Deep Dive
    # ─────────────────────────────────────────────
    slide8 = create_blank_slide(prs)
    add_header(slide8, "Deep Dive: Agent 5 (Milestones) & Agent 6 (Dynamic Re-Planner)")

    add_card(slide8, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Agent 5: Milestone & Sprint Planner Agent",
             [
                 ("Role", "Certified Scrum Master & Engineering Lead"),
                 ("Output", "Structured 5-Phase Milestone Roadmap spanning 60-day project lifecycle"),
                 ("Phase Structure", "Phase 1: Inception ➔ Phase 2: Architecture ➔ Phase 3: Core Dev ➔ Phase 4: Integration ➔ Phase 5: Defense"),
                 ("Granular Tasks", "Detailed checklist items with acceptance criteria per sprint"),
                 ("Progress Computation", "Automated percentage completion driven by student task check-offs"),
                 ("Verification", "Ready for faculty mentor inspection and official sign-off")
             ], ACCENT_PURPLE)

    add_card(slide8, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Agent 6: Dynamic Plan Re-Planner Agent",
             [
                 ("Role", "Adaptive Agile Delivery Coordinator"),
                 ("Trigger", "Student logs delay or task deadline exceeds estimated timeline window"),
                 ("Impact Analysis", "Identifies downstream dependency bottlenecks across subsequent phases"),
                 ("Schedule Adjustment", "Dynamically adjusts task dates and suggests scope de-scoping if necessary"),
                 ("Guidance", "Generates motivational tips and fast-track action items to regain lost velocity"),
                 ("Faculty Notification", "Updates team health score and alerts faculty guide to provide intervention")
             ], ACCENT_CYAN)

    # ─────────────────────────────────────────────
    # SLIDE 9: Agent 7 & Agent 8 Deep Dive
    # ─────────────────────────────────────────────
    slide9 = create_blank_slide(prs)
    add_header(slide9, "Deep Dive: Agent 7 (Doc Generator) & Agent 8 (AI Mentor Chat)")

    add_card(slide9, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Agent 7: Academic Document Generator",
             [
                 ("Role", "University Academic Coordinator & Technical Writer"),
                 ("Document Types", "Formal Project Synopsis, System Architecture, and Methodology Chapters"),
                 ("Compliance", "Follows standard university and UGC capstone submission formats"),
                 ("Content Synthesis", "Draws directly from approved Scope, Tech Stack, and Risk reports"),
                 ("1-Click Export", "Generates cleanly formatted Markdown and downloadable document drafts"),
                 ("Time Saved", "Eliminates 15+ hours of manual report compilation for student teams")
             ], ACCENT_GREEN)

    add_card(slide9, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Agent 8: Project-Aware AI Mentor & Voice Chat",
             [
                 ("Role", "Personal 24/7 AI Capstone Advisor"),
                 ("Context Memory", "Maintains full awareness of active project title, stack, scope, and progress"),
                 ("Hands-Free Voice", "Web Speech API microphone integration for natural spoken queries"),
                 ("Technical Guidance", "Assists with code architecture, debugging, database queries, and viva prep"),
                 ("Socratic Method", "Guides students to solve problems rather than writing entire solutions for them"),
                 ("History Persistence", "Preserves conversation threads across student login sessions")
             ], ACCENT_PURPLE)

    # ─────────────────────────────────────────────
    # SLIDE 10: Faculty Governance Hub
    # ─────────────────────────────────────────────
    slide10 = create_blank_slide(prs)
    add_header(slide10, "Faculty Governance Hub: Cohort Analytics & Milestone Sign-Offs")

    add_card(slide10, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "1. Cohort Health Analytics",
             [
                 ("Real-Time Dashboard", "Unified overview of all student capstone teams in a single screen."),
                 ("Health Metric", "Calculates composite score based on feasibility, velocity, and risks."),
                 ("At-Risk Indicators", "Automated flags identify stalled teams falling behind schedule."),
                 ("Department Reports", "Exportable summary statistics for HOD and accreditation reviews.")
             ], ACCENT_CYAN)

    add_card(slide10, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "2. Milestone Sign-Offs",
             [
                 ("Formal Review", "Faculty inspect student task submissions with proof of deliverables."),
                 ("Official Verification", "1-click digital sign-off with audit trail and timestamp."),
                 ("Feedback Loop", "Leave targeted revision comments for incomplete milestone phases."),
                 ("Evaluation Defense", "Generates verified progress logs for internal/external viva examiners.")
             ], ACCENT_PURPLE)

    add_card(slide10, Inches(8.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "3. Broadcast Communications",
             [
                 ("Cohort Alerts", "Post department-wide announcements, viva dates, and submission deadlines."),
                 ("Immediate Visibility", "Displays high-visibility alert banner on all student dashboards."),
                 ("Eliminates Fragmentation", "Replaces messy WhatsApp groups with institutional auditability."),
                 ("Accountability", "Ensures all students receive official guidelines synchronously.")
             ], ACCENT_AMBER)

    # ─────────────────────────────────────────────
    # SLIDE 11: Agile Delivery Methodology
    # ─────────────────────────────────────────────
    slide11 = create_blank_slide(prs)
    add_header(slide11, "Agile Delivery Methodology: Sprints, Velocity & Burndown")

    add_card(slide11, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "8-Week Hybrid Scrumban Execution",
             [
                 ("Sprint 1 (Weeks 1-2)", "Foundation, Auth, MongoDB Atlas, Agent 1 Feasibility ➔ 34 SP (100%)"),
                 ("Sprint 2 (Weeks 3-4)", "Agent 2 Scope, Agent 3 Stack, Agent 4 Risk Matrix ➔ 36 SP (95%)"),
                 ("Sprint 3 (Weeks 5-6)", "Agent 5 Milestones, Re-Planner, AI Mentor Voice Chat ➔ 40 SP (100%)"),
                 ("Sprint 4 (Weeks 7-8)", "Faculty Hub, Sign-offs, Doc Gen, E2E Testing & Deploy ➔ 36 SP (100%)"),
                 ("Total Delivered", "146 Story Points across 4 Sprints (98.6% Velocity Completion Rate)"),
                 ("Ceremonies", "Daily Standups, Sprint Planning, Backlog Refinement, and Retrospectives")
             ], ACCENT_GREEN)

    add_card(slide11, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Quality Engineering & Agile Governance",
             [
                 ("Definition of Ready", "Detailed user stories with Gherkin acceptance criteria (Given-When-Then)"),
                 ("Definition of Done", "Strict criteria: PEP8/ESLint, automated tests passing, OLED UI verified"),
                 ("Burndown Tracking", "Linear burndown across all 4 sprints with zero unresolved defects at release"),
                 ("Continuous Improvement", "Sprint retrospectives drove adoption of Groq API & optimistic UI updates"),
                 ("Risk Management", "Active Risk Register tracked and mitigated LLM rate limits & offline contingencies"),
                 ("Traceability", "100% Requirements Traceability Matrix linking User Stories to Test Cases")
             ], ACCENT_PURPLE)

    # ─────────────────────────────────────────────
    # SLIDE 12: Technology Stack & Technical Innovations
    # ─────────────────────────────────────────────
    slide12 = create_blank_slide(prs)
    add_header(slide12, "Technology Stack & Technical Innovations")

    add_card(slide12, Inches(0.8), Inches(1.8), Inches(2.7), Inches(4.8),
             "Frontend Tech",
             [
                 ("React 19", "Latest React features & hooks"),
                 ("Vite Bundler", "Sub-second HMR builds"),
                 ("Lucide Icons", "Crisp SVG vector icons"),
                 ("OLED Dark Theme", "Unified HSL design system"),
                 ("Web Speech API", "Browser-native voice engine")
             ], ACCENT_CYAN)

    add_card(slide12, Inches(3.8), Inches(1.8), Inches(2.7), Inches(4.8),
             "Backend Tech",
             [
                 ("FastAPI", "High-throughput async API"),
                 ("Python 3.11", "Modern typing & performance"),
                 ("Pydantic v2", "Strict schema validation"),
                 ("Uvicorn", "ASGI web server implementation"),
                 ("CORS Middleware", "Production-grade cross-origin")
             ], ACCENT_PURPLE)

    add_card(slide12, Inches(6.8), Inches(1.8), Inches(2.7), Inches(4.8),
             "AI & Agents",
             [
                 ("Groq API", "High-speed inference hardware"),
                 ("LLaMA-3.3-70B", "Flagship reasoning LLM"),
                 ("CrewAI", "Agent roles & sequential flows"),
                 ("LangChain", "Prompt templates & chains"),
                 ("Fallback Engine", "Deterministic rule heuristics")
             ], ACCENT_GREEN)

    add_card(slide12, Inches(9.8), Inches(1.8), Inches(2.7), Inches(4.8),
             "Cloud & DevOps",
             [
                 ("MongoDB Atlas", "Cloud database cluster"),
                 ("Docker", "Multi-stage fullstack image"),
                 ("Vercel", "SPA client deployment"),
                 ("Render / Railway", "Containerized cloud host"),
                 ("Git / GitHub", "Version control & CI readiness")
             ], ACCENT_AMBER)

    # ─────────────────────────────────────────────
    # SLIDE 13: Testing & Quality Assurance
    # ─────────────────────────────────────────────
    slide13 = create_blank_slide(prs)
    add_header(slide13, "Testing, Verification & Quality Assurance: 118 Tests Green")

    add_card(slide13, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "1. Unit & Schema Tests",
             [
                 ("Pydantic Validation", "Every agent response validated against rigid Pydantic models."),
                 ("Boundary Tests", "Scores verified in 0-100 range; non-empty strings and required lists."),
                 ("Enum Enforcements", "Strict verdicts ('Highly Feasible', 'Feasible with Guidance')."),
                 ("Heuristic Coverage", "Fallback response generators tested under network disconnection.")
             ], ACCENT_GREEN)

    add_card(slide13, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "2. Agent Chaining Tests",
             [
                 ("Sequential Integrity", "Agent 2 verifies receipt of Agent 1 Feasibility report."),
                 ("Stack Alignment", "Agent 3 verifies grounding in Agent 2 Scope and student skills."),
                 ("Risk Correlation", "Agent 4 verifies risk vectors match chosen tech stack components."),
                 ("State Isolation", "Ensures parallel student requests do not bleed idea states.")
             ], ACCENT_CYAN)

    add_card(slide13, Inches(8.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "3. E2E & Production Build",
             [
                 ("Pytest Suite", "118 unit and integration tests passing with 0 failures."),
                 ("FastAPI TestClient", "Simulates end-to-end HTTP request/response lifecycles."),
                 ("Vite Production Build", "Builds cleanly into minified, gzip-compressed bundle in <1s."),
                 ("Zero Regressions", "Automated regression testing verified on every git commit.")
             ], ACCENT_PURPLE)

    # ─────────────────────────────────────────────
    # SLIDE 14: Security, Resiliency & Fallback
    # ─────────────────────────────────────────────
    slide14 = create_blank_slide(prs)
    add_header(slide14, "Security, Resiliency & Offline Fallback Architecture")

    add_card(slide14, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Security & Access Governance",
             [
                 ("Role-Based Access Control", "Strict segregation between Student and Faculty user roles."),
                 ("JWT Token Authentication", "Encrypted session tokens protecting all private API endpoints."),
                 ("Data Isolation", "Projects, reports, and chat histories keyed by unique student ID."),
                 ("Environment Secret Hygiene", "API keys and database credentials strictly isolated in `.env`."),
                 ("Input Sanitization", "Pydantic guards against prompt injection and malicious payloads.")
             ], ACCENT_AMBER)

    add_card(slide14, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Resiliency & Offline Continuity",
             [
                 ("Dual-Persistence Architecture", "Cloud MongoDB Atlas primary with automatic local JSON fallback."),
                 ("Network Health Check", "FastAPI startup hooks ping DB connection with detailed diagnostics."),
                 ("LiteLLM Model Fallback", "Gracefully cascades to alternative models if primary Groq model throttles."),
                 ("Heuristic Engine", "Generates deterministic rule-based reports if LLM is completely unreachable."),
                 ("Optimistic UI Updates", "Frontend updates state immediately with background sync.")
             ], ACCENT_GREEN)

    # ─────────────────────────────────────────────
    # SLIDE 15: Quantitative Academic Impact
    # ─────────────────────────────────────────────
    slide15 = create_blank_slide(prs)
    add_header(slide15, "Quantitative Academic Impact & Scalability")

    add_card(slide15, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "1. Student Efficiency",
             [
                 ("Instant Feedback", "Reduced proposal vetting time from 14 days to <10 seconds."),
                 ("Scope Clarity", "Zero scope creep incidents by establishing explicit In/Out boundaries."),
                 ("Stack Confidence", "Eliminates trial-and-error framework selection with skill matching."),
                 ("Document Drafting", "Saved 15+ hours per team compiling project synopses.")
             ], ACCENT_CYAN)

    add_card(slide15, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "2. Faculty Productivity",
             [
                 ("70% Time Saved", "Automates routine validation so faculty focus on core research guidance."),
                 ("Cohort Oversight", "Supervise 50+ student teams effortlessly via unified health analytics."),
                 ("Early Warning", "At-risk flags catch failing teams 4 weeks before final examinations."),
                 ("Digital Audit Trail", "One-click milestone verification replaces manual paper sign-offs.")
             ], ACCENT_PURPLE)

    add_card(slide15, Inches(8.8), Inches(1.8), Inches(3.6), Inches(4.8),
             "3. Institutional Scalability",
             [
                 ("Zero Cloud Cost", "Free-tier MongoDB Atlas + Groq API + Vercel/Render architecture."),
                 ("Horizontal Scaling", "FastAPI async workers easily scale to thousands of concurrent users."),
                 ("Cross-Departmental", "Easily configured for CSE, IT, ECE, AI/DS, and Mech capstones."),
                 ("Accreditation Ready", "Generates complete outcome-based education (OBE) documentation.")
             ], ACCENT_GREEN)

    # ─────────────────────────────────────────────
    # SLIDE 16: Conclusion & Viva Defense
    # ─────────────────────────────────────────────
    slide16 = create_blank_slide(prs)
    add_header(slide16, "Conclusion, Future Horizons & Live Demonstration", "VIVA DEFENSE CONCLUSION")

    add_card(slide16, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Key Accomplishments Delivered",
             [
                 ("Fullstack Ecosystem", "Built and deployed end-to-end platform (React 19 + FastAPI + MongoDB)."),
                 ("Multi-Agent Intelligence", "Operationalized 8 autonomous AI agents using Groq LLaMA-3.3-70B."),
                 ("Agile Rigor", "Delivered 146 Story Points across 4 Sprints with comprehensive documentation."),
                 ("Robust Quality", "118 automated tests passing, 0 runtime errors, complete offline resiliency."),
                 ("Faculty Empowerment", "Delivered cohort analytics, milestone sign-offs, and broadcast alerts."),
                 ("Ready for Evaluation", "Complete turn-key repository with automated live demo scripts.")
             ], ACCENT_PURPLE)

    add_card(slide16, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Future Horizons & Live Demonstration",
             [
                 ("LMS Integration", "Native plugins for Canvas, Moodle, and Google Classroom."),
                 ("Automated Code Grading", "AST & Git commit analyzer to verify code quality against scope."),
                 ("Vector RAG Repository", "Semantic search across previous years' high-scoring capstones."),
                 ("Live Demo Navigation", "1. Student Onboarding ➔ 2. AI Agent Execution ➔ 3. AI Mentor Voice Chat ➔ 4. Faculty Cohort Governance Hub"),
                 ("Q&A Defense Session", "We invite the respected evaluation panel for comments & inquiries!"),
                 ("GitHub Repository", "github.com/Karthik-web1616/ProjectGuide-AI")
             ], ACCENT_CYAN)

    # Save presentation
    output_path = "ProjectGuide_AI_Capstone_Presentation.pptx"
    prs.save(output_path)
    print(f"[SUCCESS] Successfully generated presentation deck: {output_path}")
    return output_path


if __name__ == "__main__":
    build_deck()
