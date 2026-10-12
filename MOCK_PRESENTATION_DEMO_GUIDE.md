# 🎯 5-Minute Master Live Demonstration Playbook
### Infosys Springboard Mock Presentation | ProjectGuide-AI Live Demonstration
> **Target Duration:** Strictly **5:00 Minutes**  
> **Speaker Team:** **4 Team Members** (~1 min 15 sec per person)  
> **Objective:** Demonstrate end-to-end platform capabilities with a **New User** and **New Project Idea**, bridging both the **Student Experience** and **Faculty Governance Hub**.

---

## ⚡ Pre-Demo Setup Checklist (Do This 10 Mins Before Call)

1. **Start Backend Server:**
   ```powershell
   cd "c:\infosys project\ai-mentor-platform\backend"
   .\venv\Scripts\Activate.ps1
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   *Verify healthy status:* Open [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) ➔ `{"status": "ok"}`

2. **Start Frontend Server:**
   ```powershell
   cd "c:\infosys project\ai-mentor-platform\frontend"
   npm run dev
   ```
   *Verify URL:* Open [http://localhost:5173](http://localhost:5173)

3. **Browser Setup (Dual-Tab Strategy):**
   - **Tab 1 (Normal Window):** [http://localhost:5173/auth](http://localhost:5173/auth) (Ready for New Student Registration/Login)
   - **Tab 2 (Incognito / Second Window):** [http://localhost:5173/auth](http://localhost:5173/auth) (Pre-logged in as Faculty Guide: `prof.verma@college.edu.in` / `faculty123`)

---

## 📋 The Copy-Paste Project Idea (Keep in Notepad)

Use this exact project idea during the live demo so typing takes under 5 seconds:

- **Project Title:**
  ```text
  AI-Based Student Attendance & Real-Time Classroom Analytics
  ```
- **Project Description:**
  ```text
  A web platform using OpenCV and computer vision to automate classroom attendance via webcam, detect seat occupancy in real time, and generate automated CSV attendance reports with a faculty analytics dashboard.
  ```
- **Domain:** `AI / Machine Learning`
- **Team Size:** `4`
- **Duration (Days):** `60`
- **Student Skill Ratings:**
  - Python: `Level 4`
  - React: `Level 3`
  - OpenCV: `Level 2`
  - FastAPI: `Level 3`
  - SQL: `Level 2`

---

## ⏱️ 5-Minute Demonstration Timeline (4 Team Members)

```
[0:00 – 1:15] ── 👤 PERSON 1: The Hook, New Student Registration & Skill Matrix Ingestion
[1:15 – 2:30] ── 👤 PERSON 2: New Idea Ingestion & Agents 1 & 2 (Feasibility & Scope Governance)
[2:30 – 3:45] ── 👤 PERSON 3: Agents 3, 4 & 5 (Tech Stack, Risk Heatmap & Milestone Roadmap)
[3:45 – 5:00] ── 👤 PERSON 4: Doc Generator, Voice AI Mentor & Faculty Portal Sign-Off
```

---

## 🎬 Minute-by-Minute Script & Action Playbook (4 Persons)

---

### 👤 PERSON 1: The Hook & New Student Onboarding `[0:00 – 1:15]`

#### 🖥️ Screen Action:
1. Show browser at `http://localhost:5173/auth`.
2. Click **"Sign Up"** (or use existing student `arjun.sharma@college.edu.in` / `password123` if you want to skip typing).
3. If creating new: Fill Name: `Rohan Gupta`, Email: `rohan.gupta@college.edu.in`, Password: `password123`, Role: `Student`.
4. Click **Create Account** ➔ Lands on the **Skill-Aware Onboarding Screen**.
5. Select Domain: `Artificial Intelligence` / `Web Development`.
6. Select Skills: `Python (4)`, `React (3)`, `FastAPI (3)`, `OpenCV (2)`.
7. Click **"Save Profile & Continue"** ➔ Lands smoothly on Student Dashboard.

#### 🎤 Spoken Script:
> *"Respected mentors and evaluators, welcome to the live demonstration of **ProjectGuide-AI**. In collegiate engineering, capstone projects face a critical recurring breakdown: students pick vague scopes, choose technologies they cannot handle, and wait weeks for manual faculty reviews.*  
>  
> *Here on screen, a new student, Rohan Gupta, registers on our platform. Rather than treating all students identically, our skill-aware onboarding captures his team's real foundational proficiencies—such as Level 4 in Python and Level 2 in OpenCV.*  
>  
> *This profile acts as the real-time contextual anchor for our autonomous multi-agent pipeline. I now hand over to [Person 2] to submit our semester project idea."*

---

