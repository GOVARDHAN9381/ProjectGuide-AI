# 🎓 ProjectGuide-AI — 15-Minute Master Demo & Code Walkthrough Script
### AI Agentic Academic Project Mentoring Platform
> **Target Audience:** Infosys Springboard Reviewers, Evaluators, Mentors, and Project Viva Panels  
> **Total Duration:** **15:00 Minutes** (UI Walkthrough + In-Depth VS Code Code Walkthrough)  
> **Active URLs:** Frontend → `http://localhost:5173` | Backend API Docs → `http://127.0.0.1:8000/docs`

---

## ⏱️ 15-Minute Master Presentation Breakdown

```
[00:00 – 01:30] ── 🔹 SEGMENT 1: Introduction, Problem Statement & System Architecture
[01:30 – 03:00] ── 🔹 SEGMENT 2: Student Authentication & Skill-Aware Onboarding (UI + Code)
[03:00 – 05:00] ── 🔹 SEGMENT 3: Idea Ingestion & Asynchronous Background Triggering (UI + Code)
[05:00 – 09:30] ── 🔹 SEGMENT 4: 5 Autonomous AI Agents in Action (Sequential Chain-of-Thought + Code)
                    ├── Agent 1: Feasibility Agent (Score, Bottlenecks, Skill Match)
                    ├── Agent 2: Scope Agent (In-Scope, Out-of-Scope, Deliverables)
                    ├── Agent 3: Tech Stack Agent (Frontend, Backend, DB, Trade-offs)
                    ├── Agent 4: Risk Matrix Agent (Severity, Probability, Mitigations)
                    └── Agent 5: Tracking & Roadmap Agent (5-Phase Milestones, Acceptance Criteria)
[09:30 – 11:30] ── 🔹 SEGMENT 5: Student Workspace & AI Mentor Chat Engine (UI + Code)
                    ├── Progress & Milestones Verification
                    ├── RAG-Powered AI Mentor Chat
                    └── 1-Click Automated Project Document Generator (Synopsis / Methodology)
[11:30 – 13:30] ── 🔹 SEGMENT 6: Faculty Review Dashboard & Cohort Monitoring (UI + Code)
                    ├── Cohort Risk Analytics & Student Health Scores
                    ├── Broadcast Announcements Engine
                    └── Faculty Milestone Sign-Off & Verification
[13:30 – 15:00] ── 🔹 SEGMENT 7: Technical Highlights, Hybrid MongoDB Persistence & Wrap-Up
```

---

## 🎬 Master Segment-by-Segment Walkthrough Guide

---

### 🔹 SEGMENT 1 (0:00 – 1:30): Introduction, Problem Statement & Architecture

#### 🖥️ UI Demonstration (45s)
1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. Show the modern, responsive landing page with platform metrics and role portals.
3. **🎤 Speaking Script:**
   > *"Good morning respected evaluators. In collegiate engineering education, capstone projects frequently face critical hurdles: students pick unfeasible project scopes, receive late feedback weeks after submission, and faculty mentors are overburdened reviewing dozens of proposals manually.*
   > 
   > *To solve this, we built **ProjectGuide-AI** — an autonomous multi-agent mentoring platform that ingests student ideas, runs a sequential 5-agent AI pipeline using Groq LLMs and CrewAI, generates instant feasibility, scope, tech stack, risk, and tracking roadmaps, and provides faculty with a real-time cohort monitoring dashboard."*

