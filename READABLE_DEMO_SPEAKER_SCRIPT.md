# 🎙️ ProjectGuide-AI — 15-Minute Word-for-Word Speaker Script
### (Teleprompter & Live Presentation Guide for Infosys Springboard Review)

> 💡 **How to use this script:**
> - Read the **"🗣️ SAY THIS:"** sections out loud word-for-word.
> - Follow the **"👉 DO THIS:"** action cues for clicks and code switching.
> - Total Duration: **15 Minutes**.

---

## ⏱️ Quick Timing Overview

| Minute | Segment | What you are doing |
|---|---|---|
| **00:00 – 01:30** | Segment 1: Intro & System Architecture | Show Landing Page ➡️ VS Code `main.py` |
| **01:30 – 03:00** | Segment 2: Student Login & Onboarding | Student Dashboard ➡️ VS Code `auth.py` |
| **03:00 – 05:00** | Segment 3: Idea Submission & Background Worker | Submit Idea Form ➡️ VS Code `submission.py` |
| **05:00 – 09:30** | Segment 4: 5 AI Agents Walkthrough | 5 Report Modals ➡️ 5 Agent Files in VS Code |
| **09:30 – 11:30** | Segment 5: Student Workspace & AI Mentor Chat | Live Chat & Docs ➡️ VS Code `student_dashboard.py` |
| **11:30 – 13:30** | Segment 6: Faculty Dashboard & Analytics | Faculty Portal ➡️ VS Code `faculty_dashboard.py` |
| **13:30 – 15:00** | Segment 7: Engineering Highlights & Viva Conclusion | Architecture Summary ➡️ Q&A Defense |

---

---

# 🎬 15-Minute Word-for-Word Script

---

## 🔹 SEGMENT 1: Introduction & Architecture (00:00 – 01:30)

### 👉 DO THIS (In Browser):
1. Open **`http://localhost:5173/`**
2. Hover over the title and platform feature cards.

### 🗣️ SAY THIS:
> *"Good morning respected mentors and evaluators.*
> 
> *In college engineering education, capstone projects often face three major bottlenecks: students choose unrealistic project scopes, mentors don't have enough time to review every proposal in depth, and feedback reaches students weeks too late.*
> 
> *To solve this, I developed **ProjectGuide-AI** — an autonomous multi-agent academic mentoring platform. It guides students through project ideation, performs instant AI-powered feasibility and scope analysis, suggests modern tech stacks, detects project risks, and provides faculty with a real-time cohort monitoring dashboard."*

---

