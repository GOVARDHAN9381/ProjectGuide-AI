"""
Chat router — conversational AI mentor endpoint.
POST /api/chat & /chat  →  Groq LLM answer with project mentoring context.
"""
import os
import time
import traceback
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

BASE_SYSTEM_PROMPT = """You are an experienced, encouraging, and highly technical academic project mentor AI named "ProjectGuide-AI".
You guide college students across Computer Science and Engineering capstone and mini projects (Web, Mobile, AI/ML, Cloud, IoT, etc.).

Your goals:
- Answer the student's question accurately, with practical engineering guidance.
- If project context is provided, ground your answer directly in their project's domain, technologies, and academic timeline.
- Provide clean code snippets, architecture tips, libraries, and clear step-by-step next steps when asked.
- Use markdown formatting (bold headers, bullet points, clean code blocks).
- Be direct, concise, and pedagogical. Avoid repetitive boilerplate or generic non-answers."""


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    student_id: Optional[Union[int, str]] = None
    projectContext: Optional[Dict[str, Any]] = None
    project_context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str
    text: Optional[str] = None


def _get_api_key() -> str:
    """Resolve an active Groq API key from environment variables."""
    for var in [
        "GROQ_API_KEY",
        "GROQ_API_KEY_FEASIBILITY",
        "GROQ_API_KEY_SCOPE",
        "GROQ_API_KEY_TECH_STACK",
        "GROQ_API_KEY_RISK",
        "GROQ_API_KEY_TRACKING",
    ]:
        key = os.getenv(var, "").strip()
        if key and "your" not in key.lower() and len(key) >= 20:
            return key
    return os.getenv("GROQ_API_KEY", "")


def _build_system_prompt(ctx: Optional[dict]) -> str:
    if not ctx:
        return BASE_SYSTEM_PROMPT

    prompt = BASE_SYSTEM_PROMPT + "\n\nCURRENT STUDENT PROJECT CONTEXT:\n"
    if ctx.get("title"):
        prompt += f"- Project Title: {ctx.get('title')}\n"
    if ctx.get("domain"):
        prompt += f"- Domain: {ctx.get('domain')}\n"
    if ctx.get("desc"):
        prompt += f"- Description: {ctx.get('desc')}\n"
    if ctx.get("teamSize"):
        prompt += f"- Team Size: {ctx.get('teamSize')} students\n"
    if ctx.get("durationDays"):
        prompt += f"- Timeline Duration: {ctx.get('durationDays')} days\n"
    if ctx.get("techIdeas"):
        prompt += f"- Proposed Tech Stack: {ctx.get('techIdeas')}\n"
    if ctx.get("features"):
        prompt += f"- Planned Features: {', '.join(ctx.get('features', []))}\n"
    if ctx.get("feasibilityScore"):
        prompt += f"- Feasibility Score: {ctx.get('feasibilityScore')}%\n"
    if ctx.get("studentSkills"):
        skills = ctx.get("studentSkills")
        if isinstance(skills, dict):
            prompt += f"- Student Skills: {', '.join(f'{k} ({v})' for k, v in skills.items())}\n"

    prompt += "\nAlways tailor your answers, code recommendations, and architecture advice directly to this project."
    return prompt


def _get_groq_reply(message: str, history: list, ctx: Optional[dict] = None) -> str:
    from groq import Groq

    api_key = _get_api_key()
    if not api_key:
        raise ValueError("No valid GROQ_API_KEY configured")

    client = Groq(api_key=api_key)

    sys_prompt = _build_system_prompt(ctx)
    messages = [{"role": "system", "content": sys_prompt}]
    for h in (history or [])[-8:]:
        role = getattr(h, "role", None) or h.get("role", "user") if isinstance(h, dict) else "user"
        content = getattr(h, "content", None) or h.get("content", "") if isinstance(h, dict) else str(h)
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    models_to_try = [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
    ]

    last_error = None
    for model_name in models_to_try:
        for attempt in range(2):
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.4,
                    max_tokens=650,
                )
                content = response.choices[0].message.content
                if content and content.strip():
                    return content.strip()
            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                if "rate limit" in err_str or "429" in err_str:
                    time.sleep(1.0)
                else:
                    break  # Switch to next candidate model

    if last_error:
        raise last_error
    return ""


def _generate_smart_fallback(message: str, ctx: Optional[dict] = None) -> str:
    """Context-aware fallback reply when external Groq API is temporarily unreachable."""
    title = (ctx or {}).get("title") or "your project"
    domain = (ctx or {}).get("domain") or "engineering"

    lower_msg = message.lower()
    if "tech" in lower_msg or "stack" in lower_msg or "framework" in lower_msg:
        return (
            f"### 🛠️ Recommended Tech Stack for **{title}**\n\n"
            f"For an academic project in **{domain}**, I recommend a modern, production-grade stack:\n"
            f"- **Frontend**: React (Vite) + Tailwind CSS or Vanilla CSS for clean component structure.\n"
            f"- **Backend**: FastAPI (Python) or Express.js (Node.js) with modular REST routers.\n"
            f"- **Database**: MongoDB Atlas or PostgreSQL with indexed schema models.\n"
            f"- **State & Auth**: JWT tokens with local storage and role-based access control.\n\n"
            f"Start by defining your API schemas before building the UI pages!"
        )
    elif "scope" in lower_msg or "feature" in lower_msg:
        return (
            f"### 📐 Scope Boundaries for **{title}**\n\n"
            f"To prevent academic project timeline overruns:\n"
            f"1. **Core MVP (Must Have)**: User authentication, primary CRUD workflows, and the core domain feature.\n"
            f"2. **Secondary (Nice to Have)**: Analytics charts, notifications, and export tools.\n"
            f"3. **Out of Scope (Defer)**: Multi-tenant billing, complex mobile apps, or production microservices.\n\n"
            f"Focus 70% of your sprint time on nailing the core MVP workflow first!"
        )
    elif "risk" in lower_msg or "problem" in lower_msg or "bottleneck" in lower_msg:
        return (
            f"### ⚠️ Key Risks & Mitigations for **{title}**\n\n"
            f"- **Integration Delay**: Frontend and backend developed without shared API contracts. *Mitigation: Define OpenAPI/Swagger specs on Day 1.*\n"
            f"- **Scope Creep**: Adding new features mid-sprint. *Mitigation: Lock MVP requirements before Sprint 2.*\n"
            f"- **Deployment Surprises**: Leaving cloud hosting to the last week. *Mitigation: Deploy early to Vercel and Render in Sprint 1.*"
        )
    else:
        return (
            f"### 💡 Mentoring Insight for **{title}**\n\n"
            f"Regarding your query on *\"{message}\"*:\n"
            f"- In academic engineering projects, break this down into a **data layer**, a **service/API layer**, and an **interactive UI component**.\n"
            f"- Validate your test endpoints first using Postman or unit tests before integrating into your frontend dashboard.\n"
            f"- Ensure you commit your changes daily with descriptive Git messages so your faculty guide can track your sprint progress.\n\n"
            f"Ask me for specific code snippets, architecture diagrams, or debugging assistance!"
        )


@router.post("/api/chat", response_model=ChatResponse)
@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    ctx = req.projectContext or req.project_context or {}
    try:
        reply = _get_groq_reply(req.message, req.history, ctx)
        if reply:
            return {"reply": reply, "text": reply}
    except Exception as e:
        print(f"[CHAT ROUTER] Groq API error: {e}")

    # Return intelligent, project-grounded fallback
    fallback_reply = _generate_smart_fallback(req.message, ctx)
    return {"reply": fallback_reply, "text": fallback_reply}
