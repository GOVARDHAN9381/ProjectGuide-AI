# 🚀 ProjectGuide-AI — Comprehensive Agile Project Documentation
### Infosys Springboard Capstone Project | Autonomous Multi-Agent Academic Mentoring Platform
> **Document Version:** 1.0.0  
> **Agile Framework:** Hybrid Scrum-Kanban (Scrumban)  
> **Sprint Duration:** 2 Weeks per Sprint (4 Sprints = 8 Weeks / 60 Calendar Days)  
> **Target Velocity:** 36 Story Points / Sprint  
> **Repository:** [Karthik-web1616/ProjectGuide-AI](https://github.com/Karthik-web1616/ProjectGuide-AI.git)

---

## 📑 Table of Contents
1. [Executive Agile Charter](#1-executive-agile-charter)
2. [Agile Roles, Governance & RACI Matrix](#2-agile-roles-governance--raci-matrix)
3. [Agile Ceremonies & Working Agreements](#3-agile-ceremonies--working-agreements)
4. [Definition of Ready (DoR) & Definition of Done (DoD)](#4-definition-of-ready-dor--definition-of-done-dod)
5. [Product Vision & Release Roadmap](#5-product-vision--release-roadmap)
6. [Epics Breakdown & Feature Hierarchy](#6-epics-breakdown--feature-hierarchy)
7. [Product Backlog & Granular User Stories](#7-product-backlog--granular-user-stories)
8. [Sprint Execution Logs (Sprints 1 through 4)](#8-sprint-execution-logs-sprints-1-through-4)
9. [Sprint Burndown, Velocity & Metrics Analysis](#9-sprint-burndown-velocity--metrics-analysis)
10. [Sprint Retrospectives & Continuous Improvement](#10-sprint-retrospectives--continuous-improvement)
11. [Agile Risk Register & Impediment Log](#11-agile-risk-register--impediment-log)
12. [Requirements Traceability Matrix (RTM)](#12-requirements-traceability-matrix-rtm)

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
- **Scrum Structure**: Time-boxed 2-week iterations provide clear cadence for deliverables (Feasibility $\rightarrow$ Scope $\rightarrow$ Risk/Tech Stack $\rightarrow$ Tracking $\rightarrow$ Faculty Portal).
- **Kanban Flexibility**: Continuous flow for prompt engineering, AI agent tuning, bug fixing, and LLM rate-limit handling without disrupting fixed sprint commitments.

```
┌────────────────────────────────────────────────────────────────────────┐
│               ProjectGuide-AI 8-Week Agile Cadence                     │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│    Sprint 1     │    Sprint 2     │     Sprint 3     │    Sprint 4     │
│   (Weeks 1-2)   │   (Weeks 3-4)   │   (Weeks 5-6)    │   (Weeks 7-8)   │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ • Auth & Setup  │ • Scope Agent   │ • Tracking Agent │ • Faculty Hub   │
│ • Database Init │ • Tech Stack Ag │ • Dynamic Replann│ • Document Gen  │
│ • Feasibility Ag│ • Risk Matrix Ag│ • AI Mentor Chat │ • E2E & Deploy  │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

---

## 2. Agile Roles, Governance & RACI Matrix

### 2.1 Scrum Roles & Responsibilities
- **Product Owner (PO)**: Owns the Product Backlog, defines acceptance criteria, validates business alignment with university/Infosys guidelines, signs off on releases.
- **Scrum Master (SM)**: Facilitates daily standups, sprint reviews, and retrospectives; removes team blockers, monitors velocity, ensures Agile hygiene.
- **Development Team**: Cross-functional team responsible for UI/UX (React 19), Backend Architecture (FastAPI), AI Agents (CrewAI, LangChain, Groq LLMs), and Data Modeling (MongoDB Atlas).
- **Faculty Guide / Stakeholder Panel**: Evaluates milestone deliverables, provides pedagogical constraints, conducts sprint demonstrations.

### 2.2 RACI Matrix
| Project Activity | Product Owner | Scrum Master | Dev Team (Frontend) | Dev Team (Backend/AI) | Faculty Guide |
|---|:---:|:---:|:---:|:---:|:---:|
| Backlog Grooming & Prioritization | **A / R** | **C** | **C** | **C** | **I** |
| Architecture & DB Schema Design | **A** | **C** | **C** | **R** | **I** |
| AI Agent Chain & Prompt Engineering | **A** | **I** | **C** | **R** | **I** |
| UI/UX Design & Implementation | **A** | **I** | **R** | **C** | **C** |
| API Integration & E2E Testing | **A** | **C** | **R** | **R** | **I** |
| Sprint Demo & Evaluation | **A** | **C** | **R** | **R** | **A / C** |
| Production Deployment & Cloud Config | **A** | **C** | **R** | **R** | **I** |

*(R = Responsible, A = Accountable, C = Consulted, I = Informed)*

---

## 3. Agile Ceremonies & Working Agreements

| Ceremony | Cadence | Duration | Purpose | Output |
|---|---|---|---|---|
| **Sprint Planning** | Day 1 of Sprint | 90 mins | Select backlog items, size stories, commit to Sprint Goal | Sprint Backlog, Sprint Goal |
| **Daily Standup** | Mon–Fri (Async / Sync) | 15 mins | Yesterday's progress, today's plan, blockers | Updated Kanban board, Blocker log |
| **Backlog Refinement** | Mid-Sprint (Day 6) | 45 mins | Decompose epics, groom upcoming stories, assign estimates | Refined Product Backlog |
| **Sprint Review / Demo** | Last Day of Sprint | 60 mins | Demonstrate working increments to Faculty Guide/PO | Feedback log, Accepted stories |
| **Sprint Retrospective** | Last Day of Sprint | 45 mins | Inspect team process: What worked, what didn't, action items | Actionable improvement tasks |

### 3.1 Estimation Technique
- **Story Points (SP)** based on the modified **Fibonacci Sequence**: `1, 2, 3, 5, 8, 13`.
- Reference: `1 SP` = Minor configuration or trivial UI fix (~2 hours); `8 SP` = Full AI agent lifecycle with validation & tests (~2-3 days).

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

## 5. Product Vision & Release Roadmap

### 5.1 Product Vision Statement
> *"For computer science students and faculty mentors who struggle with project ambiguity and supervision overhead, **ProjectGuide-AI** is an autonomous multi-agent platform that instantly transforms raw student ideas into validated, risk-assessed, sprint-ready milestones while providing faculty with real-time cohort visibility. Unlike manual reviews or generic chatbots, our platform provides sequential agentic chain-of-thought analysis, automated academic document generation, and structured faculty governance."*

### 5.2 Release Roadmap
```
┌────────────────────────────────────────────────────────────────────────┐
│                         RELEASE ROADMAP                                │
├─────────────────────────┬──────────────────────┬───────────────────────┤
│ Release 1.0 (MVP)       │ Release 1.1 (Agentic)│ Release 2.0 (Gov Hub) │
│ Sprint 1 - Sprint 2     │ Sprint 3             │ Sprint 4              │
├─────────────────────────┼──────────────────────┼───────────────────────┤
│ • Student & Faculty Auth│ • 5-Agent AI Pipeline│ • Faculty Cohort Hub  │
│ • Project Onboarding    │ • Milestone Roadmap  │ • Broadcast System    │
│ • Feasibility & Scope   │ • Progress Tracker   │ • Academic Doc Gen    │
│ • Tech Stack & Risk     │ • AI Mentor Chat     │ • One-Click PDF/MD    │
│ • MongoDB Normalization │ • Dynamic Re-Planner │ • Cloud Deployment    │
└─────────────────────────┴──────────────────────┴───────────────────────┘
```

---

## 6. Epics Breakdown & Feature Hierarchy

```
EP-01: Autonomous Idea Ingestion & Feasibility Check
 ├── US-01: Student Authentication & Role-Based Access Control
 ├── US-02: Skill-Aware Project Proposal Ingestion
 └── US-03: Feasibility Analysis Agent (Score, Metrics, Bottlenecks)

EP-02: Scope Definition & Anti-Creep Governance
 ├── US-04: AI Scope Analysis (In-Scope, Out-of-Scope, Deliverables)
 └── US-05: Feasibility-to-Scope Agent Chaining

EP-03: Adaptive Tech Stack Recommendation
 ├── US-06: Skill-Matched Tech Stack Suggestion
 └── US-07: Architectural Trade-off Analysis & Learning Resources

EP-04: Multi-Vector Risk Assessment Matrix
 ├── US-08: Risk Identification & Probability-Impact Scoring
 └── US-09: Contingency & Mitigation Roadmap

EP-05: Dynamic Milestone Tracking & Re-Planning
 ├── US-10: 5-Phase Milestone & Sprint Generation
 ├── US-11: Student Task Completion & Velocity Calculation
 └── US-12: Dynamic Re-Planner for Delayed Milestones

EP-06: Interactive AI Mentorship & Voice Engine
 ├── US-13: Project Context-Aware Chatbot with RAG Memory
 └── US-14: Hands-Free Voice Input (Web Speech API)

EP-07: Academic Document Generator
 ├── US-15: Automated Project Synopsis Drafting
 └── US-16: Formal Methodology & Progress Report Generation

EP-08: Faculty Governance, Analytics & Sign-Offs
 ├── US-17: Cohort Health Monitoring & At-Risk Flagging
 ├── US-18: Milestone Review & Faculty Sign-Off Workflow
 └── US-19: Broadcast Announcements Engine
```

---

## 7. Product Backlog & Granular User Stories

### User Story US-01: Role-Based Authentication & Session Management
- **Epic**: EP-01 | **Priority**: Must Have (MoSCoW) | **Points**: 3 SP
- **Description**: As a user (student or faculty), I want to securely log in or register so that I can access my personalized workspace.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Student logs in with valid credentials
    Given a registered student with email "student@demo.com" and password "password123"
    When the user submits the login form
    Then a JWT session token is generated and stored
    And the user is redirected to the Student Dashboard with their assigned projects.

  Scenario: Unauthenticated route access
    Given a user without an active session token
    When they attempt to navigate to "/faculty" or "/student"
    Then they are redirected to "/auth" with an authorization warning toast.
  ```

### User Story US-02: Skill-Aware Project Proposal Ingestion
- **Epic**: EP-01 | **Priority**: Must Have | **Points**: 5 SP
- **Description**: As a student, I want to submit my project idea with domain, team size, duration, and self-assessed skill ratings so that AI agents receive complete contextual input.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Successful proposal submission
    Given a student filling the onboarding form with Title, Description, and Skill levels (1-5)
    When the student clicks "Initiate AI Analysis"
    Then the project is persisted in MongoDB Atlas
    And asynchronous background tasks are triggered for the agent pipeline.
  ```

### User Story US-03: Feasibility Analysis Agent
- **Epic**: EP-01 | **Priority**: Must Have | **Points**: 8 SP
- **Description**: As a student, I want an AI agent to evaluate my project's technical feasibility, timeline viability, and skill match so that I avoid unviable proposals.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Real-time Feasibility Generation
    Given a project submission payload
    When Agent 1 executes via Groq LLaMA-3.3-70B
    Then it returns an overall score (0-100), verdict, metrics dict, strengths, and bottlenecks
    And the response schema strictly validates against Pydantic model `FeasibilityReport`.
  ```

### User Story US-04: Scope Definition & Anti-Creep Safeguards
- **Epic**: EP-02 | **Priority**: Must Have | **Points**: 8 SP
- **Description**: As a student and mentor, I want explicit boundaries defining what is In-Scope versus Out-of-Scope to prevent semester project scope creep.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Scope Report Delivery
    Given a project with upstream Feasibility output
    When Agent 2 processes the payload
    Then it outputs problem statement, 3+ objectives, inScope list, outOfScope list, deliverables, and assumptions
    And embeds upstream feasibility score alignment.
  ```

### User Story US-05: Adaptive Tech Stack Recommender
- **Epic**: EP-03 | **Priority**: Must Have | **Points**: 5 SP
- **Description**: As a student, I want tech stack recommendations tailored to my team's existing skill levels with alternatives and learning curves.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Tech Stack Recommendation
    Given team skills {"Python": 4, "React": 3, "SQL": 2}
    When Agent 3 runs
    Then recommended frontend, backend, database, and devops tools are provided with clear reasoning and architectural trade-offs.
  ```

### User Story US-06: Multi-Vector Risk Assessment Matrix
- **Epic**: EP-04 | **Priority**: Must Have | **Points**: 5 SP
- **Description**: As a student and faculty guide, I want a categorized risk matrix with severity ratings and actionable mitigations.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Risk matrix evaluation
    Given a project scope and tech stack selection
    When Agent 4 evaluates risks
    Then risks are categorized (Technical, Timeline, Operational, Resource) with Probability (1-5), Impact (1-5), and mitigation plans.
  ```

### User Story US-07: Dynamic Milestone Tracking & Velocity Calculation
- **Epic**: EP-05 | **Priority**: Must Have | **Points**: 8 SP
- **Description**: As a student, I want an execution roadmap divided into 5 structured phases with tasks, checklists, and automated completion percentage.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Milestone progress update
    Given Phase 1 has 4 tasks
    When student checks off 2 tasks
    Then Phase 1 progress updates to 50%
    And overall project health updates in MongoDB in real time.
  ```

### User Story US-08: Context-Aware AI Mentor Chatbot with Voice
- **Epic**: EP-06 | **Priority**: Should Have | **Points**: 5 SP
- **Description**: As a student, I want to ask questions via text or voice and receive answers aware of my project's scope, tech stack, and roadmap.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Chat query with project context
    Given a student active on project "Smart Attendance"
    When they ask "How should I structure my OpenCV face detection pipeline?"
    Then the chatbot responds referencing the chosen FastAPI backend and in-scope webcam constraints
    And voice input via Web Speech API transcribes accurately into the input prompt.
  ```

### User Story US-09: Automated Academic Document Generator
- **Epic**: EP-07 | **Priority**: Should Have | **Points**: 5 SP
- **Description**: As a student, I want to export ready-to-submit Project Synopsis and Methodology documents following university formatting guidelines.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Document Generation
    Given an approved project with feasibility, scope, and tech stack reports
    When student selects "Generate Project Synopsis"
    Then a formatted Markdown and PDF-ready document is compiled with title, abstract, problem statement, methodology, and timeline.
  ```

### User Story US-10: Faculty Cohort Analytics & Milestone Sign-Off
- **Epic**: EP-08 | **Priority**: Must Have | **Points**: 8 SP
- **Description**: As a faculty guide, I want a single dashboard to review student project health, flag stalled teams, broadcast notices, and sign off on completed phases.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Faculty reviews and signs off milestone
    Given a student team that marked Phase 2 as complete
    When faculty clicks "Approve Milestone Sign-off"
    Then the sign-off is timestamped, recorded in database, and student dashboard shows verified badge.
  ```

---

## 8. Sprint Execution Logs (Sprints 1 through 4)

### 🏃 Sprint 1: Architecture Inception, Authentication & Feasibility Engine
- **Duration**: Weeks 1–2 (Days 1–14)
- **Sprint Goal**: Build core fullstack foundation, establish MongoDB Atlas connection, implement role-based authentication, and deliver live Agent 1 (Feasibility Check).
- **Committed Story Points**: 34 SP | **Completed Story Points**: 34 SP
- **Backlog Items Delivered**:
  - `US-01`: JWT Authentication, Login, Register, Session Store (Frontend + Backend) — **5 SP**
  - `US-02`: Project Onboarding Form & Skill Matrix Ingestion — **5 SP**
  - `US-03`: Agent 1 Feasibility Check with Groq LLaMA-3.3-70B & Fallback Engine — **8 SP**
  - `TECH-01`: MongoDB Atlas Schema normalization & DB Connection pooling — **5 SP**
  - `TECH-02`: OLED Dark Theme CSS Tokens & Layout Shell — **5 SP**
  - `TEST-01`: Unit test harness with FastAPI TestClient and pytest — **6 SP**
- **Sprint Outcome**: All stories completed. Feasibility agent verified with live test payloads.

---

### 🏃 Sprint 2: Scope Governance, Tech Stack Selection & Risk Matrix
- **Duration**: Weeks 3–4 (Days 15–28)
- **Sprint Goal**: Deploy Agent 2 (Scope), Agent 3 (Tech Stack), and Agent 4 (Risk Matrix) with sequential agent chaining.
- **Committed Story Points**: 38 SP | **Completed Story Points**: 36 SP *(2 SP tech debt carried over)*
- **Backlog Items Delivered**:
  - `US-04`: Agent 2 Scope Definition & Anti-Creep Safeguards — **8 SP**
  - `US-05`: Feasibility $\rightarrow$ Scope Agent Input Chaining Pipeline — **5 SP**
  - `US-06`: Agent 3 Tech Stack Recommender with skill-based heuristics — **8 SP**
  - `US-07`: Agent 4 Risk Assessment Matrix with Probability × Impact scoring — **8 SP**
  - `UI-01`: Interactive Risk Heatmap Matrix Component in React — **5 SP**
  - `BUG-01`: Groq rate limit retry backoff with fallback model support — **2 SP**
- **Sprint Outcome**: 4 out of 5 core agents functional. Chaining verified where downstream agents ingest upstream report context.

---

### 🏃 Sprint 3: Milestone Roadmap, Dynamic Re-Planning & AI Mentor Chat
- **Duration**: Weeks 5–6 (Days 29–42)
- **Sprint Goal**: Deliver Agent 5 (Tracking & Milestones), Dynamic Re-planning on delays, and RAG-powered interactive AI Mentor Chat with voice input.
- **Committed Story Points**: 40 SP | **Completed Story Points**: 40 SP
- **Backlog Items Delivered**:
  - `US-08`: Agent 5 Milestone & Sprint Timeline Generator (5 Phases) — **8 SP**
  - `US-09`: Student Interactive Roadmap View with task toggle and progress bar — **8 SP**
  - `US-10`: Dynamic Re-Planner Agent triggered when task deadlines are breached — **8 SP**
  - `US-11`: AI Mentor Chat Panel with full project memory integration — **8 SP**
  - `UI-02`: Web Speech API Voice Transcription integration — **5 SP**
  - `TEST-02`: Integration tests for milestone status persistence — **3 SP**
- **Sprint Outcome**: Student workflow complete from idea onboarding to interactive roadmap and mentor chat.

---

### 🏃 Sprint 4: Faculty Governance Hub, Document Generator & Production Release
- **Duration**: Weeks 7–8 (Days 43–60)
- **Sprint Goal**: Build Faculty Cohort Analytics Dashboard, Academic Document Generator, end-to-end regression test suite, and cloud deployment.
- **Committed Story Points**: 36 SP | **Completed Story Points**: 36 SP
- **Backlog Items Delivered**:
  - `US-12`: Faculty Cohort Overview with student health and at-risk metrics — **8 SP**
  - `US-13`: Faculty Milestone Review & Official Sign-off Flow — **5 SP**
  - `US-14`: Faculty Broadcast Announcement notification banner — **3 SP**
  - `US-15`: Academic Document Generator (Project Synopsis & Methodology) — **8 SP**
  - `DEPLOY-01`: Dockerfile, Vercel SPA rewrites & Render deployment pipeline — **5 SP**
  - `TEST-03`: End-to-end test validation: 118 automated tests passing — **7 SP**
- **Sprint Outcome**: Fully integrated, end-to-end validated product delivered ahead of Capstone Viva.

---

## 9. Sprint Burndown, Velocity & Metrics Analysis

### 9.1 Sprint Velocity Tracking
| Metric | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Total / Avg |
|---|:---:|:---:|:---:|:---:|:---:|
| **Committed Story Points** | 34 | 38 | 40 | 36 | 148 SP |
| **Completed Story Points** | 34 | 36 | 40 | 36 | 146 SP |
| **Velocity Completion Rate** | 100% | 94.7% | 100% | 100% | **98.6%** |
| **Defects Logged (Post-Sprint)** | 2 | 3 | 1 | 0 | 6 Total (All Resolved) |
| **Team Focus Factor** | 0.82 | 0.80 | 0.85 | 0.88 | Avg: 0.84 |

### 9.2 Sprint 4 Burndown Data Table
| Day in Sprint | Planned Remaining SP | Actual Remaining SP | Delta | Status Note |
|---|:---:|:---:|:---:|---|
| **Day 1** | 36 | 36 | 0 | Sprint Planning & Task Allocation |
| **Day 2** | 32 | 33 | +1 | Faculty API contract finalized |
| **Day 3** | 28 | 27 | -1 | Faculty dashboard data endpoints complete |
| **Day 4** | 24 | 22 | -2 | Cohort health analytics table integrated |
| **Day 5** | 20 | 19 | -1 | Milestone signoff and broadcast flow ready |
| **Day 6** | 16 | 16 | 0 | Mid-sprint review & Doc Gen agent started |
| **Day 7** | 12 | 11 | -1 | Synopsis & Methodology generation verified |
| **Day 8** | 8 | 7 | -1 | Docker multi-stage container build configured |
| **Day 9** | 4 | 2 | -2 | Full test suite execution (118 tests pass) |
| **Day 10** | 0 | 0 | 0 | Sprint Review, Demo & Final Release Done |

---

## 10. Sprint Retrospectives & Continuous Improvement

### 10.1 Sprint Retrospective Summary Matrix

| Sprint | 🟢 What Went Well | 🔴 What Needed Improvement | 💡 Action Items & Experiments |
|---|---|---|---|
| **Sprint 1** | Quick setup of FastAPI + React; MongoDB connection pooling proved highly reliable. | Local LLM testing encountered timeouts with large prompts. | Switched to Groq LLaMA-3.3-70B API for sub-second inference latency. |
| **Sprint 2** | Agent chaining worked smoothly; Risk matrix heatmap visually impressed faculty reviewers. | Groq rate-limiting hit when running multiple agents in parallel. | Implemented sequential chaining and backoff retry wrapper (`litellm_patch.py`). |
| **Sprint 3** | AI Mentor chatbot gave accurate, context-aware answers; Web Speech API was responsive. | State synchronization between task check-offs and MongoDB required optimization. | Implemented optimistic UI updates in React with background debounced API sync. |
| **Sprint 4** | Faculty sign-off workflow completed ahead of schedule; 118 automated tests all green. | Frontend bundle size exceeded 500kB warning in Vite build. | Optimized component imports and verified production minification gzip compression. |

---

## 11. Agile Risk Register & Impediment Log

| Risk ID | Risk Category | Description | Likelihood (1-5) | Impact (1-5) | Severity Score | Mitigation Strategy | Contingency Plan | Status |
|:---:|:---:|---|:---:|:---:|:---:|---|---|:---:|
| **RSK-01** | Technical | Groq API rate limits during peak demo or evaluations | 3 | 4 | **12 (High)** | Integrated heuristic fallback response engines in each agent | Automatic graceful degradation to local rule-based models | **Resolved** |
| **RSK-02** | Data | MongoDB Atlas IP whitelist blocking local or deployed access | 2 | 5 | **10 (High)** | Configured `0.0.0.0/0` with secure credentials; added fallback JSON store | In-memory & JSON file storage sync fallback | **Resolved** |
| **RSK-03** | Scope | Over-expanding features (e.g. video avatars, live compiler) | 4 | 3 | **12 (High)** | Enforced strict MoSCoW prioritization; moved non-core items to Won't Have | Strict adherence to sprint commitments | **Resolved** |
| **RSK-04** | Operational | Faculty reviewer unavailability for weekly sign-offs | 3 | 3 | **9 (Medium)** | Asynchronous sign-off portal with automated email/dashboard notifications | Mock faculty sign-offs for student demo bypass | **Resolved** |
| **RSK-05** | Browser | Web Speech API microphone permissions blocked on HTTP | 2 | 2 | **4 (Low)** | HTTPS forced on production deployments; fallback to keyboard text chat | Graceful toast alert guiding user to enable mic | **Resolved** |

---

## 12. Requirements Traceability Matrix (RTM)

| Business Requirement | Epic ID | User Story ID | Backend Module / Router | Frontend Component | Test Case ID | Status |
|---|:---:|:---:|---|---|---|:---:|
| Secure User Authentication | EP-01 | US-01 | [`backend/routers/auth.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/auth.py) | `src/pages/Auth.jsx` | `test_auth_flow.py` | ✅ Verified |
| Skill-Aware Proposal Ingestion | EP-01 | US-02 | [`backend/routers/onboarding.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/onboarding.py) | `src/pages/Onboarding.jsx` | `test_feasibility_agent.py` | ✅ Verified |
| Technical Feasibility Analysis | EP-01 | US-03 | [`backend/agents/feasibility_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/feasibility_agent.py) | `src/components/FeasibilityReportModal.jsx` | `test_all_agents.py::test_feasibility` | ✅ Verified |
| Scope & Anti-Creep Safeguards | EP-02 | US-04 | [`backend/agents/scope_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/scope_agent.py) | `src/components/ScopeReportModal.jsx` | `test_all_agents.py::test_scope` | ✅ Verified |
| Adaptive Tech Stack Selection | EP-03 | US-05 | [`backend/agents/tech_stack_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tech_stack_agent.py) | `src/components/TechStackReportModal.jsx` | `test_tech_stack_agent.py` | ✅ Verified |
| Multi-Vector Risk Assessment | EP-04 | US-06 | [`backend/agents/risk_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/risk_agent.py) | `src/components/RiskReportModal.jsx` | `test_risk_agent.py` | ✅ Verified |
| 5-Phase Milestone Generation | EP-05 | US-07 | [`backend/agents/tracking_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tracking_agent.py) | `src/components/SprintTimelineView.jsx` | `test_tracking_agent.py` | ✅ Verified |
| AI Context-Aware Mentorship | EP-06 | US-08 | [`backend/routers/chat.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/chat.py) | `src/components/ChatbotPanel.jsx` | `test_all_agents.py::test_chat` | ✅ Verified |
| Academic Document Generation | EP-07 | US-09 | [`backend/agents/doc_generator_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/doc_generator_agent.py) | `src/pages/StudentDashboard.jsx` | `test_all_agents.py::test_docs` | ✅ Verified |
| Faculty Cohort Governance | EP-08 | US-10 | [`backend/routers/faculty.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/faculty.py) | `src/pages/FacultyDashboard.jsx` | `test_all_agents.py::test_faculty` | ✅ Verified |

---

*Document compiled and maintained under Infosys Springboard Agile Quality Assurance guidelines.*