### 👉 DO THIS (Switch to VS Code):
- Open **[`backend/main.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/main.py)**
- Highlight lines 20–40 (the router inclusions).

### 🗣️ SAY THIS:
> *"Looking at our backend code in `main.py`, the entire system is built on **FastAPI** with modular Domain-Driven Design.*
> 
> *Notice how our endpoints are cleanly partitioned into sub-routers — for authentication, idea submissions, individual agent triggers, student workspace chat, and faculty analytics. This keeps the architecture completely decoupled, low-latency, and auto-documented with OpenAPI specifications."*

---

---

## 🔹 SEGMENT 2: Student Authentication & Skill Onboarding (01:30 – 03:00)

### 👉 DO THIS (In Browser):
1. Navigate to **`http://localhost:5173/login`**
2. Click **"Student Login"** (`ngovardhanreddy9381@gmail.com`).
3. Open the **Profile / Onboarding** section.
4. Point to the skills chips (*Python, React, Docker*) and domain selection (*AI/ML*).

### 🗣️ SAY THIS:
> *"Let's log in as a student.*
> 
> *Before a student even submits an idea, our system captures their actual technical profile — including their proficiency levels in Python, React, databases, and their domain interests.*
> 
> *This is crucial because our AI agents do not give generic advice — they use the student's actual skill profile as context to identify realistic skill gaps."*

---

### 👉 DO THIS (Switch to VS Code):
- Open **[`backend/routers/auth.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/auth.py)**
- Highlight lines 35–50 (`login_user` and `create_jwt_token`).

### 🗣️ SAY THIS:
> *"Here in `auth.py`, we implement stateless JWT token authentication with bcrypt password hashing.*
> 
> *When the student logs in, their skill graph is securely attached and verified. All downstream database queries and agent prompts are strictly scoped to the authenticated student's session to ensure privacy and data isolation."*

---

---

## 🔹 SEGMENT 3: Idea Ingestion & Asynchronous Pipeline (03:00 – 05:00)

### 👉 DO THIS (In Browser):
1. Click **"💡 Submit Idea"** in the sidebar.
2. Type in or show:
   - **Title**: `Smart Health Tracker & AI Diet Assistant`
   - **Domain**: `AI / Machine Learning`
   - **Duration**: `6 weeks` | **Team Size**: `3`
   - **Description**: `A web app that allows users to upload food photos. Uses computer vision to estimate calorie counts and gives personalized dietary recommendations.`
3. Click **"✨ Auto-Suggest for AIML"** to show instant 1-click feature chips.
4. Click **"🚀 Submit & Run AI Analysis"**.

### 🗣️ SAY THIS:
> *"Now let's submit a project idea. Often students struggle with feature breakdown, so we built 1-click domain feature presets.*
> 
> *When I click 'Submit', watch how fast the UI responds. The submission returns immediately with a success message, while our autonomous AI agent pipeline is dispatched asynchronously in a background worker thread."*

---

### 👉 DO THIS (Switch to VS Code):
- Open **[`backend/routers/submission.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/submission.py)**
- Highlight lines 60–85 (`submit_idea`) and lines 355–375 (`fire_trigger`).

### 🗣️ SAY THIS:
> *"Here in `submission.py`, we prevent request timeouts by decoupling the HTTP cycle from the LLM execution.*
> 
> *The `submit_idea` endpoint saves the document to MongoDB Atlas and immediately calls `fire_trigger()`. This launches a daemon thread that executes our 5 AI agents sequentially, passing context from one agent to the next."*

---

---

## 🔹 SEGMENT 4: The 5 AI Agents Walkthrough (05:00 – 09:30)

---

### 🤖 1. Feasibility Agent
#### 👉 DO THIS:
- **In Browser:** Click **"Run Feasibility Check"** on the project card. Show the **Overall Score (77%)** and **Technical / Skill Bottlenecks**.
- **In VS Code:** Open **[`backend/agents/feasibility_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/feasibility_agent.py)** and show lines 25–45.

#### 🗣️ SAY THIS:
> *"Our first agent is the **Feasibility Evaluator**.*
> 
> *In the UI, you can see it gives an overall score of 77%, breaking down technical, timeline, and skill match scores. It highlights that while the web app portion is easy, computer vision on custom food datasets is a potential bottleneck.*
> 
> *In the code (`feasibility_agent.py`), we construct a strict prompt with the student's skills and project duration, requesting a structured JSON evaluation using Groq's high-speed LLaMA-3.3 model."*

---

### 🤖 2. Scope Definer Agent
#### 👉 DO THIS:
- **In Browser:** Click **"Analyze Scope"**. Point out **In-Scope** vs **Out-of-Scope** lists.
- **In VS Code:** Open **[`backend/agents/scope_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/scope_agent.py)** and show lines 20–40.

#### 🗣️ SAY THIS:
> *"Our second agent is the **Scope Definer**.*
> 
> *To prevent students from failing deadlines due to scope creep, Agent 2 explicitly defines what is **In-Scope** for the college submission and what is **Out-of-Scope** — for instance, medical EHR integration is marked out-of-scope for the 6-week timeframe.*
> 
> *In `scope_agent.py`, notice how it ingests the previous Feasibility report as input, creating a true chain-of-thought pipeline."*

---

### 🤖 3. Tech Stack Architect Agent
#### 👉 DO THIS:
- **In Browser:** Click **"Recommend Tech Stack"**. Show Frontend, Backend, Database, and Trade-offs.
- **In VS Code:** Open **[`backend/agents/tech_stack_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tech_stack_agent.py)** and show lines 20–45.

#### 🗣️ SAY THIS:
> *"Next is Agent 3 — the **Tech Stack Architect**.*
> 
> *It recommends React for the frontend, FastAPI and PyTorch for the machine learning inference backend, and MongoDB Atlas for flexible meal logs. It even provides an architectural rationale explaining why alternatives were rejected.*
> 
> *In `tech_stack_agent.py`, the agent analyzes the domain requirements and team skills to recommend production-ready, industry-standard stacks."*

---

### 🤖 4. Risk Matrix Agent
#### 👉 DO THIS:
- **In Browser:** Click **"Assess Risks"**. Show the **Risk Heatmap** and Top Blocker.
- **In VS Code:** Open **[`backend/routers/feasibility.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/feasibility.py)** and show the risk calculation logic.

#### 🗣️ SAY THIS:
> *"Agent 4 generates a **Risk Assessment Matrix**.*
> 
> *It computes a visual risk heatmap, identifying high-impact risks — such as lighting variation in food photography affecting model accuracy — and provides concrete mitigation strategies for the student.*
> 
> *This empowers students to present proactive risk mitigations during their faculty viva."*

---

### 🤖 5. Tracking & Roadmap Agent
#### 👉 DO THIS:
- **In Browser:** Click **"Generate Roadmap / Tracking"**. Show the 5-phase sprint roadmap.
- **In VS Code:** Open **[`backend/agents/tracking_agent.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/tracking_agent.py)** and show lines 25–50.

#### 🗣️ SAY THIS:
> *"Finally, Agent 5 generates the **Project Tracking Roadmap**.*
> 
> *It divides the 6-week project into 5 sprint milestones: Dataset Prep, Model Training, Backend Integration, Frontend Development, and Viva Documentation — complete with deliverables and acceptance criteria.*
> 
> *In `tracking_agent.py`, this structured roadmap is saved directly to the database so students can track their live progress."*

---

---

## 🔹 SEGMENT 5: Student Workspace & AI Mentor Chat (09:30 – 11:30)

### 👉 DO THIS (In Browser):
1. Click the **📊 Progress Tab** to show the completion gauge.
2. Click the **📅 Timeline Tab** to show the visual Gantt sprint chart.
3. Click the **🤖 AI Mentor Chat Tab** and send:
   > *"What dataset should I use for food calorie estimation?"*
4. Show the instant, project-specific reply.
5. Click the **📄 Documents Tab** and click **"Generate Synopsis"**.

### 🗣️ SAY THIS:
> *"Once the project is approved, the Student Dashboard becomes a live workspace.*
> 
> *Students can track sprint milestones, view a visual Gantt timeline, and interact with an **AI Mentor Chat**.*
> 
> *Notice how the AI chat knows our exact project domain and suggests specific datasets like Food-101.*
> 
> *Furthermore, in the Documents tab, students can auto-generate formatted Academic Synopsis and Methodology documents with one click."*

---

### 👉 DO THIS (Switch to VS Code):
- Open **[`backend/routers/student_dashboard.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/student_dashboard.py)**
- Highlight lines 125–150 (`chat_with_ai_mentor`).

### 🗣️ SAY THIS:
> *"In `student_dashboard.py`, our chat system uses Retrieval-Augmented Context Injection.*
> 
> *We dynamically fetch the student's project scope, tech stack, and feasibility bottlenecks and inject them into the system prompt. This ensures the chat provides grounded, project-specific technical answers rather than generic responses."*

---

---

## 🔹 SEGMENT 6: Faculty Review Dashboard (11:30 – 13:30)

### 👉 DO THIS (In Browser):
1. Log out from the student account.
2. Log in as **Faculty** (`faculty@college.edu.in` or demo chip).
3. Walk through:
   - **Cohort Health Overview**: Total students, active projects, average feasibility score.
   - **Domain Analytics**: AI/ML vs Web vs Cloud chart.
   - **Student Project Cards**: Badges showing feasibility scores and risk tags.
   - **📢 Broadcast Announcement**: Type *"Reminder: Project Review Phase 1 on Friday"* and submit.
   - **Milestone Sign-Off**: Click Approve on a milestone.

### 🗣️ SAY THIS:
> *"Now let's switch to the **Faculty & Mentor View**.*
> 
> *Instead of reviewing dozens of static 20-page PDF synopses manually, faculty get an intelligent cohort overview.*
> 
> *Mentors can immediately identify at-risk projects, view domain distribution statistics, broadcast announcements to their entire student batch, and sign off on completed project milestones with verified grading."*

---

### 👉 DO THIS (Switch to VS Code):
- Open **[`backend/routers/faculty_dashboard.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/routers/faculty_dashboard.py)**
- Highlight lines 45–80 (`get_cohort_summary`).

### 🗣️ SAY THIS:
> *"In `faculty_dashboard.py`, we execute server-side MongoDB aggregation pipelines to calculate cohort health metrics in real time.*
> 
> *This allows coordinators and HODs to monitor project health across hundreds of students simultaneously with zero performance degradation."*

---

---

## 🔹 SEGMENT 7: Technical Resilience & Viva Wrap-Up (13:30 – 15:00)

### 👉 DO THIS (Switch to VS Code):
- Open **[`backend/agents/litellm_patch.py`](file:///c:/infosys%20project/ai-mentor-platform/backend/agents/litellm_patch.py)**
- Highlight lines 15–30 (the `CANDIDATE_MODELS` list).

### 🗣️ SAY THIS:
> *"To ensure enterprise-grade reliability, we built two key resilience features:
> 
> 1. **Zero-Downtime LLM Failover:** In `litellm_patch.py`, we implemented a fallback cascade across Groq's LLaMA-3.3, LLaMA-3.1, and Mixtral models. If any model reaches rate limits or undergoes maintenance, the system automatically falls back without crashing.
> 2. **Hybrid Cloud Persistence:** In `database.py`, we combine MongoDB Atlas cloud storage with transparent local caching, ensuring uninterrupted functionality."*

---

### 🗣️ FINAL CLOSING STATEMENT (Look at Evaluators):
> *"To summarize: **ProjectGuide-AI** bridges the gap between students and mentors. It automates ideation review using 5 specialized AI agents, empowers students with a 24/7 AI mentor, and gives faculty complete visibility over their project cohorts.
> 
> Thank you very much! I am now ready to take your questions."*

---

## 🎯 Quick Viva Q&A Answers (Keep in Mind)

- **Q: Which LLM and framework did you use?**  
  *A: Groq API with LLaMA-3.3-70B-Versatile for ultra-fast agent inference, orchestrated using FastAPI and CrewAI-style sequential prompt pipelines.*
- **Q: Where is data stored?**  
  *A: MongoDB Atlas cloud database with collections for users, project ideas, agent reports, milestones, and announcements.*
- **Q: How are hallucinations prevented?**  
  *A: Strict JSON schema enforcement and grounding prompts with the student's actual skill profile and project constraints.*