#### 💻 VS Code Walkthrough (45s)
- **Open File:** [`backend/main.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/main.py)
- **Show Lines 1–45 (FastAPI Router Mounts & CORS Middleware):**
  ```python
  app = FastAPI(title="AI Project Mentor API", version="2.0.0")

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )

  # Modular REST Sub-Routers
  app.include_router(auth.router)
  app.include_router(submission.router)
  app.include_router(feasibility.router)
  app.include_router(scope.router)
  app.include_router(tech_stack.router)
  app.include_router(tracking.router)
  app.include_router(student_dashboard.router)
  app.include_router(faculty_dashboard.router)
  ```
- **🎤 What to Explain in Code:**
  > *"Our backend architecture is built with **FastAPI** following modular Domain-Driven Design. Each functional area — authentication, submission, agent orchestration, chat, and faculty analytics — is isolated into dedicated sub-routers. This guarantees low latency, clean separation of concerns, and full auto-documented OpenAPI specs available at `/docs`."*

---

### 🔹 SEGMENT 2 (1:30 – 3:00): Student Authentication & Skill-Aware Onboarding

#### 🖥️ UI Demonstration (45s)
1. On [http://localhost:5173/login](http://localhost:5173/login), log in with the student account (`ngovardhanreddy9381@gmail.com` or demo chip).
2. Show the **Student Profile / Onboarding** modal:
   - Selecting primary domains (*AI/ML, Web Development, Cloud*).
   - Selecting skills with proficiency levels (*Python: Advanced, React: Intermediate, Docker: Beginner*).
   - Semester, department, and team member roles.
3. **🎤 Speaking Script:**
   > *"The platform begins with personalized student onboarding. Rather than treating all students equally, we capture the student's actual tech stack proficiencies and domain interests. This profile data is stored and directly injected into the AI agent prompt contexts to perform customized feasibility and skill-gap matching."*

#### 💻 VS Code Walkthrough (45s)
- **Open File:** [`backend/routers/auth.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/auth.py)
- **Show Lines ~25–65 (JWT Token Generation & Profile Hashing):**
  ```python
  @router.post("/api/auth/login")
  def login_user(req: schemas.LoginRequest):
      clean_email = req.email.strip().lower()
      user = get_user_by_email(clean_email)
      
      if not verify_password(req.password, user.get("password_hash")):
          raise HTTPException(status_code=401, detail="Invalid credentials")
          
      token = create_jwt_token(clean_email, role=user.get("role", "student"))
      return {
          "token": token, 
          "user": serialize_user_doc(user),
          "skills": user.get("skills", []),
          "domain": user.get("domain", "web")
      }
  ```
