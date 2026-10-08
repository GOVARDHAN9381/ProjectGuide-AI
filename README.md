# 🎓 ProjectGuide-AI

> **Autonomous Multi-Agent Academic Mentoring, Project Tracking & Faculty Governance Platform**  
> Built for Computer Science & Engineering students, academic mentors, and university faculty guides.

---

## 🌟 Overview

**ProjectGuide-AI** is an end-to-end intelligent mentoring ecosystem designed to guide university engineering students through their capstone and semester projects. Powered by autonomous multi-agent intelligence and Groq LLMs, the platform transforms high-level student project ideas into validated, structured roadmaps and gives faculty real-time visibility into project health and progress.

---

## 🤖 Multi-Agent Architecture

```
                                  ┌────────────────────────┐
                                  │   Student Project Idea  │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      ▼                       ▼                       ▼
            ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
            │  1. Feasibility  │ ─► │  2. Scope Agent  │ ─► │  3. Tech Stack   │
            │   Check Agent    │    │ (Anti-Creep Def) │    │ Recommender Agent│
            └──────────────────┘    └──────────────────┘    └─────────┬────────┘
                                                                      │
                      ┌───────────────────────────────────────────────┘
                      ▼
            ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
            │  4. Risk Matrix  │ ─► │  5. Timeline &   │ ─► │  6. Dynamic Plan │
            │ Assessment Agent │    │   Sprint Agent   │    │ Re-Planner Agent │
            └──────────────────┘    └──────────────────┘    └─────────┬────────┘
                                                                      │
                      ┌───────────────────────────────────────────────┘
                      ▼
            ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
            │  7. Academic Doc │    │  8. Project-Aware│    │  9. Faculty Cohort│
            │ Generator Agent  │    │  AI Mentor Chat  │    │ Analytics Hub    │
            │(Synopsis/Method.)│    │ (Voice + History)│    │(Signoffs & Risk) │
            └──────────────────┘    └──────────────────┘    └──────────────────┘
```

1. **Feasibility Check Agent**: Evaluates technical viability, complexity, timeline feasibility, and provides actionable recommendations.
2. **Scope Definition Agent**: Delineates in-scope deliverables, out-of-scope boundaries, and MVP criteria to prevent scope creep.
3. **Tech Stack Recommender Agent**: Suggests optimal languages, frameworks, databases, and deployment platforms tailored to student background.
4. **Risk Assessment Agent**: Computes risk levels (Low/Medium/High) across technical, operational, and deadline vectors with mitigation steps.
5. **Sprint & Timeline Planner Agent**: Generates structured, milestone-based execution roadmaps with estimated effort and task dependencies.
6. **Dynamic Replanning Agent**: Tracks real-time velocity, identifies delays, and dynamically shifts downstream schedules when roadblocks occur.
7. **Academic Document Generator Agent**: Generates university-compliant formal document drafts (Project Synopsis, Methodology, and Progress Reports).
8. **Context-Aware AI Mentor Agent**: An interactive chatbot equipped with voice input (`webkitSpeechRecognition`) and full project context memory.
9. **Faculty Governance Hub**: Provides cohort progress analytics, at-risk student flags, milestone reviews/signoffs, and announcement broadcasting.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, React Router DOM, Lucide Icons, Custom OLED Dark Theme |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, Uvicorn |
| **AI / LLMs** | Groq API (`llama-3.3-70b-versatile`), CrewAI / LangChain |
| **Database** | MongoDB Atlas (Cloud) |
| **Deployment** | **Frontend**: Vercel (`*.vercel.app`)<br>**Backend**: Railway / Render / VPS |

---

## 📁 Repository Structure

