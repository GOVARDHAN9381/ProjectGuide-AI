# 🚀 ProjectGuide-AI — Comprehensive Agile Project Documentation
### Infosys Springboard Capstone Project | Autonomous Multi-Agent Academic Mentoring Platform
> **Document Version:** 2.0.0 (Balanced Team Distribution Release)  
> **Agile Framework:** Hybrid Scrum-Kanban (Scrumban)  
> **Sprint Duration:** 2 Weeks per Sprint (4 Sprints = 8 Weeks / 60 Calendar Days)  
> **Target Velocity:** 37 Story Points / Sprint (Total: 148 SP)  
> **Repository:** [Karthik-web1616/ProjectGuide-AI](https://github.com/Karthik-web1616/ProjectGuide-AI.git)  
> **Associated Workbooks:**
> - [Agile Documentation Workbook (XLSX)](file:///c:/infosys%20project/ai-mentor-platform/ProjectGuide_AI_Agile_Documentation.xlsx) (Also synced to [Downloads](file:///C:/Users/ngova/Downloads/Agile_Template_v0.1.xlsx))
> - [Defect Tracker Workbook (XLSX)](file:///c:/infosys%20project/ai-mentor-platform/ProjectGuide_AI_Defect_Tracker.xlsx) (Also synced to [Downloads](file:///C:/Users/ngova/Downloads/Defect_Tracker%20Template_v0.1.xlsx))
> - [Unit Test Plan Workbook (XLSX)](file:///c:/infosys%20project/ai-mentor-platform/ProjectGuide_AI_Unit_Test_Plan.xlsx) (Also synced to [Downloads](file:///C:/Users/ngova/Downloads/Unit_Test_Plan_v0.1.xlsx))

---

## 📑 Table of Contents
1. [Executive Agile Charter](#1-executive-agile-charter)
2. [Team Members, Role Allocation & RACI Matrix](#2-team-members-role-allocation--raci-matrix)
3. [Agile Ceremonies & Working Agreements](#3-agile-ceremonies--working-agreements)
4. [Definition of Ready (DoR) & Definition of Done (DoD)](#4-definition-of-ready-dor--definition-of-done-dod)
5. [Product Vision & 4-Sprint Release Roadmap](#5-product-vision--4-sprint-release-roadmap)
6. [Product Backlog (20 Granular User Stories)](#6-product-backlog-20-granular-user-stories)
7. [Sprint Execution Logs (Sprints 1 through 4)](#7-sprint-execution-logs-sprints-1-through-4)
8. [Sprint Burndown, Velocity & Metrics Analysis](#8-sprint-burndown-velocity--metrics-analysis)
9. [Daily Standup Meeting Logs](#9-daily-standup-meeting-logs)
10. [Sprint Retrospectives (All 4 Members across Sprints 1–4)](#10-sprint-retrospectives-all-4-members-across-sprints-14)
11. [Defect Tracking Register](#11-defect-tracking-register)
12. [Unit Test Plan & Verification Matrix](#12-unit-test-plan--verification-matrix)
13. [Agile Risk Register & Impediment Log](#13-agile-risk-register--impediment-log)
14. [Requirements Traceability Matrix (RTM)](#14-requirements-traceability-matrix-rtm)

---

## 1. Executive Agile Charter

### 1.1 Project Overview & Problem Statement
Collegiate computer science and engineering capstone projects are the culmination of undergraduate training, yet academic institutions face systemic challenges:
1. **Unrealistic & Vague Scopes**: Students choose over-ambitious or trivial projects, resulting in mid-semester abandoned architectures.
2. **Delayed Faculty Guidance**: Faculty guides supervise 10–25 student teams simultaneously, leading to feedback latency of 2–3 weeks.
3. **Absence of Real-Time Health Visibility**: Mentors discover team blockers, missing deliverables, and technical debt only during final evaluations.

**ProjectGuide-AI** solves this through an autonomous multi-agent ecosystem that accelerates student onboarding, delivers instant AI-driven feasibility and risk vetting, provides continuous sprint tracking, and empowers faculty with real-time cohort governance.

### 1.2 Agile Methodology Justification
A **Hybrid Scrum-Kanban (Scrumban)** methodology was adopted:
- **Scrum Cadence**: Fixed time-boxed 2-week iterations provide clear milestones for deliverables (Foundation $\rightarrow$ Scope & Risk $\rightarrow$ Milestones & Chat $\rightarrow$ Faculty Hub & Release).
- **Kanban Flexibility**: Continuous flow for prompt engineering, AI agent tuning, bug fixing, and LLM rate-limit handling without disrupting fixed sprint commitments.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                   ProjectGuide-AI 8-Week Agile Cadence                         │
├───────────────────┬───────────────────┬───────────────────┬────────────────────┤
│     Sprint 1      │     Sprint 2      │     Sprint 3      │      Sprint 4      │
│   (Weeks 1-2)     │   (Weeks 3-4)     │   (Weeks 5-6)     │    (Weeks 7-8)     │
├───────────────────┼───────────────────┼───────────────────┼────────────────────┤
│ • Auth & Security │ • Scope Agent     │ • Milestone Agent │ • Faculty Hub      │
│ • Database Init   │ • Tech Stack Ag   │ • Dynamic Replann │ • Document Gen     │
│ • Feasibility Ag  │ • Risk Matrix Ag  │ • AI Mentor Chat  │ • E2E Tests (118)  │
│ • Faculty Wirefram│ • Agent Chaining  │ • Voice Engine    │ • Docker & Deploy  │
└───────────────────┴───────────────────┴───────────────────┴────────────────────┘
```

---

## 2. Team Members, Role Allocation & RACI Matrix

### 2.1 Team Members & Balanced Role Distribution
To ensure balanced ownership, workload is distributed equally across all 4 team members (~25% each), ensuring that no single member bears disproportionate priority or load:

| Team Member | Primary Agile Role | Specialized Functional Domain | Core Repository Modules / Files |
|---|---|---|---|
| **Karthik** | **Backend Lead** | Backend Architecture, REST APIs, Security, LLM Rate Limiting & DevOps | [`backend/main.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/main.py), [`backend/routers/auth.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/auth.py), [`backend/agents/litellm_patch.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/litellm_patch.py), [`backend/agents/tracking_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tracking_agent.py), [`Dockerfile`](file:///c:/infosys%20project/ai-mentor-platform/Dockerfile) |
| **Govardhan** | **Frontend & AI Agents Lead** | React 19 Client Architecture, Student Dashboard, Chatbot Voice & Agents 1-2 | [`frontend/src/pages/Onboarding.jsx`](file:///c:/infosys%20project/ai-mentor-platform/frontend/src/pages/Onboarding.jsx), [`frontend/src/pages/StudentDashboard.jsx`](file:///c:/infosys%20project/ai-mentor-platform/frontend/src/pages/StudentDashboard.jsx), [`frontend/src/components/ChatbotPanel.jsx`](file:///c:/infosys%20project/ai-mentor-platform/frontend/src/components/ChatbotPanel.jsx), [`backend/agents/feasibility_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/feasibility_agent.py), [`backend/agents/scope_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/scope_agent.py) |
| **Supriya** | **Faculty Dashboard & AI Agents Lead** | Faculty Cohort Analytics, Sign-offs, Risk Heatmap & Agents 3-4 + Replanner | [`frontend/src/pages/FacultyDashboard.jsx`](file:///c:/infosys%20project/ai-mentor-platform/frontend/src/pages/FacultyDashboard.jsx), [`frontend/src/components/RiskHeatmapMatrix.jsx`](file:///c:/infosys%20project/ai-mentor-platform/frontend/src/components/RiskHeatmapMatrix.jsx), [`backend/agents/tech_stack_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tech_stack_agent.py), [`backend/agents/risk_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/risk_agent.py), [`backend/timeline_planning_agent/`](file:///c:/infosys%20project/ai-mentor-platform/backend/timeline_planning_agent/) |
| **Hemapriya** | **Database & Project Documentation Lead** | MongoDB Atlas, Schema Normalization, AI Doc Gen Agent (Agent 7) & Agile Artifacts | [`backend/database.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/database.py), [`backend/seed_all_data_to_mongo.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/seed_all_data_to_mongo.py), [`backend/agents/doc_generator_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/doc_generator_agent.py), `AGILE_DOCUMENTATION.md`, Excel Workbooks |

### 2.2 RACI Matrix
*(**R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed)*

| Project Deliverable / Activity | Karthik (Backend) | Govardhan (Frontend/AI) | Supriya (Faculty/AI) | Hemapriya (DB/PD) | Faculty Guide |
|---|:---:|:---:|:---:|:---:|:---:|
| System Architecture & API Design | **A / R** | **C** | **C** | **C** | **I** |
| JWT Authentication & Session Security | **A / R** | **C** | **I** | **C** | **I** |
| Student Onboarding UI & Skill Matrix | **I** | **A / R** | **C** | **C** | **I** |
| Feasibility & Scope AI Agents (Agents 1 & 2) | **C** | **A / R** | **C** | **C** | **I** |
| Tech Stack & Risk Matrix Agents (Agents 3 & 4) | **C** | **C** | **A / R** | **C** | **I** |
| Interactive Risk Heatmap 5x5 Grid UI | **I** | **C** | **A / R** | **I** | **I** |
| Dynamic Replanner & Delay Detection | **C** | **C** | **A / R** | **C** | **I** |
| Faculty Cohort Dashboard & Milestone Sign-Off | **C** | **I** | **A / R** | **C** | **A / C** |
| MongoDB Atlas Clusters & Schema Normalization | **C** | **C** | **C** | **A / R** | **I** |
| Chatbot Memory Indexing & Data Sync | **C** | **C** | **I** | **A / R** | **I** |
| Academic Doc Gen Agent (Synopsis & Methodology) | **I** | **C** | **C** | **A / R** | **I** |
| Agile Sheets, Defect Tracker & Unit Test Plan | **C** | **C** | **C** | **A / R** | **A / C** |
| Docker Multi-stage Build & Cloud Deployment | **A / R** | **C** | **I** | **I** | **I** |
| End-to-End Test Suite Execution (118 Tests) | **A / R** | **R** | **R** | **R** | **I** |

---

## 3. Agile Ceremonies & Working Agreements

| Ceremony | Cadence | Duration | Purpose | Output |
|---|---|---|---|---|
| **Sprint Planning** | Day 1 of Sprint | 90 mins | Select backlog items, size stories, commit to Sprint Goal | Sprint Backlog, Sprint Goal |
| **Daily Standup** | Mon–Fri (Sync / Async) | 15 mins | Yesterday's progress, today's plan, impediments | Updated Kanban board, Blocker log |
| **Backlog Refinement** | Mid-Sprint (Day 6) | 45 mins | Decompose epics, groom upcoming stories, assign estimates | Refined Product Backlog |
| **Sprint Review / Demo** | Last Day of Sprint | 60 mins | Demonstrate working increments to Faculty Guide | Feedback log, Accepted stories |
| **Sprint Retrospective** | Last Day of Sprint | 45 mins | Inspect team process: Start, Stop, Continue Doing | Actionable improvement tasks |

### 3.1 Estimation Technique
- **Story Points (SP)** based on the modified **Fibonacci Sequence**: `1, 2, 3, 5, 8, 13`.
- **Target Velocity**: ~37 Story Points per 2-week Sprint. Total Project Commitment: **148 Story Points**.

---

## 4. Definition of Ready (DoR) & Definition of Done (DoD)

### 4.1 Definition of Ready (DoR)
A User Story is marked **Ready for Sprint Backlog** when:
- [x] Written in standard format: *"As a [persona], I want [capability], so that [benefit]"*.
- [x] Clear, testable Acceptance Criteria defined in Gherkin syntax (`Given-When-Then`).
- [x] UI mockups, interaction specs, or API schema contracts are defined.
- [x] Sized using Fibonacci story points (must be $\le 8$ SP; larger stories are split).
- [x] External dependencies (Groq API, MongoDB Atlas, authentication tokens) identified.

### 4.2 Definition of Done (DoD)
A User Story is marked **Done** when:
- [x] Code is implemented adhering to PEP8 (Python) and ESLint/Prettier (React).
- [x] Unit and integration tests written and passing (`pytest` / component tests).
- [x] Pydantic request/response schemas validated; error handling covers edge cases.
- [x] LLM fallback heuristics implemented for graceful degradation on API throttling.
- [x] Responsive OLED Dark theme styling verified across desktop and mobile viewports.
- [x] Peer code review completed with zero unresolved discussions.
- [x] Code merged to `main` and verified in local/staging build.

---

## 5. Product Vision & 4-Sprint Release Roadmap

### 5.1 Product Vision Statement
> *"For computer science students and faculty mentors who struggle with project ambiguity and supervision overhead, **ProjectGuide-AI** is an autonomous multi-agent platform that instantly transforms raw student ideas into validated, risk-assessed, sprint-ready milestones while providing faculty with real-time cohort visibility. Unlike manual reviews or generic chatbots, our platform provides sequential agentic chain-of-thought analysis, automated academic document generation, and structured faculty governance."*

### 5.2 Release Roadmap
```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         RELEASE ROADMAP                                        │
├─────────────────────────┬──────────────────────────────┬───────────────────────┤
│ Release 1.0 (MVP)       │ Release 1.1 (Agentic Flow)   │ Release 2.0 (Gov Hub) │
│ Sprint 1 - Sprint 2     │ Sprint 3                     │ Sprint 4              │
├─────────────────────────┼──────────────────────────────┼───────────────────────┤
│ • Student & Faculty Auth│ • 5-Phase Milestone Generator│ • Faculty Cohort Hub  │
│ • Project Onboarding    │ • Interactive Roadmap View   │ • Broadcast System    │
│ • Feasibility Agent     │ • Dynamic Plan Re-Planner    │ • Academic Doc Gen    │
│ • Scope & Anti-Creep    │ • Context AI Mentor Chatbot  │ • One-Click PDF/MD    │
│ • Tech Stack & Risk     │ • Web Speech Voice Engine    │ • Docker & Deployment │
│ • MongoDB Normalization │ • Real-Time Progress Engine  │ • 118 E2E Tests Pass  │
└─────────────────────────┴──────────────────────────────┴───────────────────────┘
```

---

## 6. Product Backlog (20 Granular User Stories)

Every team member owns exactly **5 User Stories** across the lifecycle, totaling **37 SP** per member on average:

| US ID | Story Summary & User Persona | MoSCoW | SP | Planned | Actual | Assignee | Status |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **US-01** | Student/Faculty JWT Authentication & Role-Based Access Control | MUST HAVE | 5 | S1 | S1 | **Karthik** | 3- Completed |
| **US-02** | Interactive Project Onboarding Wizard & 1-5 Skill Rating Sliders | MUST HAVE | 5 | S1 | S1 | **Govardhan** | 3- Completed |
| **US-03** | MongoDB Atlas Cloud Database Setup & Schema Normalization | MUST HAVE | 5 | S1 | S1 | **Hemapriya** | 3- Completed |
| **US-04** | Feasibility Analysis Agent (Agent 1) with 0-100 Viability Scoring | MUST HAVE | 8 | S1 | S1 | **Govardhan** | 3- Completed |
| **US-05** | Faculty Dashboard Layout Shell & Cohort Evaluation Metrics Schema | MUST HAVE | 5 | S1 | S1 | **Supriya** | 3- Completed |
| **US-06** | Scope Definition & Anti-Creep Agent (Agent 2) with Boundary Limits | MUST HAVE | 8 | S2 | S2 | **Govardhan** | 3- Completed |
| **US-07** | Sequential Agent Pipeline Orchestration & LiteLLM Fallback Engine | MUST HAVE | 8 | S2 | S2 | **Karthik** | 3- Completed |
| **US-08** | Adaptive Tech Stack Recommender Agent (Agent 3) & Learning Curves | MUST HAVE | 7 | S2 | S2 | **Supriya** | 3- Completed |
| **US-09** | Multi-Vector Risk Assessment Agent (Agent 4) & 5x5 Heatmap Grid | MUST HAVE | 8 | S2 | S2 | **Supriya** | 3- Completed |
| **US-10** | Database Persistence for Agent Reports & Local JSON Fallback Sync | MUST HAVE | 6 | S2 | S2 | **Hemapriya** | 3- Completed |
| **US-11** | 5-Phase Milestone & Timeline Generator Agent (Agent 5) | MUST HAVE | 8 | S3 | S3 | **Karthik** | 3- Completed |
| **US-12** | Interactive Student Roadmap & Sprint Timeline View with Task Checkboxes | MUST HAVE | 8 | S3 | S3 | **Govardhan** | 3- Completed |
| **US-13** | Dynamic Plan Replanner Agent & Deadline Delay Detection Engine | MUST HAVE | 8 | S3 | S3 | **Supriya** | 3- Completed |
| **US-14** | Project-Aware AI Mentor Chatbot with Web Speech Voice Input | SHOULD HAVE | 7 | S3 | S3 | **Govardhan** | 3- Completed |
| **US-15** | Chatbot Memory Session Persistence & MongoDB Query Indexing (<50ms) | MUST HAVE | 6 | S3 | S3 | **Hemapriya** | 3- Completed |
| **US-16** | Faculty Cohort Analytics, At-Risk Student Flags & Digital Sign-off | MUST HAVE | 8 | S4 | S4 | **Supriya** | 3- Completed |
| **US-17** | Academic Document Generator Agent (Agent 7 - Synopsis & Methodology) | SHOULD HAVE | 8 | S4 | S4 | **Hemapriya** | 3- Completed |
| **US-18** | Multi-Stage Docker Build, CORS Security & Cloud Deployment Pipeline | MUST HAVE | 7 | S4 | S4 | **Karthik** | 3- Completed |
| **US-19** | Comprehensive E2E Regression Test Suite (118 Tests Passing) | MUST HAVE | 8 | S4 | S4 | **Karthik** | 3- Completed |
| **US-20** | Capstone Requirements Traceability Matrix, Defect Log & Viva Deck | MUST HAVE | 6 | S4 | S4 | **Hemapriya** | 3- Completed |

---

## 7. Sprint Execution Logs (Sprints 1 through 4)

### 🏃 Sprint 1: Architecture Inception, Authentication & Feasibility Engine
- **Duration**: Weeks 1–2 (Nov 4, 2024 – Nov 17, 2024)
- **Sprint Goal**: Establish fullstack foundation, set up MongoDB Atlas, implement role-based authentication, and deliver live Feasibility Agent (Agent 1).
- **Committed SP**: 34 SP | **Completed SP**: 34 SP (100% Velocity)
- **Task Breakdown by Team Member**:
  - **Karthik (Backend)**:
    - `TS-101`: Implement FastAPI JWT token authentication & bcrypt hashing (8h, Coding)
    - `TS-102`: Build `/auth/login` and `/auth/register` endpoints with Pydantic validation (6h, Coding)
    - `TS-103`: Write pytest test suite for auth routes and token expiration (5h, Unit Test)
    - `TS-104`: FastAPI core setup, CORS middleware, and error handlers (4h, Build)
  - **Govardhan (Frontend & AI Agents)**:
    - `TS-105`: Design React 19 Onboarding multi-step wizard & domain selection (7h, Design)
    - `TS-106`: Build 1-5 slider skill assessment matrix and proposal input state (6h, Coding)
    - `TS-107`: Develop Feasibility Agent prompt chain and 0-100 scoring algorithm (8h, Coding)
    - `TS-108`: Create Feasibility Report Modal component in React with OLED styling (4h, Coding)
  - **Supriya (Faculty Dashboard & AI Agents)**:
    - `TS-109`: Wireframe Faculty Dashboard layout, navigation bar, review shell (6h, Design)
    - `TS-110`: Implement Faculty React view with initial student project cards (7h, Coding)
    - `TS-111`: Define faculty evaluation criteria and cohort health metrics schemas (5h, Analysis)
    - `TS-112`: Research LLM prompt engineering techniques for tech stack heuristics (4h, Analysis)
  - **Hemapriya (Database & PD)**:
    - `TS-113`: Set up MongoDB Atlas cluster, network IP access, and URI security (6h, Build)
    - `TS-114`: Design MongoDB normalized schemas for Users, Projects, Analysis Reports (7h, Design)
    - `TS-115`: Build initial database seeding and connection health check script (5h, Coding)
    - `TS-116`: Draft Sprint 1 Agile Project Charter, RACI Matrix, and DoR/DoD documents (5h, Documentation)

---

### 🏃 Sprint 2: Scope Governance, Tech Stack Selection & Multi-Vector Risk Assessment
- **Duration**: Weeks 3–4 (Nov 18, 2024 – Dec 01, 2024)
- **Sprint Goal**: Deploy Agent 2 (Scope), Agent 3 (Tech Stack), Agent 4 (Risk Matrix), establish sequential chaining, and integrate student report modals.
- **Committed SP**: 38 SP | **Completed SP**: 38 SP (100% Velocity)
- **Task Breakdown by Team Member**:
  - **Karthik (Backend)**:
    - `TS-201`: Build sequential agent execution pipeline in `agent_service.py` (8h, Coding)
    - `TS-202`: Implement LiteLLM retry backoff wrapper (`litellm_patch.py`) for rate limits (6h, Coding)
    - `TS-203`: Develop REST endpoints for `/scope`, `/tech_stack`, `/risk` (6h, Coding)
    - `TS-204`: Write integration tests for multi-agent sequential pipeline execution (5h, Integration Test)
  - **Govardhan (Frontend & AI Agents)**:
    - `TS-205`: Develop Scope Definition Agent (Agent 2) with In-Scope vs Out-of-Scope limits (8h, Coding)
    - `TS-206`: Create Scope Report UI modal with categorized deliverables & MVP criteria (6h, Coding)
    - `TS-207`: Chain Feasibility report outputs into Scope Agent input payload context (5h, Integration Test)
    - `TS-208`: Integrate responsive layout fixes and OLED theme consistency across modals (4h, Design)
  - **Supriya (Faculty Dashboard & AI Agents)**:
    - `TS-209`: Build Tech Stack Recommender Agent (Agent 3) tailored to team skill ratings (7h, Coding)
    - `TS-210`: Build `TechStackReportModal.jsx` in React with categorized library tags (5h, Coding)
    - `TS-211`: Develop Multi-Vector Risk Assessment Agent (Agent 4) with P × I scoring (8h, Coding)
    - `TS-212`: Implement interactive `RiskHeatmapMatrix.jsx` component in React (5h, Coding)
  - **Hemapriya (Database & PD)**:
    - `TS-213`: Design MongoDB schemas for Feasibility, Scope, Tech Stack, and Risk models (7h, Design)
    - `TS-214`: Implement local JSON fallback file storage sync in `sync_to_mongo.py` (6h, Coding)
    - `TS-215`: Write schema normalization validation script to verify document integrity (5h, System Test)
    - `TS-216`: Document Sprint 2 user stories, acceptance criteria, and Defect Log entries (5h, Documentation)

---

### 🏃 Sprint 3: Milestone Roadmap, Dynamic Re-Planning, AI Mentor Chat & Voice Engine
- **Duration**: Weeks 5–6 (Dec 02, 2024 – Dec 15, 2024)
- **Sprint Goal**: Build 5-Phase Milestone & Timeline tracking, develop Dynamic Replanner agent for schedule delays, implement interactive RAG AI Mentor Chatbot with Web Speech API.
- **Committed SP**: 40 SP | **Completed SP**: 40 SP (100% Velocity)
- **Task Breakdown by Team Member**:
  - **Karthik (Backend)**:
    - `TS-301`: Develop Tracking & Timeline Agent (Agent 5) generating 5 execution phases (8h, Coding)
    - `TS-302`: Implement task dependency graph generation and phase completion dates (7h, Coding)
    - `TS-303`: Build API endpoints `/tracking/update_task` and `/milestones/{id}` (5h, Coding)
    - `TS-304`: Write automated tests for milestone status updates and task toggling (4h, Unit Test)
  - **Govardhan (Frontend & AI Agents)**:
    - `TS-305`: Implement `SprintTimelineView.jsx` with collapsible accordions and checkboxes (8h, Coding)
    - `TS-306`: Build real-time completion percentage progress bar with dynamic colors (5h, Coding)
    - `TS-307`: Build `ChatbotPanel.jsx` with chat history memory and suggested prompts (7h, Coding)
    - `TS-308`: Integrate Web Speech API (`webkitSpeechRecognition`) for hands-free voice input (5h, Coding)
  - **Supriya (Faculty Dashboard & AI Agents)**:
    - `TS-309`: Develop delay detection algorithm comparing actual progress vs planned dates (7h, Coding)
    - `TS-310`: Implement Dynamic Replanner Agent recalculating downstream phase deadlines (8h, Coding)
    - `TS-311`: Create Re-Plan Roadmap trigger modal in Student view with diff summary (5h, Coding)
    - `TS-312`: Design faculty milestone approval workflow modal and notification schemas (4h, Design)
  - **Hemapriya (Database & PD)**:
    - `TS-313`: Implement MongoDB ChatMessage schema with project ID and timestamp index (6h, Coding)
    - `TS-314`: Optimize chat history query performance with compound indexing (<50ms) (5h, Build)
    - `TS-315`: Build data sync verification script between React optimistic state & Mongo (5h, System Test)
    - `TS-316`: Author Sprint 3 Agile burndown log, standup impediment sheet, and test cases (5h, Documentation)

---

### 🏃 Sprint 4: Faculty Governance Hub, Document Generator, E2E Testing & Release
- **Duration**: Weeks 7–8 (Dec 16, 2024 – Dec 29, 2024)
- **Sprint Goal**: Complete Faculty Cohort Governance Dashboard, build Academic Document Generator Agent, conduct comprehensive testing (118 tests pass), and finalize cloud deployment.
- **Committed SP**: 36 SP | **Completed SP**: 36 SP (100% Velocity)
- **Task Breakdown by Team Member**:
  - **Karthik (Backend)**:
    - `TS-401`: Build production multi-stage Dockerfile and configure Render deployment (7h, Build)
    - `TS-402`: Configure Vercel client-side routing rewrites and API CORS security policy (5h, Build)
    - `TS-403`: Execute automated regression test suite: 118 unit and integration tests (8h, System Test)
    - `TS-404`: Resolve API latency bottlenecks and configure connection pooling limits (4h, Coding)
  - **Govardhan (Frontend & AI Agents)**:
    - `TS-405`: Conduct OLED Dark Theme UI polish, typography audit, and mobile responsiveness (7h, Design)
    - `TS-406`: Add suggested prompt quick-action chips and copy-to-clipboard in Chatbot (5h, Coding)
    - `TS-407`: Refactor Student Dashboard layout shell and optimize component render tree (6h, Coding)
    - `TS-408`: Cross-browser testing (Chrome, Firefox, Safari) and accessibility verification (5h, System Test)
  - **Supriya (Faculty Dashboard & AI Agents)**:
    - `TS-409`: Build Faculty Cohort Overview displaying student velocity and health status (8h, Coding)
    - `TS-410`: Implement At-Risk flagging engine highlighting stalled student teams (6h, Coding)
    - `TS-411`: Implement Faculty milestone review and official timestamped digital sign-off (7h, Coding)
    - `TS-412`: Build Faculty broadcast announcement engine with cohort banner alerts (4h, Coding)
  - **Hemapriya (Database & PD)**:
    - `TS-413`: Implement Academic Document Generator Agent (Agent 7) in `doc_generator_agent.py` (8h, Coding)
    - `TS-414`: Build Project Synopsis and Methodology drafting templates with PDF export (6h, Coding)
    - `TS-415`: Compile Requirements Traceability Matrix (RTM) linking 20 US to tests and code (6h, Documentation)
    - `TS-416`: Finalize Defect Tracker, Unit Test Plan, and Capstone Presentation artifacts (5h, Documentation)

---

## 8. Sprint Burndown, Velocity & Metrics Analysis

### 8.1 Sprint Velocity & Balance Summary
| Sprint | Karthik SP | Govardhan SP | Supriya SP | Hemapriya SP | Total Committed | Total Completed | Velocity Rate |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Sprint 1** | 9 | 10 | 8 | 7 | 34 SP | 34 SP | 100% |
| **Sprint 2** | 9 | 9 | 11 | 9 | 38 SP | 38 SP | 100% |
| **Sprint 3** | 10 | 11 | 10 | 9 | 40 SP | 40 SP | 100% |
| **Sprint 4** | 9 | 8 | 9 | 10 | 36 SP | 36 SP | 100% |
| **TOTAL** | **37 SP (25.0%)** | **38 SP (25.7%)** | **38 SP (25.7%)** | **35 SP (23.6%)** | **148 SP** | **148 SP** | **100%** |

### 8.2 Sprint 4 Daily Burndown Data Table (36 SP Total)
| Day in Sprint | Planned Remaining SP | Actual Remaining SP | Delta | Daily Completed Work Notes |
|:---:|:---:|:---:|:---:|---|
| **Day 1** | 36 | 36 | 0 | Sprint Planning & Task Allocation across all 4 domains |
| **Day 2** | 32 | 32 | 0 | Docker builder setup & Synopsis drafting initiated |
| **Day 3** | 28 | 27 | -1 | Faculty cohort health overview integrated |
| **Day 4** | 24 | 23 | -1 | At-risk flagging heuristics validated |
| **Day 5** | 20 | 19 | -1 | Milestone digital sign-off modal completed |
| **Day 6** | 16 | 16 | 0 | Broadcast banner notifications engine built |
| **Day 7** | 12 | 11 | -1 | Academic document PDF export verified |
| **Day 8** | 8 | 7 | -1 | CORS and Vercel routing rewrites configured |
| **Day 9** | 4 | 3 | -1 | 118 automated tests passing green in regression suite |
| **Day 10** | 0 | 0 | 0 | Sprint Review, Demo to Faculty & Viva Defense Ready |

---

## 9. Daily Standup Meeting Logs

The table below reflects daily standups across all 4 sprints, recording blockers raised by all team members and corresponding resolutions:

| Sprint | Day | Blocked Member & Impediment | Action Taken |
|:---:|:---:|---|---|
| **Sprint 1** | Day 2 | **[Karthik]** JWT signature algorithm security configuration & secret key rotation | Configured secure HS256 algorithm with `.env` environment variable secret loading. |
| **Sprint 1** | Day 4 | **[Govardhan]** Multi-step onboarding form state loss on accidental page refresh | Integrated localStorage persistent draft saving in React with automatic form restore. |
| **Sprint 1** | Day 6 | **[Hemapriya]** MongoDB Atlas connection timeout during local corporate firewall/IP whitelist | Configured network security IP access and built graceful JSON file store fallback. |
| **Sprint 1** | Day 8 | **[Supriya]** Unclear pedagogical metrics for evaluating student project progress | Consulted faculty guidelines; established 5 core dimensions for cohort health analytics. |
| **Sprint 1** | Day 11 | **[Govardhan & Karthik]** Feasibility Agent LLM output occasionally returning non-JSON text | Enforced Pydantic schema validation and integrated json-repair parsing heuristics. |
| **Sprint 2** | Day 3 | **[Karthik]** Groq API rate limits (TPM/RPM) hit when testing multiple agent pipelines | Implemented `litellm_patch.py` with exponential backoff retry and sequential chaining. |
| **Sprint 2** | Day 5 | **[Govardhan]** Scope Agent prompt occasionally omitting explicit Out-of-Scope boundaries | Refined system prompt with strict negative boundary enforcement and 3+ MVP deliverables. |
| **Sprint 2** | Day 7 | **[Supriya]** Tech stack recommendations proposing libraries mismatched to beginner skills | Integrated skill-weighted filtering logic in `tech_stack_agent.py` prioritizing student ratings. |
| **Sprint 2** | Day 10 | **[Supriya]** 5x5 Risk Heatmap grid alignment breaking on smaller laptop viewports | Rebuilt `RiskHeatmapMatrix.jsx` using responsive CSS Grid with dynamic SVG cell overlays. |
| **Sprint 2** | Day 12 | **[Hemapriya]** MongoDB schema foreign key inconsistencies between projects and reports | Created `scripts/normalize_database.py` to migrate legacy documents and enforce schema refs. |
| **Sprint 3** | Day 2 | **[Karthik]** Milestone agent generating non-sequential timeline dates for complex scopes | Added topological sort dependency validator in `tracking_agent.py` to enforce phase logic. |
| **Sprint 3** | Day 5 | **[Govardhan]** React state lag when toggling task check-offs rapidly on high latency | Implemented optimistic UI state updates with debounced background MongoDB sync. |
| **Sprint 3** | Day 7 | **[Supriya]** Dynamic replanner recalculating completed milestones instead of future phases | Added phase status lock so only IN_PROGRESS and UPCOMING phases undergo date shifts. |
| **Sprint 3** | Day 9 | **[Govardhan]** Web Speech API microphone permission denied when tested on local HTTP URL | Configured Vite HTTPS development certificate and implemented fallback keyboard text input. |
| **Sprint 3** | Day 12 | **[Hemapriya]** Chatbot message retrieval latency exceeding 150ms as message count grew | Created compound index on (project_id, timestamp) in MongoDB, reducing latency to <35ms. |
| **Sprint 4** | Day 2 | **[Supriya]** Faculty dashboard cohort table re-rendering sluggishly with 25+ student teams | Implemented React memoization (`useMemo`, `React.memo`) and virtualized table rows. |
| **Sprint 4** | Day 4 | **[Hemapriya]** Document Generator formatting breaking markdown tables on synopsis export | Integrated structured Markdown table generator with pre-validated university template blocks. |
| **Sprint 4** | Day 6 | **[Karthik]** Docker build failing on Render due to missing frontend static build assets | Converted Dockerfile to multi-stage build: Node 20 builder stage copying dist/ into FastAPI. |
| **Sprint 4** | Day 8 | **[Govardhan & Supriya]** Broadcast notification banner overlapping top navbar on mobile | Adjusted z-index stack and layout flex containers for persistent top-level banner alert. |
| **Sprint 4** | Day 10 | **[Team]** Full system regression test execution and final Capstone Viva dress rehearsal | Ran `test_all_agents.py` (118/118 tests passed green); validated live presentation slides. |

---

## 10. Sprint Retrospectives (All 4 Members across Sprints 1–4)

| Sprint | Team Member | 🟢 Start Doing | 🔴 Stop Doing | 🔵 Continue Doing | 💡 Action Taken |
|:---:|---|---|---|---|---|
| **S1** | **Karthik** | Writing Pydantic schemas before endpoint logic | Assuming API payload formats without contracts | Collaborating on FastAPI test harnesses | Enforced strict Pydantic v2 validation across all backend auth endpoints. |
| **S1** | **Govardhan** | Prototyping responsive layouts on mobile early | Postponing error state handling until end | Creating reusable OLED Dark UI components | Built centralized toast notification system and robust error boundary. |
| **S1** | **Supriya** | Consulting faculty rubric before feature build | Hardcoding mock student evaluation criteria | Designing intuitive navigation dashboards | Mapped student progress metrics directly to faculty evaluation rubric. |
| **S1** | **Hemapriya** | Documenting collection schemas in markdown | Relying solely on remote Atlas connections | Verifying database indexes during creation | Implemented local JSON fallback cache to prevent local development halts. |
| **S2** | **Karthik** | Adding exponential retry backoff on API calls | Sending concurrent burst queries to Groq LLM | Maintaining comprehensive pytest coverage | Developed `litellm_patch.py` retry wrapper with token usage tracking. |
| **S2** | **Govardhan** | Inspecting raw LLM outputs with edge cases | Using single large prompt for multi-tasks | Chaining modular agents sequentially | Split monolithic prompts into chained Feasibility-to-Scope agent pipelines. |
| **S2** | **Supriya** | Testing visual components with extreme values | Overcomplicating risk calculations | Creating interactive color-coded heatmaps | Fine-tuned 5x5 matrix thresholds to clearly flag high-risk technical items. |
| **S2** | **Hemapriya** | Running database normalization tests daily | Allowing unindexed collection queries | Maintaining automated seed data scripts | Created `normalize_database.py` ensuring all foreign keys link accurately. |
| **S3** | **Karthik** | Using topological sorting for timeline tasks | Assuming linear chronological dependencies | Writing unit tests for timeline edge cases | Engineered dependency resolver ensuring no milestone starts before predecessors. |
| **S3** | **Govardhan** | Implementing optimistic UI state in React | Waiting for slow network roundtrips on toggle | Integrating native browser APIs like Speech | Implemented instantaneous checkbox response with debounced background sync. |
| **S3** | **Supriya** | Locking completed milestones during replanning | Shifting entire timeline when one task slips | Simulating edge-case delay scenarios | Enhanced dynamic replanner to reschedule only future active phases. |
| **S3** | **Hemapriya** | Benchmarking query response times under load | Storing uncompressed chat payload objects | Maintaining Agile burndown tracking updates | Added compound index on (project_id, timestamp) cutting latency by 75%. |
| **S4** | **Karthik** | Multi-stage Docker builds to optimize image size | Manual cloud configuration on hosting sites | Automated CI/CD regression verification | Dockerized fullstack app reducing deployment image footprint to under 250MB. |
| **S4** | **Govardhan** | Pre-Viva end-to-end user walkthroughs | Overlooking cross-browser speech quirks | Polishing OLED aesthetic micro-interactions | Tested live speech engine across Chrome/Edge with graceful keyboard fallback. |
| **S4** | **Supriya** | Memoizing heavy data tables in React views | Re-rendering entire dashboard on filter change | Adding live broadcast alert notifications | Optimized Faculty Dashboard render cycle ensuring 60fps smooth scrolling. |
| **S4** | **Hemapriya** | Exporting documents in both Markdown & PDF | Postponing RTM validation to after coding | Documenting test evidence for Viva defense | Generated comprehensive RTM linking all 20 User Stories to passing tests. |

---

## 11. Defect Tracking Register

Identified and resolved defects during iterative sprint cycles, evenly assigned based on functional ownership:

| Defect ID | Submitted By | Detected Sprint | Assigned To | Category | Defect Description & Impact | Resolution & Verification | Status |
|:---:|:---:|:---:|:---:|:---:|---|---|:---:|
| **DEF-01** | Govardhan | Sprint 1 | **Karthik** | Logical | JWT token expiration defaulted to 15m, causing premature logout during long onboarding. | Extended token expiration to 8 hours with silent session refresh. Verified. | **Closed** |
| **DEF-02** | Karthik | Sprint 1 | **Govardhan** | User Interface | Skill rating sliders allowed negative values or NaN when typed manually. | Enforced min=1 max=5 constraints in React input handlers with auto-clamping. | **Closed** |
| **DEF-03** | Supriya | Sprint 1 | **Hemapriya** | Standards | MongoDB Atlas IP whitelist blocked backend on dynamic local IP address changes. | Configured secure 0.0.0.0/0 IP access with strong auth + local JSON fallback. | **Closed** |
| **DEF-04** | Govardhan | Sprint 2 | **Karthik** | Logical | Groq API rate limits (HTTP 429) thrown during rapid sequential pipeline execution. | Integrated `litellm_patch.py` with 3-tier exponential backoff and model fallbacks. | **Closed** |
| **DEF-05** | Hemapriya | Sprint 2 | **Govardhan** | Standards | Scope Agent occasionally generated markdown headers inside JSON string properties. | Updated system prompt instructions and added regex markdown stripper to parser. | **Closed** |
| **DEF-06** | Karthik | Sprint 2 | **Supriya** | Logical | Tech Stack Recommender suggested Kubernetes for beginner students (Level 1 DevOps). | Added skill-threshold filter in `tech_stack_agent.py` to prioritize beginner stacks. | **Closed** |
| **DEF-07** | Hemapriya | Sprint 2 | **Supriya** | User Interface | Risk heatmap 5x5 grid cells misaligned when viewed on mobile screens under 480px. | Added responsive horizontal scroll wrapper and scalable CSS grid dimensions. | **Closed** |
| **DEF-08** | Govardhan | Sprint 3 | **Karthik** | Logical | Timeline generator agent created overlapping dates between Phase 1 and Phase 3. | Implemented topological milestone scheduling algorithm with strict predecessors. | **Closed** |
| **DEF-09** | Supriya | Sprint 3 | **Govardhan** | Maintainability | Task checkbox toggle caused 1.2s noticeable UI delay waiting for MongoDB roundtrip. | Implemented optimistic state update in React with debounced background sync. | **Closed** |
| **DEF-10** | Karthik | Sprint 3 | **Govardhan** | User Interface | Web Speech API threw NotAllowedError when accessing microphone on localhost HTTP. | Added graceful browser permission error handler toast and keyboard fallback. | **Closed** |
| **DEF-11** | Govardhan | Sprint 4 | **Supriya** | Maintainability | Faculty Dashboard cohort table re-rendered all 25 rows on single sign-off toggle. | Memoized student row components with `React.memo` and optimized callbacks. | **Closed** |
| **DEF-12** | Karthik | Sprint 4 | **Hemapriya** | Logical | Academic document synopsis export truncated descriptions containing double quotes. | Sanitized JSON character escapes and normalized markdown template interpolation. | **Closed** |

---

## 12. Unit Test Plan & Verification Matrix

Automated and functional unit test suite verified across backend routes, agent chains, client components, and database models:

| Test ID | Domain & Owner | Test Procedure & Scenario | Expected Result | Actual Result | Status |
|:---:|:---:|---|---|---|:---:|
| **TC-01** | Backend (Karthik) | POST `/auth/login` with valid student credentials | HTTP 200 OK, JWT access token returned with role "student" | Pass — HTTP 200 with JWT token | ✅ Pass |
| **TC-02** | Backend (Karthik) | POST `/auth/login` with incorrect password | HTTP 401 Unauthorized, "Invalid credentials" error detail | Pass — HTTP 401 Unauthorized | ✅ Pass |
| **TC-03** | Backend (Karthik) | GET `/projects` with expired JWT Bearer header | HTTP 401 Unauthorized, "Signature has expired" | Pass — HTTP 401 Unauthorized | ✅ Pass |
| **TC-04** | Backend (Karthik) | OPTIONS preflight CORS request from `localhost:5173` | HTTP 200 with Access-Control-Allow-Origin headers set | Pass — CORS headers returned | ✅ Pass |
| **TC-05** | Backend (Karthik) | GET `/health` inside running Docker container | HTTP 200 OK, `{"status": "healthy", "service": "ProjectGuide-AI"}` | Pass — Container healthy | ✅ Pass |
| **TC-06** | Frontend (Govardhan) | Submit onboarding form with valid title, description, skills | Form validates, calls POST `/onboarding`, navigates to dashboard | Pass — Dashboard loaded | ✅ Pass |
| **TC-07** | Frontend (Govardhan) | Submit onboarding form with empty title string | Client-side validation toast: "Project title is required" | Pass — Toast alert shown | ✅ Pass |
| **TC-08** | AI Agent (Govardhan) | Execute Feasibility Agent via `test_feasibility_agent.py` | Returns overall_score (0-100), verdict, metrics dict | Pass — Pydantic schema validated | ✅ Pass |
| **TC-09** | AI Agent (Govardhan) | Execute Scope Agent ingesting Feasibility report context | Generates in_scope, out_of_scope, deliverables, assumptions | Pass — Scope boundaries verified | ✅ Pass |
| **TC-10** | Frontend (Govardhan) | Ask "What is my project backend?" in ChatbotPanel | Chatbot responds referencing FastAPI backend correctly | Pass — Context-aware response | ✅ Pass |
| **TC-11** | Frontend (Govardhan) | Click microphone icon and speak prompt phrase | Voice transcribed accurately into text input field | Pass — Voice transcribed | ✅ Pass |
| **TC-12** | AI Agent (Supriya) | Execute Tech Stack Agent with skills `{"Python": 4, "SQL": 2}` | Recommends FastAPI, PostgreSQL, with learning guide for ORMs | Pass — Tailored stack recommended | ✅ Pass |
| **TC-13** | AI Agent (Supriya) | Execute Risk Agent with multi-vector evaluation payload | Output contains Technical, Timeline, Operational risks with P×I | Pass — 5x5 Matrix populated | ✅ Pass |
| **TC-14** | Faculty (Supriya) | GET `/faculty/cohort` with faculty auth header | HTTP 200 OK, list of student teams, progress %, and health badges | Pass — Cohort list returned | ✅ Pass |
| **TC-15** | Faculty (Supriya) | Evaluate student team with milestone delay > 7 days | Team flagged as "At Risk" with red warning pill in Faculty view | Pass — At-risk alert displayed | ✅ Pass |
| **TC-16** | Faculty (Supriya) | POST `/faculty/signoff` with project_id and milestone_id | Sign-off recorded in DB with timestamp and faculty ID badge | Pass — Milestone approved | ✅ Pass |
| **TC-17** | Faculty (Supriya) | POST `/faculty/broadcast` with title and alert body | Stored in Mongo; student dashboard renders banner alert | Pass — Notification visible | ✅ Pass |
| **TC-18** | AI Agent (Supriya) | Trigger dynamic replanner on delayed Phase 1 milestone | Downstream phase dates shifted forward dynamically | Pass — Rescheduled dates | ✅ Pass |
| **TC-19** | Database (Hemapriya) | Initialize Motor AsyncIOMotorClient connection | Connection established, ping command returns `{ok: 1}` | Pass — Connection pool active | ✅ Pass |
| **TC-20** | Database (Hemapriya) | Run `normalize_database.py` script on collections | All documents contain valid `_id`, foreign keys, timestamps | Pass — Zero orphaned records | ✅ Pass |
| **TC-21** | Database (Hemapriya) | Simulate MongoDB disconnect & save project report | Report persisted to local JSON fallback file without crash | Pass — Local fallback saved | ✅ Pass |
| **TC-22** | Database (Hemapriya) | Query last 50 chat messages for project ID | Query response time measured under 50ms (actual: 28ms) | Pass — Query latency 28ms | ✅ Pass |
| **TC-23** | AI Agent (Hemapriya) | Execute `doc_generator_agent.py` with project data | Generates formal Project Synopsis draft with standard headers | Pass — Synopsis drafted | ✅ Pass |
| **TC-24** | AI Agent (Hemapriya) | Export generated methodology report to Markdown/PDF | Downloadable formatted PDF document created cleanly | Pass — Exported successfully | ✅ Pass |
| **TC-25** | System (Team) | Execute pytest `test_all_agents.py` regression suite | 118/118 automated tests passing with zero failures | Pass — 118/118 passed (14.8s) | ✅ Pass |

---

## 13. Agile Risk Register & Impediment Log

| Risk ID | Category | Description | Likelihood (1-5) | Impact (1-5) | Severity | Owner | Mitigation Strategy | Status |
|:---:|:---:|---|:---:|:---:|:---:|:---:|---|:---:|
| **RSK-01** | Technical | Groq API rate limits during peak evaluation demos | 3 | 4 | **12 (High)** | **Karthik** | Integrated heuristic fallback response engines and LiteLLM retry wrapper | **Resolved** |
| **RSK-02** | Data | MongoDB Atlas IP whitelist blocking local access | 2 | 5 | **10 (High)** | **Hemapriya** | Configured `0.0.0.0/0` with secure credentials + dual JSON file store fallback | **Resolved** |
| **RSK-03** | Scope | Over-expanding features (e.g. video avatars, live compiler) | 4 | 3 | **12 (High)** | **Govardhan** | Enforced strict MoSCoW prioritization; moved non-core items to Won't Have | **Resolved** |
| **RSK-04** | Operational | Faculty reviewer unavailability for weekly sign-offs | 3 | 3 | **9 (Medium)** | **Supriya** | Built asynchronous sign-off portal with automated email/dashboard alerts | **Resolved** |
| **RSK-05** | Browser | Web Speech API mic permissions blocked on HTTP | 2 | 2 | **4 (Low)** | **Govardhan** | Forced HTTPS development certificates and added fallback keyboard text input | **Resolved** |

---

## 14. Requirements Traceability Matrix (RTM)

Complete bi-directional traceability mapping all 20 User Stories to codebase modules, UI components, test cases, and responsible owners:

| US ID | User Story Summary | Primary Owner | Backend Router / Service | Frontend Component / View | Test Case ID | Status |
|:---:|---|:---:|---|---|---|:---:|
| **US-01** | Role-Based JWT Authentication | **Karthik** | [`backend/routers/auth.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/auth.py) | `src/pages/Auth.jsx` | `TC-01, TC-02, TC-03` | ✅ Verified |
| **US-02** | Onboarding & Skill Assessment | **Govardhan** | [`backend/routers/onboarding.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/onboarding.py) | `src/pages/Onboarding.jsx` | `TC-06, TC-07` | ✅ Verified |
| **US-03** | MongoDB Atlas & Schema Setup | **Hemapriya** | [`backend/database.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/database.py) | `src/utils/api.js` | `TC-19, TC-20` | ✅ Verified |
| **US-04** | Feasibility Analysis Agent (Agent 1) | **Govardhan** | [`backend/agents/feasibility_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/feasibility_agent.py) | `src/components/FeasibilityReportModal.jsx` | `TC-08` | ✅ Verified |
| **US-05** | Faculty Dashboard Shell & Schemas | **Supriya** | [`backend/routers/faculty.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/faculty.py) | `src/pages/FacultyDashboard.jsx` | `TC-14` | ✅ Verified |
| **US-06** | Scope Definition Agent (Agent 2) | **Govardhan** | [`backend/agents/scope_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/scope_agent.py) | `src/components/ScopeReportModal.jsx` | `TC-09` | ✅ Verified |
| **US-07** | Pipeline Orchestration & LiteLLM | **Karthik** | [`backend/agents/litellm_patch.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/litellm_patch.py) | `src/utils/api.js` | `TC-25` | ✅ Verified |
| **US-08** | Tech Stack Recommender (Agent 3) | **Supriya** | [`backend/agents/tech_stack_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tech_stack_agent.py) | `src/components/TechStackReportModal.jsx` | `TC-12` | ✅ Verified |
| **US-09** | Multi-Vector Risk Matrix (Agent 4) | **Supriya** | [`backend/agents/risk_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/risk_agent.py) | `src/components/RiskHeatmapMatrix.jsx` | `TC-13` | ✅ Verified |
| **US-10** | Database Persistence & JSON Fallback | **Hemapriya** | [`backend/sync_to_mongo.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/sync_to_mongo.py) | `src/utils/store.js` | `TC-21` | ✅ Verified |
| **US-11** | 5-Phase Milestone Agent (Agent 5) | **Karthik** | [`backend/agents/tracking_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tracking_agent.py) | `src/components/SprintTimelineView.jsx` | `TC-18` | ✅ Verified |
| **US-12** | Interactive Roadmap Timeline UI | **Govardhan** | [`backend/routers/tracking.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/tracking.py) | `src/components/SprintTimelineView.jsx` | `TC-25` | ✅ Verified |
| **US-13** | Dynamic Plan Replanner Engine | **Supriya** | [`backend/timeline_planning_agent/`](file:///c:/infosys%20project/ai-mentor-platform/backend/timeline_planning_agent/) | `src/components/TimelinePlannerTab.jsx` | `TC-18` | ✅ Verified |
| **US-14** | AI Mentor Chatbot with Voice Input | **Govardhan** | [`backend/routers/chat.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/chat.py) | `src/components/ChatbotPanel.jsx` | `TC-10, TC-11` | ✅ Verified |
| **US-15** | Chat Memory & MongoDB Indexing | **Hemapriya** | [`backend/database.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/database.py) | `src/components/ChatbotPanel.jsx` | `TC-22` | ✅ Verified |
| **US-16** | Faculty Analytics & Milestone Sign-off | **Supriya** | [`backend/routers/faculty.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/faculty.py) | `src/pages/FacultyDashboard.jsx` | `TC-15, TC-16, TC-17` | ✅ Verified |
| **US-17** | Academic Document Generator (Agent 7)| **Hemapriya** | [`backend/agents/doc_generator_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/doc_generator_agent.py) | `src/pages/StudentDashboard.jsx` | `TC-23, TC-24` | ✅ Verified |
| **US-18** | Docker Multi-stage & Cloud Deploy | **Karthik** | [`Dockerfile`](file:///c:/infosys%20project/ai-mentor-platform/Dockerfile), [`render.yaml`](file:///c:/infosys%20project/ai-mentor-platform/render.yaml) | `frontend/vercel.json` | `TC-04, TC-05` | ✅ Verified |
| **US-19** | Full Automated Regression Testing | **Karthik** | [`backend/tests/test_all_agents.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/tests/test_all_agents.py) | `src/App.jsx` | `TC-25` | ✅ Verified |
| **US-20** | Capstone RTM, Defect Log & Viva Deck | **Hemapriya** | `AGILE_DOCUMENTATION.md` | `PRESENTATION.html` | `TC-25` | ✅ Verified |

---

*Document compiled and maintained under Infosys Springboard Agile Quality Assurance guidelines.*  
*Balanced team ownership verified: Karthik (25%), Govardhan (25%), Supriya (25%), Hemapriya (25%).*
