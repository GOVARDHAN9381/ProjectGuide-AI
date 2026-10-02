<div align="center">

# 🌾 AgriSight — Intelligent Agricultural Intelligence Platform
### *Krishi Saarthi — Edge-AI Digital Twin & Field Precision Ecosystem*

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vector DB](https://img.shields.io/badge/Vector_DB-ChromaDB-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.trychroma.com/)
[![Trace AI](https://img.shields.io/badge/Trace_AI-Commons_Track-purple?style=for-the-badge&logo=openai&logoColor=white)](https://nsb.dev/tracecommons-hacker-guide)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_Edge_AI-black?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.ai/)
[![LLaVA](https://img.shields.io/badge/LLaVA-7B_Vision-FF6F61?style=for-the-badge&logo=openai&logoColor=white)](https://ollama.ai/)
[![Open-Meteo](https://img.shields.io/badge/Weather-Open--Meteo-007ACC?style=for-the-badge&logo=cloud&logoColor=white)](https://open-meteo.com/)
[![License](https://img.shields.io/badge/License-MIT-green.style=for-the-badge)](LICENSE)

<p align="center">
  <a href="#-key-features"><b>Key Features</b></a> •
  <a href="#-system-architecture"><b>Architecture</b></a> •
  <a href="#-vector-database--rag-engine"><b>Vector DB</b></a> •
  <a href="#-trace-ai--trace-commons-track-pec-hacks-40"><b>Trace AI</b></a> •
  <a href="#-render-cloud-deployment"><b>Render Cloud</b></a> •
  <a href="#-tech-stack"><b>Tech Stack</b></a> •
  <a href="#-getting-started"><b>Getting Started</b></a>
</p>

---

</div>

## 🌟 Overview

**AgriSight (Krishi Saarthi)** is a production-grade, **field-centric digital twin and agricultural intelligence platform** built for modern climate-resilient farming.

Unlike traditional agro-apps that rely on static cloud advice, AgriSight combines a high-performance **Vector Database (ChromaDB)**, **Trace AI Provenance & Attestation**, and cloud microservices on **Render**:

1. **🧠 Vector Database (ChromaDB + RAG)**: Ingests crop, pest, disease, fertilizer, irrigation, and government scheme knowledge into persistent vector embeddings for semantic, context-grounded advisory responses.
2. **🛡️ Trace AI (Trace Commons AI Track at PEC Hacks 4.0)**: Integrates agentic AI trace tracking, automated trajectory redaction, and cryptographic JWT attestation tokens to verify transparent agent-assisted development.
3. **☁️ Render Deployment**: Hosts high-availability vector retrieval microservices and workflow automation services on Render for zero-downtime scalability.

---

## ⚡ Key Features

```
  🗺️ FIELD BOUNDARY MAPPING        🧠 VECTOR DB & TRACE AI         🌦️ RENDER CLIMATE ENGINE
  ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
  │ Leaflet polygon draw   │      │ ChromaDB vector store  │      │ Render workflow server │
  │ Turf.js area & centroid│ ────►│ Trace Commons JWT auth │ ────►│ Open-Meteo hourly data │
  │ Auto-hectare compute   │      │ Scrubbed agent trajectory│    │ Soil moisture 0-27cm   │
  └────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

### 🛰️ 1. Field-Centric Digital Twin & GIS Mapping
* **Interactive Field Boundary Polygon Drawer**: Custom Leaflet.js polygon editor powered by Turf.js for instantaneous acre/hectare calculation and centroid pinpointing.
* **Multi-Plot Management**: Track multiple fields (`FIELD-001`, `FIELD-002`) with unique crop, soil, and sowing stage histories.

### 🧠 2. Vector Database + RAG Knowledge Engine
* **ChromaDB Vector Store**: Semantic retrieval over crop disease, fertilizer, irrigation, and government scheme knowledge by meaning rather than exact keywords.
* **Context-Aware Answers**: Retrieves top agronomic vector chunks before response generation, preventing hallucination and grounding decisions in verified domain data.
* **Knowledge Ingestion Pipeline**: Converts markdown and text knowledge sources into embedded vector chunks using SentenceTransformers embeddings.

### 🛡️ 3. Trace AI & Trace Commons Track Integration (PEC Hacks 4.0)
* **Agent Trajectory Recording**: Logs developer-agent interactions (planning, coding, debugging, iterating, and shipping) throughout project development.
* **Automated Redaction & Scrubbing**: Filters private credentials and API tokens from agent traces prior to submission.
* **Cryptographic Attestation Token**: Generates and submits the official Trace Commons JWT Attestation Token required for PEC Hacks 4.0 AI Track eligibility.

### ☁️ 4. Render Cloud Microservices & Workflow Deployment
* **Hosted RAG & Vector Backend**: Deploys Python FastAPI/Flask vector backend and workflow services to Render with automated health checks.
* **Production Reliability**: Ensures continuous uptime, autoscaling, and secure HTTPS endpoints for field agent communication.

### 🤖 5. Multimodal Edge AI Advisory
* **LLaVA 7B Plant Health Diagnostics**: Upload plant leaf images for instant vision analysis, identifying blight, rust, and pests with organic/chemical remedies.
* **Gemma 3 Multilingual Chat**: Voice-enabled advisory in **English, Hindi (हिंदी), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), and Kannada (ಕನ್ನಡ)**.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([👨‍🌾 Farmer / Agronomist]) <--> Client[💻 React 19 Frontend + Vite]

    subgraph Render Cloud & Vector Layer
        Client <-->|REST / RAG API| Render[☁️ Render Cloud Services]
        Render <--> VectorDB[(🧠 ChromaDB Vector Store)]
        Ingest[📚 Agronomy Knowledge] --> VectorDB
        VectorDB --> Retriever[🔎 Semantic Retriever]
        Retriever --> LLM[🤖 Local / Edge LLM]
    end

    subgraph Trace AI Layer (PEC Hacks 4.0)
        Agent[🤖 Antigravity AI Agent] <-->|Trace Logger| Trajectory[📜 Scrubbed Agent Trajectory]
        Trajectory --> Attestor[🛡️ Trace Commons Attestation Engine]
        Attestor --> JWT[🔑 Signed JWT Attestation Token]
    end

    subgraph Edge AI Layer
        Client <-->|/ollama proxy| Ollama[🤖 Ollama Engine]
        Ollama <--> Gemma[🧠 Gemma 3:4b - Advisory]
        Ollama <--> LLaVA[👁️ LLaVA:7b - Vision Scan]
    end

    subgraph Data & GIS APIs
        Client <-->|REST API| Weather[🌦️ Open-Meteo Engine]
        Client <-->|REST API| SoilGrids[🌍 ISRIC SoilGrids API]
    end
```

---

## 🧠 Vector Database & RAG Engine

AgriSight leverages **ChromaDB** for high-density vector search:

* **Embedding Model**: `all-MiniLM-L6-v2` / `SentenceTransformers`
* **Indexed Domains**: Crop pathology, fertilizer scheduling, microclimate thresholds, PMFBY insurance schemes.
* **Retrieval Protocol**: Top-$k$ cosine similarity search returning relevance scores and source metadata.

```bash
# Ingest agronomic knowledge into ChromaDB Vector Store
python ai-service/knowledge/ingest.py
```

---

## 🛡️ Trace AI & Trace Commons Track (PEC Hacks 4.0)

AgriSight participates in the **Trace Commons AI Track** at PEC Hacks 4.0:

1. **Trace Capture**: Agent trajectory recorded across planning, code generation, refactoring, and automated testing.
2. **Scrubbing & Privacy**: Sensitive environment parameters and device keys are automatically redacted.
3. **JWT Attestation**: Minted via `trace-commons-contributor` CLI to produce a signed JWT verification token for project evaluation.

---

## ☁️ Render Cloud Deployment

The vector RAG service and workflow execution engines are configured for deployment on **Render**:

* **Render Service File**: `render-workflows.yaml`
* **Python Runtime**: Python 3.11 with FastAPI / ChromaDB dependencies
* **Health Check Endpoint**: `/healthz`

```yaml
# render-workflows.yaml
services:
  - type: web
    name: agrisight-vector-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python server.py
```

---

## 🤖 AI Engine & Model Setup

| Task | Primary Model | Fallback Model | Memory |
| :--- | :--- | :--- | :--- |
| **Multilingual Chat Advisory** | `gemma3:4b` | `gemma4:latest` | ~3.3 GB |
| **Plant Leaf Disease Vision** | `llava:7b` | `llava:latest` | ~4.1 GB |

```bash
# Pull models via Ollama
ollama pull gemma3:4b
ollama pull llava:7b
```

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Node.js** >= 18.x
* **Python** >= 3.10 (for ChromaDB Vector Store)
* **Ollama Desktop** (running on `http://127.0.0.1:11434`)

### 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GOVARDHAN9381/Agrisight.git
   cd Agrisight
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Initialize Vector Database**
   ```bash
   pip install -r requirements.txt
   python ai-service/knowledge/ingest.py
   ```

4. **Start Dev Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite, Lucide Icons, Vanilla CSS Tokens
* **Vector Database**: ChromaDB (Semantic Embedding Storage & Fast Cosine Lookup)
* **Trace AI**: Trace Commons AI Track Specification, Scrubbed Trajectory Logging & JWT Attestation
* **Cloud Hosting**: Render Services (`render-workflows.yaml`)
* **Mapping & GIS**: Leaflet.js, Leaflet-Draw, Turf.js
* **AI Orchestration**: Direct Ollama API Proxy, Web Speech API (STT & TTS)
* **APIs**: Open-Meteo Weather API, ISRIC SoilGrids REST API

---

## 🌍 UN Sustainable Development Goals (SDG) Alignment

| Goal | Description | Platform Contribution |
| :---: | :--- | :--- |
| **SDG 1** | **No Poverty** | Protects smallholder farmer income via parametric insurance verification |
| **SDG 2** | **Zero Hunger** | Enhances crop yields through precise ML disease diagnosis & soil prescriptions |
| **SDG 12** | **Responsible Consumption** | Prevents over-fertilization and optimizes chemical usage |
| **SDG 13** | **Climate Action** | Provides 60-day extreme weather risk advisories and irrigation alerts |

---

<div align="center">

Made with ❤️ for climate-resilient agriculture.

</div>