```bash
ProjectGuide-AI/
├── frontend/                       # React 19 + Vite Single Page Application
│   ├── public/                     # Static assets & icons
│   ├── src/
│   │   ├── components/             # Reusable UI components & modals
│   │   │   ├── ChatbotPanel.jsx    # Project-aware voice + text AI mentor
│   │   │   ├── SprintTimelineView.jsx # Visual milestone roadmap
│   │   │   ├── RiskHeatmapMatrix.jsx  # Interactive risk matrix
│   │   │   └── ...
│   │   ├── pages/                  # Route views (Student, Faculty, Auth, Profile)
│   │   ├── utils/                  # API client, session store, toast notifications
│   │   ├── index.css               # Unified OLED Dark Design System
│   │   └── App.jsx                 # Client-side routing
│   ├── .env.example                # Frontend environment configuration template
│   ├── vercel.json                 # Vercel SPA client-side routing rewrites
│   └── package.json
│
├── backend/                        # Python FastAPI Backend
│   ├── agents/                     # Autonomous AI agents (Feasibility, Scope, Docs, etc.)
│   ├── routers/                    # REST API endpoints (Auth, Projects, Faculty, etc.)
│   ├── models.py                   # Pydantic & database domain schemas
│   ├── database.py                 # MongoDB Atlas connector & index manager
│   ├── main.py                     # FastAPI application entrypoint with CORS
│   ├── requirements.txt            # Python dependencies
│   ├── seed_all_data_to_mongo.py   # Database seeder script
│   └── .env.example                # Backend environment configuration template
│
└── README.md                       # Master platform documentation
```

---

## ⚡ Quickstart (Local Development)

### 1. Prerequisites
- **Node.js** (v18 or higher) & **npm**
- **Python** (v3.10 or higher)
- **MongoDB Atlas** connection string
- **Groq API Key** ([console.groq.com](https://console.groq.com/))

---

### 2. Backend Setup

```powershell
# Navigate into the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1    # On Windows (or 'source venv/bin/activate' on macOS/Linux)

# Install dependencies
pip install -r requirements.txt

# Create your .env configuration
copy .env.example .env
```

Configure `backend/.env`:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
DB_NAME=ProjectGuide-AI
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=groq/llama-3.3-70b-versatile
```

Seed initial data (optional):
```powershell
python seed_all_data_to_mongo.py
```

Start the backend server:
```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
API runs at **`http://127.0.0.1:8000`** (Interactive Docs: `http://127.0.0.1:8000/docs`).

---

### 3. Frontend Setup

In a new terminal window:

```powershell
# Navigate into the frontend directory
cd frontend

# Install dependencies
npm install

# Start local Vite development server
npm run dev
```

Frontend runs at **`http://localhost:5173`**.

---

## 🚀 Deployment Guide

### A. Deploy Frontend to Vercel (`vercel.app`)

The frontend is fully configured for Vercel with client-side SPA routing (`frontend/vercel.json`).

#### Method 1: Via Vercel Web Dashboard (Recommended)
1. Push your repository to GitHub.
2. Go to **[vercel.com/new](https://vercel.com/new)** and import `ProjectGuide-AI`.
3. In project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE`: `https://your-backend.up.railway.app` (your production backend URL)
5. Click **Deploy**. Your app will be live at `https://your-project.vercel.app`.

#### Method 2: Via Vercel CLI
```powershell
cd frontend
vercel login
vercel --prod
```

---

### B. Deploy Backend to Railway / Render / Cloud VPS

Because the backend runs Python FastAPI with CrewAI and MongoDB Atlas connections, host it on a platform that supports continuous Python services:

1. **Deploy to Railway**:
   - Create a new project on [railway.app](https://railway.app) connected to your GitHub repository.
   - Set the root directory or start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Add environment variables (`MONGO_URI`, `DB_NAME`, `GROQ_API_KEY`, `GROQ_MODEL`).
   - Copy the public service URL (e.g., `https://ip-backend.up.railway.app`) and set it as `VITE_API_BASE` in Vercel.

---

## 🔑 Environment Variables

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE` | Base URL of the deployed FastAPI backend | `http://127.0.0.1:8000` |

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `DB_NAME` | Database name (e.g., `ProjectGuide-AI`) |
| `GROQ_API_KEY` | Groq Cloud API key for Llama 3.3 70B inference |
| `GROQ_MODEL` | Default model (`groq/llama-3.3-70b-versatile`) |

---

## 📄 License
Academic Capstone / Infosys Springboard Project — 2026.