### 👤 PERSON 2: Idea Ingestion & Agents 1 & 2 (Feasibility & Scope) `[1:15 – 2:30]`

#### 🖥️ Screen Action:
1. Click **"+ Submit New Idea / Project"** button at the top right of the dashboard.
2. Paste the Project Title: `AI-Based Student Attendance & Real-Time Classroom Analytics`.
3. Paste Description: *(Copy-paste from Notepad in 2 seconds)*.
4. Set Team Size to `4`, Duration to `60` days.
5. Click **"Initiate AI Multi-Agent Analysis"** (Show the loading spinner / agent progress indicator).
6. Once generated, click to open **Agent 1: Feasibility Report Modal**:
   - Highlight: Overall Score (`85%` / `Feasible with Guidance`), 4 Metric Bars, Strengths & Bottlenecks.
7. Click to open **Agent 2: Scope Definition Report Modal**:
   - Highlight: Problem Statement, **In-Scope deliverables**, and especially the **Out-of-Scope boundaries**.

#### 🎤 Spoken Script:
> *"Thank you [Person 1]. Rohan's team wants to build an automated attendance system using computer vision. We submit the title, 60-day timeline, and team size.*  
>  
> *Instantly, our backend launches an autonomous multi-agent pipeline powered by Groq LLaMA-3.3-70B. In seconds, **Agent 1 (Feasibility)** computes an objective 85% feasibility score, validating technical viability while identifying video latency as a bottleneck.*  
>  
> *Next, **Agent 2 (Scope Governance)** ingests Agent 1's report. To prevent scope creep—the number one cause of project failure—it explicitly locks what is in-scope, like webcam face detection, and pushes non-goals like mobile app integration out-of-scope for the semester.*  
>  
> *I now hand over to [Person 3] for our architectural and execution agents."*

---

### 👤 PERSON 3: Agents 3, 4 & 5 (Tech Stack, Risk & Milestones) `[2:30 – 3:45]`

#### 🖥️ Screen Action:
1. Click to open **Agent 3: Tech Stack Report Modal**:
   - Point to recommended tools: Frontend (`React + Vite`), Backend (`FastAPI`), Vision (`OpenCV`), DB (`PostgreSQL / MongoDB`).
   - Highlight the **"Skill Match Reason"** and **"Trade-offs"** section.
2. Close modal and click **Agent 4: Risk Matrix Report Modal** (or the **Risk Heatmap Matrix** widget on the dashboard):
   - Show the interactive matrix: Technical Risk, Deadline Risk, Operational Risk.
   - Show Probability (1-5) $\times$ Impact (1-5) and point out the concrete **Mitigation Steps**.
3. Scroll down to the **Sprint Timeline & Milestone Roadmap** (Agent 5 output):
   - Show the 5 structured phases (Inception ➔ Architecture ➔ Core Dev ➔ Testing ➔ Viva).
   - Check off 1 or 2 task checkboxes under Phase 1 (e.g. "Environment Setup & Camera Pipeline").
   - **Point out:** The progress bar immediately recalculates dynamically!

#### 🎤 Spoken Script:
> *"Thank you [Person 2]. In traditional projects, students choose trendy frameworks they don't know how to use. **Agent 3 (Tech Stack Recommender)** evaluates Rohan's team skills and recommends FastAPI and React, providing clear trade-off rationale on why lightweight REST APIs outperform heavy monolithic frameworks here.*  
>  
> *Simultaneously, **Agent 4 (Risk Assessment Matrix)** generates a multi-vector risk heatmap, flagging classroom lighting variation and camera latency with proactive mitigation plans.*  
>  
> *Then, **Agent 5** synthesizes all reports into an actionable 60-day, 5-phase roadmap. As Rohan's team completes tasks, checking off items updates the project velocity live on screen. If a delay occurs, our background **Dynamic Re-Planner (Agent 6)** automatically reschedules downstream deliverables.*  
>  
> *I now pass to [Person 4] to demonstrate our AI mentor and the faculty governance portal."*

---

### 👤 PERSON 4: Doc Generator, AI Mentor & Faculty Portal Sign-off `[3:45 – 5:00]`

#### 🖥️ Screen Action:
1. Scroll to the **Academic Document Generator** section:
   - Click **"Generate Project Synopsis"** or **"Generate Methodology"**.
   - Show the modal displaying a formally structured, university-compliant document draft ready for PDF/Markdown export.
2. Open the floating **AI Mentor Chatbot Panel** at the bottom right:
   - Tap the **Microphone Icon** (Web Speech API) OR quickly type a contextual question:
     ```text
     How should we optimize our OpenCV face recognition loop in FastAPI to prevent latency?
     ```
   - Hit Send. Point out that the LLM responds in ~1 second, referencing their exact project context (FastAPI, React, OpenCV).