- **Open File:** [`frontend/src/pages/StudentDashboard.jsx`](file:///c:/infosys%20project/ai-mentor-platform/frontend/src/pages/StudentDashboard.jsx) *(Lines ~30–75: Profile State Sync & Isolation)*
- **🎤 What to Explain in Code:**
  > *"In `backend/routers/auth.py`, we implement stateless JWT authentication with bcrypt password hashing. Notice that when a user authenticates, their full skill graph is serialized. In `StudentDashboard.jsx`, this profile is safely loaded with defensive fallbacks, ensuring complete student data isolation across browser sessions."*

---

### 🔹 SEGMENT 3 (3:00 – 5:00): Idea Ingestion & Asynchronous Background Triggering

#### 🖥️ UI Demonstration (60s)
1. Navigate to the **Submit Idea** tab on the Student Dashboard.
2. Enter the test project idea:
   - **Title**: `Smart Health Tracker & AI Diet Assistant`
   - **Domain**: `AI / Machine Learning`
   - **Team Size**: `3` | **Duration**: `6 weeks`
   - **Description**: `A mobile-friendly web app where users log meals. Uses computer vision to estimate calories from food photos and provides personalized dietary recommendations.`
3. Demonstrate the **"✨ Auto-Suggest for AIML"** feature to dynamically populate domain-recommended feature chips.
4. Click **"🚀 Submit & Run AI Analysis"**.
5. **🎤 Speaking Script:**
   > *"When a student submits an idea, our system provides 1-click domain feature presets so students never struggle with requirements engineering. Once submitted, the HTTP response returns immediately to keep the UI snappy, while our autonomous AI agent pipeline is launched in a non-blocking background thread."*

#### 💻 VS Code Walkthrough (60s)
- **Open File:** [`backend/routers/submission.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/submission.py)
- **Show Lines ~50–90 (`submit_idea` endpoint & MongoDB persistence):**
  ```python
  @router.post("/submit-idea", response_model=schemas.IdeaResponse)
  def submit_idea(data: schemas.IdeaRequest):
      idea_doc = make_project_idea_doc(data)
      # 1. Atomic insertion into MongoDB Atlas
      res = ideas_col.insert_one(dict(idea_doc))
      idea_id = str(res.inserted_id)
      
      # 2. Trigger multi-agent pipeline asynchronously without blocking HTTP response
      fire_trigger(idea_id)
      
      return schemas.IdeaResponse(
          idea_id=idea_id, 
          status="pending_analysis",
          message="Idea submitted successfully. AI Agents dispatched."
      )
  ```
- **Show Lines ~355–380 (`fire_trigger` background worker):**
  ```python
  def fire_trigger(idea_id: str):
      def _run_pipeline(idea_id: str):
          # Asynchronously executes the 5 agents sequentially:
          # Feasibility -> Scope -> Tech Stack -> Risk -> Tracking
          feas = run_feasibility_agent(idea_data, student_skills)
          scope = run_scope_agent(idea_data, feasibility_report=feas)
          tech = run_tech_stack_agent(idea_data, scope_report=scope)
          track = run_tracking_agent(idea_data, tech_stack_report=tech)
      
      threading.Thread(target=_run_pipeline, args=(idea_id,), daemon=True).start()
  ```
- **🎤 What to Explain in Code:**
  > *"In `backend/routers/submission.py`, we decouple the client request from the compute-heavy LLM agent operations. `fire_trigger()` spawns a daemon background thread that coordinates the multi-agent workflow. The student gets a sub-100ms response while the agents execute seamlessly in the background."*

---

### 🔹 SEGMENT 4 (5:00 – 9:30): 5 Autonomous AI Agents in Action (Sequential Chain-of-Thought)

*(This is the core technical showcase. Demonstrate each agent modal in the UI and immediately show its corresponding backend agent implementation in VS Code.)*

```
Pipeline Flow:
[Student Idea + Skills] ──> 🤖 Feasibility Agent
                                  │
                                  ▼ (Feasibility Constraints)
                            🤖 Scope Agent
                                  │
                                  ▼ (In-Scope / Out-of-Scope)
                            🤖 Tech Stack Agent
                                  │
                                  ▼ (Architecture Specs)
                            🤖 Risk Matrix Agent
                                  │
                                  ▼ (Risk Mitigations)
                            🤖 Tracking & Roadmap Agent
```

---

#### 🤖 Agent 1: Feasibility Evaluator (~50s)
- **🖥️ UI Action:** Open the **Feasibility Report Modal**. Point out the **Overall Score (77%)**, Verdict (*"Feasible with Skill Bridging"*), 4 Metric Progress Bars (*Technical: 80%, Timeline: 70%, Resource: 75%, Skill Match: 72%*), and specific **Key Bottlenecks**.
- **💻 VS Code File:** [`backend/agents/feasibility_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/feasibility_agent.py)
- **Show Code Snippet:**
  ```python
  def run_feasibility_agent(idea_data: dict, student_skills: list) -> dict:
      prompt = f"""
      Evaluate project: {idea_data.get('title')}
      Domain: {idea_data.get('domain')} | Duration: {idea_data.get('duration_weeks')} weeks
      Student Skills Profile: {student_skills}
      
      Analyze:
      1. Technical Feasibility (0-100) & Timeline Feasibility (0-100)
      2. Skill Gap: Compare required tech vs student skills
      3. Return structured JSON with overall_score, verdict, strengths, bottlenecks.
      """
      return call_groq_llm_json(prompt, system_role="Senior Academic Project Evaluator")
  ```
- **🎤 Explanation:** *"Agent 1 performs multi-dimensional feasibility grading. It compares the project's requirements against the student's actual skill profile, flagging precise gaps like missing computer vision experience."*

---

#### 🤖 Agent 2: Scope & Boundary Agent (~50s)
- **🖥️ UI Action:** Open the **Scope Analysis Modal**. Point out the clear distinction between **In-Scope Items** (Core MVP: calorie estimation, food diary) vs **Out-of-Scope Items** (EHR medical integration, Bluetooth scale hardware), preventing scope creep.
- **💻 VS Code File:** [`backend/agents/scope_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/scope_agent.py)
- **Show Code Snippet:**
  ```python
  def run_scope_agent(idea_data: dict, feasibility_report: dict) -> dict:
      prompt = f"""
      Project: {idea_data.get('title')}
      Feasibility Score: {feasibility_report.get('overall_score')}%
      Feasibility Bottlenecks: {feasibility_report.get('bottlenecks')}
      
      Define strict boundaries:
      1. Explicit In-Scope Modules (MVP Deliverables)
      2. Explicit Out-of-Scope Features (To prevent student deadline failure)
      3. Key Acceptance Deliverables for Final Year Viva.
      """
      return call_groq_llm_json(prompt, system_role="Software Architect & Scope Director")
  ```
- **🎤 Explanation:** *"Agent 2 consumes the output of Agent 1. It creates clear project boundaries so undergraduate students don't over-engineer and fail their submission deadlines."*

---

#### 🤖 Agent 3: Tech Stack Architect (~50s)
- **🖥️ UI Action:** Open the **Tech Stack Report Modal**. Show the recommended tiers: **Frontend** (*React + Tailwind*), **Backend** (*FastAPI + PyTorch/YOLOv8*), **Database** (*MongoDB Atlas*), and the **Trade-off Analysis** explaining why Flask or SQL was bypassed.
- **💻 VS Code File:** [`backend/agents/tech_stack_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tech_stack_agent.py)
- **Show Code Snippet:**
  ```python
  def run_tech_stack_agent(idea_data: dict, scope_report: dict) -> dict:
      prompt = f"""
      Project: {idea_data.get('title')} | Domain: {idea_data.get('domain')}
      Scope Deliverables: {scope_report.get('in_scope')}
      
      Recommend modern production stack:
      - Frontend, Backend, Database, Machine Learning Framework, Deployment
      - Provide Architectural Rationale and Alternative Trade-offs.
      """
      return call_groq_llm_json(prompt, system_role="Enterprise Solutions Architect")
  ```
- **🎤 Explanation:** *"Agent 3 tailors the tech stack to match both the project scope and student capabilities, providing justification for each architectural layer."*

---

#### 🤖 Agent 4: Risk Matrix & Mitigation Agent (~40s)
- **🖥️ UI Action:** Open the **Risk Assessment Modal**. Showcase the **Risk Heatmap**, Overall Risk Index (*38% - Moderate*), **Top Blocker** (*Model accuracy on diverse food lighting*), and actionable mitigation steps.
- **💻 VS Code File:** [`backend/routers/feasibility.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/feasibility.py) *(Lines ~180–230: Risk Matrix Generator)*
- **🎤 Explanation:** *"Agent 4 evaluates technical, resource, and timeline failure modes, generating a structured risk matrix with proactive mitigation strategies before development even starts."*

---

#### 🤖 Agent 5: Tracking & Roadmap Agent (~40s)
- **🖥️ UI Action:** Open the **Milestones / Tracking Roadmap Modal**. Show the 5 structured phases (*Requirements, Core ML Model, Backend/Frontend Integration, Testing, Final Viva Documentation*) with estimated weeks and acceptance criteria.
- **💻 VS Code File:** [`backend/agents/tracking_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tracking_agent.py)
- **Show Code Snippet:**
  ```python
  def run_tracking_agent(idea_data: dict, tech_stack_report: dict) -> dict:
      # Automatically breaks project duration into 5 sprint milestones
      # with explicit deliverables and evaluation checkpoints
  ```
- **🎤 Explanation:** *"Agent 5 converts the architecture into an actionable, sprint-based academic execution roadmap with verifiable milestones for mentor review."*

---

### 🔹 SEGMENT 5 (9:30 – 11:30): Student Workspace & AI Mentor Chat Engine

#### 🖥️ UI Demonstration (60s)
1. On the Student Dashboard, switch between tabs:
   - **📊 Progress Tab**: Show real-time completion gauge and logged progress updates.
   - **📅 Timeline / Gantt Tab**: Show visual timeline breakdown across weeks.
   - **🤖 AI Mentor Chat**: Send a live prompt:  
     `"What dataset should I use for food calorie estimation?"`  
     Show the instant, context-aware answer citing the student's project domain.
   - **📄 Documents Tab**: Click **"Generate Synopsis"** & **"Generate Methodology Report"** to show 1-click formatted academic reports ready for export.
2. **🎤 Speaking Script:**
   > *"The student dashboard acts as a 24/7 intelligent workspace. Students can track sprints, chat with an AI mentor equipped with their project context, and generate standard university-format synopsis and methodology documents with a single click."*

#### 💻 VS Code Walkthrough (60s)
- **Open File:** [`backend/routers/student_dashboard.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/student_dashboard.py)
- **Show Chat RAG Context Injection (Lines ~120–165):**
  ```python
  @router.post("/api/student/chat")
  def chat_with_ai_mentor(req: schemas.ChatRequest):
      # Fetch the student's specific project context and reports
      project = ideas_col.find_one({"_id": ObjectId(req.idea_id)})
      feasibility = project.get("feasibility_report", {})
      tech_stack = project.get("tech_stack_report", {})
      
      system_prompt = f"""
      You are the 24/7 AI Capstone Mentor for: {project.get('title')}
      Domain: {project.get('domain')}
      Tech Stack: {tech_stack.get('recommended_stack')}
      Feasibility Bottlenecks: {feasibility.get('bottlenecks')}
      
      Answer the student's question accurately with actionable coding guidance.
      """
      reply = call_groq_llm(system_prompt=system_prompt, user_msg=req.message)
      return {"reply": reply, "timestamp": datetime.utcnow().isoformat()}
  ```
- **🎤 What to Explain in Code:**
  > *"In `student_dashboard.py`, our AI Mentor Chat isn't a generic chatbot. We inject the student's project scope, tech stack, and feasibility bottlenecks directly into the system prompt. This ensures the assistant gives highly tailored, project-specific technical advice."*

---

### 🔹 SEGMENT 6 (11:30 – 13:30): Faculty Review Dashboard & Cohort Monitoring

#### 🖥️ UI Demonstration (60s)
1. Log out from the student account.
2. Log in using the **Faculty Portal** (`faculty@college.edu.in` or faculty demo chip).
3. Showcase the **Faculty Dashboard**:
   - **Cohort Health Overview**: Total students, active projects, average feasibility score (e.g., 78%).
   - **Domain Analytics**: Real-time breakdown of AI/ML vs Web Dev vs IoT proposals.
   - **Student Project Cards**: Quick badges displaying Feasibility scores, domain tags, and milestone progress.
   - **📢 Broadcast Announcements**: Send a live announcement to all students (*"Reminder: Interim Review next Monday"*).
   - **Milestone Sign-Off**: Approve or request revision on student milestone submissions.
4. **🎤 Speaking Script:**
   > *"From the mentor's perspective, faculty no longer have to read through 50 static PDF synopses. The Faculty Dashboard aggregates all student submissions, highlights at-risk projects using AI severity scores, allows one-click milestone sign-offs, and lets mentors broadcast announcements to their entire cohort."*

#### 💻 VS Code Walkthrough (60s)
- **Open File:** [`backend/routers/faculty_dashboard.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/faculty_dashboard.py)
- **Show Cohort Analytics & Milestone Sign-Off (Lines ~40–95):**
  ```python
  @router.get("/api/faculty/cohort-summary")
  def get_cohort_summary():
      all_projects = list(ideas_col.find({}))
      total = len(all_projects)
      avg_feasibility = sum(p.get("feasibility_score", 0) for p in all_projects) / max(total, 1)
      
      # Risk categorisation: High (<50%), Medium (50-75%), Low (>75%)
      high_risk_count = sum(1 for p in all_projects if p.get("feasibility_score", 0) < 50)
      
      return {
          "total_projects": total,
          "avg_feasibility": round(avg_feasibility, 1),
          "high_risk_projects": high_risk_count,
          "domain_distribution": compute_domain_counts(all_projects)
      }
  ```
- **🎤 What to Explain in Code:**
  > *"In `faculty_dashboard.py`, we run server-side aggregation pipelines across MongoDB to compute real-time cohort analytics. This gives department heads and project coordinators immediate visibility into project risk distributions across entire batches."*

---

### 🔹 SEGMENT 7 (13:30 – 15:00): Technical Highlights, Hybrid Persistence & Wrap-Up

#### 💻 VS Code Architectural Deep-Dive (45s)
- **Open File:** [`backend/agents/litellm_patch.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/litellm_patch.py)
- **Show Dynamic Model Failover:**
  ```python
  # Dynamic fallback cascade to guarantee 99.9% uptime during API deprecations
  CANDIDATE_MODELS = [
      "groq/llama-3.3-70b-versatile",
      "groq/llama-3.1-70b-versatile",
      "groq/mixtral-8x7b-32768"
  ]
  ```
- **Open File:** [`backend/database.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/database.py) *(Hybrid MongoDB Atlas + Local JSON caching)*
- **🎤 What to Explain in Code:**
  > *"Two critical engineering resilience features power our system:
  > 1. **Zero-Downtime LLM Fallback:** In `litellm_patch.py`, we implemented a fallback cascade across Groq's high-speed LLaMA-3.3, 3.1, and Mixtral models to safeguard against rate limits and API deprecations.
  > 2. **Hybrid Cloud-Local Persistence:** In `database.py`, we maintain MongoDB Atlas cloud connectivity with transparent local JSON cache fallbacks, guaranteeing seamless operation even during intermittent internet connectivity."*

#### 🎤 Final Wrap-Up & Viva Conclusion (45s)
> *"To conclude, **ProjectGuide-AI** transforms academic project mentoring into an automated, objective, and transparent workflow. By combining **FastAPI**, **React**, **MongoDB Atlas**, and **Groq Multi-Agent LLMs**, we provide students with instant 24/7 architectural guidance and faculty with comprehensive cohort oversight.
> 
> Thank you! We are now open to any questions and technical defense."*

---

## 📋 Viva & Examiner Q&A Cheat Sheet

| Question | Short Technical Answer | File to Reference |
|---|---|---|
| **"How do you handle LLM hallucinations in feasibility?"** | We enforce strict Pydantic JSON schemas, system roles, and inject the student's actual skill profile as grounding context. | [`backend/agents/feasibility_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/feasibility_agent.py) |
| **"Why not run agents synchronously?"** | 5 sequential LLM queries take ~4–8 seconds. Running them in a daemon background thread prevents client HTTP timeouts. | [`backend/routers/submission.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/submission.py#L355) |
| **"How is student privacy protected?"** | JWT stateless auth scopes all database queries to the authenticated student's unique ID and email. | [`backend/routers/auth.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/auth.py) |
| **"How does the Faculty Dashboard update?"** | REST API polling with optimistic frontend cache invalidation ensures instant updates upon milestone sign-offs. | [`frontend/src/pages/FacultyDashboard.jsx`](file:///c:/infosys%20project/ai-mentor-platform/frontend/src/pages/FacultyDashboard.jsx) |

---

## 🛠️ Pre-Recording / Presentation Checklist
- [x] Backend running on `http://127.0.0.1:8000`
- [x] Frontend running on `http://localhost:5173`
- [x] Browser zoom set to **90%** for maximum visibility
- [x] VS Code split-screen / tabs pre-arranged for quick file switching
- [x] Test student account logged in with completed agent reports ready