3. Switch smoothly to **Tab 2 (Faculty Dashboard)**:
   - Point to the **Cohort Health Overview**: total teams, on-track count, at-risk flags.
   - Scroll to Rohan Gupta's team in the student list: Point out the **Health Score (85%)** and the submitted Phase 1 milestone.
   - Click **"Review Deliverables"** / **"Sign Off Milestone"**: Click the green **"Approve & Sign Off"** button.
   - Show the success toast and verified badge timestamped in the audit log.
   - Show the **"Broadcast Announcement"** bar: Point out that guides can broadcast department alerts.

#### 🎤 Spoken Script:
> *"Thank you [Person 3]. Student teams typically waste 15 to 20 hours formatting academic reports. With our **Academic Document Generator (Agent 7)**, clicking one button compiles a university-compliant Project Synopsis containing problem statement, methodology, and timeline.*  
>  
> *Next, our **AI Mentor (Agent 8)** provides 24/7 intelligent mentorship. When Rohan asks about optimizing video streaming, the mentor already knows his stack is FastAPI and OpenCV, suggesting asynchronous frame generators rather than generic boilerplate.*  
>  
> *Finally, switching to Professor Rajesh Verma's Faculty Portal, guides get real-time cohort visibility across all teams. Rather than managing 25 separate WhatsApp chats, the professor sees automated health scores, inspects Rohan's Phase 1 deliverables, and performs a 1-click digital sign-off with an immutable audit log.*  
>  
> *In conclusion, ProjectGuide-AI turns ambiguous ideas into validated roadmaps in 10 seconds, cuts faculty review overhead by 70%, and has all 118 automated tests green. Thank you, and our team of 4 is now ready for your questions!"*

---

## 💡 Top 10 Mock Presentation Q&A Cheat Sheet (For Your Team)

Mentors can ask **any team member** a question during the last 5 minutes. Keep these 2-sentence answers ready:

#### 1. What makes this different from asking ChatGPT to give a project plan?
> *"ChatGPT is a single stateless prompt prone to hallucination. Our platform is a sequential multi-agent chain with specialized personas (Feasibility, Scope, Stack, Risk, Tracking). Each agent validates strict Pydantic schemas, feeding verified upstream outputs downstream to ensure strict architectural boundaries."*

#### 2. What happens if the Groq LLM API is down or throttled?
> *"We implemented a dual-layer resiliency fallback: `litellm_patch.py` cascades to alternate candidate models, and if the network is completely down, our deterministic rule-based heuristic engine computes valid, mathematically grounded reports, guaranteeing 100% platform availability."*

#### 3. How does the system prevent student scope creep?
> *"Agent 2 creates non-negotiable boundaries by defining an explicit `inScope` list and an `outOfScope` list based on duration and team skills. Once faculty sign off on this scope, it becomes the immutable baseline for the semester."*

#### 4. How does the dynamic re-planner agent know when to reschedule tasks?
> *"When students check off checklist items, the tracking agent measures completion percentage against the time elapsed. If velocity drops below threshold, Agent 6 dynamically recalculates downstream milestone deadlines and suggests task de-scoping."*

#### 5. Why MongoDB Atlas instead of MySQL or PostgreSQL?
> *"Academic capstone projects contain semi-structured, deeply nested JSON data (agent reports, dynamic milestones, chat history). MongoDB Atlas natively stores document models with high query flexibility, backed by local JSON dual-persistence."*

#### 6. How is user security and data isolation handled?
> *"We enforce Role-Based Access Control (RBAC) with JWT session tokens separating student and faculty endpoints. All student ideas, reports, and chat logs are partitioned strictly by authenticated user ID."*

#### 7. How does the voice input work technically?
> *"It utilizes the browser-native Web Speech API (`webkitSpeechRecognition`). Spoken audio is transcribed on the client side in real time and automatically inserted into the chat input, requiring zero heavy external audio dependencies."*

#### 8. What Agile methodology was followed during development?
> *"We followed a Hybrid Scrum-Kanban (Scrumban) framework across four 2-week sprints (60 days), tracking story points, conducting daily standups, and delivering 146 story points with a 98.6% velocity completion rate."*

#### 9. How does faculty governance fit into the autonomous workflow?
> *"The AI is strictly advisory; faculty mentors retain final authority. Mentors review agent-generated scores, override recommendations, leave revision comments, and perform official digital sign-offs with audit logs."*

#### 10. How many tests have you executed to verify this system?
> *"Our test suite has 118 automated tests passing cleanly via `pytest`, covering Pydantic schemas, agent chaining, database normalization, and end-to-end API workflows with zero regressions."*

---

*Keep this playbook open during your rehearsal and presentation.*
